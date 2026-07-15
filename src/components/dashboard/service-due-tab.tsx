/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import {
  computeServiceDue, buildUsageWindows, sortByUrgency,
  URGENCY_STYLE, SERVICE_LETTER_COLOR, DUE_SOON_DAYS,
  type ServiceDueRow,
} from "@/lib/service-due";

// ─────────────────────────────────────────────────────────────
// WSPT PRINT — Weekly Service Program Tracking (PLT form)
// ─────────────────────────────────────────────────────────────
function printWSPT(rows: ServiceDueRow[], group: string) {
  const dateStr = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const esc = (v:any) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700;color:#92400e">${esc(r.fleet_number)}</td>
      <td style="text-align:left">${esc(r.name)}</td>
      <td>${r.last_service_reading.toLocaleString()}</td>
      <td>${r.current_reading.toLocaleString()}</td>
      <td>${r.avg_per_day ? r.avg_per_day.toFixed(1) : "—"}</td>
      <td>${r.next_service_threshold.toLocaleString()}</td>
      <td style="color:${r.remaining<=0?'#dc2626':'inherit'}">${r.remaining.toLocaleString()}</td>
      <td>${r.service_number}</td>
      <td style="background:${SERVICE_LETTER_COLOR[r.service_letter].hex};color:#fff;font-weight:700">${r.service_letter}</td>
      <td></td><td></td><td></td><td></td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><title>WSPT — ${group} — ${dateStr}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 9px; padding: 10px; }
    .header { text-align:center; margin-bottom:10px; }
    .header h2 { font-size:15px; font-weight:bold; }
    .header h3 { font-size:11px; color:#444; }
    .info { display:flex; justify-content:space-between; margin-bottom:8px; font-size:9px; }
    table { width:100%; border-collapse:collapse; font-size:8px; }
    th, td { border:1px solid #999; padding:3px 4px; text-align:center; }
    th { background:#e2e8f0; font-weight:bold; font-size:7.5px; }
    .print-bar { background:#F5A623; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .print-btn { background:#080D1A; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer; }
    @media print { .print-bar { display:none; } @page { size: A3 landscape; margin: 8mm; } }
  </style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Weekly Service Program Tracking — ${esc(group)}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <h2>HARTLAND NIGERIA LIMITED — Plant Department</h2>
    <h3>Weekly Service Program Tracking (WSPT) — ${esc(group)}</h3>
  </div>
  <div class="info">
    <span>Generated: <strong>${dateStr}</strong></span>
    <span>Equipment: <strong>${rows.length}</strong></span>
    <span>Note: computed from Daily Log Hr/Km readings — verify before scheduling.</span>
  </div>
  <table>
    <thead><tr>
      <th rowspan="2">S/No</th><th rowspan="2">Fleet No</th><th rowspan="2">Description</th>
      <th colspan="4">Meter Reading</th>
      <th rowspan="2">Service<br>No.</th><th rowspan="2">Service<br>Code</th>
      <th rowspan="2">On Site</th><th rowspan="2">In W/Shop</th>
      <th rowspan="2">Est. Duration<br>Hour(s)</th><th rowspan="2">Make Available<br>for Service On</th>
    </tr><tr>
      <th>Last Service</th><th>Present</th><th>Avg/Day</th><th>Remaining</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <script>window.onload=()=>{};</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=1200,height=800");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─────────────────────────────────────────────────────────────
// WMC PRINT — Weekly Maintenance Chart (blank weekly grid, matching
// the paper form, plus a live "Due This Week" reference list since
// nothing in the system yet assigns equipment to a specific weekday —
// that's a scheduling decision a human makes when filling this in.
// ─────────────────────────────────────────────────────────────
function printWMC(rows: ServiceDueRow[], group: string) {
  const dateStr = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const esc = (v:any) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const dueThisWeek = rows.filter(r => r.urgency === "Overdue" || r.urgency === "Due Soon");
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const dueListHtml = dueThisWeek.map(r => `
    <tr>
      <td style="font-weight:700;color:#92400e">${esc(r.fleet_number)}</td>
      <td style="text-align:left">${esc(r.name)}</td>
      <td style="background:${SERVICE_LETTER_COLOR[r.service_letter].hex};color:#fff;font-weight:700">${r.service_letter}</td>
      <td style="color:${r.urgency==='Overdue'?'#dc2626':'#d97706'};font-weight:700">${r.urgency}</td>
      <td>${r.days_to_due !== null ? Math.round(r.days_to_due) + " days" : "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><title>WMC — ${group} — ${dateStr}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 10px; }
    .header { text-align:center; margin-bottom:10px; }
    .header h2 { font-size:15px; font-weight:bold; }
    .header h3 { font-size:11px; color:#444; }
    table { width:100%; border-collapse:collapse; font-size:9px; margin-bottom:16px; }
    th, td { border:1px solid #999; padding:4px; text-align:center; }
    th { background:#e2e8f0; font-weight:bold; }
    .week-grid td { height:120px; vertical-align:top; }
    .legend { display:flex; gap:14px; margin:10px 0; font-size:9px; }
    .legend span { display:inline-flex; align-items:center; gap:4px; }
    .swatch { width:12px; height:12px; display:inline-block; border-radius:2px; }
    .print-bar { background:#F5A623; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .print-btn { background:#080D1A; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer; }
    @media print { .print-bar { display:none; } @page { size: A3 landscape; margin: 8mm; } }
  </style></head><body>
  <div class="print-bar"><span style="color:#fff;font-weight:700">Weekly Maintenance Chart — ${esc(group)}</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>
  <div class="header">
    <h2>HARTLAND NIGERIA LIMITED — Plant Department</h2>
    <h3>Weekly Service Maintenance Chart (WMC) For ${esc(group)}</h3>
  </div>

  <table class="week-grid">
    <thead><tr>${days.map(d=>`<th>${d}</th>`).join("")}</tr></thead>
    <tbody><tr>${days.map(()=>`<td></td>`).join("")}</tr></tbody>
  </table>

  <div class="legend">
    <span><span class="swatch" style="background:#3B82F6"></span> Service "A"</span>
    <span><span class="swatch" style="background:#EAB308"></span> Service "B"</span>
    <span><span class="swatch" style="background:#22C55E"></span> Service "C"</span>
    <span><span class="swatch" style="background:#EF4444"></span> Service "D"</span>
  </div>

  <h3 style="margin-bottom:6px">Due This Week — reference (assign to a day above by hand)</h3>
  <table>
    <thead><tr><th>Fleet No</th><th>Description</th><th>Code</th><th>Status</th><th>Due In</th></tr></thead>
    <tbody>${dueListHtml || `<tr><td colspan="5">Nothing due this week for ${esc(group)}.</td></tr>`}</tbody>
  </table>

  </body></html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─────────────────────────────────────────────────────────────
// SERVICE DUE TAB
// ─────────────────────────────────────────────────────────────
export function ServiceDueTab() {
  const [rows,    setRows]    = useState<ServiceDueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [group,   setGroup]   = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    // Equipment — excluding Scrapped, needs the new service-tracking fields.
    const [e1, e2] = await Promise.all([
      dbu.from("equipment")
        .select("id,fleet_number,name,category,operational_status,meter_device,current_hour_meter,current_kilometer,service_interval,last_service_reading,last_service_date,wmc_group")
        .neq("operational_status", "Scrapped").range(0,999),
      dbu.from("equipment")
        .select("id,fleet_number,name,category,operational_status,meter_device,current_hour_meter,current_kilometer,service_interval,last_service_reading,last_service_date,wmc_group")
        .neq("operational_status", "Scrapped").range(1000,1999),
    ]);
    const equipment = [...(e1.data||[]), ...(e2.data||[])];

    // Daily logs — trailing 30 days, used to compute real average usage.
    const cutoff = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const [l1, l2] = await Promise.all([
      dbu.from("daily_logs").select("equipment_id,hr_km_reading,log_date").gte("log_date", cutoff).range(0,999),
      dbu.from("daily_logs").select("equipment_id,hr_km_reading,log_date").gte("log_date", cutoff).range(1000,1999),
    ]);
    const logs = [...(l1.data||[]), ...(l2.data||[])];

    const windows = buildUsageWindows(logs);
    const computed = sortByUrgency(computeServiceDue(equipment, windows));
    setRows(computed);
    setLoading(false);
  }

  const groups = [...new Set(rows.map(r => r.wmc_group))].sort();
  const filtered = group ? rows.filter(r => r.wmc_group === group) : rows;

  const counts = {
    overdue:  rows.filter(r => r.urgency === "Overdue").length,
    dueSoon:  rows.filter(r => r.urgency === "Due Soon").length,
    healthy:  rows.filter(r => r.urgency === "Healthy").length,
    unknown:  rows.filter(r => r.urgency === "Unknown").length,
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        ℹ️ Average usage is calculated from Daily Log Hr/Km readings over the trailing 30 days.
        Equipment without at least 2 logged readings shows as <strong>Unknown</strong> — can&apos;t forecast a due date without usage history yet.
        &quot;Due Soon&quot; threshold is {DUE_SOON_DAYS} days — adjustable.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.overdue}</p>
          <p className="text-sm opacity-70 mt-1">Overdue</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.dueSoon}</p>
          <p className="text-sm opacity-70 mt-1">Due Soon</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.healthy}</p>
          <p className="text-sm opacity-70 mt-1">Healthy</p>
        </div>
        <div className="bg-slate-400 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{counts.unknown}</p>
          <p className="text-sm opacity-70 mt-1">Unknown (no usage data)</p>
        </div>
      </div>

      {/* Group filter + export */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center gap-4">
        <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
          value={group} onChange={e => setGroup(e.target.value)}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g}>{g}</option>)}
        </select>
        <p className="text-sm text-slate-500">{filtered.length} equipment</p>
        <div className="ml-auto flex gap-3">
          <button onClick={() => printWSPT(filtered, group || "All Equipment")}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900">
            🖨 WSPT
          </button>
          <button onClick={() => printWMC(filtered, group || "All Equipment")}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">
            🖨 WMC
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["","Fleet No.","Description","Group","Current","Avg/Day","Next Service","Remaining","Due In","Code"].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-slate-400">No equipment found.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.equipment_id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${URGENCY_STYLE[r.urgency].dot}`} title={r.urgency} />
                  </td>
                  <td className="px-3 py-3 font-bold text-amber-600 font-mono text-xs">{r.fleet_number}</td>
                  <td className="px-3 py-3 text-slate-700 text-xs max-w-48 truncate">{r.name}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs">{r.wmc_group}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{r.current_reading.toLocaleString()} {r.meter_device}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs">{r.avg_per_day ? r.avg_per_day.toFixed(1) : "—"}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{r.next_service_threshold.toLocaleString()}</td>
                  <td className={`px-3 py-3 text-xs font-semibold ${r.remaining<=0?"text-red-600":"text-slate-600"}`}>{r.remaining.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${URGENCY_STYLE[r.urgency].bg} ${URGENCY_STYLE[r.urgency].text}`}>
                      {r.days_to_due !== null ? `${Math.round(r.days_to_due)}d` : r.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${SERVICE_LETTER_COLOR[r.service_letter].bg} ${SERVICE_LETTER_COLOR[r.service_letter].text}`}>
                      {r.service_letter}
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