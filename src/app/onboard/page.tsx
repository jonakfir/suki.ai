"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession, ADMIN_USER_ID } from "@/lib/admin";
import { useStore } from "@/lib/store";
import { GhostButton } from "@/components/ui/GhostButton";
import { Logo } from "@/components/ui/Logo";
import {
  SkinType,
  SkinTone,
  AgeRange,
  Budget,
  RoutineComplexity,
} from "@/lib/store";
import {
  Droplets,
  Sun,
  Layers,
  CircleDot,
  ShieldAlert,
  Sparkles,
  Palette,
  Calendar,
  Wallet,
  Clock,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const TOTAL_STEPS = 6;

const skinTypes: { value: SkinType; label: string; icon: typeof Droplets; description: string }[] = [
  { value: "oily", label: "Oily", icon: Droplets, description: "Shiny by midday, visible pores, prone to breakouts" },
  { value: "dry", label: "Dry", icon: Sun, description: "Tight, flaky, sometimes rough — needs constant moisture" },
  { value: "combination", label: "Combination", icon: Layers, description: "Oily T-zone, dry cheeks — the best of both worlds" },
  { value: "normal", label: "Normal", icon: CircleDot, description: "Balanced, rarely breaks out, low maintenance" },
  { value: "sensitive", label: "Sensitive", icon: ShieldAlert, description: "Reacts easily, redness-prone, needs gentle formulas" },
];

const concerns = [
  "Acne", "Hyperpigmentation", "Redness", "Aging", "Dullness",
  "Large pores", "Dark circles", "Dehydration", "Texture", "Sun damage",
];

const tones: { value: SkinTone; label: string }[] = [
  { value: "fair", label: "Fair" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "tan", label: "Tan" },
  { value: "deep", label: "Deep" },
];

const ageRanges: { value: AgeRange; label: string }[] = [
  { value: "teens", label: "Teens" },
  { value: "20s", label: "20s" },
  { value: "30s", label: "30s" },
  { value: "40s", label: "40s" },
  { value: "50+", label: "50+" },
];

const commonAllergies = [
  "Fragrance", "Niacinamide", "Retinol", "Salicylic acid",
  "Vitamin C", "AHA/BHA", "Essential oils", "Alcohol",
];

const budgets: { value: Budget; label: string; description: string }[] = [
  { value: "drugstore", label: "Drugstore", description: "Under $20 per product" },
  { value: "mid-range", label: "Mid-range", description: "$20-50 per product" },
  { value: "luxury", label: "Luxury", description: "$50+ per product" },
  { value: "mixed", label: "Mixed", description: "Depends on the product" },
];

const complexities: { value: RoutineComplexity; label: string; description: string }[] = [
  { value: "minimal", label: "Keep it simple", description: "3-4 steps max — cleanser, moisturizer, SPF" },
  { value: "moderate", label: "Middle ground", description: "5-7 steps — room for serums and treatments" },
  { value: "full", label: "Full ritual", description: "8+ steps — I love a thorough routine" },
];

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const { profile, setProfile } = useStore();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const resetUserData = useStore((s) => s.resetUserData);

  // Start fresh — never carry over a previous session's profile answers
  useEffect(() => {
    resetUserData();
    setAllergies([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const toggleConcern = (c: string) => {
    const lower = c.toLowerCase();
    const current = profile.skin_concerns;
    setProfile({
      skin_concerns: current.includes(lower)
        ? current.filter((x) => x !== lower)
        : [...current, lower],
    });
  };

  const toggleAllergy = (a: string) => {
    setAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies((prev) => [...prev, trimmed]);
      setCustomAllergy("");
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const admin = isAdminSession();

      const profilePayload = {
        skin_type: profile.skin_type,
        skin_concerns: profile.skin_concerns,
        skin_tone: profile.skin_tone,
        age_range: profile.age_range,
        known_allergies: allergies,
        budget: profile.budget,
        routine_complexity: profile.routine_complexity,
      };

      if (admin) {
        const res = await fetch("/api/auth/admin/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Save failed (${res.status})`);
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }
        const { error } = await supabase
          .from("users_profile")
          .upsert({ user_id: user.id, ...profilePayload }, { onConflict: "user_id" });
        if (error) throw error;
      }

      fetch("/api/recommendations", { method: "POST" }).catch(() => {});
      router.push("/dashboard");
    } catch (err) {
      const e = err as { message?: string; code?: string; details?: string; hint?: string };
      const msg = e?.message || e?.details || e?.hint || (err instanceof Error ? err.message : JSON.stringify(err));
      console.error("Failed to save profile:", { message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, raw: err });
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-[calc(100svh-7rem)] flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
      <Logo className="text-2xl sm:text-3xl mb-6 sm:mb-8" />

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8 sm:mb-12">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted mt-2 text-center font-[family-name:var(--font-body)]">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="w-full max-w-lg pb-24 sm:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            {/* Step 1: Skin Type */}
            {step === 1 && (
              <div>
                <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                  What&apos;s your skin type?
                </h2>
                <p className="text-sm text-muted text-center mb-8 font-[family-name:var(--font-body)]">
                  Choose the one that best describes your skin on most days.
                </p>
                <div className="space-y-3">
                  {skinTypes.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => setProfile({ skin_type: st.value })}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                        profile.skin_type === st.value
                          ? "border-accent bg-accent/5 shadow-[0_4px_12px_rgba(126,184,232,0.15)]"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        profile.skin_type === st.value ? "bg-accent/15" : "bg-card"
                      }`}>
                        <st.icon size={18} className={profile.skin_type === st.value ? "text-accent" : "text-muted"} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{st.label}</p>
                        <p className="text-xs text-muted mt-0.5 font-[family-name:var(--font-body)]">{st.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Concerns */}
            {step === 2 && (
              <div>
                <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                  What are your skin concerns?
                </h2>
                <p className="text-sm text-muted text-center mb-8 font-[family-name:var(--font-body)]">
                  Select all that apply. suki. will tailor recommendations to these.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {concerns.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleConcern(c)}
                      className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                        profile.skin_concerns.includes(c.toLowerCase())
                          ? "bg-accent/15 text-accent border border-accent/30"
                          : "bg-card text-muted border border-card-border hover:border-accent/30"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Tone + Age */}
            {step === 3 && (
              <div className="space-y-10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                    <Palette size={20} className="inline mr-2 text-accent" />
                    Skin tone
                  </h2>
                  <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                    This helps suki. recommend products suited to your complexion.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {tones.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setProfile({ skin_tone: t.value })}
                        className={`px-5 py-2.5 rounded-full text-sm transition-all cursor-pointer ${
                          profile.skin_tone === t.value
                            ? "bg-accent/15 text-accent border border-accent/30"
                            : "bg-card text-muted border border-card-border hover:border-accent/30"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                    <Calendar size={20} className="inline mr-2 text-accent" />
                    Age range
                  </h2>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {ageRanges.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => setProfile({ age_range: a.value })}
                        className={`px-5 py-2.5 rounded-full text-sm transition-all cursor-pointer ${
                          profile.age_range === a.value
                            ? "bg-accent/15 text-accent border border-accent/30"
                            : "bg-card text-muted border border-card-border hover:border-accent/30"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Allergies */}
            {step === 4 && (
              <div>
                <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                  Any known allergies or sensitivities?
                </h2>
                <p className="text-sm text-muted text-center mb-8 font-[family-name:var(--font-body)]">
                  Select common ones or type your own. suki. will avoid these in recommendations.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {commonAllergies.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleAllergy(a)}
                      className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                        allergies.includes(a)
                          ? "bg-red-50 text-red-500 border border-red-200"
                          : "bg-card text-muted border border-card-border hover:border-accent/30"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    type="text"
                    placeholder="Add another..."
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomAllergy()}
                    className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <GhostButton size="sm" onClick={addCustomAllergy}>
                    Add
                  </GhostButton>
                </div>
                {allergies.filter((a) => !commonAllergies.includes(a)).length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {allergies
                      .filter((a) => !commonAllergies.includes(a))
                      .map((a) => (
                        <span
                          key={a}
                          className="px-3 py-1 rounded-full text-xs bg-red-50 text-red-500 border border-red-200"
                        >
                          {a}
                          <button
                            onClick={() => toggleAllergy(a)}
                            className="ml-1.5 hover:text-red-700"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Budget + Complexity */}
            {step === 5 && (
              <div className="space-y-10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                    <Wallet size={20} className="inline mr-2 text-accent" />
                    Budget preference
                  </h2>
                  <div className="space-y-3 mt-6">
                    {budgets.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setProfile({ budget: b.value })}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                          profile.budget === b.value
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/30"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">{b.label}</p>
                          <p className="text-xs text-muted font-[family-name:var(--font-body)]">{b.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-light text-center mb-2 px-2">
                    <Clock size={20} className="inline mr-2 text-accent" />
                    How complex do you want your routine?
                  </h2>
                  <div className="space-y-3 mt-6">
                    {complexities.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setProfile({ routine_complexity: c.value })}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                          profile.routine_complexity === c.value
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/30"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">{c.label}</p>
                          <p className="text-xs text-muted font-[family-name:var(--font-body)]">{c.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Optional first products */}
            {step === 6 && (
              <div className="text-center">
                <Sparkles size={32} className="text-accent mx-auto mb-4" />
                <h2 className="text-xl sm:text-2xl font-light mb-2 px-2">
                  You&apos;re all set!
                </h2>
                <p className="text-sm text-muted mb-8 font-[family-name:var(--font-body)] max-w-sm mx-auto">
                  suki. has everything it needs to start making smart
                  recommendations. You can add products from your dashboard.
                </p>
                <GhostButton
                  variant="filled"
                  size="lg"
                  onClick={handleFinish}
                  disabled={saving}
                >
                  {saving ? "Saving your profile..." : "Go to my dashboard"}
                </GhostButton>
                {saveError && (
                  <p className="mt-4 text-sm text-red-500 font-[family-name:var(--font-body)] max-w-sm mx-auto break-words">
                    {saveError}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < TOTAL_STEPS && (
          <div className="fixed sm:static bottom-0 left-0 right-0 flex justify-between items-center gap-3 px-4 py-3 sm:p-0 sm:mt-10 bg-background/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none border-t border-border/60 sm:border-0 z-40">
            <GhostButton
              variant="ghost"
              onClick={prev}
              disabled={step === 1}
              className={step === 1 ? "invisible" : ""}
            >
              <ChevronLeft size={16} />
              Back
            </GhostButton>
            <GhostButton variant="outline" onClick={next}>
              Continue
              <ChevronRight size={16} />
            </GhostButton>
          </div>
        )}
      </div>
    </div>
  );
}
