import io
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response, UploadFile

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import auth
from models import Course, CourseCreate, EnrollmentCreate
from routes import admin, auth as auth_routes, courses, payments
from models import UserCreate
from course_material_storage import CourseMaterialStorageError, StoredObject, get_course_material_storage


class FakeResult:
    def __init__(self, upserted_id=None):
        self.upserted_id = upserted_id


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, limit):
        return [dict(x) for x in self.docs[:limit]]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(x) for x in (docs or [])]

    @staticmethod
    def _matches(doc, query):
        for key, value in query.items():
            if isinstance(value, dict) and "$in" in value:
                if doc.get(key) not in value["$in"]:
                    return False
            elif doc.get(key) != value:
                return False
        return True

    @staticmethod
    def _project(doc, projection):
        result = dict(doc)
        if not projection:
            return result
        excluded = {key for key, value in projection.items() if value == 0}
        included = {key for key, value in projection.items() if value == 1 and key != "_id"}
        if included:
            result = {key: result[key] for key in included if key in result}
        for key in excluded:
            result.pop(key, None)
        return result

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if self._matches(doc, query):
                return self._project(doc, projection)
        return None

    def find(self, query, projection=None):
        docs = [self._project(doc, projection) for doc in self.docs if self._matches(doc, query)]
        return FakeCursor(docs)

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return FakeResult(upserted_id=len(self.docs))

    async def delete_many(self, query):
        before=len(self.docs)
        self.docs=[doc for doc in self.docs if not self._matches(doc,query)]
        return SimpleNamespace(deleted_count=before-len(self.docs))

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
    def __init__(self, *, courses_docs=None, users=None, enrollments=None, sessions=None, materials=None):
        self.courses = FakeCollection(courses_docs)
        self.users = FakeCollection(users)
        self.enrollments = FakeCollection(enrollments)
        self.user_sessions = FakeCollection(sessions)
        self.course_materials = FakeCollection(materials)


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


@pytest.mark.asyncio
async def test_registration_sets_revocable_http_only_cookie(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "synthetic-public-jwt-secret-32-bytes-minimum-2026")
    db=FakeDB()
    response=Response()
    result=await auth_routes.register(
        UserCreate(name="Alumno Prueba",email="student@example.com",password="SyntheticPass123!"),
        response=response,
        db=db,
    )
    assert result.user.email=="student@example.com"
    cookie=response.headers.get("set-cookie","")
    assert "session_token=" in cookie
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=none" in cookie
    assert len(db.user_sessions.docs)==1


@pytest.mark.asyncio
async def test_public_session_store_revokes_existing_jwt(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "synthetic-public-jwt-secret-32-bytes-minimum-2026")
    token=auth.create_access_token({"user_id":"PUBLIC-1","email":"public@example.com"})
    future="2099-01-01T00:00:00+00:00"
    db=FakeDB(sessions=[{"user_id":"PUBLIC-1","session_token":token,"expires_at":future}])
    monkeypatch.setitem(sys.modules,"server",SimpleNamespace(db=db))
    payload=await auth.get_current_user(session_token=token,authorization=None)
    assert payload["user_id"]=="PUBLIC-1"

    db.user_sessions.docs.clear()
    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user(session_token=token,authorization=None)
    assert exc.value.status_code==401
    assert exc.value.detail=="Session expired or revoked"


