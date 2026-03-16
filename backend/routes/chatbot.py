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
    
    system_message = """Eres el asistente virtual de GASI (Grupo de Asistencia Sanitaria Integral), una empresa B2B de servicios sanitarios para empresas.

Tus funciones:
1. Ayudar a los usuarios a entender los servicios de GASI
2. Recomendar servicios según necesidades empresariales
3. Guiar sobre la plataforma de formación sanitaria
4. Recopilar información de leads empresariales

Servicios principales:
- Cobertura sanitaria en empresas: Personal sanitario trabajando en instalaciones del cliente
- Formación sanitaria: Cursos de primeros auxilios, RCP, prevención laboral
- Salud laboral: Reconocimientos médicos, chequeos, campañas de salud

Sectores objetivo: Logística (Amazon, GXO), retail (Leroy Merlin, Decathlon), industria, grandes superficies

Contacto:
- Teléfono: 622822101
- WhatsApp: 634029865
- Email: coordinacion@gasisalud.com

Tono: Profesional, corporativo, útil. NO parecer empresa de emergencias o ambulancias."""
    
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