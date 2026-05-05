import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";

export async function PATCH(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;
  if (auth.isAdmin) {
    return NextResponse.json(
      { error: "Admin sessions cannot toggle privacy" },
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
    body && typeof body === "object" && "is_public" in body
      ? (body as { is_public?: unknown }).is_public
      : null;

  if (typeof raw !== "boolean") {
    return NextResponse.json(
      { error: "is_public must be a boolean" },
      { status: 400 }
    );
  }

  const { error } = await auth.supabase
    .from("users_profile")
    .upsert(
      { user_id: auth.userId, is_public: raw },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, is_public: raw });
}
