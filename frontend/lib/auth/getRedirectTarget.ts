import type { SupabaseClient } from "@supabase/supabase-js";

export interface RedirectTarget {
  /** The destination path for redirect */
  path: string;
  /** Whether the user has an active membership */
  hasMembership: boolean;
}

/**
 * Given a Supabase client, determines where to redirect the user based on
 * their authentication state and neighborhood membership.
 *
 * Call this after an auth event (login, root page load) to determine the
 * correct post-auth landing page.
 */
export async function getRedirectTarget(
  supabase: SupabaseClient,
): Promise<RedirectTarget> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { path: "/onboarding", hasMembership: false };
  }

  // Query for the user's active membership (most recent first)
  const { data: membership } = await supabase
    .from("neighborhood_members")
    .select("neighborhood_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership?.neighborhood_id) {
    return {
      path: `/neighborhood/${membership.neighborhood_id}/feed`,
      hasMembership: true,
    };
  }

  // Authenticated but no active membership → find a neighborhood
  return { path: "/onboarding", hasMembership: false };
}
