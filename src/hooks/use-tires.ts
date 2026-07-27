/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

export function useTires() {
  const [tires,   setTires]   = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => { fetchTires(); }, []);

  async function fetchTires() {
    setLoading(true); setError(null);
    const { data, error: err } = await dbu
      .from("tires")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    setTires(data || []);
    setLoading(false);
  }

  async function fetchTireHistory(tireId?: string) {
    let q = dbu.from("tire_history").select("*").order("created_at", { ascending: false });
    if (tireId) q = q.eq("tire_id", tireId);
    else q = q.limit(50);
    const { data } = await q;
    setHistory(data || []);
  }

  // NEW — the per-equipment history that Tyre Pass needs: every Fitted,
  // Removed and Inspected event ever recorded for a fleet number, in
  // one query. Works correctly now that inspectTire() below actually
  // writes fleet_number (previously it didn't, so inspections were
  // invisible here even though the column always existed).
  async function fetchHistoryForFleet(fleetNumber: string) {
    const { data } = await dbu.from("tire_history")
      .select("*")
      .eq("fleet_number", fleetNumber)
      .order("created_at", { ascending: false });
    return data || [];
  }

  // Add new tire to stock
  async function addTire(payload: any) {
    const { data, error: err } = await dbu
      .from("tires")
      .insert([{ ...payload, status: "In Stock" }])
      .select()
      .single();
    if (err) return { success: false, error: err.message };
    setTires(prev => [data, ...prev]);

    // Log the tire entering the system — completes the history picture
    // ("where did this tire come from") without changing anything about
    // how stock additions already worked.
    dbu.from("tire_history").insert([{
      tire_id: data.id,
      tire_number: data.tire_number,
      action_type: "Added to Stock",
      performed_by: payload.performed_by || "",
    }]);

    return { success: true, data };
  }

  // Fit tire to equipment
  // treadDepth is NEW — captured once at fitment, stored as
  // fitted_tread_depth (never overwritten again) so later inspections
  // can be compared against a true baseline. current_tread_depth is
  // also seeded with this value so the Fitted tab shows something
  // sensible before the first inspection happens.
  async function fitTire(
    tireId: string,
    equipmentId: string,
    fleetNumber: string,
    position: string,
    kmReading: number,
    hrReading: number,
    treadDepth: number,
    by: string
  ) {
    const fittedDate = new Date().toISOString().split("T")[0];

    // Optimistic update
    setTires(prev => prev.map(t =>
      t.id === tireId
        ? { ...t, status: "Fitted", current_equipment_id: equipmentId,
            current_fleet_number: fleetNumber, current_position: position,
            fitted_date: fittedDate,
            fitted_km_reading: kmReading, fitted_hr_reading: hrReading,
            fitted_tread_depth: treadDepth, current_tread_depth: treadDepth }
        : t
    ));

    const { error: err } = await dbu.from("tires").update({
      status: "Fitted",
      current_equipment_id: equipmentId,
      current_fleet_number: fleetNumber,
      current_position: position,
      fitted_date: fittedDate,
      fitted_km_reading: kmReading,
      fitted_hr_reading: hrReading,
      fitted_tread_depth: treadDepth,
      current_tread_depth: treadDepth,
      updated_at: new Date().toISOString(),
    }).eq("id", tireId);

    if (err) { await fetchTires(); return { success: false, error: err.message }; }

    // Log history
    dbu.from("tire_history").insert([{
      tire_id: tireId,
      tire_number: tires.find(t => t.id === tireId)?.tire_number,
      action_type: "Fitted",
      equipment_id: equipmentId,
      fleet_number: fleetNumber,
      position, km_reading: kmReading, hr_reading: hrReading,
      tread_depth: treadDepth,
      performed_by: by,
    }]);

    return { success: true };
  }

  // Remove tire from equipment
  // Unchanged behavior — newStatus "In Stock" is the reusable path,
  // "Worn Out"/"Scrapped" the common end-of-life path. Nothing deleted.
  async function removeTire(
    tireId: string,
    kmReading: number,
    hrReading: number,
    treadDepth: number,
    reason: string,
    newStatus: "In Stock" | "Worn Out" | "Scrapped",
    by: string
  ) {
    const tire = tires.find(t => t.id === tireId);

    setTires(prev => prev.map(t =>
      t.id === tireId
        ? { ...t, status: newStatus, current_equipment_id: null,
            current_fleet_number: null, current_position: null,
            current_tread_depth: treadDepth }
        : t
    ));

    const { error: err } = await dbu.from("tires").update({
      status: newStatus,
      current_equipment_id: null,
      current_fleet_number: null,
      current_position: null,
      current_tread_depth: treadDepth,
      updated_at: new Date().toISOString(),
    }).eq("id", tireId);

    if (err) { await fetchTires(); return { success: false, error: err.message }; }

    dbu.from("tire_history").insert([{
      tire_id: tireId,
      tire_number: tire?.tire_number,
      action_type: "Removed",
      equipment_id: tire?.current_equipment_id,
      fleet_number: tire?.current_fleet_number,
      position: tire?.current_position,
      km_reading: kmReading, hr_reading: hrReading,
      tread_depth: treadDepth, reason,
      performed_by: by,
    }]);

    return { success: true };
  }

  // Update tread depth inspection
  // FIXED — this previously wrote a tire_history row with NO
  // fleet_number, position, or equipment_id, which meant every
  // inspection event was invisible when querying "history for this
  // equipment." It now pulls those from the tire's current state
  // before writing, same as fitTire/removeTire already did correctly.
  async function inspectTire(
    tireId: string,
    treadDepth: number,
    kmReading: number,
    hrReading: number,
    notes: string,
    by: string
  ) {
    const tire = tires.find(t => t.id === tireId);

    setTires(prev => prev.map(t =>
      t.id === tireId ? { ...t, current_tread_depth: treadDepth } : t
    ));

    await dbu.from("tires").update({
      current_tread_depth: treadDepth,
      updated_at: new Date().toISOString(),
    }).eq("id", tireId);

    dbu.from("tire_history").insert([{
      tire_id: tireId,
      tire_number: tire?.tire_number,
      action_type: "Inspected",
      equipment_id: tire?.current_equipment_id,
      fleet_number: tire?.current_fleet_number,
      position: tire?.current_position,
      km_reading: kmReading, hr_reading: hrReading,
      tread_depth: treadDepth, notes,
      performed_by: by,
    }]);

    return { success: true };
  }

  return {
    tires, history, loading, error,
    fetchTires, fetchTireHistory, fetchHistoryForFleet,
    addTire, fitTire, removeTire, inspectTire,
  };
}