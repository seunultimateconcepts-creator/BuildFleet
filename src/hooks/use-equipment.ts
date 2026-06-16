/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

export function useEquipment() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => { fetchEquipment(); }, []);

  async function fetchEquipment() {
    setLoading(true); setError(null);
    const { data, error: err } = await dbu
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    setEquipment(data || []);
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
      if (hErr) console.warn("History log failed:", hErr.message);
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