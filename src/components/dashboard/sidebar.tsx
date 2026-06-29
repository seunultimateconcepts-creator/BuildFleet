"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, Truck, MapPin, ArrowLeftRight, Wrench,
  ClipboardList, BookOpen, BarChart3, Users, Settings,
  ChevronDown, CircleDot, ImageIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// NAV ITEMS
// ─────────────────────────────────────────────────────────────
const navItems = [
  { label: "Dashboard",     href: "/",            icon: LayoutDashboard, roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Equipment",     href: "/equipment",   icon: Truck,           roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Sites",         href: "/sites",       icon: MapPin,          roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor"] },
  { label: "Transfer",      href: "/transfer",    icon: ArrowLeftRight,  roles: ["super_admin","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Maintenance",   href: "/maintenance", icon: Wrench,          roles: ["super_admin","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Tire Management", href: "/tires",     icon: CircleDot, badge: "TMS", roles: ["super_admin","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Commissioning", href: "/commissioning", icon: ClipboardList, roles: ["super_admin","plant_manager","plant_engineer","plant_admin","plant_officer"] },
  { label: "Daily Logs",    href: "/daily-logs",  icon: BookOpen,        roles: ["super_admin","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Plant Gallery", href: "/gallery",     icon: ImageIcon,       roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","plant_officer","site_supervisor","plant_clerk"] },
  { label: "Reports",       href: "/reports",     icon: BarChart3,       roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","plant_officer"] },
  { label: "Users",         href: "/users",       icon: Users,           roles: ["super_admin","plant_admin"] },
  { label: "Settings",      href: "/settings",    icon: Settings,        roles: ["super_admin","plant_admin"] },
];

// ─────────────────────────────────────────────────────────────
// BUILDFLEET LOGO — Hexagon tracker
// ─────────────────────────────────────────────────────────────
function BuildFleetLogo() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1E2235]">
      {/* Hexagon icon */}
      <svg width="44" height="44" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Outer hexagon */}
        <polygon points="40,4 74,22 74,58 40,76 6,58 6,22"
          fill="none" stroke="#F5A623" strokeWidth="3.5" strokeLinejoin="round"/>
        {/* Inner hex dark fill */}
        <polygon points="40,13 66,28 66,52 40,67 14,52 14,28"
          fill="#0D1525"/>
        {/* Scan lines */}
        <line x1="18" y1="33" x2="62" y2="33" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" opacity="0.25"/>
        <line x1="16" y1="40" x2="64" y2="40" stroke="#F5A623" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="18" y1="47" x2="62" y2="47" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" opacity="0.25"/>
        {/* Tracker dot on active line */}
        <circle cx="64" cy="40" r="5.5" fill="#F5A623"/>
        <circle cx="64" cy="40" r="10" fill="none" stroke="#F5A623" strokeWidth="1.5" opacity="0.4"/>
        {/* Center hub */}
        <circle cx="40" cy="40" r="13" fill="#1A2744"/>
        <circle cx="40" cy="40" r="6" fill="#F5A623"/>
        <circle cx="40" cy="40" r="2.5" fill="#080D1A"/>
      </svg>

      {/* Wordmark */}
      <div>
        <p className="font-black text-white leading-none" style={{ fontSize: "18px", letterSpacing: "-0.5px" }}>
          Build<span style={{ color: "#F5A623" }}>Fleet</span>
        </p>
        <p className="text-[9px] font-medium uppercase tracking-widest mt-0.5" style={{ color: "#8A9AC0" }}>
          Enterprise Fleet Management
        </p>
        <p className="text-[8px] mt-0.5" style={{ color: "#2A4060" }}>
          A product of{" "}
          <span className="font-bold" style={{ color: "#F5A623" }}>Ultimate Tech Lab</span>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname  = usePathname();
  const { profile } = useAuth();

  const roles: string[] = profile?.roles || [];

  const visibleItems = navItems.filter(item =>
    item.roles.some(r => roles.includes(r))
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col z-40"
      style={{ backgroundColor: "#080D1A", borderRight: "1px solid #1E2235" }}>

      {/* Logo */}
      <BuildFleetLogo />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {visibleItems.map(item => {
          const Icon   = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              style={active ? { backgroundColor: "#1A2744" } : {}}>

              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 w-1 h-7 rounded-r-full"
                  style={{ backgroundColor: "#F5A623" }} />
              )}

              <Icon size={17} className={`shrink-0 transition-colors ${
                active ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
              }`} />

              <span className="flex-1 truncate">{item.label}</span>

              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "#1A6FC4", color: "white", letterSpacing: "0.5px" }}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — workspace + user */}
      <div className="px-3 pb-4 space-y-2 border-t pt-3" style={{ borderColor: "#1E2235" }}>

        {/* Workspace */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: "#0F1525" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
            style={{ backgroundColor: "#1A3A5C", color: "#F5A623" }}>
            HN
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Hartland Nigeria Ltd</p>
            <p className="text-[10px] truncate" style={{ color: "#4A6080" }}>Active workspace</p>
          </div>
          <ChevronDown size={12} className="text-slate-600 shrink-0" />
        </div>

        {/* User */}
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: "#0F1525" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: "#1E2235", color: "#F5A623" }}>
              {(profile.full_name || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.full_name}</p>
              <p className="text-[10px] truncate capitalize" style={{ color: "#4A6080" }}>
                {(roles[0] || "User").replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}