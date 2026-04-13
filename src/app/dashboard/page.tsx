"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession, clearAdminSession, ADMIN_USER_ID, ADMIN_NAME } from "@/lib/admin";
import { useStore, UserProduct, Recommendation, SkinProfile } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn } from "@/components/ui/FadeIn";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Heart,
  Meh,
  AlertTriangle,
  Package,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const { profile, setProfile, products, setProducts, recommendations, setRecommendations, resetUserData } = useStore();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [productsError, setProductsError] = useState(false);
  const [recsError, setRecsError] = useState(false);
  const supabase = createClient();

  const loadProfile = async (uid: string) => {
    setProfileError(false);
    const res = await supabase.from("users_profile").select("*").eq("user_id", uid).single();
    if (res.error && res.error.code !== "PGRST116") {
      setProfileError(true);
      return;
    }
    if (res.data) {
      const p = res.data;
      setProfile({
        skin_type: p.skin_type,
        skin_concerns: p.skin_concerns || [],
        skin_tone: p.skin_tone,
        age_range: p.age_range,
        known_allergies: p.known_allergies || [],
        budget: p.budget,
        routine_complexity: p.routine_complexity,
      });
    }
  };

  const loadProducts = async (uid: string) => {
    setProductsError(false);
    const res = await supabase
      .from("user_products")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (res.error) {
      setProductsError(true);
      return;
    }
    setProducts((res.data ?? []) as UserProduct[]);
  };

  const loadRecs = async (uid: string) => {
    setRecsError(false);
    const res = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", uid)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false });
    if (res.error) {
      setRecsError(true);
      return;
    }
    setRecommendations((res.data ?? []) as Recommendation[]);
  };

  useEffect(() => {
    async function load() {
      // Prefer a real Supabase user over a stale admin cookie
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      const admin = await isAdminSession();
      let uid: string | null = null;

      if (supaUser) {
        // A real user is signed in — clear any leftover admin cookie
        await clearAdminSession();
        uid = supaUser.id;
        const fullName = supaUser.user_metadata?.full_name as string | undefined;
        const first = fullName?.trim().split(/\s+/)[0];
        setUserName(first || supaUser.email?.split("@")[0] || "there");
      } else if (admin) {
        uid = ADMIN_USER_ID;
        setUserName(ADMIN_NAME);
      } else {
        setLoading(false);
        return;
      }

      setUserId(uid);

      // Clear any stale in-memory data from a previous session before loading
      resetUserData();

      await Promise.allSettled([
        loadProfile(uid),
        loadProducts(uid),
        loadRecs(uid),
      ]);

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshRecs = async () => {
    setRecsLoading(true);
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      const data = await res.json();
      if (data.recommendations) setRecommendations(data.recommendations);
    } catch (err) {
      console.error("Failed to refresh recommendations:", err);
    } finally {
      setRecsLoading(false);
    }
  };

  const currentProducts = products.filter((p) => p.is_current);
  const lovedProducts = products.filter((p) => p.rating === "love");
  const topRecs = recommendations.filter((r) => r.type === "add").slice(0, 3);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="h-8 w-64 rounded-md bg-card/70 animate-pulse mb-2" />
        <div className="h-4 w-80 rounded-md bg-card/60 animate-pulse mb-6 sm:mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 h-36 rounded-2xl bg-card/70 animate-pulse" />
          <div className="h-36 rounded-2xl bg-card/70 animate-pulse" />
          <div className="lg:col-span-2 h-56 rounded-2xl bg-card/70 animate-pulse" />
          <div className="h-56 rounded-2xl bg-card/70 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <FadeIn>
        <h1 className="text-h1 font-light mb-1">
          Welcome back, {userName}.
        </h1>
        <p className="text-muted font-[family-name:var(--font-body)] text-sm mb-6 sm:mb-8">
          Here&apos;s what suki. recommends today.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Skin Profile Summary */}
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 font-light">Your skin profile</h2>
              <Link href="/profile">
                <GhostButton size="sm" variant="ghost">
                  Edit
                </GhostButton>
              </Link>
            </div>
            {profileError ? (
              <SectionError
                label="profile"
                onRetry={() => userId && loadProfile(userId)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skin_type && (
                  <Pill>{profile.skin_type}</Pill>
                )}
                {profile.skin_concerns.map((c) => (
                  <Pill key={c}>{c}</Pill>
                ))}
                {profile.budget && <Pill>{profile.budget}</Pill>}
                {profile.routine_complexity && (
                  <Pill>{profile.routine_complexity} routine</Pill>
                )}
              </div>
            )}
          </Card>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={0.2}>
          <Card className="flex flex-col gap-3">
            <Link href="/products">
              <GhostButton variant="outline" className="w-full">
                <Plus size={16} />
                Add a product
              </GhostButton>
            </Link>
            <GhostButton
              variant="outline"
              className="w-full"
              onClick={refreshRecs}
              disabled={recsLoading}
            >
              <RefreshCw size={16} className={recsLoading ? "animate-spin" : ""} />
              {recsLoading ? "Generating..." : "Refresh recommendations"}
            </GhostButton>
          </Card>
        </FadeIn>

        {/* Current Routine */}
        <FadeIn delay={0.15} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 font-light">Your routine</h2>
              <Link href="/products" className="text-accent text-sm hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {productsError ? (
              <SectionError
                label="routine"
                onRetry={() => userId && loadProducts(userId)}
              />
            ) : currentProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} className="text-muted/40 mx-auto mb-3" />
                <p className="text-sm text-muted font-[family-name:var(--font-body)]">
                  No products in your current routine yet.
                </p>
                <Link href="/products">
                  <GhostButton size="sm" variant="outline" className="mt-3">
                    Add your first product
                  </GhostButton>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {currentProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-background/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.product_name}</p>
                      <p className="text-xs text-muted font-[family-name:var(--font-body)]">
                        {p.brand} &middot; {p.category}
                      </p>
                    </div>
                    <RatingIcon rating={p.rating} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </FadeIn>

        {/* Recommendations Preview */}
        <FadeIn delay={0.25}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-accent" />
              <h2 className="text-h3 font-light">suki. suggests</h2>
            </div>
            {recsError ? (
              <SectionError
                label="recommendations"
                onRetry={() => userId && loadRecs(userId)}
              />
            ) : topRecs.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted font-[family-name:var(--font-body)] mb-3">
                  No recommendations yet. Hit refresh to generate!
                </p>
                <GhostButton
                  size="sm"
                  variant="outline"
                  onClick={refreshRecs}
                  disabled={recsLoading}
                >
                  Generate
                </GhostButton>
              </div>
            ) : (
              <div className="space-y-3">
                {topRecs.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-card-border bg-background/50"
                  >
                    <p className="text-sm font-medium">
                      {r.product_suggestion.name}
                    </p>
                    <p className="text-xs text-muted font-[family-name:var(--font-body)]">
                      {r.product_suggestion.brand}
                    </p>
                  </div>
                ))}
                <Link href="/recommendations">
                  <GhostButton size="sm" variant="ghost" className="w-full mt-2">
                    View all recommendations
                    <ArrowRight size={14} />
                  </GhostButton>
                </Link>
              </div>
            )}
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

function SectionError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
      <p className="text-sm text-red-600 font-[family-name:var(--font-body)]">
        Couldn&apos;t load {label}.
      </p>
      <GhostButton size="sm" variant="outline" onClick={onRetry}>
        Retry
      </GhostButton>
    </div>
  );
}

function RatingIcon({ rating }: { rating: string }) {
  switch (rating) {
    case "love":
      return <Heart size={16} className="text-accent fill-accent" />;
    case "neutral":
      return <Meh size={16} className="text-muted" />;
    case "bad_reaction":
      return <AlertTriangle size={16} className="text-red-400" />;
    default:
      return null;
  }
}
