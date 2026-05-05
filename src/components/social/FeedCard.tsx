"use client";

import Link from "next/link";
import { UserAvatar } from "./UserAvatar";

export interface FeedEvent {
  id: string;
  user_id: string;
  username: string | null;
  activity_type: "added_product" | "rated_product";
  product_name: string;
  brand: string;
  rating: string | null;
  domain: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ratingEmoji(r: string | null) {
  if (r === "love") return "❤️";
  if (r === "bad_reaction") return "👎";
  return "";
}

export function FeedCard({ event }: { event: FeedEvent }) {
  const handle = event.username ? `@${event.username}` : "someone";
  const verb = event.activity_type === "added_product" ? "added" : "rated";
  const emoji = ratingEmoji(event.rating);

  const inner = (
    <div className="flex items-start gap-3 p-3 rounded-2xl border border-[var(--card-border)] bg-card hover:bg-card/80 transition-colors">
      <UserAvatar username={event.username} size="md" />
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-semibold">{handle}</span>{" "}
          <span className="text-muted">{verb}</span>{" "}
          <span className="font-medium">{event.product_name}</span>
          {event.brand ? (
            <span className="text-muted"> · {event.brand}</span>
          ) : null}
          {emoji ? <span className="ml-1">{emoji}</span> : null}
        </div>
        <div className="text-xs text-muted mt-0.5">{timeAgo(event.created_at)}</div>
      </div>
    </div>
  );

  if (event.username) {
    return (
      <Link href={`/profile/${event.username}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
