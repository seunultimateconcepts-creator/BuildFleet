/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { dbu } from "@/lib/db";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────
// EQUIPMENT DISTRIBUTION CHART TAB
// ─────────────────────────────────────────────────────────────
// Generates a category × location matrix, matching the shape of
// Hartland's existing "Equipment Distribution Chart" spreadsheet:
//   rows    = fleet number prefix code + equipment type (e.g. BD / Dozer D6)
//   columns = one pair per location (Fleet No. list, count)
//   right   = Total / Working / B.D / Storage per row
// Scrapped equipment is excluded — it isn't part of the active
// distribution any more. Columns are grouped by LOCATION (Imeke, Agbede...)
// not by raw site record, so a location's Project/Workshop/Repair/Storage
// sub-sites collapse into a single column.
//
// Add this as a 5th tab on the Reports page:
//   import { DistributionChartTab } from "./distribution-chart-tab";
//   { key: "distribution", label: "📐 Equipment Distribution" }
//   {tab === "distribution" && <DistributionChartTab />}
// ─────────────────────────────────────────────────────────────

// Hartland's original chart uses the FLEET NUMBER PREFIX as the category
// code column (e.g. "BD-08" -> "BD" for dozers, "EL-02" -> "EL" for
// excavators) — not the long-form `equipment.category` text field. The
// prefix is everything before the first hyphen in the fleet number.
function fleetPrefix(fleetNumber: string): string {
  const code = (fleetNumber || "").split("-")[0].trim();
  return code || "UNK";
}

// Site names follow "<Type Label> - <Location> - <Region>", e.g.
// "Workshop (Central) - Imeke - Edo", "Yard (Storage) - Imeke - Edo",
// "Project - Benin Model City - Edo". The Project/Workshop/Repair/Storage
// prefix fragments what is really ONE physical location into up to 4 site
// rows. For the distribution chart we group by the middle "location"
// segment so Imeke's P+W+R+S all land in a single column, matching
// Hartland's original chart (one column per place, not per sub-site).
function locationKey(siteName: string): string {
  const parts = siteName.split(" - ").map(p => p.trim());
  if (parts.length >= 3) return parts.slice(1, -1).join(" - ");
  return siteName; // fallback for anything that doesn't fit the pattern
}

interface Row {
  code: string;
  name: string;
  perSite: Record<string, { items: { fleetNo: string; status: string }[]; count: number }>;
  working: number;
  bd: number;
  storage: number;
  total: number;
}

interface Matrix {
  orderedRows: Row[];
  categorySpans: { code: string; start: number; count: number }[];
  locations: string[];
  equipmentCount: number;
}

// ── Shared data build — used by both the Excel and PDF exports ──────
function buildMatrix(equipment: any[]): Matrix {
  const rowMap = new Map<string, Row>();          // key = code|||name
  const codeOrder: string[] = [];                  // preserves first-seen code order
  const typeOrderByCode: Record<string, string[]> = {};
  const locationSet = new Set<string>();

  for (const e of equipment) {
    const code = fleetPrefix(e.fleet_number);
    const type = e.name || "Unspecified";
    const loc  = e.site ? locationKey(e.site) : "Unassigned";
    locationSet.add(loc);

    const key = `${code}|||${type}`;
    if (!rowMap.has(key)) {
      rowMap.set(key, { code, name: type, perSite: {}, working: 0, bd: 0, storage: 0, total: 0 });
      if (!codeOrder.includes(code)) codeOrder.push(code);
      if (!typeOrderByCode[code]) typeOrderByCode[code] = [];
      typeOrderByCode[code].push(type);
    }
    const row = rowMap.get(key)!;

    if (!row.perSite[loc]) row.perSite[loc] = { items: [], count: 0 };
    row.perSite[loc].items.push({ fleetNo: e.fleet_number, status: e.operational_status || "" });
    row.perSite[loc].count += 1;
    row.total += 1;

    if (e.operational_status === "Working") row.working += 1;
    else if (e.operational_status === "Break Down" || e.operational_status === "Under Repair") row.bd += 1;
    else if (e.operational_status === "Storage") row.storage += 1;
  }

  codeOrder.sort();
  const locations = Array.from(locationSet).sort();

  const orderedRows: Row[] = [];
  const categorySpans: { code: string; start: number; count: number }[] = [];
  for (const code of codeOrder) {
    const start = orderedRows.length;
    for (const type of typeOrderByCode[code]) {
      orderedRows.push(rowMap.get(`${code}|||${type}`)!);
    }
    categorySpans.push({ code, start, count: typeOrderByCode[code].length });
  }

  return { orderedRows, categorySpans, locations, equipmentCount: equipment.length };
}

