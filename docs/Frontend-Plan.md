# Frontend-Plan.md — Halqa Next.js Frontend

**Version:** 1.0
**Date:** June 2026
**Stack:** Next.js 14+ (App Router), TypeScript strict, Tailwind CSS, Supabase JS client
**Hosting:** Vercel

Read ARCHITECTURE.md for API contract, authentication flow, design tokens, and
deep-link scheme before working on any screen. Read PRD.md for business rules
governing what each tier can and cannot do. The visual identity system documented
across the refinement session governs all design decisions — this document
references it by name throughout.

---

## 1. Project Structure

```
frontend/
├── app/                              ← Next.js App Router root
│   ├── layout.tsx                    ← Root layout: fonts, global styles, auth provider
│   ├── page.tsx                      ← Root route → redirects to /onboarding or /neighborhood
│   ├── globals.css                   ← Tailwind base, custom CSS properties
│   ├── (auth)/                       ← Route group: unauthenticated screens
│   │   ├── layout.tsx                ← Auth layout (no tab bar)
│   │   ├── onboarding/
│   │   │   ├── page.tsx              ← Screen 1: Entry (Halqa logo + Find neighborhood)
│   │   │   ├── search/
│   │   │   │   └── page.tsx          ← Screen 2: Neighborhood search
│   │   │   ├── confirm/
│   │   │   │   └── page.tsx          ← Screen 3: Neighborhood confirmation + map
│   │   │   ├── account/
│   │   │   │   └── page.tsx          ← Screen 4: Account creation (name, phone, password)
│   │   │   └── verify/
│   │   │       ├── page.tsx          ← Screen 5: Verification entry (doc type explainer)
│   │   │       └── result/
│   │   │           └── page.tsx      ← Verification result (approved / rejected / pending)
│   │   └── login/
│   │       └── page.tsx              ← Returning user: phone + OTP
│   ├── (app)/                        ← Route group: authenticated + joined screens
│   │   ├── layout.tsx                ← App layout: tab bar, auth guard
│   │   └── neighborhood/
│   │       └── [neighborhoodId]/
│   │           ├── feed/
│   │           │   └── page.tsx      ← Feed tab
│   │           ├── alerts/
│   │           │   └── page.tsx      ← Alerts tab
│   │           ├── community/
│   │           │   └── page.tsx      ← Community tab (anchor tools if anchor)
│   │           ├── directory/
│   │           │   ├── page.tsx      ← Worker directory tab
│   │           │   └── [listingId]/
│   │           │       └── page.tsx  ← Worker listing detail
│   │           └── dashboard/
│   │               └── page.tsx      ← Civic dashboard (Tier 2+)
│   ├── profile/
│   │   └── page.tsx                  ← Profile tab (settings, notifications, logout)
│   └── error.tsx                     ← Root error boundary
├── components/
│   ├── ui/                           ← Primitive, reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx                 ← Tier badges (Tier1, Tier2, Tier3)
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── InAppBanner.tsx           ← Emergency alert in-app banner
│   │   └── BottomSheet.tsx           ← Mobile bottom sheet modal
│   ├── layout/
│   │   ├── TabBar.tsx                ← Bottom navigation (5 tabs)
│   │   ├── PageHeader.tsx            ← Consistent screen header
│   │   └── HalqaLogo.tsx             ← Logo lockup (mark + wordmark + Urdu)
│   ├── feed/
│   │   ├── PostCard.tsx              ← Standard post card
│   │   ├── EmergencyPostCard.tsx     ← Amber variant post card
│   │   ├── PostComposer.tsx          ← New post creation UI
│   │   ├── FeedList.tsx              ← Realtime-connected feed container
│   │   └── ResolveButton.tsx         ← Resolve action (author + anchor only)
│   ├── verification/
│   │   ├── UploadZone.tsx            ← Document upload dropzone
│   │   ├── VerificationPending.tsx   ← Pulse animation pending state
│   │   ├── VerificationApproved.tsx  ← Success state
│   │   └── VerificationRejected.tsx  ← Error state with retry CTA
│   ├── dashboard/
│   │   ├── DashboardCard.tsx         ← Metric card
│   │   ├── CategoryBreakdown.tsx     ← Horizontal bar chart
│   │   ├── PeriodSelector.tsx        ← 7/30/90 day ghost button group
│   │   └── ExportButton.tsx          ← Copy-to-clipboard export
│   ├── workers/
│   │   ├── WorkerCard.tsx
│   │   ├── WorkerBadge.tsx           ← Verified worker badge
│   │   └── ReviewForm.tsx
│   ├── anchor/
│   │   ├── AnchorQueue.tsx
│   │   ├── ModerationCard.tsx
│   │   └── VouchingPanel.tsx
│   └── neighborhood/
│       └── NeighborhoodSearchResult.tsx
├── hooks/
│   ├── useAuth.ts                    ← Auth state, session, user profile
│   ├── useFeed.ts                    ← Supabase Realtime subscription
│   ├── useNeighborhood.ts            ← Current neighborhood context
│   ├── useVerification.ts            ← Verification status polling/subscription
│   ├── usePushNotifications.ts       ← Web Push subscription management
│   └── useDeepLink.ts                ← Service worker deep-link handler
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ← Browser Supabase client (singleton)
│   │   └── server.ts                 ← Server-side Supabase client (cookies)
│   ├── api/
│   │   ├── client.ts                 ← FastAPI fetch wrapper (adds Bearer token)
│   │   ├── users.ts                  ← /users/* API calls
│   │   ├── neighborhoods.ts          ← /neighborhoods/* API calls
│   │   ├── posts.ts                  ← /posts/* API calls
│   │   ├── verification.ts           ← /verification/* API calls
│   │   ├── dashboard.ts              ← /dashboard/* API calls
│   │   ├── workers.ts                ← /workers/* API calls
│   │   └── anchor.ts                 ← /anchor/* API calls
│   ├── env.ts                        ← Type-safe env var access (no direct process.env)
│   └── utils.ts                      ← Date formatting, text truncation, classNames helper
├── types/
│   └── index.ts                      ← All shared types from ARCHITECTURE.md Section 4
├── public/
│   ├── manifest.json                 ← PWA manifest
│   ├── sw.js                         ← Service worker (push notifications + deep links)
│   ├── icons/
│   │   ├── icon-192.png              ← PWA icon (192×192, sand bg, teal mark)
│   │   ├── icon-512.png              ← PWA icon (512×512)
│   │   └── favicon.ico
│   └── fonts/                        ← Self-hosted fallback (if Google Fonts unavailable)
├── tailwind.config.ts                ← Full design token config (ARCHITECTURE.md Section 8)
├── next.config.ts
├── tsconfig.json
└── vercel.json
```

---

## 2. Configuration Files

### 2.1 `tailwind.config.ts`

