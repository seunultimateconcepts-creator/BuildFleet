"use client";
export const dynamic = 'force-dynamic';

import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/dashboard/sidebar";
import Header from "../../components/dashboard/header";
import { dbu } from "@/lib/db";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Idle logout — sign out after 1hr of inactivity ──
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(async () => {
      await dbu.auth.signOut();
      router.replace("/login");
    }, IDLE_TIMEOUT_MS);
  }, [router]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer(); // start timer immediately
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  // ── Auth check — redirect to login if no session ──
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await dbu.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    }
    checkAuth();

    // Listen for sign out events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = dbu.auth.onAuthStateChange((event: string, session: any) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F8FC]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading BuildFleet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FC]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}