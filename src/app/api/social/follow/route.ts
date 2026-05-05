import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";

async function readTarget(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && typeof body.target_user_id === "string") {
      return body.target_user_id;
    }
  } catch {
    // ignore
  }
  return null;
}

async function followingCount(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  targetId: string
) {
  const { count } = await supabase
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", targetId);
  return count ?? 0;
}

export async function POST(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  if (auth.isAdmin) {
    return NextResponse.json({ error: "Admin sessions cannot follow" }, { status: 403 });
  }

  const target = await readTarget(request);
  if (!target) {
    return NextResponse.json({ error: "Missing target_user_id" }, { status: 400 });
  }
  if (target === auth.userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("user_follows")
    .upsert(
      { follower_id: auth.userId, following_id: target },
      { onConflict: "follower_id,following_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = await followingCount(auth.supabase, target);
  return NextResponse.json({ success: true, following_count: count });
}

export async function DELETE(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  if (auth.isAdmin) {
    return NextResponse.json({ error: "Admin sessions cannot unfollow" }, { status: 403 });
  }

  const target = await readTarget(request);
  if (!target) {
    return NextResponse.json({ error: "Missing target_user_id" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", auth.userId)
    .eq("following_id", target);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = await followingCount(auth.supabase, target);
  return NextResponse.json({ success: true, following_count: count });
}
