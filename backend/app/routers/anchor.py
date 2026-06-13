"""Anchor moderation endpoints.

All anchor-gated endpoints check anchor status inside the handler rather
than via the auth.py ``get_current_anchor`` dependency, because the anchor
service has richer error handling (expired terms, etc.).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi import Path as FPath

from app.core.auth import get_current_member
from app.schemas.anchor import (
    AnchorStatus,
    AuditEntry,
    EscalationItem,
    InitiateVouchingRequest,
    ModerationItem,
    PostRemoveRequest,
    ReportPostRequest,
    VouchingRequestCreated,
    VouchingRequestItem,
    ReportCreated,
)
from app.schemas.common import APIResponse, AuthMember
from app.services import anchor_service

router = APIRouter()


# ── Status (any authenticated user) ───────────────────────────────────────

@router.get("/neighborhoods/{neighborhood_id}/anchor/status")
async def get_anchor_status(
    neighborhood_id: UUID = FPath(...),
    current_member: AuthMember = Depends(get_current_member),
) -> APIResponse[AnchorStatus]:
    """Check if the current user is the active anchor."""
    status = anchor_service.check_anchor_status(
        user_id=current_member.user.id,
        neighborhood_id=neighborhood_id,
    )
    return APIResponse.ok(status)


# ── Moderation Queue (anchor only) ────────────────────────────────────────

@router.get("/neighborhoods/{neighborhood_id}/anchor/queue")
async def get_moderation_queue(
    neighborhood_id: UUID = FPath(...),
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[list[ModerationItem]]:
    """Get all open post reports for anchor review."""
    anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    queue = anchor_service.get_moderation_queue(neighborhood_id=neighborhood_id)
    return APIResponse.ok(queue)


# ── Post Removal (anchor only) ────────────────────────────────────────────

@router.post("/neighborhoods/{neighborhood_id}/anchor/posts/{post_id}/remove")
async def remove_post(
    neighborhood_id: UUID = FPath(...),
    post_id: UUID = FPath(...),
    body: PostRemoveRequest = ...,
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[dict]:
    """Remove a post. Anchor only."""
    anchor = anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    result = anchor_service.remove_post_as_anchor(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
        post_id=post_id,
        reason=body.reason,
        anchor_role_id=anchor.anchor_role_id,
    )
    return APIResponse.ok(result)


# ── Report Dismissal (anchor only) ────────────────────────────────────────

@router.post(
    "/neighborhoods/{neighborhood_id}/anchor/reports/{report_id}/dismiss"
)
async def dismiss_report(
    neighborhood_id: UUID = FPath(...),
    report_id: UUID = FPath(...),
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[dict]:
    """Dismiss a report without removing the post. Anchor only."""
    anchor = anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    result = anchor_service.dismiss_report(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
        report_id=report_id,
        anchor_role_id=anchor.anchor_role_id,
    )
    return APIResponse.ok(result)


# ── Vouching ──────────────────────────────────────────────────────────────

@router.get("/neighborhoods/{neighborhood_id}/anchor/vouching")
async def get_vouching(
    neighborhood_id: UUID = FPath(...),
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[list[VouchingRequestItem]]:
    """Get pending vouching requests. Anchor only."""
    anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    requests = anchor_service.get_vouching_requests(
        neighborhood_id=neighborhood_id,
    )
    return APIResponse.ok(requests)


@router.post("/neighborhoods/{neighborhood_id}/anchor/vouching")
async def initiate_vouching(
    neighborhood_id: UUID = FPath(...),
    body: InitiateVouchingRequest = ...,
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[VouchingRequestCreated]:
    """Initiate a Tier 3 vouching request. Anchor only."""
    anchor = anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    result = anchor_service.initiate_vouching(
        neighborhood_id=neighborhood_id,
        candidate_member_id=body.candidate_member_id,
        anchor_role_id=anchor.anchor_role_id,
    )
    return APIResponse.ok(result)


@router.post(
    "/neighborhoods/{neighborhood_id}/anchor/vouching/{request_id}/cosign"
)
async def cosign_vouching(
    neighborhood_id: UUID = FPath(...),
    request_id: UUID = FPath(...),
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[dict]:
    """Co-sign a vouching request. Requires Tier 2+ (not anchor-only)."""
    # Cosigner must be Tier 2+ of the neighborhood but NOT the anchor
    # (anchor is already the first signer). We verify membership via
    # get_current_member and then call the service.
    result = anchor_service.cosign_vouching(
        cosigner_member_id=member.membership["id"],
        request_id=request_id,
        neighborhood_id=neighborhood_id,
    )
    return APIResponse.ok(result)


# ── Escalations ───────────────────────────────────────────────────────────

@router.get("/neighborhoods/{neighborhood_id}/anchor/escalations")
async def get_escalations(
    neighborhood_id: UUID = FPath(...),
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[list[EscalationItem]]:
    """Get escalations (read-only status display). Anchor only."""
    anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    escalations = anchor_service.get_escalations(
        neighborhood_id=neighborhood_id,
    )
    return APIResponse.ok(escalations)


# ── Audit Log ─────────────────────────────────────────────────────────────

@router.get("/neighborhoods/{neighborhood_id}/anchor/audit-log")
async def get_audit_log(
    neighborhood_id: UUID = FPath(...),
    limit: int = 50,
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[list[AuditEntry]]:
    """Get the anchor's action history. Anchor only."""
    anchor = anchor_service.require_anchor_role(
        user_id=member.user.id,
        neighborhood_id=neighborhood_id,
    )
    entries = anchor_service.get_audit_log(
        anchor_role_id=anchor.anchor_role_id,
        limit=min(limit, 100),
    )
    return APIResponse.ok(entries)


# ── Post Reports (Tier 2+, not anchor-only) ───────────────────────────────

@router.post("/neighborhoods/{neighborhood_id}/posts/{post_id}/report")
async def report_post(
    neighborhood_id: UUID = FPath(...),
    post_id: UUID = FPath(...),
    body: ReportPostRequest = ...,
    member: AuthMember = Depends(get_current_member),
) -> APIResponse[ReportCreated]:
    """Report a post. Requires Tier 2+ membership."""
    # report_post is defined in anchor_service
    result = anchor_service.report_post(
        reporter_member_id=member.membership["id"],
        post_id=post_id,
        reason=body.reason,
    )
    return APIResponse.ok(result)
