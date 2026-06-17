 
"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { dbu } from "@/lib/db";

export type UserRole = "super_admin"|"plant_manager"|"plant_director"|"plant_engineer"|"plant_admin"|"site_supervisor"|"plant_clerk";
export type UserProfile = { id:string; full_name:string; email:string; roles:UserRole[]; assigned_sites:string[]; staff_no?:string; phone?:string; created_at:string; };

export function useAuth() {
  const [user,    setUser]    = useState<User|null>(null);
  const [profile, setProfile] = useState<UserProfile|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
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