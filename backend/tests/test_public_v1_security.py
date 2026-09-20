import os
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import auth
from models import CourseCreate, EnrollmentCreate
from routes import courses, payments


class FakeResult:
    def __init__(self, upserted_id=None):
        self.upserted_id = upserted_id


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(x) for x in (docs or [])]

    @staticmethod
    def _matches(doc, query):
        return all(doc.get(k) == v for k, v in query.items())

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if self._matches(doc, query):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return FakeResult(upserted_id=len(self.docs))

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return FakeResult()
        if upsert:
            new_doc = dict(query)
            new_doc.update(update.get("$setOnInsert", {}))
            self.docs.append(new_doc)
            return FakeResult(upserted_id=len(self.docs))
        return FakeResult()


class FakeDB:
    def __init__(self, *, courses_docs=None, users=None, enrollments=None):
        self.courses = FakeCollection(courses_docs)
        self.users = FakeCollection(users)
        self.enrollments = FakeCollection(enrollments)


def paid_course():
    return {
        "course_id": "COURSE-PAID",
        "title": "Curso sintético de pago",
        "description": "Solo para pruebas",
        "duration": "2 horas",
        "type": "Online",
        "price": 25.0,
        "is_free": False,
        "modules": [],
    }


def free_course():
    return {
        **paid_course(),
        "course_id": "COURSE-FREE",
        "title": "Curso sintético gratuito",
        "price": 0.0,
        "is_free": True,
    }


def test_public_jwt_secret_fails_closed(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        auth.create_access_token({"user_id": "PUBLIC-USER"})

    monkeypatch.setenv("JWT_SECRET_KEY", "short")
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        auth.create_access_token({"user_id": "PUBLIC-USER"})


def test_public_jwt_roundtrip_with_server_grade_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "synthetic-public-jwt-secret-32-bytes-minimum-2026")
    token = auth.create_access_token({"user_id": "PUBLIC-USER"})
    assert auth.decode_token(token)["user_id"] == "PUBLIC-USER"


@pytest.mark.asyncio
async def test_course_creation_requires_admin():
    db = FakeDB(users=[{"user_id": "STUDENT-1", "is_admin": False}])
    with pytest.raises(HTTPException) as exc:
        await courses.require_admin(current_user={"user_id": "STUDENT-1"}, db=db)
    assert exc.value.status_code == 403

    admin = FakeDB(users=[{"user_id": "ADMIN-1", "is_admin": True}])
    assert await courses.require_admin(current_user={"user_id": "ADMIN-1"}, db=admin) == {"user_id": "ADMIN-1"}


@pytest.mark.asyncio
async def test_paid_course_cannot_be_enrolled_without_payment():
    db = FakeDB(courses_docs=[paid_course()])
    with pytest.raises(HTTPException) as exc:
        await courses.enroll_course(
            EnrollmentCreate(course_id="COURSE-PAID"),
            current_user={"user_id": "STUDENT-1"},
            db=db,
        )
    assert exc.value.status_code == 402
    assert exc.value.detail == "payment_required"
    assert db.enrollments.docs == []


@pytest.mark.asyncio
async def test_free_course_enrollment_uses_authenticated_user():
    db = FakeDB(courses_docs=[free_course()])
    enrolled = await courses.enroll_course(
        EnrollmentCreate(course_id="COURSE-FREE"),
        current_user={"user_id": "STUDENT-1"},
        db=db,
    )
    assert enrolled.user_id == "STUDENT-1"
    assert enrolled.course_id == "COURSE-FREE"
    assert len(db.enrollments.docs) == 1


@pytest.mark.asyncio
async def test_checkout_metadata_comes_from_authenticated_user(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_synthetic")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.invalid")
    captured = {}

    class Checkout:
        url = "https://checkout.invalid/session"

    def fake_create(**kwargs):
        captured.update(kwargs)
        return Checkout()

    monkeypatch.setattr(payments.stripe.checkout.Session, "create", fake_create)
    db = FakeDB(courses_docs=[paid_course()])
    result = await payments.create_checkout_session(
        "COURSE-PAID",
        current_user={"user_id": "AUTHENTICATED-USER"},
        db=db,
    )
    assert result["checkout_url"] == Checkout.url
    assert captured["metadata"] == {
        "course_id": "COURSE-PAID",
        "user_id": "AUTHENTICATED-USER",
    }


@pytest.mark.asyncio
async def test_paid_webhook_is_idempotent_by_user_and_course(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic")
    event = {
        "id": "evt_synthetic_1",
        "type": "checkout.session.completed",
        "data": {"object": {
            "id": "cs_synthetic_1",
            "payment_status": "paid",
            "metadata": {"course_id": "COURSE-PAID", "user_id": "STUDENT-1"},
        }},
    }
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", lambda payload, signature, secret: event)

    class Request:
        headers = {"stripe-signature": "synthetic-signature"}
        async def body(self):
            return b"{}"

    db = FakeDB(courses_docs=[paid_course()])
    assert await payments.stripe_webhook(Request(), db=db) == {"status": "success"}
    assert await payments.stripe_webhook(Request(), db=db) == {"status": "success"}
    assert len(db.enrollments.docs) == 1
    stored = db.enrollments.docs[0]
    assert stored["user_id"] == "STUDENT-1"
    assert stored["course_id"] == "COURSE-PAID"
    assert stored["payment_status"] == "completed"


@pytest.mark.asyncio
async def test_unpaid_webhook_does_not_create_enrollment(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic")
    event = {
        "id": "evt_synthetic_unpaid",
        "type": "checkout.session.completed",
        "data": {"object": {
            "id": "cs_synthetic_unpaid",
            "payment_status": "unpaid",
            "metadata": {"course_id": "COURSE-PAID", "user_id": "STUDENT-1"},
        }},
    }
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", lambda payload, signature, secret: event)

    class Request:
        headers = {"stripe-signature": "synthetic-signature"}
        async def body(self):
            return b"{}"

    db = FakeDB(courses_docs=[paid_course()])
    assert await payments.stripe_webhook(Request(), db=db) == {"status": "ignored"}
    assert db.enrollments.docs == []
