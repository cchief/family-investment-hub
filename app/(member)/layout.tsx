import { requireMember } from "@/lib/session";
import { Shell, NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/contributions", label: "My Contributions", icon: "💳" },
  { href: "/balance", label: "My Balance", icon: "📊" },
  { href: "/statements", label: "Statements", icon: "📄" },
  { href: "/fund-performance", label: "Fund Performance", icon: "📈" },
  { href: "/documents", label: "Documents", icon: "🗂️" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMember();
  return (
    <Shell nav={NAV} user={{ name: user.name, role: user.role }}>
      {children}
    </Shell>
  );
}
