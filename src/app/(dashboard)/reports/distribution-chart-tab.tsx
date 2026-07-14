/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { dbu } from "@/lib/db";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────
// EQUIPMENT DISTRIBUTION CHART TAB
// ─────────────────────────────────────────────────────────────
// Generates a category × site matrix, matching the shape of
// Hartland's existing "Equipment Distribution Chart" spreadsheet:
//   rows    = equipment category + type (e.g. BD / Dozer D6)
//   columns = one pair per site (Fleet No. list, count)
//   right   = Total / Working / B.D / Storage per row
// Scrapped equipment is excluded — it isn't part of the active
// distribution any more.
//
// Add this as a 5th tab on the Reports page:
//   import { DistributionChartTab } from "./distribution-chart-tab";
//   { key: "distribution", label: "📐 Equipment Distribution" }
//   {tab === "distribution" && <DistributionChartTab />}
// ─────────────────────────────────────────────────────────────

interface Row {
  category: string;
  name: string;
  perSite: Record<string, { fleetNos: string[]; count: number }>;
  working: number;
  bd: number;
  storage: number;
  total: number;
}

export function DistributionChartTab() {
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [lastRun,   setLastRun]   = useState<{
    categories: number; types: number; sites: number; equipment: number; date: string;
  } | null>(null);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      // Equipment table can exceed Supabase's 1000-row default page size,
      // same pattern used elsewhere in Reports (Utilization / Master List).
      const [p1, p2] = await Promise.all([
        dbu.from("equipment")
          .select("fleet_number,category,name,site,operational_status")
          .neq("operational_status", "Scrapped")
          .range(0, 999),
        dbu.from("equipment")
          .select("fleet_number,category,name,site,operational_status")
          .neq("operational_status", "Scrapped")
          .range(1000, 1999),
      ]);
      const equipment = [...(p1.data || []), ...(p2.data || [])];

      if (equipment.length === 0) {
        setError("No equipment found to build the chart from.");
        setLoading(false);
        return;
      }

      // ── Build category → type → row map ──────────────────────
      const rowMap = new Map<string, Row>();     // key = category|||name
      const categoryOrder: string[] = [];         // preserves first-seen category order
      const typeOrderByCategory: Record<string, string[]> = {};
      const siteSet = new Set<string>();

      for (const e of equipment) {
        const category = e.category || "Uncategorized";
        const type     = e.name     || "Unspecified";
        const site     = e.site     || "Unassigned";
        siteSet.add(site);

        const key = `${category}|||${type}`;
        if (!rowMap.has(key)) {
          rowMap.set(key, {
            category, name: type, perSite: {},
            working: 0, bd: 0, storage: 0, total: 0,
          });
          if (!categoryOrder.includes(category)) categoryOrder.push(category);
          if (!typeOrderByCategory[category]) typeOrderByCategory[category] = [];
          typeOrderByCategory[category].push(type);
        }
        const row = rowMap.get(key)!;

        if (!row.perSite[site]) row.perSite[site] = { fleetNos: [], count: 0 };
        row.perSite[site].fleetNos.push(e.fleet_number);
        row.perSite[site].count += 1;
        row.total += 1;

        if (e.operational_status === "Working") row.working += 1;
        else if (e.operational_status === "Break Down" || e.operational_status === "Under Repair") row.bd += 1;
        else if (e.operational_status === "Storage") row.storage += 1;
      }

      categoryOrder.sort();
      const sites = Array.from(siteSet).sort();

      // Flat ordered row list, grouped by category (needed for merged cells)
      const orderedRows: Row[] = [];
      const categorySpans: { category: string; start: number; count: number }[] = [];
      for (const cat of categoryOrder) {
        const start = orderedRows.length;
        for (const type of typeOrderByCategory[cat]) {
          orderedRows.push(rowMap.get(`${cat}|||${type}`)!);
        }
        categorySpans.push({ category: cat, start, count: typeOrderByCategory[cat].length });
      }

      // ── Column layout ─────────────────────────────────────────
      // 0: Category | 1: Equipment Type | site pairs... | Total | Working | B.D | Storage
      const SITE_START_COL = 2;
      const totalCol   = SITE_START_COL + sites.length * 2;
      const workingCol = totalCol + 1;
      const bdCol      = totalCol + 2;
      const storageCol = totalCol + 3;
      const lastCol    = storageCol;

      const dateStr = new Date().toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      // ── Build rows (AOA) ─────────────────────────────────────
      const aoa: any[][] = [];

      // Row 0 — title banner
      const titleRow = new Array(lastCol + 1).fill("");
      titleRow[0] = `HARTLAND NIGERIA LIMITED — EQUIPMENT DISTRIBUTION CHART   [${dateStr}]`;
      aoa.push(titleRow);

      // Row 1 — site names + right-side labels
      const siteHeaderRow = new Array(lastCol + 1).fill("");
      siteHeaderRow[0] = "CATEGORY";
      siteHeaderRow[1] = "EQUIPMENT TYPE";
      sites.forEach((site, i) => { siteHeaderRow[SITE_START_COL + i * 2] = site; });
      siteHeaderRow[totalCol]   = "TOTAL";
      siteHeaderRow[workingCol] = "WORKING";
      siteHeaderRow[bdCol]      = "B.D";
      siteHeaderRow[storageCol] = "STORAGE";
      aoa.push(siteHeaderRow);

      // Row 2 — Fleet No / N sub-headers
      const subHeaderRow = new Array(lastCol + 1).fill("");
      sites.forEach((_, i) => {
        subHeaderRow[SITE_START_COL + i * 2]     = "Fleet No";
        subHeaderRow[SITE_START_COL + i * 2 + 1] = "N";
      });
      aoa.push(subHeaderRow);

      const DATA_START_ROW = 3;

      // Data rows
      for (const row of orderedRows) {
        const line = new Array(lastCol + 1).fill("");
        line[0] = row.category;
        line[1] = row.name;
        sites.forEach((site, i) => {
          const cell = row.perSite[site];
          line[SITE_START_COL + i * 2]     = cell ? cell.fleetNos.join(", ") : "";
          line[SITE_START_COL + i * 2 + 1] = cell ? cell.count : "";
        });
        line[totalCol]   = row.total;
        line[workingCol] = row.working;
        line[bdCol]      = row.bd;
        line[storageCol] = row.storage;
        aoa.push(line);
      }

      // Grand total row
      const grandRow = new Array(lastCol + 1).fill("");
      grandRow[0] = "GRAND TOTAL";
      let grandTotal = 0, grandWorking = 0, grandBd = 0, grandStorage = 0;
      sites.forEach((site, i) => {
        const siteCount = orderedRows.reduce((s, r) => s + (r.perSite[site]?.count || 0), 0);
        grandRow[SITE_START_COL + i * 2 + 1] = siteCount || "";
      });
      orderedRows.forEach(r => {
        grandTotal   += r.total;
        grandWorking += r.working;
        grandBd      += r.bd;
        grandStorage += r.storage;
      });
      grandRow[totalCol]   = grandTotal;
      grandRow[workingCol] = grandWorking;
      grandRow[bdCol]      = grandBd;
      grandRow[storageCol] = grandStorage;
      aoa.push(grandRow);

      const grandRowIdx = aoa.length - 1;

      // ── Build worksheet ───────────────────────────────────────
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const merges: any[] = [
        // Title spans full width
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
        // Category / Equipment Type header spans rows 1-2
        { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
        { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
        // Total/Working/B.D/Storage headers span rows 1-2
        { s: { r: 1, c: totalCol },   e: { r: 2, c: totalCol } },
        { s: { r: 1, c: workingCol }, e: { r: 2, c: workingCol } },
        { s: { r: 1, c: bdCol },      e: { r: 2, c: bdCol } },
        { s: { r: 1, c: storageCol }, e: { r: 2, c: storageCol } },
        // Grand total label spans Category + Type columns
        { s: { r: grandRowIdx, c: 0 }, e: { r: grandRowIdx, c: 1 } },
      ];
      // Site name headers span their 2 columns
      sites.forEach((_, i) => {
        merges.push({
          s: { r: 1, c: SITE_START_COL + i * 2 },
          e: { r: 1, c: SITE_START_COL + i * 2 + 1 },
        });
      });
      // Category column merges vertically down each category's rows
      for (const span of categorySpans) {
        if (span.count > 1) {
          merges.push({
            s: { r: DATA_START_ROW + span.start, c: 0 },
            e: { r: DATA_START_ROW + span.start + span.count - 1, c: 0 },
          });
        }
      }
      ws["!merges"] = merges;

      // Column widths — Category, Type wider; Fleet No columns wide enough for lists
      const colWidths: any[] = [{ wch: 8 }, { wch: 26 }];
      sites.forEach(() => { colWidths.push({ wch: 22 }, { wch: 5 }); });
      colWidths.push({ wch: 8 }, { wch: 9 }, { wch: 7 }, { wch: 9 });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Equipment Distribution");
      XLSX.writeFile(wb, `Equipment_Distribution_Chart_${new Date().toISOString().slice(0,10)}.xlsx`);

      setLastRun({
        categories: categoryOrder.length,
        types: orderedRows.length,
        sites: sites.length,
        equipment: equipment.length,
        date: dateStr,
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
              Fleet distribution by category and site
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              One row per equipment type, one column per site — showing exactly which fleet
              numbers are where, with Working / B.D / Storage totals. Built for management
              review, not day-to-day editing.
            </p>
          </div>
          <button onClick={generate} disabled={loading}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 shrink-0 flex items-center gap-2">
            {loading ? "Generating..." : "📐 Generate & Download"}
          </button>
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
              <p className="text-xs opacity-70 mt-1">Equipment (excl. Scrapped)</p>
            </div>
            <div className="bg-amber-500 text-white rounded-2xl p-4">
              <p className="text-2xl font-bold">{lastRun.categories}</p>
              <p className="text-xs opacity-70 mt-1">Categories · {lastRun.types} types</p>
            </div>
            <div className="bg-emerald-600 text-white rounded-2xl p-4">
              <p className="text-2xl font-bold">{lastRun.sites}</p>
              <p className="text-xs opacity-70 mt-1">Sites with equipment</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-700">✓ Downloaded</p>
              <p className="text-xs text-slate-400 mt-1">{lastRun.date}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}