Implements the complete design token system from ARCHITECTURE.md Section 8.
The full config is defined there — copy it verbatim. Additional conventions:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // All halqa.* color tokens — see ARCHITECTURE.md Section 8
      colors: { halqa: { /* ... */ } },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'serif'],
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '14px', xl: '20px', full: '9999px',
      },
      // Spacing is Tailwind default (4px base) — no override needed
    },
  },
  plugins: [],
}
export default config
```

No custom CSS except for:
- `@font-face` for Noto Nastaliq Urdu (if Google Fonts blocked)
- `@keyframes halqa-pulse` for the verification pending animation
- `@keyframes halqa-fade-in` for post card entrance

### 2.2 `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Image domains for any future map tile or avatar loading
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  // Headers for PWA and security
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
```

### 2.3 `public/manifest.json`

```json
{
  "name": "Halqa — Your neighborhood, organized.",
  "short_name": "Halqa",
  "description": "A verified community platform for Pakistani neighborhoods.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F7F4EE",
  "theme_color": "#1D6A58",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 3. Supabase Client Setup

### 3.1 `lib/supabase/client.ts` (Browser — Client Components)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

// Singleton — called once, reused throughout the session
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Convenience export for components
import { useMemo } from 'react'
export function useSupabase() {
  return useMemo(() => createClient(), [])
}
```

**Critical:** The browser Supabase client uses the **anon key**, not the service
role key. Session is managed by `@supabase/ssr` using cookies. Tokens are stored
in Supabase's built-in session management — not `localStorage` (blocked per
AGENTS.md).

### 3.2 `lib/supabase/server.ts` (Server Components + Server Actions)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}
```

### 3.3 `lib/api/client.ts` (FastAPI calls)

```typescript
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = env.NEXT_PUBLIC_API_URL

async function getAccessToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('No active session')
  return session.access_token
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
  const token = await getAccessToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  const json = await response.json()
  return json  // Always returns { data, error } envelope
}

// Multipart upload variant (for document upload)
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
  const token = await getAccessToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    // No Content-Type header — browser sets it with boundary for multipart
    body: formData,
  })
  return response.json()
}
```

---

## 4. Authentication & Navigation Guards

### 4.1 Root Route (`app/page.tsx`)

```typescript
// Server Component — redirects based on auth state
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/onboarding')
  }

  // Check if user has completed onboarding (joined a neighborhood)
  const { data: user } = await supabase
    .from('users')
    .select('onboarding_complete')
    .eq('id', session.user.id)
    .single()

  if (!user?.onboarding_complete) {
    redirect('/onboarding/search')
  }

  // Get the user's active neighborhood membership
  const { data: membership } = await supabase
    .from('neighborhood_members')
    .select('neighborhood_id')
    .eq('user_id', session.user.id)
    .is('deleted_at', null)
    .single()

  if (!membership) {
    redirect('/onboarding/search')
  }

  redirect(`/neighborhood/${membership.neighborhood_id}/feed`)
}
```

### 4.2 App Layout Guard (`app/(app)/layout.tsx`)

```typescript
// Server Component — wraps all authenticated screens
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TabBar } from '@/components/layout/TabBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/onboarding')

  return (
    <div className="flex flex-col min-h-screen bg-halqa-sand">
      <main className="flex-1 pb-16">  {/* pb-16 = bottom tab bar height */}
        {children}
      </main>
      <TabBar />
    </div>
  )
}
```

### 4.3 `hooks/useAuth.ts`

```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

export function useAuth() {
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, user: session?.user ?? null, loading, signOut }
}
```

---

## 5. Onboarding Screens

All five screens from the visual identity system. Each is a Server or Client
Component as specified. No animations beyond those defined in the identity system.

### 5.1 Screen 1 — Entry (`app/(auth)/onboarding/page.tsx`)

```typescript
// Server Component (no interactivity needed)
import Link from 'next/link'
import { HalqaLogo } from '@/components/layout/HalqaLogo'
import { Button } from '@/components/ui/Button'

export default function OnboardingEntryPage() {
  return (
    <div className="min-h-screen bg-halqa-sand flex flex-col items-center justify-center px-4">
      {/* Logo — largest appearance in the product */}
      <HalqaLogo size="xl" />

      {/* Tagline — both languages */}
      <div className="mt-10 text-center">
        <p className="text-halqa-ink-mid text-[15px]">Your neighborhood, organized.</p>
        <p className="text-halqa-ink-mid text-[13px] font-urdu mt-2 text-right" dir="rtl">
          آپ کا حلقہ، منظم۔
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-8 w-full max-w-sm space-y-3">
        <Button as={Link} href="/onboarding/search" variant="primary" fullWidth>
          Find my neighborhood
        </Button>
        <Button as={Link} href="/onboarding/search?invite=1" variant="ghost" fullWidth>
          I have an invite code
        </Button>
      </div>

      {/* Returning user link */}
      <p className="mt-6 text-[13px] text-halqa-ink-light">
        Already have an account?{' '}
        <Link href="/login" className="text-halqa-teal underline">Sign in</Link>
      </p>
    </div>
  )
}
```

### 5.2 Screen 2 — Neighborhood Search (`app/(auth)/onboarding/search/page.tsx`)

```typescript
'use client'
// Client Component — search input requires interactivity
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { NeighborhoodSearchResult } from '@/components/neighborhood/NeighborhoodSearchResult'
import { searchNeighborhoods } from '@/lib/api/neighborhoods'
import type { NeighborhoodSearchResultType } from '@/types'
import { MagnifyingGlass } from '@phosphor-icons/react'

export default function NeighborhoodSearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NeighborhoodSearchResultType[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const { data } = await searchNeighborhoods(q)
    setResults(data ?? [])
    setLoading(false)
  }, [])

  const handleSelect = (neighborhood: NeighborhoodSearchResultType) => {
    // Store selection in sessionStorage equivalent — URL params
    router.push(`/onboarding/confirm?id=${neighborhood.id}`)
  }

  return (
    <div className="min-h-screen bg-halqa-sand">
      <PageHeader title="Find your neighborhood" showBack />

      <div className="px-4 pt-4">
        <Input
          placeholder="Street name, society, or area"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          leftIcon={<MagnifyingGlass size={20} className="text-halqa-ink-light" />}
          autoFocus
        />
      </div>

      {/* Results list */}
      <div className="mt-2">
        {results.map((r) => (
          <NeighborhoodSearchResult
            key={r.id}
            neighborhood={r}
            onSelect={() => handleSelect(r)}
          />
        ))}

        {/* Add neighborhood CTA — only when query has results but no match */}
        {query.length >= 2 && results.length === 0 && !loading && (
          <div className="px-4 py-3 border-t border-halqa-sand-mid">
            <button className="text-[13px] text-halqa-teal">
              Don&apos;t see your neighborhood? Add it.
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 5.3 Screen 3 — Neighborhood Confirmation (`app/(auth)/onboarding/confirm/page.tsx`)

```typescript
// Server Component — fetches neighborhood data server-side
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { ShieldCheck, Users } from '@phosphor-icons/react/dist/ssr'

interface Props {
  searchParams: { id?: string }
}

export default async function NeighborhoodConfirmPage({ searchParams }: Props) {
  if (!searchParams.id) notFound()

  const supabase = createServerSupabaseClient()
  const { data: neighborhood } = await supabase
    .from('neighborhoods')
    .select('*')
    .eq('id', searchParams.id)
    .single()

  if (!neighborhood) notFound()

  return (
    <div className="min-h-screen bg-halqa-sand">
      {/* Static map thumbnail — placeholder for prototype */}
      <div className="w-full h-44 bg-halqa-sand-mid flex items-center justify-center">
        {/* In prototype: a styled placeholder with the Halqa mark centered */}
        {/* Post-prototype: integrate a static map tile API */}
        <div className="text-halqa-sand-dark text-[13px]">
          {neighborhood.name}
        </div>
      </div>

      <div className="px-4 pt-5 pb-10">
        {/* Neighborhood identity */}
        <h1 className="text-[22px] font-semibold text-halqa-ink">{neighborhood.name}</h1>
        <p className="text-[15px] text-halqa-ink-mid mt-1">
          {neighborhood.sector_or_area ? `${neighborhood.sector_or_area}, ` : ''}{neighborhood.city}
        </p>
        <div className="flex items-center gap-1 mt-2">
          <Users size={14} className="text-halqa-ink-light" />
          <span className="text-[13px] text-halqa-ink-light">
            {neighborhood.member_count} verified members
          </span>
        </div>

        {/* Verification assurance card */}
        <div className="mt-5 p-4 rounded-lg bg-halqa-teal-light border border-halqa-teal-light">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-halqa-teal mt-0.5 shrink-0" />
            <p className="text-[13px] text-halqa-ink-mid">
              Only verified residents of this neighborhood can see posts and participate.
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="mt-6 space-y-3">
          <Button
            as={Link}
            href={`/onboarding/account?neighborhoodId=${neighborhood.id}`}
            variant="primary"
            fullWidth
          >
            Join this neighborhood
          </Button>
          <p className="text-center text-[13px] text-halqa-ink-mid">
            You&apos;ll verify your address in the next step.
          </p>
        </div>
      </div>
    </div>
  )
}
```

### 5.4 Screen 4 — Account Creation (`app/(auth)/onboarding/account/page.tsx`)

```typescript
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import Link from 'next/link'

export default function AccountCreationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const neighborhoodId = searchParams.get('neighborhoodId')
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = displayName.length >= 2 && phone.length >= 10 && password.length >= 8

  const handleSubmit = async () => {
    if (!canSubmit || !neighborhoodId) return
    setLoading(true)
    setError(null)

    // 1. Create Supabase Auth account (phone + password)
    // For prototype: use email as fallback if Twilio SMS not configured
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: `+92${phone.replace(/^0/, '')}`,  // Normalize to E.164
      password,
    })

    if (authError || !authData.user) {
      setError('Could not create account. Try a different phone number.')
      setLoading(false)
      return
    }

    // 2. Create user profile via FastAPI
    const { error: profileError } = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    })

    if (profileError) {
      setError('Account created but profile update failed. Please try again.')
      setLoading(false)
      return
    }

    // 3. Join the neighborhood (Tier 1)
    const { error: joinError } = await apiFetch(
      `/neighborhoods/${neighborhoodId}/join`,
      { method: 'POST' }
    )

    if (joinError) {
      setError(joinError.message)
      setLoading(false)
      return
    }

    // 4. Navigate to verification entry
    router.push(`/onboarding/verify?neighborhoodId=${neighborhoodId}`)
  }

  return (
    <div className="min-h-screen bg-halqa-sand">
      <PageHeader title="Create your account" showBack />

      <div className="px-4 pt-5 space-y-4">
        <Input
          label="Your name"
          placeholder="As your neighbors know you"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
        />

        <Input
          label="Mobile number"
          type="tel"
          placeholder="3XX XXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          prefix="🇵🇰 +92"
        />

        <Input
          label="Create a password"
          type="password"
          placeholder=""
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters"
        />

        {error && (
          <p className="text-[13px] text-halqa-danger">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
        >
          Create account
        </Button>

        <p className="text-[13px] text-halqa-ink-mid text-center">
          By continuing, you agree to Halqa&apos;s{' '}
          <Link href="/guidelines" className="text-halqa-teal underline">Community Guidelines</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-halqa-teal underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
```

### 5.5 Screen 5 — Verification Entry (`app/(auth)/onboarding/verify/page.tsx`)

```typescript
// Server Component — informational screen, no interactivity needed
import Link from 'next/link'
import { ShieldCheck, FileText } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'

interface Props {
  searchParams: { neighborhoodId?: string }
}

export default function VerificationEntryPage({ searchParams }: Props) {
  const { neighborhoodId } = searchParams

  const acceptedDocs = [
    'Utility bill (LESCO, IESCO, SNGPL, KESC)',
    'Rental agreement + any ID showing this address',
    'Housing society membership card',
  ]

  return (
    <div className="min-h-screen bg-halqa-sand flex flex-col">
      {/* Back is disabled — account created, forward only */}
      <PageHeader title="" showBack={false} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
        <ShieldCheck size={48} className="text-halqa-teal" />

        <h1 className="text-[22px] font-semibold text-halqa-ink mt-5 text-center">
          Verify your address
        </h1>

        <p className="text-[15px] text-halqa-ink-mid mt-3 text-center max-w-[280px]">
          We need to confirm that you live in this neighborhood.
          This keeps the community trustworthy for everyone.
        </p>

        {/* Accepted document types */}
        <div className="mt-7 w-full max-w-sm space-y-3">
          {acceptedDocs.map((doc) => (
            <div key={doc} className="flex items-start gap-3">
              <FileText size={20} className="text-halqa-ink-mid mt-0.5 shrink-0" />
              <span className="text-[15px] text-halqa-ink">{doc}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 w-full max-w-sm space-y-3">
          <Button
            as={Link}
            href={`/onboarding/verify/upload?neighborhoodId=${neighborhoodId}`}
            variant="primary"
            fullWidth
          >
            Upload a document
          </Button>
          <Button
            as={Link}
            href={neighborhoodId ? `/neighborhood/${neighborhoodId}/feed` : '/'}
            variant="ghost"
            fullWidth
          >
            Skip for now — join as unverified
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 6. Verification Flow Components

### 6.1 Upload Zone (`components/verification/UploadZone.tsx`)

The four states defined in the visual identity system: upload, pending, approved,
rejected. Each state is a separate sub-component rendered conditionally.

```typescript
'use client'
import { useState, useCallback } from 'react'
import { UploadSimple, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { VerificationPending } from './VerificationPending'
import { VerificationApproved } from './VerificationApproved'
import { VerificationRejected } from './VerificationRejected'
import type { DocumentType, VerificationStatus } from '@/types'

type UploadState = 'idle' | 'uploading' | 'pending' | 'approved' | 'rejected'

interface UploadZoneProps {
  neighborhoodId: string
  currentStatus: VerificationStatus
  rejectionReason?: string
  onApproved: () => void
}

export function UploadZone({
  neighborhoodId, currentStatus, rejectionReason, onApproved
}: UploadZoneProps) {
  const [state, setState] = useState<UploadState>(
    currentStatus === 'pending' ? 'pending' :
    currentStatus === 'approved' ? 'approved' :
    currentStatus === 'rejected' ? 'rejected' : 'idle'
  )
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('utility_bill')
  const [declaredAddress, setDeclaredAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file || !declaredAddress) return
    setState('uploading')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)
    formData.append('declared_address', declaredAddress)

    const { error: uploadError } = await apiUpload(
      `/neighborhoods/${neighborhoodId}/verification/documents`,
      formData
    )

    if (uploadError) {
      setError(uploadError.message)
      setState('idle')
    } else {
      setState('pending')
      // Polling for result (or push notification will arrive)
    }
  }

  if (state === 'pending') return <VerificationPending />
  if (state === 'approved') return <VerificationApproved onContinue={onApproved} />
  if (state === 'rejected') return (
    <VerificationRejected
      reason={rejectionReason}
      onRetry={() => setState('idle')}
    />
  )

  return (
    <div className="space-y-4">
      {/* Upload dropzone */}
      <label className={`
        block w-full h-44 rounded-lg border-2 border-dashed
        transition-colors duration-[120ms] cursor-pointer
        ${file
          ? 'border-halqa-teal bg-halqa-teal-light'
          : 'border-halqa-sand-dark hover:border-halqa-teal'
        }
        flex flex-col items-center justify-center gap-2
      `}>
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <UploadSimple size={32} className="text-halqa-ink-light" />
        <span className="text-[15px] text-halqa-ink">
          {file ? file.name : 'Tap to upload your document'}
        </span>
        <span className="text-[13px] text-halqa-ink-mid">
          JPEG, PNG, or PDF · Max 10MB
        </span>
      </label>

      {/* Document type selector */}
      <div>
        <label className="block text-[13px] font-medium text-halqa-ink-mid mb-1.5">
          Document type
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          className="w-full h-12 px-3 rounded-md border border-halqa-sand-dark
                     bg-white text-[15px] text-halqa-ink focus:outline-none
                     focus:border-2 focus:border-halqa-teal"
        >
          <option value="utility_bill">Utility bill</option>
          <option value="rental_agreement">Rental agreement + ID</option>
          <option value="society_card">Society membership card</option>
          <option value="delivery_confirmation">Delivery confirmation</option>
          <option value="other">Other document</option>
        </select>
      </div>

      {/* Declared address */}
      <div>
        <label className="block text-[13px] font-medium text-halqa-ink-mid mb-1.5">
          Your address
        </label>
        <input
          type="text"
          placeholder="e.g. Flat 3, Block C, DHA Phase 5"
          value={declaredAddress}
          onChange={(e) => setDeclaredAddress(e.target.value)}
          className="w-full h-12 px-3 rounded-md border border-halqa-sand-dark
                     bg-white text-[15px] text-halqa-ink placeholder:text-halqa-ink-light
                     focus:outline-none focus:border-2 focus:border-halqa-teal"
        />
      </div>

      {/* Privacy disclosure */}
      <details className="text-[13px] text-halqa-ink-mid">
        <summary className="cursor-pointer text-halqa-teal">
          Why do we need this?
        </summary>
        <p className="mt-2">
          We verify that you actually live in this neighborhood. Your document
          is reviewed once and not stored after verification is complete.
        </p>
      </details>

      {error && <p className="text-[13px] text-halqa-danger">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || !declaredAddress || state === 'uploading'}
        className="w-full h-11 rounded-md bg-halqa-teal text-white font-medium text-[15px]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:bg-halqa-teal-dark transition-colors duration-[120ms]"
      >
        {state === 'uploading' ? 'Uploading...' : 'Submit for verification'}
      </button>
    </div>
  )
}
```

### 6.2 Pending State (`components/verification/VerificationPending.tsx`)

```typescript
// The pulsing ring animation — defined in globals.css as @keyframes halqa-pulse
export function VerificationPending() {
  return (
    <div className="flex flex-col items-center py-10">
      {/* Pulsing teal ring */}
      <div
        className="w-16 h-16 rounded-full border-2 border-halqa-teal animate-halqa-pulse"
        style={{ animationDuration: '1.5s' }}
      />
      <p className="mt-5 text-[15px] text-halqa-ink font-medium text-center">
        Your document is being reviewed.
      </p>
      <p className="mt-2 text-[13px] text-halqa-ink-mid text-center max-w-[240px]">
        This usually takes a few minutes. You can close the app — we&apos;ll
        notify you when it&apos;s done.
      </p>
    </div>
  )
}
```

### 6.3 Approved State (`components/verification/VerificationApproved.tsx`)

```typescript
import { CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'

export function VerificationApproved({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="p-4 rounded-lg border border-halqa-success bg-halqa-success-bg
                    flex flex-col items-center py-8 animate-halqa-fade-in">
      <CheckCircle size={28} className="text-halqa-success" />
      <h2 className="mt-3 text-[18px] font-semibold text-halqa-ink">Address verified</h2>
      <p className="mt-2 text-[15px] text-halqa-ink-mid text-center">
        You&apos;re now a verified member of your neighborhood.
      </p>
      <Button onClick={onContinue} variant="primary" className="mt-6">
        Go to your neighborhood
      </Button>
    </div>
  )
}
```

### 6.4 Rejected State (`components/verification/VerificationRejected.tsx`)

```typescript
import { WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'

const REJECTION_MESSAGES: Record<string, string> = {
  address_mismatch: "The address on the document doesn't match what you entered.",
  document_unreadable: "The document was too blurry to read.",
  name_not_found: "We couldn't find your name on this document.",
  document_type_invalid: "This document type isn't accepted.",
}

interface Props {
  reason?: string
  onRetry: () => void
}

export function VerificationRejected({ reason, onRetry }: Props) {
  const message = reason
    ? REJECTION_MESSAGES[reason]
    : "We couldn't verify this document."

  return (
    <div className="p-4 rounded-lg border border-halqa-danger bg-halqa-danger-bg">
      <div className="flex items-start gap-3">
        <WarningCircle size={28} className="text-halqa-danger shrink-0" />
        <div>
          <p className="text-[15px] font-medium text-halqa-ink">
            We couldn&apos;t verify this document.
          </p>
          <p className="mt-1 text-[13px] text-halqa-ink-mid">{message}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Button onClick={onRetry} variant="primary" fullWidth>
          Try a different document
        </Button>
        <Button
          as="a"
          href="mailto:hello@halqa.pk"
          variant="ghost"
          fullWidth
        >
          Ask for help
        </Button>
      </div>
    </div>
  )
}
```

---

## 7. Neighborhood Feed

### 7.1 `hooks/useFeed.ts` — Supabase Realtime subscription

```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import type { Post } from '@/types'

export function useFeed(neighborhoodId: string) {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial load via FastAPI (respects business logic ordering)
  const loadFeed = useCallback(async (beforeId?: string) => {
    const params = beforeId ? `?before_id=${beforeId}` : ''
    const { data, error } = await apiFetch<{ posts: Post[]; has_more: boolean }>(
      `/neighborhoods/${neighborhoodId}/posts${params}`
    )
    if (error) { setError(error.message); return }
    if (beforeId) {
      setPosts(prev => [...prev, ...(data?.posts ?? [])])
    } else {
      setPosts(data?.posts ?? [])
    }
    setLoading(false)
  }, [neighborhoodId])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  // Supabase Realtime — new posts and updates
  useEffect(() => {
    const channel = supabase
      .channel(`neighborhood:${neighborhoodId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `neighborhood_id=eq.${neighborhoodId}`,
        },
        (payload) => {
          // New post — prepend to feed
          const newPost = payload.new as Post
          setPosts(prev => {
            // Emergency posts go to top, others to position after existing emergencies
            if (newPost.is_emergency && !newPost.is_resolved) {
              return [newPost, ...prev]
            }
            const lastEmergencyIdx = prev.findIndex(p => !p.is_emergency || p.is_resolved)
            if (lastEmergencyIdx === -1) return [...prev, newPost]
            return [
              ...prev.slice(0, lastEmergencyIdx),
              newPost,
              ...prev.slice(lastEmergencyIdx),
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `neighborhood_id=eq.${neighborhoodId}`,
        },
        (payload) => {
          // Post updated (resolved, classified) — update in-place
          const updatedPost = payload.new as Post
          setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [neighborhoodId, supabase])

  return { posts, loading, error, loadMore: (beforeId: string) => loadFeed(beforeId) }
}
```

### 7.2 `components/feed/PostCard.tsx`

```typescript
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { ResolveButton } from './ResolveButton'
import type { Post } from '@/types'

interface PostCardProps {
  post: Post
  currentUserId: string
  isAnchor: boolean
  onResolve: (postId: string) => void
}

export function PostCard({ post, currentUserId, isAnchor, onResolve }: PostCardProps) {
  const isEmergency = post.is_emergency && !post.is_resolved
  const isResolved = post.is_resolved

  const CATEGORY_ICONS: Record<string, string> = {
    power: '⚡', security: '🛡', infrastructure: '🔧', water: '💧', general: '💬'
  }

  return (
    <article
      className={`
        bg-white rounded-lg border p-6 mb-3
        ${isEmergency
          ? 'border-l-4 border-l-halqa-amber border-halqa-sand-mid bg-halqa-amber-light'
          : isResolved
          ? 'border border-halqa-success-bg bg-halqa-success-bg'
          : 'border-halqa-sand-mid'
        }
      `}
    >
      {/* Header: category + neighborhood tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]">{CATEGORY_ICONS[post.category]}</span>
          <span className="text-[13px] text-halqa-ink-mid capitalize">{post.category}</span>
          {isEmergency && (
            <span className="px-2 py-0.5 rounded-sm bg-halqa-amber text-white
                             text-[12px] font-medium tracking-wide">
              ALERT
            </span>
          )}
          {isResolved && (
            <span className="px-2 py-0.5 rounded-sm bg-halqa-success text-white
                             text-[12px] font-medium tracking-wide">
              RESOLVED
            </span>
          )}
        </div>
      </div>

      {/* Post content — dir="auto" for bilingual rendering */}
      <p
        className="text-[15px] text-halqa-ink leading-relaxed"
        dir="auto"
      >
        {post.content}
      </p>

      {/* Footer: author + time + tier badge */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-halqa-ink-light">
            {post.author_display_name}
          </span>
          <Badge tier={2} size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-halqa-ink-light">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
          {/* Resolve button: visible to author or anchor, hidden if already resolved */}
          {!isResolved && (post.author_id === currentUserId || isAnchor) && (
            <ResolveButton postId={post.id} onResolve={onResolve} />
          )}
        </div>
      </div>
    </article>
  )
}
```

### 7.3 Feed Page (`app/(app)/neighborhood/[neighborhoodId]/feed/page.tsx`)

```typescript
'use client'
import { useFeed } from '@/hooks/useFeed'
import { useAuth } from '@/hooks/useAuth'
import { PostCard } from '@/components/feed/PostCard'
import { PostComposer } from '@/components/feed/PostComposer'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Users } from '@phosphor-icons/react'
import { InAppBanner } from '@/components/ui/InAppBanner'
import { useNeighborhood } from '@/hooks/useNeighborhood'

interface Props {
  params: { neighborhoodId: string }
}

export default function FeedPage({ params }: Props) {
  const { neighborhoodId } = params
  const { user } = useAuth()
  const { neighborhood, membership, isAnchor } = useNeighborhood(neighborhoodId)
  const { posts, loading, loadMore } = useFeed(neighborhoodId)
  const canPost = membership && membership.tier >= 2

  const handleResolve = async (postId: string) => {
    await apiFetch(`/neighborhoods/${neighborhoodId}/posts/${postId}/resolve`, {
      method: 'PATCH',
    })
    // Supabase Realtime will push the update — no manual state update needed
  }

  return (
    <div className="bg-halqa-sand min-h-screen">
      <InAppBanner />  {/* Floating emergency alert banner — dismisses after 6s */}

      <PageHeader
        title={neighborhood?.name ?? ''}
        subtitle={`${neighborhood?.member_count ?? 0} verified members`}
        rightIcon={<Users size={20} />}
      />

      {/* Post composer — Tier 2+ only */}
      {canPost && (
        <div className="px-4 py-3">
          <PostComposer neighborhoodId={neighborhoodId} />
        </div>
      )}

      {/* Tier 1 notice */}
      {membership && membership.tier === 1 && (
        <div className="mx-4 mb-3 p-3 rounded-lg bg-halqa-teal-light border border-halqa-teal-light">
          <p className="text-[13px] text-halqa-teal-dark">
            Verify your address to post and participate.{' '}
            <a href={`/onboarding/verify?neighborhoodId=${neighborhoodId}`}
               className="underline font-medium">
              Verify now
            </a>
          </p>
        </div>
      )}

      {/* Feed */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-halqa-teal
                            border-t-transparent animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon="users"
            headline="Your neighborhood is getting started."
            subtext="Posts from verified neighbors will appear here. Be the first to say something."
            action={canPost ? {
              label: 'Post to the neighborhood',
              onClick: () => { /* focus composer */ }
            } : undefined}
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? ''}
              isAnchor={isAnchor}
              onResolve={handleResolve}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

---

## 8. Civic Dashboard

### 8.1 Dashboard Page (`app/(app)/neighborhood/[neighborhoodId]/dashboard/page.tsx`)

Server Component — data fetched server-side for fast initial load.

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown'
import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import { ExportButton } from '@/components/dashboard/ExportButton'
import { PageHeader } from '@/components/layout/PageHeader'

interface Props {
  params: { neighborhoodId: string }
  searchParams: { period?: string }
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { neighborhoodId } = params
  const period = Number(searchParams.period ?? '30') as 7 | 30 | 90

  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/onboarding')

  // Check Tier 2+ access
  const { data: membership } = await supabase
    .from('neighborhood_members')
    .select('tier')
    .eq('user_id', session.user.id)
    .eq('neighborhood_id', neighborhoodId)
    .single()

  if (!membership || membership.tier < 2) {
    redirect(`/neighborhood/${neighborhoodId}/feed`)
  }

  // Fetch dashboard data from FastAPI (server-side, attaches token from cookie)
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/neighborhoods/${neighborhoodId}/dashboard?period_days=${period}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } }
  )
  const { data: dashboard } = await response.json()

  return (
    <div className="bg-halqa-sand min-h-screen">
      <PageHeader title="Neighborhood report" />

      <div className="px-4 pt-4 pb-10 space-y-5">
        {/* Period selector */}
        <PeriodSelector
          current={period}
          neighborhoodId={neighborhoodId}
        />

        {/* Summary cards — 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          <DashboardCard
            label="TOTAL POSTS"
            value={dashboard?.total_posts ?? 0}
          />
          <DashboardCard
            label="EMERGENCY ALERTS"
            value={dashboard?.emergency_count ?? 0}
            accent="amber"
          />
          <DashboardCard
            label="RESOLVED"
            value={dashboard?.resolved_count ?? 0}
            accent="success"
          />
          <DashboardCard
            label="PERIOD"
            value={period === 7 ? '7 days' : period === 30 ? '30 days' : '3 months'}
            valueSize="sm"
          />
        </div>

        {/* Category breakdown bar */}
        {dashboard ? (
          <CategoryBreakdown
            power={dashboard.power_count}
            security={dashboard.security_count}
            infrastructure={dashboard.infrastructure_count}
            water={dashboard.water_count}
            other={dashboard.general_count}
            total={dashboard.total_posts}
          />
        ) : (
          /* Empty state for new neighborhoods */
          <div className="py-10 flex flex-col items-center">
            {/* Ghost grid backdrop */}
            <div className="w-full h-20 rounded-lg bg-halqa-sand-mid opacity-30
                            grid grid-cols-4 gap-px" />
            <p className="mt-3 text-[15px] text-halqa-ink font-medium">No alerts in this period.</p>
            <p className="mt-1 text-[13px] text-halqa-ink-mid text-center">
              When neighbors report issues, patterns appear here.
            </p>
          </div>
        )}

        {/* Export button */}
        <ExportButton
          neighborhoodId={neighborhoodId}
          period={period}
        />
      </div>
    </div>
  )
}
```

### 8.2 `components/dashboard/CategoryBreakdown.tsx`

```typescript
interface Props {
  power: number; security: number; infrastructure: number
  water: number; other: number; total: number
}

const CATEGORIES = [
  { key: 'power',          label: 'Power',          urdu: 'بجلی', color: '#1D6A58' },
  { key: 'security',       label: 'Security',        urdu: 'حفاظت', color: '#4A5B7A' },
  { key: 'infrastructure', label: 'Infrastructure',  urdu: 'سڑک', color: '#7A5C3A' },
  { key: 'water',          label: 'Water',           urdu: 'پانی', color: '#3A7A8C' },
  { key: 'other',          label: 'General',         urdu: 'عام', color: '#9C9589' },
]

export function CategoryBreakdown({ power, security, infrastructure, water, other, total }: Props) {
  const values = { power, security, infrastructure, water, other }
  if (total === 0) return null

  const ariaLabel = `Alert breakdown: ${power} power outages, ${security} security incidents, ${infrastructure} infrastructure issues, ${water} water issues, ${other} general.`

  return (
    <div>
      <h3 className="text-[11px] font-medium text-halqa-ink-light uppercase tracking-wide mb-3">
        Breakdown by category
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
        {CATEGORIES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="text-[12px] text-halqa-ink-mid">{label}</span>
          </div>
        ))}
      </div>

      {/* Stacked bar — aria-label provides full text equivalent */}
      <div
        className="w-full h-6 rounded-full overflow-hidden flex"
        role="img"
        aria-label={ariaLabel}
      >
        {CATEGORIES.map(({ key, color }) => {
          const count = values[key as keyof typeof values]
          const pct = total > 0 ? (count / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${key}: ${count}`}
            />
          )
        })}
      </div>

      {/* Per-category count rows */}
      <div className="mt-3 space-y-2">
        {CATEGORIES.map(({ key, label, urdu, color }) => {
          const count = values[key as keyof typeof values]
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[13px] text-halqa-ink-mid">{label}</span>
                <span className="text-[11px] text-halqa-ink-light font-urdu" dir="rtl">
                  {urdu}
                </span>
              </div>
              <span className="text-[13px] font-medium text-halqa-ink">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### 8.3 `components/dashboard/ExportButton.tsx`

```typescript
'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Export } from '@phosphor-icons/react'

interface Props {
  neighborhoodId: string
  period: number
}

export function ExportButton({ neighborhoodId, period }: Props) {
  const [copied, setCopied] = useState(false)

  const handleExport = async () => {
    const { data } = await apiFetch<{ export_text: string }>(
      `/neighborhoods/${neighborhoodId}/dashboard/export?period_days=${period}`
    )
    if (!data?.export_text) return
    await navigator.clipboard.writeText(data.export_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <button
      onClick={handleExport}
      className="w-full h-11 rounded-md border border-halqa-teal text-halqa-teal
                 font-medium text-[15px] flex items-center justify-center gap-2
                 hover:bg-halqa-teal-light transition-colors duration-[120ms]"
    >
      <Export size={18} />
      {copied ? 'Copied to clipboard' : 'Copy report for sharing'}
    </button>
  )
}
```

---

## 9. Anchor Moderation Interface

### 9.1 Community Tab with Anchor Queue (`app/(app)/neighborhood/[neighborhoodId]/community/page.tsx`)

```typescript
'use client'
import { useNeighborhood } from '@/hooks/useNeighborhood'
import { AnchorQueue } from '@/components/anchor/AnchorQueue'
import { PageHeader } from '@/components/layout/PageHeader'

interface Props { params: { neighborhoodId: string } }

export default function CommunityPage({ params }: Props) {
  const { neighborhoodId } = params
  const { isAnchor, membership } = useNeighborhood(neighborhoodId)

  return (
    <div className="bg-halqa-sand min-h-screen">
      <PageHeader title="Community" />
      <div className="px-4 pt-4">
        {/* Anchor-specific queue — shown only if user is anchor */}
        {isAnchor && (
          <AnchorQueue neighborhoodId={neighborhoodId} />
        )}
        {/* Member count, rules reminder, community guidelines link */}
        <div className="mt-4 space-y-3">
          <h2 className="text-[18px] font-semibold text-halqa-ink">Community guidelines</h2>
          <p className="text-[15px] text-halqa-ink-mid">
            This neighborhood is a space for verified residents to coordinate, share
            alerts, and support each other. Political or partisan content is not
            permitted. Suspicious activity reports must describe observed behavior,
            not personal characteristics.
          </p>
        </div>
      </div>
    </div>
  )
}
```

### 9.2 `components/anchor/AnchorQueue.tsx`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { ModerationCard } from './ModerationCard'
import type { AnchorQueueResponse } from '@/types'

export function AnchorQueue({ neighborhoodId }: { neighborhoodId: string }) {
  const [queue, setQueue] = useState<AnchorQueueResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<AnchorQueueResponse>(`/neighborhoods/${neighborhoodId}/anchor/queue`)
      .then(({ data }) => { setQueue(data); setLoading(false) })
  }, [neighborhoodId])

  if (loading) return null

  const totalPending = (queue?.flagged_posts.length ?? 0) + (queue?.tier3_requests.length ?? 0)
  if (totalPending === 0) return (
    <div className="p-4 rounded-lg bg-halqa-success-bg border border-halqa-success-bg mb-4">
      <p className="text-[13px] text-halqa-success font-medium">
        No pending moderation actions.
      </p>
    </div>
  )

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[18px] font-semibold text-halqa-ink">Moderation queue</h2>
        <span className="px-2 py-0.5 rounded-full bg-halqa-amber text-white
                         text-[12px] font-medium">
          {totalPending}
        </span>
      </div>

      {/* Flagged posts */}
      {queue?.flagged_posts.map(post => (
        <ModerationCard key={post.id} type="flagged_post" item={post}
          neighborhoodId={neighborhoodId} onAction={() => { /* refetch queue */ }} />
      ))}

      {/* Tier 3 vouching requests */}
      {queue?.tier3_requests.map(req => (
        <ModerationCard key={req.id} type="tier3_request" item={req}
          neighborhoodId={neighborhoodId} onAction={() => { /* refetch queue */ }} />
      ))}

      {/* Action log summary */}
      <div className="mt-3 p-3 rounded-lg bg-halqa-sand-mid">
        <p className="text-[12px] text-halqa-ink-mid">
          All moderation actions are logged. Your decisions are reviewed by the
          Halqa team to ensure fair community management.
        </p>
      </div>
    </div>
  )
}
```

---

## 10. Push Notifications & Deep Links

### 10.1 `hooks/usePushNotifications.ts`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { env } from '@/lib/env'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermissionAndSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    })

    const subJSON = subscription.toJSON()
    await apiFetch('/users/push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subJSON.endpoint,
        keys: { p256dh: subJSON.keys?.p256dh, auth: subJSON.keys?.auth },
      }),
    })
    setSubscribed(true)
  }

  return { permission, subscribed, requestPermissionAndSubscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
```

### 10.2 `public/sw.js` — Service Worker

```javascript
// Service worker: handles push notifications and deep-link routing

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.data,
      // Emergency alerts: no silent — system default sound
      silent: data.type !== 'emergency_alert' ? false : false,
      requireInteraction: data.type === 'emergency_alert', // stays until dismissed
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const deepLink = event.notification.data?.deep_link
  if (!deepLink) return

  // Translate halqa:// deep link to Next.js route
  const route = translateDeepLink(deepLink)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(route)
          return client.focus()
        }
      }
      // Open new window
      return clients.openWindow(route)
    })
  )
})

function translateDeepLink(deepLink) {
  // halqa://feed/{nid}                  →  /neighborhood/{nid}/feed
  // halqa://feed/{nid}/post/{pid}       →  /neighborhood/{nid}/feed?post={pid}
  // halqa://verification/result?...     →  /onboarding/verification-result?...
  // halqa://dashboard/{nid}             →  /neighborhood/{nid}/dashboard
  const url = deepLink.replace('halqa://', '')

  if (url.startsWith('feed/')) {
    const parts = url.split('/')
    const nid = parts[1]
    const pid = parts[3]
    return pid
      ? `/neighborhood/${nid}/feed?post=${pid}`
      : `/neighborhood/${nid}/feed`
  }
  if (url.startsWith('verification/result')) {
    return `/onboarding/verify/result?${url.split('?')[1] ?? ''}`
  }
  if (url.startsWith('dashboard/')) {
    const nid = url.split('/')[1]
    return `/neighborhood/${nid}/dashboard`
  }
  return '/'
}
```

### 10.3 In-App Banner (`components/ui/InAppBanner.tsx`)

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Warning } from '@phosphor-icons/react'
import type { Post } from '@/types'

// Listens for new emergency posts via Realtime and shows a banner
export function InAppBanner() {
  const supabase = createClient()
  const [banner, setBanner] = useState<Post | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!banner) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(timer)
  }, [banner])

  // Subscribe to emergency posts across all neighborhoods the user is in
  // For prototype: neighborhood_id is stored in local state / context
  // Full implementation: subscribe per active neighborhood
  useEffect(() => {
    const channel = supabase
      .channel('emergency-banners')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'is_emergency=eq.true',
      }, (payload) => {
        setBanner(payload.new as Post)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (!visible || !banner) return null

  const CATEGORY_LABEL: Record<string, string> = {
    power: 'Power', security: 'Security',
    infrastructure: 'Infrastructure', water: 'Water', general: 'Alert'
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-halqa-amber px-4 h-[72px]
                 flex items-center gap-3 cursor-pointer
                 animate-slide-down"
      onClick={() => setVisible(false)}
      onTouchStart={() => setVisible(false)}
    >
      <Warning size={20} className="text-white shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white uppercase tracking-wide">
          {CATEGORY_LABEL[banner.category]}
        </p>
        <p className="text-[13px] text-white truncate">{banner.content}</p>
      </div>
      <svg className="text-white w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}
```

---

## 11. Shared UI Components

### 11.1 `components/ui/Button.tsx`

```typescript
import { forwardRef } from 'react'
import type { ElementType, ComponentPropsWithRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'alert'

interface ButtonProps {
  variant?: ButtonVariant
  fullWidth?: boolean
  loading?: boolean
  as?: ElementType
  [key: string]: unknown
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-halqa-teal text-white hover:bg-halqa-teal-dark',
  secondary: 'bg-transparent text-halqa-teal border border-halqa-teal hover:bg-halqa-teal-light',
  ghost:     'bg-transparent text-halqa-ink-mid border border-halqa-sand-mid hover:bg-halqa-sand-mid',
  danger:    'bg-halqa-danger-bg text-halqa-danger border border-halqa-danger',
  alert:     'bg-halqa-amber text-white hover:bg-halqa-amber-dark',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', fullWidth, loading, as: Tag = 'button', children, ...props }, ref) => {
    return (
      <Tag
        ref={ref}
        className={`
          inline-flex items-center justify-center h-11 px-5 rounded-md
          font-medium text-[15px] transition-colors duration-[120ms]
          focus-visible:outline-2 focus-visible:outline-halqa-teal focus-visible:outline-offset-[3px]
          active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${fullWidth ? 'w-full' : ''}
        `}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : children}
      </Tag>
    )
  }
)
Button.displayName = 'Button'
```

### 11.2 `components/ui/Badge.tsx`

```typescript
type Tier = 1 | 2 | 3

const tierConfig = {
  1: { label: 'Member',   className: 'bg-halqa-sand-mid text-halqa-ink-mid' },
  2: { label: 'Verified', className: 'bg-halqa-teal-light text-halqa-teal-dark' },
  3: { label: 'Vouched',  className: 'bg-halqa-teal text-white' },
}

interface BadgeProps {
  tier: Tier
  size?: 'sm' | 'md'
}

export function Badge({ tier, size = 'md' }: BadgeProps) {
  const { label, className } = tierConfig[tier]
  return (
    <span className={`
      inline-block rounded-sm font-medium tracking-wide
      ${size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[12px]'}
      ${className}
    `}>
      {label}
    </span>
  )
}
```

### 11.3 `components/ui/EmptyState.tsx`

```typescript
import { Users, ChartBar, Wrench, Storefront, Bell } from '@phosphor-icons/react'
import { Button } from './Button'

type EmptyStateIcon = 'users' | 'chart-bar' | 'wrench' | 'storefront' | 'bell'

const ICONS: Record<EmptyStateIcon, typeof Users> = {
  'users': Users, 'chart-bar': ChartBar, 'wrench': Wrench,
  'storefront': Storefront, 'bell': Bell,
}

interface EmptyStateProps {
  icon: EmptyStateIcon
  headline: string
  subtext: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, headline, subtext, action }: EmptyStateProps) {
  const Icon = ICONS[icon]
  return (
    <div className="flex flex-col items-center py-16 px-4">
      <Icon size={48} className="text-halqa-sand-dark" />
      <h3 className="mt-6 text-[17px] font-semibold text-halqa-ink text-center max-w-[280px]">
        {headline}
      </h3>
      <p className="mt-2 text-[15px] text-halqa-ink-mid text-center max-w-[280px]">
        {subtext}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="primary" className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

### 11.4 `components/layout/TabBar.tsx`

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Bell, Users, Briefcase, User } from '@phosphor-icons/react'
import { useNeighborhood } from '@/hooks/useNeighborhood'

const tabs = [
  { href: 'feed',       icon: House,      label: 'Feed'      },
  { href: 'alerts',     icon: Bell,       label: 'Alerts'    },
  { href: 'community',  icon: Users,      label: 'Community' },
  { href: 'directory',  icon: Briefcase,  label: 'Directory' },
]

export function TabBar() {
  const pathname = usePathname()
  const { neighborhoodId } = useNeighborhood()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-halqa-sand-mid
                 flex items-center justify-around pb-safe"
      aria-label="Main navigation"
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const fullHref = `/neighborhood/${neighborhoodId}/${href}`
        const isActive = pathname.includes(`/${href}`)
        return (
          <Link
            key={href}
            href={fullHref}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]
                       justify-center focus-visible:outline-2 focus-visible:outline-halqa-teal"
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="w-7 h-0.5 rounded-full bg-halqa-teal -mb-1" />
            )}
            <Icon
              size={24}
              weight={isActive ? 'fill' : 'regular'}
              className={isActive ? 'text-halqa-teal' : 'text-halqa-ink-light'}
            />
            <span className={`text-[13px] ${isActive ? 'text-halqa-teal' : 'text-halqa-ink-light'}`}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* Profile tab — always last, links to /profile not neighborhood-scoped */}
      <Link
        href="/profile"
        className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]
                   justify-center focus-visible:outline-2 focus-visible:outline-halqa-teal"
        aria-label="Profile"
      >
        <User
          size={24}
          weight={pathname.includes('/profile') ? 'fill' : 'regular'}
          className={pathname.includes('/profile') ? 'text-halqa-teal' : 'text-halqa-ink-light'}
        />
        <span className={`text-[13px] ${pathname.includes('/profile') ? 'text-halqa-teal' : 'text-halqa-ink-light'}`}>
          Profile
        </span>
      </Link>
    </nav>
  )
}
```

### 11.5 `components/layout/HalqaLogo.tsx`

```typescript
// The Halqa mark is an SVG — encoded directly for performance (no external fetch)
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<LogoSize, { mark: number; wordmarkSize: string }> = {
  sm: { mark: 24,  wordmarkSize: 'text-[14px]' },
  md: { mark: 32,  wordmarkSize: 'text-[18px]' },
  lg: { mark: 40,  wordmarkSize: 'text-[22px]' },
  xl: { mark: 48,  wordmarkSize: 'text-[28px]' },
}

interface HalqaLogoProps {
  size?: LogoSize
  hideWordmark?: boolean
}

export function HalqaLogo({ size = 'md', hideWordmark = false }: HalqaLogoProps) {
  const { mark, wordmarkSize } = sizes[size]
  return (
    <div className="flex items-center gap-3">
      {/* SVG mark: incomplete ring (292°) + inner dot */}
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer arc — 292° ring with round linecaps, opening at ~4 o'clock */}
        <path
          d="M 24 5
             A 19 19 0 1 1 39.9 33.5"
          stroke="#1D6A58"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner filled dot */}
        <circle cx="24" cy="24" r="7" fill="#1D6A58" />
      </svg>

      {!hideWordmark && (
        <div className="flex flex-col">
          {/* Latin wordmark */}
          <span
            className={`font-semibold text-halqa-ink leading-tight tracking-[-0.02em] ${wordmarkSize}`}
            style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
          >
            Halqa
          </span>
          {/* Urdu wordmark */}
          <span
            className="text-[13px] text-halqa-ink-mid font-urdu text-right leading-tight"
            dir="rtl"
            lang="ur"
          >
            حلقہ
          </span>
        </div>
      )}
    </div>
  )
}
```

---

## 12. Global Styles (`app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Noto+Nastaliq+Urdu:wght@400;500&display=swap');

/* Verification pending pulse */
@keyframes halqa-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* Post card entrance */
@keyframes halqa-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* In-app emergency banner slide down */
@keyframes slide-down {
  from { transform: translateY(-100%); }
  to   { transform: translateY(0); }
}

@layer utilities {
  .animate-halqa-pulse  { animation: halqa-pulse 1.5s ease-in-out infinite; }
  .animate-halqa-fade-in { animation: halqa-fade-in 200ms ease-out forwards; }
  .animate-slide-down    { animation: slide-down 280ms cubic-bezier(0.16,1,0.3,1) forwards; }

  /* Safe area inset for tab bar on notched devices */
  .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
}

/* Reduced motion overrides */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus ring — global */
:focus-visible {
  outline: 2px solid #1D6A58;
  outline-offset: 3px;
  border-radius: 6px;
}

/* Dark mode root variables */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-base:      #141210;
    --bg-surface:   #1E1C18;
    --bg-card:      #252320;
    --text-primary: #F0EDE8;
    --text-mid:     #A89F93;
  }
}
```

---

## 13. Type Definitions (`types/index.ts`)

This file is the TypeScript mirror of ARCHITECTURE.md Section 4. Copy all
types verbatim from that section. Do not define types locally in components —
always import from `@/types`. This file is the single source of truth for
all shared types on the frontend.

---

## 14. Environment Variables (`lib/env.ts`)

```typescript
// Type-safe environment variable access.
// Never use process.env directly in components or hooks.

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL:    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_API_URL:         requireEnv('NEXT_PUBLIC_API_URL'),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: requireEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
} as const
```

---

## 15. Dependencies (`package.json` — key packages)

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@supabase/ssr": "^0.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "@phosphor-icons/react": "^2.1.7",
    "date-fns": "^3.6.0",
    "tailwindcss": "^3.4.x"
  },
  "devDependencies": {
    "typescript": "^5.4.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  }
}
```

No state management library (Zustand, Redux) — React Context is sufficient for
neighborhood context, and Supabase Realtime handles the live state. No animation
library — CSS keyframes only. No map library at prototype stage — the confirmation
screen uses a styled placeholder.

---

## 16. Implementation Order

Build in this sequence. Each step produces a visually verifiable result.

1. **Project scaffold** — Next.js init, tailwind.config.ts with all design tokens,
   globals.css, env.ts, tsconfig.json (strict). Verify fonts load correctly.

2. **Supabase client setup** — `lib/supabase/client.ts`, `lib/supabase/server.ts`,
   `lib/api/client.ts`. Test that auth session is accessible in both Server and
   Client Components.

3. **Type definitions** — Copy all types from ARCHITECTURE.md Section 4 into
   `types/index.ts`. This unblocks all subsequent work.

4. **Shared UI components** — `Button`, `Input`, `Badge`, `EmptyState`, `HalqaLogo`,
   `TabBar`, `PageHeader`. These must exist before any screen can be built.

5. **Onboarding flow (all 5 screens)** — Entry, Search, Confirm, Account, Verify.
   Test the full signup + join + verify navigation sequence end-to-end with the
   deployed FastAPI backend.

6. **Root route guard and app layout** — `app/page.tsx` redirect logic,
   `app/(app)/layout.tsx` auth guard, TabBar integration.

7. **Feed screen** — `useFeed` hook, `PostCard`, `EmergencyPostCard`, `PostComposer`,
   `FeedList`. Test Realtime subscription with seed data.

8. **Verification flow components** — `UploadZone` with all four states,
   deep-link result screen. Test the full upload → pending → approved notification
   → deep-link → approved state flow.

9. **Alerts tab** — Simpler than the feed (filtered view). Reuses `PostCard`.
   `InAppBanner` for live emergency alerts.

10. **Civic dashboard** — `DashboardCard`, `CategoryBreakdown`, `PeriodSelector`,
    `ExportButton`. Test with seed snapshot data. Verify export copy text matches
    the format in ARCHITECTURE.md.

11. **Worker directory** — `WorkerCard`, `WorkerBadge`, listing detail page,
    `ReviewForm`. Tier-gated contact info visibility.

12. **Community tab + anchor interface** — `AnchorQueue`, `ModerationCard`,
    `VouchingPanel`. Test with anchor demo user from seed data.

13. **PWA configuration** — `manifest.json`, `sw.js` service worker with push
    notification handler and deep-link translator. Test on mobile (install to
    home screen, receive a push, tap notification, land on correct screen).

14. **Profile screen** — Display name, push notification toggle,
    sign out. Simple screen.

15. **Vercel deployment** — Push to main, verify auto-deploy, test the full
    user journey on the deployed URL. This is the demo URL.
