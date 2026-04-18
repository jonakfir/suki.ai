import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

async function resolveAuth() {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (isAdmin) {
    return { userId: ADMIN_USER_ID, supabase: createAdminClient() };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: user.id, supabase };
}

export async function GET(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain") ?? "skincare";

  const { data, error } = await auth.supabase
    .from("user_progress_photos")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("domain", domain)
    .order("taken_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Regenerate signed URLs on every request — the bucket is private and the
  // originally-stored URL expires after 30 days. Prefer `storage_path`.
  const photos = data ?? [];
  const enriched = await Promise.all(
    photos.map(async (p: Record<string, unknown>) => {
      const path = typeof p.storage_path === "string" ? p.storage_path : null;
      if (!path) return p;
      const { data: signed } = await auth.supabase.storage
        .from("progress-photos")
        .createSignedUrl(path, 60 * 60);
      return {
        ...p,
        image_url: signed?.signedUrl ?? p.image_url,
      };
    })
  );
  return NextResponse.json({ photos: enriched });
}

export async function POST(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const image_url = typeof body.image_url === "string" ? body.image_url : "";
  const storage_path = typeof body.storage_path === "string" ? body.storage_path : null;
  const domain = typeof body.domain === "string" ? body.domain : "skincare";
  const notes = typeof body.notes === "string" ? body.notes : "";
  const mood_score =
    typeof body.mood_score === "number" && body.mood_score >= 1 && body.mood_score <= 5
      ? body.mood_score
      : null;

  if (!image_url) {
    return NextResponse.json({ error: "image_url required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("user_progress_photos")
    .insert({
      user_id: auth.userId,
      domain,
      image_url,
      storage_path,
      notes,
      mood_score,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ photo: data });
}

export async function DELETE(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Look up storage_path before delete so we can clean the bucket too.
  const { data: row } = await auth.supabase
    .from("user_progress_photos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  // Delete DB row first so a partial failure doesn't leave an orphan pointer.
  const { error } = await auth.supabase
    .from("user_progress_photos")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (row?.storage_path) {
    try {
      await auth.supabase.storage
        .from("progress-photos")
        .remove([row.storage_path]);
    } catch (e) {
      console.warn("progress: storage remove failed (orphan left)", e);
    }
  }

  return NextResponse.json({ ok: true });
}
