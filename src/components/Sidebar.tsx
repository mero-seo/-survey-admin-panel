"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ChevronLeft, LayoutDashboard, ListChecks, MonitorSmartphone, Settings as SettingsIcon } from "lucide-react";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/surveys", label: "Surveys", icon: ListChecks },
  { href: "/admin/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <aside
      className={`relative flex flex-col h-full bg-white border-r shadow-sm p-4 transition-all duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Collapse/Expand button always visible at the edge */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className={`absolute -right-3 top-4 z-10 p-1 rounded-full bg-white border shadow transition-all duration-200 ${collapsed ? "" : "rotate-180"}`}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{ width: 28, height: 28 }}
      >
        <ChevronLeft size={20} />
      </button>
      {/* Logo section */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        {/* Placeholder for logo image in the future */}
        <span className="font-bold text-xl tracking-tight">
          {collapsed ? "S" : "Survey"}
        </span>
      </div>
      <div className="flex-1">
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 rounded hover:bg-muted text-base font-medium transition-all duration-200 gap-3 ${
                  collapsed ? "justify-center" : ""
                }`}
                aria-label={collapsed ? link.label : undefined}
              >
                <Icon size={20} />
                {!collapsed && link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className={`mt-4 px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600 font-medium transition-all duration-200 ${
          collapsed ? "w-10 mx-auto flex justify-center" : "w-full"
        }`}
        title="Logout"
        aria-label={collapsed ? "Logout" : undefined}
      >
        {!collapsed ? "Logout" : <span className="sr-only">Logout</span>}
        {collapsed && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
        )}
      </button>
    </aside>
  );
} 