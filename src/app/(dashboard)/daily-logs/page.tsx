 
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from "react";
import { dbu } from "@/lib/db";

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

const FUEL_TYPES = ["AGO","PMS","DPK","HHK","Other"];
const METER_UNITS = ["Hours","Km"]; // No miles/odometer

const iCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const cellCls = "border border-slate-200 px-2 py-1 text-xs";

// S = Storage (was I = Idle), A = Working/Available, N = Breakdown
type DayStatus = "A" | "S" | "N" | "";

interface LogRow {
  equipment_id:     string;
  fleet_no:         string;
  equipment_name:   string;
  hire_rate:        number;
  status:           DayStatus;
  storage_hours:    number;   // was idle_hours
  working_hours:    number;
  breakdown_hours:  number;
  fuel_quantity:    number;
  fuel_type:        string;
  engine_oil:       number;
  transmission_oil: number;
  hydraulic_oil:    number;
  other_oil:        number;
  filter_issues:    string;
  hr_km_reading:    number;
  meter_unit:       string;
  remarks:          string;
  is_chargeable:    boolean;  // true only when Working (A)
  existing_id?:     string;
}

function emptyRow(eq: any): LogRow {
  // Map equipment status to daily log status
  const eqStatus = eq.operational_status;
  const dayStatus: DayStatus =
    eqStatus === "Working"    ? "A" :
    eqStatus === "Storage"    ? "S" :
    eqStatus === "Break Down" || eqStatus === "Under Repair" ? "N" : "";

  return {
    equipment_id:     eq.id,
    fleet_no:         eq.fleet_number,
    equipment_name:   eq.name || "",
    hire_rate:        eq.hire_rate || 0,
    status:           dayStatus,
    storage_hours:    dayStatus === "S" ? 8 : 0,
    working_hours:    dayStatus === "A" ? 8 : 0,
    breakdown_hours:  dayStatus === "N" ? 8 : 0,
    fuel_quantity:    0, fuel_type: "AGO",
    engine_oil:       0, transmission_oil: 0, hydraulic_oil: 0, other_oil: 0,
    filter_issues:    "", hr_km_reading: 0, meter_unit: eq.meter_device || "Hours",
    remarks:          "",
    is_chargeable:    dayStatus === "A", // ONLY working = chargeable
  };
}

