"""Anchor role repository — database access for anchor operations."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.db.client import new_thread_safe_client


def get_active_anchor_role(*, neighborhood_id: UUID) -> dict | None:
    """Return the active anchor role for a neighborhood, or None."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("anchor_roles")
            .select("*")
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def get_anchor_by_member(*, member_id: UUID) -> dict | None:
    """Return anchor role for a member if they are an active anchor."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("anchor_roles")
            .select("*")
            .eq("member_id", str(member_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def log_anchor_action(
    *,
    anchor_role_id: UUID,
    neighborhood_id: UUID,
    actor_user_id: UUID,
    action_type: str,
    target_post_id: UUID | None = None,
    target_member_id: UUID | None = None,
    metadata: dict | None = None,
) -> dict:
    """Append to the anchor_actions_log (immutable)."""
    client = new_thread_safe_client()
    try:
        payload = {
            "anchor_role_id": str(anchor_role_id),
            "neighborhood_id": str(neighborhood_id),
            "actor_user_id": str(actor_user_id),
            "action_type": action_type,
        }
        if target_post_id:
            payload["target_post_id"] = str(target_post_id)
        if target_member_id:
            payload["target_member_id"] = str(target_member_id)
        if metadata:
            payload["metadata"] = metadata

        result = (
            client.table("anchor_actions_log")
            .insert(payload)
            .execute()
        )
        return result.data[0] if result and result.data else {}
    finally:
        client.auth.sign_out()


def get_open_reports(*, neighborhood_id: UUID) -> list[dict]:
    """Return all open (unresolved) post reports for a neighborhood."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("post_reports")
            .select(
                "id, post_id, reporter_member_id, reason, status, created_at, "
                "post:posts!inner(id, body, category, is_emergency, author_member_id, created_at)"
            )
            .eq("status", "open")
            .execute()
        )
        return result.data if result and result.data else []
    finally:
        client.auth.sign_out()


def get_report_by_id(*, report_id: UUID) -> dict | None:
    """Return a specific post report by ID."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("post_reports")
            .select("*")
            .eq("id", str(report_id))
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def resolve_report(
    *,
    report_id: UUID,
    status: str,
    resolved_by_action: str,
    resolved_by_anchor_role_id: UUID,
) -> dict | None:
    """Mark a report as resolved or dismissed."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("post_reports")
            .update({
                "status": status,
                "resolved_at": datetime.utcnow().isoformat(),
                "resolved_by_action": resolved_by_action,
                "resolved_by_anchor_role_id": str(resolved_by_anchor_role_id),
            })
            .eq("id", str(report_id))
            .execute()
        )
        return result.data[0] if result and result.data else None
    finally:
        client.auth.sign_out()


def remove_post(*, post_id: UUID, removed_by_anchor_id: UUID, reason: str) -> dict | None:
    """Soft-remove a post (set is_removed=true)."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("posts")
            .update({
                "is_removed": True,
                "removed_at": datetime.utcnow().isoformat(),
                "removed_by_anchor_id": str(removed_by_anchor_id),
                "removal_reason": reason,
            })
            .eq("id", str(post_id))
            .execute()
        )
        return result.data[0] if result and result.data else None
    finally:
        client.auth.sign_out()


def get_post_by_id(*, post_id: UUID) -> dict | None:
    """Return a post by ID."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("posts")
            .select("*")
            .eq("id", str(post_id))
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def create_report(*, post_id: UUID, reporter_member_id: UUID, reason: str) -> dict:
    """Create a new post report."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("post_reports")
            .insert({
                "post_id": str(post_id),
                "reporter_member_id": str(reporter_member_id),
                "reason": reason,
            })
            .execute()
        )
        return result.data[0] if result and result.data else {}
    finally:
        client.auth.sign_out()


def get_pending_vouching(*, neighborhood_id: UUID) -> list[dict]:
    """Return pending (not completed, not rejected, not expired) vouching requests."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("vouching_requests")
            .select("*")
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_completed", False)
            .eq("is_rejected", False)
            .execute()
        )
        return result.data if result and result.data else []
    finally:
        client.auth.sign_out()


