"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  UserCog,
  Settings,
  Menu,
  X,
} from "lucide-react";
import SignOutButton from "./sign-out-button";
import NotificationBell from "./notification-bell";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/team", label: "Team", icon: UserCog },
];

export default function DashboardShell({
  children,
  clientName,
  clientEmail,
}: {
  children: React.ReactNode;
  clientName: string;
  clientEmail: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = (
    <>
      <div className="relative p-6 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center font-bold text-sm">
            L
          </div>
          <span className="font-semibold text-lg tracking-tight">LeadBot</span>
        </div>
        <button className="md:hidden text-gray-400" onClick={() => setMobileOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav className="relative flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active ? "bg-white/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            pathname === "/dashboard/settings" ? "bg-white/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings size={18} strokeWidth={1.75} />
          Settings
        </Link>
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
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#f6f6fb]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-surface text-white flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-glow pointer-events-none" />
        {SidebarContent}
      </aside>

      {/* Mobile sidebar (slide-over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface text-white flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-glow pointer-events-none" />
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-gray-100 bg-white">
          <button className="md:hidden text-gray-500" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="hidden md:block" />
          <NotificationBell />
        </div>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
