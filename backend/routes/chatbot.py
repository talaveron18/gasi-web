from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import ChatMessage, ChatResponse
from chatbot_engine import SimpleChatbot
import os
import uuid
from datetime import datetime, timezone
import asyncio
import logging
import json

router = APIRouter(prefix="/chatbot", tags=["chatbot"])
logger = logging.getLogger(__name__)

# Configuración de Resend (cargada desde server.py)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
RECIPIENT_EMAIL = "coordinacion@gasisalud.com"

# Log al cargar el módulo
if RESEND_API_KEY:
    print(f"✅ Resend configurado: {RESEND_API_KEY[:15]}...")
else:
    print("⚠️ RESEND_API_KEY no encontrada")

async def get_db():
    from server import db
    return db

async def get_or_create_chatbot(db: AsyncIOMotorDatabase, session_id: str) -> tuple[SimpleChatbot, str]:
    """Obtiene o crea un chatbot con persistencia en BD"""
    # Buscar sesión existente
    session = await db.chat_sessions.find_one({"session_id": session_id})
    
    chatbot = SimpleChatbot()
    
    if session:
        # Restaurar estado del chatbot
        chatbot.data = session.get("data", {})
        chatbot.current_step = session.get("current_step", 0)
        chatbot.servicio = session.get("servicio")
        chatbot.completed = session.get("completed", False)
    
    return chatbot, session_id

async def save_chatbot_state(db: AsyncIOMotorDatabase, session_id: str, chatbot: SimpleChatbot):
    """Guarda el estado del chatbot en BD"""
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_id": session_id,
            "data": chatbot.data,
            "current_step": chatbot.current_step,
            "servicio": chatbot.servicio,
            "completed": chatbot.completed,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

async def send_lead_email(lead_data: dict):
    """Envía email con datos del lead a coordinacion@gasisalud.com"""
    
    # Construir contenido HTML del email
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #005EB8; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">GASI - Nuevo Lead</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
            <h2 style="color: #005EB8;">Nueva solicitud desde el chatbot</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #e9ecef;">
                    <td style="padding: 10px; font-weight: bold;">Servicio:</td>
                    <td style="padding: 10px;">{lead_data.get('servicio_nombre', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Tipo/Curso:</td>
                    <td style="padding: 10px;">{lead_data.get('curso') or lead_data.get('tipo_servicio', 'N/A')}</td>
                </tr>
                <tr style="background-color: #e9ecef;">
                    <td style="padding: 10px; font-weight: bold;">Empresa/Sector:</td>
                    <td style="padding: 10px;">{lead_data.get('empresa_sector', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Ciudad:</td>
                    <td style="padding: 10px;">{lead_data.get('ciudad', 'N/A')}</td>
                </tr>
                <tr style="background-color: #e9ecef;">
                    <td style="padding: 10px; font-weight: bold;">Fecha solicitada:</td>
                    <td style="padding: 10px;">{lead_data.get('fecha', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Nº Personas:</td>
                    <td style="padding: 10px;">{lead_data.get('numero_personas') or lead_data.get('numero_trabajadores', 'N/A')}</td>
                </tr>
            </table>
            
            <h3 style="color: #005EB8; margin-top: 20px;">Datos de Contacto</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: white; border: 2px solid #005EB8;">
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Nombre:</td>
                    <td style="padding: 10px;">{lead_data.get('contacto_nombre', 'N/A')}</td>
                </tr>
                <tr style="background-color: #e9ecef;">
                    <td style="padding: 10px; font-weight: bold;">Teléfono:</td>
                    <td style="padding: 10px;"><a href="tel:{lead_data.get('contacto_telefono', '')}">{lead_data.get('contacto_telefono', 'N/A')}</a></td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Email:</td>
                    <td style="padding: 10px;"><a href="mailto:{lead_data.get('contacto_email', '')}">{lead_data.get('contacto_email', 'N/A')}</a></td>
                </tr>
            </table>
            
            {f'<p style="margin-top: 15px;"><strong>Descripción:</strong> {lead_data.get("descripcion_libre", "")}</p>' if lead_data.get('descripcion_libre') else ''}
            {f'<p><strong>Observaciones:</strong> {lead_data.get("observaciones", "")}</p>' if lead_data.get('observaciones') and lead_data.get('observaciones') != 'No' else ''}
            
            <p style="margin-top: 20px; color: #6c757d; font-size: 12px;">
                Recibido: {lead_data.get('timestamp', datetime.now(timezone.utc).isoformat())}
            </p>
        </div>
    </div>
    """
    
    subject = f"🔔 Nuevo Lead GASI - {lead_data.get('servicio_nombre', 'Consulta')}"
    
    # Si tenemos API key de Resend, enviar email real
    if RESEND_API_KEY:
        try:
            import resend
            resend.api_key = RESEND_API_KEY
            
            params = {
                "from": SENDER_EMAIL,
                "to": [RECIPIENT_EMAIL],
                "subject": subject,
                "html": html_content
            }
            
            # Ejecutar en thread para no bloquear
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"✅ Email enviado a {RECIPIENT_EMAIL} - ID: {email_result.get('id')}")
            print(f"✅ EMAIL ENVIADO a {RECIPIENT_EMAIL}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error enviando email: {str(e)}")
            print(f"❌ ERROR ENVIANDO EMAIL: {str(e)}")
            return False
    else:
        # Sin API key, mostrar en logs
        print(f"\n{'='*60}")
        print(f"📧 LEAD CAPTURADO - Email pendiente de configurar")
        print(f"{'='*60}")
        print(f"Para: {RECIPIENT_EMAIL}")
        print(f"Asunto: {subject}")
        print(f"\nDatos del lead:")
        print(f"  - Servicio: {lead_data.get('servicio_nombre')}")
        print(f"  - Contacto: {lead_data.get('contacto_nombre')}")
        print(f"  - Teléfono: {lead_data.get('contacto_telefono')}")
        print(f"  - Email: {lead_data.get('contacto_email')}")
        print(f"{'='*60}")
        print(f"⚠️  Para activar envío de emails, añade RESEND_API_KEY al .env")
        print(f"{'='*60}\n")
        return False

@router.post("/message", response_model=ChatResponse)
async def chat_message(
    message: ChatMessage,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    session_id = message.session_id or f"chat_{uuid.uuid4().hex[:12]}"
    
    # Obtener o crear chatbot de sesión con persistencia
    chatbot, session_id = await get_or_create_chatbot(db, session_id)
    
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
    
    # Guardar estado del chatbot
    await save_chatbot_state(db, session_id, chatbot)
    
    # Si completó el flujo, enviar email
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
        
        # Enviar email de notificación
        background_tasks.add_task(send_lead_email, lead_data)
    
    # Construir respuesta
    response_parts = []
    for resp in responses:
        if resp["type"] == "text":
            response_parts.append(resp["content"])
        elif resp["type"] == "buttons" and "content" in resp:
            response_parts.append(resp["content"])
    
    response_text = "\n\n".join(response_parts) if response_parts else ""
    
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