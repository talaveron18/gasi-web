from fastapi import APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
import stripe
import os
import uuid
from datetime import datetime, timezone

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["payments"])

async def get_db():
    from server import db
    return db

@router.post("/create-checkout")
async def create_checkout_session(
    course_id: str,
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.get("is_free", True):
        raise HTTPException(status_code=400, detail="Course is free")
    
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
                "user_id": user_id
            }
        )
        
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
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
        course_id = session["metadata"]["course_id"]
        user_id = session["metadata"]["user_id"]
        
        enrollment_doc = {
            "enrollment_id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "progress": 0.0,
            "payment_status": "completed",
            "enrolled_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.enrollments.insert_one(enrollment_doc)
    
    return {"status": "success"}