def create_vouching_request(
    *,
    neighborhood_id: UUID,
    candidate_member_id: UUID,
    initiated_by_anchor_id: UUID,
) -> dict:
    """Create a new vouching request (anchor auto-signs)."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("vouching_requests")
            .insert({
                "neighborhood_id": str(neighborhood_id),
                "candidate_member_id": str(candidate_member_id),
                "initiated_by_anchor_id": str(initiated_by_anchor_id),
            })
            .execute()
        )
        return result.data[0] if result and result.data else {}
    finally:
        client.auth.sign_out()


def cosign_vouching_request(*, request_id: UUID, cosigner_member_id: UUID) -> dict | None:
    """Co-sign a vouching request as the second member, completing it."""
    client = new_thread_safe_client()
    try:
        now = datetime.utcnow().isoformat()
        result = (
            client.table("vouching_requests")
            .update({
                "cosigner_member_id": str(cosigner_member_id),
                "cosigner_signed_at": now,
                "is_completed": True,
            })
            .eq("id", str(request_id))
            .eq("is_completed", False)
            .eq("is_rejected", False)
            .execute()
        )
        return result.data[0] if result and result.data else None
    finally:
        client.auth.sign_out()


def get_vouching_request_by_id(*, request_id: UUID) -> dict | None:
    """Return a vouching request by ID."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("vouching_requests")
            .select("*")
            .eq("id", str(request_id))
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()


def get_escalations(*, neighborhood_id: UUID) -> list[dict]:
    """Return escalations for a neighborhood."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("moderation_escalations")
            .select(
                "id, anchor_action_id, status, flagged_by_count, "
                "threshold_member_count, created_at"
            )
            .eq("neighborhood_id", str(neighborhood_id))
            .order("created_at", desc=True)
            .execute()
        )
        return result.data if result and result.data else []
    finally:
        client.auth.sign_out()


def get_audit_log(*, anchor_role_id: UUID, limit: int = 50) -> list[dict]:
    """Return audit log entries for an anchor role."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("anchor_actions_log")
            .select("*")
            .eq("anchor_role_id", str(anchor_role_id))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data if result and result.data else []
    finally:
        client.auth.sign_out()


def get_member_display_name(*, member_id: UUID) -> str | None:
    """Get a member's display name for enrichment."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("neighborhood_members")
            .select("user_id")
            .eq("id", str(member_id))
            .maybe_single()
            .execute()
        )
        if not result or not result.data:
            return None
        user_id = result.data["user_id"]
        user_result = (
            client.table("users")
            .select("display_name")
            .eq("id", str(user_id))
            .maybe_single()
            .execute()
        )
        if user_result and user_result.data:
            return user_result.data["display_name"]
        return None
    finally:
        client.auth.sign_out()


async def is_active_anchor(db, user_id: UUID, neighborhood_id: UUID) -> bool:
    """Check if a user is an active anchor in a neighborhood.

    Args:
        db: Supabase client (unused — anchor_repo creates its own client).
        user_id: The user's UUID.
        neighborhood_id: The neighborhood's UUID.

    Returns:
        True if the user is an active anchor, False otherwise.
    """
    import asyncio

    def _check():
        client = new_thread_safe_client()
        try:
            # First find the user's membership in the neighborhood
            membership = (
                client.table("neighborhood_members")
                .select("id")
                .eq("user_id", str(user_id))
                .eq("neighborhood_id", str(neighborhood_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            if not membership or not membership.data:
                return False

            member_id = membership.data["id"]
            # Then check if that membership has an active anchor role
            result = (
                client.table("anchor_roles")
                .select("id")
                .eq("member_id", str(member_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            return result.data is not None
        finally:
            client.auth.sign_out()

    return await asyncio.to_thread(_check)


async def get_active(db, user_id: UUID, neighborhood_id: UUID) -> dict | None:
    """Return the active anchor role for a user in a neighborhood, or None.

    Args:
        db: Supabase client (unused — anchor_repo creates its own client).
        user_id: The user's UUID.
        neighborhood_id: The neighborhood's UUID.

    Returns:
        The anchor role dict, or None if the user is not an active anchor.
    """
    import asyncio

    def _fetch():
        client = new_thread_safe_client()
        try:
            # First find the user's membership
            membership = (
                client.table("neighborhood_members")
                .select("id")
                .eq("user_id", str(user_id))
                .eq("neighborhood_id", str(neighborhood_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            if not membership or not membership.data:
                return None

            member_id = membership.data["id"]
            # Then look up their anchor role
            result = (
                client.table("anchor_roles")
                .select("*")
                .eq("member_id", str(member_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            return result.data if result and result.data else None
        finally:
            client.auth.sign_out()

    return await asyncio.to_thread(_fetch)


def get_membership_by_user(*, user_id: UUID, neighborhood_id: UUID) -> dict | None:
    """Get a user's membership in a neighborhood."""
    client = new_thread_safe_client()
    try:
        result = (
            client.table("neighborhood_members")
            .select("*")
            .eq("user_id", str(user_id))
            .eq("neighborhood_id", str(neighborhood_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    finally:
        client.auth.sign_out()
