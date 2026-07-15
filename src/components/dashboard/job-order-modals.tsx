/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

export const STATUS_STYLE: Record<string, string> = {
  "Pending":        "bg-amber-100 text-amber-700",
  "Awaiting Parts": "bg-orange-100 text-orange-700",
  "In Progress":    "bg-blue-100 text-blue-700",
  "Completed":      "bg-emerald-100 text-emerald-700",
  "Cancelled":      "bg-red-100 text-red-600",
};

export const TYPE_STYLE: Record<string, string> = {
  "Breakdown":   "bg-red-100 text-red-700",
  "Scheduled":   "bg-blue-100 text-blue-700",
  "Preventive":  "bg-purple-100 text-purple-700",
  "Third Party": "bg-orange-100 text-orange-700",
};

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

function F({ label, required, span, children }: {
  label: string; required?: boolean; span?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// Small helper — hours between two datetime-local strings, 2dp.
function hoursBetween(timeIn?: string, timeOut?: string): number {
  if (!timeIn || !timeOut) return 0;
  const a = new Date(timeIn).getTime();
  const b = new Date(timeOut).getTime();
  if (!a || !b || b <= a) return 0;
  return Math.round(((b - a) / 3600000) * 100) / 100;
}

// datetime-local input needs "YYYY-MM-DDTHH:mm", not a full ISO string
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────
// PRINT PLT-06 JOB ORDER FORM
// ─────────────────────────────────────────────────────────────
export function printJobOrder(r: any) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>PLT-06 Job Order</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
    h1 { font-size: 18px; text-align: center; margin: 0; }
    h2 { font-size: 12px; text-align: center; color: #444; margin: 4px 0 12px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
    .logo { font-weight: bold; font-size: 16px; color: #c00; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
    .field { border-bottom: 1px solid #000; padding: 2px 0; min-height: 18px; }
    .label { font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; }
    .section { border: 1px solid #999; border-radius: 4px; padding: 8px; margin-bottom: 10px; }
    .section-title { font-weight: bold; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px; }
    .sig-line { border-top: 1px solid #000; padding-top: 4px; text-align: center; font-size: 10px; }
    .repair-lines { border-bottom: 1px solid #ddd; min-height: 20px; margin-bottom: 4px; }
    @media print { body { margin: 0; } }
  </style></head><body>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:10px;color:#000">NIGERIA LIMITED</span></div>
    <div style="text-align:center"><h1>Job Order Form</h1><h2>PLANT MANAGEMENT SYSTEM PLT - 06</h2>
      <div class="grid2" style="font-size:10px">
        <div><span class="label">Serial No.:</span> <span class="field">${r.job_order_no||""}</span></div>
        <div><span class="label">Date:</span> <span class="field">${new Date(r.created_at||Date.now()).toLocaleDateString("en-GB")}</span></div>
      </div>
    </div>
    <div style="font-size:10px;text-align:right">Job Card Serial No.:<br><span style="font-size:12px;font-weight:bold">${r.job_order_no||""}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Ordering Person: <span style="border-bottom:1px solid #000;padding:0 40px">${r.reported_by||""}</span></div>
    <div class="grid2">
      <div>
        <div class="section-title" style="font-size:10px">Sending Site</div>
        <div class="label">Area / Project:</div><div class="field">${r.site||""}</div>
        <div class="label">Location:</div><div class="field">${r.site||""}</div>
      </div>
      <div>
        <div class="section-title" style="font-size:10px">Receiving Workshop</div>
        <div class="label">Area / Project:</div><div class="field">${r.receiving_workshop||""}</div>
        <div class="label">Location:</div><div class="field">${r.receiving_workshop||""}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Charge Information:
      <span style="margin-left:20px">☐ Hartland Internal &nbsp;&nbsp; ☐ External 3rd Party</span>
    </div>
    <div class="grid2">
      <div><div class="label">Area / Project:</div><div class="field">${r.site||""}</div></div>
      <div><div class="label">Charge To:</div><div class="field">${r.charge_to||""}</div></div>
      <div><div class="label">Location:</div><div class="field">${r.site||""}</div></div>
      <div><div class="label">Cost Code:</div><div class="field">${r.cost_code||""}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Fleet Information: <span style="margin-left:10px">☐ 3rd Party</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div><div class="label">Fleet No.:</div><div class="field">${r.equipment_code||""}</div></div>
      <div><div class="label">Veh. Reg. No.:</div><div class="field">${r.reg_no||""}</div></div>
      <div><div class="label">Machine:</div><div class="field">${r.equipment_name||""}</div></div>
      <div><div class="label">Machine Model:</div><div class="field">${r.machine_model||""}</div></div>
      <div><div class="label">Machine Make:</div><div class="field">${r.machine_make||""}</div></div>
      <div><div class="label">Machine Arr. No.:</div><div class="field"></div></div>
      <div><div class="label">Engine No.:</div><div class="field">${r.engine_no||""}</div></div>
      <div><div class="label">Engine Make:</div><div class="field">${r.engine_make||""}</div></div>
      <div><div class="label">Engine Arr. No.:</div><div class="field"></div></div>
      <div><div class="label">Engine Model:</div><div class="field">${r.engine_model||""}</div></div>
      <div><div class="label">Km/Hours Reading:</div><div class="field"></div></div>
      <div><div class="label">Chassis No.:</div><div class="field">${r.chassis_no||""}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Repairs Required:</div>
    ${[r.issue||"","","",""].map(()=>`<div class="repair-lines"></div>`).join("")}
    <div style="margin-top:8px"><div class="label">Approved by:</div>
    <div class="sig-row">
      <div class="sig-line">Name</div>
      <div class="sig-line">Date</div>
      <div class="sig-line">Signature</div>
    </div></div>
  </div>

  <div class="section">
    <div class="section-title">Repairs Carried Out:</div>
    ${["","","",""].map(()=>`<div class="repair-lines"></div>`).join("")}
    <div style="margin-top:8px"><div class="label">Remarks:</div>
    ${["","",""].map(()=>`<div class="repair-lines"></div>`).join("")}</div>
    <div style="margin-top:8px"><div class="label">Mechanics In-Charge of Repairs:</div>
    <div class="sig-row">
      <div class="sig-line">Name</div><div class="sig-line">Date</div><div class="sig-line">Signature</div>
    </div></div>
    <div class="grid2" style="margin-top:12px">
      <div><div class="label">Repair Start Date:</div><div class="field">${r.repair_start_date||""}</div></div>
      <div><div class="label">Repair Completion Date:</div><div class="field">${r.completion_date||""}</div></div>
    </div>
    <div style="margin-top:12px"><div class="label">Authorized By / Foreman / Supervisor:</div>
    <div class="sig-row">
      <div class="sig-line">Name</div><div class="sig-line">Date</div><div class="sig-line">Signature</div>
    </div></div>
    <div style="margin-top:12px"><div class="label">Plant Engineer:</div>
    <div class="sig-row">
      <div class="sig-line">Name</div><div class="sig-line">Date</div><div class="sig-line">Signature</div>
    </div></div>
  </div>

  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  w.document.close();
}

// ─────────────────────────────────────────────────────────────
// PRINT PLT-05 JOB CARD FORM — now with real technician rows
// ─────────────────────────────────────────────────────────────
export function printJobCard(r: any) {
  const parts = r.parts_used || [];
  const techs = r.technicians_used || [];
  const w = window.open("", "_blank", "width=1100,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>PLT-05 Job Card</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 15px; }
    h1 { font-size: 16px; text-align: center; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .logo { font-weight: bold; font-size: 14px; color: #c00; }
    .field { border-bottom: 1px solid #000; min-height: 16px; padding: 1px 0; }
    .label { font-size: 8px; color: #555; font-weight: bold; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #eee; border: 1px solid #999; padding: 3px 5px; text-align: left; font-size: 8px; text-transform: uppercase; }
    td { border: 1px solid #ccc; padding: 3px 5px; height: 16px; }
    .totals-row td { font-weight: bold; background: #f5f5f5; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 15px; }
    .sig-line { border-top: 1px solid #000; padding-top: 3px; text-align: center; font-size: 9px; }
    @media print { body { margin: 5px; } }
  </style></head><body>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span><br><span style="font-size:8px;font-weight:normal">RC280974</span></div>
    <div style="text-align:center"><h1>JOB CARD FORM</h1><div style="font-size:9px;color:#555">PLANT MANAGEMENT SYSTEM PLT - 05</div></div>
    <div style="font-size:9px">
      <div><span class="label">Area/Project:</span> <span class="field" style="display:inline-block;width:120px">${r.site||""}</span></div>
      <div><span class="label">Location/Cost Centre:</span> <span class="field" style="display:inline-block;width:120px">${r.site||""}</span></div>
      <div><span class="label">Workshop Cost Code:</span> <span class="field" style="display:inline-block;width:120px">${r.cost_code||""}</span></div>
      <div><span class="label">Job Order Form No.:</span> <span class="field" style="display:inline-block;width:120px">${r.job_order_no||""}</span></div>
      <div><span class="label">Job Card Serial No.:</span> <span class="field" style="display:inline-block;width:120px">${r.job_order_no||""}</span></div>
      <div><span class="label">Creation Date:</span> <span class="field" style="display:inline-block;width:120px">${new Date(r.created_at||Date.now()).toLocaleDateString("en-GB")}</span></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px">
    <div><div class="label">Sending Area:</div><div class="field">${r.site||""}</div></div>
    <div><div class="label">Location:</div><div class="field">${r.site||""}</div></div>
    <div><div class="label">Fleet / Job No.:</div><div class="field">${r.equipment_code||""}</div></div>
    <div><div class="label">Registration No.:</div><div class="field">${r.reg_no||""}</div></div>
    <div><div class="label">Date In:</div><div class="field">${r.date_in ? new Date(r.date_in).toLocaleDateString("en-GB") : ""}</div></div>
    <div><div class="label">Date Out:</div><div class="field">${r.date_out ? new Date(r.date_out).toLocaleDateString("en-GB") : ""}</div></div>
    <div><div class="label">Make:</div><div class="field">${r.machine_make||""}</div></div>
    <div><div class="label">Model:</div><div class="field">${r.machine_model||""}</div></div>
    <div><div class="label">Hour/Km Reading:</div><div class="field"></div></div>
    <div><div class="label">Defect:</div><div class="field">${r.defect ? "☑" : "☐"}</div></div>
  </div>

  <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px">
    <div>
      <table>
        <thead>
          <tr>
            <th style="width:25px">S/N</th><th style="width:50px">Date</th>
            <th style="width:40px">Code</th><th style="width:50px">SIV No.</th>
            <th>Description</th><th style="width:60px">Part/Serial No.</th>
            <th style="width:30px">Qty</th><th style="width:30px">Unit</th>
            <th style="width:60px">Unit Price</th><th style="width:60px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${parts.map((p:any, i:number) => `<tr>
            <td>${i+1}</td><td></td><td></td><td>${p.siv_no||""}</td>
            <td>${p.name||""}</td><td>${p.part_serial||""}</td>
            <td>${p.qty||""}</td><td>${p.unit||""}</td>
            <td>${p.cost?`₦${Number(p.cost).toLocaleString()}`:""}</td>
            <td>${p.cost&&p.qty?`₦${(p.cost*p.qty).toLocaleString()}`:""}</td>
          </tr>`).join("")}
          ${Array.from({length: Math.max(0, 10-parts.length)}).map(()=>`<tr>${Array(10).fill("<td></td>").join("")}</tr>`).join("")}
          <tr class="totals-row">
            <td colspan="9" style="text-align:right">Total Part Costs:</td>
            <td>₦${parts.reduce((s:number,p:any)=>s+(p.cost*p.qty||0),0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <div style="border:1px solid #999;padding:6px;margin-bottom:8px">
        <div style="font-weight:bold;font-size:9px;border-bottom:1px solid #ccc;margin-bottom:4px">Outside Repairs:</div>
        <div class="label">Company Name:</div><div class="field">${r.outside_company||""}</div>
        <div class="label">Invoice No.:</div><div class="field">${r.outside_invoice_no||""}</div>
        <div class="label">Repair Code:</div><div class="field">${r.outside_repair_code||""}</div>
        <div class="label">Amount:</div><div class="field">${r.outside_repair_cost?`₦${Number(r.outside_repair_cost).toLocaleString()}`:""}</div>
      </div>
      <div style="border:1px solid #999;padding:6px;margin-bottom:8px">
        <div style="font-weight:bold;font-size:9px;border-bottom:1px solid #ccc;margin-bottom:4px">Repairs Brief Description:</div>
        <div style="min-height:40px;font-size:9px">${r.issue||""}</div>
      </div>
    </div>
  </div>

  <!-- TECHNICIANS — real recorded data, not blank handwriting rows -->
  <table style="margin-bottom:10px">
    <thead>
      <tr>
        <th>Technician</th><th>ID Card No.</th><th>Date</th><th>Repair Code</th>
        <th>Time In</th><th>Time Out</th><th>Hour(s)</th><th>Cost</th>
      </tr>
    </thead>
    <tbody>
      ${techs.length === 0 ? `<tr>${Array(8).fill("<td></td>").join("")}</tr>` : techs.map((t:any) => `
        <tr>
          <td>${t.name||""}</td>
          <td>${t.id_card_no||""}</td>
          <td>${t.date ? new Date(t.date).toLocaleDateString("en-GB") : ""}</td>
          <td>${t.repair_code||""}</td>
          <td>${t.time_in ? new Date(t.time_in).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : ""}</td>
          <td>${t.time_out ? new Date(t.time_out).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : ""}</td>
          <td>${t.hours || 0}</td>
          <td>₦${Number(t.cost||0).toLocaleString()}</td>
        </tr>`).join("")}
      <tr class="totals-row">
        <td colspan="7" style="text-align:right">Total Labour Cost:</td>
        <td>₦${techs.reduce((s:number,t:any)=>s+(Number(t.cost)||0),0).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
    <div style="border:1px solid #999;padding:6px">
      <table style="font-size:9px;width:100%">
        <tr><td style="text-align:right;font-weight:bold">Parts' Cost:</td><td style="border-bottom:1px solid #000">₦${parts.reduce((s:number,p:any)=>s+(p.cost*p.qty||0),0).toLocaleString()}</td></tr>
        <tr><td style="text-align:right;font-weight:bold">Labour Cost:</td><td style="border-bottom:1px solid #000">₦${Number(r.labour_cost||0).toLocaleString()}</td></tr>
        <tr><td style="text-align:right;font-weight:bold">Outside Repair Cost:</td><td style="border-bottom:1px solid #000">₦${Number(r.outside_repair_cost||0).toLocaleString()}</td></tr>
        <tr><td style="text-align:right;font-weight:bold">Extra Cost (3rd Parties):</td><td style="border-bottom:1px solid #000">—</td></tr>
        <tr><td style="text-align:right;font-weight:bold">Sheet Total Cost:</td><td style="border-bottom:1px solid #000">₦${Number(r.cost||0).toLocaleString()}</td></tr>
        <tr><td style="text-align:right;font-weight:bold">Carry-Over:</td><td>0.00 &nbsp;&nbsp; <strong>Grand Total:</strong> ₦${Number(r.cost||0).toLocaleString()}</td></tr>
      </table>
    </div>
    <div style="border:1px solid #999;padding:6px;font-size:9px">
      <div class="label">Remarks:</div>
      <div style="min-height:40px">${r.remarks||""}</div>
    </div>
  </div>

  <div class="sig-row">
    <div><div class="label">Prepared By:</div><div style="margin-top:20px" class="sig-line">Name &nbsp;&nbsp;&nbsp; Staff No.</div><div class="sig-line">Date / Signature</div></div>
    <div><div class="label">Tested By:</div><div style="margin-top:20px" class="sig-line">Name &nbsp;&nbsp;&nbsp; Staff No.</div><div class="sig-line">Date / Signature</div></div>
    <div><div class="label">Plant Engineer:</div><div style="margin-top:20px" class="sig-line">Name &nbsp;&nbsp;&nbsp; Staff No.</div><div class="sig-line">Date / Signature</div></div>
  </div>

  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  w.document.close();
}

// ─────────────────────────────────────────────────────────────
// JOB CARD MODAL
// ─────────────────────────────────────────────────────────────
export function JobCardModal({ record, onClose, onUpdate, profile }: {
  record: any; onClose: () => void; onUpdate: () => void; profile: any;
}) {
  const [parts,          setParts]          = useState<any[]>(record.parts_used || []);
  const [technicians,    setTechnicians]    = useState<any[]>(record.technicians_used || []);
  const [newPart,        setNewPart]        = useState({ name:"", siv_no:"", qty:1, unit:"", cost:0 });
  const [newTech,        setNewTech]        = useState({ name:"", id_card_no:"", repair_code:"" });
  const [remarks,        setRemarks]        = useState(record.remarks || "");
  const [completionDate, setCompletionDate] = useState(record.completion_date || "");
  const [repairStart,    setRepairStart]    = useState(record.repair_start_date || "");
  const [cost,           setCost]           = useState(record.cost || 0);
  const [labourCost,     setLabourCost]     = useState(record.labour_cost || 0);
  const [outsideCost,    setOutsideCost]    = useState(record.outside_repair_cost || 0);
  const [outsideCompany, setOutsideCompany] = useState(record.outside_company || "");
  const [outsideInvoice, setOutsideInvoice] = useState(record.outside_invoice_no || "");
  const [outsideRepairCode, setOutsideRepairCode] = useState(record.outside_repair_code || "");
  const [defect,         setDefect]         = useState(!!record.defect);
  const [saving,         setSaving]         = useState(false);
  const [activeTab,      setActiveTab]      = useState<"details"|"technicians"|"parts"|"costs">("details");

  const roles: string[] = profile?.roles || [];
  const isEngineer = roles.some((r:string) =>
    ["plant_engineer","plant_manager","plant_director","plant_admin","super_admin"].includes(r));

  const totalPartsCost = parts.reduce((s,p) => s + (p.cost * p.qty || 0), 0);
  const techLabourCost = technicians.reduce((s,t) => s + (Number(t.cost) || 0), 0);
  const grandTotal = totalPartsCost + techLabourCost + Number(outsideCost);

  function addPart() {
    if (!newPart.name) return;
    setParts(prev => [...prev, { ...newPart, id: Date.now() }]);
    setNewPart({ name:"", siv_no:"", qty:1, unit:"", cost:0 });
  }

  // Adding a technician auto-stamps Time In = now, and Date defaults
  // to the job's Date In (breakdown-flagged date) — both editable
  // afterward, since some repairs happen in the field and get logged
  // days later.
  function addTechnician() {
    if (!newTech.name) return;
    const nowIso = new Date().toISOString();
    setTechnicians(prev => [...prev, {
      ...newTech,
      id: Date.now(),
      date: record.date_in || nowIso.slice(0,10),
      time_in: nowIso,
      time_out: "",
      hours: 0,
      cost: 0,
    }]);
    setNewTech({ name:"", id_card_no:"", repair_code:"" });
  }

  function updateTechnician(id: number, field: string, value: any) {
    setTechnicians(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      // Auto-recalculate hours whenever either time changes — still
      // overridable afterward since it's just a normal input.
      if (field === "time_in" || field === "time_out") {
        updated.hours = hoursBetween(updated.time_in, updated.time_out) || updated.hours;
      }
      return updated;
    }));
  }

  function removeTechnician(id: number) {
    setTechnicians(prev => prev.filter(t => t.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    await dbu.from("maintenance").update({
      status:               record.status === "Pending" ? "In Progress" : record.status,
      parts_used:           parts,
      technicians_used:     technicians,
      remarks,
      cost:                 Number(cost) || grandTotal,
      labour_cost:          techLabourCost,
      outside_repair_cost:  Number(outsideCost),
      outside_company:      outsideCompany,
      outside_invoice_no:   outsideInvoice,
      outside_repair_code:  outsideRepairCode,
      defect,
      completion_date:      completionDate || null,
      repair_start_date:    repairStart || null,
    }).eq("id", record.id);
    setSaving(false);
    onUpdate(); onClose();
  }

  // "Awaiting Parts" — a real status, settable independent of Save/Complete,
  // so the Repair page card counts reflect it immediately.
  async function handleMarkAwaitingParts() {
    setSaving(true);
    await dbu.from("maintenance").update({
      status: "Awaiting Parts",
      parts_used: parts,
      technicians_used: technicians,
      remarks,
    }).eq("id", record.id);
    setSaving(false);
    onUpdate(); onClose();
  }

  async function handleComplete() {
    setSaving(true);
    const nowIso = new Date().toISOString();
    const today   = nowIso.slice(0,10);

    // Time Out is never typed manually — it's the moment the job is
    // marked complete. Any technician row still missing a Time Out
    // gets stamped here, and hours recalculated from it. Rows that
    // already have a Time Out (edited earlier) are left alone.
    const closedTechnicians = technicians.map(t => {
      if (t.time_out) return t;
      const time_out = nowIso;
      return { ...t, time_out, hours: hoursBetween(t.time_in, time_out) || t.hours };
    });

    await dbu.from("maintenance").update({
      status:               "Completed",
      completion_date:      completionDate || today,
      date_out:             today,
      cost:                 Number(cost) || grandTotal,
      labour_cost:          closedTechnicians.reduce((s,t)=>s+(Number(t.cost)||0),0),
      outside_repair_cost:  Number(outsideCost),
      outside_company:      outsideCompany,
      outside_invoice_no:   outsideInvoice,
      outside_repair_code:  outsideRepairCode,
      defect,
      parts_used:           parts,
      technicians_used:     closedTechnicians,
      remarks,
      repair_start_date:    repairStart || null,
      approved_by:          profile?.full_name || "",
    }).eq("id", record.id);

    // Equipment returns to Working (default). If you need Storage instead
    // in some cases, that becomes a choice at this step — flag it if so.
    await dbu.from("equipment").update({ operational_status: "Working" }).eq("id", record.equipment_id);
    await dbu.from("equipment_history").insert([{
      equipment_id: record.equipment_id,
      fleet_number: record.equipment_code,
      action_type:  "Maintenance Completed",
      from_status:  "Under Repair",
      to_status:    "Working",
      performed_by: profile?.full_name || "",
      remarks:      `Repair completed. Total Cost: ₦${(Number(cost)||grandTotal).toLocaleString()}`,
    }]);
    setSaving(false);
    onUpdate(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className={`px-6 py-5 flex items-center justify-between ${record.maintenance_type==="Breakdown"?"bg-red-700":"bg-slate-900"}`}>
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-0.5">
              PLT-05 / PLT-06 — {record.job_order_no||`JO-${record.id?.slice(0,6).toUpperCase()}`}
            </p>
            <h2 className="text-lg font-bold text-white">{record.equipment_code} — {record.maintenance_type}</h2>
            <p className="text-white/60 text-xs mt-0.5">{record.equipment_name} · {record.site}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => printJobOrder(record)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium">
              🖨 PLT-06
            </button>
            <button onClick={() => printJobCard({...record, parts_used: parts, technicians_used: technicians,
              cost: Number(cost)||grandTotal, labour_cost: techLabourCost, outside_repair_cost: outsideCost,
              outside_company: outsideCompany, outside_invoice_no: outsideInvoice, outside_repair_code: outsideRepairCode,
              defect, remarks, completion_date: completionDate})}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium">
              🖨 PLT-05
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {(["details","technicians","parts","costs"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-6 py-3 text-sm font-semibold capitalize transition-all border-b-2 ${
                activeTab===t ? "border-amber-500 text-amber-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t === "details" ? "📋 Job Details" : t === "technicians" ? "👷 Technicians" : t === "parts" ? "🔩 Parts Used" : "💰 Costs"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">

          {/* DETAILS TAB */}
          {activeTab === "details" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-xs">
                {[
                  ["Fleet No.", record.equipment_code],
                  ["Job Order No.", record.job_order_no],
                  ["Type", record.maintenance_type],
                  ["Site", record.site||"—"],
                  ["Reported By", record.reported_by],
                  ["Status", record.status],
                  ["Date In", record.date_in ? new Date(record.date_in).toLocaleDateString("en-GB") : "—"],
                ].map(([l,v]) => (
                  <div key={l}>
                    <p className="text-slate-400 uppercase tracking-wide text-[10px]">{l}</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Fault / Issue</p>
                <p className="text-slate-800 text-sm">{record.issue}</p>
              </div>

              <F label="Receiving Workshop">
                <input className={iCls} defaultValue={record.receiving_workshop||""}
                  onBlur={e => dbu.from("maintenance").update({receiving_workshop: e.target.value}).eq("id",record.id)} />
              </F>
              <F label="Foreman / Supervisor">
                <input className={iCls} defaultValue={record.foreman||""}
                  onBlur={e => dbu.from("maintenance").update({foreman: e.target.value}).eq("id",record.id)} />
              </F>
              <F label="Repair Start Date">
                <input type="date" className={iCls} value={repairStart} onChange={e => setRepairStart(e.target.value)} />
              </F>
              <F label="Completion Date">
                <input type="date" className={iCls} value={completionDate} onChange={e => setCompletionDate(e.target.value)} />
              </F>
              <F label="Defect Confirmed">
                <label className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={defect} onChange={e => setDefect(e.target.checked)} className="accent-amber-500 w-4 h-4" />
                  <span className="text-sm text-slate-700">Defect confirmed on inspection</span>
                </label>
              </F>
              <F label="Remarks">
                <input className={iCls} value={remarks} onChange={e => setRemarks(e.target.value)} />
              </F>
            </div>
          )}

          {/* TECHNICIANS TAB — the permanent labour record */}
          {activeTab === "technicians" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                ℹ️ Time In is stamped automatically when you add a technician; Time Out is stamped
                automatically when the job is marked Complete. Both — and Hours — can be corrected
                by hand if the work actually happened on a different day or the auto times are off.
              </div>

              {isEngineer && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add Technician</p>
                  <div className="grid grid-cols-4 gap-2">
                    <input className={iCls} placeholder="Technician name *"
                      value={newTech.name} onChange={e => setNewTech(p=>({...p,name:e.target.value}))} />
                    <input className={iCls} placeholder="ID Card No."
                      value={newTech.id_card_no} onChange={e => setNewTech(p=>({...p,id_card_no:e.target.value}))} />
                    <input className={iCls} placeholder="Repair Code"
                      value={newTech.repair_code} onChange={e => setNewTech(p=>({...p,repair_code:e.target.value}))} />
                    <button onClick={addTechnician}
                      className="py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900">
                      + Add Technician
                    </button>
                  </div>
                </div>
              )}

              {technicians.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400">No technicians recorded yet.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["Technician","ID Card","Date","Repair Code","Time In","Time Out","Hours","Cost (₦)",""].map(h=>(
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {technicians.map((t:any) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{t.name}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{t.id_card_no||"—"}</td>
                          <td className="px-3 py-2">
                            <input type="date" className="text-xs border border-slate-200 rounded px-2 py-1"
                              value={t.date || ""} onChange={e => updateTechnician(t.id, "date", e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{t.repair_code||"—"}</td>
                          <td className="px-3 py-2">
                            <input type="datetime-local" className="text-xs border border-slate-200 rounded px-2 py-1"
                              value={toLocalInput(t.time_in)} onChange={e => updateTechnician(t.id, "time_in", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="datetime-local" className="text-xs border border-slate-200 rounded px-2 py-1"
                              value={toLocalInput(t.time_out)} placeholder="Set on Complete"
                              onChange={e => updateTechnician(t.id, "time_out", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" className="w-16 text-xs border border-slate-200 rounded px-2 py-1"
                              value={t.hours || ""} onChange={e => updateTechnician(t.id, "hours", Number(e.target.value)||0)} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" className="w-20 text-xs border border-slate-200 rounded px-2 py-1"
                              value={t.cost || ""} onChange={e => updateTechnician(t.id, "cost", Number(e.target.value)||0)} />
                          </td>
                          <td className="px-3 py-2">
                            {isEngineer && (
                              <button onClick={() => removeTechnician(t.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={7} className="px-3 py-2 text-right font-bold text-slate-700">Labour Total:</td>
                        <td className="px-3 py-2 font-bold text-emerald-700">₦{techLabourCost.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PARTS TAB */}
          {activeTab === "parts" && (
            <div className="space-y-4">
              {isEngineer && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add Part / Material</p>
                  <div className="grid grid-cols-6 gap-2">
                    <input className={iCls + " col-span-2"} placeholder="Part name *"
                      value={newPart.name} onChange={e => setNewPart(p=>({...p,name:e.target.value}))} />
                    <input className={iCls} placeholder="SIV No."
                      value={newPart.siv_no} onChange={e => setNewPart(p=>({...p,siv_no:e.target.value}))} />
                    <input className={iCls} type="number" placeholder="Qty"
                      value={newPart.qty||""} onChange={e => setNewPart(p=>({...p,qty:Number(e.target.value)||1}))} />
                    <input className={iCls} placeholder="Unit"
                      value={newPart.unit} onChange={e => setNewPart(p=>({...p,unit:e.target.value}))} />
                    <input className={iCls} type="number" placeholder="₦ Cost"
                      value={newPart.cost||""} onChange={e => setNewPart(p=>({...p,cost:Number(e.target.value)||0}))} />
                    <button onClick={addPart}
                      className="col-span-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900">
                      + Add Part
                    </button>
                  </div>
                </div>
              )}

              {parts.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400">No parts recorded yet.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["#","Part Name","SIV No.","Qty","Unit","Unit Cost","Total",""].map(h=>(
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {parts.map((p:any, i:number) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-mono">{p.siv_no||"—"}</td>
                          <td className="px-4 py-3 text-slate-600">{p.qty}</td>
                          <td className="px-4 py-3 text-slate-500">{p.unit||"—"}</td>
                          <td className="px-4 py-3 text-slate-600">₦{Number(p.cost).toLocaleString()}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">₦{(p.qty*p.cost).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {isEngineer && (
                              <button onClick={() => setParts(prev=>prev.filter(x=>x.id!==p.id))}
                                className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={6} className="px-4 py-3 text-right font-bold text-slate-700">Parts Total:</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">₦{totalPartsCost.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* COSTS TAB */}
          {activeTab === "costs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Parts Cost (auto-calculated)">
                  <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 font-bold text-emerald-700">
                    ₦{totalPartsCost.toLocaleString()}
                  </div>
                </F>
                <F label="Labour Cost (from Technicians tab)">
                  <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 font-bold text-emerald-700">
                    ₦{techLabourCost.toLocaleString()}
                  </div>
                </F>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Outside Repairs (3rd Party)</p>
                <div className="grid grid-cols-4 gap-3">
                  <F label="Company Name">
                    <input className={iCls} value={outsideCompany} onChange={e => setOutsideCompany(e.target.value)} />
                  </F>
                  <F label="Invoice No.">
                    <input className={iCls} value={outsideInvoice} onChange={e => setOutsideInvoice(e.target.value)} />
                  </F>
                  <F label="Repair Code">
                    <input className={iCls} value={outsideRepairCode} onChange={e => setOutsideRepairCode(e.target.value)} />
                  </F>
                  <F label="Amount (₦)">
                    <input type="number" className={iCls} value={outsideCost||""} onChange={e => setOutsideCost(Number(e.target.value)||0)} />
                  </F>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Cost Summary</p>
                <div className="space-y-2 text-sm">
                  {[
                    ["Parts Cost", `₦${totalPartsCost.toLocaleString()}`],
                    ["Labour Cost", `₦${techLabourCost.toLocaleString()}`],
                    ["Outside Repair Cost", `₦${Number(outsideCost).toLocaleString()}`],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between text-slate-300">
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-lg">
                    <span>Grand Total</span>
                    <span className="text-amber-400">₦{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <F label="Override Total Cost (₦) — optional">
                <input type="number" className={iCls} value={cost||""}
                  onChange={e => setCost(Number(e.target.value)||0)}
                  placeholder={`Auto: ₦${grandTotal.toLocaleString()}`} />
              </F>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Close
          </button>
          {isEngineer && record.status !== "Completed" && (
            <div className="flex gap-3">
              <button onClick={handleMarkAwaitingParts} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200 disabled:opacity-50">
                ⏳ Awaiting Parts
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-50">
                {saving ? "Saving..." : "Save Progress"}
              </button>
              <button onClick={handleComplete} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Completing..." : "✓ Mark Complete"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW JOB ORDER MODAL
// restrictEquipment: if provided, the equipment picker ONLY offers
// these records (used by the Repair page — you can only raise a job
// order for equipment that's already flagged Break Down/Under Repair).
// If omitted, falls back to the full active equipment list (used by
// Maintenance page for Scheduled/Preventive work on healthy equipment).
// ─────────────────────────────────────────────────────────────
export function NewJobOrderModal({ open, onClose, onSave, profile, restrictEquipment, defaultType }: {
  open: boolean; onClose: () => void; onSave: () => void; profile: any;
  restrictEquipment?: any[]; defaultType?: string;
}) {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [sites,     setSites]     = useState<any[]>([]);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [selEquip,  setSelEquip]  = useState<any>(null);
  const [form, setForm] = useState({
    equipment_id: "", equipment_code: "", equipment_name: "",
    maintenance_type: defaultType || "Breakdown",
    issue: "", reported_by: "",
    reported_date: new Date().toISOString().slice(0,10),
    date_in: "",
    technician: "",
    // eslint-disable-next-line react-hooks/purity
    job_order_no: `JO-${Date.now().toString().slice(-6)}`,
    site: "", cost_code: "", receiving_workshop: "",
    charge_type: "Hartland Internal", charge_to: "",
    engine_no: "", engine_model: "", engine_make: "", chassis_no: "",
    machine_make: "", machine_model: "", reg_no: "",
  });

  useEffect(() => {
    if (profile?.full_name && open) {

      setForm(p => ({ ...p, reported_by: p.reported_by || profile.full_name }));
    }
  }, [profile, open]);

  useEffect(() => {
    if (!open) return;
    if (restrictEquipment) {
      setEquipment(restrictEquipment);
      dbu.from("sites").select("name,code,cost_code").order("code").then(({ data }: any) => setSites(data || []));
      return;
    }
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name,category,site,operational_status,make,model,reg_no,chassis_no").neq("operational_status","Scrapped").order("fleet_number"),
      dbu.from("sites").select("name,code,cost_code").order("code"),
    ]).then(([eq, st]) => {
      setEquipment(eq.data || []);
      setSites(st.data || []);
    });
  }, [open, restrictEquipment]);

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  function selectEquipment(eq: any) {
    setSelEquip(eq);
    set("equipment_id",   eq.id);
    set("equipment_code", eq.fleet_number);
    set("equipment_name", eq.name || "");
    set("site",           eq.site || "");
    set("machine_make",   eq.make || "");
    set("machine_model",  eq.model || "");
    set("reg_no",         eq.reg_no || "");
    set("chassis_no",     eq.chassis_no || "");
    // Date In defaults from when this equipment was actually flagged
    // Break Down — editable, since some jobs get logged days later.
    set("date_in", eq.breakdown_flagged_at ? eq.breakdown_flagged_at.slice(0,10) : new Date().toISOString().slice(0,10));
    const siteRec = sites.find(s => s.name === eq.site);
    if (siteRec) set("cost_code", siteRec.cost_code || siteRec.code || "");
    setEqSearch(`${eq.fleet_number} — ${eq.name}`);
    setShowDrop(false);
  }

  const filteredEq = equipment.filter((e:any) =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0, 15);

  async function handleSubmit() {
    if (!form.equipment_id || !form.issue) return;
    setSaving(true);
    await dbu.from("maintenance").insert([{
      equipment_id:     form.equipment_id,
      equipment_code:   form.equipment_code,
      equipment_name:   form.equipment_name,
      maintenance_type: form.maintenance_type,
      issue:            form.issue,
      status:           "Pending",
      reported_by:      form.reported_by,
      reported_date:    form.reported_date,
      date_in:          form.date_in || null,
      technician:       form.technician,
      job_order_no:     form.job_order_no,
      site:             form.site,
      cost_code:        form.cost_code,
      receiving_workshop: form.receiving_workshop,
      charge_type:      form.charge_type,
      charge_to:        form.charge_to,
      engine_no:        form.engine_no,
      engine_model:     form.engine_model,
      engine_make:      form.engine_make,
      chassis_no:       form.chassis_no,
      machine_make:     form.machine_make,
      machine_model:    form.machine_model,
      reg_no:           form.reg_no,
      parts_used:       [],
      technicians_used: [],
      cost:             0,
    }]);

    // Only push equipment into Under Repair if it wasn't already there
    // (it will already be Break Down/Under Repair for anything raised
    // from the Repair page's restricted list).
    if (["Breakdown","Scheduled","Preventive"].includes(form.maintenance_type) && selEquip?.operational_status !== "Under Repair") {
      await dbu.from("equipment").update({ operational_status: "Under Repair" }).eq("id", form.equipment_id);
      await dbu.from("equipment_history").insert([{
        equipment_id: form.equipment_id,
        fleet_number: form.equipment_code,
        action_type:  "Maintenance Started",
        from_status:  selEquip?.operational_status || "Working",
        to_status:    "Under Repair",
        performed_by: form.reported_by,
        remarks:      `${form.maintenance_type}: ${form.issue}. Job Order: ${form.job_order_no}`,
      }]);
    }

    setSaving(false);
    onSave(); onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-6 py-5 bg-red-700 flex items-center justify-between">
          <div>
            <p className="text-red-300 text-xs font-bold uppercase tracking-widest mb-0.5">PLT-06</p>
            <h2 className="text-lg font-bold text-white">New Job Order Form</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Equipment */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Equipment <span className="text-red-400">*</span>
            </label>
            {restrictEquipment && (
              <p className="text-xs text-slate-400 mb-1.5">
                Only equipment currently on the Repair page (Break Down / Under Repair) can be selected.
              </p>
            )}
            <div className="relative">
              <input className={iCls} placeholder="Search fleet number or name..."
                value={eqSearch}
                onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)} />
              {showDrop && filteredEq.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredEq.map((e:any) => (
                    <button key={e.id} onClick={() => selectEquipment(e)}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                      <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                      <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        e.operational_status==="Working"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"
                      }`}>{e.operational_status}</span>
                      <span className="text-slate-400 text-xs ml-2">{e.site}</span>
                    </button>
                  ))}
                </div>
              )}
              {restrictEquipment && restrictEquipment.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">No breakdown equipment without an active job order right now.</p>
              )}
            </div>
          </div>

          {selEquip && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 grid grid-cols-4 gap-3 text-xs">
              {[
                ["Fleet No.", selEquip.fleet_number],
                ["Make", selEquip.make||"—"],
                ["Model", selEquip.model||"—"],
                ["Site", selEquip.site||"—"],
              ].map(([l,v]) => (
                <div key={l}><p className="text-slate-400">{l}</p><p className="font-semibold text-slate-800">{v}</p></div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <F label="Maintenance Type" required>
              <select className={iCls} value={form.maintenance_type} onChange={e => set("maintenance_type", e.target.value)}>
                <option value="Breakdown">Breakdown</option>
                <option value="Scheduled">Scheduled Service</option>
                <option value="Preventive">Preventive Maintenance</option>
                <option value="Third Party">Third Party</option>
              </select>
            </F>
            <F label="Job Order No.">
              <input className={iCls} value={form.job_order_no} onChange={e => set("job_order_no", e.target.value)} />
            </F>
            <F label="Sending Site">
              <input className={`${iCls} bg-slate-50`} value={form.site} readOnly />
            </F>
            <F label="Receiving Workshop">
              <input className={iCls} value={form.receiving_workshop} onChange={e => set("receiving_workshop", e.target.value)}
                placeholder="e.g. Central Workshop" />
            </F>
            <F label="Date In" required>
              <input type="date" className={iCls} value={form.date_in} onChange={e => set("date_in", e.target.value)} />
              <p className="text-[11px] text-slate-400 mt-1">Defaults to when equipment was flagged Break Down — edit if the job started earlier.</p>
            </F>
            <F label="Cost Code">
              <input className={iCls} value={form.cost_code} onChange={e => set("cost_code", e.target.value)} />
            </F>
            <F label="Charge Type">
              <select className={iCls} value={form.charge_type} onChange={e => set("charge_type", e.target.value)}>
                <option value="Hartland Internal">Hartland Internal</option>
                <option value="External 3rd Party">External 3rd Party</option>
              </select>
            </F>
            {form.charge_type === "External 3rd Party" && (
              <F label="Charge To" span>
                <input className={iCls} value={form.charge_to} onChange={e => set("charge_to", e.target.value)} />
              </F>
            )}
          </div>

          <F label="Fault / Repairs Required" required>
            <textarea className={`${iCls} h-24 resize-none`} value={form.issue}
              onChange={e => set("issue", e.target.value)}
              placeholder="Describe the fault or maintenance required in detail..." />
          </F>

          <div className="grid grid-cols-2 gap-4">
            <F label="Reported By">
              <input className={iCls} value={form.reported_by} onChange={e => set("reported_by", e.target.value)} />
            </F>
            <F label="Date Reported">
              <input type="date" className={iCls} value={form.reported_date} onChange={e => set("reported_date", e.target.value)} />
            </F>
            <F label="Assigned Technician">
              <input className={iCls} value={form.technician} onChange={e => set("technician", e.target.value)}
                placeholder="Can be assigned later" />
            </F>
            <F label="Engine No.">
              <input className={iCls} value={form.engine_no} onChange={e => set("engine_no", e.target.value)} />
            </F>
            <F label="Engine Make">
              <input className={iCls} value={form.engine_make} onChange={e => set("engine_make", e.target.value)} />
            </F>
            <F label="Engine Model">
              <input className={iCls} value={form.engine_model} onChange={e => set("engine_model", e.target.value)} />
            </F>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.equipment_id || !form.issue}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
            {saving ? "Logging..." : "Log Job Order →"}
          </button>
        </div>
      </div>
    </div>
  );
}