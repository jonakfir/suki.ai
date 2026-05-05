type Size = "sm" | "md" | "lg";

const SIZE_CLS: Record<Size, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
};

export function UserAvatar({
  username,
  photoUrl,
  size = "md",
}: {
  username?: string | null;
  photoUrl?: string | null;
  size?: Size;
}) {
  const initial = (username?.[0] ?? "?").toUpperCase();
  const cls = `inline-flex items-center justify-center rounded-full bg-accent/15 text-accent-deep font-semibold overflow-hidden ${SIZE_CLS[size]}`;

  if (photoUrl) {
    return (
      <span className={cls} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="object-cover w-full h-full"
        />
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden>
      {initial}
    </span>
  );
}
