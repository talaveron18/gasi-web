"""Activation policy for GASI Front B.

This module contains no patient data and does not authorize clinical activity.
It exists so synthetic prototypes and future deployment automation can fail closed
until every independently owned gate has explicit evidence.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

BLOCKED_LABEL = "BLOQUEADA PARA ACTIVACIÓN REAL"
REAL_DATA_NO_GO = "NO_GO_REAL_DATA"

TECHNICAL_GATES = (
    "eu_hosting_approved",
    "article_28_dpa_verified",
    "encryption_at_rest_verified",
    "encryption_in_transit_verified",
    "backup_configured",
    "restore_test_passed",
    "strong_auth_individual_identities",
    "rbac_least_privilege_verified",
    "secure_sessions_verified",
    "clinical_audit_verified",
    "front_a_isolation_verified",
    "secrets_outside_code_verified",
    "continuity_contingency_tested",
    "integrity_reconciliation_tested",
    "privacy_clinical_record_gate_closed",
)

LEGAL_CLINICAL_GATES = (
    "nursing_classification_prioritisation",
    "remote_physician_response_criterion",
    "remote_medical_indication",
    "external_prescription",
    "nursing_action_from_medical_indication",
    "clinical_documentation_report_closure",
)

# These capabilities remain explicitly blocked according to the current Legal/Clinical
# traceability read on 2026-09-14. Their presence in a prototype is never evidence of GO.
EXPLICITLY_BLOCKED_CAPABILITIES = frozenset({
    "remote_medical_indication",
    "external_prescription",
    "nursing_action_from_medical_indication",
})


@dataclass(frozen=True)
class ActivationDecision:
    allowed: bool
    status: str
    missing_technical: tuple[str, ...]
    missing_legal_clinical: tuple[str, ...]


def evaluate_real_data_activation(
    technical: Mapping[str, bool],
    legal_clinical: Mapping[str, bool],
    *,
    fernando_approved_hosting: bool,
) -> ActivationDecision:
    """Return GO only when every required gate is explicitly True.

    Missing keys, None-like values and false values all fail closed. Fernando's
    explicit hosting approval is an independent mandatory gate.
    """
    missing_technical = tuple(g for g in TECHNICAL_GATES if technical.get(g) is not True)
    missing_legal = tuple(g for g in LEGAL_CLINICAL_GATES if legal_clinical.get(g) is not True)
    allowed = fernando_approved_hosting and not missing_technical and not missing_legal
    return ActivationDecision(
        allowed=allowed,
        status="GO_REAL_DATA" if allowed else REAL_DATA_NO_GO,
        missing_technical=missing_technical,
        missing_legal_clinical=missing_legal,
    )


def capability_label(capability: str, legal_clinical: Mapping[str, bool]) -> str:
    """Provide the mandatory UI/operational label for gated clinical capabilities."""
    if capability in EXPLICITLY_BLOCKED_CAPABILITIES:
        return BLOCKED_LABEL
    if capability in LEGAL_CLINICAL_GATES and legal_clinical.get(capability) is not True:
        return BLOCKED_LABEL
    return "PROTOTIPO SINTÉTICO — NO IMPLICA ACTIVACIÓN REAL"


def front_b_contingency_notice(level: int | None = None) -> str:
    """Safe contingency wording without routing clinical content through Front A."""
    if level == 1:
        return (
            "NIVEL 1 URGENCIA: realizar llamada telefónica directa al facultativo y activar "
            "el circuito de emergencia/derivación que corresponda. La web no sustituye la llamada."
        )
    return (
        "Si el canal clínico no está disponible, no copiar contenido clínico a sistemas del Frente A, "
        "correo corporativo ni logs técnicos. Utilizar únicamente la contingencia clínica validada."
    )
