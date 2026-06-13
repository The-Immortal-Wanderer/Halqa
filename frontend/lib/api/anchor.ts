import { apiFetch } from "@/lib/api/client";
import type {
  AnchorStatusResponse,
  AnchorModerationItem,
  AnchorVouchingRequest,
  AnchorVouchingCreated,
  AnchorVouchingInitiateRequest,
  AnchorEscalationItem,
  AnchorAuditEntry,
  ReportPostRequest,
  ReportCreated,
} from "@/types";

export const anchorApi = {
  /** Check if the current user is the active anchor */
  getStatus: (neighborhoodId: string) =>
    apiFetch<AnchorStatusResponse>(
      `/neighborhoods/${neighborhoodId}/anchor/status`
    ),

  /** Get the moderation queue (open reports) */
  getQueue: (neighborhoodId: string) =>
    apiFetch<AnchorModerationItem[]>(
      `/neighborhoods/${neighborhoodId}/anchor/queue`
    ),

  /** Remove a post (anchor only) */
  removePost: (neighborhoodId: string, postId: string, reason?: string) =>
    apiFetch<{ post_id: string; is_removed: boolean }>(
      `/neighborhoods/${neighborhoodId}/anchor/posts/${postId}/remove`,
      {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? "" }),
      }
    ),

  /** Dismiss a report without removing the post */
  dismissReport: (neighborhoodId: string, reportId: string) =>
    apiFetch<{ report_id: string; status: string }>(
      `/neighborhoods/${neighborhoodId}/anchor/reports/${reportId}/dismiss`,
      { method: "POST" }
    ),

  /** Get pending vouching requests */
  getVouching: (neighborhoodId: string) =>
    apiFetch<AnchorVouchingRequest[]>(
      `/neighborhoods/${neighborhoodId}/anchor/vouching`
    ),

  /** Initiate a new vouching request for a member */
  initiateVouching: (
    neighborhoodId: string,
    body: AnchorVouchingInitiateRequest
  ) =>
    apiFetch<AnchorVouchingCreated>(
      `/neighborhoods/${neighborhoodId}/anchor/vouching`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  /** Co-sign a vouching request (second signer) */
  cosignVouching: (neighborhoodId: string, requestId: string) =>
    apiFetch<{ request_id: string; is_completed: boolean }>(
      `/neighborhoods/${neighborhoodId}/anchor/vouching/${requestId}/cosign`,
      { method: "POST" }
    ),

  /** Get escalations (read-only status display) */
  getEscalations: (neighborhoodId: string) =>
    apiFetch<AnchorEscalationItem[]>(
      `/neighborhoods/${neighborhoodId}/anchor/escalations`
    ),

  /** Get the anchor's audit log */
  getAuditLog: (neighborhoodId: string) =>
    apiFetch<AnchorAuditEntry[]>(
      `/neighborhoods/${neighborhoodId}/anchor/audit-log`
    ),

  /** Report a post (Tier 2+ member) */
  reportPost: (
    neighborhoodId: string,
    postId: string,
    body: ReportPostRequest
  ) =>
    apiFetch<ReportCreated>(
      `/neighborhoods/${neighborhoodId}/posts/${postId}/report`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),
};
