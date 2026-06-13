"""Anchor role service — business logic for moderation features."""

from __future__ import annotations

from uuid import UUID

from app.core.errors import ErrorCode, api_error
from app.repositories import anchor_repo
from app.schemas.anchor import (
    AnchorStatus,
    AuditEntry,
    EscalationItem,
    ModerationItem,
    PostPreview,
    ReportCreated,
    VouchingRequestCreated,
    VouchingRequestItem,
)


def check_anchor_status(*, user_id: UUID, neighborhood_id: UUID) -> AnchorStatus:
    """Check if a user is the active anchor for a neighborhood."""
    role = anchor_repo.get_active_anchor_role(neighborhood_id=neighborhood_id)
    if not role:
        return AnchorStatus(is_anchor=False)
    if role["user_id"] != str(user_id):
        return AnchorStatus(is_anchor=False)
    return AnchorStatus(
        is_anchor=True,
        anchor_role_id=role["id"],
        member_id=role["member_id"],
        neighborhood_id=role["neighborhood_id"],
        term_started_at=role.get("term_started_at"),
        term_ends_at=role.get("term_ends_at"),
    )


def require_anchor_role(*, user_id: UUID, neighborhood_id: UUID) -> AnchorStatus:
    """Get the anchor role, raising ForbiddenError if not the anchor."""
    status = check_anchor_status(user_id=user_id, neighborhood_id=neighborhood_id)
    if not status.is_anchor:
        raise api_error(403, ErrorCode.FORBIDDEN, "You are not the anchor of this neighborhood.")
    return status


def get_moderation_queue(*, neighborhood_id: UUID) -> list[ModerationItem]:
    """Get all open reports with post previews for the queue."""
    reports = anchor_repo.get_open_reports(neighborhood_id=neighborhood_id)
    items: list[ModerationItem] = []
    for r in reports:
        post_data = r.get("post") or {}
        author_name = _get_member_name(post_data.get("author_member_id"))
        reporter_name = _get_member_name(r["reporter_member_id"])
        items.append(ModerationItem(
            id=r["id"],
            post=PostPreview(
                id=post_data.get("id"),
                body=(post_data.get("body") or "")[:200],
                category=post_data.get("category", "general"),
                is_emergency=post_data.get("is_emergency", False),
                author_display_name=author_name,
                author_member_id=post_data.get("author_member_id"),
                created_at=post_data.get("created_at"),
            ),
            reporter_member_id=r["reporter_member_id"],
            reporter_display_name=reporter_name,
            reason=r.get("reason", ""),
            status=r.get("status", "open"),
            created_at=r.get("created_at"),
        ))
    return items


def _get_member_name(member_id: UUID | str | None) -> str | None:
    """Helper to resolve a member_id to a display name."""
    if not member_id:
        return None
    return anchor_repo.get_member_display_name(member_id=member_id)


def remove_post_as_anchor(
    *,
    user_id: UUID,
    neighborhood_id: UUID,
    post_id: UUID,
    reason: str,
    anchor_role_id: UUID,
) -> dict:
    """Remove a post (set is_removed) and log the action."""
    post = anchor_repo.get_post_by_id(post_id=post_id)
    if not post:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found.")
    if post.get("neighborhood_id") != str(neighborhood_id):
        raise api_error(403, ErrorCode.FORBIDDEN, "Post does not belong to this neighborhood.")

    updated = anchor_repo.remove_post(
        post_id=post_id,
        removed_by_anchor_id=anchor_role_id,
        reason=reason,
    )
    if not updated:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post could not be removed.")

    anchor_repo.log_anchor_action(
        anchor_role_id=anchor_role_id,
        neighborhood_id=neighborhood_id,
        actor_user_id=user_id,
        action_type="post_removed",
        target_post_id=post_id,
        metadata={"reason": reason},
    )
    return {"post_id": str(post_id), "is_removed": True}


def dismiss_report(
    *,
    user_id: UUID,
    neighborhood_id: UUID,
    report_id: UUID,
    anchor_role_id: UUID,
) -> dict:
    """Dismiss a report without removing the post."""
    report = anchor_repo.get_report_by_id(report_id=report_id)
    if not report:
        raise api_error(404, ErrorCode.REPORT_NOT_FOUND, "Report not found.")
    if report.get("status") != "open":
        raise api_error(409, ErrorCode.CONFLICT, "Report is already resolved.")

    anchor_repo.resolve_report(
        report_id=report_id,
        status="dismissed",
        resolved_by_action="dismissed",
        resolved_by_anchor_role_id=anchor_role_id,
    )

    anchor_repo.log_anchor_action(
        anchor_role_id=anchor_role_id,
        neighborhood_id=neighborhood_id,
        actor_user_id=user_id,
        action_type="dismiss_report",
        target_post_id=report.get("post_id"),
        metadata={"report_id": str(report_id)},
    )
    return {"report_id": str(report_id), "status": "dismissed"}


def report_post(
    *,
    reporter_member_id: UUID,
    post_id: UUID,
    reason: str,
) -> ReportCreated:
    """Create a report against a post."""
    post = anchor_repo.get_post_by_id(post_id=post_id)
    if not post:
        raise api_error(404, ErrorCode.POST_NOT_FOUND, "Post not found.")
    if post.get("is_removed"):
        raise api_error(409, ErrorCode.CONFLICT, "Cannot report a removed post.")
    result = anchor_repo.create_report(
        post_id=post_id,
        reporter_member_id=reporter_member_id,
        reason=reason,
    )
    return ReportCreated(report_id=result["id"], status="open")


