import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin-session")?.value === "true";
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users_profile")
    .upsert({
      user_id: ADMIN_USER_ID,
      skin_type: body.skin_type || "combination",
      skin_concerns: body.skin_concerns || ["acne", "dullness"],
      skin_tone: body.skin_tone || "medium",
      age_range: body.age_range || "20s",
      known_allergies: body.known_allergies || [],
      budget: body.budget || "mid-range",
      routine_complexity: body.routine_complexity || "moderate",
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
