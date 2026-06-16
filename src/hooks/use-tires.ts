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

  // Add new tire to stock
  async function addTire(payload: any) {
    const { data, error: err } = await dbu
      .from("tires")
      .insert([{ ...payload, status: "In Stock" }])
      .select()
      .single();
    if (err) return { success: false, error: err.message };
    setTires(prev => [data, ...prev]);
    return { success: true, data };
  }

  // Fit tire to equipment
  async function fitTire(
    tireId: string,
    equipmentId: string,
    fleetNumber: string,
    position: string,
    kmReading: number,
    hrReading: number,
    by: string
  ) {
    // Optimistic update
    setTires(prev => prev.map(t =>
      t.id === tireId
        ? { ...t, status: "Fitted", current_equipment_id: equipmentId,
            current_fleet_number: fleetNumber, current_position: position,
            fitted_date: new Date().toISOString().split("T")[0],
            fitted_km_reading: kmReading, fitted_hr_reading: hrReading }
        : t
    ));

    const { error: err } = await dbu.from("tires").update({
      status: "Fitted",
      current_equipment_id: equipmentId,
      current_fleet_number: fleetNumber,
      current_position: position,
      fitted_date: new Date().toISOString().split("T")[0],
      fitted_km_reading: kmReading,
      fitted_hr_reading: hrReading,
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
      performed_by: by,
    }]);

    return { success: true };
  }

  // Remove tire from equipment
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
      fleet_number: tire?.current_fleet_number,
      position: tire?.current_position,
      km_reading: kmReading, hr_reading: hrReading,
      tread_depth: treadDepth, reason,
      performed_by: by,
    }]);

    return { success: true };
  }

  // Update tread depth inspection
  async function inspectTire(
    tireId: string,
    treadDepth: number,
    kmReading: number,
    hrReading: number,
    notes: string,
    by: string
  ) {
    setTires(prev => prev.map(t =>
      t.id === tireId ? { ...t, current_tread_depth: treadDepth } : t
    ));

    await dbu.from("tires").update({
      current_tread_depth: treadDepth,
      updated_at: new Date().toISOString(),
    }).eq("id", tireId);

    dbu.from("tire_history").insert([{
      tire_id: tireId,
      tire_number: tires.find(t => t.id === tireId)?.tire_number,
      action_type: "Inspected",
      km_reading: kmReading, hr_reading: hrReading,
      tread_depth: treadDepth, notes,
      performed_by: by,
    }]);

    return { success: true };
  }

  return {
    tires, history, loading, error,
    fetchTires, fetchTireHistory,
    addTire, fitTire, removeTire, inspectTire,
  };
}