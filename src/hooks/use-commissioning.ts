/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

function deriveStatus(c:string) {
  const r=(c||"").toLowerCase().trim();
  if(r==="scrapped") return "Scrapped";
  if(r==="poor"||r==="poor-fair") return "Break Down";
  if(r==="fair"||r==="idle") return "Idle";
  if(r==="break down") return "Break Down";
  if(r==="under repair") return "Under Repair";
  if(r==="stand by") return "Stand By";
  return "Working";
}

export function useCommissioning() {
  const [commissioningRecords, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => { fetchRecords(); }, []);

  async function fetchRecords() {
    setLoading(true);
    const {data,error:err} = await dbu.from("commissioning").select("*").order("created_at",{ascending:false});
    if (err) { setError(err.message); setLoading(false); return; }
    setRecords(data||[]); setLoading(false);
  }

  async function submitCommissioning(f:any) {
    const {data:comm,error:e1} = await dbu.from("commissioning").insert([f]).select().single();
    if (e1) return {success:false,error:e1.message};
    const {data:equip,error:e2} = await dbu.from("equipment").insert([{
      code:comm.fleet_number, fleet_number:comm.fleet_number, commissioning_id:comm.id,
      name:comm.description, type_code:comm.type_code, category:comm.category,
      make:comm.make, model:comm.model, year:comm.year_of_manufacturing,
      serial_no:comm.serial_no, chassis_no:comm.chassis_no, reg_no:comm.reg_no,
      engine_power:comm.engine_power, size_capacity:comm.size_capacity,
      tank_capacity:comm.tank_capacity, meter_device:comm.meter_device,
      site:comm.location, region:comm.region,
      operational_status:deriveStatus(comm.equipment_condition||""),
      assessment:comm.equipment_condition||"Good", fleet_status:comm.fleet_status,
      current_hour_meter:comm.opening_hour_meter||0, current_kilometer:comm.opening_kilometer||0,
      date_received:comm.date_received||null, commission_date:comm.date_commissioned,
      year_of_manufacturing:comm.year_of_manufacturing,
      purchase_cost:comm.purchase_cost, landed_cost:comm.landed_cost,
      depreciation:comm.depreciation, life_expectancy:comm.life_expectancy,
      insurance_policy:comm.policy_cover_no, insurance_expiry:comm.insurance_expiry||null,
      supplier:comm.supplier, supplier_code:comm.supplier_code,
      order_no:comm.order_no, invoice_no:comm.invoice_no,
    }]).select().single();
    if (e2) return {success:false,error:e2.message};
    await dbu.from("equipment_history").insert([{
      equipment_id:equip.id, fleet_number:equip.fleet_number, action_type:"Commissioned",
      to_site:equip.site, performed_by:comm.plant_engineer||"System",
      remarks:`Commissioned as ${comm.fleet_status}. Condition: ${comm.condition_at_receipt}`,
    }]);
    await fetchRecords(); return {success:true,equipmentId:equip.id};
  }

  return {commissioningRecords,loading,error,fetchRecords,submitCommissioning};
}