@pytest.mark.asyncio
async def test_oauth_requires_real_provider_and_mints_local_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "synthetic-public-jwt-secret-32-bytes-minimum-2026")
    monkeypatch.delenv("OAUTH_BACKEND_URL",raising=False)
    db=FakeDB()
    with pytest.raises(HTTPException) as exc:
        await auth_routes.create_session_from_oauth("provider-session",Response(),db)
    assert exc.value.status_code==503
    assert exc.value.detail=="oauth_not_configured"

    monkeypatch.setenv("OAUTH_BACKEND_URL","https://oauth.example.invalid")

    class ProviderResponse:
        status_code=200
        def json(self):
            return {
                "email":"oauth@example.com",
                "name":"OAuth Student",
                "picture":None,
                "session_token":"provider-token-must-not-be-used-locally",
            }

    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): return False
        async def get(self,*args,**kwargs): return ProviderResponse()

    monkeypatch.setattr(auth_routes.httpx,"AsyncClient",lambda:Client())
    response=Response()
    result=await auth_routes.create_session_from_oauth("provider-session",response,db)
    assert result.user.email=="oauth@example.com"
    assert result.token!="provider-token-must-not-be-used-locally"
    assert auth.decode_token(result.token)["user_id"]==result.user.user_id
    assert result.token in response.headers.get("set-cookie","")
    assert db.user_sessions.docs[0]["session_token"]==result.token


def course_with_module(course_id="COURSE-MATERIAL"):
    return {
        **free_course(),
        "course_id": course_id,
        "title": "Curso con material",
        "modules": [{"module_id": "MOD-1", "title": "Módulo 1", "order": 1, "description": "Sintético"}],
    }


def test_public_course_schema_drops_legacy_material_urls():
    doc=course_with_module()
    doc["modules"][0]["pdfs"]=["/uploads/private.pdf"]
    doc["modules"][0]["videos"]=["https://private.invalid/video"]
    public=Course(**doc).model_dump()
    assert "pdfs" not in public["modules"][0]
    assert "videos" not in public["modules"][0]


@pytest.mark.asyncio
async def test_unenrolled_student_cannot_list_or_stream_materials(monkeypatch):
    db=FakeDB(
        courses_docs=[course_with_module()],
        users=[{"user_id":"STUDENT-X","is_admin":False}],
        materials=[{
            "material_id":"MAT-1","course_id":"COURSE-MATERIAL","module_id":"MOD-1",
            "object_key":"courses/COURSE-MATERIAL/MOD-1/MAT-1.pdf",
            "filename":"privado.pdf","content_type":"application/pdf","size":12,
        }],
    )
    calls={"storage":0}
    def forbidden_storage():
        calls["storage"]+=1
        raise AssertionError("storage must not be reached before authorization")
    monkeypatch.setattr(courses,"get_course_material_storage",forbidden_storage)

    with pytest.raises(HTTPException) as exc:
        await courses.list_course_materials("COURSE-MATERIAL",{"user_id":"STUDENT-X"},db)
    assert exc.value.status_code==403

    with pytest.raises(HTTPException) as exc:
        await courses.stream_course_material("COURSE-MATERIAL","MAT-1",{"user_id":"STUDENT-X"},db)
    assert exc.value.status_code==403
    assert calls["storage"]==0


@pytest.mark.asyncio
async def test_enrolled_student_lists_materials_without_private_object_key():
    db=FakeDB(
        courses_docs=[course_with_module()],
        users=[{"user_id":"STUDENT-1","is_admin":False}],
        enrollments=[{"enrollment_id":"ENR-1","user_id":"STUDENT-1","course_id":"COURSE-MATERIAL"}],
        materials=[{
            "material_id":"MAT-1","course_id":"COURSE-MATERIAL","module_id":"MOD-1",
            "object_key":"courses/COURSE-MATERIAL/MOD-1/MAT-1.pdf",
            "created_by":"ADMIN-1","filename":"tema.pdf","content_type":"application/pdf","size":12,
        }],
    )
    result=await courses.list_course_materials("COURSE-MATERIAL",{"user_id":"STUDENT-1"},db)
    assert len(result)==1
    assert result[0]["material_id"]=="MAT-1"
    assert "object_key" not in result[0]
    assert "created_by" not in result[0]


