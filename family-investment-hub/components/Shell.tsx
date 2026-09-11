"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export interface NavItem { href: string; label: string; icon: string; }

export function Shell({
  nav, user, children,
}: {
  nav: NavItem[];
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const activeHref = usePathname();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-black/5 bg-white">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-black/5">
          <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
            <span className="text-white font-display font-semibold text-sm">F</span>
          </div>
          <div>
            <p className="font-display font-semibold text-ink text-sm leading-tight">Family Investment Hub</p>
            <p className="text-[11px] text-ink/40 italic">Save consistently. Grow together.</p>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-brand-500 text-white" : "text-ink/60 hover:bg-black/[0.04] hover:text-ink"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-black/5">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{user.name}</p>
              <p className="text-[11px] text-ink/40">{user.role === "ADMIN" ? "Administrator" : "Member"}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-black/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-display font-semibold text-xs">F</span>
            </div>
            <span className="font-display font-semibold text-sm">Family Investment Hub</span>
          </div>
          <SignOutButton compact />
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl w-full mx-auto">{children}</main>
        <nav className="lg:hidden sticky bottom-0 bg-white border-t border-black/5 px-2 py-1.5 flex overflow-x-auto gap-1">
          {nav.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium shrink-0 ${
                  active ? "text-brand-600" : "text-ink/50"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
