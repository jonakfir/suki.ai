"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { FormInput } from "@/components/ui/FormInput";
import { FadeIn } from "@/components/ui/FadeIn";
import { Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Enable the form only when the user arrived via a genuine recovery link.
  // Two signals are accepted:
  //   (a) the explicit PASSWORD_RECOVERY auth event (normal path), OR
  //   (b) the URL contains a `#type=recovery` hash fragment (Supabase uses
  //       this format when the client SDK parses the reset link).
  // A pre-existing session alone is NOT enough — otherwise anyone already
  // signed in could land on this page and change their password without
  // actually clicking a reset email.
  useEffect(() => {
    let cancelled = false;
    const hashIsRecovery =
      typeof window !== "undefined" &&
      window.location.hash.includes("type=recovery");
    if (hashIsRecovery) setReady(true);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Wait for the session cookie to sync before letting middleware run.
      await supabase.auth.getSession();
      setSuccess(true);
      router.refresh();
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100svh-7rem)] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-sm">
        <FadeIn>
          <h1 className="text-h2 font-light font-[family-name:var(--font-heading)] mb-2">
            Pick a new password
          </h1>
          <p className="text-sm text-muted mb-6">
            Then we&apos;ll sign you in.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            {success ? (
              <p className="text-sm">
                Updated — signing you in…
              </p>
            ) : ready ? (
              <form onSubmit={submit} className="space-y-4">
                <FormInput
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <FormInput
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-type it"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <GhostButton
                  variant="filled"
                  className="w-full"
                  type="submit"
                  disabled={saving || !password || !confirm}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="ml-1">Saving…</span>
                    </>
                  ) : (
                    "Update password"
                  )}
                </GhostButton>
              </form>
            ) : (
              <div className="text-sm text-muted">
                <p>
                  This page requires the reset link from your email. If you
                  arrived here directly,{" "}
                  <Link href="/auth/reset" className="underline text-accent-deep">
                    request a new link
                  </Link>
                  .
                </p>
              </div>
            )}
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
