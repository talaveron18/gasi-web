from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import ContactForm
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/contact", tags=["contact"])

async def get_db():
    from server import db
    return db

@router.post("/submit")
async def submit_contact(
    form: ContactForm,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not form.accepts_privacy:
        raise HTTPException(status_code=400, detail="Must accept privacy policy")
    
    lead_doc = {
        "lead_id": str(uuid.uuid4()),
        "source": "contact_form",
        "name": form.name,
        "company": form.company,
        "email": form.email,
        "phone": form.phone,
        "employee_count": form.employee_count,
        "service_type": form.service_type,
        "message": form.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contact_leads.insert_one(lead_doc)
    
    return {"message": "Formulario recibido correctamente. Nos pondremos en contacto pronto."}