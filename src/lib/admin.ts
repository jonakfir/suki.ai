// Admin is configured via env vars (see .env.local.example). If ADMIN_USER_ID
// isn't set, admin-mode writes target a throwaway uuid so nothing breaks —
// but the admin login route itself will refuse unless ADMIN_EMAIL + ADMIN_PASSWORD are set.
export const ADMIN_USER_ID =
  process.env.NEXT_PUBLIC_ADMIN_USER_ID ||
  "00000000-0000-0000-0000-000000000000";
export const ADMIN_NAME = process.env.NEXT_PUBLIC_ADMIN_NAME || "there";

export async function isAdminSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/auth/admin/status", { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.isAdmin;
  } catch {
    return false;
  }
}

export async function clearAdminSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/admin", { method: "DELETE" });
  } catch {
    // ignore
  }
}
