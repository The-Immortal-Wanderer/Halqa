import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

export type APIResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<APIResponse<T>> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const url = `${env.NEXT_PUBLIC_API_URL}${path}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // 401 → refresh token and retry exactly once
    if (res.status === 401 && session) {
      const {
        data: { session: refreshed },
      } = await supabase.auth.refreshSession();

      if (refreshed) {
        headers["Authorization"] = `Bearer ${refreshed.access_token}`;

        const retryRes = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        return retryRes.json() as Promise<APIResponse<T>>;
      }
    }

    return res.json() as Promise<APIResponse<T>>;
  }

  async get<T>(path: string): Promise<APIResponse<T>> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<APIResponse<T>> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<APIResponse<T>> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<APIResponse<T>> {
    return this.request<T>("DELETE", path);
  }
}

export const api = new ApiClient();
