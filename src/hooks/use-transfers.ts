/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

export function useTransfers() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { profile, hasFullAccess, isClerk, isSupervisor } = useAuth();

  useEffect(() => {
    if (profile) fetchTransfers();
  }, [profile]); // eslint-disable-line

  async function fetchTransfers() {
    setLoading(true);
    const isRestricted = (isClerk || isSupervisor) && !hasFullAccess;
    const assignedSites = profile?.assigned_sites || [];

    let q = dbu.from("transfers").select("*").order("created_at", { ascending: false });

    // Clerks/supervisors see only transfers FROM or TO their assigned sites
    if (isRestricted && assignedSites.length > 0) {
      q = q.or(`from_site.in.(${assignedSites.map(s=>`"${s}"`).join(",")}),to_site.in.(${assignedSites.map(s=>`"${s}"`).join(",")})`);
    }

    const { data, error: err } = await q;
    if (err) { setError(err.message); setLoading(false); return; }
    setTransfers(data || []); setLoading(false);
  }

  async function createTransfer(t:any) {
    const {data,error:err} = await dbu.from("transfers").insert([{...t,status:"Pending"}]).select().single();
    if (err) return {success:false,error:err.message};
    await dbu.from("equipment_history").insert([{equipment_id:t.equipment_id,fleet_number:t.equipment_code,action_type:"Transferred",from_site:t.from_site,to_site:t.to_site,performed_by:t.dispatching_officer,remarks:`Transfer initiated. Type: ${t.transfer_type}`}]);
    await dbu.from("equipment").update({operational_status:"Stand By"}).eq("id",t.equipment_id);
    await fetchTransfers(); return {success:true,data};
  }

  async function confirmReceipt(id:string, r:any) {
    const {error:err} = await dbu.from("transfers").update({...r,status:"Received"}).eq("id",id);
    if (err) return {success:false,error:err.message};
    const t=transfers.find(x=>x.id===id);
    if (t) await dbu.from("equipment").update({site:t.to_site,operational_status:"Working"}).eq("id",t.equipment_id);
    await fetchTransfers(); return {success:true};
  }

  async function updateStatus(id:string, status:string) {
    const {error:err} = await dbu.from("transfers").update({status}).eq("id",id);
    if (err) return {success:false,error:err.message};
    await fetchTransfers(); return {success:true};
  }

  return {
    transfers,
    pendingTransfers: transfers.filter(t=>t.status==="Pending"),
    inTransitTransfers: transfers.filter(t=>t.status==="In Transit"),
    loading, error, fetchTransfers, createTransfer, confirmReceipt, updateStatus
  };
}