"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  clearAdminSession,
  isAdminSession,
  ADMIN_USER_ID,
  ADMIN_NAME,
} from "@/lib/admin";
import {
  useStore,
  type UserProduct,
  type PreferenceMode,
} from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Modal } from "@/components/ui/Modal";
import { ProductCard } from "@/components/domain/ProductCard";
import { ProductDetail } from "@/components/domain/ProductDetail";
import {
  DollarSign,
  Minimize2,
  Crown,
  Star,
  Settings,
  LogOut,
  ArrowRight,
  Trash2,
  BookOpen,
  Camera,
  Sun,
  Moon,
  Plus,
  Sparkles,
} from "lucide-react";

type Domain = "skincare" | "haircare" | "makeup";
type TimeOfDay = "morning" | "evening" | "weekly";

interface RoutineStep {
  id: string;
  time_of_day: TimeOfDay;
  position: number;
  domain: Domain;
  product_id: string | null;
  step_name: string | null;
}

const HAIR_CATS = new Set([
  "shampoo", "conditioner", "hair_mask", "hair_oil", "hair_styling",
  "scalp_treatment", "heat_protectant", "leave_in",
]);
const MAKEUP_CATS = new Set([
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter",
  "lipstick", "lip_gloss", "lip_liner", "eyeshadow", "eyeliner", "mascara",
  "brow", "primer", "setting_spray", "makeup_remover",
]);

function domainOf(p: UserProduct): Domain {
  if (p.domain) return p.domain;
  if (HAIR_CATS.has(p.category)) return "haircare";
  if (MAKEUP_CATS.has(p.category)) return "makeup";
  return "skincare";
}

const PREF_OPTIONS: { value: PreferenceMode; label: string; sub: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "budget",            label: "Budget",           sub: "Drugstore & under $25", icon: DollarSign },
  { value: "simple",            label: "Simple",           sub: "Minimal routines",      icon: Minimize2 },
  { value: "high_end",          label: "High-End",         sub: "Premium brands",        icon: Crown },
  { value: "most_recommended",  label: "Most Recommended", sub: "Community favorites",   icon: Star },
];

