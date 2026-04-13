"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
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

  const clearAdminCookie = () => {
    document.cookie = "admin-session=; path=/; max-age=0";
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
        router.push("/dashboard");
        return;
      }

      clearAdminCookie();
      resetUserData();

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        router.push("/onboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    clearAdminCookie();
    resetUserData();
    await supabase.auth.signInWithOAuth({
      provider: "google",
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

        <GhostButton
          variant="outline"
          className="w-full"
          onClick={handleGoogleAuth}
        >
          <Mail size={16} />
          Continue with Google
        </GhostButton>

        <p className="text-center text-sm text-muted mt-6">
          {isSignUp ? "Already have an account?" : "New to suki.ai?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-accent hover:underline"
          >
            {isSignUp ? "Sign in" : "Create account"}
          </button>
        </p>
      </FadeIn>
    </div>
  );
}
