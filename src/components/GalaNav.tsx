"use client";

import { logoutAction } from "@/actions/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

export type NavItem = { href: string; label: string };

function isActive(href: string, pathname: string) {
  if (pathname === href) return true;
  if (href === "/events") return false;
  return pathname.startsWith(`${href}/`);
}

function NavGlyph({ label }: { label: string }) {
  const common: SVGProps<SVGSVGElement> = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (label === "דשבורד") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.2" />
        <rect x="13.5" y="10.5" width="7" height="10" rx="1.2" />
        <rect x="3.5" y="13" width="7" height="7.5" rx="1.2" />
      </svg>
    );
  }
  if (label === "הזמנות") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7.5" r="3" />
        <path d="M20 8v6M17 11h6" />
      </svg>
    );
  }
  if (label === "פעילות") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-4 2.5 3 3.5-6" />
      </svg>
    );
  }
  if (label === "אירועים" || label === "ניהול") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
        <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
      </svg>
    );
  }
  if (label === "משתמשים") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7.5" r="3" />
        <path d="M19 8a3 3 0 1 1 0 6" />
      </svg>
    );
  }
  if (label === "מחוקים") {
    return (
      <svg {...common}>
        <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SidebarNav({ items, moreItems }: { items: NavItem[]; moreItems: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {[...items, ...moreItems].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${isActive(item.href, pathname) ? "is-active" : ""}`}
        >
          <NavGlyph label={item.label} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({ items, moreItems }: { items: NavItem[]; moreItems: NavItem[] }) {
  const pathname = usePathname();
  const tabs = items.slice(0, 3);

  return (
    <nav className="app-bottom-nav lg:hidden">
      {tabs.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-tab ${isActive(item.href, pathname) || pathname === item.href ? "is-active" : ""}`}
        >
          <NavGlyph label={item.label} />
          {item.label}
        </Link>
      ))}
      {moreItems.length > 0 ? (
        <details className="nav-more">
          <summary className="nav-tab">
            <NavGlyph label="עוד" />
            עוד
          </summary>
          <div className="card nav-more-panel">
            {moreItems.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button className="nav-link w-full text-start" type="submit">
                יציאה
              </button>
            </form>
          </div>
        </details>
      ) : (
        <form action={logoutAction} className="flex items-center justify-center">
          <button className="nav-tab w-full" type="submit">
            <NavGlyph label="עוד" />
            יציאה
          </button>
        </form>
      )}
    </nav>
  );
}
