from backend.internal_clinical_rbac import clinical_content_allowed, decide_episode_access


def test_nurse_can_access_assigned_center_clinically():
    decision = decide_episode_access(
        role="nurse",
        actor_centers={"Centro ficticio Madrid 01"},
        episode_center="Centro ficticio Madrid 01",
    )
    assert decision.allowed is True
    assert decision.view == "clinical"


def test_physician_cannot_access_unassigned_center():
    decision = decide_episode_access(
        role="physician",
        actor_centers={"Centro ficticio Madrid 01"},
        episode_center="Centro ficticio Madrid 02",
    )
    assert decision.allowed is False
    assert decision.view == "none"


def test_admin_never_gets_clinical_view():
    decision = decide_episode_access(
        role="admin",
        actor_centers=set(),
        episode_center="Centro ficticio Madrid 01",
    )
    assert decision.allowed is True
    assert decision.view == "operational"
    assert clinical_content_allowed(
        role="admin",
        actor_centers=set(),
        episode_center="Centro ficticio Madrid 01",
    ) is False


def test_unknown_role_fails_closed():
    decision = decide_episode_access(  # type: ignore[arg-type]
        role="unexpected",
        actor_centers={"Centro ficticio Madrid 01"},
        episode_center="Centro ficticio Madrid 01",
    )
    assert decision.allowed is False
    assert decision.view == "none"
