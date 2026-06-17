// Shared TypeScript type definitions for Halqa.
//
// All shared types are imported from @/types/ which mirrors the shared type
// definitions in ARCHITECTURE.md. No `any` types. Strict TypeScript enforced.

// ── Verification Tiers ─────────────────────────────────────────────────────
export type VerificationTier = "tier_1" | "tier_2" | "tier_3";

// ── Worker Directory ───────────────────────────────────────────────────────
export interface WorkerListing {
  id: string;
  neighborhood_id: string;
  created_by_member_id: string;
  name: string;
  service_type: string;
  description: string | null;
  contact_phone: string | null;
  is_promoted: boolean;
  earned_badge: string;
  min_completed_jobs: number;
  average_rating: number | null;
  status: string;
  review_count: number;
  created_at: string | null;
  updated_at: string | null;
  /** Computed from description — not in API response, kept for legacy WorkerCard */
  area_served?: string | null;
}

export interface WorkerReview {
  id: string;
  listing_id: string;
  reviewer_member_id: string;
  reviewer_display_name?: string | null;
  rating: number | null;
  review_body: string | null;
  created_at: string | null;
}

export interface WorkerListData {
  listings: WorkerListing[];
  total: number;
}

export interface WorkerDetailData {
  listing: WorkerListing;
  reviews: WorkerReview[];
}

export interface CreateWorkerListingRequest {
  name: string;
  service_type: string;
  description?: string;
  contact_phone?: string;
}

// ── Author Info ────────────────────────────────────────────────────────────
export interface AuthorInfo {
  id: string; // users.id
  display_name: string;
  tier: VerificationTier;
}

// ── Post ───────────────────────────────────────────────────────────────────
export interface Post {
  id: string;
  neighborhood_id: string;
  author_member_id: string;
	author: AuthorInfo;
	author_display_name?: string;
	body: string;
	content?: string;
	body_language: string;
  category: string;
  is_emergency: boolean;
  ai_confidence: number | null;
  classification_confidence: number | null;
	ai_civic_signal: string | null;
	ai_classification?: string;
  is_pinned: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostCreateRequest {
  body: string;
  category: string;
  is_emergency: boolean;
}

export interface PostListResponse {
  posts: Post[];
  has_more: boolean;
}

// ── API Response Envelope ──────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
}

// ── Neighborhood ───────────────────────────────────────────────────────────
export interface Neighborhood {
  id: string;
  name: string;
  name_urdu?: string;
  city: string;
  sector?: string;
  sector_or_area?: string;
  province: string;
  lat?: number;
  lng?: number;
  member_count: number;
  total_member_count?: number;
  is_active: boolean;
}

export interface NeighborhoodSearchResult extends Neighborhood {
  distance_km?: number;
}

// ── Join Neighborhood ──────────────────────────────────────────────────────
export interface JoinNeighborhoodRequest {
  neighborhood_id: string;
  declared_address: string;
}

export interface JoinNeighborhoodResponse {
  membership_id: string;
  neighborhood_id: string;
  tier: VerificationTier;
  message: string;
}

// ── Verification ───────────────────────────────────────────────────────────
export type VerificationStatusValue =
  | "pending"
  | "approved"
  | "rejected"
  | null;

export interface VerificationStatusData {
  status: VerificationStatusValue;
  rejection_reason?: string;
  tier_target?: number;
  current_tier?: VerificationTier;
}

export interface VerificationSubmitResponse {
  record_id: string;
  status: string;
  message: string;
}

export interface UpgradeTierResponse {
  membership_id: string;
  new_tier: string;
  message: string;
}

export interface VerificationResultResponse {
  record_id: string;
  status: string;
  rejection_reason?: string;
  ocr_confidence?: number;
  submitted_at: string;
  reviewed_at?: string;
}

export interface VerificationPendingRecord {
  id: string;
  member_id: string;
  status: string;
  declared_address: string;
  submitted_at: string;
  document_type: string;
  ocr_confidence?: number | null;
  member_name?: string;
}

// ── Notification ───────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

// ── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  display_name?: string;
  onboarding_complete?: boolean;
  created_at: string;
}

// ── Post Category ───────────────────────────────────────────────────────────
export type PostCategory = "emergency" | "power" | "security" | "infrastructure" | "water" | "general";

// ── Anchor Role ────────────────────────────────────────────────────────────
export interface AnchorStatusResponse {
  is_anchor: boolean;
  anchor_role_id?: string;
  member_id?: string;
  neighborhood_id?: string;
  term_started_at?: string;
  term_ends_at?: string;
}

export interface AnchorPostPreview {
  id: string;
  body: string;
  category: string;
  is_emergency: boolean;
  author_display_name: string | null;
  author_member_id: string | null;
  created_at: string;
}

export interface AnchorModerationItem {
  id: string;
  post: AnchorPostPreview;
  reporter_member_id: string;
  reporter_display_name: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface AnchorVouchingRequest {
  id: string;
  candidate_member_id: string;
  candidate_display_name: string | null;
  initiated_by_anchor_id: string;
  cosigner_member_id: string | null;
  cosigner_display_name: string | null;
  anchor_signed_at: string;
  cosigner_signed_at: string | null;
  is_completed: boolean;
  is_rejected: boolean;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string;
}

export interface AnchorVouchingInitiateRequest {
  candidate_member_id: string;
}

export interface AnchorVouchingCreated {
  request_id: string;
  candidate_member_id: string;
  expires_at: string;
}

export interface AnchorEscalationItem {
  id: string;
  anchor_action_id: string;
  action_type: string;
  action_summary: string | null;
  status: string;
  flagged_by_count: number;
  threshold_member_count: number;
  created_at: string;
}

export interface AnchorAuditEntry {
  id: string;
  action_type: string;
  target_post_id: string | null;
  target_member_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ReportPostRequest {
  reason: string;
}

export interface ReportCreated {
  report_id: string;
  status: string;
}

// ── Tier 3 Vouching Request (legacy) ───────────────────────────────────────
export interface Tier3VouchingRequest {
  id: string;
  candidate_display_name: string;
  candidate_user_id: string;
  status: string;
  anchor_signed: boolean;
  cosigner_signed: boolean;
}

// ── Community / Member Listing ─────────────────────────────────────────────
export interface CommunityMember {
  member_id: string;
  display_name: string;
  tier: VerificationTier;
  joined_at: string;
  is_anchor: boolean;
}

export interface CommunityResponse {
  members: CommunityMember[];
  total: number;
}

// ── Dashboard Period ────────────────────────────────────────────────────────
export type DashboardPeriod = "7d" | "30d" | "90d";

// ── Neighborhood Membership ─────────────────────────────────────────────────
export interface NeighborhoodMembership {
  id: string;
  neighborhood_id: string;
  user_id: string;
  tier: string;
  is_active: boolean;
  joined_at: string;
}

// ── Civic Dashboard ────────────────────────────────────────────────────────
export interface CivicDashboardSnapshot {
  id: string;
  neighborhood_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_posts: number;
  emergency_posts: number;
  resolved_posts: number;
  category_breakdown: Record<string, number>;
  active_members: number;
  created_at: string;
  /** Present when the API enriches the snapshot with the neighborhood name */
  neighborhood_name?: string;
}
