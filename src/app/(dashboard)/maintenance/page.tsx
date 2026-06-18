/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

const STATUS_STYLE: Record<string, string> = {
  "Pending":     "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Completed":   "bg-emerald-100 text-emerald-700",
  "Cancelled":   "bg-red-100 text-red-600",
};

const TYPE_STYLE: Record<string, string> = {
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

// ─────────────────────────────────────────────────────────────
// PRINT PLT-06 JOB ORDER FORM
// ─────────────────────────────────────────────────────────────
function printJobOrder(r: any) {
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
// PRINT PLT-05 JOB CARD FORM
// ─────────────────────────────────────────────────────────────
function printJobCard(r: any) {
  const parts = r.parts_used || [];
  const w = window.open("", "_blank", "width=1100,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>PLT-05 Job Card</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 15px; }
    h1 { font-size: 16px; text-align: center; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .logo { font-weight: bold; font-size: 14px; color: #c00; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
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
    <div><div class="label">Date In:</div><div class="field">${new Date(r.reported_date||r.created_at).toLocaleDateString("en-GB")}</div></div>
    <div><div class="label">Date Out:</div><div class="field">${r.completion_date||""}</div></div>
    <div><div class="label">Make:</div><div class="field">${r.machine_make||""}</div></div>
    <div><div class="label">Model:</div><div class="field">${r.machine_model||""}</div></div>
    <div><div class="label">Hour/Km Reading:</div><div class="field"></div></div>
    <div><div class="label">Defect:</div><div class="field"></div></div>
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
        <div class="label">Amount:</div><div class="field">${r.outside_repair_cost?`₦${Number(r.outside_repair_cost).toLocaleString()}`:""}</div>
      </div>
      <div style="border:1px solid #999;padding:6px;margin-bottom:8px">
        <div style="font-weight:bold;font-size:9px;border-bottom:1px solid #ccc;margin-bottom:4px">Repairs Brief Description:</div>
        <div style="min-height:40px;font-size:9px">${r.issue||""}</div>
      </div>
      <table style="font-size:8px">
        <thead><tr><th>Technician</th><th>ID Card</th><th>Date</th><th>Repair Code</th><th colspan="2">Time</th><th>Hour(s)</th><th>Cost</th></tr>
        <tr><th></th><th>No.</th><th></th><th></th><th>In</th><th>Out</th><th></th><th></th></tr></thead>
        <tbody>
          <tr><td>${r.technician||""}</td><td></td><td></td><td>Gen Ma</td><td></td><td></td><td>0</td><td>0.00</td></tr>
          ${Array(5).fill(`<tr>${Array(8).fill("<td></td>").join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>

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
function JobCardModal({ record, onClose, onUpdate, profile }: {
  record: any; onClose: () => void; onUpdate: () => void; profile: any;
}) {
  const [parts,         setParts]         = useState<any[]>(record.parts_used || []);
  const [newPart,       setNewPart]       = useState({ name:"", siv_no:"", qty:1, unit:"", cost:0 });
  const [remarks,       setRemarks]       = useState(record.remarks || "");
  const [completionDate,setCompletionDate]= useState(record.completion_date || "");
  const [repairStart,   setRepairStart]   = useState(record.repair_start_date || "");
  const [cost,          setCost]          = useState(record.cost || 0);
  const [labourCost,    setLabourCost]    = useState(record.labour_cost || 0);
  const [outsideCost,   setOutsideCost]   = useState(record.outside_repair_cost || 0);
  const [outsideCompany,setOutsideCompany]= useState(record.outside_company || "");
  const [outsideInvoice,setOutsideInvoice]= useState(record.outside_invoice_no || "");
  const [saving,        setSaving]        = useState(false);
  const [activeTab,     setActiveTab]     = useState<"details"|"parts"|"costs">("details");

  const roles: string[] = profile?.roles || [];
  const isEngineer = roles.some((r:string) =>
    ["plant_engineer","plant_manager","plant_director","plant_admin","super_admin"].includes(r));

  const totalPartsCost = parts.reduce((s,p) => s + (p.cost * p.qty || 0), 0);
  const grandTotal = totalPartsCost + Number(labourCost) + Number(outsideCost);

  function addPart() {
    if (!newPart.name) return;
    setParts(prev => [...prev, { ...newPart, id: Date.now() }]);
    setNewPart({ name:"", siv_no:"", qty:1, unit:"", cost:0 });
  }

  async function handleSave() {
    setSaving(true);
    await dbu.from("maintenance").update({
      status:               "In Progress",
      parts_used:           parts,
      remarks,
      cost:                 Number(cost) || grandTotal,
      labour_cost:          Number(labourCost),
      outside_repair_cost:  Number(outsideCost),
      outside_company:      outsideCompany,
      outside_invoice_no:   outsideInvoice,
      completion_date:      completionDate || null,
      repair_start_date:    repairStart || null,
    }).eq("id", record.id);
    setSaving(false);
    onUpdate(); onClose();
  }

  async function handleComplete() {
    setSaving(true);
    await dbu.from("maintenance").update({
      status:               "Completed",
      completion_date:      completionDate || new Date().toISOString().slice(0,10),
      cost:                 Number(cost) || grandTotal,
      labour_cost:          Number(labourCost),
      outside_repair_cost:  Number(outsideCost),
      outside_company:      outsideCompany,
      outside_invoice_no:   outsideInvoice,
      parts_used:           parts,
      remarks,
      repair_start_date:    repairStart || null,
      approved_by:          profile?.full_name || "",
    }).eq("id", record.id);

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
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl my-6 overflow-hidden">
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
            <button onClick={() => printJobCard({...record, parts_used: parts, cost: Number(cost)||grandTotal, labour_cost: labourCost, outside_repair_cost: outsideCost, outside_company: outsideCompany, outside_invoice_no: outsideInvoice, remarks, completion_date: completionDate})}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium">
              🖨 PLT-05
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {(["details","parts","costs"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-6 py-3 text-sm font-semibold capitalize transition-all border-b-2 ${
                activeTab===t ? "border-amber-500 text-amber-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t === "details" ? "📋 Job Details" : t === "parts" ? "🔩 Parts Used" : "💰 Costs"}
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
              <F label="Technician">
                <input className={iCls} defaultValue={record.technician||""}
                  onBlur={e => dbu.from("maintenance").update({technician: e.target.value}).eq("id",record.id)} />
              </F>
              <F label="Repair Start Date">
                <input type="date" className={iCls} value={repairStart} onChange={e => setRepairStart(e.target.value)} />
              </F>
              <F label="Completion Date">
                <input type="date" className={iCls} value={completionDate} onChange={e => setCompletionDate(e.target.value)} />
              </F>
              <F label="Foreman / Supervisor">
                <input className={iCls} defaultValue={record.foreman||""}
                  onBlur={e => dbu.from("maintenance").update({foreman: e.target.value}).eq("id",record.id)} />
              </F>
              <F label="Remarks">
                <input className={iCls} value={remarks} onChange={e => setRemarks(e.target.value)} />
              </F>
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
                <F label="Labour Cost (₦)">
                  <input type="number" className={iCls} value={labourCost||""}
                    onChange={e => setLabourCost(Number(e.target.value)||0)} placeholder="0"/>
                </F>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Outside Repairs (3rd Party)</p>
                <div className="grid grid-cols-3 gap-3">
                  <F label="Company Name">
                    <input className={iCls} value={outsideCompany} onChange={e => setOutsideCompany(e.target.value)} />
                  </F>
                  <F label="Invoice No.">
                    <input className={iCls} value={outsideInvoice} onChange={e => setOutsideInvoice(e.target.value)} />
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
                    ["Labour Cost", `₦${Number(labourCost).toLocaleString()}`],
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
// NEW BREAKDOWN / JOB ORDER MODAL
// ─────────────────────────────────────────────────────────────
function NewJobOrderModal({ open, onClose, onSave, profile }: {
  open: boolean; onClose: () => void; onSave: () => void; profile: any;
}) {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [sites,     setSites]     = useState<any[]>([]);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [selEquip,  setSelEquip]  = useState<any>(null);
  const [form, setForm] = useState({
    equipment_id: "", equipment_code: "", equipment_name: "",
    maintenance_type: "Breakdown",
    issue: "", reported_by: "",
    reported_date: new Date().toISOString().slice(0,10),
    technician: "",
    // eslint-disable-next-line react-hooks/purity
    job_order_no: `JO-${Date.now().toString().slice(-6)}`,
    site: "", cost_code: "", receiving_workshop: "",
    charge_type: "Hartland Internal", charge_to: "",
    engine_no: "", engine_model: "", engine_make: "", chassis_no: "",
    machine_make: "", machine_model: "", reg_no: "",
  });

  // Auto-fill reported_by when profile loads or modal opens
  useEffect(() => {
    if (profile?.full_name && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(p => ({ ...p, reported_by: p.reported_by || profile.full_name }));
    }
  }, [profile, open]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name,category,site,operational_status,make,model,reg_no,chassis_no").neq("operational_status","Scrapped").order("fleet_number"),
      dbu.from("sites").select("name,code,cost_code").order("code"),
    ]).then(([eq, st]) => {
      setEquipment(eq.data || []);
      setSites(st.data || []);
    });
  }, [open]);

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
    // Auto-fill cost code from site
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
      cost:             0,
    }]);

    if (["Breakdown","Scheduled","Preventive"].includes(form.maintenance_type)) {
      await dbu.from("equipment").update({ operational_status: "Under Repair" }).eq("id", form.equipment_id);
      await dbu.from("equipment_history").insert([{
        equipment_id: form.equipment_id,
        fleet_number: form.equipment_code,
        action_type:  "Maintenance Started",
        from_status:  "Working",
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

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const { profile } = useAuth();
  const [records,      setRecords]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [jobCard,      setJobCard]      = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterType,   setFilterType]   = useState("");
  const [filterSite,   setFilterSite]   = useState("");
  const [search,       setSearch]       = useState("");
  const [tab,          setTab]          = useState<"all"|"breakdown"|"scheduled"|"completed">("all");

  useEffect(() => {
    if (profile) fetchRecords();
  }, [profile]); // eslint-disable-line

  async function fetchRecords() {
    setLoading(true);
    const roles: string[] = profile?.roles || [];
    const assignedSites: string[] = profile?.assigned_sites || [];
    const isRestricted = (roles.includes("plant_clerk") || roles.includes("site_supervisor")) &&
      !roles.some((r:string) => ["plant_admin","plant_manager","plant_engineer","plant_director","super_admin"].includes(r));

    let q = dbu.from("maintenance").select("*").order("created_at", { ascending: false });
    if (isRestricted && assignedSites.length > 0) {
      q = q.in("site", assignedSites);
    }
    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  }

  // Tab filtering
  const tabFiltered = records.filter(r => {
    if (tab === "breakdown") return r.maintenance_type === "Breakdown" && r.status !== "Completed";
    if (tab === "scheduled") return ["Scheduled","Preventive"].includes(r.maintenance_type);
    if (tab === "completed") return r.status === "Completed";
    return true;
  });

  const filtered = tabFiltered.filter((r:any) => {
    const q = search.toLowerCase();
    return (
      (!q || r.equipment_code.toLowerCase().includes(q) || (r.issue||"").toLowerCase().includes(q) || (r.site||"").toLowerCase().includes(q)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterType   || r.maintenance_type === filterType) &&
      (!filterSite   || r.site === filterSite)
    );
  });

  const stats = {
    total:      records.length,
    breakdown:  records.filter(r => r.maintenance_type === "Breakdown" && r.status !== "Completed").length,
    pending:    records.filter(r => r.status === "Pending").length,
    inProgress: records.filter(r => r.status === "In Progress").length,
    completed:  records.filter(r => r.status === "Completed").length,
    totalCost:  records.filter(r => r.status === "Completed").reduce((s,r) => s + (r.cost||0), 0),
  };

  const allSites = [...new Set(records.map(r => r.site).filter(Boolean))].sort();

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Job orders (PLT-06), job cards (PLT-05), breakdowns, scheduled services and repairs.
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 shadow-sm shrink-0 flex items-center gap-2">
          ⚠️ New Job Order
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm opacity-70 mt-1">Total Jobs</p>
        </div>
        <div className={`rounded-2xl p-5 ${stats.breakdown > 0 ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}>
          <p className="text-3xl font-bold">{stats.breakdown}</p>
          <p className="text-sm opacity-70 mt-1">Active Breakdowns</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.pending}</p>
          <p className="text-sm opacity-70 mt-1">Pending</p>
        </div>
        <div className="bg-blue-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.inProgress}</p>
          <p className="text-sm opacity-70 mt-1">In Progress</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.completed}</p>
          <p className="text-sm opacity-70 mt-1">Completed</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-lg font-bold text-slate-800">₦{stats.totalCost.toLocaleString("en-NG",{notation:"compact"})}</p>
          <p className="text-sm text-slate-500 mt-1">Total Cost</p>
        </div>
      </div>

      {/* Active breakdown alert */}
      {stats.breakdown > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">
              {stats.breakdown} active breakdown{stats.breakdown > 1 ? "s" : ""} requiring attention
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {records.filter(r=>r.maintenance_type==="Breakdown"&&r.status!=="Completed").map(r=>r.equipment_code).join(" · ")}
            </p>
          </div>
          <button onClick={() => setTab("breakdown")}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 whitespace-nowrap">
            View Breakdowns
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {([
          ["all",        "📋 All Jobs"],
          ["breakdown",  `🚨 Breakdowns (${stats.breakdown})`],
          ["scheduled",  "🔧 Scheduled / Preventive"],
          ["completed",  `✅ Completed (${stats.completed})`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search fleet no., issue, site..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {["Pending","In Progress","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {allSites.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Job Register</h2>
            <p className="text-slate-400 text-sm">{filtered.length} records</p>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Job Order","Fleet No.","Type","Site","Issue","Reported","Technician","Status","Cost","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-400">
                  No records found. Click &quot;New Job Order&quot; to log a breakdown or service.
                </td></tr>
              ) : filtered.map((r:any) => (
                <tr key={r.id} className={`group transition-colors ${
                  r.maintenance_type==="Breakdown"&&r.status!=="Completed" ? "hover:bg-red-50/30" : "hover:bg-amber-50/30"
                }`}>
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">{r.job_order_no||`JO-${r.id?.slice(0,6).toUpperCase()}`}</td>
                  <td className="px-4 py-4 font-bold text-amber-600 font-mono text-xs">{r.equipment_code}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_STYLE[r.maintenance_type]||"bg-slate-100 text-slate-600"}`}>
                      {r.maintenance_type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs max-w-32 truncate">{r.site||"—"}</td>
                  <td className="px-4 py-4 text-slate-700 text-xs max-w-48 truncate">{r.issue}</td>
                  <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(r.reported_date||r.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-xs">{r.technician||"—"}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status]||""}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-xs whitespace-nowrap">
                    {r.cost ? `₦${Number(r.cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setJobCard(r)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 whitespace-nowrap">
                        Job Card
                      </button>
                      <button onClick={() => printJobOrder(r)}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 whitespace-nowrap">
                        PLT-06
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewJobOrderModal open={modal} onClose={() => setModal(false)} onSave={fetchRecords} profile={profile} />
      {jobCard && <JobCardModal record={jobCard} onClose={() => setJobCard(null)} onUpdate={fetchRecords} profile={profile} />}
    </div>
  );
}