@pytest.mark.asyncio
async def test_material_id_cannot_cross_course_boundary(monkeypatch):
    db=FakeDB(
        courses_docs=[course_with_module("COURSE-A"),course_with_module("COURSE-B")],
        users=[{"user_id":"STUDENT-1","is_admin":False}],
        enrollments=[{"enrollment_id":"ENR-A","user_id":"STUDENT-1","course_id":"COURSE-A"}],
        materials=[{
            "material_id":"MAT-B","course_id":"COURSE-B","module_id":"MOD-1",
            "object_key":"courses/COURSE-B/MOD-1/MAT-B.pdf",
            "filename":"otro.pdf","content_type":"application/pdf","size":12,
        }],
    )
    monkeypatch.setattr(courses,"get_course_material_storage",lambda: (_ for _ in ()).throw(AssertionError("must not reach storage")))
    with pytest.raises(HTTPException) as exc:
        await courses.stream_course_material("COURSE-A","MAT-B",{"user_id":"STUDENT-1"},db)
    assert exc.value.status_code==404
    assert exc.value.detail=="material_not_found"


@pytest.mark.asyncio
async def test_authorized_material_stream_is_private_inline(monkeypatch):
    db=FakeDB(
        courses_docs=[course_with_module()],
        users=[{"user_id":"STUDENT-1","is_admin":False}],
        enrollments=[{"enrollment_id":"ENR-1","user_id":"STUDENT-1","course_id":"COURSE-MATERIAL"}],
        materials=[{
            "material_id":"MAT-1","course_id":"COURSE-MATERIAL","module_id":"MOD-1",
            "object_key":"courses/COURSE-MATERIAL/MOD-1/MAT-1.pdf",
            "filename":"Tema clínico.pdf","content_type":"application/pdf","size":9,
        }],
    )

    class Body:
        def iter_chunks(self,chunk_size):
            return iter([b"%PDF-test"])

    class Storage:
        def get_pdf(self,object_key):
            assert object_key=="courses/COURSE-MATERIAL/MOD-1/MAT-1.pdf"
            return StoredObject(body=Body(),content_length=9,content_type="application/pdf")

    monkeypatch.setattr(courses,"get_course_material_storage",lambda:Storage())
    response=await courses.stream_course_material("COURSE-MATERIAL","MAT-1",{"user_id":"STUDENT-1"},db)
    assert response.status_code==200
    assert response.media_type=="application/pdf"
    assert response.headers["cache-control"]=="private, no-store"
    assert response.headers["content-disposition"].startswith("inline;")
    assert "object_key" not in response.headers["content-disposition"]


@pytest.mark.asyncio
async def test_admin_upload_rejects_invalid_pdf_before_storage(monkeypatch):
    db=FakeDB(
        courses_docs=[course_with_module()],
        users=[{"user_id":"ADMIN-1","is_admin":True}],
    )
    monkeypatch.setattr(admin,"get_course_material_storage",lambda: (_ for _ in ()).throw(AssertionError("must not reach storage")))
    file=UploadFile(filename="fake.pdf",file=io.BytesIO(b"not-a-pdf"))
    with pytest.raises(HTTPException) as exc:
        await admin.admin_upload_course_material(
            "COURSE-MATERIAL",file,"MOD-1",{"user_id":"ADMIN-1"},db
        )
    assert exc.value.status_code==422
    assert exc.value.detail=="invalid_pdf_content"


@pytest.mark.asyncio
async def test_admin_upload_fails_closed_without_private_storage(monkeypatch):
    db=FakeDB(
        courses_docs=[course_with_module()],
        users=[{"user_id":"ADMIN-1","is_admin":True}],
    )
    def unavailable():
        raise CourseMaterialStorageError("course_material_storage_not_configured")
    monkeypatch.setattr(admin,"get_course_material_storage",unavailable)
    file=UploadFile(filename="tema.pdf",file=io.BytesIO(b"%PDF-1.7\nsynthetic"))
    with pytest.raises(HTTPException) as exc:
        await admin.admin_upload_course_material(
            "COURSE-MATERIAL",file,"MOD-1",{"user_id":"ADMIN-1"},db
        )
    assert exc.value.status_code==503
    assert exc.value.detail=="course_material_storage_not_configured"
    assert db.course_materials.docs==[]
