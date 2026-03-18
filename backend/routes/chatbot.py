from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import ChatMessage, ChatResponse
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, timezone

load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

async def get_db():
    from server import db
    return db

@router.post("/message", response_model=ChatResponse)
async def chat_message(
    message: ChatMessage,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    session_id = message.session_id or f"chat_{uuid.uuid4().hex[:12]}"
    
    conversation = await db.chat_conversations.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not conversation:
        conversation = {
            "session_id": session_id,
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_conversations.insert_one(conversation)
    
    api_key = os.getenv("EMERGENT_LLM_KEY")
    
    system_message = """Eres el asistente de GASI (Grupo de Asistencia Sanitaria Integral).

OBJETIVO: Guiar al usuario hacia una solución concreta sin repetir preguntas ya respondidas.

REGLA CRÍTICA DE MEMORIA:
Antes de hacer CUALQUIER pregunta, ANALIZA el historial completo de la conversación.
Si el usuario ya dio esa información, NO la pidas de nuevo. Avanza al siguiente paso.

SERVICIOS DE GASI:
1. Cobertura sanitaria: Personal sanitario en instalaciones del cliente
2. Formación sanitaria: Cursos RCP, SVB, Primeros Auxilios, PRL, Movilización
3. Salud laboral: Reconocimientos médicos laborales

REGLA DE FOCO ABSOLUTO:
Si el usuario define un servicio específico (ej: "curso RCP"):
- SOLO habla de ese servicio
- NO menciones otros servicios
- NO hagas cross-selling
- Mantén el foco hasta cerrar

REGLA DE CONSOLIDACIÓN:
Cuando el usuario ha dado varios datos, reconócelos y avanza:
Ejemplo: "Perfecto. Formación RCP para 50 personas. ¿En qué ciudad se realizaría?"

REGLA ANTI-REPETICIÓN:
Si el usuario ya mencionó:
- tipo de servicio/curso → NO vuelvas a preguntar qué servicio
- cantidad de personas → NO vuelvas a preguntar cuántos
- ubicación → NO vuelvas a preguntar dónde
- tipo de empresa → NO vuelvas a preguntar tipo

FLUJO DE PREGUNTAS (solo las que faltan):
Para formación:
1. ¿Qué curso? (si no lo dijo)
2. ¿Cuántas personas? (si no lo dijo)
3. ¿Ubicación? (si no lo dijo)
4. ¿Cuándo? (si no lo dijo)
Luego: ofrecer contacto directo

MANEJO DE FRUSTRACIÓN:
Si el usuario dice "ya te lo dije" o se frustra:
- reconoce implícitamente
- consolida lo que sabes
- avanza sin repetir

Ejemplo:
Usuario: "Ya te dije que son 50 personas"
Tú: "Perfecto, entendido. 50 personas para el curso RCP.

¿En qué ciudad se realizaría?"

ESTILO:
- Respuestas cortas
- 1 pregunta por vez
- Saltos de línea entre frases
- Sin listas largas
- Sin asteriscos
- Conversacional y directo

CONTACTO:
Tel: 622 822 101
WhatsApp: 634 029 865
Email: coordinacion@gasisalud.com

PROHIBIDO:
- Repetir preguntas ya respondidas
- Mezclar servicios no solicitados
- Hacer varias preguntas a la vez
- Ignorar información previa
- Volver atrás en el flujo

TU MISIÓN: Escuchar, entender, recordar y avanzar. Como un humano inteligente, no como un formulario."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_msg = UserMessage(text=message.message)
        response_text = await chat.send_message(user_msg)
        
        await db.chat_conversations.update_one(
            {"session_id": session_id},
            {"$push": {
                "messages": {
                    "role": "user",
                    "content": message.message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }}
        )
        
        await db.chat_conversations.update_one(
            {"session_id": session_id},
            {"$push": {
                "messages": {
                    "role": "assistant",
                    "content": response_text,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }}
        )
        
        if any(keyword in message.message.lower() for keyword in ["necesito", "presupuesto", "contratar", "información", "llamar"]):
            lead_doc = {
                "lead_id": str(uuid.uuid4()),
                "source": "chatbot",
                "message": message.message,
                "response": response_text,
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.contact_leads.insert_one(lead_doc)
        
        return ChatResponse(response=response_text, session_id=session_id)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")