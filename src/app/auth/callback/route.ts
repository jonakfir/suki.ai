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
        // A profile row may exist (e.g. auto-created by a Supabase trigger)
        // but still be empty. Require skin_type to be set before we consider
        // onboarding complete; otherwise always walk the user through it.
        const { data: profile } = await supabase
          .from("users_profile")
          .select("skin_type")
          .eq("user_id", user.id)
          .single();

        if (profile && profile.skin_type) {
          return NextResponse.redirect(`${origin}/today`);
        }
        return NextResponse.redirect(`${origin}/onboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
