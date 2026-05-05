"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, User } from "lucide-react";

const tabs = [
  { href: "/explore", label: "Explore", icon: Home },
  { href: "/shop",    label: "Shop",    icon: ShoppingBag },
  { href: "/me",      label: "Me",      icon: User },
];

const PUBLIC_PREFIXES = ["/", "/auth", "/privacy", "/onboard"];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/"))
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/explore") {
    return (
      pathname === "/explore" ||
      pathname.startsWith("/explore/") ||
      /^\/profile\/[^/]+$/.test(pathname)
    );
  }
  if (href === "/me") {
    return pathname === "/me" || pathname.startsWith("/me/");
  }
  if (href === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/shop/");
  }
  return false;
}

export function BottomTabNav() {
  const pathname = usePathname();
  if (isPublicPath(pathname)) return null;

  return (
    <>
      <div aria-hidden className="h-20 sm:hidden" />

      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-50 sm:hidden glass border-t border-[var(--card-border)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="max-w-2xl mx-auto grid grid-cols-3">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[11px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    active
                      ? "text-accent-deep"
                      : "text-muted hover:text-accent-deep"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.25 : 1.75}
                    className={active ? "scale-110 transition-transform" : ""}
                  />
                  <span className={active ? "font-medium" : ""}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
