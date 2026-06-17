/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

export function useDailyLogs(filterMonth?:string, filterFleet?:string) {
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { profile, hasFullAccess, isClerk, isSupervisor } = useAuth();

  useEffect(() => {
    if (profile) fetchLogs();
  }, [filterMonth, filterFleet, profile]); // eslint-disable-line

  async function fetchLogs() {
    setLoading(true);
    const isRestricted = (isClerk || isSupervisor) && !hasFullAccess;
    const assignedSites = profile?.assigned_sites || [];

    let q = dbu.from("daily_logs").select("*").order("created_at", { ascending: false });
    if (filterMonth) q = q.eq("month", filterMonth);
    if (filterFleet) q = q.eq("fleet_no", filterFleet);

    // Restrict clerks/supervisors to their assigned sites only
    if (isRestricted && assignedSites.length > 0) {
      q = q.in("site", assignedSites);
    }

    const { data, error: err } = await q;
    if (err) { setError(err.message); setLoading(false); return; }
    setDailyLogs(data || []); setLoading(false);
  }

  async function saveDraftLog(log:any) {
    const {data,error:err} = await dbu.from("daily_logs").insert([{...log,approval_status:"Draft"}]).select().single();
    if (err) return {success:false,error:err.message};
    await fetchLogs(); return {success:true,data};
  }

  async function submitLog(logId:string) {
    const log=dailyLogs.find(l=>l.id===logId);
    if (!log) return {success:false,error:"Log not found"};
    const entries=log.entries||[];
    const totals=entries.reduce((acc:any,e:any)=>({
      total_idle:acc.total_idle+(Number(e.idle_hours)||0),
      total_working:acc.total_working+(Number(e.working_hours)||0),
      total_breakdown:acc.total_breakdown+(Number(e.breakdown_hours)||0),
      total_fuel:acc.total_fuel+(Number(e.fuel_quantity)||0),
      total_km:acc.total_km+(Number(e.km_logged)||0),
    }),{total_idle:0,total_working:0,total_breakdown:0,total_fuel:0,total_km:0});
    const {error:err} = await dbu.from("daily_logs").update({...totals,approval_status:"Submitted"}).eq("id",logId);
    if (err) return {success:false,error:err.message};
    if (log.equipment_id&&totals.total_working>0) {
      const {data:eq} = await dbu.from("equipment").select("current_hour_meter").eq("id",log.equipment_id).single();
      if (eq) await dbu.from("equipment").update({current_hour_meter:(eq.current_hour_meter||0)+totals.total_working}).eq("id",log.equipment_id);
    }
    await fetchLogs(); return {success:true};
  }

  async function approveLog(logId:string, by:string) {
    const {error:err} = await dbu.from("daily_logs").update({approval_status:"Approved",plant_admin:by}).eq("id",logId);
    if (err) return {success:false,error:err.message};
    await fetchLogs(); return {success:true};
  }

  async function rejectLog(logId:string) {
    const {error:err} = await dbu.from("daily_logs").update({approval_status:"Rejected"}).eq("id",logId);
    if (err) return {success:false,error:err.message};
    await fetchLogs(); return {success:true};
  }

  async function deleteLog(logId:string) {
    const {error:err} = await dbu.from("daily_logs").delete().eq("id",logId);
    if (err) return {success:false,error:err.message};
    await fetchLogs(); return {success:true};
  }

  return {
    dailyLogs,
    plantLogs: dailyLogs.filter(l=>l.log_type==="Plant"),
    transportLogs: dailyLogs.filter(l=>l.log_type==="Transport"),
    thirdPartyLogs: dailyLogs.filter(l=>l.log_type==="Third Party"),
    pendingApproval: dailyLogs.filter(l=>l.approval_status==="Submitted"),
    draftLogs: dailyLogs.filter(l=>l.approval_status==="Draft"),
    loading, error, fetchLogs, saveDraftLog, submitLog, approveLog, rejectLog, deleteLog
  };
}