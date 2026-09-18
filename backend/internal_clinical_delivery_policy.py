"""Fail-closed delivery/read semantics for the synthetic clinical channel.

Clinical real-data activation remains blocked. This module only models operational
state for synthetic tests and prevents RESPONDIDO/EMITIDA from being treated as
proof of delivery, reading or execution.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


DELIVERY_PENDING = "PENDIENTE_ENTREGA"
DELIVERY_FAILED = "FALLO_ENTREGA"
ALTERNATE_CHANNEL_REQUIRED = "CANAL_ALTERNATIVO_REQUERIDO"
DELIVERED = "ENTREGADA"
READ = "LEIDA"


class DeliveryPolicyError(ValueError):
    pass


@dataclass(frozen=True)
class DeliveryState:
    status: str = DELIVERY_PENDING
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    delivered_to_identity: Optional[str] = None\n    failure_reason: Optional[str] = None


def _aware_utc(value: datetime) -> bool:
    return value.tzinfo is not None and value.utcoffset() is not None


def mark_delivered(state: DeliveryState, *, identity_id: str, at: datetime) -> DeliveryState:
    if not identity_id or not identity_id.strip():
        raise DeliveryPolicyError("INVALID_IDENTITY")
    if not _aware_utc(at):
        raise DeliveryPolicyError("INVALID_CLOCK")
    if state.status != DELIVERY_PENDING:
        raise DeliveryPolicyError("INVALID_TRANSITION")
    return DeliveryState(
        status=DELIVERED,
        delivered_at=at.astimezone(timezone.utc),
        read_at=None,
        delivered_to_identity=identity_id.strip(),
    )


def mark_read(state: DeliveryState, *, identity_id: str, at: datetime) -> DeliveryState:
    if not identity_id or not identity_id.strip():
        raise DeliveryPolicyError("INVALID_IDENTITY")
    if not _aware_utc(at):
        raise DeliveryPolicyError("INVALID_CLOCK")
    if state.status != DELIVERED or state.delivered_at is None:
        raise DeliveryPolicyError("DELIVERY_REQUIRED")
    if identity_id.strip() != state.delivered_to_identity:
        raise DeliveryPolicyError("IDENTITY_MISMATCH")
    read_at = at.astimezone(timezone.utc)
    if read_at < state.delivered_at:
        raise DeliveryPolicyError("INVALID_CLOCK")
    return DeliveryState(
        status=READ,
        delivered_at=state.delivered_at,
        read_at=read_at,
        delivered_to_identity=state.delivered_to_identity,
    )


def execution_is_proven(_: DeliveryState) -> bool:
    """Reading a response never proves that a clinical action was executed."""
    return False


def mark_delivery_failed(state: DeliveryState, *, reason: str) -> DeliveryState:
    if state.status != DELIVERY_PENDING:
        raise DeliveryPolicyError("INVALID_TRANSITION")
    if not reason or not reason.strip():
        raise DeliveryPolicyError("FAILURE_REASON_REQUIRED")
    return DeliveryState(status=DELIVERY_FAILED, failure_reason=reason.strip())


def require_alternate_channel(state: DeliveryState) -> DeliveryState:
    if state.status != DELIVERY_FAILED:
        raise DeliveryPolicyError("DELIVERY_FAILURE_REQUIRED")
    return DeliveryState(status=ALTERNATE_CHANNEL_REQUIRED, failure_reason=state.failure_reason)
