import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const BASE_URL = env.NEXT_PUBLIC_API_URL;

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No active session");
  return session.access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{
  data: T | null;
  error: { code: string; message: string } | null;
}> {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const json = await response.json();
  return json; // Always returns { data, error } envelope
}

/**
 * Public API fetch — no auth token required.
 * Used for pre-auth endpoints like neighborhood search and detail.
 */
export async function publicApiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{
  data: T | null;
  error: { code: string; message: string } | null;
}> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await response.json();
  return json;
}

// Multipart upload variant (for document upload)
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<{
  data: T | null;
  error: { code: string; message: string } | null;
}> {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    // No Content-Type header — browser sets it with boundary for multipart
    body: formData,
  });
  return response.json();
}
