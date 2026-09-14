import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from internal_clinical_activation_policy import (  # noqa: E402
    BLOCKED_LABEL,
    LEGAL_CLINICAL_GATES,
    TECHNICAL_GATES,
    capability_label,
    evaluate_real_data_activation,
    front_b_contingency_notice,
)


def all_true(keys):
    return {key: True for key in keys}


def test_missing_gate_fails_closed():
    technical = all_true(TECHNICAL_GATES)
    technical.pop("restore_test_passed")
    decision = evaluate_real_data_activation(
        technical,
        all_true(LEGAL_CLINICAL_GATES),
        fernando_approved_hosting=True,
    )
    assert decision.allowed is False
    assert decision.status == "NO_GO_REAL_DATA"
    assert "restore_test_passed" in decision.missing_technical


def test_hosting_requires_explicit_fernando_approval_even_if_every_gate_is_true():
    decision = evaluate_real_data_activation(
        all_true(TECHNICAL_GATES),
        all_true(LEGAL_CLINICAL_GATES),
        fernando_approved_hosting=False,
    )
    assert decision.allowed is False


def test_only_complete_explicit_gate_set_can_return_go():
    decision = evaluate_real_data_activation(
        all_true(TECHNICAL_GATES),
        all_true(LEGAL_CLINICAL_GATES),
        fernando_approved_hosting=True,
    )
    assert decision.allowed is True
    assert decision.status == "GO_REAL_DATA"


def test_pending_clinical_capabilities_remain_visibly_blocked():
    for capability in (
        "remote_medical_indication",
        "external_prescription",
        "nursing_action_from_medical_indication",
    ):
        assert capability_label(capability, all_true(LEGAL_CLINICAL_GATES)) == BLOCKED_LABEL


def test_level_one_notice_never_presents_web_as_replacement_for_call():
    notice = front_b_contingency_notice(1).lower()
    assert "llamada telefónica directa" in notice
    assert "no sustituye la llamada" in notice


def test_general_contingency_forbids_front_a_clinical_copy():
    notice = front_b_contingency_notice().lower()
    assert "no copiar contenido clínico" in notice
    assert "frente a" in notice
    assert "logs técnicos" in notice
