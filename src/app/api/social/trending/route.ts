import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";

type Row = {
  product_name: string;
  brand: string;
  domain: string;
  user_id: string;
};

export async function GET(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "friends" ? "friends" : "global";

  let userIds: string[] | null = null;
  if (scope === "friends") {
    const { data: followRows } = await auth.supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", auth.userId);
    userIds = (followRows ?? []).map((r) => r.following_id);
    if (!userIds.length) {
      return NextResponse.json({ trending: [] });
    }
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let q = auth.supabase
    .from("activity_events")
    .select("product_name, brand, domain, user_id")
    .eq("activity_type", "rated_product")
    .eq("rating", "love")
    .gte("created_at", since)
    .limit(500);

  if (userIds) {
    q = q.in("user_id", userIds);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Restrict to public users
  const allUserIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
  let publicSet = new Set<string>(allUserIds);
  if (allUserIds.length) {
    const { data: profs } = await auth.supabase
      .from("users_profile")
      .select("user_id, is_public")
      .in("user_id", allUserIds);
    publicSet = new Set(
      (profs ?? [])
        .filter((p) => p.is_public !== false)
        .map((p) => p.user_id)
    );
  }

  const counts = new Map<string, { product_name: string; brand: string; domain: string; count: number }>();
  for (const r of (data ?? []) as Row[]) {
    if (!publicSet.has(r.user_id)) continue;
    const key = `${r.product_name}|${r.brand}|${r.domain}`;
    const cur = counts.get(key);
    if (cur) cur.count += 1;
    else
      counts.set(key, {
        product_name: r.product_name,
        brand: r.brand,
        domain: r.domain,
        count: 1,
      });
  }

  const trending = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({ trending });
}
