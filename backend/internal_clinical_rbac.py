from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Literal

Role = Literal["nurse", "physician", "admin"]


@dataclass(frozen=True)
class ClinicalAccessDecision:
    allowed: bool
    view: Literal["clinical", "operational", "none"]
    reason: str


CLINICAL_ROLES: FrozenSet[Role] = frozenset({"nurse", "physician"})


def decide_episode_access(*, role: Role, actor_centers: set[str], episode_center: str) -> ClinicalAccessDecision:
    """Fail-closed RBAC decision for the synthetic clinical prototype.

    Clinical roles only see episodes in an explicitly assigned centre. Administration
    never receives clinical content; it may only receive the minimised operational
    projection produced by the route layer.
    """
    if role in CLINICAL_ROLES:
        if episode_center in actor_centers:
            return ClinicalAccessDecision(True, "clinical", "assigned_clinical_center")
        return ClinicalAccessDecision(False, "none", "clinical_center_not_assigned")

    if role == "admin":
        return ClinicalAccessDecision(True, "operational", "admin_operational_metadata_only")

    return ClinicalAccessDecision(False, "none", "role_not_authorized")


def clinical_content_allowed(*, role: Role, actor_centers: set[str], episode_center: str) -> bool:
    decision = decide_episode_access(role=role, actor_centers=actor_centers, episode_center=episode_center)
    return decision.allowed and decision.view == "clinical"
