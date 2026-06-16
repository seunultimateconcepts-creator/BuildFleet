/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const {data,error:err} = await dbu.from("profiles").select("*").order("created_at",{ascending:false});
    if (err) { setError(err.message); setLoading(false); return; }
    setUsers((data||[]).map((d:any)=>({id:d.id,full_name:d.full_name||"",email:d.email||"",roles:d.roles||(d.role?[d.role]:["plant_clerk"]),assigned_sites:d.assigned_sites||(d.site?[d.site]:[]),staff_no:d.staff_no||"",phone:d.phone||"",created_at:d.created_at||""})));
    setLoading(false);
  }

  async function updateUserRoles(id:string, roles:string[]) {
    const {error:err} = await dbu.from("profiles").update({roles}).eq("id",id);
    if (err) return {success:false,error:err.message};
    await fetchUsers(); return {success:true};
  }

  async function updateUserSites(id:string, sites:string[]) {
    const {error:err} = await dbu.from("profiles").update({assigned_sites:sites}).eq("id",id);
    if (err) return {success:false,error:err.message};
    await fetchUsers(); return {success:true};
  }

  async function updateUserProfile(id:string, updates:any) {
    const {error:err} = await dbu.from("profiles").update(updates).eq("id",id);
    if (err) return {success:false,error:err.message};
    await fetchUsers(); return {success:true};
  }

  return {users,loading,error,fetchUsers,updateUserRoles,updateUserSites,updateUserProfile};
}
