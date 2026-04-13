import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect("/auth");
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users_profile")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}
