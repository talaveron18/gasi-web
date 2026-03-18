from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import ChatMessage, ChatResponse
from chatbot_engine import ChatbotEngine
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, timezone

load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Almacenamiento de sesiones en memoria (en producción usar Redis)
chat_sessions = {}

async def get_db():
    from server import db
    return db

@router.post("/message", response_model=ChatResponse)
async def chat_message(
    message: ChatMessage,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    session_id = message.session_id or f"chat_{uuid.uuid4().hex[:12]}"
    
    # Obtener o crear engine de sesión
    if session_id not in chat_sessions:
        chat_sessions[session_id] = ChatbotEngine()
    
    engine = chat_sessions[session_id]
    
    # Procesar mensaje con el engine
    response_text = engine.process_message(message.message)
    
    # Guardar en BD para historial
    conversation = await db.chat_conversations.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not conversation:
        conversation = {
            "session_id": session_id,
            "messages": [],
            "context": engine.context,
            "state": engine.state,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_conversations.insert_one(conversation)
    
    # Actualizar conversación
    await db.chat_conversations.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "$each": [
                        {
                            "role": "user",
                            "content": message.message,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        },
                        {
                            "role": "assistant",
                            "content": response_text,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                    ]
                }
            },
            "$set": {
                "context": engine.context,
                "state": engine.state,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Crear lead si hay suficiente información
    if engine.state.endswith("_cierre"):
        lead_doc = {
            "lead_id": str(uuid.uuid4()),
            "source": "chatbot",
            "session_id": session_id,
            "context": engine.context,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.contact_leads.insert_one(lead_doc)
    
    return ChatResponse(response=response_text, session_id=session_id)