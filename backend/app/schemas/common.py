"""Shared Pydantic models, response envelope, auth dataclasses, and enums.

The ``APIResponse`` generic class is the standard response wrapper for every
endpoint. Auth dataclasses are used by the auth dependency system.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard response envelope. Every endpoint returns this shape.

    Success: ``{"data": <payload>, "error": null}``
    Error:   ``{"data": null, "error": {"code": "...", "message": "..."}}``
    """

    data: Optional[T] = None
    error: Optional[dict] = None

    @classmethod
    def ok(cls, data: T) -> APIResponse[T]:
        """Build a success response."""
        return cls(data=data, error=None)

    @classmethod
    def err(cls, code: str, message: str) -> APIResponse:
        """Build an error response."""
        return cls(data=None, error={"code": code, "message": message})


# ─── Auth dataclasses ──────────────────────────────────────────


@dataclass
class AuthUser:
    """Authenticated user identity extracted from JWT."""

    id: UUID
    display_name: str


@dataclass
class AuthMember:
    """Authenticated member within a specific neighborhood."""

    user: AuthUser
    membership: object  # NeighborhoodMembership domain model
    tier: int


@dataclass
class AuthAnchor:
    """Authenticated anchor for a specific neighborhood."""

    member: AuthMember
    anchor_role: object  # AnchorRole domain model


# ─── Shared Enums ──────────────────────────────────────────────


class PostCategory(str, Enum):
    power = "power"
    security = "security"
    infrastructure = "infrastructure"
    water = "water"
    general = "general"


class AIClassification(str, Enum):
    emergency = "emergency"
    community = "community"
    general = "general"


class VerificationStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"


class DocumentType(str, Enum):
    utility_bill = "utility_bill"
    rental_agreement = "rental_agreement"
    society_card = "society_card"
    delivery_confirmation = "delivery_confirmation"
    other = "other"


class RejectionReason(str, Enum):
    address_mismatch = "address_mismatch"
    document_unreadable = "document_unreadable"
    name_not_found = "name_not_found"
    document_type_invalid = "document_type_invalid"


class WorkerCategory(str, Enum):
    electrician = "electrician"
    plumber = "plumber"
    maid = "maid"
    cook = "cook"
    driver = "driver"
    other = "other"


class AnchorActionType(str, Enum):
    post_removed = "post_removed"
    post_classification_overridden = "post_classification_overridden"
    tier3_vouched = "tier3_vouched"
    tier3_cosigned = "tier3_cosigned"
    member_flagged = "member_flagged"
    escalation_reviewed = "escalation_reviewed"


class FlagType(str, Enum):
    content_violation = "content_violation"
    false_emergency = "false_emergency"
    exclusionary_content = "exclusionary_content"
    anchor_action_dispute = "anchor_action_dispute"


class DashboardPeriod(int, Enum):
    week = 7
    month = 30
    quarter = 90
