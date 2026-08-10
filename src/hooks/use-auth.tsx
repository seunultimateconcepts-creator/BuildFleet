/* eslint-disable react-hooks/immutability */
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { dbu } from "@/lib/db";

export type UserRole = "super_admin"|"plant_manager"|"plant_director"|"plant_engineer"|"plant_admin"|"site_supervisor"|"plant_clerk";
export type UserProfile = { id:string; full_name:string; email:string; roles:UserRole[]; assigned_sites:string[]; staff_no?:string; phone?:string; created_at:string; };

// ─────────────────────────────────────────────────────────────
// ★ PERFORMANCE FIX: this used to be a plain hook — every single
// component that called useAuth() (Sidebar, Header, every page,
// every modal) ran its OWN independent getUser() + profiles query
// on mount, completely unaware of every other instance doing the
// exact same thing at the exact same time. On a page with several
// components calling useAuth(), that meant 4-6+ duplicate auth
// checks and profile fetches firing in parallel, competing for the
// same connection — this was the real cause of pages appearing to
// hang, not the data query itself. Wrapping the state in a single
// React Context means the fetch happens ONCE per page load, and
// every component just reads that one shared result.
// ─────────────────────────────────────────────────────────────

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, staffNo?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User|null>(null);
  const [profile, setProfile] = useState<UserProfile|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser();
    const { data: listener } = dbu.auth.onAuthStateChange(() => getCurrentUser());
    return () => { listener.subscription.unsubscribe(); };
  }, []); // eslint-disable-line

  async function getCurrentUser() {
    setLoading(true);
    const { data: { user } } = await dbu.auth.getUser();
    setUser(user ?? null);
    if (user) await fetchProfile(user.id);
    else setProfile(null);
    setLoading(false);
  }

  async function fetchProfile(userId: string) {
    const { data } = await dbu.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile({
      id: data.id, full_name: data.full_name||"", email: data.email||"",
      roles: data.roles||(data.role?[data.role]:["plant_clerk"]),
      assigned_sites: data.assigned_sites||(data.site?[data.site]:[]),
      staff_no: data.staff_no||"", phone: data.phone||"", created_at: data.created_at||"",
    });
  }

  async function signIn(email:string, password:string) {
    const {error} = await dbu.auth.signInWithPassword({email,password});
    return error ? {success:false,error:error.message} : {success:true};
  }
  async function signUp(email:string, password:string, fullName:string, staffNo?:string) {
    const {data,error} = await dbu.auth.signUp({email,password});
    if (error) return {success:false,error:error.message};
    if (data.user) await dbu.from("profiles").upsert({id:data.user.id,full_name:fullName,email,roles:["plant_clerk"],assigned_sites:[],staff_no:staffNo||""},{onConflict:"id"});
    return {success:true};
  }
  async function signOut() { await dbu.auth.signOut(); setUser(null); setProfile(null); }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Same public API as before — every existing page/component calling
// useAuth() and destructuring hasRole, isSuperAdmin, canManageUsers,
// etc. keeps working exactly as-is. Only the internals changed.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>. Wrap it around the dashboard layout — see dashboard-layout.tsx.");
  }
  const { user, profile, loading, signIn, signUp, signOut } = ctx;

  const hasRole        = (r:UserRole) => profile?.roles?.includes(r)??false;
  const isSuperAdmin   = hasRole("super_admin");
  const isManager     = hasRole("plant_manager")||hasRole("plant_director");
  const isEngineer    = hasRole("plant_engineer");
  const isAdmin       = hasRole("plant_admin");
  const isSupervisor  = hasRole("site_supervisor");
  const isClerk       = hasRole("plant_clerk");
  const hasFullAccess = isManager||isEngineer||isAdmin;
  const canSeeSite    = (s:string) => !profile?false:hasFullAccess?true:profile.assigned_sites.some(x=>s.toLowerCase().includes(x.toLowerCase())||x.toLowerCase().includes(s.toLowerCase()));

  return { user, profile, loading, signIn, signUp, signOut, hasRole, hasFullAccess,
    isManager, isEngineer, isAdmin, isSupervisor, isClerk, canSeeSite,
    isSuperAdmin,
    canCommission: isSuperAdmin||isManager||isEngineer,
    canTransfer: isSuperAdmin||isManager||isEngineer||isClerk||isSupervisor,
    canApproveLogs: isSuperAdmin||isManager||isAdmin,
    canManageUsers: isSuperAdmin||isManager||isAdmin,
    canManageSites: isSuperAdmin||isManager||isAdmin,
    canChangeStatus: isSuperAdmin||isManager||isAdmin };
}