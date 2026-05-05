import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function GET(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ available: false, reason: "missing" });
  }
  if (!USERNAME_RE.test(q)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }

  const { data, error } = await auth.supabase
    .from("users_profile")
    .select("user_id")
    .ilike("username", q)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const taken = (data ?? []).some((row) => row.user_id !== auth.userId);
  return NextResponse.json({ available: !taken });
}

export async function PATCH(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  if (auth.isAdmin) {
    return NextResponse.json(
      { error: "Admin sessions cannot claim a username" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "username" in body
      ? (body as { username?: unknown }).username
      : null;
  const username = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 chars, a–z, 0–9, or _" },
      { status: 400 }
    );
  }

  // Conflict check: any other user already holding this handle?
  const { data: existing, error: existingErr } = await auth.supabase
    .from("users_profile")
    .select("user_id")
    .ilike("username", username)
    .limit(1);
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }
  if ((existing ?? []).some((r) => r.user_id !== auth.userId)) {
    return NextResponse.json({ error: "Username taken" }, { status: 409 });
  }

  const { error } = await auth.supabase
    .from("users_profile")
    .upsert(
      { user_id: auth.userId, username },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, username });
}
