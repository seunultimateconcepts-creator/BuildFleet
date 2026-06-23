"use client";
export const dynamic = 'force-dynamic';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  ArrowLeftRight,
  Wrench,
  ClipboardList,
  BookOpen,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  CircleDot,
  ImageIcon,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Equipment",
    href: "/equipment",
    icon: Truck,
    roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Sites",
    href: "/sites",
    icon: MapPin,
    roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","site_supervisor"],
  },
  {
    label: "Transfer",
    href: "/transfer",
    icon: ArrowLeftRight,
    roles: ["super_admin","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    roles: ["super_admin","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Tire Management",
    href: "/tires",
    icon: CircleDot,
    badge: "TMS",
    roles: ["super_admin","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Commissioning",
    href: "/commissioning",
    icon: ClipboardList,
    roles: ["super_admin","plant_manager","plant_engineer","plant_admin"],
  },
  {
    label: "Daily Logs",
    href: "/daily-logs",
    icon: BookOpen,
    roles: ["super_admin","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Plant Gallery",
    href: "/gallery",
    icon: ImageIcon,
    roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin","site_supervisor","plant_clerk"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin","plant_director","plant_manager","plant_engineer","plant_admin"],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["super_admin","plant_admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin","plant_admin"],
  },
];

function BuildFleetLogo() {
  return (
    <svg
      width="208"
      height="72"
      viewBox="0 0 290 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildFleet — Enterprise Fleet Management"
    >
      <defs>
        <linearGradient id="utlg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7ED321" />
          <stop offset="50%" stopColor="#00C9A7" />
          <stop offset="100%" stopColor="#00BFFF" />
        </linearGradient>
      </defs>

      {/* Circuit globe — U shape opening upward like UTL logo */}
      <g transform="translate(36,46)">
        {/* Arc opens at bottom — like a U bowl facing up */}
        <path d="M-28,20 A30,30 0 1,1 28,20"
          fill="none" stroke="url(#utlg)" strokeWidth="2.2" strokeLinecap="round"/>

        {/* Diagonal lines — bottom-left to top-right */}
        <line x1="-18" y1="16" x2="-6"  y2="-28" stroke="url(#utlg)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="-8"  y1="22" x2="5"   y2="-30" stroke="url(#utlg)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="2"   y1="24" x2="16"  y2="-29" stroke="url(#utlg)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="12"  y1="22" x2="26"  y2="-23" stroke="url(#utlg)" strokeWidth="1.8" strokeLinecap="round"/>

        {/* Dots at TOP of lines */}
        <circle cx="-6"  cy="-28" r="3"   fill="#7ED321"/>
        <circle cx="5"   cy="-30" r="3"   fill="#55D430"/>
        <circle cx="16"  cy="-29" r="3"   fill="#00C9A7"/>
        <circle cx="26"  cy="-23" r="3.5" fill="#00BFFF"/>

        {/* Dots at BOTTOM of lines */}
        <circle cx="-18" cy="16"  r="2.2" fill="#7ED321"/>
        <circle cx="-8"  cy="22"  r="2.2" fill="#55D430"/>
        <circle cx="2"   cy="24"  r="2.2" fill="#00C9A7"/>
        <circle cx="12"  cy="22"  r="2.2" fill="#00BFFF"/>
      </g>

      {/* BuildFleet wordmark */}
      <text
        x="76"
        y="38"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontWeight="800"
        fontSize="32"
        fill="#FFFFFF"
        letterSpacing="-0.5"
      >
        Build<tspan fill="url(#utlg)">Fleet</tspan>
      </text>

      {/* Tagline */}
      <text
        x="77"
        y="58"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontWeight="500"
        fontSize="10.5"
        fill="#5A6280"
        letterSpacing="0.8"
      >
        ENTERPRISE FLEET MANAGEMENT
      </text>

      {/* Thin divider */}
      <line x1="77" y1="68" x2="278" y2="68" stroke="#1E2235" strokeWidth="0.8"/>

      {/* UTL byline */}
      <text
        x="77"
        y="82"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontSize="9"
        fill="#3A4060"
      >
        A product of{" "}
        <tspan fontWeight="700" fill="url(#utlg)">Ultimate Tech Lab</tspan>
      </text>
    </svg>
  );
}

interface SidebarProps {
  companyName?: string;
  companyInitials?: string;
}

export function Sidebar({
  companyName = "Hartland Nigeria Ltd",
  companyInitials = "HNL",
}: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const userRoles: string[] = (profile?.roles as string[]) || [];

  const visibleItems = navItems.filter((item) =>
    item.roles.some((r) => userRoles.includes(r))
  );

  return (
    /*
      KEY FIX: `fixed inset-y-0 left-0` pins the sidebar to the viewport.
      The main content area in layout.tsx must have `ml-64` to compensate.
    */
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-[#0F1117] border-r border-[#1E2235]">

      {/* ── Logo area ── */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[#1E2235]">
        <Link href="/" aria-label="Go to dashboard">
          <BuildFleetLogo />
        </Link>
      </div>

      {/* ── Scrollable nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-[#1A6FC4] text-white shadow-sm"
                  : "text-[#8A90AA] hover:bg-[#181B28] hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#00C9A7]/15 text-[#00C9A7]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Company account switcher ── */}
      <div className="shrink-0 border-t border-[#1E2235] p-3 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#181B28] transition-colors group">
          {/* Gradient avatar */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #7ED321 0%, #00C9A7 50%, #1A6FC4 100%)",
            }}
          >
            <span className="text-white text-xs font-bold tracking-wide">
              {companyInitials}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">
              {companyName}
            </p>
            <p className="text-[#4A5275] text-[10px] leading-tight">
              Active workspace
            </p>
          </div>
          <ChevronDown size={14} className="text-[#4A5275] group-hover:text-white transition-colors shrink-0" />
        </button>

        {/* User info row */}
        {profile && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-[#1A2235] border border-[#2D3550] flex items-center justify-center shrink-0">
              <span className="text-[#8A90AA] text-[11px] font-medium">
                {String(profile.full_name ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[#C0C6D8] text-xs font-medium truncate leading-tight">
                {profile.full_name as string}
              </p>
              <p className="text-[#4A5275] text-[10px] capitalize truncate leading-tight">
                {((profile.roles as string[])?.[0] ?? "").replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;