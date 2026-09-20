from fastapi import APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
import stripe
import os
import uuid
from datetime import datetime, timezone
from auth import get_current_user

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["payments"])

async def get_db():
    from server import db
    return db

@router.post("/create-checkout")
async def create_checkout_session(
    course_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.get("is_free", True):
        raise HTTPException(status_code=400, detail="Course is free")
    
    if not os.getenv("STRIPE_SECRET_KEY") or not os.getenv("FRONTEND_URL"):
        raise HTTPException(status_code=503, detail="payment_service_unavailable")
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": course["title"],
                        "description": course["description"],
                    },
                    "unit_amount": int(course["price"] * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{os.environ['FRONTEND_URL']}/dashboard?payment=success",
            cancel_url=f"{os.environ['FRONTEND_URL']}/formacion-sanitaria?payment=cancel",
            metadata={
                "course_id": course_id,
                "user_id": current_user["user_id"]
            }
        )
        
        return {"checkout_url": session.url}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="payment_service_unavailable")

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="payment_service_unavailable")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("payment_status") != "paid":
            return {"status": "ignored"}
        course_id = session["metadata"]["course_id"]
        user_id = session["metadata"]["user_id"]
        course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
        if not course or course.get("is_free", True):
            raise HTTPException(status_code=422, detail="invalid_payment_course")
        
        enrollment_doc = {
            "enrollment_id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "progress": 0.0,
            "completed_module_ids": [],
            "completed_at": None,
            "certificate_id": None,
            "payment_status": "completed",
            "stripe_checkout_session_id": session.get("id"),
            "stripe_event_id": event.get("id"),
            "enrolled_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.enrollments.update_one(
            {"user_id": user_id, "course_id": course_id},
            {"$setOnInsert": enrollment_doc},
            upsert=True
        )
    
    return {"status": "success"}