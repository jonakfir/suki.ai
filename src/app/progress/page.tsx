"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminSession } from "@/lib/admin";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { Pill } from "@/components/ui/Pill";
import { FadeIn } from "@/components/ui/FadeIn";
import {
  Camera,
  Loader2,
  Trash2,
  ArrowLeftRight,
  CalendarClock,
} from "lucide-react";

interface ProgressPhoto {
  id: string;
  domain: "skincare" | "haircare" | "makeup";
  image_url: string;
  storage_path: string | null;
  notes: string;
  mood_score: number | null;
  taken_at: string;
}

type Domain = ProgressPhoto["domain"];
const DOMAINS: Domain[] = ["skincare", "haircare", "makeup"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProgressPage() {
  const router = useRouter();
  const supabase = createClient();
  const [domain, setDomain] = useState<Domain>("skincare");
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (d: Domain) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/progress?domain=${d}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPhotos(data.photos as ProgressPhoto[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const admin = await isAdminSession();
      if (!user && !admin) {
        router.push("/auth");
        return;
      }
      setAdminMode(!user && admin);
      await load(domain);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image too large (max 8 MB).");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(
          "Sign in with a real account to save progress photos — admin mode doesn't support storage."
        );
        setUploading(false);
        return;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
      const up = await supabase.storage
        .from("progress-photos")
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (up.error) throw up.error;

      // Short-lived signed URL for the first render; GET re-signs on each load.
      const signed = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(path, 60 * 60);
      if (signed.error || !signed.data?.signedUrl) {
        throw signed.error || new Error("Failed to sign URL.");
      }

      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: signed.data.signedUrl,
          storage_path: path,
          domain,
          notes: notes.trim(),
          mood_score: mood ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setNotes("");
      setMood(null);
      await load(domain);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    try {
      const res = await fetch(`/api/progress?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `HTTP ${res.status}`);
      }
      setPhotos((p) => p.filter((x) => x.id !== id));
      setCompareA((x) => (x === id ? null : x));
      setCompareB((x) => (x === id ? null : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleCompare = (id: string) => {
    if (compareA === id) return setCompareA(null);
    if (compareB === id) return setCompareB(null);
    if (!compareA) return setCompareA(id);
    if (!compareB) return setCompareB(id);
    setCompareA(compareB);
    setCompareB(id);
  };

  const a = photos.find((p) => p.id === compareA);
  const b = photos.find((p) => p.id === compareB);

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-3xl mx-auto">
      <FadeIn>
        <p className="text-xs text-muted uppercase tracking-widest">Progress</p>
        <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">
          Track your journey
        </h1>
        <p className="text-sm text-muted mt-1 max-w-md">
          Weekly photos turn into a side-by-side you can scroll. Private to you.
        </p>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="mt-5 flex gap-2">
          {DOMAINS.map((d) => (
            <Pill key={d} active={domain === d} onClick={() => setDomain(d)}>
              {d}
            </Pill>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <Card className="mt-5 p-5 space-y-3">
          <label className="block">
            <span className="text-sm text-foreground">Note (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Week 2 with new moisturizer"
              className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">How does your skin feel?</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMood(mood === n ? null : n)}
                className={`w-7 h-7 rounded-full text-xs border transition-colors ${
                  mood === n
                    ? "border-accent bg-accent/10 text-accent-deep"
                    : "border-[var(--card-border)] text-muted hover:border-accent/30"
                }`}
                aria-label={`Mood ${n} of 5`}
              >
                {n}
              </button>
            ))}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          {adminMode && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Admin preview doesn&apos;t support photo storage. Sign in with a
              real account to track progress.
            </div>
          )}
          <div className="flex items-center gap-2">
            <GhostButton
              variant="filled"
              size="sm"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || adminMode}
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="ml-1">Uploading…</span>
                </>
              ) : (
                <>
                  <Camera size={14} />
                  <span className="ml-1">Add photo</span>
                </>
              )}
            </GhostButton>
            {error && (
              <span className="text-xs text-red-500 break-all">{error}</span>
            )}
          </div>
        </Card>
      </FadeIn>

      {a && b && (
        <FadeIn delay={0.15}>
          <Card className="mt-5 p-4">
            <div className="flex items-center gap-2 mb-3 text-sm">
              <ArrowLeftRight size={14} className="text-accent-deep" />
              <span className="font-medium">Comparing</span>
              <span className="text-xs text-muted">
                {formatDate(a.taken_at)} ↔ {formatDate(b.taken_at)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[a, b].map((p) => (
                <figure key={p.id} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url}
                    alt={p.notes || `Progress photo ${formatDate(p.taken_at)}`}
                    className="w-full aspect-[3/4] object-cover rounded-lg"
                  />
                  <figcaption className="text-[10px] uppercase tracking-widest text-muted">
                    {formatDate(p.taken_at)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-widest text-muted mb-3">
            Timeline
          </h2>
          {loading ? (
            <Card className="p-4">
              <div className="h-24 animate-pulse bg-background-deep/30 rounded" />
            </Card>
          ) : photos.length === 0 ? (
            <Card className="p-5 text-center">
              <CalendarClock
                size={22}
                className="mx-auto mb-2 text-accent-deep"
              />
              <p className="text-sm text-muted">
                No photos yet. Add one each week to watch the change.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => {
                const selected = compareA === p.id || compareB === p.id;
                return (
                  <div
                    key={p.id}
                    className={`relative aspect-[3/4] overflow-hidden rounded-lg border cursor-pointer transition-all ${
                      selected
                        ? "border-accent ring-2 ring-accent/40"
                        : "border-[var(--card-border)] hover:border-accent/30"
                    }`}
                    onClick={() => toggleCompare(p.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_url}
                      alt={p.notes || formatDate(p.taken_at)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <span className="text-[10px] text-white/90 block truncate">
                        {formatDate(p.taken_at)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                      aria-label="Delete photo"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </FadeIn>

      {photos.length >= 2 && !a && (
        <FadeIn delay={0.25}>
          <p className="mt-5 text-center text-xs text-muted">
            Tap two photos to compare them side-by-side.
          </p>
        </FadeIn>
      )}
    </div>
  );
}
