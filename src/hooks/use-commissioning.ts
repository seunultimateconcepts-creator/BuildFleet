/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { fetchAllRows } from "@/lib/fetch-all";

// Condition at commissioning → operational status.
// ★ Updated to the current status taxonomy — "Idle" and "Stand By"
// are legacy values that no longer exist anywhere else in BuildFleet;
// both map to "Storage" now.
function deriveStatus(c: string) {
  const r = (c || "").toLowerCase().trim();
  if (r === "scrapped") return "Scrapped";
  if (r === "poor" || r === "poor-fair") return "Break Down";
  if (r === "break down") return "Break Down";
  if (r === "under repair") return "Under Repair";
  if (r === "fair" || r === "idle" || r === "stand by" || r === "storage") return "Storage";
  return "Working";
}

export function useCommissioning() {
  const [commissioningRecords, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchRecords(); }, []);

  async function fetchRecords() {
    setLoading(true);
    // ★ FIX: Supabase caps every query at 1,000 rows — the old single
    // .select() left the Commissioning page stuck at "1000 records"
    // while Equipment showed the full 1,438. fetchAllRows pages
    // through .range() windows until it has everything.
    const data = await fetchAllRows("commissioning", "*",
      q => q.order("created_at", { ascending: false }));
    setRecords(data);
    setLoading(false);
  }

  async function submitCommissioning(f: any) {
    const { data: comm, error: e1 } = await dbu.from("commissioning").insert([f]).select().single();
    if (e1) return { success: false, error: e1.message };
    const { data: equip, error: e2 } = await dbu.from("equipment").insert([{
      code: comm.fleet_number, fleet_number: comm.fleet_number, commissioning_id: comm.id,
      name: comm.description, type_code: comm.type_code, category: comm.category,
      make: comm.make, model: comm.model, year: comm.year_of_manufacturing,
      serial_no: comm.serial_no, chassis_no: comm.chassis_no, reg_no: comm.reg_no,
      engine_power: comm.engine_power, size_capacity: comm.size_capacity,
      tank_capacity: comm.tank_capacity, meter_device: comm.meter_device,
      site: comm.location, region: comm.region,
      operational_status: deriveStatus(comm.equipment_condition || ""),
      assessment: comm.equipment_condition || "Good", fleet_status: comm.fleet_status,
      current_hour_meter: comm.opening_hour_meter || 0, current_kilometer: comm.opening_kilometer || 0,
      date_received: comm.date_received || null, commission_date: comm.date_commissioned,
      year_of_manufacturing: comm.year_of_manufacturing,
      purchase_cost: comm.purchase_cost, landed_cost: comm.landed_cost,
      depreciation: comm.depreciation, life_expectancy: comm.life_expectancy,
      insurance_policy: comm.policy_cover_no, insurance_expiry: comm.insurance_expiry || null,
      supplier: comm.supplier, supplier_code: comm.supplier_code,
      order_no: comm.order_no, invoice_no: comm.invoice_no,
    }]).select().single();
    if (e2) return { success: false, error: e2.message };
    await dbu.from("equipment_history").insert([{
      equipment_id: equip.id, fleet_number: equip.fleet_number, action_type: "Commissioned",
      to_site: equip.site, performed_by: comm.plant_engineer || "System",
      remarks: `Commissioned as ${comm.fleet_status}. Condition: ${comm.condition_at_receipt}`,
    }]);
    await fetchRecords(); return { success: true, equipmentId: equip.id };
  }

  return { commissioningRecords, loading, error, fetchRecords, submitCommissioning };
}