// ─────────────────────────────────────────────────────────────
// PRINT FUNCTION — PLT-02
// ─────────────────────────────────────────────────────────────
function printDailyLog(rows: LogRow[], site: string, costCode: string, date: string,
  clerk: string, admin: string, engineer: string) {

  const totals = rows.reduce((acc, r) => ({
    storage:   acc.storage   + (r.storage_hours   || 0),
    working:   acc.working   + (r.working_hours   || 0),
    breakdown: acc.breakdown + (r.breakdown_hours || 0),
    fuel:      acc.fuel      + (r.fuel_quantity   || 0),
    eo:        acc.eo        + (r.engine_oil      || 0),
    to:        acc.to        + (r.transmission_oil|| 0),
    ho:        acc.ho        + (r.hydraulic_oil   || 0),
    other:     acc.other     + (r.other_oil       || 0),
  }), {storage:0,working:0,breakdown:0,fuel:0,eo:0,to:0,ho:0,other:0});

  const rowsHtml = rows.map((r,i) => `
    <tr>
      <td>${i+1}</td><td><b>${r.fleet_no}</b></td>
      <td>${r.storage_hours||""}</td>
      <td>${r.working_hours||""}</td>
      <td>${r.breakdown_hours||""}</td>
      <td><b>${r.storage_hours||0}/${r.working_hours||0}/${r.breakdown_hours||0}</b></td>
      <td>${r.fuel_quantity||""}</td><td>${r.fuel_type}</td>
      <td>${r.engine_oil||""}</td><td>${r.transmission_oil||""}</td>
      <td>${r.hydraulic_oil||""}</td><td>${r.other_oil||""}</td>
      <td>${r.filter_issues||""}</td>
      <td>${r.hr_km_reading||""}</td><td>${r.meter_unit}</td>
      <td>${r.remarks||""}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><title>PLT-02 — ${site} — ${date}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:9px;padding:10px}
    .header{text-align:center;margin-bottom:8px}
    .header h2{font-size:14px;font-weight:bold}
    .header h3{font-size:11px}
    .info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;font-size:9px}
    .info div{display:flex;gap:4px}
    .info label{font-weight:bold;white-space:nowrap}
    table{width:100%;border-collapse:collapse;font-size:8px}
    th,td{border:1px solid #999;padding:2px 3px;text-align:center}
    th{background:#e2e8f0;font-weight:bold}
    .total-row{background:#f8fafc;font-weight:bold}
    .sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px;font-size:9px}
    .sig-box{border:1px solid #ccc;padding:8px;border-radius:4px}
    .sig-box p{margin-top:4px}
    .sig-line{border-top:1px solid #999;margin-top:20px;padding-top:4px}
    @media print{@page{margin:0.5cm;size:A4 landscape}}
  </style></head><body>
  <div class="header">
    <h2>HARTLAND NIGERIA LIMITED</h2>
    <h3>PLANT - DAILY SITE DATA REPORT</h3>
  </div>
  <div class="info">
    <div><label>Area / Project:</label> <span>${site}</span></div>
    <div><label>Date:</label> <span>${date}</span></div>
    <div></div>
    <div><label>Location:</label> <span>${site}</span></div>
    <div><label>Cost Code:</label> <span>${costCode}</span></div>
    <div><label>Serial No.:</label> <span></span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">S/No</th><th rowspan="2">Fleet No.</th>
        <th colspan="3">Availability Hours</th>
        <th rowspan="2">Availability<br>Status</th>
        <th colspan="2">Fuel</th>
        <th colspan="4">Oil</th>
        <th rowspan="2">Filter<br>Issues</th>
        <th colspan="2">Hr Meter / Km</th>
        <th rowspan="2">Remarks</th>
      </tr>
      <tr>
        <th>S (Storage)</th><th>A (Working)</th><th>N (Brkdn)</th>
        <th>Fuel Qty (Ltrs)</th><th>Fuel Type</th>
        <th>E.O (Ltr)</th><th>T.O (Ltr)</th><th>H.O (Ltr)</th><th>Other (Ltr)</th>
        <th>Hr/Km</th><th>Unit</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="2"><b>Total:</b></td>
        <td>${totals.storage}</td><td>${totals.working}</td><td>${totals.breakdown}</td>
        <td>${totals.storage}/${totals.working}/${totals.breakdown}</td>
        <td>${totals.fuel}</td><td></td>
        <td>${totals.eo}</td><td>${totals.to}</td><td>${totals.ho}</td><td>${totals.other}</td>
        <td colspan="4"></td>
      </tr>
    </tbody>
  </table>
  <div class="sig">
    <div class="sig-box"><b>REPORTING CLERK</b>
      <p>Name: ${clerk}</p><p>Staff No.: ___________</p>
      <div class="sig-line">Signature:</div>
    </div>
    <div class="sig-box"><b>CHECK BY (PLANT ADMIN. OFFICER)</b>
      <p>Name: ${admin}</p><p>Staff No.: ___________</p>
      <div class="sig-line">Signature:</div>
    </div>
    <div class="sig-box"><b>PLANT ENGINEER / SUPERVISOR (i/c)</b>
      <p>Name: ${engineer}</p><p>Staff No.: ___________</p>
      <div class="sig-line">Signature:</div>
    </div>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`;

  const w = window.open("","_blank","width=1100,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─────────────────────────────────────────────────────────────
// EQUIPMENT HISTORY TAB
// ─────────────────────────────────────────────────────────────
function EquipmentHistoryTab({ userSite }: { userSite: string }) {
  const [equipment,   setEquipment]   = useState<any[]>([]);
  const [selectedEq,  setSelectedEq]  = useState("");
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear,  setFilterYear]  = useState(new Date().getFullYear());
  const [logs,        setLogs]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await dbu.from("equipment")
        .select("id,fleet_number,name,category,hire_rate,operational_status")
        .eq("site", userSite)
        .order("fleet_number");
      setEquipment(data || []);
    }
    if (userSite) load();
  }, [userSite]);

  async function loadHistory() {
    if (!selectedEq) return;
    setLoading(true);
    const { data } = await dbu.from("daily_logs")
      .select("*")
      .eq("fleet_no", selectedEq)
      .eq("month", filterMonth)
      .eq("year", filterYear)
      .order("log_date", { ascending: true });
    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => { if (selectedEq) loadHistory(); }, [selectedEq, filterMonth, filterYear]); // eslint-disable-line

  const workingDays = logs.filter(l => l.is_chargeable).length;
  const totalFuel   = logs.reduce((s,l) => s + (l.fuel_quantity||0), 0);
  const totalCharge = workingDays * (logs[0]?.hire_rate || 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <select className={iCls} value={selectedEq} onChange={e => setSelectedEq(e.target.value)}>
          <option value="">Select equipment...</option>
          {equipment.map((e:any) => (
            <option key={e.id} value={e.fleet_number}>{e.fleet_number} — {e.name}</option>
          ))}
        </select>
        <select className={iCls} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className={iCls} value={String(filterYear)} onChange={e => setFilterYear(parseInt(e.target.value))}>
          {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <button onClick={loadHistory}
          className="bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-900">
          View History
        </button>
      </div>

      {selectedEq && logs.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-emerald-700">{workingDays}</p>
              <p className="text-sm text-emerald-600 mt-1 font-semibold">Working Days (Chargeable)</p>
              <p className="text-xs text-emerald-500 mt-0.5">out of {logs.length} logged days</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-2xl font-bold text-amber-700">₦{totalCharge.toLocaleString("en-NG")}</p>
              <p className="text-sm text-amber-600 mt-1 font-semibold">Rental Charge (so far)</p>
              <p className="text-xs text-amber-500 mt-0.5">{workingDays} days × ₦{(logs[0]?.hire_rate||0).toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-blue-700">{totalFuel.toLocaleString()}</p>
              <p className="text-sm text-blue-600 mt-1 font-semibold">Total Fuel (Ltrs)</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{selectedEq} — {filterMonth} {filterYear}</h3>
            </div>
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {["Date","Status","Storage Hrs","Working Hrs","Breakdown Hrs",
                      "Fuel (L)","Chargeable","Remarks"].map(h => (
                      <th key={h} className={cellCls + " font-bold text-slate-500 uppercase"}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l:any) => (
                    <tr key={l.id} className={l.is_chargeable ? "bg-emerald-50/40" : ""}>
                      <td className={cellCls + " font-medium"}>
                        {new Date(l.log_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
                      </td>
                      <td className={cellCls}>
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          l.working_hours > 0   ? "bg-emerald-100 text-emerald-700" :
                          l.breakdown_hours > 0 ? "bg-red-100 text-red-600" :
                                                   "bg-slate-100 text-slate-600"
                        }`}>
                          {l.working_hours > 0 ? "Working" : l.breakdown_hours > 0 ? "Breakdown" : "Storage"}
                        </span>
                      </td>
                      <td className={cellCls}>{l.idle_hours||l.storage_hours||"—"}</td>
                      <td className={cellCls}>{l.working_hours||"—"}</td>
                      <td className={cellCls}>{l.breakdown_hours||"—"}</td>
                      <td className={cellCls}>{l.fuel_quantity||"—"}</td>
                      <td className={cellCls}>
                        {l.is_chargeable
                          ? <span className="text-emerald-600 font-bold">✓ Yes</span>
                          : <span className="text-red-400">✗ No</span>}
                      </td>
                      <td className={cellCls}>{l.remarks||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedEq && !loading && logs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          No logs found for {selectedEq} in {filterMonth} {filterYear}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN DAILY LOGS PAGE
// ─────────────────────────────────────────────────────────────
export default function DailyLogsPage() {
  const [tab,           setTab]           = useState<"sheet"|"history">("sheet");
  const [profile,       setProfile]       = useState<any>(null);
  const [userSite,      setUserSite]      = useState("");
  const [sites,         setSites]         = useState<any[]>([]);
  const [equipment,     setEquipment]     = useState<any[]>([]);
  const [rows,          setRows]          = useState<LogRow[]>([]);
  const [logDate,       setLogDate]       = useState(new Date().toISOString().slice(0,10));
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [clerk,         setClerk]         = useState("");
  const [adminOfficer,  setAdminOfficer]  = useState("");
  const [engineer,      setEngineer]      = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await dbu.auth.getUser();
      if (!user) return;
      const { data: prof } = await dbu.from("profiles").select("*").eq("id", user.id).single();
      if (!prof) return;
      setProfile(prof);
      setClerk(prof.full_name || "");

      const roles: string[] = prof.roles || [];
      const isAdmin = roles.some((r:string) =>
        ["plant_manager","plant_director","plant_admin","plant_engineer","super_admin"].includes(r));

      const { data: sitesData } = await dbu.from("sites").select("code,name,cost_code").order("name");
      setSites(sitesData || []);

      if (isAdmin) {
        const firstSite = prof.assigned_sites?.[0] || sitesData?.[0]?.name || "";
        setUserSite(firstSite);
      } else {
        setUserSite(prof.assigned_sites?.[0] || "");
      }
    }
    if (!initialized.current) { initialized.current = true; init(); }
  }, []);

  useEffect(() => {
    if (!userSite) return;
    loadEquipmentAndLogs();
  }, [userSite, logDate]); // eslint-disable-line

  async function loadEquipmentAndLogs() {
    const { data: eq } = await dbu.from("equipment")
      .select("id,fleet_number,name,category,hire_rate,operational_status,meter_device")
      .eq("site", userSite)
      .neq("operational_status", "Scrapped")
      .order("fleet_number");

    const equipList = eq || [];
    setEquipment(equipList);

    const { data: existing } = await dbu.from("daily_logs")
      .select("*")
      .eq("site", userSite)
      .eq("log_date", logDate);

    const builtRows: LogRow[] = equipList.map((e: any) => {
      const found = (existing || []).find((l: any) => l.fleet_no === e.fleet_number);
      if (found) {
        return {
          equipment_id:     e.id,
          fleet_no:         e.fleet_number,
          equipment_name:   e.name || "",
          hire_rate:        found.hire_rate || e.hire_rate || 0,
          status:           found.working_hours > 0 ? "A" : found.breakdown_hours > 0 ? "N" : "S",
          storage_hours:    found.idle_hours || found.storage_hours || 0,
          working_hours:    found.working_hours || 0,
          breakdown_hours:  found.breakdown_hours || 0,
          fuel_quantity:    found.fuel_quantity || 0,
          fuel_type:        found.fuel_type || "AGO",
          engine_oil:       found.engine_oil || 0,
          transmission_oil: found.transmission_oil || 0,
          hydraulic_oil:    found.hydraulic_oil || 0,
          other_oil:        found.other_oil || 0,
          filter_issues:    found.filter_issues || "",
          hr_km_reading:    found.hr_km_reading || 0,
          meter_unit:       found.meter_unit || e.meter_device || "Hours",
          remarks:          found.remarks || "",
          is_chargeable:    found.is_chargeable || false,
          existing_id:      found.id,
        };
      }
      return emptyRow(e);
    });

    setRows(builtRows);
    setSaved(false);
  }

  function updateRow(idx: number, field: keyof LogRow, value: any) {
    setRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      // Working hours > 0 = chargeable. Storage and Breakdown = NOT chargeable
      if (field === "working_hours") {
        updated[idx].is_chargeable = Number(value) > 0;
      }

      if (field === "status") {
        if (value === "A") {
          // Working — chargeable
          updated[idx].working_hours   = 8;
          updated[idx].storage_hours   = 0;
          updated[idx].breakdown_hours = 0;
          updated[idx].is_chargeable   = true;
        } else if (value === "S") {
          // Storage — NOT chargeable (charge = 0)
          updated[idx].storage_hours   = 8;
          updated[idx].working_hours   = 0;
          updated[idx].breakdown_hours = 0;
          updated[idx].is_chargeable   = false;
        } else if (value === "N") {
          // Breakdown — NOT chargeable (charge = 0)
          updated[idx].breakdown_hours = 8;
          updated[idx].working_hours   = 0;
          updated[idx].storage_hours   = 0;
          updated[idx].is_chargeable   = false;
        }
      }
      return updated;
    });
  }

  async function saveLog() {
    if (!userSite || rows.length === 0) return;
    setSaving(true);

    const month = MONTHS[new Date(logDate).getMonth()];
    const year  = new Date(logDate).getFullYear();
    const siteRec  = sites.find(s => s.name === userSite);
    const costCode = siteRec?.cost_code || siteRec?.code || "";

    for (const row of rows) {
      const payload = {
        site:             userSite,
        cost_code:        costCode,
        area_project:     userSite,
        log_date:         logDate,
        month, year,
        log_type:         "Plant",
        equipment_id:     row.equipment_id,
        fleet_no:         row.fleet_no,
        equipment_name:   row.equipment_name,
        hire_rate:        row.hire_rate,
        // Save storage hours as idle_hours for DB compatibility
        idle_hours:       row.storage_hours,
        working_hours:    row.working_hours,
        breakdown_hours:  row.breakdown_hours,
        // S/A/N availability status
        availability_status: row.status === "A" ? "A" : row.status === "N" ? "N" : "S",
        // CHARGE LOGIC: Working = 1 (chargeable), Storage = 0, Breakdown = 0
        is_chargeable:    row.is_chargeable,
        fuel_quantity:    row.fuel_quantity,
        fuel_type:        row.fuel_type,
        engine_oil:       row.engine_oil,
        transmission_oil: row.transmission_oil,
        hydraulic_oil:    row.hydraulic_oil,
        other_oil:        row.other_oil,
        filter_issues:    row.filter_issues,
        hr_km_reading:    row.hr_km_reading,
        meter_unit:       row.meter_unit,
        remarks:          row.remarks,
        reporting_clerk:  clerk,
        plant_admin_officer: adminOfficer,
        plant_engineer:   engineer,
      };

      if (row.existing_id) {
        await dbu.from("daily_logs").update(payload).eq("id", row.existing_id);
      } else {
        await dbu.from("daily_logs").insert([payload]);
      }
    }

    setSaving(false);
    setSaved(true);
    await loadEquipmentAndLogs();
  }

  const totals = rows.reduce((acc, r) => ({
    storage:   acc.storage   + (r.storage_hours   || 0),
    working:   acc.working   + (r.working_hours   || 0),
    breakdown: acc.breakdown + (r.breakdown_hours || 0),
    fuel:      acc.fuel      + (r.fuel_quantity   || 0),
    eo:        acc.eo        + (r.engine_oil      || 0),
    to:        acc.to        + (r.transmission_oil|| 0),
    ho:        acc.ho        + (r.hydraulic_oil   || 0),
    other:     acc.other     + (r.other_oil       || 0),
  }), {storage:0,working:0,breakdown:0,fuel:0,eo:0,to:0,ho:0,other:0});

  const workingCount   = rows.filter(r => r.is_chargeable).length;
  const storageCount   = rows.filter(r => !r.is_chargeable && r.storage_hours > 0).length;
  const breakdownCount = rows.filter(r => r.breakdown_hours > 0).length;

  const roles: string[] = profile?.roles || [];
  const isAdmin = roles.some((r:string) =>
    ["plant_manager","plant_director","plant_admin","plant_engineer","super_admin"].includes(r));

  const selectedDate = new Date(logDate).toLocaleDateString("en-GB",{
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });

  const numInput  = "w-12 border border-slate-200 rounded text-center text-xs p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400";
  const textInput = "w-20 border border-slate-200 rounded text-xs p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400";

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">PLT-02</p>
          <h1 className="text-3xl font-bold text-slate-900">Daily Site Data Report</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {userSite ? `Logging for: ${userSite}` : "No site assigned to your profile yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          {saved && (
            <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">
              ✓ Saved
            </span>
          )}
          {rows.length > 0 && (
            <button
              onClick={() => printDailyLog(rows, userSite,
                sites.find(s=>s.name===userSite)?.cost_code || "",
                logDate, clerk, adminOfficer, engineer)}
              className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">
              🖨 Print PLT-02
            </button>
          )}
          {rows.length > 0 && (
            <button onClick={saveLog} disabled={saving}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 shadow-sm">
              {saving ? "Saving..." : "💾 Save Log"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[["sheet","📋 Log Sheet"],["history","📊 Equipment History"]].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <EquipmentHistoryTab userSite={userSite} />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Site</label>
                {isAdmin ? (
                  <select className={iCls} value={userSite} onChange={e => setUserSite(e.target.value)}>
                    <option value="">Select site...</option>
                    {sites.map((s:any) => (
                      <option key={s.code} value={s.name}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-700 font-medium">
                    {userSite || "No site assigned"}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date</label>
                <input type="date" className={iCls} value={logDate} onChange={e => setLogDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Cost Code</label>
                <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 font-mono text-slate-700">
                  {sites.find(s => s.name === userSite)?.cost_code || "—"}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Equipment at Site</label>
                <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 font-bold text-amber-600">
                  {equipment.length} units
                </div>
              </div>
            </div>
          </div>

          {userSite && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white rounded-2xl p-4">
                <p className="text-2xl font-bold">{equipment.length}</p>
                <p className="text-xs opacity-70 mt-1">Total Equipment</p>
                <p className="text-xs opacity-50 mt-0.5">{selectedDate}</p>
              </div>
              <div className="bg-emerald-600 text-white rounded-2xl p-4">
                <p className="text-2xl font-bold">{workingCount}</p>
                <p className="text-xs opacity-70 mt-1">Working (Chargeable)</p>
              </div>
              <div className="bg-slate-500 text-white rounded-2xl p-4">
                <p className="text-2xl font-bold">{storageCount}</p>
                <p className="text-xs opacity-70 mt-1">Storage (Not Charged)</p>
              </div>
              <div className="bg-red-500 text-white rounded-2xl p-4">
                <p className="text-2xl font-bold">{breakdownCount}</p>
                <p className="text-xs opacity-70 mt-1">Breakdown (Not Charged)</p>
              </div>
            </div>
          )}

          {userSite && rows.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">PLANT - DAILY SITE DATA REPORT</p>
                    <p className="text-xs text-slate-500 mt-0.5">{userSite} · {selectedDate}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Cost Code: {sites.find(s=>s.name===userSite)?.cost_code || "—"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className={cellCls + " w-8"}  rowSpan={2}>S/No</th>
                      <th className={cellCls + " w-24"} rowSpan={2}>Fleet No.</th>
                      <th className={cellCls} colSpan={3}>Availability Hours</th>
                      <th className={cellCls + " w-24"} rowSpan={2}>Status</th>
                      <th className={cellCls} colSpan={2}>Fuel</th>
                      <th className={cellCls} colSpan={4}>Oil (Ltrs)</th>
                      <th className={cellCls + " w-24"} rowSpan={2}>Filter Issues</th>
                      <th className={cellCls} colSpan={2}>Hr Meter / Km</th>
                      <th className={cellCls + " w-28"} rowSpan={2}>Remarks</th>
                    </tr>
                    <tr>
                      <th className={cellCls + " w-10"}>S (Storage)</th>
                      <th className={cellCls + " w-10"}>A (Working)</th>
                      <th className={cellCls + " w-10"}>N (Brkdn)</th>
                      <th className={cellCls + " w-16"}>Qty (L)</th>
                      <th className={cellCls + " w-16"}>Type</th>
                      <th className={cellCls + " w-12"}>E.O</th>
                      <th className={cellCls + " w-12"}>T.O</th>
                      <th className={cellCls + " w-12"}>H.O</th>
                      <th className={cellCls + " w-12"}>Other</th>
                      <th className={cellCls + " w-16"}>Hr/Km</th>
                      <th className={cellCls + " w-14"}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.equipment_id}
                        className={`border-b border-slate-100 transition-colors ${
                          row.is_chargeable     ? "bg-emerald-50/40" :
                          row.breakdown_hours > 0 ? "bg-red-50/30" :
                          row.storage_hours > 0   ? "bg-slate-50/60" : ""
                        }`}>
                        <td className={cellCls + " text-center text-slate-400"}>{idx+1}</td>
                        <td className={cellCls}>
                          <span className="font-bold text-amber-600 font-mono">{row.fleet_no}</span>
                        </td>

                        {/* S (Storage) hours */}
                        <td className={cellCls + " text-center"}>
                          <input type="number" className={numInput}
                            value={row.storage_hours || ""}
                            onChange={e => updateRow(idx,"storage_hours",parseFloat(e.target.value)||0)}
                            placeholder="0" min={0} />
                        </td>
                        {/* A (Working) hours */}
                        <td className={cellCls + " text-center"}>
                          <input type="number" className={numInput + " border-emerald-300"}
                            value={row.working_hours || ""}
                            onChange={e => updateRow(idx,"working_hours",parseFloat(e.target.value)||0)}
                            placeholder="0" min={0} />
                        </td>
                        {/* N (Breakdown) hours */}
                        <td className={cellCls + " text-center"}>
                          <input type="number" className={numInput + " border-red-200"}
                            value={row.breakdown_hours || ""}
                            onChange={e => updateRow(idx,"breakdown_hours",parseFloat(e.target.value)||0)}
                            placeholder="0" min={0} />
                        </td>

                        {/* Status quick-select — S replaces I */}
                        <td className={cellCls + " text-center"}>
                          <select
                            className="text-xs border border-slate-200 rounded px-1 py-0.5 w-22"
                            value={row.status}
                            onChange={e => updateRow(idx,"status",e.target.value as DayStatus)}>
                            <option value="">—</option>
                            <option value="A">A - Working</option>
                            <option value="S">S - Storage</option>
                            <option value="N">N - Breakdown</option>
                          </select>
                        </td>

                        {/* Fuel */}
                        <td className={cellCls + " text-center"}>
                          <input type="number" className={numInput}
                            value={row.fuel_quantity || ""}
                            onChange={e => updateRow(idx,"fuel_quantity",parseFloat(e.target.value)||0)}
                            placeholder="0" min={0} />
                        </td>
                        <td className={cellCls + " text-center"}>
                          <select className="text-xs border border-slate-200 rounded px-1 py-0.5 w-14"
                            value={row.fuel_type}
                            onChange={e => updateRow(idx,"fuel_type",e.target.value)}>
                            {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
                          </select>
                        </td>

                        {/* Oil */}
                        {(["engine_oil","transmission_oil","hydraulic_oil","other_oil"] as const).map(field => (
                          <td key={field} className={cellCls + " text-center"}>
                            <input type="number" className={numInput}
                              value={row[field] || ""}
                              onChange={e => updateRow(idx,field,parseFloat(e.target.value)||0)}
                              placeholder="0" min={0} />
                          </td>
                        ))}

                        {/* Filter issues */}
                        <td className={cellCls}>
                          <input type="text" className={textInput}
                            value={row.filter_issues}
                            onChange={e => updateRow(idx,"filter_issues",e.target.value)}
                            placeholder="—" />
                        </td>

                        {/* Hr/Km — no miles */}
                        <td className={cellCls + " text-center"}>
                          <input type="number" className={numInput}
                            value={row.hr_km_reading || ""}
                            onChange={e => updateRow(idx,"hr_km_reading",parseFloat(e.target.value)||0)}
                            placeholder="0" min={0} />
                        </td>
                        <td className={cellCls + " text-center"}>
                          <select className="text-xs border border-slate-200 rounded px-1 py-0.5 w-14"
                            value={row.meter_unit}
                            onChange={e => updateRow(idx,"meter_unit",e.target.value)}>
                            {METER_UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>

                        {/* Remarks */}
                        <td className={cellCls}>
                          <input type="text" className={textInput + " w-28"}
                            value={row.remarks}
                            onChange={e => updateRow(idx,"remarks",e.target.value)}
                            placeholder="—" />
                        </td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <td className={cellCls} colSpan={2}><span className="text-slate-700">Total:</span></td>
                      <td className={cellCls + " text-center text-slate-600"}>{totals.storage}</td>
                      <td className={cellCls + " text-center text-emerald-700"}>{totals.working}</td>
                      <td className={cellCls + " text-center text-red-600"}>{totals.breakdown}</td>
                      <td className={cellCls + " text-center text-slate-500 text-[10px]"}>
                        {totals.storage}/{totals.working}/{totals.breakdown}
                      </td>
                      <td className={cellCls + " text-center"}>{totals.fuel}</td>
                      <td className={cellCls}></td>
                      <td className={cellCls + " text-center"}>{totals.eo}</td>
                      <td className={cellCls + " text-center"}>{totals.to}</td>
                      <td className={cellCls + " text-center"}>{totals.ho}</td>
                      <td className={cellCls + " text-center"}>{totals.other}</td>
                      <td className={cellCls} colSpan={4}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatories */}
              <div className="grid grid-cols-3 gap-6 p-6 border-t border-slate-100 bg-slate-50">
                {[
                  ["Reporting Clerk", clerk, setClerk],
                  ["Plant Admin Officer", adminOfficer, setAdminOfficer],
                  ["Plant Engineer / Supervisor", engineer, setEngineer],
                ].map(([label, value, setter]: any) => (
                  <div key={label} className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</p>
                    <input className={iCls} placeholder="Name" value={value}
                      onChange={e => setter(e.target.value)} />
                    <div className="border-b-2 border-slate-300 pt-6">
                      <p className="text-xs text-slate-400">Signature</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : userSite ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <p className="text-lg font-semibold text-slate-600">No equipment at {userSite}</p>
              <p className="text-sm mt-1">Equipment will appear here once assigned to this site.</p>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <p className="text-lg font-semibold text-slate-600">No site assigned</p>
              <p className="text-sm mt-1">Ask your Plant Manager to assign you to a site in User Management.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}