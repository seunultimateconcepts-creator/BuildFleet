/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

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
  Sidebar,
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
    <svg width="210" height="68" viewBox="0 0 290 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildFleet Enterprise Fleet Management">
      <defs>
        <linearGradient id="bfg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5A623"/>
          <stop offset="100%" stopColor="#E8820A"/>
        </linearGradient>
      </defs>

      {/* Hexagon icon centered at (38, 40) radius 32 */}
      <polygon points="38,8 70,24 70,56 38,72 6,56 6,24"
        fill="none" stroke="#F5A623" strokeWidth="2.5" strokeLinejoin="round"/>

      {/* Inner hex dark fill */}
      <polygon points="38,14 62,28 62,52 38,66 14,52 14,28"
        fill="#0D1525"/>

      {/* Scan lines */}
      <line x1="18" y1="34" x2="58" y2="34" stroke="#F5A623" strokeWidth="1.6" strokeLinecap="round" opacity="0.25"/>
      <line x1="16" y1="40" x2="60" y2="40" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="46" x2="58" y2="46" stroke="#F5A623" strokeWidth="1.6" strokeLinecap="round" opacity="0.25"/>

      {/* Active tracker dot */}
      <circle cx="60" cy="40" r="4.5" fill="#F5A623"/>
      <circle cx="60" cy="40" r="8" fill="none" stroke="#F5A623" strokeWidth="1.2" opacity="0.4"/>

      {/* Center hub */}
      <circle cx="38" cy="40" r="10" fill="#1A2744"/>
      <circle cx="38" cy="40" r="4.5" fill="#F5A623"/>
      <circle cx="38" cy="40" r="2" fill="#080D1A"/>

      {/* Data pulse lines */}
      <line x1="70" y1="36" x2="84" y2="36" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
      <line x1="70" y1="40" x2="90" y2="40" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
      <line x1="70" y1="44" x2="86" y2="44" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <circle cx="84" cy="36" r="2.5" fill="#F5A623" opacity="0.45"/>
      <circle cx="90" cy="40" r="3" fill="#F5A623"/>
      <circle cx="86" cy="44" r="2.5" fill="#F5A623" opacity="0.6"/>

      {/* Wordmark */}
      <text x="100" y="36" fontFamily="Arial Black, sans-serif" fontWeight="900"
        fontSize="24" fill="white" letterSpacing="-0.5">Build</text>
      <text x="100" y="62" fontFamily="Arial Black, sans-serif" fontWeight="900"
        fontSize="24" fill="#F5A623" letterSpacing="-0.5">Fleet</text>
    </svg>
  );
}

export default Sidebar;