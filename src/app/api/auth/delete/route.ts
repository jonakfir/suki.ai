import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

// Full account deletion. Relies on ON DELETE CASCADE in the users_profile,
// user_products, recommendations, user_routine_steps, and user_progress_photos
// tables (all reference auth.users(id)). Also cleans the user's storage folder.
export async function POST(request: Request) {
  // CSRF protection: require an explicit same-origin custom header the client
  // sets, and verify the Origin header matches the host when present. A simple
  // cross-site form POST cannot set custom headers and typically has the wrong
  // Origin — this blocks the trivial CSRF surface without a token server.
  const requested = request.headers.get("x-requested-with");
  if (requested !== "suki-web") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (isAdmin) {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted from this endpoint." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Best-effort: clean the user's progress-photos storage folder.
  try {
    const list = await admin.storage
      .from("progress-photos")
      .list(user.id, { limit: 1000 });
    const names =
      list.data?.map((f: { name: string }) => `${user.id}/${f.name}`) ?? [];
    if (names.length) {
      await admin.storage.from("progress-photos").remove(names);
    }
  } catch (e) {
    console.warn("account-delete: storage cleanup failed", e);
  }

  // Deleting the auth user cascades all user-owned tables via FK ON DELETE CASCADE.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sign the current session out (cookie-bound).
  try {
    await supabase.auth.signOut();
  } catch {}

  return NextResponse.json({ ok: true });
}
