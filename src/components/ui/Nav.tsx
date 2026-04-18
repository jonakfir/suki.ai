"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { User, Home, Droplet, Scissors, Palette, Search } from "lucide-react";

const authedLinks = [
  { href: "/today",  label: "Today",  icon: Home },
  { href: "/skin",   label: "Skin",   icon: Droplet },
  { href: "/hair",   label: "Hair",   icon: Scissors },
  { href: "/makeup", label: "Makeup", icon: Palette },
  { href: "/me",     label: "Me",     icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/today") {
    return pathname === "/today" || pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAuth = pathname.startsWith("/auth");
  const isOnboarding = pathname.startsWith("/onboard");

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href={isLanding || isAuth || isOnboarding ? "/" : "/today"}>
          <Logo size="md" />
        </Link>

        {isLanding || isAuth || isOnboarding ? (
          <Link
            href="/auth"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors duration-300 rounded-full px-2 py-1 -mx-2 -my-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <User size={16} />
            <span className="font-[family-name:var(--font-script)]">Sign in</span>
          </Link>
        ) : (
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Desktop links — hidden on mobile (bottom nav takes over) */}
            <div className="hidden sm:flex items-center gap-1">
              {authedLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive(pathname, href)
                      ? "bg-accent/15 text-accent-deep glow-accent after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-[2px] after:bg-accent after:rounded-full"
                      : "text-muted hover:text-accent-deep hover:bg-card/50"
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            <Link
              href="/compare"
              aria-label="Compare a product"
              className="ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm text-muted hover:text-accent-deep hover:bg-card/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Search size={15} />
              <span className="hidden sm:inline">Compare</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
