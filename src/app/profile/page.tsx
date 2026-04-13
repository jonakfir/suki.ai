"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession, clearAdminSession, ADMIN_USER_ID } from "@/lib/admin";
import { useRouter } from "next/navigation";
import {
  useStore,
  SkinType,
  SkinTone,
  AgeRange,
  Budget,
  RoutineComplexity,
} from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Save, RefreshCw, LogOut } from "lucide-react";

const skinTypes: SkinType[] = ["oily", "dry", "combination", "normal", "sensitive"];
const tones: SkinTone[] = ["fair", "light", "medium", "tan", "deep"];
const ageRanges: AgeRange[] = ["teens", "20s", "30s", "40s", "50+"];
const budgets: Budget[] = ["drugstore", "mid-range", "luxury", "mixed"];
const complexities: RoutineComplexity[] = ["minimal", "moderate", "full"];
const concerns = [
  "acne", "hyperpigmentation", "redness", "aging", "dullness",
  "large pores", "dark circles", "dehydration", "texture", "sun damage",
];
const commonAllergies = [
  "Fragrance", "Niacinamide", "Retinol", "Salicylic acid",
  "Vitamin C", "AHA/BHA", "Essential oils", "Alcohol",
];

export default function ProfilePage() {
  const { profile, setProfile } = useStore();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const admin = await isAdminSession();
      let userId: string | null = null;

      if (admin) {
        userId = ADMIN_USER_ID;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
      }

      const { data } = await supabase
        .from("users_profile")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (data) {
        setProfile({
          skin_type: data.skin_type,
          skin_concerns: data.skin_concerns || [],
          skin_tone: data.skin_tone,
          age_range: data.age_range,
          known_allergies: data.known_allergies || [],
          budget: data.budget,
          routine_complexity: data.routine_complexity,
        });
        setAllergies(data.known_allergies || []);
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleConcern = (c: string) => {
    const current = profile.skin_concerns;
    setProfile({
      skin_concerns: current.includes(c)
        ? current.filter((x) => x !== c)
        : [...current, c],
    });
  };

  const toggleAllergy = (a: string) => {
    setAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const admin = await isAdminSession();
    const payload = {
      skin_type: profile.skin_type,
      skin_concerns: profile.skin_concerns,
      skin_tone: profile.skin_tone,
      age_range: profile.age_range,
      known_allergies: allergies,
      budget: profile.budget,
      routine_complexity: profile.routine_complexity,
    };

    let ok = false;
    if (admin) {
      const res = await fetch("/api/auth/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      ok = res.ok;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("users_profile")
          .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });
        ok = !error;
      }
    }

    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await clearAdminSession();
    await supabase.auth.signOut();
    useStore.getState().resetUserData();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <FadeIn>
        <h1 className="text-2xl sm:text-3xl font-light mb-1">Profile settings</h1>
        <p className="text-sm text-muted font-[family-name:var(--font-body)] mb-6 sm:mb-8">
          Update your skin profile. Changes may affect your recommendations.
        </p>
      </FadeIn>

      <div className="space-y-4 sm:space-y-6">
        {/* Skin Type */}
        <FadeIn delay={0.05}>
          <Card>
            <h2 className="text-lg font-light mb-4">Skin type</h2>
            <div className="flex flex-wrap gap-2">
              {skinTypes.map((st) => (
                <button
                  key={st}
                  onClick={() => setProfile({ skin_type: st })}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                    profile.skin_type === st
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-background text-muted border border-border hover:border-accent/30"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </Card>
        </FadeIn>

        {/* Skin Concerns */}
        <FadeIn delay={0.1}>
          <Card>
            <h2 className="text-lg font-light mb-4">Skin concerns</h2>
            <div className="flex flex-wrap gap-2">
              {concerns.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleConcern(c)}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer capitalize ${
                    profile.skin_concerns.includes(c)
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-background text-muted border border-border hover:border-accent/30"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>
        </FadeIn>

        {/* Tone + Age */}
        <FadeIn delay={0.15}>
          <Card>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-light mb-3">Skin tone</h2>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      onClick={() => setProfile({ skin_tone: t })}
                      className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                        profile.skin_tone === t
                          ? "bg-accent/15 text-accent border border-accent/30"
                          : "bg-background text-muted border border-border hover:border-accent/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-light mb-3">Age range</h2>
                <div className="flex flex-wrap gap-2">
                  {ageRanges.map((a) => (
                    <button
                      key={a}
                      onClick={() => setProfile({ age_range: a })}
                      className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                        profile.age_range === a
                          ? "bg-accent/15 text-accent border border-accent/30"
                          : "bg-background text-muted border border-border hover:border-accent/30"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Allergies */}
        <FadeIn delay={0.2}>
          <Card>
            <h2 className="text-lg font-light mb-4">Allergies & sensitivities</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {commonAllergies.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAllergy(a)}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                    allergies.includes(a)
                      ? "bg-red-50 text-red-500 border border-red-200"
                      : "bg-background text-muted border border-border hover:border-accent/30"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2 w-full sm:max-w-sm">
              <input
                type="text"
                placeholder="Add another..."
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = customAllergy.trim();
                    if (trimmed && !allergies.includes(trimmed)) {
                      setAllergies((prev) => [...prev, trimmed]);
                      setCustomAllergy("");
                    }
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </Card>
        </FadeIn>

        {/* Budget + Complexity */}
        <FadeIn delay={0.25}>
          <Card>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-light mb-3">Budget</h2>
                <div className="flex flex-wrap gap-2">
                  {budgets.map((b) => (
                    <button
                      key={b}
                      onClick={() => setProfile({ budget: b })}
                      className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                        profile.budget === b
                          ? "bg-accent/15 text-accent border border-accent/30"
                          : "bg-background text-muted border border-border hover:border-accent/30"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-light mb-3">Routine complexity</h2>
                <div className="flex flex-wrap gap-2">
                  {complexities.map((c) => (
                    <button
                      key={c}
                      onClick={() => setProfile({ routine_complexity: c })}
                      className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                        profile.routine_complexity === c
                          ? "bg-accent/15 text-accent border border-accent/30"
                          : "bg-background text-muted border border-border hover:border-accent/30"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Actions */}
        <FadeIn delay={0.3}>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-4">
            <GhostButton variant="ghost" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut size={16} />
              Sign out
            </GhostButton>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {saved && (
                <span className="text-xs sm:text-sm text-accent text-center sm:text-left font-[family-name:var(--font-body)]">
                  Profile saved! Consider refreshing recommendations.
                </span>
              )}
              <GhostButton
                variant="filled"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save changes"}
              </GhostButton>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
