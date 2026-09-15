import { EventCoverImage } from "@/components/EventCoverImage";
import { MobileNav, SidebarNav } from "@/components/GalaNav";
import { ROLE_LABELS, type AppRole } from "@/lib/domain";
import { logoutAction } from "@/actions/auth";

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
    <div className="app-shell">
      <aside className="app-sidebar hidden lg:flex lg:w-64 lg:flex-col">
        <div className="p-5">
          <p className="label-caps">אירועים משפחתיים</p>
          <div className="mt-3 flex items-start gap-3">
            {coverImageUrl ? <EventCoverImage src={coverImageUrl} alt={title} variant="thumb" /> : null}
            <div className="min-w-0">
              <h1 className="font-display text-[1.35rem] leading-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        <SidebarNav items={items} moreItems={moreItems} />
        <div className="mt-auto border-t border-[var(--line)] p-4 text-sm text-[var(--ink-soft)]">
          <p className="font-semibold text-[var(--ink)]">{userName}</p>
          <p className="kicker mt-1">{role ? ROLE_LABELS[role] : ""}</p>
          <form action={logoutAction} className="mt-3">
            <button className="btn btn-ghost px-0" type="submit">
              יציאה
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="app-topbar px-4 py-3 lg:hidden">
          <p className="label-caps text-center">אירועים משפחתיים</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            {coverImageUrl ? <EventCoverImage src={coverImageUrl} alt={title} variant="thumb" /> : null}
            <h1 className="font-display text-center text-[1.35rem] text-[var(--gold-radiant)]">{title}</h1>
          </div>
          {subtitle ? <p className="mt-1 text-center text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
        </header>
        <main className="page-wrap py-5 lg:py-8">{children}</main>
      </div>

      <MobileNav items={items} moreItems={moreItems} />
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{status}</span>;
}
