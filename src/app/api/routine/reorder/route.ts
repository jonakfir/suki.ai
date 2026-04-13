import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";

type SupabaseLike = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: SupabaseLike } | { error: Response }
> {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin-session")?.value === "true";
  if (isAdmin) {
    return { userId: ADMIN_USER_ID, supabase: createAdminClient() };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: user.id, supabase };
}

const VALID_TIMES = ["morning", "evening", "weekly"] as const;

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { orderedIds, time_of_day } = body ?? {};
    if (
      !Array.isArray(orderedIds) ||
      !orderedIds.every((x) => typeof x === "string") ||
      typeof time_of_day !== "string" ||
      !(VALID_TIMES as readonly string[]).includes(time_of_day)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const results = await Promise.all(
      (orderedIds as string[]).map((id, idx) =>
        auth.supabase
          .from("user_routine_steps")
          .update({ position: idx })
          .eq("id", id)
          .eq("user_id", auth.userId)
          .eq("time_of_day", time_of_day)
      )
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) throw firstErr;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder routine steps:", error);
    const msg = error instanceof Error ? error.message : "Failed to reorder";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
