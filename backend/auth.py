"""Password helpers for the legacy internal Python policy/test harness.

The deployable web application authenticates public users in
netlify/functions/public-api.mts and internal users in
netlify/functions/internal-clinical.mts. This module is not a public
authentication backend.
"""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
