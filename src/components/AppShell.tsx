import { EventCoverImage } from "@/components/EventCoverImage";
import { ROLE_LABELS, type AppRole } from "@/lib/domain";
import { logoutAction } from "@/actions/auth";
import Link from "next/link";

type NavItem = { href: string; label: string };

export function AppShell({
  title,
  subtitle,
  role,
  userName,
  items,
  moreItems = [],
  coverImageUrl,
  children,
}: {
  title: string;
  subtitle?: string;
  role: AppRole | null;
  userName: string;
  items: NavItem[];
  moreItems?: NavItem[];
  coverImageUrl?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="card hidden lg:flex lg:w-64 lg:flex-col lg:rounded-none lg:border-0 lg:border-inline-end">
        <div className="p-5">
          <p className="text-sm text-[var(--muted)]">אירועים משפחתיים</p>
          <div className="mt-2 flex items-start gap-3">
            {coverImageUrl ? <EventCoverImage src={coverImageUrl} alt={title} variant="thumb" /> : null}
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 hover:bg-[var(--paper-deep)]">
              {item.label}
            </Link>
          ))}
          {moreItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 hover:bg-[var(--paper-deep)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 text-sm text-[var(--ink-soft)]">
          <p className="font-semibold text-[var(--ink)]">{userName}</p>
          <p>{role ? ROLE_LABELS[role] : ""}</p>
          <form action={logoutAction} className="mt-3">
            <button className="btn btn-ghost px-0" type="submit">
              יציאה
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/90 px-4 py-3 backdrop-blur lg:hidden">
          <p className="text-sm text-[var(--muted)]">אירועים משפחתיים</p>
          <div className="mt-1 flex items-center gap-2">
            {coverImageUrl ? <EventCoverImage src={coverImageUrl} alt={title} variant="thumb" /> : null}
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
        </header>
        <main className="page-wrap py-5 lg:max-w-none lg:px-8 lg:py-8">{children}</main>
      </div>

      <nav className="fixed inset-inline-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--line)] bg-[var(--cream)] lg:hidden">
        {items.slice(0, 3).map((item) => (
          <Link key={item.href} href={item.href} className="flex min-h-16 items-center justify-center px-2 text-sm font-semibold">
            {item.label}
          </Link>
        ))}
        {moreItems.length > 0 ? (
          <details className="relative">
            <summary className="flex min-h-16 list-none items-center justify-center px-2 text-sm font-semibold">
              עוד
            </summary>
            <div className="card absolute inset-inline-end-2 bottom-16 min-w-44 p-2">
              {moreItems.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2">
                  {item.label}
                </Link>
              ))}
              <form action={logoutAction}>
                <button className="block w-full rounded-lg px-3 py-2 text-start" type="submit">
                  יציאה
                </button>
              </form>
            </div>
          </details>
        ) : (
          <form action={logoutAction} className="flex items-center justify-center">
            <button className="text-sm font-semibold" type="submit">
              יציאה
            </button>
          </form>
        )}
      </nav>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{status}</span>;
}
