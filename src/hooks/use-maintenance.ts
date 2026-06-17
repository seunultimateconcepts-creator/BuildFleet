/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

export function useMaintenance() {
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { profile, hasFullAccess, isClerk, isSupervisor } = useAuth();

  useEffect(() => {
    if (profile) fetchMaintenance();
  }, [profile]); // eslint-disable-line

  async function fetchMaintenance() {
    setLoading(true);
    const isRestricted = (isClerk || isSupervisor) && !hasFullAccess;
    const assignedSites = profile?.assigned_sites || [];

    let q = dbu.from("maintenance").select("*").order("created_at", { ascending: false });

    // Restrict clerks/supervisors to their assigned sites only
    if (isRestricted && assignedSites.length > 0) {
      q = q.in("site", assignedSites);
    }

    const { data, error: err } = await q;
    if (err) { setError(err.message); setLoading(false); return; }
    setMaintenance(data || []); setLoading(false);
  }

  async function addMaintenance(r:any) {
    const {error:err} = await dbu.from("maintenance").insert([r]);
    if (err) return {success:false,error:err.message};
    if (r.maintenance_type==="Breakdown") {
      await dbu.from("equipment").update({operational_status:"Under Repair"}).eq("id",r.equipment_id);
      await dbu.from("equipment_history").insert([{equipment_id:r.equipment_id,fleet_number:r.equipment_code,action_type:"Maintenance Started",from_status:"Working",to_status:"Under Repair",performed_by:r.reported_by,remarks:r.issue}]);
    }
    await fetchMaintenance(); return {success:true};
  }

  async function updateMaintenanceStatus(id:string, status:string, extras?:any) {
    const r=maintenance.find(m=>m.id===id);
    const {error:err} = await dbu.from("maintenance").update({status,...extras}).eq("id",id);
    if (err) return {success:false,error:err.message};
    if (status==="Completed"&&r) {
      await dbu.from("equipment").update({operational_status:"Working"}).eq("id",r.equipment_id);
      await dbu.from("equipment_history").insert([{equipment_id:r.equipment_id,fleet_number:r.equipment_code,action_type:"Maintenance Completed",from_status:"Under Repair",to_status:"Working",performed_by:r.technician||"Workshop",remarks:extras?.remarks||"Repair completed"}]);
    }
    await fetchMaintenance(); return {success:true};
  }

  return {
    maintenance,
    pendingMaintenance: maintenance.filter(m=>m.status==="Pending"),
    inProgressMaintenance: maintenance.filter(m=>m.status==="In Progress"),
    loading, error, fetchMaintenance, addMaintenance, updateMaintenanceStatus
  };
}