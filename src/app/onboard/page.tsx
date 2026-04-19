"use client";

import { useEffect, useRef, useState } from "react";
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
  HairType,
  HairTexture,
  MakeupStyle,
  CoveragePreference,
  FinishPreference,
  Undertone,
} from "@/lib/store";
import {
  Droplets,
  Sun,
  Layers,
  CircleDot,
  ShieldAlert,
  Sparkles,
  Palette,
  Wallet,
  Clock,
  ChevronRight,
  ChevronLeft,
  Scissors,
  Camera,
  Loader2,
  Pencil,
  Check,
  X,
  User as UserIcon,
} from "lucide-react";

const TOTAL_STEPS = 9;

const skinTypes: { value: SkinType; label: string; icon: typeof Droplets; description: string }[] = [
  { value: "oily",        label: "Oily",        icon: Droplets,    description: "Shiny by midday, visible pores, prone to breakouts" },
  { value: "dry",         label: "Dry",         icon: Sun,         description: "Tight, flaky, sometimes rough — needs constant moisture" },
  { value: "combination", label: "Combination", icon: Layers,      description: "Oily T-zone, dry cheeks" },
  { value: "normal",      label: "Normal",      icon: CircleDot,   description: "Balanced, rarely breaks out, low maintenance" },
  { value: "sensitive",   label: "Sensitive",   icon: ShieldAlert, description: "Reacts easily, redness-prone, needs gentle formulas" },
];

const concerns = [
  "Acne", "Hyperpigmentation", "Redness", "Aging", "Dullness",
  "Large pores", "Dark circles", "Dehydration", "Texture", "Sun damage",
];

const tones: { value: SkinTone; label: string }[] = [
  { value: "fair",   label: "Fair" },
  { value: "light",  label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "tan",    label: "Tan" },
  { value: "deep",   label: "Deep" },
];

const ageRanges: { value: AgeRange; label: string }[] = [
  { value: "teens", label: "Teens" },
  { value: "20s",   label: "20s" },
  { value: "30s",   label: "30s" },
  { value: "40s",   label: "40s" },
  { value: "50+",   label: "50+" },
];

const races = [
  "Asian",
  "Black / African",
  "East Asian",
  "Hispanic / Latinx",
  "Middle Eastern / North African",
  "Native / Indigenous",
  "Pacific Islander",
  "South Asian",
  "Southeast Asian",
  "White / European",
  "Mixed / Multiple",
  "Prefer not to say",
];

const commonAllergies = [
  "Fragrance", "Essential oils", "Sulfates", "Parabens",
  "Alcohol", "Silicones", "Dyes", "Nickel",
];

const budgets: { value: Budget; label: string }[] = [
  { value: "drugstore", label: "Drugstore" },
  { value: "mid-range", label: "Mid-range" },
  { value: "luxury",    label: "Luxury" },
  { value: "mixed",     label: "A mix" },
];

const complexities: { value: RoutineComplexity; label: string; description: string }[] = [
  { value: "minimal",  label: "Minimal",  description: "3 steps max" },
  { value: "moderate", label: "Moderate", description: "5-7 steps" },
  { value: "full",     label: "Full",     description: "All in — 10+ steps" },
];

const hairTypes: { value: HairType; label: string; description: string }[] = [
  { value: "straight", label: "Straight", description: "Falls flat" },
  { value: "wavy",     label: "Wavy",     description: "Loose S-pattern" },
  { value: "curly",    label: "Curly",    description: "Defined curls" },
  { value: "coily",    label: "Coily",    description: "Tight coils or kinks" },
];

const hairTextures: { value: HairTexture; label: string }[] = [
  { value: "fine",   label: "Fine" },
  { value: "medium", label: "Medium" },
  { value: "thick",  label: "Thick" },
];

const hairConcernOptions = [
  "dryness", "frizz", "breakage", "dandruff", "thinning", "oiliness", "heat damage", "split ends",
];

const undertones: { value: Undertone; label: string }[] = [
  { value: "warm",    label: "Warm" },
  { value: "cool",    label: "Cool" },
  { value: "neutral", label: "Neutral" },
  { value: "olive",   label: "Olive" },
];

const makeupStyles: { value: MakeupStyle; label: string; description: string }[] = [
  { value: "natural",   label: "Natural",   description: "Barely-there, skin-first" },
  { value: "everyday",  label: "Everyday",  description: "Polished but understated" },
  { value: "bold",      label: "Bold",      description: "Eyes or lips that pop" },
  { value: "glam",      label: "Glam",      description: "Full-face, occasion-ready" },
  { value: "editorial", label: "Editorial", description: "Experimental, trend-forward" },
];

