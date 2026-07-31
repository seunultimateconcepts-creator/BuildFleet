/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

export function useEquipment() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const { profile, hasFullAccess, isClerk, isSupervisor } = useAuth();

  useEffect(() => {
    if (profile) fetchEquipment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function fetchEquipment() {
    setLoading(true); setError(null);

    const isRestricted = (isClerk || isSupervisor) && !hasFullAccess;
    const assignedSites = profile?.assigned_sites || [];

    // ★ FIX: Supabase caps every query at 1,000 rows — with 1,438+
    // equipment, the old single .select() silently dropped the rest.
    // fetchAllRows pages through .range() windows until it has all.
    const data = await fetchAllRows("equipment", "*", q => {
      let query = q.order("fleet_number", { ascending: true });
      if (isRestricted && assignedSites.length > 0) {
        query = query.in("site", assignedSites);
      }
      return query;
    });

    setEquipment(data);
    setLoading(false);
  }

  async function updateStatus(
    id: string,
    status: string,
    by: string,
    yard?: string
  ) {
    const item = equipment.find(e => e.id === id);
    if (!item) return { success: false };

    // 1. Optimistic local update — UI reflects change instantly
    setEquipment(prev => prev.map(e =>
      e.id === id
        ? { ...e, operational_status: status, current_yard: yard ?? e.current_yard }
        : e
    ));

    // 2. Persist to equipment table
    const updatePayload: any = { operational_status: status };
    if (yard !== undefined) updatePayload.current_yard = yard || null;

    const { error: err } = await dbu
      .from("equipment")
      .update(updatePayload)
      .eq("id", id);

    if (err) {
      // Rollback optimistic update on failure
      setEquipment(prev => prev.map(e =>
        e.id === id
          ? { ...e, operational_status: item.operational_status, current_yard: item.current_yard }
          : e
      ));
      return { success: false, error: err.message };
    }

    // 3. Log to history (fire and forget — don't await, don't block UI)
    dbu.from("equipment_history").insert([{
      equipment_id: id,
      fleet_number: item.fleet_number,
      action_type:  "Status Changed",
      from_status:  item.operational_status,
      to_status:    status,
      yard:         yard || null,
      performed_by: by,
    }]).then(({ error: hErr }: { error: any }) => {
      if (hErr) console.warn("History log failed:", hErr?.message || hErr);
    });

    return { success: true };
  }

  async function updateAssessment(id: string, assessment: string) {
    // Optimistic update
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, assessment } : e));

    const { error: err } = await dbu
      .from("equipment")
      .update({ assessment })
      .eq("id", id);
    if (err) {
      await fetchEquipment(); // rollback via refetch
      return { success: false, error: err.message };
    }
    return { success: true };
  }

  async function updateMeters(id: string, hourMeter?: number, kilometer?: number) {
    const u: any = {};
    if (hourMeter !== undefined) u.current_hour_meter = hourMeter;
    if (kilometer !== undefined) u.current_kilometer  = kilometer;

    // Optimistic update
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...u } : e));

    const { error: err } = await dbu.from("equipment").update(u).eq("id", id);
    if (err) {
      await fetchEquipment(); // rollback via refetch
      return { success: false, error: err.message };
    }
    return { success: true };
  }

  return { equipment, loading, error, fetchEquipment, updateStatus, updateAssessment, updateMeters };
}