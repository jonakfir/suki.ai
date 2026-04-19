"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearAdminSession, isAdminSession, ADMIN_USER_ID, ADMIN_NAME } from "@/lib/admin";
import { useStore, UserProduct, PreferenceMode } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import {
  User,
  DollarSign,
  Minimize2,
  Crown,
  Star,
  Package,
  Settings,
  LogOut,
  ArrowRight,
  Bell,
  BellOff,
  Camera,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  isNative,
  scheduleRoutineReminders,
  cancelRoutineReminders,
  hasScheduledReminders,
} from "@/lib/notifications";

type PrefOption = {
  value: PreferenceMode;
  label: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const PREF_OPTIONS: PrefOption[] = [
  { value: "budget",            label: "Budget",           sub: "Drugstore & under $25", icon: DollarSign },
  { value: "simple",            label: "Simple",           sub: "Minimal routines",      icon: Minimize2 },
  { value: "high_end",          label: "High-End",         sub: "Premium brands",        icon: Crown },
  { value: "most_recommended",  label: "Most Recommended", sub: "Community favorites",   icon: Star },
];

export default function MePage() {
  const router = useRouter();
  const supabase = createClient();
  const {
    profile, setProfile, products, setProducts, resetUserData,
  } = useStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [native, setNative] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

      const profRes = await supabase
        .from("users_profile")
        .select("*")
        .eq("user_id", uid)
        .single();
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
        });
      }
      const prodRes = await supabase
        .from("user_products")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (!prodRes.error && !cancelled) {
        setProducts((prodRes.data ?? []) as UserProduct[]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect Capacitor + existing reminder schedule on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      const n = isNative();
      if (!alive) return;
      setNative(n);
      if (!n) return;
      const has = await hasScheduledReminders();
      if (alive) setRemindersOn(has);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggleReminders = async () => {
    setRemindersBusy(true);
    setRemindersError(null);
    try {
      if (remindersOn) {
        await cancelRoutineReminders();
        setRemindersOn(false);
      } else {
        const res = await scheduleRoutineReminders();
        if (res.scheduled) {
          setRemindersOn(true);
        } else {
          setRemindersError(res.error ?? "Could not enable reminders");
        }
      }
    } catch (e) {
      setRemindersError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemindersBusy(false);
    }
  };

  const setPreferenceMode = async (m: PreferenceMode) => {
    if (!userId) return;
    const previous = profile.preference_mode ?? "most_recommended";
    setProfile({ preference_mode: m });
    setSavingPref(true);
    try {
      const res = await fetch("/api/profile/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "suki-web",
        },
        body: JSON.stringify({ mode: m }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("preference_mode update failed:", body?.error);
        // Roll back the optimistic UI change.
        setProfile({ preference_mode: previous as PreferenceMode });
      }
    } catch (e) {
      console.error("preference_mode request failed:", e);
      setProfile({ preference_mode: previous as PreferenceMode });
    } finally {
      setSavingPref(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    let accountDeleted = false;
    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: { "x-requested-with": "suki-web" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      accountDeleted = true;
    } catch (e) {
      setDeleteError(
        e instanceof Error
          ? e.message
          : "Something went wrong. If your account was partially deleted, please contact support."
      );
      setDeleting(false);
      return;
    }

    // Best-effort local cleanup — never block the redirect on these.
    try {
      await clearAdminSession();
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
    resetUserData();

    if (accountDeleted) {
      router.push("/");
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await clearAdminSession();
      await supabase.auth.signOut();
      resetUserData();
      router.push("/");
    } catch (e) {
      console.error("sign out failed", e);
      setSigningOut(false);
    }
  };

  const counts = {
    skincare: products.filter((p) => !isHair(p.category) && !isMakeup(p.category)).length,
    haircare: products.filter((p) => isHair(p.category)).length,
    makeup:   products.filter((p) => isMakeup(p.category)).length,
  };

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-3xl mx-auto">
      <FadeIn>
        <p className="text-xs text-muted uppercase tracking-widest">Your profile</p>
        <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">
          {userName}
        </h1>
        {email && <p className="text-sm text-muted">{email}</p>}
      </FadeIn>

      <FadeIn delay={0.08}>
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Preference mode</h2>
            {savingPref && <span className="text-xs text-muted">saving…</span>}
          </div>
          <p className="text-xs text-muted mb-4">
            Tunes every recommendation — cheapest, simplest, most premium, or
            most recommended by others.
          </p>
          <div className="grid grid-cols-2 gap-2">
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
        </Card>
      </FadeIn>

      {native && (
        <FadeIn delay={0.1}>
          <Card className="mt-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {remindersOn ? (
                    <Bell size={15} className="text-accent-deep" />
                  ) : (
                    <BellOff size={15} className="text-muted" />
                  )}
                  Routine reminders
                </div>
                <p className="text-xs text-muted mt-1">
                  Daily nudges at 8:00 AM and 9:30 PM. Tap to open your routine.
                </p>
                {remindersError && (
                  <p className="text-xs text-red-500 mt-1 break-all">
                    {remindersError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={toggleReminders}
                disabled={remindersBusy}
                aria-pressed={remindersOn}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                  remindersOn ? "bg-accent" : "bg-[var(--card-border)]"
                } ${remindersBusy ? "opacity-60" : ""}`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    remindersOn ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={0.11}>
        <Link href="/progress" className="block mt-4">
          <Card className="p-5 flex items-center gap-3 hover:border-accent/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Camera size={16} className="text-accent-deep" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Progress timeline</div>
              <p className="text-xs text-muted">
                Weekly photos + side-by-side comparisons.
              </p>
            </div>
            <ArrowRight size={14} className="text-muted" />
          </Card>
        </Link>
      </FadeIn>

      <FadeIn delay={0.12}>
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">My collection</h2>
            <Link
              href="/products"
              className="text-xs text-accent-deep hover:text-accent flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <CollectionStat label="Skin"   count={counts.skincare} href="/skin" />
            <CollectionStat label="Hair"   count={counts.haircare} href="/hair" />
            <CollectionStat label="Makeup" count={counts.makeup}   href="/makeup" />
          </div>
        </Card>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card className="mt-4 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User size={15} /> Skin profile
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {profile.skin_type && <Pill>{profile.skin_type}</Pill>}
            {profile.skin_tone && <Pill>tone: {profile.skin_tone}</Pill>}
            {profile.age_range && <Pill>{profile.age_range}</Pill>}
            {profile.routine_complexity && <Pill>{profile.routine_complexity}</Pill>}
            {(profile.skin_concerns ?? []).slice(0, 4).map((c) => (
              <Pill key={c}>{c}</Pill>
            ))}
          </div>
          {profile.hair_type && (
            <>
              <div className="h-px bg-[var(--card-border)]" />
              <div className="flex flex-wrap gap-2 text-xs">
                <Pill>hair: {profile.hair_type}</Pill>
                {profile.hair_texture && <Pill>{profile.hair_texture}</Pill>}
                {profile.is_color_treated && <Pill>color-treated</Pill>}
                {(profile.hair_concerns ?? []).slice(0, 3).map((c) => (
                  <Pill key={c}>{c}</Pill>
                ))}
              </div>
            </>
          )}
          {profile.undertone && (
            <>
              <div className="h-px bg-[var(--card-border)]" />
              <div className="flex flex-wrap gap-2 text-xs">
                <Pill>undertone: {profile.undertone}</Pill>
                {profile.makeup_style && <Pill>{profile.makeup_style}</Pill>}
                {profile.coverage_preference && <Pill>{profile.coverage_preference} coverage</Pill>}
                {profile.finish_preference && <Pill>{profile.finish_preference}</Pill>}
              </div>
            </>
          )}
          <Link href="/profile" className="block pt-2">
            <GhostButton size="sm" variant="outline" as="span">
              <Settings size={14} />
              <span className="ml-1">Edit profile</span>
            </GhostButton>
          </Link>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="mt-4 p-5 space-y-3">
          <h2 className="text-sm font-medium">Account</h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center justify-between w-full text-sm text-foreground hover:text-accent-deep px-3 py-2.5 rounded-lg border border-[var(--card-border)] bg-card/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <LogOut size={15} /> {signingOut ? "Signing out…" : "Sign out"}
              </span>
              <ArrowRight size={14} className="text-muted" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="flex items-center justify-between w-full text-sm text-red-600 hover:text-red-700 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50"
            >
              <span className="flex items-center gap-2">
                <Trash2 size={15} /> Delete my account
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
          <p className="text-xs text-muted">
            Deleting is permanent — your profile, products, routine,
            recommendations, and progress photos are removed.
          </p>
        </Card>
        <div className="mt-4 flex justify-center">

          <Modal
            open={deleteOpen}
            onClose={() => {
              if (!deleting) setDeleteOpen(false);
            }}
            title="Delete your account?"
          >
            <form
              className="space-y-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                handleDelete();
              }}
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
              {/* Primary destructive action sits RIGHT under the input so
                  the iOS keyboard never covers it (keyboard grows from bottom;
                  this stays in the scroll-into-view region). */}
              <button
                type="submit"
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="w-full py-3 rounded-full bg-red-500 text-white text-base font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </FadeIn>

      {loading && (
        <p className="text-xs text-muted mt-4 text-center">loading…</p>
      )}
    </div>
  );
}

function CollectionStat({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-[var(--card-border)] bg-card/60 px-2 py-3 hover:border-accent/30 transition-colors"
    >
      <div className="flex items-center justify-center gap-1 text-muted mb-0.5">
        <Package size={12} />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-h3 font-light">{count}</div>
    </Link>
  );
}

function isHair(cat: string): boolean {
  return [
    "shampoo","conditioner","hair_mask","hair_oil","hair_styling",
    "scalp_treatment","heat_protectant","leave_in",
  ].includes(cat);
}

function isMakeup(cat: string): boolean {
  return [
    "foundation","concealer","powder","blush","bronzer","highlighter",
    "lipstick","lip_gloss","lip_liner","eyeshadow","eyeliner","mascara",
    "brow","primer","setting_spray","makeup_remover",
  ].includes(cat);
}