const coverages: { value: CoveragePreference; label: string }[] = [
  { value: "sheer",  label: "Sheer" },
  { value: "medium", label: "Medium" },
  { value: "full",   label: "Full" },
];

const finishes: { value: FinishPreference; label: string }[] = [
  { value: "matte",   label: "Matte" },
  { value: "natural", label: "Natural" },
  { value: "dewy",    label: "Dewy" },
  { value: "glossy",  label: "Glossy" },
];

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const { profile, setProfile } = useStore();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [productsUsing, setProductsUsing] = useState("");
  const [productsBad, setProductsBad] = useState("");
  const [hairProducts, setHairProducts] = useState("");
  const [makeupProducts, setMakeupProducts] = useState("");
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null);
  const [facePhotoPath, setFacePhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — product scan state
  interface CatalogProduct { name: string; brand: string; category: string; notes: string; }
  interface Catalog { skincare: CatalogProduct[]; hair: CatalogProduct[]; makeup: CatalogProduct[]; }
  interface SearchSuggestion { product_name: string; brand: string; category: string; description: string; }
  type CatalogBucket = "skincare" | "hair" | "makeup";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [localCatalog, setLocalCatalog] = useState<Catalog | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [savingProducts, setSavingProducts] = useState(false);
  const [productsSaved, setProductsSaved] = useState(false);
  const productScanRef = useRef<HTMLInputElement>(null);

  // Step 2 — inline product edit state
  const [editKey, setEditKey] = useState<{ bucket: CatalogBucket; index: number } | null>(null);
  const [editQuery, setEditQuery] = useState("");
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const resetUserData = useStore((s) => s.resetUserData);

  useEffect(() => {
    resetUserData();
    setAllergies([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (catalog) setLocalCatalog({ skincare: [...catalog.skincare], hair: [...catalog.hair], makeup: [...catalog.makeup] });
  }, [catalog]);

  const runSearch = async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      if (!res.ok) { setSuggestions([]); return; }
      const data = await res.json();
      setSuggestions(((data.products ?? []) as SearchSuggestion[]).slice(0, 5));
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleEditQuery = (q: string) => {
    setEditQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(q), 400);
  };

  const startProductEdit = (bucket: CatalogBucket, index: number) => {
    const p = localCatalog![bucket][index];
    const q = [p.name, p.brand].filter(Boolean).join(" ");
    setEditKey({ bucket, index });
    setEditQuery(q);
    setEditName(p.name);
    setEditBrand(p.brand);
    setSuggestions([]);
    if (q.length >= 2) runSearch(q);
  };

  const cancelProductEdit = () => {
    setEditKey(null);
    setSuggestions([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const applyProductSuggestion = (s: SearchSuggestion) => {
    setEditName(s.product_name);
    setEditBrand(s.brand);
    setSuggestions([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const confirmProductEdit = () => {
    if (!editKey || !localCatalog) return;
    const { bucket, index } = editKey;
    setLocalCatalog((prev) => {
      if (!prev) return prev;
      const updated = [...prev[bucket]];
      updated[index] = { ...updated[index], name: editName.trim() || updated[index].name, brand: editBrand.trim() || updated[index].brand };
      return { ...prev, [bucket]: updated };
    });
    setEditKey(null);
    setSuggestions([]);
  };

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

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setUploadError("Please use JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Photo too large (max 8 MB).");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploadError("Sign in required to upload.");
        return;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
      const up = await supabase.storage
        .from("face-photos")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("face-photos")
        .createSignedUrl(path, 60 * 60);
      if (signed.error || !signed.data?.signedUrl) {
        throw signed.error || new Error("Failed to sign URL.");
      }
      setFacePhotoUrl(signed.data.signedUrl);
      setFacePhotoPath(path);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleProductScanFile = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setScanError(null);
    setScanLoading(true);
    setCatalog(null);
    setProductsSaved(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const MAX = 800;
          let { width, height } = img;
          if (width >= height) {
            if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
          } else {
            if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          const b64 = dataUrl.split(",")[1];
          console.log("[onboard scan] compressed base64 length:", b64.length, "bytes (raw ~" + Math.round(b64.length * 0.75 / 1024) + " KB)");
          resolve(b64);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
        img.src = objectUrl;
      });
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg", mode: "catalog" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || "Couldn't identify products. Try another photo.");
        return;
      }
      setCatalog(data.catalog);
    } catch {
      setScanError("Network error. Please try again.");
    } finally {
      setScanLoading(false);
      if (productScanRef.current) productScanRef.current.value = "";
    }
  };

  const handleSaveCatalog = async () => {
    if (!localCatalog) return;
    setSavingProducts(true);
    try {
      const products = [
        ...localCatalog.skincare.map((p) => ({ ...p, domain: "skincare" as const })),
        ...localCatalog.hair.map((p) => ({ ...p, domain: "haircare" as const })),
        ...localCatalog.makeup.map((p) => ({ ...p, domain: "makeup" as const })),
      ];
      if (products.length === 0) { next(); return; }
      const res = await fetch("/api/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setScanError(body.error || "Failed to save products.");
        return;
      }
      setProductsSaved(true);
      setTimeout(() => next(), 800);
    } catch {
      setScanError("Network error saving products.");
    } finally {
      setSavingProducts(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const admin = await isAdminSession();

      const profilePayload = {
        skin_type: profile.skin_type,
        skin_concerns: profile.skin_concerns,
        skin_tone: profile.skin_tone,
        age_range: profile.age_range,
        known_allergies: allergies,
        budget: profile.budget,
        routine_complexity: profile.routine_complexity,
        race: profile.race ?? null,
        // Store only the storage path — URL is re-signed on each read.
        face_photo_url: null,
        face_photo_storage_path: facePhotoPath,
        initial_products_using: productsUsing.trim() || null,
        initial_products_bad: productsBad.trim() || null,
        initial_hair_products: hairProducts.trim() || null,
        initial_makeup_products: makeupProducts.trim() || null,
        hair_type: profile.hair_type ?? null,
        hair_texture: profile.hair_texture ?? null,
        hair_porosity: profile.hair_porosity ?? null,
        hair_concerns: profile.hair_concerns ?? [],
        hair_goals: profile.hair_goals ?? [],
        is_color_treated: profile.is_color_treated ?? false,
        undertone: profile.undertone ?? null,
        makeup_style: profile.makeup_style ?? null,
        coverage_preference: profile.coverage_preference ?? null,
        finish_preference: profile.finish_preference ?? null,
        preference_mode: profile.preference_mode ?? "most_recommended",
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
          .upsert(
            { user_id: user.id, ...profilePayload },
            { onConflict: "user_id" }
          );
        if (error) throw error;
      }

      // Fire-and-forget recommendations generation.
      fetch("/api/recommendations", { method: "POST" }).catch(() => {});
      router.push("/today");
    } catch (err) {
      const e = err as { message?: string; details?: string; hint?: string };
      const msg =
        e?.message ||
        e?.details ||
        e?.hint ||
        (err instanceof Error ? err.message : JSON.stringify(err));
      console.error("Failed to save profile:", err);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // AnimatePresence caused React 19 + framer-motion 12 to hold the old step's
  // JSX in place after the exit animation instead of mounting the new step.
  // Keep a simple fade on the step container instead.

  return (
    <div className="min-h-[calc(100svh-7rem)] flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
      <Logo className="text-2xl sm:text-3xl mb-6 sm:mb-8" />

      <div className="w-full max-w-md mb-8 sm:mb-12">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted mt-2 text-center font-[family-name:var(--font-body)]">
          Step {step} of {TOTAL_STEPS} — every question is optional
        </p>
      </div>

      <div className="w-full max-w-lg pb-32 sm:pb-0">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
            {/* Step 1: Basic info (age + race) */}
            {step === 1 && (
              <div>
                <div className="flex justify-center mb-2">
                  <UserIcon size={22} className="text-accent-deep" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Tell us about you
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  So we can tailor recommendations. All optional.
                </p>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Age</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {ageRanges.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setProfile({ age_range: a.value })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        profile.age_range === a.value
                          ? "border-accent bg-accent/10 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Ethnicity</p>
                <div className="grid grid-cols-2 gap-2">
                  {races.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setProfile({ race: r })}
                      className={`text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                        profile.race === r
                          ? "border-accent bg-accent/10 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Product shelf scan */}
            {step === 2 && (
              <div>
                <div className="flex justify-center mb-2">
                  <Sparkles size={22} className="text-accent-deep" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Scan your products
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  Upload a photo of your beauty shelf. Suki will identify and sort everything for you.
                </p>

                <input
                  ref={productScanRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleProductScanFile(e.target.files?.[0] ?? null)}
                />

                {!catalog && !scanLoading && (
                  <button
                    type="button"
                    onClick={() => productScanRef.current?.click()}
                    className="w-full aspect-[4/3] max-w-xs mx-auto flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--card-border)] text-muted hover:border-accent/40 hover:text-accent-deep transition-colors"
                  >
                    <Camera size={28} />
                    <span className="text-sm">Upload a photo of your shelf</span>
                    <span className="text-xs opacity-60">JPG, PNG, WebP</span>
                  </button>
                )}

                {scanLoading && (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                      <Sparkles size={28} className="text-accent" />
                    </motion.div>
                    <p className="text-sm text-muted">Identifying your products…</p>
                  </div>
                )}

                {scanError && (
                  <p className="mt-3 text-xs text-red-500 text-center">{scanError}</p>
                )}

                {localCatalog && (
                  <div className="space-y-4">
                    {(["skincare", "hair", "makeup"] as const).map((bucket) => {
                      const items = localCatalog[bucket];
                      if (!items.length) return null;
                      const labels: Record<string, string> = { skincare: "Skincare", hair: "Hair care", makeup: "Makeup" };
                      return (
                        <div key={bucket}>
                          <p className="text-xs uppercase tracking-widest text-muted mb-2">{labels[bucket]} · {items.length} found</p>
                          <div className="space-y-1.5">
                            {items.map((p, i) => {
                              const isEditing = editKey?.bucket === bucket && editKey?.index === i;
                              return isEditing ? (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 rounded-xl bg-background/40 border border-accent/30 space-y-2"
                                >
                                  {/* Search query input */}
                                  <div className="relative">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editQuery}
                                      onChange={(e) => handleEditQuery(e.target.value)}
                                      placeholder="Search products…"
                                      className="w-full text-sm rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-1.5 pr-8 outline-none focus:ring-2 focus:ring-accent/40"
                                    />
                                    {suggestionsLoading && (
                                      <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />
                                    )}
                                  </div>
                                  {/* Suggestions dropdown */}
                                  <AnimatePresence>
                                    {suggestions.length > 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="rounded-lg border border-[var(--card-border)]/60 bg-background overflow-hidden shadow-md"
                                      >
                                        {suggestions.map((s, j) => (
                                          <button
                                            key={j}
                                            type="button"
                                            onClick={() => applyProductSuggestion(s)}
                                            className="w-full text-left px-3 py-2 hover:bg-accent/5 transition-colors border-b border-[var(--card-border)]/30 last:border-0"
                                          >
                                            <p className="text-xs font-medium text-accent-ink truncate">{s.product_name}</p>
                                            <p className="text-[10px] text-muted truncate">{s.brand} · {s.category}</p>
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                  {/* Manual name / brand fields */}
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Product name"
                                    className="w-full text-sm rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent/40"
                                  />
                                  <input
                                    type="text"
                                    value={editBrand}
                                    onChange={(e) => setEditBrand(e.target.value)}
                                    placeholder="Brand"
                                    className="w-full text-sm rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent/40"
                                  />
                                  <div className="flex gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={confirmProductEdit}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
                                    >
                                      <Check size={12} />
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelProductEdit}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[var(--card-border)] text-xs text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
                                    >
                                      <X size={12} />
                                      Cancel
                                    </button>
                                  </div>
                                </motion.div>
                              ) : (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-[var(--card-border)]/40 relative">
                                  <span className="text-[10px] font-semibold text-accent uppercase w-8 shrink-0 bg-accent/10 rounded px-1 py-0.5 text-center">{p.category.slice(0, 3)}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-accent-ink truncate pr-6">{p.name}</p>
                                    <p className="text-xs text-muted truncate">{p.brand}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => startProductEdit(bucket, i)}
                                    aria-label="Edit product"
                                    className="absolute top-1/2 -translate-y-1/2 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-muted opacity-60 hover:opacity-100 hover:text-accent hover:bg-accent/10 transition-all"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setCatalog(null); setScanError(null); }}
                        className="text-xs text-muted hover:text-foreground underline"
                      >
                        Try another photo
                      </button>
                    </div>
                    {productsSaved && (
                      <p className="text-sm text-accent-deep text-center font-medium">Products saved!</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Skin photo */}
            {step === 3 && (
              <div>
                <div className="flex justify-center mb-2">
                  <Camera size={22} className="text-accent-deep" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Show us your skin
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  A clear, makeup-free selfie helps us read your skin directly. Private to you.
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />

                {facePhotoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={facePhotoUrl}
                      alt="Your skin"
                      className="w-48 h-60 object-cover rounded-2xl border border-[var(--card-border)]"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-muted hover:text-foreground underline"
                    >
                      Change photo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full aspect-[4/5] max-w-xs mx-auto flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--card-border)] text-muted hover:border-accent/40 hover:text-accent-deep transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={28} className="animate-spin" />
                        <span className="text-sm">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Camera size={28} />
                        <span className="text-sm">Take or upload a selfie</span>
                      </>
                    )}
                  </button>
                )}
                {uploadError && (
                  <p className="mt-3 text-xs text-red-500 text-center break-all">
                    {uploadError}
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Skin type + tone + concerns */}
            {step === 4 && (
              <div>
                <div className="flex justify-center mb-2">
                  <Droplets size={22} className="text-accent-deep" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Your skin
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  If you&apos;re not sure, just skip — we can infer this later.
                </p>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Skin type</p>
                <div className="space-y-2 mb-5">
                  {skinTypes.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setProfile({ skin_type: st.value })}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        profile.skin_type === st.value
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <st.icon size={16} className="mt-0.5 text-accent-deep shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{st.label}</p>
                        <p className="text-xs text-muted">{st.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Tone</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {tones.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setProfile({ skin_tone: t.value })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        profile.skin_tone === t.value
                          ? "border-accent bg-accent/10 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Concerns</p>
                <div className="flex flex-wrap gap-2">
                  {concerns.map((c) => {
                    const active = profile.skin_concerns.includes(c.toLowerCase());
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleConcern(c)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          active
                            ? "border-accent bg-accent/10 text-accent-deep"
                            : "border-border text-muted hover:border-accent/30"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Allergies + current skincare products */}
            {step === 5 && (
              <div>
                <div className="flex justify-center mb-2">
                  <ShieldAlert size={22} className="text-accent-deep" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Allergies & current products
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  Anything we should avoid? And what you&apos;ve tried.
                </p>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Known allergens</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {commonAllergies.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergy(a)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        allergies.includes(a)
                          ? "border-accent bg-accent/10 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAllergy();
                      }
                    }}
                    placeholder="Other allergen…"
                    className="flex-1 rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <button
                    type="button"
                    onClick={addCustomAllergy}
                    className="text-xs px-3 rounded-lg border border-[var(--card-border)] text-muted hover:text-accent-deep hover:border-accent/40"
                  >
                    Add
                  </button>
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {allergies.map((a) => (
                      <span
                        key={a}
                        className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent-deep"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                <label className="block text-xs uppercase tracking-widest text-muted mb-2 mt-2">
                  Products you currently use
                </label>
                <textarea
                  rows={3}
                  value={productsUsing}
                  onChange={(e) => setProductsUsing(e.target.value)}
                  placeholder="e.g. CeraVe Hydrating Cleanser, The Ordinary Niacinamide"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40 mb-4"
                />

                <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                  Products that didn&apos;t work
                </label>
                <textarea
                  rows={2}
                  value={productsBad}
                  onChange={(e) => setProductsBad(e.target.value)}
                  placeholder="e.g. Drunk Elephant Protini — broke me out"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            )}

            {/* Step 6: Budget + complexity */}
            {step === 6 && (
              <div>
                <div className="flex justify-center mb-2">
                  <Wallet size={22} className="text-accent-deep" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Budget & routine style
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  Skip if you don&apos;t have a preference.
                </p>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Budget</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {budgets.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setProfile({ budget: b.value })}
                      className={`text-sm px-3 py-2 rounded-xl border transition-all ${
                        profile.budget === b.value
                          ? "border-accent bg-accent/5 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Routine complexity</p>
                <div className="space-y-2">
                  {complexities.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setProfile({ routine_complexity: c.value })}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        profile.routine_complexity === c.value
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span className="text-sm font-medium">{c.label}</span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{c.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Hair */}
            {step === 7 && (
              <div>
                <div className="flex justify-center mb-2">
                  <Scissors size={22} className="text-[var(--rose)]" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Your hair
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  Optional — only if you want hair recommendations.
                </p>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Hair type</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {hairTypes.map((h) => (
                    <button
                      key={h.value}
                      type="button"
                      onClick={() => setProfile({ hair_type: h.value })}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        profile.hair_type === h.value
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <p className="text-sm font-medium">{h.label}</p>
                      <p className="text-xs text-muted">{h.description}</p>
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Texture</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {hairTextures.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setProfile({ hair_texture: t.value })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        profile.hair_texture === t.value
                          ? "border-accent bg-accent/10 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Concerns</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {hairConcernOptions.map((c) => {
                    const arr = profile.hair_concerns ?? [];
                    const active = arr.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setProfile({
                            hair_concerns: active
                              ? arr.filter((x) => x !== c)
                              : [...arr, c],
                          })
                        }
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          active
                            ? "border-accent bg-accent/10 text-accent-deep"
                            : "border-border text-muted hover:border-accent/30"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer mb-5">
                  <input
                    type="checkbox"
                    checked={profile.is_color_treated ?? false}
                    onChange={(e) =>
                      setProfile({ is_color_treated: e.target.checked })
                    }
                    className="rounded border-border accent-accent"
                  />
                  My hair is color-treated
                </label>

                <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                  Hair products you use
                </label>
                <textarea
                  rows={2}
                  value={hairProducts}
                  onChange={(e) => setHairProducts(e.target.value)}
                  placeholder="e.g. Olaplex No. 4, K18 leave-in"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            )}

            {/* Step 8: Makeup */}
            {step === 8 && (
              <div>
                <div className="flex justify-center mb-2">
                  <Palette size={22} className="text-[var(--gold)]" />
                </div>
                <h2 className="text-h2 font-light text-center mb-2 px-2">
                  Your makeup
                </h2>
                <p className="text-sm text-muted text-center mb-6 font-[family-name:var(--font-body)]">
                  Optional — helps us match shades and finishes that flatter you.
                </p>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Undertone</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {undertones.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setProfile({ undertone: u.value })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        profile.undertone === u.value
                          ? "border-accent bg-accent/10 text-accent-deep"
                          : "border-border text-muted hover:border-accent/30"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs uppercase tracking-widest text-muted mb-2">Style</p>
                <div className="grid grid-cols-1 gap-2 mb-5">
                  {makeupStyles.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setProfile({ makeup_style: m.value })}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        profile.makeup_style === m.value
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted">{m.description}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted mb-2">Coverage</p>
                    <div className="flex flex-wrap gap-2">
                      {coverages.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setProfile({ coverage_preference: c.value })}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            profile.coverage_preference === c.value
                              ? "border-accent bg-accent/10 text-accent-deep"
                              : "border-border text-muted hover:border-accent/30"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted mb-2">Finish</p>
                    <div className="flex flex-wrap gap-2">
                      {finishes.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setProfile({ finish_preference: f.value })}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            profile.finish_preference === f.value
                              ? "border-accent bg-accent/10 text-accent-deep"
                              : "border-border text-muted hover:border-accent/30"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                  Makeup products you love
                </label>
                <textarea
                  rows={2}
                  value={makeupProducts}
                  onChange={(e) => setMakeupProducts(e.target.value)}
                  placeholder="e.g. Charlotte Tilbury Pillow Talk lipstick, Rare Beauty blush in Joy"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            )}

            {/* Step 9: All set */}
            {step === 9 && (
              <div className="text-center">
                <Sparkles size={32} className="text-accent mx-auto mb-4" />
                <h2 className="text-h2 font-light mb-2 px-2">
                  You&apos;re all set!
                </h2>
                <p className="text-sm text-muted mb-8 font-[family-name:var(--font-body)] max-w-sm mx-auto">
                  suki. has enough to build your first routine. You can
                  add more any time from your profile.
                </p>
                <GhostButton
                  variant="filled"
                  size="lg"
                  onClick={handleFinish}
                  disabled={saving}
                >
                  {saving ? "Saving your profile..." : "Go to Today"}
                </GhostButton>
                {saveError && (
                  <p className="mt-4 text-sm text-red-500 font-[family-name:var(--font-body)] max-w-sm mx-auto break-words">
                    {saveError}
                  </p>
                )}
              </div>
            )}
        </motion.div>

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
            <div className="flex items-center gap-2">
              <GhostButton variant="ghost" onClick={next}>
                Skip
              </GhostButton>
              {step === 2 && localCatalog && !productsSaved ? (
                <GhostButton
                  variant="outline"
                  onClick={handleSaveCatalog}
                  disabled={savingProducts}
                >
                  {savingProducts ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Loader2 size={14} />
                      </motion.div>
                      Saving…
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ChevronRight size={16} />
                    </>
                  )}
                </GhostButton>
              ) : (
                <GhostButton variant="outline" onClick={next}>
                  Continue
                  <ChevronRight size={16} />
                </GhostButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
