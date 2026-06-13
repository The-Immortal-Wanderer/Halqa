// Shared TypeScript type definitions for Halqa.
//
// All shared types are imported from @/types/ which mirrors the shared type
// definitions in ARCHITECTURE.md. No `any` types. Strict TypeScript enforced.

// ── Verification Tiers ─────────────────────────────────────────────────────
export type VerificationTier = "tier_1" | "tier_2" | "tier_3";

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

// ── Worker Review ──────────────────────────────────────────────────────────
export interface WorkerReview {
  id: string;
  listing_id: string;
  reviewer_member_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface CreateListingRequest {
  worker_name: string;
  category: string;
  description?: string;
  contact_phone: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

// ── Post Category ───────────────────────────────────────────────────────────
export type PostCategory = "emergency" | "power" | "security" | "infrastructure" | "water" | "general";

// ── Worker Listing ─────────────────────────────────────────────────────────
export interface WorkerListing {
  id: string;
  worker_name: string;
  category: string;
  description?: string;
  average_rating: number | null;
  confirmed_job_count: number;
  contact_phone?: string;
  is_verified_badge: boolean;
}

// ── Tier 3 Vouching Request ────────────────────────────────────────────────
export interface Tier3VouchingRequest {
  id: string;
  candidate_display_name: string;
  candidate_user_id: string;
  status: string;
  anchor_signed: boolean;
  cosigner_signed: boolean;
}

// ── Dashboard Period ────────────────────────────────────────────────────────
export type DashboardPeriod = 7 | 30 | 90;

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
  period_start: string;
  period_end: string;
  period_type: string;
  total_posts: number;
  emergency_posts: number;
  resolved_posts: number;
  category_breakdown: Record<string, number>;
  active_members: number;
}
