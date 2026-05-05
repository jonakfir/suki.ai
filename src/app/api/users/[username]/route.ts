import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const handle = (username || "").trim().toLowerCase();
  if (!handle) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  // Resolve viewer (optional — public profiles work for logged-out viewers)
  let viewerId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      viewerId = user.id;
    } else {
      const cookieStore = await cookies();
      const isAdmin = await verifyAdminCookie(
        cookieStore.get(ADMIN_COOKIE_NAME)?.value
      );
      if (isAdmin) viewerId = null;
    }
  } catch {
    viewerId = null;
  }

  // Use admin client for the read so logged-out viewers still see public profiles.
  const admin = createAdminClient();

  const { data: profile, error: profileErr } = await admin
    .from("users_profile")
    .select("*")
    .ilike("username", handle)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (profile.is_public === false && viewerId !== profile.user_id) {
    return NextResponse.json({ error: "Private profile" }, { status: 403 });
  }

  const [productsRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
    admin
      .from("user_products")
      .select("*")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false }),
    admin
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.user_id),
    admin
      .from("user_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profile.user_id),
    viewerId
      ? admin
          .from("user_follows")
          .select("id")
          .eq("follower_id", viewerId)
          .eq("following_id", profile.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return NextResponse.json({
    profile,
    products: productsRes.data ?? [],
    followerCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
    isFollowing: !!isFollowingRes.data,
    viewerId,
  });
}
