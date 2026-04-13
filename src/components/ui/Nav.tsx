"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { User, LayoutDashboard, Package, Sparkles, Settings } from "lucide-react";

const authedLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAuth = pathname.startsWith("/auth");

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/">
          <Logo size="md" />
        </Link>

        {isLanding || isAuth ? (
          <Link
            href="/auth"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors duration-300 rounded-full px-2 py-1 -mx-2 -my-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <User size={16} />
            <span className="font-[family-name:var(--font-script)]">Sign in</span>
          </Link>
        ) : (
          <div className="flex items-center gap-0.5 sm:gap-1">
            {authedLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  pathname.startsWith(href)
                    ? "bg-accent/15 text-accent glow-accent"
                    : "text-muted hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
