// Type-safe environment variable access.
// Never use process.env directly in components or hooks.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_API_URL: requireEnv("NEXT_PUBLIC_API_URL"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: requireEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
} as const;
