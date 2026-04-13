import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Allow admin sessions through
  const adminSession = request.cookies.get("admin-session");
  if (adminSession?.value === "true") {
    return NextResponse.next();
  }

  // Check for Supabase auth cookies (quick check before hitting Supabase)
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes("-auth-token"));

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Validate the session with Supabase
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|favicon\\.ico|hero-frames|auth|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|js|css)$)(?!$).*)",
  ],
};
