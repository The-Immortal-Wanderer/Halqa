import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = [
  "/onboarding",
  "/onboarding/find",
  "/onboarding/confirm",
  "/onboarding/register",
  "/deeplink",
];

const protectedRoutes = [
  "/onboarding/verify",
  "/verify",
  "/verify/upload",
  "/verify/pending",
  "/verify/result",
  "/neighborhoods",
  "/feed",
  "/dashboard",
  "/directory",
  "/marketplace",
  "/events",
  "/profile",
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/"),
  );
  const isProtected = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/"),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register" || isPublic)) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
