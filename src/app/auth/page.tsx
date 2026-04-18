"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { clearAdminSession } from "@/lib/admin";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { FormInput } from "@/components/ui/FormInput";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Mail } from "lucide-react";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const resetUserData = useStore((s) => s.resetUserData);

  const clearAdminCookie = async () => {
    await clearAdminSession();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Try admin login first
      const adminRes = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (adminRes.ok) {
        await supabase.auth.signOut().catch(() => {});
        resetUserData();
        router.push("/today");
        return;
      }

      await clearAdminCookie();
      resetUserData();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // If email confirmation is required, user won't have a session yet
        if (data.user && !data.session) {
          setError("Check your email for a confirmation link, then sign in.");
          setLoading(false);
          return;
        }
        router.push("/onboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/today");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    await clearAdminCookie();
    resetUserData();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-[calc(100svh-7rem)] flex items-center justify-center px-4 sm:px-6 py-8">
      <FadeIn className="w-full max-w-sm">
        <div className="text-center mb-6 sm:mb-8">
          <Logo className="text-3xl sm:text-4xl mb-3" />
          <p className="text-muted text-sm">
            {isSignUp
              ? "Create your skin profile"
              : "Welcome back to your routine"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <FormInput
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <FormInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FormInput
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {!isSignUp && (
            <div className="text-right -mt-2">
              <Link
                href="/auth/reset"
                className="text-xs text-muted hover:text-accent-deep"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <GhostButton
            type="submit"
            variant="filled"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? "One moment..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </GhostButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted">or</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <GhostButton
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth("apple")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </GhostButton>
          <GhostButton
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth("google")}
          >
            <Mail size={16} />
            Continue with Google
          </GhostButton>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          {isSignUp ? "Already have an account?" : "New to suki.ai?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-accent hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isSignUp ? "Sign in" : "Create account"}
          </button>
        </p>
      </FadeIn>
    </div>
  );
}
