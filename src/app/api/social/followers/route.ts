import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";

export async function GET() {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { data: rows, error } = await auth.supabase
    .from("user_follows")
    .select("follower_id, created_at")
    .eq("following_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (rows ?? []).map((r) => r.follower_id);
  if (!ids.length) return NextResponse.json({ followers: [] });

  const { data: profiles } = await auth.supabase
    .from("users_profile")
    .select("user_id, username, is_public")
    .in("user_id", ids);

  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const followers = (rows ?? []).map((r) => ({
    user_id: r.follower_id,
    created_at: r.created_at,
    profile: byId.get(r.follower_id) ?? null,
  }));

  return NextResponse.json({ followers });
}
