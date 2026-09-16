from datetime import datetime, timedelta, timezone

import pytest

from internal_clinical_delivery_policy import (
    DELIVERED,
    DELIVERY_PENDING,
    READ,
    DeliveryPolicyError,
    DeliveryState,
    execution_is_proven,
    mark_delivered,
    mark_read,
)


def now():
    return datetime(2026, 9, 16, 5, 0, tzinfo=timezone.utc)


def test_response_starts_without_delivery_proof():
    state = DeliveryState()
    assert state.status == DELIVERY_PENDING
    assert state.delivered_at is None
    assert state.read_at is None
    assert execution_is_proven(state) is False


def test_delivery_and_read_are_distinct_attributed_transitions():
    delivered = mark_delivered(DeliveryState(), identity_id="nurse-01", at=now())
    assert delivered.status == DELIVERED
    assert delivered.delivered_to_identity == "nurse-01"
    assert delivered.read_at is None

    read = mark_read(delivered, identity_id="nurse-01", at=now() + timedelta(minutes=2))
    assert read.status == READ
    assert read.read_at is not None
    assert execution_is_proven(read) is False


def test_read_requires_prior_delivery():
    with pytest.raises(DeliveryPolicyError, match="DELIVERY_REQUIRED"):
        mark_read(DeliveryState(), identity_id="nurse-01", at=now())


def test_read_identity_must_match_delivery_identity():
    delivered = mark_delivered(DeliveryState(), identity_id="nurse-01", at=now())
    with pytest.raises(DeliveryPolicyError, match="IDENTITY_MISMATCH"):
        mark_read(delivered, identity_id="nurse-02", at=now() + timedelta(minutes=1))


def test_impossible_read_chronology_fails_closed():
    delivered = mark_delivered(DeliveryState(), identity_id="nurse-01", at=now())
    with pytest.raises(DeliveryPolicyError, match="INVALID_CLOCK"):
        mark_read(delivered, identity_id="nurse-01", at=now() - timedelta(seconds=1))


def test_naive_timestamps_and_empty_identity_fail_closed():
    with pytest.raises(DeliveryPolicyError, match="INVALID_IDENTITY"):
        mark_delivered(DeliveryState(), identity_id=" ", at=now())
    with pytest.raises(DeliveryPolicyError, match="INVALID_CLOCK"):
        mark_delivered(DeliveryState(), identity_id="nurse-01", at=datetime(2026, 9, 16, 5, 0))