// ── Excel export (data-focused, full fleet-number detail) ───────────
function exportExcel(matrix: Matrix) {
  const { orderedRows, categorySpans, locations } = matrix;

  const SITE_START_COL = 2;
  const totalCol   = SITE_START_COL + locations.length * 2;
  const workingCol = totalCol + 1;
  const bdCol      = totalCol + 2;
  const storageCol = totalCol + 3;
  const lastCol    = storageCol;

  const dateStr = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const aoa: any[][] = [];

  const titleRow = new Array(lastCol + 1).fill("");
  titleRow[0] = `HARTLAND NIGERIA LIMITED — EQUIPMENT DISTRIBUTION CHART   [${dateStr}]`;
  aoa.push(titleRow);

  const siteHeaderRow = new Array(lastCol + 1).fill("");
  siteHeaderRow[0] = "CODE";
  siteHeaderRow[1] = "EQUIPMENT TYPE";
  locations.forEach((loc, i) => { siteHeaderRow[SITE_START_COL + i * 2] = loc; });
  siteHeaderRow[totalCol]   = "TOTAL";
  siteHeaderRow[workingCol] = "WORKING";
  siteHeaderRow[bdCol]      = "B.D";
  siteHeaderRow[storageCol] = "STORAGE";
  aoa.push(siteHeaderRow);

  const subHeaderRow = new Array(lastCol + 1).fill("");
  locations.forEach((_, i) => {
    subHeaderRow[SITE_START_COL + i * 2]     = "Fleet No";
    subHeaderRow[SITE_START_COL + i * 2 + 1] = "N";
  });
  aoa.push(subHeaderRow);

  const DATA_START_ROW = 3;

  for (const row of orderedRows) {
    const line = new Array(lastCol + 1).fill("");
    line[0] = row.code;
    line[1] = row.name;
    locations.forEach((loc, i) => {
      const cell = row.perSite[loc];
      line[SITE_START_COL + i * 2]     = cell ? cell.items.map(it => it.fleetNo).join(", ") : "";
      line[SITE_START_COL + i * 2 + 1] = cell ? cell.count : "";
    });
    line[totalCol]   = row.total;
    line[workingCol] = row.working;
    line[bdCol]      = row.bd;
    line[storageCol] = row.storage;
    aoa.push(line);
  }

  const grandRow = new Array(lastCol + 1).fill("");
  grandRow[0] = "GRAND TOTAL";
  let grandTotal = 0, grandWorking = 0, grandBd = 0, grandStorage = 0;
  locations.forEach((loc, i) => {
    const siteCount = orderedRows.reduce((s, r) => s + (r.perSite[loc]?.count || 0), 0);
    grandRow[SITE_START_COL + i * 2 + 1] = siteCount || "";
  });
  orderedRows.forEach(r => {
    grandTotal += r.total; grandWorking += r.working; grandBd += r.bd; grandStorage += r.storage;
  });
  grandRow[totalCol] = grandTotal; grandRow[workingCol] = grandWorking;
  grandRow[bdCol] = grandBd; grandRow[storageCol] = grandStorage;
  aoa.push(grandRow);

  const grandRowIdx = aoa.length - 1;
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    { s: { r: 1, c: totalCol },   e: { r: 2, c: totalCol } },
    { s: { r: 1, c: workingCol }, e: { r: 2, c: workingCol } },
    { s: { r: 1, c: bdCol },      e: { r: 2, c: bdCol } },
    { s: { r: 1, c: storageCol }, e: { r: 2, c: storageCol } },
    { s: { r: grandRowIdx, c: 0 }, e: { r: grandRowIdx, c: 1 } },
  ];
  locations.forEach((_, i) => {
    merges.push({ s: { r: 1, c: SITE_START_COL + i * 2 }, e: { r: 1, c: SITE_START_COL + i * 2 + 1 } });
  });
  for (const span of categorySpans) {
    if (span.count > 1) {
      merges.push({
        s: { r: DATA_START_ROW + span.start, c: 0 },
        e: { r: DATA_START_ROW + span.start + span.count - 1, c: 0 },
      });
    }
  }
  ws["!merges"] = merges;

  const colWidths: any[] = [{ wch: 8 }, { wch: 26 }];
  locations.forEach(() => { colWidths.push({ wch: 22 }, { wch: 5 }); });
  colWidths.push({ wch: 8 }, { wch: 9 }, { wch: 7 }, { wch: 9 });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Equipment Distribution");
  XLSX.writeFile(wb, `Equipment_Distribution_Chart_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Branded PDF export (print-to-PDF, same pattern as Rental List / PLT-02 / Equipment Register) ──
const STATUS_COLOR = { working: "#16a34a", bd: "#d97706", storage: "#475569" };

function buildDistributionPrintHTML(matrix: Matrix): string {
  const { orderedRows, categorySpans, locations } = matrix;
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const esc = (v: any) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const grandTotal   = orderedRows.reduce((s, r) => s + r.total, 0);
  const grandWorking = orderedRows.reduce((s, r) => s + r.working, 0);
  const grandBd      = orderedRows.reduce((s, r) => s + r.bd, 0);
  const grandStorage = orderedRows.reduce((s, r) => s + r.storage, 0);

  // Row index -> is this the first row of its category (for rowspan rendering)?
  const spanStartRows = new Set(categorySpans.map(s => s.start));
  const spanCountByStart = new Map(categorySpans.map(s => [s.start, s.count]));

  const siteHeaderCells = locations.map(loc =>
    `<th colspan="2" class="loc-head">${esc(loc)}</th>`
  ).join("");
  const siteSubHeaderCells = locations.map(() =>
    `<th class="sub">Fleet No</th><th class="sub num">N</th>`
  ).join("");

  const dataRows = orderedRows.map((row, i) => {
    const catCell = spanStartRows.has(i)
      ? `<td class="code col-code" rowspan="${spanCountByStart.get(i)}">${esc(row.code)}</td>`
      : "";
    const siteCells = locations.map(loc => {
      const cell = row.perSite[loc];
      const fleetSpans = cell
        ? cell.items.map(it => {
            const color =
              it.status === "Break Down" || it.status === "Under Repair" ? "#dc2626" :
              it.status === "Storage" ? "#94a3b8" :
              "#1e293b"; // Working (and any other status) — black
            return `<span style="color:${color}">${esc(it.fleetNo)}</span>`;
          }).join(", ")
        : "";
      return `<td class="fleetlist">${fleetSpans}</td>` +
             `<td class="num">${cell ? cell.count : ""}</td>`;
    }).join("");
    return `<tr>
      ${catCell}
      <td class="type col-type">${esc(row.name)}</td>
      ${siteCells}
      <td class="num total">${row.total}</td>
      <td class="num" style="color:${STATUS_COLOR.working}">${row.working || ""}</td>
      <td class="num" style="color:${STATUS_COLOR.bd}">${row.bd || ""}</td>
      <td class="num" style="color:${STATUS_COLOR.storage}">${row.storage || ""}</td>
    </tr>`;
  }).join("");

  const grandCells = locations.map(loc => {
    const count = orderedRows.reduce((s, r) => s + (r.perSite[loc]?.count || 0), 0);
    return `<td></td><td class="num">${count || ""}</td>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Hartland Equipment Distribution Chart — ${dateStr}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 8pt; color: #1e293b; background:#fff; }

  .banner { background:#080D1A; color:#fff; text-align:center; padding:14px 24px 10px; }
  .banner h1 { font-size:17pt; font-weight:800; letter-spacing:1px; }
  .banner h2 { font-size:10pt; color:#F5A623; font-weight:700; margin-top:3px; }
  .banner p  { font-size:7.5pt; color:#94a3b8; margin-top:4px; }

  .summary { display:flex; border-bottom:3px solid #F5A623; }
  .kpi { flex:1; padding:8px 10px; text-align:center; border-right:1px solid #e2e8f0; }
  .kpi:last-child { border-right:none; }
  .kpi .num { font-size:15pt; font-weight:800; }
  .kpi .lbl { font-size:6.5pt; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
  .kpi.total { background:#080D1A; color:#fff; } .kpi.total .lbl { color:#94a3b8; }
  .kpi.working  { background:#f0fdf4; } .kpi.working  .num { color:#16a34a; }
  .kpi.bd       { background:#fffbeb; } .kpi.bd       .num { color:#d97706; }
  .kpi.storage  { background:#f8fafc; } .kpi.storage  .num { color:#475569; }
  .kpi.locations{ background:#fef3ff; } .kpi.locations .num{ color:#9333ea; }

  .meta { display:flex; justify-content:space-between; padding:5px 14px; background:#f8fafc;
    font-size:7.5pt; color:#64748b; border-bottom:1px solid #e2e8f0; }

  table { width:100%; border-collapse:collapse; }
  thead th { background:#080D1A; color:#fff; font-size:7pt; font-weight:700; padding:5px 4px;
    text-align:center; text-transform:uppercase; letter-spacing:.3px; border-right:1px solid #1a2744; white-space:nowrap;
    position:sticky; z-index:20; }
  thead tr:first-child th { top:52px; }   /* sits right below the sticky orange print bar */
  thead tr:last-child  th { top:76px; }   /* second header row (Fleet No / N sub-labels) */
  thead th:last-child { border-right:none; }
  thead .loc-head { background:#1a2744; }
  thead .sub { background:#2a3a5c; font-size:6.5pt; }

  tbody td { padding:3px 4px; font-size:7.5pt; border-bottom:1px solid #f1f5f9; border-right:1px solid #f1f5f9; vertical-align:middle; }
  tbody tr:nth-child(even) { background:#fafbfc; }
  td.code { font-weight:800; color:#92400e; text-align:center; background:#fffbeb; }
  td.type { color:#1e293b; white-space:normal; max-width:170px; word-break:break-word; line-height:1.3; }

  /* Frozen columns — Code + Equipment Type stay visible while scrolling right,
     same idea as freeze panes in Excel. */
  .col-code  { position:sticky; left:0;    z-index:15; width:42px; min-width:42px; max-width:42px; }
  .col-type  { position:sticky; left:42px; z-index:15; width:170px; min-width:170px; max-width:170px; }
  th.col-code, th.col-type { z-index:25; } /* header frozen cells sit above frozen body cells */
  td.col-code { background:#fffbeb; }      /* opaque so scrolled content doesn't show through */
  td.col-type { background:inherit; }
  tbody tr:nth-child(even) td.col-type { background:#fafbfc; }
  tbody tr:nth-child(odd)  td.col-type { background:#fff; }
  td.fleetlist { color:#475569; font-size:7pt; }
  td.num { text-align:center; font-weight:600; }
  td.num.total { font-weight:800; color:#080D1A; background:#f8fafc; }

  tfoot td { padding:6px 4px; font-size:8pt; font-weight:800; background:#1a2744; color:#fff; border-top:2px solid #F5A623; }
  tfoot td.num { text-align:center; }

  .footer { margin-top:14px; padding:8px 14px; border-top:2px solid #F5A623;
    display:flex; justify-content:space-between; align-items:flex-end; }
  .sig-block { text-align:center; width:180px; }
  .sig-line { border-top:1px solid #1e293b; padding-top:4px; margin-top:24px; font-size:7.5pt; color:#475569; }
  .footer-note { font-size:7pt; color:#94a3b8; text-align:center; flex:1; padding:0 12px; }

  @media print {
    @page { size: A3 landscape; margin: 6mm; }
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none; }
    thead { display: table-header-group; }
    thead th, .col-code, .col-type { position: static !important; }
  }

  .print-bar { position:sticky; top:0; z-index:99; background:#F5A623; padding:10px 20px;
    display:flex; align-items:center; justify-content:space-between; }
  .print-bar span { color:#fff; font-weight:700; font-size:10pt; }
  .print-btn { background:#080D1A; color:#fff; border:none; padding:8px 24px; border-radius:8px;
    font-size:10pt; font-weight:700; cursor:pointer; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span>📐 Hartland Equipment Distribution Chart — ${esc(dateStr)}</span>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>

<div class="banner">
  <h1>HARTLAND NIGERIA LIMITED</h1>
  <h2>EQUIPMENT DISTRIBUTION CHART</h2>
  <p>Confidential — For internal use only &nbsp;|&nbsp; A BuildFleet™ Report</p>
</div>

<div class="summary">
  <div class="kpi total"><div class="num">${grandTotal}</div><div class="lbl">Total Equipment</div></div>
  <div class="kpi working"><div class="num">${grandWorking}</div><div class="lbl">Working</div></div>
  <div class="kpi bd"><div class="num">${grandBd}</div><div class="lbl">Break Down</div></div>
  <div class="kpi storage"><div class="num">${grandStorage}</div><div class="lbl">Storage</div></div>
  <div class="kpi locations"><div class="num">${locations.length}</div><div class="lbl">Locations</div></div>
</div>

<div class="meta">
  <span>Generated: <strong>${esc(dateStr)}</strong></span>
  <span>Equipment Types: <strong>${orderedRows.length}</strong></span>
  <span>Categories: <strong>${categorySpans.length}</strong></span>
  <span>
    <span style="color:#1e293b;font-weight:700">■</span> Working &nbsp;
    <span style="color:#dc2626;font-weight:700">■</span> Break Down / Under Repair &nbsp;
    <span style="color:#94a3b8;font-weight:700">■</span> Storage
  </span>
</div>

<table>
  <thead>
    <tr>
      <th rowspan="2" class="col-code">Code</th>
      <th rowspan="2" class="col-type">Equipment Type</th>
      ${siteHeaderCells}
      <th rowspan="2">Total</th>
      <th rowspan="2">Working</th>
      <th rowspan="2">B.D</th>
      <th rowspan="2">Storage</th>
    </tr>
    <tr>${siteSubHeaderCells}</tr>
  </thead>
  <tbody>${dataRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="2">GRAND TOTAL</td>
      ${grandCells}
      <td class="num">${grandTotal}</td>
      <td class="num">${grandWorking}</td>
      <td class="num">${grandBd}</td>
      <td class="num">${grandStorage}</td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  <div class="sig-block"><div class="sig-line">Plant Admin<br/>Name &amp; Signature</div></div>
  <div class="footer-note">
    Generated by <strong>BuildFleet™</strong> — A product of Ultimate Tech Lab (UTL)<br/>
    <span style="color:#cbd5e1">${esc(dateStr)}</span>
  </div>
  <div class="sig-block"><div class="sig-line">Plant Manager<br/>Name &amp; Signature</div></div>
</div>

<script>window.onload=()=>{window.print();};</script>
</body>
</html>`;
}

function printDistributionChart(matrix: Matrix) {
  const html = buildDistributionPrintHTML(matrix);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export function DistributionChartTab() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [lastRun, setLastRun] = useState<{
    categories: number; types: number; locations: number; equipment: number; date: string;
  } | null>(null);

  // Only equipment sitting at an ACTIVE Project or Workshop site belongs on
  // this chart — Repair Yards, Storage Yards and Offices are excluded, same
  // eligibility rule used for daily logging.
  async function fetchEligibleSiteNames(): Promise<string[]> {
    const { data } = await dbu.from("sites")
      .select("name,site_type,is_active")
      .in("site_type", ["Project", "Central Workshop", "Regional Workshop", "Field Workshop"])
      .eq("is_active", true);
    return (data || []).map((s: any) => s.name);
  }

  async function fetchEquipment(eligibleSites: string[]): Promise<any[]> {
    if (eligibleSites.length === 0) return [];
    const [p1, p2] = await Promise.all([
      dbu.from("equipment")
        .select("fleet_number,category,name,site,operational_status")
        .neq("operational_status", "Scrapped")
        .in("site", eligibleSites)
        .order("fleet_number")
        .range(0, 999),
      dbu.from("equipment")
        .select("fleet_number,category,name,site,operational_status")
        .neq("operational_status", "Scrapped")
        .in("site", eligibleSites)
        .order("fleet_number")
        .range(1000, 1999),
    ]);
    return [...(p1.data || []), ...(p2.data || [])];
  }

  async function handleGenerate(format: "pdf" | "excel") {
    setLoading(true);
    setError("");
    try {
      const eligibleSites = await fetchEligibleSiteNames();
      if (eligibleSites.length === 0) {
        setError("No active Project or Workshop sites found.");
        setLoading(false);
        return;
      }
      const equipment = await fetchEquipment(eligibleSites);
      if (equipment.length === 0) {
        setError("No equipment found at active Project or Workshop sites.");
        setLoading(false);
        return;
      }
      const matrix = buildMatrix(equipment);

      if (format === "pdf") {
        printDistributionChart(matrix);
      } else {
        exportExcel(matrix);
      }

      setLastRun({
        categories: matrix.categorySpans.length,
        types: matrix.orderedRows.length,
        locations: matrix.locations.length,
        equipment: matrix.equipmentCount,
        date: new Date().toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }),
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate the distribution chart.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Equipment Distribution Chart
            </p>
            <h3 className="font-bold text-slate-800 text-lg">
              Fleet distribution by category and location
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              One row per equipment type, one column per active Project/Workshop location —
              showing exactly which fleet numbers are where, with Working / B.D / Storage
              totals. Repair Yards, Storage Yards and Offices are excluded. Built for
              management review.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => handleGenerate("excel")} disabled={loading}
              className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2">
              📊 Excel (data)
            </button>
            <button onClick={() => handleGenerate("pdf")} disabled={loading}
              className="px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
              {loading ? "Generating..." : "🎨 Branded PDF"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {lastRun && (
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white rounded-2xl p-4">
              <p className="text-2xl font-bold">{lastRun.equipment}</p>
              <p className="text-xs opacity-70 mt-1">Equipment at active Project/Workshop sites</p>
            </div>
            <div className="bg-amber-500 text-white rounded-2xl p-4">
              <p className="text-2xl font-bold">{lastRun.categories}</p>
              <p className="text-xs opacity-70 mt-1">Categories · {lastRun.types} types</p>
            </div>
            <div className="bg-emerald-600 text-white rounded-2xl p-4">
              <p className="text-2xl font-bold">{lastRun.locations}</p>
              <p className="text-xs opacity-70 mt-1">Locations with equipment</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-700">✓ Generated</p>
              <p className="text-xs text-slate-400 mt-1">{lastRun.date}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}