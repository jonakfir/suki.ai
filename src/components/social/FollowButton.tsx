"use client";

import { useState } from "react";

export function FollowButton({
  targetUserId,
  initialFollowing,
  disabled,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  disabled?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      const res = await fetch("/api/social/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      if (!res.ok) {
        setFollowing(!next); // revert
      }
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  const label = following ? (hover ? "Unfollow" : "Following") : "Follow";
  const cls = following
    ? "px-4 py-1.5 rounded-full text-sm border border-[var(--card-border)] bg-card hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
    : "px-4 py-1.5 rounded-full text-sm bg-accent text-white hover:bg-accent-deep transition-colors";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled || busy}
      className={cls}
    >
      {label}
    </button>
  );
}
