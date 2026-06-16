"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dbu } from "@/lib/db";
import { Sun, Moon } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [fullName,  setFullName]  = useState("");
  const [darkMode,  setDarkMode]  = useState(false);

  // ── Load user ──
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await dbu.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    }
    getUser();
  }, []);

  // ── Load saved theme on mount ──
  useEffect(() => {
    const saved = localStorage.getItem("buildfleet-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // ── Toggle theme ──
  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("buildfleet-theme", next ? "dark" : "light");
  }

  async function handleLogout() {
    await dbu.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-[#0F1117] border-b border-slate-200 dark:border-[#1E2235] px-8 py-4 flex items-center justify-between transition-colors duration-200">

      {/* LEFT — app identity */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          BuildFleet
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Enterprise Fleet Management System
        </p>
      </div>

      {/* RIGHT — theme toggle + user + logout */}
      <div className="flex items-center gap-4">

        {/* Dark/Light toggle */}
        <button
          onClick={toggleTheme}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="w-10 h-10 rounded-xl border border-slate-200 dark:border-[#1E2235] bg-slate-50 dark:bg-[#1A1D2E] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#1E2235] transition-colors"
        >
          {darkMode
            ? <Sun  size={18} className="text-amber-400" />
            : <Moon size={18} className="text-slate-500" />
          }
        </button>

        {/* User info */}
        <div className="text-right">
          <p className="font-semibold text-slate-700 dark:text-white text-sm">
            {fullName || "User"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Logged In
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 transition-colors text-white px-5 py-2.5 rounded-2xl font-medium text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}