export default function MePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { profile, setProfile, products, setProducts, resetUserData } = useStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [tab, setTab] = useState<Domain>("skincare");
  const [loading, setLoading] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<UserProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      const admin = await isAdminSession();
      let uid: string | null = null;
      if (supaUser) {
        await clearAdminSession();
        uid = supaUser.id;
        const fullName = supaUser.user_metadata?.full_name as string | undefined;
        setUserName(fullName || supaUser.email?.split("@")[0] || "You");
        setEmail(supaUser.email ?? null);
      } else if (admin) {
        uid = ADMIN_USER_ID;
        setUserName(ADMIN_NAME);
      } else {
        router.push("/auth");
        return;
      }
      if (cancelled) return;
      setUserId(uid);
      resetUserData();

      const [profRes, prodRes, stepsRes] = await Promise.all([
        supabase.from("users_profile").select("*").eq("user_id", uid).single(),
        supabase.from("user_products").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("user_routine_steps").select("*").eq("user_id", uid).order("position", { ascending: true }),
      ]);

      if (profRes.data && !cancelled) {
        const p = profRes.data;
        setProfile({
          skin_type: p.skin_type,
          skin_concerns: p.skin_concerns || [],
          skin_tone: p.skin_tone,
          age_range: p.age_range,
          known_allergies: p.known_allergies || [],
          budget: p.budget,
          routine_complexity: p.routine_complexity,
          hair_type: p.hair_type ?? null,
          hair_texture: p.hair_texture ?? null,
          hair_porosity: p.hair_porosity ?? null,
          hair_concerns: p.hair_concerns ?? [],
          hair_goals: p.hair_goals ?? [],
          is_color_treated: p.is_color_treated ?? false,
          makeup_style: p.makeup_style ?? null,
          coverage_preference: p.coverage_preference ?? null,
          finish_preference: p.finish_preference ?? null,
          undertone: p.undertone ?? null,
          preference_mode: p.preference_mode ?? "most_recommended",
          username: p.username ?? null,
          is_public: p.is_public ?? true,
        });
      }
      if (!prodRes.error && !cancelled) {
        setProducts((prodRes.data ?? []) as UserProduct[]);
      }
      if (!stepsRes.error && !cancelled) {
        setSteps((stepsRes.data ?? []) as RoutineStep[]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDomain: Record<Domain, UserProduct[]> = useMemo(() => {
    const m: Record<Domain, UserProduct[]> = { skincare: [], haircare: [], makeup: [] };
    for (const p of products) m[domainOf(p)].push(p);
    return m;
  }, [products]);

  const morningSteps = steps.filter((s) => s.time_of_day === "morning");
  const eveningSteps = steps.filter((s) => s.time_of_day === "evening");

  // For makeup: split day vs night by routine step time_of_day; non-routine -> Day
  const makeupTimeByProduct = useMemo(() => {
    const m = new Map<string, "morning" | "evening">();
    for (const s of steps) {
      if (s.product_id && (s.time_of_day === "morning" || s.time_of_day === "evening")) {
        if (!m.has(s.product_id)) m.set(s.product_id, s.time_of_day);
      }
    }
    return m;
  }, [steps]);

  const makeupDay = byDomain.makeup.filter(
    (p) => (makeupTimeByProduct.get(p.id) ?? "morning") === "morning"
  );
  const makeupNight = byDomain.makeup.filter(
    (p) => makeupTimeByProduct.get(p.id) === "evening"
  );

  async function setPreferenceMode(m: PreferenceMode) {
    if (!userId) return;
    const previous = profile.preference_mode ?? "most_recommended";
    setProfile({ preference_mode: m });
    setSavingPref(true);
    try {
      const res = await fetch("/api/profile/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "suki-web" },
        body: JSON.stringify({ mode: m }),
      });
      if (!res.ok) setProfile({ preference_mode: previous as PreferenceMode });
    } catch {
      setProfile({ preference_mode: previous as PreferenceMode });
    } finally {
      setSavingPref(false);
    }
  }

  async function togglePrivacy() {
    const next = !(profile.is_public ?? true);
    setProfile({ is_public: next });
    setSavingPrivacy(true);
    try {
      const res = await fetch("/api/profile/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: next }),
      });
      if (!res.ok) setProfile({ is_public: !next });
    } catch {
      setProfile({ is_public: !next });
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await clearAdminSession();
      await supabase.auth.signOut();
      resetUserData();
      router.push("/");
    } catch {
      setSigningOut(false);
    }
  }

  async function handleDelete() {
    if (deleting || deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: { "x-requested-with": "suki-web" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Something went wrong.");
      setDeleting(false);
      return;
    }
    try { await clearAdminSession(); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    resetUserData();
    router.push("/");
  }

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-3xl mx-auto">
      <FadeIn>
        <p className="text-xs text-muted uppercase tracking-widest">Your profile</p>
        <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">{userName}</h1>
        {email && <p className="text-sm text-muted">{email}</p>}
        {profile.username && (
          <p className="text-sm text-accent-deep mt-1">
            <Link href={`/profile/${profile.username}`} className="hover:underline">
              @{profile.username}
            </Link>
          </p>
        )}
      </FadeIn>

      {/* Sub-tab nav */}
      <div className="mt-6 flex gap-2 border-b border-[var(--card-border)]">
        {(["skincare", "haircare", "makeup"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setTab(d)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors capitalize ${
              tab === d
                ? "border-accent text-accent-deep font-medium"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {d === "haircare" ? "Hair" : d === "makeup" ? "Makeup" : "Skincare"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        <div className="flex justify-end mb-3">
          <Link
            href={`/products?domain=${tab}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent-deep transition-colors"
          >
            <Plus size={14} />
            Add product
          </Link>
        </div>
        {tab === "skincare" && (
          <div className="space-y-4">
            <RoutineList title="Morning" icon={<Sun size={14} className="text-[var(--gold)]" />} steps={morningSteps} products={products} />
            <RoutineList title="Night"   icon={<Moon size={14} className="text-[var(--lavender)]" />} steps={eveningSteps} products={products} />
            <ProductGrid items={byDomain.skincare} domain="skincare" onPick={setActiveProduct} />
          </div>
        )}
        {tab === "haircare" && (
          <ProductGrid items={byDomain.haircare} domain="haircare" onPick={setActiveProduct} />
        )}
        {tab === "makeup" && (
          <div className="space-y-4">
            <Section title="Day">
              <ProductGrid items={makeupDay} domain="makeup" onPick={setActiveProduct} />
            </Section>
            <Section title="Night">
              <ProductGrid items={makeupNight} domain="makeup" onPick={setActiveProduct} />
            </Section>
          </div>
        )}
      </div>

      <ProductDetail
        product={activeProduct}
        open={!!activeProduct}
        onClose={() => setActiveProduct(null)}
      />

      {/* Preferences */}
      <FadeIn delay={0.05}>
        <Card className="mt-8 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">My Preferences</h2>
            {savingPref && <span className="text-xs text-muted">saving…</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PREF_OPTIONS.map((o) => {
              const active = (profile.preference_mode ?? "most_recommended") === o.value;
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPreferenceMode(o.value)}
                  className={`text-left rounded-xl px-3 py-3 border transition-all duration-200 ${
                    active
                      ? "bg-accent/15 border-accent/40 text-accent-deep"
                      : "bg-card/60 border-[var(--card-border)] text-foreground hover:border-accent/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} />
                    <span className="text-sm font-medium">{o.label}</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">{o.sub}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {profile.skin_type && <Pill>{profile.skin_type}</Pill>}
            {profile.routine_complexity && <Pill>{profile.routine_complexity}</Pill>}
            {profile.budget && <Pill>{profile.budget}</Pill>}
            {(profile.skin_concerns ?? []).slice(0, 4).map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
            {(profile.known_allergies ?? []).slice(0, 3).map((c) => (
              <Pill key={`a-${c}`}>allergy: {c}</Pill>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Public profile</div>
              <p className="text-xs text-muted">
                {profile.is_public === false
                  ? "Hidden from feed and search."
                  : "Visible to followers and discoverable."}
              </p>
            </div>
            <button
              type="button"
              onClick={togglePrivacy}
              disabled={savingPrivacy}
              aria-pressed={profile.is_public !== false}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                profile.is_public !== false ? "bg-accent" : "bg-[var(--card-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  profile.is_public !== false ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <Link href="/profile" className="block pt-4">
            <GhostButton size="sm" variant="outline" as="span">
              <Settings size={14} />
              <span className="ml-1">Edit full profile</span>
            </GhostButton>
          </Link>
        </Card>
      </FadeIn>

      {/* Quick links */}
      <FadeIn delay={0.08}>
        <Link href="/progress" className="block mt-4">
          <Card className="p-5 flex items-center gap-3 hover:border-accent/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Camera size={16} className="text-accent-deep" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Progress timeline</div>
              <p className="text-xs text-muted">Weekly photos + side-by-side comparisons.</p>
            </div>
            <ArrowRight size={14} className="text-muted" />
          </Card>
        </Link>
        <Link href="/me/wiki" className="block mt-4">
          <Card className="p-5 flex items-center gap-3 hover:border-accent/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <BookOpen size={16} className="text-accent-deep" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Your Beauty Wiki</div>
              <p className="text-xs text-muted">Auto-maintained notes on your skin & products.</p>
            </div>
            <ArrowRight size={14} className="text-muted" />
          </Card>
        </Link>
        <Link href="/skin-profile" className="block mt-4">
          <Card className="p-5 flex items-center gap-3 hover:border-accent/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-accent-deep" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">View your skin profile</div>
              <p className="text-xs text-muted">AI observations from your selfie — never medical advice.</p>
            </div>
            <ArrowRight size={14} className="text-muted" />
          </Card>
        </Link>
      </FadeIn>

      {/* Danger zone */}
      <FadeIn delay={0.12}>
        <Card className="mt-8 p-4 opacity-90">
          <h2 className="text-xs uppercase tracking-wider text-muted mb-3">Danger zone</h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center justify-between w-full text-sm text-foreground hover:text-accent-deep px-3 py-2 rounded-lg border border-[var(--card-border)] disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <LogOut size={14} /> {signingOut ? "Signing out…" : "Sign out"}
              </span>
              <ArrowRight size={12} className="text-muted" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="flex items-center justify-between w-full text-xs text-red-600 hover:text-red-700 px-3 py-2 rounded-lg border border-red-200/50 bg-red-50/30"
            >
              <span className="flex items-center gap-2">
                <Trash2 size={12} /> Delete my account
              </span>
              <ArrowRight size={12} />
            </button>
          </div>
        </Card>

        <Modal
          open={deleteOpen}
          onClose={() => { if (!deleting) setDeleteOpen(false); }}
          title="Delete your account?"
        >
          <form
            className="space-y-3 text-sm"
            onSubmit={(e) => { e.preventDefault(); handleDelete(); }}
          >
            <p>
              This removes your profile, products, routine, recommendations,
              and progress photos. Can&apos;t be undone.
            </p>
            <label className="block text-muted text-xs">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              className="w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-red-400/40"
              autoFocus
            />
            <button
              type="submit"
              disabled={deleting || deleteConfirm !== "DELETE"}
              className="w-full py-3 rounded-full bg-red-500 text-white text-base font-semibold hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </button>
            {deleteError && (
              <p className="text-xs text-red-500 break-all text-center">{deleteError}</p>
            )}
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="w-full text-sm text-muted hover:text-foreground py-2"
            >
              Cancel
            </button>
          </form>
        </Modal>
      </FadeIn>

      {loading && <p className="text-xs text-muted mt-4 text-center">loading…</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-muted mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ProductGrid({
  items,
  domain,
  onPick,
}: {
  items: UserProduct[];
  domain?: Domain;
  onPick: (p: UserProduct) => void;
}) {
  if (!items.length) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted mb-3">No products logged yet.</p>
        <Link
          href={domain ? `/products?domain=${domain}` : "/products"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <Plus size={14} />
          Add your first product
        </Link>
      </Card>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} onClick={() => onPick(p)} />
        </li>
      ))}
    </ul>
  );
}

function RoutineList({
  title,
  icon,
  steps,
  products,
}: {
  title: string;
  icon: React.ReactNode;
  steps: RoutineStep[];
  products: UserProduct[];
}) {
  if (!steps.length) return null;
  const byId = new Map(products.map((p) => [p.id, p]));
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider text-muted">{title}</span>
      </div>
      <ul className="space-y-1">
        {steps.map((s) => {
          const product = s.product_id ? byId.get(s.product_id) : undefined;
          const text = s.step_name || product?.product_name || s.domain;
          return (
            <li key={s.id} className="text-sm px-1 py-1 truncate">
              {text}
              {product?.brand && <span className="text-muted"> · {product.brand}</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
