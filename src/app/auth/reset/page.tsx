"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { FormInput } from "@/components/ui/FormInput";
import { FadeIn } from "@/components/ui/FadeIn";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ResetPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100svh-7rem)] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-sm">
        <FadeIn>
          <Link
            href="/auth"
            aria-label="Back to sign in"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground mb-4"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
          <h1 className="text-h2 font-light font-[family-name:var(--font-heading)] mb-2">
            Reset your password
          </h1>
          <p className="text-sm text-muted mb-6">
            We&apos;ll email you a link to pick a new password.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            {sent ? (
              <div className="text-sm">
                <p className="text-foreground">
                  Check your inbox at <strong>{email}</strong>. The reset link
                  expires in 1 hour.
                </p>
                <Link
                  href="/auth"
                  className="mt-4 inline-block text-accent-deep hover:text-accent text-xs"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <FormInput
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <GhostButton
                  variant="filled"
                  className="w-full"
                  type="submit"
                  disabled={sending || !email.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="ml-1">Sending…</span>
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </GhostButton>
              </form>
            )}
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