def get_vouching_requests(
    *, neighborhood_id: UUID
) -> list[VouchingRequestItem]:
    """Get pending vouching requests for the anchor's neighborhood."""
    requests = anchor_repo.get_pending_vouching(neighborhood_id=neighborhood_id)
    items: list[VouchingRequestItem] = []
    for vr in requests:
        candidate_name = _get_member_name(vr["candidate_member_id"])
        cosigner_name = _get_member_name(vr.get("cosigner_member_id"))
        items.append(VouchingRequestItem(
            id=vr["id"],
            candidate_member_id=vr["candidate_member_id"],
            candidate_display_name=candidate_name,
            initiated_by_anchor_id=vr["initiated_by_anchor_id"],
            cosigner_member_id=vr.get("cosigner_member_id"),
            cosigner_display_name=cosigner_name,
            anchor_signed_at=vr.get("anchor_signed_at"),
            cosigner_signed_at=vr.get("cosigner_signed_at"),
            is_completed=vr.get("is_completed", False),
            is_rejected=vr.get("is_rejected", False),
            rejection_reason=vr.get("rejection_reason"),
            created_at=vr.get("created_at"),
            expires_at=vr.get("expires_at"),
        ))
    return items


def initiate_vouching(
    *,
    neighborhood_id: UUID,
    candidate_member_id: UUID,
    anchor_role_id: UUID,
) -> VouchingRequestCreated:
    """Anchor initiates a Tier 3 vouching request (auto-signs as first signer)."""
    existing = anchor_repo.get_pending_vouching(neighborhood_id=neighborhood_id)
    for ex in existing:
        if ex.get("candidate_member_id") == candidate_member_id:
            raise api_error(409, ErrorCode.CONFLICT, "A pending vouching request already exists for this member.")

    result = anchor_repo.create_vouching_request(
        neighborhood_id=neighborhood_id,
        candidate_member_id=candidate_member_id,
        initiated_by_anchor_id=anchor_role_id,
    )

    # Enrich log actor: we have the anchor_role_id, look up the user_id
    anchor_role = anchor_repo.get_active_anchor_role(neighborhood_id=neighborhood_id)

    anchor_repo.log_anchor_action(
        anchor_role_id=anchor_role_id,
        neighborhood_id=neighborhood_id,
        actor_user_id=anchor_role.get("user_id") if anchor_role else candidate_member_id,
        action_type="vouching_initiated",
        target_member_id=candidate_member_id,
        metadata={"vouching_request_id": result["id"]},
    )

    return VouchingRequestCreated(
        request_id=result["id"],
        candidate_member_id=candidate_member_id,
        expires_at=result.get("expires_at"),
    )


def cosign_vouching(
    *,
    cosigner_member_id: UUID,
    request_id: UUID,
    neighborhood_id: UUID,
) -> dict:
    """A verified member co-signs a vouching request to complete it."""
    vr = anchor_repo.get_vouching_request_by_id(request_id=request_id)
    if not vr:
        raise api_error(404, ErrorCode.VOUCHING_REQUEST_NOT_FOUND, "Vouching request not found.")
    if vr.get("is_completed"):
        raise api_error(409, ErrorCode.CONFLICT, "Vouching request is already completed.")
    if vr.get("is_rejected"):
        raise api_error(409, ErrorCode.CONFLICT, "Vouching request was rejected.")

    # Cosigner must be a different member than the candidate
    if str(vr["candidate_member_id"]) == str(cosigner_member_id):
        raise api_error(403, ErrorCode.FORBIDDEN, "You cannot co-sign your own vouching request.")

    result = anchor_repo.cosign_vouching_request(
        request_id=request_id,
        cosigner_member_id=cosigner_member_id,
    )
    if not result:
        raise api_error(409, ErrorCode.CONFLICT, "Could not co-sign. Request may have expired.")

    anchor_role = anchor_repo.get_active_anchor_role(neighborhood_id=neighborhood_id)
    if anchor_role:
        anchor_repo.log_anchor_action(
            anchor_role_id=anchor_role["id"],
            neighborhood_id=neighborhood_id,
            actor_user_id=anchor_role.get("user_id"),
            action_type="vouching_completed",
            target_member_id=vr["candidate_member_id"],
            metadata={"vouching_request_id": str(request_id)},
        )

    return {"request_id": str(request_id), "is_completed": True}


def get_escalations(
    *, neighborhood_id: UUID
) -> list[EscalationItem]:
    """Get escalations (read-only status display)."""
    rows = anchor_repo.get_escalations(neighborhood_id=neighborhood_id)
    return [
        EscalationItem(
            id=e["id"],
            anchor_action_id=e["anchor_action_id"],
            action_type="",
            action_summary=(
                f"Flagged by {e['flagged_by_count']} of {e['threshold_member_count']} members"
            ),
            status=e.get("status", "open"),
            flagged_by_count=e.get("flagged_by_count", 0),
            threshold_member_count=e.get("threshold_member_count", 0),
            created_at=e.get("created_at"),
        )
        for e in rows
    ]


def get_audit_log(
    *, anchor_role_id: UUID, limit: int = 50
) -> list[AuditEntry]:
    """Get the anchor's action history."""
    rows = anchor_repo.get_audit_log(anchor_role_id=anchor_role_id, limit=limit)
    return [
        AuditEntry(
            id=entry["id"],
            action_type=entry["action_type"],
            target_post_id=entry.get("target_post_id"),
            target_member_id=entry.get("target_member_id"),
            metadata=entry.get("metadata"),
            created_at=entry.get("created_at"),
        )
        for entry in rows
    ]
