import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, Megaphone, Users, BarChart3, UserCog } from "lucide-react";
import SignOutButton from "./sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const clientName = session.user.name;
  const clientEmail = session.user.email;

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/dashboard/leads", label: "Leads", icon: Users },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/team", label: "Team", icon: UserCog },
  ];

  return (
    <div className="flex min-h-screen bg-[#f6f6fb]">
      <aside className="w-64 bg-surface text-white flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-glow pointer-events-none" />

        <div className="relative p-6 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center font-bold text-sm">
              L
            </div>
            <span className="font-semibold text-lg tracking-tight">LeadBot</span>
          </div>
        </div>

        <nav className="relative flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative p-4 border-t border-surface-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-semibold shrink-0">
              {clientName?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{clientName}</div>
              <div className="text-xs text-gray-400 truncate">{clientEmail}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
