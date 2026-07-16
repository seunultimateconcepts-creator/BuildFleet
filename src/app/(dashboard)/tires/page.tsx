/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

// Position legend — matches the Tyre Pass form exactly
const TYRE_POSITIONS = [
  { code: "A1-L",  label: "Axle 1 Left (single)" },
  { code: "A1-R",  label: "Axle 1 Right (single)" },
  { code: "A1-LI", label: "Axle 1 Left Inner" },
  { code: "A1-LO", label: "Axle 1 Left Outer" },
  { code: "A1-RI", label: "Axle 1 Right Inner" },
  { code: "A1-RO", label: "Axle 1 Right Outer" },
  { code: "A2-L",  label: "Axle 2 Left (single)" },
  { code: "A2-R",  label: "Axle 2 Right (single)" },
  { code: "A2-LI", label: "Axle 2 Left Inner" },
  { code: "A2-LO", label: "Axle 2 Left Outer" },
  { code: "A2-RI", label: "Axle 2 Right Inner" },
  { code: "A2-RO", label: "Axle 2 Right Outer" },
  { code: "A3-LI", label: "Axle 3 Left Inner" },
  { code: "A3-LO", label: "Axle 3 Left Outer" },
  { code: "A3-RI", label: "Axle 3 Right Inner" },
  { code: "A3-RO", label: "Axle 3 Right Outer" },
  { code: "A4-LI", label: "Axle 4 Left Inner" },
  { code: "A4-LO", label: "Axle 4 Left Outer" },
  { code: "A4-RI", label: "Axle 4 Right Inner" },
  { code: "A4-RO", label: "Axle 4 Right Outer" },
  { code: "S1",    label: "Spare Tyre One" },
  { code: "S2",    label: "Spare Tyre Two" },
];

const TYRE_STATUS_STYLE: Record<string, string> = {
  "Mounted":            "bg-emerald-100 text-emerald-700",
  "Removed - Reusable": "bg-blue-100 text-blue-700",
  "Scrapped":           "bg-red-100 text-red-600",
};

const EVENT_STYLE: Record<string, { badge: string; icon: string }> = {
  "MOUNT":       { badge: "bg-emerald-100 text-emerald-700", icon: "🔧" },
  "REMOVE":      { badge: "bg-orange-100 text-orange-700",   icon: "⬇️" },
  "TREAD_CHECK": { badge: "bg-blue-100 text-blue-700",       icon: "📏" },
};

const esc = (v: any) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=1150,height=800");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

