// ─── Enums ───────────────────────────────────────────────────

export type PostCategory =
  | "power"
  | "security"
  | "infrastructure"
  | "water"
  | "general";

export type AIClassification = "emergency" | "community" | "general";

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export type DocumentType =
  | "utility_bill"
  | "rental_agreement"
  | "society_card"
  | "delivery_confirmation"
  | "other";

export type WorkerCategory =
  | "electrician"
  | "plumber"
  | "maid"
  | "cook"
  | "driver"
  | "other";

export type AnchorActionType =
  | "post_removed"
  | "post_classification_overridden"
  | "tier3_vouched"
  | "tier3_cosigned"
  | "member_flagged"
  | "escalation_reviewed";

export type FlagType =
  | "content_violation"
  | "false_emergency"
  | "exclusionary_content"
  | "anchor_action_dispute";

export type RejectionReason =
  | "address_mismatch"
  | "document_unreadable"
  | "name_not_found"
  | "document_type_invalid";

export type DashboardPeriod = 7 | 30 | 90;

// ─── Core Entities ───────────────────────────────────────────

export interface User {
  id: string; // UUID
  display_name: string;
  onboarding_complete: boolean;
  created_at: string; // ISO 8601 UTC
}

export interface Neighborhood {
  id: string; // UUID
  name: string;
  city: string;
  sector_or_area: string | null;
  member_count: number; // Tier 2+ only
  total_member_count: number;
  is_active: boolean;
}

export interface NeighborhoodMembership {
  id: string;
  user_id: string;
  neighborhood_id: string;
  tier: 1 | 2 | 3;
  joined_at: string;
  tier_upgraded_at: string | null;
  is_active: boolean;
}

export interface Post {
  id: string;
  neighborhood_id: string;
  author_id: string;
  author_display_name: string; // Joined from users — denormalized in response
  content: string;
  category: PostCategory;
  ai_classification: AIClassification | null;
  is_emergency: boolean;
  is_pinned: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  language_detected: "en" | "ur" | "mixed" | null;
  created_at: string;
  updated_at: string;
  flag_count: number; // Computed: count of post_flags for this post
}

export interface VerificationRecord {
  id: string;
  user_id: string;
  neighborhood_id: string;
  membership_id: string;
  tier_target: 2 | 3;
  status: VerificationStatus;
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: RejectionReason | null;
  // address fields NOT included — service role only
}

export interface AnchorRole {
  id: string;
  neighborhood_id: string;
  user_id: string;
  anchor_display_name: string; // Joined — so members can see who the anchor is
  term_start: string;
  term_end: string;
  is_active: boolean;
}

export interface WorkerListing {
  id: string;
  neighborhood_id: string;
  submitted_by: string;
  worker_name: string;
  category: WorkerCategory;
  description: string | null;
  contact_phone: string | null; // null for Tier 1 members (omitted by API)
  is_verified_badge: boolean;
  confirmed_job_count: number;
  average_rating: number | null;
  is_promoted: boolean;
  created_at: string;
}

export interface WorkerReview {
  id: string;
  listing_id: string;
  reviewer_id: string;
  reviewer_display_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_text: string | null;
  job_confirmed: boolean;
  created_at: string;
}

export interface CivicDashboardSnapshot {
  neighborhood_id: string;
  period_days: DashboardPeriod;
  snapshot_date: string; // YYYY-MM-DD
  total_posts: number;
  emergency_posts: number;
  resolved_posts: number;
  power_count: number;
  security_count: number;
  infrastructure_count: number;
  water_count: number;
  general_count: number;
  power_resolved: number;
  security_resolved: number;
  infrastructure_resolved: number;
  water_resolved: number;
  active_members: number;
  export_text: string | null;
}

export interface Tier3VouchingRequest {
  id: string;
  candidate_user_id: string;
  candidate_display_name: string;
  neighborhood_id: string;
  anchor_signed: boolean;
  anchor_signed_at: string | null;
  cosigner_signed: boolean;
  cosigner_signed_at: string | null;
  status: VerificationStatus;
  approved_at: string | null;
  expires_at: string;
  created_at: string;
}

// ─── Request Bodies ──────────────────────────────────────────

export interface CreatePostRequest {
  content: string; // 2–1000 chars
  category: PostCategory;
}

export interface ResolvePostRequest {
  post_id: string;
}

export interface OverrideClassificationRequest {
  post_id: string;
  classification: AIClassification;
}

export interface CreateListingRequest {
  worker_name: string; // 2–80 chars
  category: WorkerCategory;
  description?: string; // max 300 chars
  contact_phone?: string;
}

export interface ConfirmJobRequest {
  listing_id: string;
}

export interface CreateReviewRequest {
  listing_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_text?: string; // max 500 chars
}

export interface FlagPostRequest {
  post_id: string;
  flag_type: FlagType;
  description?: string; // max 300 chars
}

export interface RemovePostRequest {
  post_id: string;
  reason?: string;
}

export interface VouchTier3Request {
  candidate_membership_id: string;
}

export interface CoSignTier3Request {
  vouching_request_id: string;
}

// ─── Verification Flow ───────────────────────────────────────

export interface VerificationSubmitResponse {
  verification_record_id: string;
  status: VerificationStatus;
}

export interface VerificationStatusData {
  status: VerificationStatus;
  rejection_reason: RejectionReason | null;
}

export interface UpgradeTierResponse {
  tier: "tier_2";
}

// ─── API Response Envelope ───────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}
