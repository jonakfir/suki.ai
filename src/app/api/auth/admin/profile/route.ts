import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_USER_ID } from "@/lib/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
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
      hair_type: body.hair_type ?? null,
      hair_texture: body.hair_texture ?? null,
      hair_porosity: body.hair_porosity ?? null,
      hair_concerns: body.hair_concerns ?? [],
      hair_goals: body.hair_goals ?? [],
      is_color_treated: body.is_color_treated ?? false,
      undertone: body.undertone ?? null,
      makeup_style: body.makeup_style ?? null,
      coverage_preference: body.coverage_preference ?? null,
      finish_preference: body.finish_preference ?? null,
      preference_mode: body.preference_mode ?? "most_recommended",
      race: body.race ?? null,
      face_photo_url: body.face_photo_url ?? null,
      face_photo_storage_path: body.face_photo_storage_path ?? null,
      initial_products_using: body.initial_products_using ?? null,
      initial_products_bad: body.initial_products_bad ?? null,
      initial_hair_products: body.initial_hair_products ?? null,
      initial_makeup_products: body.initial_makeup_products ?? null,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
