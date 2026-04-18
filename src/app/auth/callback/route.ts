import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from("users_profile")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          return NextResponse.redirect(`${origin}/today`);
        }
        return NextResponse.redirect(`${origin}/onboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