const PRINT_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; padding: 12px; }
  .header { display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:10px; }
  .logo { font-weight:bold; font-size:14px; color:#c00; }
  h1 { font-size:18px; text-align:center; letter-spacing:2px; }
  .meta { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:10px; font-size:10px; }
  .meta .label { font-size:8px; color:#555; font-weight:bold; text-transform:uppercase; }
  .meta .field { border-bottom:1px solid #000; min-height:16px; padding:1px 0; }
  table { width:100%; border-collapse:collapse; font-size:9px; }
  th { background:#eee; border:1px solid #999; padding:3px 5px; font-size:8px; text-transform:uppercase; }
  td { border:1px solid #ccc; padding:3px 5px; text-align:center; }
  .sig { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:18px; font-size:9px; }
  .sig-line { border-top:1px solid #000; padding-top:3px; margin-top:24px; }
  .legend { font-size:8px; border:1px solid #999; padding:6px; margin-bottom:8px; }
  .print-bar { background:#F5A623; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; margin:-12px -12px 12px; }
  .print-btn { background:#080D1A; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer; }
  @media print { .print-bar { display:none; } @page { size: A4 landscape; margin: 8mm; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`;

// ─────────────────────────────────────────────────────────────
// PRINT: TYRE PASS — matches the AC-50 sample layout
// ─────────────────────────────────────────────────────────────
function printTyrePass(equipment: any, tyres: any[]) {
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const rows = tyres.map((t, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700">${esc(t.position)}</td>
      <td>${t.date_of_mount ? new Date(t.date_of_mount).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : ""}</td>
      <td>${t.tread_depth_at_mount ?? t.tread_depth ?? ""}</td>
      <td>${esc(t.inventory_no)}</td>
      <td>${esc(t.serial_no)}</td>
      <td>${esc(t.make)}</td>
      <td>${esc(t.size)}</td>
      <td>${esc(t.pattern)}</td>
      <td>${esc(t.date_of_manufacture)}</td>
      <td>${esc(t.cost_code)}</td>
      <td>${t.hr_km_at_mount ?? ""}</td>
    </tr>`).join("");
  const blank = Array.from({length: Math.max(0, 15 - tyres.length)})
    .map(() => `<tr>${Array(12).fill("<td>&nbsp;</td>").join("")}</tr>`).join("");

  openPrint(`<!DOCTYPE html><html><head><title>Tyre Pass — ${esc(equipment.fleet_number)}</title>
  <style>${PRINT_CSS}</style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Tyre Pass — ${esc(equipment.fleet_number)} — ${dateStr}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span></div>
    <h1>TYRE PASS</h1>
    <div class="legend">
      <b>Position of Tyre</b><br>
      A1 L/R — single axle left/right · LI/LO/RI/RO — inner/outer<br>
      A2, A3… — axle two, three… · S1/S2 — spare tyres
    </div>
  </div>
  <div class="meta">
    <div><span class="label">Fleet No.:</span><div class="field">${esc(equipment.fleet_number)}</div></div>
    <div><span class="label">Veh. Reg. No.:</span><div class="field">${esc(equipment.reg_no)}</div></div>
    <div><span class="label">Date of Issue:</span><div class="field">${dateStr}</div></div>
    <div><span class="label">Make:</span><div class="field">${esc(equipment.make)}</div></div>
    <div><span class="label">Model:</span><div class="field">${esc(equipment.model)}</div></div>
    <div><span class="label">Num. of Tyres:</span><div class="field">${tyres.length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>S/N</th><th>Position</th><th>Date of Mount</th><th>Tread Depth</th>
      <th>Inventory No</th><th>Serial No.</th><th>Make</th><th>Size</th>
      <th>Pattern</th><th>Date of Man.</th><th>Cost Code</th><th>Hr/Km Reading</th>
    </tr></thead>
    <tbody>${rows}${blank}</tbody>
  </table>
  <div class="sig">
    <div><span>Date: ____________ &nbsp; Plant Clerk Name:</span><div class="sig-line">Staff No. / Signature</div></div>
    <div><span>Date: ____________ &nbsp; Supervisor Name:</span><div class="sig-line">Staff No. / Signature</div></div>
  </div>
  </body></html>`);
}

// ─────────────────────────────────────────────────────────────
// PRINT: WEEKLY UPDATE
// ─────────────────────────────────────────────────────────────
function printWeeklyUpdate(records: any[], weekFrom: string, weekTo: string, site: string) {
  const rows = records.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700;color:#92400e">${esc(r.fleet_no)}</td>
      <td>${r.change_date ? new Date(r.change_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : ""}</td>
      <td>${r.hr_km_reading ?? ""}</td>
      <td style="font-weight:700">${esc(r.position)}</td>
      <td style="background:#e8f5e9">${esc(r.new_inventory_no)}</td>
      <td style="background:#e8f5e9">${esc(r.new_serial_no)}</td>
      <td style="background:#e8f5e9">${esc(r.new_make)}</td>
      <td style="background:#e8f5e9">${esc(r.new_size)}</td>
      <td style="background:#e8f5e9">${r.new_tread_depth ?? ""}</td>
      <td style="background:#fff3e0">${esc(r.removed_serial_no)}</td>
      <td style="background:#fff3e0">${esc(r.removed_make)}</td>
      <td style="background:#fff3e0">${r.removed_tread_depth ?? ""}</td>
      <td>${esc(r.condition_remarks)}</td>
    </tr>`).join("");

  openPrint(`<!DOCTYPE html><html><head><title>Tyre Records Weekly Update</title>
  <style>${PRINT_CSS}</style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Tyre Records Weekly Update</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span></div>
    <h1>TYRE RECORDS WEEKLY UPDATE</h1>
    <div style="font-size:9px">Calendar Week:<br><b>${esc(weekFrom)} — ${esc(weekTo)}</b><br>${esc(site || "All Sites")}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">S/N</th><th rowspan="2">Fleet No.</th><th rowspan="2">Date</th>
        <th rowspan="2">Hr/Km</th><th rowspan="2">Position</th>
        <th colspan="5" style="background:#c8e6c9">NEW TYRE</th>
        <th colspan="3" style="background:#ffe0b2">REMOVED TYRE</th>
        <th rowspan="2">Remarks (Condition)</th>
      </tr>
      <tr>
        <th style="background:#c8e6c9">Inv No</th><th style="background:#c8e6c9">Serial</th>
        <th style="background:#c8e6c9">Make</th><th style="background:#c8e6c9">Size</th>
        <th style="background:#c8e6c9">Tread</th>
        <th style="background:#ffe0b2">Serial</th><th style="background:#ffe0b2">Make</th>
        <th style="background:#ffe0b2">Tread</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="14">No tyre changes recorded this week.</td></tr>`}</tbody>
  </table>
  <div class="sig">
    <div><span>Date: ____________ &nbsp; Plant Clerk / Officer:</span><div class="sig-line">Staff No. / Signature</div></div>
    <div><span>Date: ____________ &nbsp; Plant Engineer / SV:</span><div class="sig-line">Staff No. / Signature</div></div>
  </div>
  </body></html>`);
}

// ─────────────────────────────────────────────────────────────
// PRINT: QUARTERLY TREAD DEPTH REPORT
// ─────────────────────────────────────────────────────────────
function printQuarterly(equipment: any, rows: any[], quarter: string, year: number, hrKm: string) {
  const dateStr = new Date().toLocaleDateString("en-GB");
  const body = rows.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700">${esc(r.position)}</td>
      <td>${esc(r.inventory_no)}</td>
      <td>${esc(r.serial_no)}</td>
      <td>${esc(r.make)}</td>
      <td>${esc(r.size)}</td>
      <td>${esc(r.pattern)}</td>
      <td style="font-weight:700">${r.actual_depth ?? ""}</td>
      <td>${r.tread_depth_at_mount ?? ""}</td>
      <td>${r.date_of_mount ? new Date(r.date_of_mount).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : ""}</td>
      <td>${esc(r.comments)}</td>
    </tr>`).join("");

  openPrint(`<!DOCTYPE html><html><head><title>Tyre Tread Depth Quarterly — ${esc(equipment.fleet_number)}</title>
  <style>${PRINT_CSS}</style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Tyre Tread Depth Quarterly Report — ${esc(equipment.fleet_number)}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <div class="logo">HARTLAND<br><span style="font-size:9px;color:#000">NIGERIA LIMITED</span></div>
    <h1>TYRE TREAD DEPTH QUARTERLY REPORT</h1><div></div>
  </div>
  <div class="meta">
    <div><span class="label">Area / Project:</span><div class="field">${esc(equipment.site)}</div></div>
    <div><span class="label">Fleet No.:</span><div class="field">${esc(equipment.fleet_number)}</div></div>
    <div><span class="label">Quarter / Year:</span><div class="field">${esc(quarter)} / ${year}</div></div>
    <div><span class="label">Hr/Km Reading:</span><div class="field">${esc(hrKm)}</div></div>
    <div><span class="label">Serial No.:</span><div class="field"></div></div>
    <div><span class="label">Actual Date:</span><div class="field">${dateStr}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>S/No.</th><th>Position</th><th>Inventory No.</th><th>Serial No.</th>
      <th>Make</th><th>Size</th><th>Pattern</th>
      <th>T. Depth (Actual)</th><th>T. Depth (Fix. Date)</th><th>Fixing Date</th><th>Comments</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="sig">
    <div><span>Date: ____________ &nbsp; Plant Clerk/Officer:</span><div class="sig-line">Staff No. / Signature</div></div>
    <div><span>Date: ____________ &nbsp; Plant Engr. / Supervisor:</span><div class="sig-line">Staff No. / Signature</div></div>
  </div>
  </body></html>`);
}

// ─────────────────────────────────────────────────────────────
// TAB 1: TYRE PASS — current tyres per equipment + full history
// ─────────────────────────────────────────────────────────────
function TyrePassTab({ profile }: { profile: any }) {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selected,  setSelected]  = useState<any>(null);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [tyres,     setTyres]     = useState<any[]>([]);
  const [events,    setEvents]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [mountModal, setMountModal] = useState(false);

  useEffect(() => {
    dbu.from("equipment")
      .select("id,fleet_number,name,make,model,reg_no,site,meter_device,current_hour_meter,current_kilometer")
      .neq("operational_status", "Scrapped")
      .order("fleet_number")
      .then(({ data }: any) => setEquipment(data || []));
  }, []);

  async function loadEquipmentTyres(eq: any) {
    setSelected(eq);
    setEqSearch(`${eq.fleet_number} — ${eq.name}`);
    setShowDrop(false);
    setLoading(true);
    const [tyresRes, eventsRes] = await Promise.all([
      dbu.from("tyres").select("*")
        .eq("fleet_no", eq.fleet_number)
        .eq("status", "Mounted")
        .order("position"),
      dbu.from("tyre_events").select("*")
        .eq("fleet_no", eq.fleet_number)
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    setTyres(tyresRes.data || []);
    setEvents(eventsRes.data || []);
    setLoading(false);
  }

  const filteredEq = equipment.filter(e =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0, 15);

  return (
    <div className="space-y-5">
      {/* Equipment picker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
          Select Equipment
        </label>
        <div className="relative max-w-xl">
          <input className={iCls} placeholder="Search fleet number or name..."
            value={eqSearch}
            onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)} />
          {showDrop && filteredEq.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filteredEq.map(e => (
                <button key={e.id} onClick={() => loadEquipmentTyres(e)}
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                  <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                  <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                  <span className="text-slate-400 text-xs ml-2">{e.site}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <>
          {/* Current Tyre Pass */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Current Tyre Pass — {selected.fleet_number}</h2>
                <p className="text-slate-400 text-sm">{selected.make} {selected.model} · {tyres.length} tyre{tyres.length===1?"":"s"} mounted</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMountModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                  + Mount Tyre
                </button>
                <button onClick={() => printTyrePass(selected, tyres)} disabled={tyres.length === 0}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 disabled:opacity-40">
                  🖨 Print Tyre Pass
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Position","Serial No.","Inventory No.","Make","Size","Pattern","Mounted","Tread @ Mount","Current Tread","Date of Man."].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                  ) : tyres.length === 0 ? (
                    <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                      No tyres mounted yet — click &quot;+ Mount Tyre&quot; to record the first one.
                    </td></tr>
                  ) : tyres.map(t => (
                    <tr key={t.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-bold text-slate-800 font-mono text-xs">{t.position}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{t.serial_no||"—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{t.inventory_no||"—"}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{t.make||"—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{t.size||"—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{t.pattern||"—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {t.date_of_mount ? new Date(t.date_of_mount).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{t.tread_depth_at_mount ?? t.tread_depth ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {t.current_tread_depth != null ? (
                          <span className={t.current_tread_depth <= 3 ? "text-red-600" : t.current_tread_depth <= 5 ? "text-amber-600" : "text-emerald-700"}>
                            {t.current_tread_depth}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{t.date_of_manufacture||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* History timeline — every event ever recorded on this equipment */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Tyre History — {selected.fleet_number}</h2>
              <p className="text-slate-400 text-sm">{events.length} recorded event{events.length===1?"":"s"} · every mount, removal and tread check, newest first</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-50">
              {events.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">No history yet.</div>
              ) : events.map((ev: any) => (
                <div key={ev.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/50">
                  <span className="text-xl mt-0.5">{EVENT_STYLE[ev.event_type]?.icon || "•"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${EVENT_STYLE[ev.event_type]?.badge || "bg-slate-100 text-slate-600"}`}>
                        {ev.event_type.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">{ev.position || ""}</span>
                      <span className="text-xs text-slate-500">{ev.serial_no ? `Serial ${ev.serial_no}` : ""}</span>
                      <span className="text-xs text-slate-400">{ev.make || ""} {ev.size || ""}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(ev.event_date).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}
                      {ev.hr_km_reading ? ` · Hr/Km: ${Number(ev.hr_km_reading).toLocaleString()}` : ""}
                      {ev.tread_depth != null ? ` · Tread: ${ev.tread_depth}mm` : ""}
                      {ev.recorded_by ? ` · by ${ev.recorded_by}` : ""}
                    </p>
                    {ev.remarks && <p className="text-xs text-slate-400 mt-0.5 italic">{ev.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {mountModal && selected && (
        <MountTyreModal
          equipment={selected}
          existingPositions={tyres.map(t => t.position)}
          profile={profile}
          onClose={() => setMountModal(false)}
          onSaved={() => { setMountModal(false); loadEquipmentTyres(selected); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOUNT TYRE MODAL — first-time mounting (no removal involved)
// ─────────────────────────────────────────────────────────────
function MountTyreModal({ equipment, existingPositions, profile, onClose, onSaved }: {
  equipment: any; existingPositions: string[]; profile: any;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    position: "", serial_no: "", inventory_no: "", make: "", size: "",
    pattern: "", date_of_manufacture: "", tread_depth: "",
    date_of_mount: new Date().toISOString().slice(0,10),
    hr_km_reading: "", cost_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  const freePositions = TYRE_POSITIONS.filter(p => !existingPositions.includes(p.code));

  async function handleSave() {
    if (!form.position || !form.serial_no) {
      setError("Position and Serial No. are required."); return;
    }
    setSaving(true);
    const { data: tyre, error: err } = await dbu.from("tyres").insert([{
      fleet_no: equipment.fleet_number,
      position: form.position,
      serial_no: form.serial_no,
      inventory_no: form.inventory_no,
      make: form.make, size: form.size, pattern: form.pattern,
      date_of_manufacture: form.date_of_manufacture,
      tread_depth: Number(form.tread_depth) || null,
      tread_depth_at_mount: Number(form.tread_depth) || null,
      current_tread_depth: Number(form.tread_depth) || null,
      date_of_mount: form.date_of_mount,
      cost_code: form.cost_code,
      status: "Mounted",
    }]).select().single();

    if (err) { setError(err.message); setSaving(false); return; }

    await dbu.from("tyre_events").insert([{
      tyre_id: tyre.id,
      fleet_no: equipment.fleet_number,
      position: form.position,
      event_type: "MOUNT",
      event_date: form.date_of_mount,
      hr_km_reading: Number(form.hr_km_reading) || null,
      tread_depth: Number(form.tread_depth) || null,
      serial_no: form.serial_no, make: form.make, size: form.size, pattern: form.pattern,
      recorded_by: profile?.full_name || "",
    }]);

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Mount New Tyre</p>
            <h2 className="text-lg font-bold text-white">{equipment.fleet_number}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Position *</label>
            <select className={iCls} value={form.position} onChange={e => set("position", e.target.value)}>
              <option value="">Select position...</option>
              {freePositions.map(p => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Serial No. *</label>
            <input className={iCls} value={form.serial_no} onChange={e => set("serial_no", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Inventory No.</label>
            <input className={iCls} value={form.inventory_no} onChange={e => set("inventory_no", e.target.value)}
              placeholder="From store paperwork" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Make</label>
            <input className={iCls} value={form.make} onChange={e => set("make", e.target.value)} placeholder="e.g. MICHELIN" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Size</label>
            <input className={iCls} value={form.size} onChange={e => set("size", e.target.value)} placeholder="e.g. 185/80R14" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Pattern</label>
            <input className={iCls} value={form.pattern} onChange={e => set("pattern", e.target.value)} placeholder="e.g. MXTE" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date of Manufacture</label>
            <input className={iCls} value={form.date_of_manufacture} onChange={e => set("date_of_manufacture", e.target.value)}
              placeholder="e.g. Nov, 2021" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Tread Depth (mm)</label>
            <input type="number" className={iCls} value={form.tread_depth} onChange={e => set("tread_depth", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date of Mount</label>
            <input type="date" className={iCls} value={form.date_of_mount} onChange={e => set("date_of_mount", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Hr/Km Reading</label>
            <input type="number" className={iCls} value={form.hr_km_reading} onChange={e => set("hr_km_reading", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Cost Code</label>
            <input className={iCls} value={form.cost_code} onChange={e => set("cost_code", e.target.value)} />
          </div>
          {error && (
            <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs">⚠️ {error}</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving..." : "Mount Tyre ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 2: WEEKLY UPDATE — tyre swaps, no deletes ever
// ─────────────────────────────────────────────────────────────
function WeeklyUpdateTab({ profile }: { profile: any }) {
  const [records,  setRecords]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [weekFrom, setWeekFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d.toISOString().slice(0,10);
  });
  const [weekTo, setWeekTo] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7); // Sunday
    return d.toISOString().slice(0,10);
  });

  useEffect(() => { load(); }, [weekFrom, weekTo]); // eslint-disable-line

  async function load() {
    setLoading(true);
    const { data } = await dbu.from("tyre_records").select("*")
      .gte("change_date", weekFrom).lte("change_date", weekTo)
      .order("change_date", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Week From</label>
          <input type="date" className={iCls + " w-44"} value={weekFrom} onChange={e => setWeekFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Week To</label>
          <input type="date" className={iCls + " w-44"} value={weekTo} onChange={e => setWeekTo(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={() => printWeeklyUpdate(records, weekFrom, weekTo, "")}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900">
            🖨 Print Weekly Form
          </button>
          <button onClick={() => setModal(true)}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">
            + Record Tyre Change
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Tyre Changes — {new Date(weekFrom).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} to {new Date(weekTo).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</h2>
          <p className="text-slate-400 text-sm">{records.length} change{records.length===1?"":"s"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Fleet No.","Date","Hr/Km","Position","New Tyre","New Tread","Removed Tyre","Rem. Tread","Condition"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">No tyre changes this week.</td></tr>
              ) : records.map((r:any) => (
                <tr key={r.id} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 font-bold text-amber-600 font-mono text-xs">{r.fleet_no}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(r.change_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.hr_km_reading ? Number(r.hr_km_reading).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{r.position}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-emerald-700 font-semibold">{r.new_serial_no||"—"}</span>
                    <span className="text-slate-400 ml-1">{r.new_make}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-emerald-700">{r.new_tread_depth ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-orange-700 font-semibold">{r.removed_serial_no||"—"}</span>
                    <span className="text-slate-400 ml-1">{r.removed_make}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-orange-700">{r.removed_tread_depth ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-32 truncate">{r.condition_remarks||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <TyreChangeModal profile={profile}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TYRE CHANGE MODAL — the swap. Old tyre is status-flipped and
// event-logged, NEVER deleted. New tyre inserted + MOUNT event.
// ─────────────────────────────────────────────────────────────
function TyreChangeModal({ profile, onClose, onSaved }: {
  profile: any; onClose: () => void; onSaved: () => void;
}) {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [selEq,     setSelEq]     = useState<any>(null);
  const [mounted,   setMounted]   = useState<any[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const [form, setForm] = useState({
    change_date: new Date().toISOString().slice(0,10),
    hr_km_reading: "",
    position: "",
    removed_tyre_id: "",          // resolved from position automatically
    removed_tread_depth: "",
    removed_condition: "Scrapped", // 'Scrapped' | 'Removed - Reusable'
    condition_remarks: "",
    new_serial_no: "", new_inventory_no: "", new_make: "",
    new_size: "", new_pattern: "", new_tread_depth: "",
    new_date_of_manufacture: "",
  });

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  useEffect(() => {
    dbu.from("equipment")
      .select("id,fleet_number,name,site")
      .neq("operational_status", "Scrapped")
      .order("fleet_number")
      .then(({ data }: any) => setEquipment(data || []));
  }, []);

  async function selectEquipment(eq: any) {
    setSelEq(eq);
    setEqSearch(`${eq.fleet_number} — ${eq.name}`);
    setShowDrop(false);
    const { data } = await dbu.from("tyres").select("*")
      .eq("fleet_no", eq.fleet_number).eq("status", "Mounted");
    setMounted(data || []);
  }

  function selectPosition(pos: string) {
    set("position", pos);
    const existing = mounted.find(t => t.position === pos);
    set("removed_tyre_id", existing?.id || "");
    // Pre-fill removed tread with the tyre's last known depth, editable.
    set("removed_tread_depth", existing?.current_tread_depth ?? existing?.tread_depth ?? "");
  }

  const removedTyre = mounted.find(t => t.id === form.removed_tyre_id);
  const filteredEq = equipment.filter(e =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0, 15);

  async function handleSave() {
    if (!selEq || !form.position || !form.new_serial_no) {
      setError("Equipment, position and new tyre serial are required."); return;
    }
    setSaving(true);
    const by = profile?.full_name || "";

    // 1. If a tyre currently occupies that position — flip its status,
    //    write its REMOVE event. It is never deleted.
    if (removedTyre) {
      await dbu.from("tyres").update({
        status: form.removed_condition,
        removed_date: form.change_date,
        removal_remarks: form.condition_remarks,
        current_tread_depth: Number(form.removed_tread_depth) || removedTyre.current_tread_depth,
      }).eq("id", removedTyre.id);

      await dbu.from("tyre_events").insert([{
        tyre_id: removedTyre.id,
        fleet_no: selEq.fleet_number,
        position: form.position,
        event_type: "REMOVE",
        event_date: form.change_date,
        hr_km_reading: Number(form.hr_km_reading) || null,
        tread_depth: Number(form.removed_tread_depth) || null,
        serial_no: removedTyre.serial_no, make: removedTyre.make,
        size: removedTyre.size, pattern: removedTyre.pattern,
        remarks: `${form.removed_condition}${form.condition_remarks ? " — " + form.condition_remarks : ""}`,
        recorded_by: by,
      }]);
    }

    // 2. Insert the new tyre + its MOUNT event.
    const { data: newTyre, error: err } = await dbu.from("tyres").insert([{
      fleet_no: selEq.fleet_number,
      position: form.position,
      serial_no: form.new_serial_no,
      inventory_no: form.new_inventory_no,
      make: form.new_make, size: form.new_size, pattern: form.new_pattern,
      date_of_manufacture: form.new_date_of_manufacture,
      tread_depth: Number(form.new_tread_depth) || null,
      tread_depth_at_mount: Number(form.new_tread_depth) || null,
      current_tread_depth: Number(form.new_tread_depth) || null,
      date_of_mount: form.change_date,
      status: "Mounted",
    }]).select().single();

    if (err) { setError(err.message); setSaving(false); return; }

    await dbu.from("tyre_events").insert([{
      tyre_id: newTyre.id,
      fleet_no: selEq.fleet_number,
      position: form.position,
      event_type: "MOUNT",
      event_date: form.change_date,
      hr_km_reading: Number(form.hr_km_reading) || null,
      tread_depth: Number(form.new_tread_depth) || null,
      serial_no: form.new_serial_no, make: form.new_make,
      size: form.new_size, pattern: form.new_pattern,
      recorded_by: by,
    }]);

    // 3. Weekly form record — same table the weekly view reads.
    await dbu.from("tyre_records").insert([{
      fleet_no: selEq.fleet_number,
      change_date: form.change_date,
      hr_km_reading: Number(form.hr_km_reading) || null,
      position: form.position,
      new_inventory_no: form.new_inventory_no,
      new_serial_no: form.new_serial_no,
      new_make: form.new_make, new_size: form.new_size,
      new_pattern: form.new_pattern,
      new_tread_depth: Number(form.new_tread_depth) || null,
      removed_inventory_no: removedTyre?.inventory_no || null,
      removed_serial_no: removedTyre?.serial_no || null,
      removed_make: removedTyre?.make || null,
      removed_size: removedTyre?.size || null,
      removed_pattern: removedTyre?.pattern || null,
      removed_tread_depth: Number(form.removed_tread_depth) || null,
      condition_remarks: `${removedTyre ? form.removed_condition + (form.condition_remarks ? " — " : "") : ""}${form.condition_remarks}`,
      recorded_by: by,
    }]);

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Weekly Tyre Update</p>
            <h2 className="text-lg font-bold text-white">Record Tyre Change</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Equipment */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Equipment *</label>
            <input className={iCls} placeholder="Search fleet number..."
              value={eqSearch}
              onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && filteredEq.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {filteredEq.map(e => (
                  <button key={e.id} onClick={() => selectEquipment(e)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                    <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selEq && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date of Change</label>
                  <input type="date" className={iCls} value={form.change_date} onChange={e => set("change_date", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Hr/Km Reading</label>
                  <input type="number" className={iCls} value={form.hr_km_reading} onChange={e => set("hr_km_reading", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Position *</label>
                  <select className={iCls} value={form.position} onChange={e => selectPosition(e.target.value)}>
                    <option value="">Select...</option>
                    {TYRE_POSITIONS.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.code}{mounted.some(t => t.position === p.code) ? " (occupied)" : " (empty)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Removed tyre — auto-resolved from position */}
              {removedTyre ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                    Tyre being removed from {form.position}
                  </p>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    {[["Serial", removedTyre.serial_no],["Make", removedTyre.make],
                      ["Size", removedTyre.size],["Mounted", removedTyre.date_of_mount ? new Date(removedTyre.date_of_mount).toLocaleDateString("en-GB") : "—"]].map(([l,v]) => (
                      <div key={l}><p className="text-orange-400">{l}</p><p className="font-semibold text-slate-800">{v||"—"}</p></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-orange-500 uppercase tracking-wider block mb-1">Tread at Removal (mm)</label>
                      <input type="number" className={iCls} value={form.removed_tread_depth}
                        onChange={e => set("removed_tread_depth", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-orange-500 uppercase tracking-wider block mb-1">Condition</label>
                      <select className={iCls} value={form.removed_condition} onChange={e => set("removed_condition", e.target.value)}>
                        <option value="Scrapped">Scrapped (end of life)</option>
                        <option value="Removed - Reusable">Reusable (back to store)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-orange-500 uppercase tracking-wider block mb-1">Remarks</label>
                      <input className={iCls} value={form.condition_remarks}
                        onChange={e => set("condition_remarks", e.target.value)} placeholder="e.g. Worn out" />
                    </div>
                  </div>
                </div>
              ) : form.position ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
                  {form.position} is currently empty — this records a fresh mount, no removal.
                </div>
              ) : null}

              {/* New tyre */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">New tyre going on</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ["new_serial_no","Serial No. *",""],["new_inventory_no","Inventory No.","From store"],
                    ["new_make","Make","e.g. MICHELIN"],["new_size","Size","e.g. 185/80R14"],
                    ["new_pattern","Pattern","e.g. MXTE"],["new_date_of_manufacture","Date of Man.","e.g. Nov, 2021"],
                  ] as [string,string,string][]).map(([k, label, ph]) => (
                    <div key={k}>
                      <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block mb-1">{label}</label>
                      <input className={iCls} value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={ph} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block mb-1">Tread Depth (mm)</label>
                    <input type="number" className={iCls} value={form.new_tread_depth}
                      onChange={e => set("new_tread_depth", e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs">⚠️ {error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !selEq}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Record Change ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 3: QUARTERLY TREAD REPORT
// ─────────────────────────────────────────────────────────────
function QuarterlyTab({ profile }: { profile: any }) {
  const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
  const [equipment, setEquipment] = useState<any[]>([]);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [selEq,     setSelEq]     = useState<any>(null);
  const [quarter,   setQuarter]   = useState(`Q${Math.floor(new Date().getMonth()/3)+1}`);
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [hrKm,      setHrKm]      = useState("");
  const [rows,      setRows]      = useState<any[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    dbu.from("equipment")
      .select("id,fleet_number,name,site,meter_device,current_hour_meter,current_kilometer")
      .neq("operational_status", "Scrapped")
      .order("fleet_number")
      .then(({ data }: any) => setEquipment(data || []));
  }, []);

  async function selectEquipment(eq: any) {
    setSelEq(eq);
    setEqSearch(`${eq.fleet_number} — ${eq.name}`);
    setShowDrop(false);
    setSaved(false);
    // Pre-fill Hr/Km from latest daily log for this equipment, falling
    // back to the equipment's own meter fields.
    const { data: latestLog } = await dbu.from("daily_logs")
      .select("hr_km_reading")
      .eq("fleet_no", eq.fleet_number)
      .gt("hr_km_reading", 0)
      .order("log_date", { ascending: false })
      .limit(1);
    const reading = latestLog?.[0]?.hr_km_reading
      ?? (eq.meter_device === "Km" ? eq.current_kilometer : eq.current_hour_meter) ?? "";
    setHrKm(String(reading || ""));

    const { data: mounted } = await dbu.from("tyres").select("*")
      .eq("fleet_no", eq.fleet_number).eq("status", "Mounted").order("position");
    setRows((mounted || []).map((t:any) => ({
      ...t,
      actual_depth: t.current_tread_depth ?? "",
      comments: "",
    })));
  }

  function updateRow(id: string, field: string, value: any) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    if (!selEq || rows.length === 0) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0,10);
    const by = profile?.full_name || "";

    for (const r of rows) {
      if (r.actual_depth === "" || r.actual_depth == null) continue;
      // TREAD_CHECK event — the quarterly measurement, appended to history
      await dbu.from("tyre_events").insert([{
        tyre_id: r.id,
        fleet_no: selEq.fleet_number,
        position: r.position,
        event_type: "TREAD_CHECK",
        event_date: today,
        hr_km_reading: Number(hrKm) || null,
        tread_depth: Number(r.actual_depth),
        serial_no: r.serial_no, make: r.make, size: r.size, pattern: r.pattern,
        remarks: `${quarter} ${year} quarterly check${r.comments ? " — " + r.comments : ""}`,
        recorded_by: by,
      }]);
      // Keep the tyre's live current depth in sync
      await dbu.from("tyres").update({ current_tread_depth: Number(r.actual_depth) }).eq("id", r.id);
    }

    setSaving(false);
    setSaved(true);
  }

  const filteredEq = equipment.filter(e =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0, 15);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Equipment</label>
            <input className={iCls} placeholder="Search fleet number..."
              value={eqSearch}
              onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && filteredEq.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {filteredEq.map(e => (
                  <button key={e.id} onClick={() => selectEquipment(e)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                    <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Quarter / Year</label>
            <div className="flex gap-2">
              <select className={iCls} value={quarter} onChange={e => setQuarter(e.target.value)}>
                {QUARTERS.map(q => <option key={q}>{q}</option>)}
              </select>
              <select className={iCls} value={String(year)} onChange={e => setYear(parseInt(e.target.value))}>
                {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Hr/Km Reading</label>
            <input type="number" className={iCls} value={hrKm} onChange={e => setHrKm(e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1">Pre-filled from latest Daily Log — verify.</p>
          </div>
        </div>
      </div>

      {selEq && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-slate-800">Tread Measurement — {selEq.fleet_number} · {quarter} {year}</h2>
              <p className="text-slate-400 text-sm">Enter the measured depth for each mounted tyre</p>
            </div>
            <div className="flex gap-3 items-center">
              {saved && <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold">✓ Saved</span>}
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {saving ? "Saving..." : "💾 Save Measurements"}
              </button>
              <button onClick={() => printQuarterly(selEq, rows, quarter, year, hrKm)}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900">
                🖨 Print Report
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Position","Serial No.","Make","Size","Pattern","T. Depth @ Mount","T. Depth Actual (mm)","Wear","Comments"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r:any) => {
                  const wear = r.tread_depth_at_mount != null && r.actual_depth !== ""
                    ? (Number(r.tread_depth_at_mount) - Number(r.actual_depth)) : null;
                  return (
                    <tr key={r.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-bold font-mono text-xs text-slate-800">{r.position}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.serial_no||"—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.make||"—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.size||"—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.pattern||"—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.tread_depth_at_mount ?? "—"}</td>
                      <td className="px-4 py-3">
                        <input type="number" step="0.5"
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          value={r.actual_depth}
                          onChange={e => updateRow(r.id, "actual_depth", e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {wear != null ? (
                          <span className={wear >= 4 ? "text-red-600" : wear >= 2 ? "text-amber-600" : "text-emerald-700"}>
                            −{wear.toFixed(1)}mm
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <input className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          value={r.comments} placeholder="—"
                          onChange={e => updateRow(r.id, "comments", e.target.value)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selEq && rows.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          No mounted tyres on {selEq.fleet_number} — record them on the Tyre Pass tab first.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 4: ALL TYRES REGISTER
// ─────────────────────────────────────────────────────────────
function AllTyresTab() {
  const [tyres,        setTyres]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    dbu.from("tyres").select("*").order("created_at", { ascending: false })
      .then(({ data }: any) => { setTyres(data || []); setLoading(false); });
  }, []);

  const filtered = tyres.filter((t:any) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      (t.serial_no||"").toLowerCase().includes(q) ||
      (t.fleet_no||"").toLowerCase().includes(q) ||
      (t.make||"").toLowerCase().includes(q);
    return matchQ && (!filterStatus || t.status === filterStatus);
  });

  const counts = {
    mounted:  tyres.filter((t:any) => t.status === "Mounted").length,
    reusable: tyres.filter((t:any) => t.status === "Removed - Reusable").length,
    scrapped: tyres.filter((t:any) => t.status === "Scrapped").length,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.mounted}</p>
          <p className="text-sm opacity-70 mt-1">Mounted</p>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.reusable}</p>
          <p className="text-sm opacity-70 mt-1">Reusable (in store)</p>
        </div>
        <div className="bg-red-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.scrapped}</p>
          <p className="text-sm opacity-70 mt-1">Scrapped</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <input placeholder="Search serial no., fleet no., make..."
          value={search} onChange={e => setSearch(e.target.value)}
          className={iCls + " lg:col-span-2"} />
        <select className={iCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Mounted</option>
          <option>Removed - Reusable</option>
          <option>Scrapped</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Tyre Register</h2>
          <p className="text-slate-400 text-sm">{filtered.length} of {tyres.length} tyres — every tyre ever recorded, none deleted</p>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Serial No.","Fleet No.","Position","Make","Size","Pattern","Mounted","Removed","Tread @ Mount","Current Tread","Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-400">No tyres found.</td></tr>
              ) : filtered.map((t:any) => (
                <tr key={t.id} className="hover:bg-amber-50/20">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{t.serial_no||"—"}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600">{t.fleet_no||"—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.position||"—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{t.make||"—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.size||"—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.pattern||"—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {t.date_of_mount ? new Date(t.date_of_mount).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {t.removed_date ? new Date(t.removed_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.tread_depth_at_mount ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-semibold">{t.current_tread_depth ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${TYRE_STATUS_STYLE[t.status]||"bg-slate-100 text-slate-600"}`}>
                      {t.status||"—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function TiresPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"pass"|"weekly"|"quarterly"|"register">("pass");

  const TABS = [
    { key: "pass",      label: "🛞 Tyre Pass" },
    { key: "weekly",    label: "📅 Weekly Update" },
    { key: "quarterly", label: "📏 Quarterly Tread Report" },
    { key: "register",  label: "📁 All Tyres" },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">TMS</p>
        <h1 className="text-3xl font-bold text-slate-900">Tire Management</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Tyre passes, weekly change records and quarterly tread depth reports — full history per equipment, no record ever deleted.
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pass"      && <TyrePassTab profile={profile} />}
      {tab === "weekly"    && <WeeklyUpdateTab profile={profile} />}
      {tab === "quarterly" && <QuarterlyTab profile={profile} />}
      {tab === "register"  && <AllTyresTab />}
    </div>
  );
}