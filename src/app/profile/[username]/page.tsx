import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";
import { UserAvatar } from "@/components/social/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";

type ProfileRow = {
  user_id: string;
  username: string | null;
  is_public: boolean | null;
  face_photo_url?: string | null;
};

type ProductRow = {
  id: string;
  product_name: string;
  brand: string;
  domain?: "skincare" | "haircare" | "makeup" | null;
  rating: string;
  image_url?: string | null;
};

async function getViewerId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
    const cookieStore = await cookies();
    const isAdmin = await verifyAdminCookie(
      cookieStore.get(ADMIN_COOKIE_NAME)?.value
    );
    return isAdmin ? null : null;
  } catch {
    return null;
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = (username || "").trim().toLowerCase();
  if (!handle) notFound();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users_profile")
    .select("user_id, username, is_public, face_photo_url")
    .ilike("username", handle)
    .maybeSingle<ProfileRow>();

  if (!profile) notFound();

  const viewerId = await getViewerId();
  const isOwn = viewerId === profile.user_id;
  const isPrivate = profile.is_public === false;

  if (isPrivate && !isOwn) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold mb-2">@{profile.username}</h1>
        <p className="text-muted">This profile is private.</p>
        {!viewerId && (
          <Link href="/auth" className="inline-block mt-6 px-4 py-2 rounded-full bg-accent text-white text-sm">
            Sign in
          </Link>
        )}
      </main>
    );
  }

  const [productsRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
    admin
      .from("user_products")
      .select("id, product_name, brand, domain, rating, image_url")
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
      : Promise.resolve({ data: null }),
  ]);

  const products = (productsRes.data ?? []) as ProductRow[];
  const followerCount = followersRes.count ?? 0;
  const followingCount = followingRes.count ?? 0;
  const isFollowing = !!isFollowingRes.data;

  const byDomain: Record<string, ProductRow[]> = {
    skincare: [],
    haircare: [],
    makeup: [],
  };
  for (const p of products) {
    const d = (p.domain ?? "skincare") as string;
    (byDomain[d] ?? byDomain.skincare).push(p);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center gap-4 mb-8">
        <UserAvatar
          username={profile.username}
          photoUrl={profile.face_photo_url ?? null}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">@{profile.username}</h1>
          <div className="text-sm text-muted mt-1 flex gap-4">
            <span><b className="text-foreground">{followerCount}</b> followers</span>
            <span><b className="text-foreground">{followingCount}</b> following</span>
            <span><b className="text-foreground">{products.length}</b> products</span>
          </div>
        </div>
        {!isOwn && viewerId && (
          <FollowButton
            targetUserId={profile.user_id}
            initialFollowing={isFollowing}
          />
        )}
        {!viewerId && (
          <Link href="/auth" className="px-4 py-1.5 rounded-full bg-accent text-white text-sm">
            Sign in
          </Link>
        )}
      </header>

      {(["skincare", "haircare", "makeup"] as const).map((domain) => {
        const list = byDomain[domain];
        if (!list?.length) return null;
        return (
          <section key={domain} className="mb-8">
            <h2 className="text-sm uppercase tracking-wider text-muted mb-3">{domain}</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {list.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-card p-3 text-sm"
                >
                  <div className="font-medium truncate">{p.product_name}</div>
                  <div className="text-xs text-muted truncate">{p.brand}</div>
                  <div className="text-xs mt-2">
                    {p.rating === "love" && <span aria-label="loves">❤️ loves</span>}
                    {p.rating === "bad_reaction" && <span>👎 bad reaction</span>}
                    {p.rating === "neutral" && <span className="text-muted">neutral</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!products.length && (
        <p className="text-muted text-center py-8">No products yet.</p>
      )}
    </main>
  );
}
