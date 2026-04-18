import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

type SupabaseLike = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function resolveAuth(): Promise<
  { userId: string; supabase: SupabaseLike } | { error: Response }
> {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
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
type TimeOfDay = (typeof VALID_TIMES)[number];

function isTimeOfDay(v: unknown): v is TimeOfDay {
  return typeof v === "string" && (VALID_TIMES as readonly string[]).includes(v);
}

export async function GET() {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const { data, error } = await auth.supabase
      .from("user_routine_steps")
      .select(
        "id, user_id, time_of_day, position, product_id, step_name, instruction, notes, created_at, updated_at, product:user_products(id, product_name, brand, category)"
      )
      .eq("user_id", auth.userId)
      .order("time_of_day", { ascending: true })
      .order("position", { ascending: true });

    if (error) throw error;

    const rows = data ?? [];
    const grouped: Record<TimeOfDay, typeof rows> = {
      morning: [],
      evening: [],
      weekly: [],
    };
    for (const r of rows) {
      const t = (r as { time_of_day: string }).time_of_day;
      if (isTimeOfDay(t)) grouped[t].push(r);
    }
    return NextResponse.json({ steps: rows, grouped });
  } catch (error) {
    console.error("Failed to fetch routine:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch routine";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const {
      time_of_day,
      product_id,
      step_name,
      instruction,
      notes,
    }: {
      time_of_day?: string;
      product_id?: string | null;
      step_name?: string | null;
      instruction?: string | null;
      notes?: string | null;
    } = body ?? {};

    if (!isTimeOfDay(time_of_day)) {
      return NextResponse.json({ error: "Invalid time_of_day" }, { status: 400 });
    }

    const { data: maxRow, error: maxErr } = await auth.supabase
      .from("user_routine_steps")
      .select("position")
      .eq("user_id", auth.userId)
      .eq("time_of_day", time_of_day)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw maxErr;

    const nextPos =
      maxRow && typeof (maxRow as { position: number }).position === "number"
        ? (maxRow as { position: number }).position + 1
        : 0;

    const { data, error } = await auth.supabase
      .from("user_routine_steps")
      .insert({
        user_id: auth.userId,
        time_of_day,
        position: nextPos,
        product_id: product_id ?? null,
        step_name: step_name ?? null,
        instruction: instruction ?? null,
        notes: notes ?? null,
      })
      .select(
        "id, user_id, time_of_day, position, product_id, step_name, instruction, notes, created_at, updated_at, product:user_products(id, product_name, brand, category)"
      )
      .single();
    if (error) throw error;
    return NextResponse.json({ step: data });
  } catch (error) {
    console.error("Failed to add routine step:", error);
    const msg = error instanceof Error ? error.message : "Failed to add routine step";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { id, step_name, instruction, notes, position } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (step_name !== undefined) update.step_name = step_name;
    if (instruction !== undefined) update.instruction = instruction;
    if (notes !== undefined) update.notes = notes;
    if (position !== undefined) update.position = position;

    const { data, error } = await auth.supabase
      .from("user_routine_steps")
      .update(update)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ step: data });
  } catch (error) {
    console.error("Failed to update routine step:", error);
    const msg = error instanceof Error ? error.message : "Failed to update routine step";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from("user_routine_steps")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete routine step:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete routine step";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
