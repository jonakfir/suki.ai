import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor"); // ISO timestamp
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  // Followed users
  const { data: followRows } = await auth.supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", auth.userId);
  let userIds: string[] = (followRows ?? []).map((r) => r.following_id);

  // Cold-start fallback: similar profiles by skin_type/concerns
  if (userIds.length === 0) {
    const { data: meProfile } = await auth.supabase
      .from("users_profile")
      .select("skin_type, skin_concerns")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (meProfile?.skin_type) {
      const { data: similar } = await auth.supabase
        .from("users_profile")
        .select("user_id")
        .eq("is_public", true)
        .eq("skin_type", meProfile.skin_type)
        .neq("user_id", auth.userId)
        .limit(50);
      userIds = (similar ?? []).map((r) => r.user_id);
    }
  }

  if (!userIds.length) {
    return NextResponse.json({ events: [], nextCursor: null });
  }

  // Public users only
  const { data: publicProfiles } = await auth.supabase
    .from("users_profile")
    .select("user_id, username")
    .in("user_id", userIds)
    .eq("is_public", true);

  const publicIds = (publicProfiles ?? []).map((p) => p.user_id);
  if (!publicIds.length) {
    return NextResponse.json({ events: [], nextCursor: null });
  }
  const usernameById = new Map(
    (publicProfiles ?? []).map((p) => [p.user_id, p.username as string | null])
  );

  let q = auth.supabase
    .from("activity_events")
    .select("*")
    .in("user_id", publicIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    q = q.lt("created_at", cursor);
  }

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (rows ?? []).slice(0, limit).map((r) => ({
    ...r,
    username: usernameById.get(r.user_id) ?? null,
  }));
  const nextCursor =
    (rows ?? []).length > limit ? events[events.length - 1]?.created_at : null;

  return NextResponse.json({ events, nextCursor });
}
