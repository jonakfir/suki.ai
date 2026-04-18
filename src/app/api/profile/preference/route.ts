import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuth } from "@/lib/api-auth";

const ALLOWED = new Set(["budget", "simple", "high_end", "most_recommended"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode = typeof body.mode === "string" ? body.mode : "";
  if (!ALLOWED.has(mode)) {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  }

  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  // Always write via service-role, scoped strictly to the resolved user_id.
  // Direct client UPDATE through RLS was silently matching zero rows on some
  // rows — upsert via service role is reliable.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users_profile")
    .upsert(
      { user_id: auth.userId, preference_mode: mode },
      { onConflict: "user_id" }
    )
    .select("preference_mode")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    preference_mode: data?.preference_mode ?? mode,
    via: auth.isAdmin ? "admin" : "user",
  });
}
