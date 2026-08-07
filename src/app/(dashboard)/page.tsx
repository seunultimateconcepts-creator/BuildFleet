"use client";

import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/dashboard/sidebar";
import Header from "../../components/dashboard/header";
import { dbu } from "@/lib/db";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY     = "bf_tab_auth";   // sessionStorage key — wiped when tab/browser closes
const LAST_ACTIVE_KEY = "bf_last_active"; // timestamp of last user activity

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const [checking, setChecking] = useState(true);
  const idleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sign out helper ──────────────────────────────────────────
  const forceLogout = useCallback(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LAST_ACTIVE_KEY);
    await dbu.auth.signOut();
    router.replace("/login");
  }, [router]);

  // ── Check if idle time has expired ──────────────────────────
  const checkIdleExpiry = useCallback(() => {
    const last = sessionStorage.getItem(LAST_ACTIVE_KEY);
    if (!last) return; // no record yet — don't log out
    const elapsed = Date.now() - parseInt(last, 10);
    if (elapsed >= IDLE_TIMEOUT_MS) {
      forceLogout();
    }
  }, [forceLogout]);

  // ── Reset idle timer on every user activity ──────────────────
  const resetIdleTimer = useCallback(() => {
    sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => forceLogout(), IDLE_TIMEOUT_MS);
  }, [forceLogout]);

  // ── Attach activity listeners + visibility check ─────────────
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));

    // When user comes BACK to this tab after switching away,
    // immediately check if idle time has already expired
    function onVisible() {
      if (document.visibilityState === "visible") {
        checkIdleExpiry();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    // When window regains focus (e.g. alt-tab back)
    window.addEventListener("focus", checkIdleExpiry);

    resetIdleTimer(); // start timer immediately

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkIdleExpiry);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer, checkIdleExpiry]);

  // ── Auth check ───────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await dbu.auth.getSession();

      if (!session) {
        // No Supabase session at all — go to login
        router.replace("/login");
        return;
      }

      // Supabase HAS a session (stored in localStorage).
      // But check if this browser TAB has authenticated in this session.
      // sessionStorage is wiped when the tab or browser is closed.
      // If it's missing → user closed the tab/browser and came back → force re-login.
      const tabAuth = sessionStorage.getItem(SESSION_KEY);
      if (!tabAuth) {
        await forceLogout();
        return;
      }

      setChecking(false);
    }

    checkAuth();

    // Listen for Supabase auth state changes (e.g. token expiry, manual sign out)
    const { data: { subscription } } = dbu.auth.onAuthStateChange(
      (event: string, session: unknown) => {
        if (event === "SIGNED_OUT" || !session) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(LAST_ACTIVE_KEY);
          router.replace("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, forceLogout]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F8FC] dark:bg-[#0A0C14]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading BuildFleet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F7F8FC] dark:bg-[#0A0C14]">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-[#F7F8FC] dark:bg-[#0A0C14]">
          {children}
        </main>
      </div>
    </div>
  );
}