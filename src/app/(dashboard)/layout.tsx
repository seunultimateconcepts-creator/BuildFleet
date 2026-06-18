"use client";

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

  // Idle logout — sign out after 1hr of inactivity
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(async () => {
      await dbu.auth.signOut();
      router.replace("/login");
    }, IDLE_TIMEOUT_MS);
  }, [router]);

  useEffect(() => {
    const events = ["mousemove","keydown","click","touchstart","scroll"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

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
      <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0A0C14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading BuildFleet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0A0C14] transition-colors duration-200">
      <Sidebar />
      <div className="ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 overflow-auto bg-[#F7F8FC] dark:bg-[#0A0C14] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}