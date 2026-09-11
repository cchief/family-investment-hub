import { requireAdmin } from "@/lib/session";
import { Shell, NavItem } from "@/components/Shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/collections", label: "Collections", icon: "📋" },
  { href: "/admin/verification", label: "Verification", icon: "✅" },
  { href: "/admin/members", label: "Members", icon: "👨‍👩‍👧‍👦" },
  { href: "/admin/uap-fund", label: "UAP Fund", icon: "🏦" },
  { href: "/admin/interest-allocation", label: "Interest Allocation", icon: "➗" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
  { href: "/admin/documents", label: "Documents", icon: "🗂️" },
  { href: "/admin/audit-trail", label: "Audit Trail", icon: "🕵️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <Shell nav={NAV} user={{ name: user.name, role: user.role }}>
      {children}
    </Shell>
  );
}
