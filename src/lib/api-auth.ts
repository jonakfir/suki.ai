import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

export type ApiSupabase =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

export type ResolvedAuth =
  | { userId: string; supabase: ApiSupabase; isAdmin: boolean }
  | { error: Response };

/**
 * Resolve the caller's identity for API routes.
 *
 * Order matters: a real Supabase session ALWAYS wins over the admin cookie.
 * Otherwise a stale admin-session cookie (common in dev) silently hijacks
 * writes and they land on the admin stub profile.
 */
export async function resolveAuth(): Promise<ResolvedAuth> {
  // 1. Real user via Supabase SSR session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    return { userId: user.id, supabase, isAdmin: false };
  }

  // 2. Fall back to admin cookie when there's no real session.
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value
  );
  if (isAdmin) {
    return {
      userId: ADMIN_USER_ID,
      supabase: createAdminClient(),
      isAdmin: true,
    };
  }

  return {
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
