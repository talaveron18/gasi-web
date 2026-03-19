from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import ChatMessage, ChatResponse
from chatbot_engine import SimpleChatbot
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, timezone
import httpx

load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Almacenamiento de sesiones
chat_sessions = {}

async def get_db():
    from server import db
    return db

async def send_lead_email(lead_data: dict):
    """Envía email con lead (preparado para integración futura)"""
    # TODO: Integrar con servicio de email (Resend/SendGrid)
    print(f"📧 EMAIL A ENVIAR A admin@gasisalud.com:")
    print(f"Asunto: Nueva solicitud desde chatbot - {lead_data.get('servicio_nombre')}")
    print(f"Datos: {lead_data}")

async def send_whatsapp_alert(lead_data: dict):
    """Envía alerta por WhatsApp (preparado para Twilio)"""
    # TODO: Integrar con Twilio WhatsApp API
    phone = "+34634029865"
    message = f"""Nuevo lead GASI

Servicio: {lead_data.get('servicio_nombre')}
Curso/Tipo: {lead_data.get('curso') or lead_data.get('tipo_servicio', 'N/A')}
Empresa/Sector: {lead_data.get('empresa_sector', 'N/A')}
Ciudad: {lead_data.get('ciudad', 'N/A')}
Fecha: {lead_data.get('fecha', 'N/A')}

Contacto: {lead_data.get('contacto_nombre')}
Tel: {lead_data.get('contacto_telefono')}
Email: {lead_data.get('contacto_email')}"""
    
    print(f"📱 WHATSAPP A ENVIAR A {phone}:")
    print(message)

@router.post("/message", response_model=ChatResponse)
async def chat_message(
    message: ChatMessage,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    session_id = message.session_id or f"chat_{uuid.uuid4().hex[:12]}"
    
    # Obtener o crear chatbot de sesión
    if session_id not in chat_sessions:
        chat_sessions[session_id] = SimpleChatbot()
    
    chatbot = chat_sessions[session_id]
    
    # Procesar mensaje
    user_msg = message.message.strip()
    
    # Si no tiene servicio seleccionado y es un botón de servicio
    if not chatbot.servicio:
        if user_msg in ["Cobertura sanitaria para empresas", "cobertura"]:
            responses = chatbot.select_service("cobertura")
        elif user_msg in ["Formación sanitaria", "formacion"]:
            responses = chatbot.select_service("formacion")
        elif user_msg in ["Salud laboral", "salud_laboral"]:
            responses = chatbot.select_service("salud_laboral")
        else:
            # Mensaje inicial
            responses = chatbot.get_initial_messages()
    else:
        # Procesar respuesta en el flujo
        responses = chatbot.process_answer(user_msg)
    
    # Si completó el flujo, enviar email y WhatsApp
    if chatbot.completed and chatbot.is_ready_to_send():
        lead_data = chatbot.get_lead_data()
        lead_data["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        # Guardar en BD
        lead_doc = {
            "lead_id": str(uuid.uuid4()),
            "source": "chatbot_cuestionario",
            "session_id": session_id,
            "data": lead_data,
            "created_at": lead_data["timestamp"]
        }
        await db.contact_leads.insert_one(lead_doc)
        
        # Enviar email y WhatsApp en background
        background_tasks.add_task(send_lead_email, lead_data)
        background_tasks.add_task(send_whatsapp_alert, lead_data)
    
    # Construir respuesta
    response_parts = []
    for resp in responses:
        if resp["type"] == "text":
            response_parts.append(resp["content"])
        elif resp["type"] == "buttons":
            response_parts.append(resp["content"])
    
    response_text = "\n\n".join(response_parts)
    
    # Incluir botones si los hay
    buttons_data = None
    for resp in responses:
        if resp["type"] == "buttons":
            buttons_data = resp.get("buttons")
            break
    
    return ChatResponse(
        response=response_text, 
        session_id=session_id,
        buttons=buttons_data
    )