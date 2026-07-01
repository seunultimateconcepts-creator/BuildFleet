/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEquipment } from "@/hooks/use-equipment";
import { useAuth } from "@/hooks/use-auth";
import { dbu } from "@/lib/db";
import type { Equipment, OperationalStatus } from "@/types";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const ALL_STATUSES = [
  "Working", "Under Repair", "Break Down", "Storage", "Scrapped",
] as const;

type EquipmentStatus = (typeof ALL_STATUSES)[number];

const CLERK_STATUSES: EquipmentStatus[] = [
  "Working", "Break Down", "Storage",
];

const STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Storage":      "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
};

const CONDITION_STYLE: Record<string, string> = {
  "Very Good": "bg-emerald-100 text-emerald-700",
  "Good":      "bg-green-100   text-green-700",
  "Fair-Good": "bg-lime-100    text-lime-700",
  "Fair":      "bg-yellow-100  text-yellow-700",
  "Poor-Fair": "bg-orange-100  text-orange-700",
  "Poor":      "bg-red-100     text-red-600",
  "Scrapped":  "bg-slate-100   text-slate-500",
};

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const YARD_CONFIG: Partial<Record<EquipmentStatus, { label: string; siteTypes: string[] }>> = {
  "Break Down":   { label: "Repair Yard",               siteTypes: ["Repair Yard"] },
  "Under Repair": { label: "Workshop",                  siteTypes: ["Central Workshop","Regional Workshop","Field Workshop"] },
  "Storage":      { label: "Storage Yard",              siteTypes: ["Storage Yard"] },
  "Scrapped":     { label: "Disposal / Scrap Location", siteTypes: [] },
};

// ─────────────────────────────────────────────────────────────
// EXPORT — column config
// ─────────────────────────────────────────────────────────────
const EXPORT_COLUMNS: { key: string; label: string; defaultOn: boolean }[] = [
  { key: "fleet_number",       label: "Fleet No.",        defaultOn: true  },
  { key: "name",               label: "Description",      defaultOn: true  },
  { key: "category",           label: "Category",         defaultOn: true  },
  { key: "make",               label: "Make",             defaultOn: true  },
  { key: "model",              label: "Model",            defaultOn: true  },
  { key: "year",               label: "Year",             defaultOn: true  },
  { key: "allocated_to",       label: "Allocated User",   defaultOn: true  },
  { key: "allocated_position", label: "Department",       defaultOn: true  },
  { key: "site",               label: "Site",             defaultOn: true  },
  { key: "region",             label: "Region",           defaultOn: true  },
  { key: "operational_status", label: "Status",           defaultOn: true  },
  { key: "current_yard",       label: "Yard / Location",  defaultOn: true  },
  { key: "assessment",         label: "Condition",        defaultOn: true  },
  { key: "current_hour_meter", label: "Hour Meter (Hrs)", defaultOn: true  },
  { key: "current_kilometer",  label: "Km Reading",       defaultOn: true  },
  { key: "reg_no",             label: "Reg. No.",         defaultOn: true  },
  { key: "serial_no",          label: "Serial No.",       defaultOn: false },
  { key: "chassis_no",         label: "Chassis No.",      defaultOn: false },
  { key: "engine_power",       label: "Engine Power",     defaultOn: false },
  { key: "size_capacity",      label: "Size / Capacity",  defaultOn: false },
  { key: "tank_capacity",      label: "Tank Capacity",    defaultOn: false },
  { key: "meter_device",       label: "Meter Device",     defaultOn: false },
  { key: "commission_date",    label: "Commission Date",  defaultOn: false },
  { key: "hire_rate",          label: "Hire Rate (N)",    defaultOn: false },
  { key: "purchase_cost",      label: "Purchase Cost",    defaultOn: false },
  { key: "landed_cost",        label: "Landed Cost",      defaultOn: false },
  { key: "supplier",           label: "Supplier",         defaultOn: false },
  { key: "life_expectancy",    label: "Life Expectancy",  defaultOn: false },
];

// ─────────────────────────────────────────────────────────────
// EXPORT — Excel XML Spreadsheet (zero dependencies, pure string)
// ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  "Working":      "#16A34A",
  "Under Repair": "#CA8A04",
  "Break Down":   "#EA580C",
  "Storage":      "#475569",
  "Scrapped":     "#DC2626",
};
const CONDITION_COLOR: Record<string, string> = {
  "Very Good": "#15803D",
  "Good":      "#16A34A",
  "Fair-Good": "#65A30D",
  "Fair":      "#CA8A04",
  "Poor-Fair": "#EA580C",
  "Poor":      "#DC2626",
  "Scrapped":  "#475569",
};
const COL_WIDTHS: Record<string, number> = {
  "Fleet No.": 80, "Description": 200, "Category": 130, "Make": 90, "Model": 90,
  "Year": 50, "Allocated User": 170, "Department": 150, "Site": 185, "Region": 110,
  "Status": 95, "Yard / Location": 185, "Condition": 80, "Hour Meter (Hrs)": 110,
  "Km Reading": 95, "Reg. No.": 95, "Serial No.": 120, "Chassis No.": 120,
  "Engine Power": 95, "Size / Capacity": 110, "Tank Capacity": 95, "Meter Device": 95,
  "Commission Date": 110, "Hire Rate (N)": 110, "Purchase Cost": 110,
  "Landed Cost": 110, "Supplier": 150, "Life Expectancy": 110,
};

function xmlEsc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cell(
  value: string | number,
  styleId: string,
  type: "String" | "Number" = "String",
  color?: string,
): string {
  const data = type === "Number"
    ? `<ss:Data ss:Type="Number">${value}</ss:Data>`
    : `<ss:Data ss:Type="String">${xmlEsc(String(value ?? ""))}</ss:Data>`;

  // Inline font colour override via NamedCell trick not available in SpreadsheetML,
  // so we encode colour in the style name and define per-status styles in Styles block.
  return `<ss:Cell ss:StyleID="${styleId}">${data}</ss:Cell>`;
}

function buildExcelXML(
  cols: { key: string; label: string }[],
  rows: (string | number)[][],
  totalEquipment: number,
  generatedBy: string,
): string {
  const numCols = cols.length;
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // ── Styles ───────────────────────────────────────────────
  const styles = `
  <ss:Styles>
    <ss:Style ss:ID="Default">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Color="#1E293B"/>
      <ss:Alignment ss:Vertical="Center"/>
    </ss:Style>

    <ss:Style ss:ID="banner">
      <ss:Font ss:FontName="Arial" ss:Size="18" ss:Bold="1" ss:Color="#FFFFFF"/>
      <ss:Interior ss:Color="#080D1A" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </ss:Style>

    <ss:Style ss:ID="subtitle">
      <ss:Font ss:FontName="Arial" ss:Size="13" ss:Bold="1" ss:Color="#F5A623"/>
      <ss:Interior ss:Color="#1A2744" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </ss:Style>

    <ss:Style ss:ID="metaL">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Italic="1" ss:Color="#64748B"/>
      <ss:Interior ss:Color="#F8F9FA" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="1"/>
    </ss:Style>

    <ss:Style ss:ID="metaR">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Italic="1" ss:Color="#64748B"/>
      <ss:Interior ss:Color="#F8F9FA" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:Indent="1"/>
    </ss:Style>

    <ss:Style ss:ID="amber">
      <ss:Interior ss:Color="#F5A623" ss:Pattern="Solid"/>
    </ss:Style>

    <ss:Style ss:ID="colHeader">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
      <ss:Interior ss:Color="#080D1A" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#F5A623"/>
      </ss:Borders>
    </ss:Style>

    <ss:Style ss:ID="fleetW">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#92400E"/>
      <ss:Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>
    <ss:Style ss:ID="fleetA">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#92400E"/>
      <ss:Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>

    <ss:Style ss:ID="dataW">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Color="#1E293B"/>
      <ss:Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="1"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>
    <ss:Style ss:ID="dataA">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Color="#1E293B"/>
      <ss:Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="1"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>

    <ss:Style ss:ID="numW">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Color="#1E293B"/>
      <ss:Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <ss:NumberFormat ss:Format="#,##0"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>
    <ss:Style ss:ID="numA">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Color="#1E293B"/>
      <ss:Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <ss:NumberFormat ss:Format="#,##0"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>

    ${Object.entries(STATUS_COLOR).map(([status, color]) => `
    <ss:Style ss:ID="st_${status.replace(/ /g,"_")}_W">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="${color}"/>
      <ss:Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>
    <ss:Style ss:ID="st_${status.replace(/ /g,"_")}_A">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="${color}"/>
      <ss:Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>`).join("")}

    ${Object.entries(CONDITION_COLOR).map(([cond, color]) => `
    <ss:Style ss:ID="cd_${cond.replace(/-| /g,"_")}_W">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="${color}"/>
      <ss:Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>
    <ss:Style ss:ID="cd_${cond.replace(/-| /g,"_")}_A">
      <ss:Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="${color}"/>
      <ss:Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <ss:Borders>
        <ss:Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <ss:Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </ss:Borders>
    </ss:Style>`).join("")}

    <ss:Style ss:ID="footer">
      <ss:Font ss:FontName="Arial" ss:Size="8" ss:Italic="1" ss:Color="#64748B"/>
      <ss:Interior ss:Color="#F8F9FA" ss:Pattern="Solid"/>
      <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </ss:Style>
  </ss:Styles>`;

  // ── Column widths ────────────────────────────────────────
  const colDefs = cols.map(c =>
    `<ss:Column ss:Width="${COL_WIDTHS[c.label] ?? 100}"/>`
  ).join("\n      ");

  // ── Rows ─────────────────────────────────────────────────
  // Row 1: Banner
  const row1 = `
    <ss:Row ss:Height="40">
      <ss:Cell ss:StyleID="banner" ss:MergeAcross="${numCols - 1}">
        <ss:Data ss:Type="String">HARTLAND NIGERIA LIMITED</ss:Data>
      </ss:Cell>
    </ss:Row>`;

  // Row 2: Subtitle
  const row2 = `
    <ss:Row ss:Height="26">
      <ss:Cell ss:StyleID="subtitle" ss:MergeAcross="${numCols - 1}">
        <ss:Data ss:Type="String">PLANT &amp; EQUIPMENT REGISTER</ss:Data>
      </ss:Cell>
    </ss:Row>`;

  // Row 3: Meta
  const mid = Math.ceil(numCols / 2);
  const row3 = `
    <ss:Row ss:Height="20">
      <ss:Cell ss:StyleID="metaL" ss:MergeAcross="${mid - 1}">
        <ss:Data ss:Type="String">Generated: ${dateStr}</ss:Data>
      </ss:Cell>
      <ss:Cell ss:StyleID="metaR" ss:MergeAcross="${numCols - mid - 1}">
        <ss:Data ss:Type="String">Total Equipment: ${totalEquipment}   |   Prepared by: ${xmlEsc(generatedBy)}</ss:Data>
      </ss:Cell>
    </ss:Row>`;

  // Row 4: Amber divider
  const row4 = `
    <ss:Row ss:Height="4">
      <ss:Cell ss:StyleID="amber" ss:MergeAcross="${numCols - 1}"><ss:Data ss:Type="String"></ss:Data></ss:Cell>
    </ss:Row>`;

  // Row 5: Column headers
  const row5 = `
    <ss:Row ss:Height="30">
      ${cols.map(c => `<ss:Cell ss:StyleID="colHeader"><ss:Data ss:Type="String">${xmlEsc(c.label.toUpperCase())}</ss:Data></ss:Cell>`).join("\n      ")}
    </ss:Row>`;

  // Data rows
  const numericLabels = new Set(["Hour Meter (Hrs)", "Km Reading", "Hire Rate (N)", "Purchase Cost", "Landed Cost"]);

  const dataRows = rows.map((row, ri) => {
    const isAlt = ri % 2 === 1;
    const suffix = isAlt ? "A" : "W";
    const cells = row.map((val, ci) => {
      const colLabel = cols[ci].label;
      const colKey   = cols[ci].key;
      const strVal   = String(val ?? "");

      if (colKey === "fleet_number") {
        return `<ss:Cell ss:StyleID="fleet${suffix}"><ss:Data ss:Type="String">${xmlEsc(strVal)}</ss:Data></ss:Cell>`;
      }
      if (colKey === "operational_status") {
        const sId = `st_${strVal.replace(/ /g, "_")}_${suffix}`;
        return `<ss:Cell ss:StyleID="${sId}"><ss:Data ss:Type="String">${xmlEsc(strVal)}</ss:Data></ss:Cell>`;
      }
      if (colKey === "assessment") {
        const sId = `cd_${strVal.replace(/-| /g, "_")}_${suffix}`;
        return `<ss:Cell ss:StyleID="${sId}"><ss:Data ss:Type="String">${xmlEsc(strVal)}</ss:Data></ss:Cell>`;
      }
      if (numericLabels.has(colLabel)) {
        const num = typeof val === "number" ? val : (parseFloat(strVal) || 0);
        return `<ss:Cell ss:StyleID="num${suffix}"><ss:Data ss:Type="Number">${num}</ss:Data></ss:Cell>`;
      }
      return `<ss:Cell ss:StyleID="data${suffix}"><ss:Data ss:Type="String">${xmlEsc(strVal)}</ss:Data></ss:Cell>`;
    }).join("\n      ");

    return `
    <ss:Row ss:Height="18">
      ${cells}
    </ss:Row>`;
  }).join("");

  // Footer row
  const footerRow = `
    <ss:Row ss:Height="16">
      <ss:Cell ss:StyleID="footer" ss:MergeAcross="${numCols - 1}">
        <ss:Data ss:Type="String">CONFIDENTIAL — For internal use only. Generated by BuildFleet™ — A product of Ultimate Tech Lab (UTL)</ss:Data>
      </ss:Cell>
    </ss:Row>`;

  // ── Freeze panes ─────────────────────────────────────────
  const freezePane = `
    <x:WorksheetOptions>
      <x:FreezePanes/>
      <x:FrozenNoSplit/>
      <x:SplitHorizontal>5</x:SplitHorizontal>
      <x:TopRowBottomPane>5</x:TopRowBottomPane>
      <x:ActivePane>2</x:ActivePane>
      <x:PageSetup>
        <x:Layout x:Orientation="Landscape"/>
        <x:Paper>9</x:Paper>
      </x:PageSetup>
    </x:WorksheetOptions>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<ss:Workbook
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:o="urn:schemas-microsoft-com:office:office">
  ${styles}
  <ss:Worksheet ss:Name="Plant List">
    <ss:Table>
      ${colDefs}
      ${row1}
      ${row2}
      ${row3}
      ${row4}
      ${row5}
      ${dataRows}
      ${footerRow}
    </ss:Table>
    ${freezePane}
  </ss:Worksheet>
</ss:Workbook>`;
}

function downloadExcel(
  cols: { key: string; label: string }[],
  rows: (string | number)[][],
  totalEquipment: number,
  generatedBy: string,
) {
  const xml  = buildExcelXML(cols, rows, totalEquipment, generatedBy);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Hartland_Plant_List_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// EXPORT MODAL
// ─────────────────────────────────────────────────────────────
function ExportModal({ equipment, onClose, userName, totalEquipment }: {
  equipment: Equipment[];
  onClose: () => void;
  userName: string;
  totalEquipment: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter(c => c.defaultOn).map(c => c.key))
  );

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function selectAll()     { setSelected(new Set(EXPORT_COLUMNS.map(c => c.key))); }
  function selectNone()    { setSelected(new Set()); }
  function selectDefault() { setSelected(new Set(EXPORT_COLUMNS.filter(c => c.defaultOn).map(c => c.key))); }

  function doExport() {
    const cols = EXPORT_COLUMNS.filter(c => selected.has(c.key));
    const rows = equipment.map(e => cols.map(c => {
      if (c.key === "current_yard")       return (e as any).current_yard ?? "";
      if (c.key === "allocated_to")       return (e as any).allocated_to ?? "";
      if (c.key === "allocated_position") return (e as any).allocated_position ?? "";
      if (c.key === "hire_rate")          return (e as any).hire_rate ?? 0;
      if (c.key === "current_hour_meter") return (e as any).current_hour_meter ?? 0;
      if (c.key === "current_kilometer")  return (e as any).current_kilometer ?? 0;
      return (e as any)[c.key] ?? "";
    }));
    downloadExcel(cols, rows, totalEquipment, userName);
    onClose();
  }

  const onCount  = EXPORT_COLUMNS.filter(c => selected.has(c.key)).length;
  const coreCols = EXPORT_COLUMNS.filter(c => c.defaultOn);
  const extCols  = EXPORT_COLUMNS.filter(c => !c.defaultOn);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Export Plant List</h3>
            <p className="text-xs text-slate-400 mt-0.5">Formatted Excel (.xls) — Hartland branding</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5">×</button>
        </div>

        <div className="flex items-center gap-3 mt-3 mb-4 bg-slate-50 rounded-xl px-4 py-2.5">
          <span className="text-xs text-slate-500">
            📋 <span className="font-semibold text-slate-700">{equipment.length}</span> equipment
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500">
            📊 <span className="font-semibold text-amber-600">{onCount}</span> columns selected
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          {([["All", selectAll], ["Default", selectDefault], ["None", selectNone]] as const).map(([label, fn]) => (
            <button key={label} onClick={fn}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium">
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Core Columns</p>
            <div className="space-y-1">
              {coreCols.map(c => (
                <label key={c.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  selected.has(c.key) ? "bg-amber-50 border border-amber-200" : "border border-transparent hover:bg-slate-50"
                }`}>
                  <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)}
                    className="accent-amber-500 w-4 h-4 shrink-0" />
                  <span className="text-sm text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Additional Columns</p>
            <div className="space-y-1">
              {extCols.map(c => (
                <label key={c.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  selected.has(c.key) ? "bg-amber-50 border border-amber-200" : "border border-transparent hover:bg-slate-50"
                }`}>
                  <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)}
                    className="accent-amber-500 w-4 h-4 shrink-0" />
                  <span className="text-sm text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={doExport} disabled={onCount === 0}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40">
            📊 Export {onCount} cols
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATUS MODAL
// ─────────────────────────────────────────────────────────────
function StatusModal({ item, onClose, onSave, isClerk }: {
  item: Equipment; onClose: () => void;
  onSave: (status: EquipmentStatus, yard: string) => Promise<void>;
  isClerk: boolean;
}) {
  const [allSites,      setAllSites]      = useState<any[]>([]);
  const [filteredYards, setFilteredYards] = useState<any[]>([]);
  const [status,        setStatus]        = useState<EquipmentStatus>(item.operational_status as EquipmentStatus);
  const [yard,          setYard]          = useState<string>((item as any).current_yard || "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    dbu.from("sites")
      .select("id,name,code,site_type,cost_code")
      .order("code", { ascending: true })
      .then(({ data }: { data: any[] | null }) => setAllSites(data || []));
  }, []);

  useEffect(() => {
    const config = YARD_CONFIG[status];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!config) { setFilteredYards([]); return; }
    if (config.siteTypes.length === 0) {
      setFilteredYards(allSites);
    } else {
      setFilteredYards(allSites.filter(s => config.siteTypes.includes(s.site_type)));
    }
    setYard("");
  }, [status, allSites]);

  const availableStatuses = isClerk ? CLERK_STATUSES : ALL_STATUSES;
  const yardConfig = YARD_CONFIG[status];
  const needsYard  = !!yardConfig;

  async function handleSave() {
    if (needsYard && !yard.trim()) {
      setError(`Please select the ${yardConfig!.label.toLowerCase()}.`);
      return;
    }
    setSaving(true); setError(null);
    await onSave(status, yard.trim());
    setSaving(false);
    onClose();
  }

  function handleStatusChange(s: EquipmentStatus) {
    setStatus(s); setError(null);
    if (!YARD_CONFIG[s]) setYard("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-slate-800 text-lg mb-0.5">Update Status</h3>
        <p className="text-amber-600 text-sm font-medium mb-1">{item.fleet_number}</p>
        <p className="text-slate-500 text-xs mb-5 line-clamp-1">{item.name}</p>

        {isClerk && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 text-xs text-blue-700">
            ℹ️ As Plant Clerk you can update to: Working, Break Down or Storage only.
          </div>
        )}
        {(item as any).current_yard && (
          <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-4 text-xs text-slate-500">
            Current location: <span className="font-semibold text-slate-700">{(item as any).current_yard}</span>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {availableStatuses.map(s => (
            <label key={s} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              status === s ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
            }`}>
              <input type="radio" name="status" value={s} checked={status === s}
                onChange={() => handleStatusChange(s)} className="accent-amber-500" />
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>
            </label>
          ))}
        </div>

        {needsYard && (
          <div className="mb-4 border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {yardConfig!.label} <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">{filteredYards.length} {yardConfig!.label.toLowerCase()}s available</p>
            <select className={iCls} value={yard} onChange={e => { setYard(e.target.value); setError(null); }}>
              <option value="">— Select {yardConfig!.label} —</option>
              {filteredYards.map(s => (
                <option key={s.id || s.code} value={s.name}>
                  {s.code ? `${s.code} — ` : ""}{s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">Select where this equipment is located.</p>
          </div>
        )}

        {status === "Working" && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700">
            Equipment will be marked as operational at its current site.
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs">⚠️ {error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const { equipment, loading, updateStatus } = useEquipment();
  const { profile, canCommission, canTransfer, isClerk } = useAuth();

  const [search,          setSearch]          = useState("");
  const [filterSt,        setFilterSt]        = useState("");
  const [filterCat,       setFilterCat]       = useState("");
  const [filterSite,      setFilterSite]      = useState("");
  const [filterRegion,    setFilterRegion]    = useState("");
  const [statusItem,      setStatusItem]      = useState<Equipment | null>(null);
  const [view,            setView]            = useState<"table"|"grid">("table");
  const [showExportModal, setShowExportModal] = useState(false);

  const canSeeStatusBtn = profile?.roles?.some((r: string) =>
    ["plant_clerk","site_supervisor","plant_engineer","plant_admin","plant_manager","plant_director","super_admin"].includes(r)
  );

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      e.fleet_number.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.make.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      (e.reg_no||"").toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      ((e as any).allocated_to||"").toLowerCase().includes(q) ||
      ((e as any).allocated_position||"").toLowerCase().includes(q);

    const matchSt = !filterSt ||
      e.operational_status === filterSt ||
      (filterSt === "Under Repair" && e.operational_status === "Break Down");

    return matchQ && matchSt &&
      (!filterCat    || e.category === filterCat) &&
      (!filterSite   || e.site === filterSite) &&
      (!filterRegion || e.region === filterRegion);
  });

  const categories = [...new Set(equipment.map(e => e.category))].filter(Boolean).sort();
  const sites      = [...new Set(equipment.map(e => e.site))].filter(Boolean).sort();
  const regions    = [...new Set(equipment.map(e => e.region))].filter(Boolean).sort();

  const counts = {
    total:    equipment.length,
    working:  equipment.filter(e => e.operational_status === "Working").length,
    repair:   equipment.filter(e => ["Under Repair","Break Down"].includes(e.operational_status)).length,
    storage:  equipment.filter(e => e.operational_status === "Storage").length,
    scrapped: equipment.filter(e => e.operational_status === "Scrapped").length,
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Equipment</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Complete fleet register. Click any equipment to view full details and history.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => setShowExportModal(true)}
            className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
            📊 Export Plant List
          </button>
          {canTransfer && (
            <Link href="/transfer"
              className="border border-blue-200 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100 flex items-center gap-2">
              🔄 Transfer Equipment
            </Link>
          )}
          {canCommission && (
            <Link href="/commissioning"
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shadow-amber-200 flex items-center gap-2">
              + Commission Equipment
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Fleet",  value: counts.total,    bg: "bg-slate-900 text-white",                         filter: "" },
          { label: "Working",      value: counts.working,  bg: "bg-emerald-500 text-white",                       filter: "Working" },
          { label: "Under Repair", value: counts.repair,   bg: "bg-amber-500 text-white",                         filter: "Under Repair" },
          { label: "Storage",      value: counts.storage,  bg: "bg-white border border-slate-200 text-slate-800", filter: "Storage" },
          { label: "Scrapped",     value: counts.scrapped, bg: "bg-white border border-slate-200 text-slate-800", filter: "Scrapped" },
        ].map(k => (
          <button key={k.label}
            onClick={() => setFilterSt(filterSt === k.filter ? "" : k.filter)}
            className={`${k.bg} rounded-2xl p-5 text-left transition-all hover:scale-[1.02] hover:shadow-md ${
              filterSt === k.filter ? "ring-4 ring-amber-400 ring-offset-2" : ""
            }`}>
            <p className="text-3xl font-bold">{k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
            {filterSt === k.filter && <p className="text-xs opacity-60 mt-1">← click to clear</p>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input placeholder="Search fleet no., name, make, user, dept..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterSt} onChange={e => setFilterSt(e.target.value)}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select className={iCls + " w-auto"} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
              <option value="">All Regions</option>
              {regions.map(r => <option key={r}>{r}</option>)}
            </select>
            <p className="text-sm text-slate-500 whitespace-nowrap">
              Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {equipment.length}
            </p>
          </div>
          <div className="flex gap-2">
            {(["table","grid"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
                {v === "table" ? "☰ Table" : "⊞ Grid"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {view === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {["Fleet No.","Description","Category","Make / Model","Allocated To","Department",
                    "Site","Region","Status","Yard / Location","Condition","Hr Meter / Km","Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={13} className="px-5 py-16 text-center text-slate-400">Loading equipment...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={13} className="px-5 py-16 text-center text-slate-400">
                    {equipment.length === 0 ? "No equipment yet. Commission your first equipment to get started." : "No equipment matches your filters."}
                  </td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <Link href={`/equipment/${item.code}`}
                        className="font-bold text-amber-600 hover:text-amber-700 font-mono text-xs hover:underline">
                        {item.fleet_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      <div className="truncate max-w-45">{item.name}</div>
                      {item.reg_no && <div className="text-xs text-slate-400 mt-0.5">{item.reg_no}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{item.category}</td>
                    <td className="px-5 py-4 text-xs">
                      <div className="font-medium text-slate-700">{item.make}</div>
                      <div className="text-slate-400">{item.model}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <div className="truncate max-w-32">
                        {(item as any).allocated_to
                          ? <span className="font-medium">{(item as any).allocated_to}</span>
                          : <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="truncate max-w-28">
                        {(item as any).allocated_position || <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      <div className="truncate max-w-32">{item.site}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{item.region}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        STATUS_STYLE[item.operational_status] || "bg-slate-100 text-slate-600"
                      }`}>{item.operational_status}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-32">
                      {(item as any).current_yard
                        ? <span className="truncate block" title={(item as any).current_yard}>{(item as any).current_yard}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        CONDITION_STYLE[item.assessment] || "bg-slate-100 text-slate-600"
                      }`}>{item.assessment}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {item.meter_device === "Km"
                        ? `${(item.current_kilometer || 0).toLocaleString()} km`
                        : `${(item.current_hour_meter || 0).toLocaleString()} hrs`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/equipment/${item.code}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium whitespace-nowrap">
                          View →
                        </Link>
                        {canSeeStatusBtn && (
                          <button onClick={() => setStatusItem(item)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium whitespace-nowrap">
                            Status
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-16 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400">No equipment found.</div>
          ) : filtered.map(item => (
            <div key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-amber-200 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/equipment/${item.code}`}
                    className="font-bold text-amber-600 font-mono text-sm hover:underline">
                    {item.fleet_number}
                  </Link>
                  <p className="text-slate-700 font-semibold text-sm mt-0.5 line-clamp-1">{item.name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[item.operational_status]}`}>
                  {item.operational_status}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {[
                  ["Make / Model",  `${item.make} ${item.model}`],
                  ["Category",      item.category],
                  ...((item as any).allocated_to       ? [["Allocated To", (item as any).allocated_to]]       : []),
                  ...((item as any).allocated_position ? [["Department",   (item as any).allocated_position]] : []),
                  ["Site",          item.site],
                  ["Region",        item.region],
                  ...((item as any).current_yard ? [["Yard / Location", (item as any).current_yard]] : []),
                  ["Condition",     item.assessment],
                  [item.meter_device === "Km" ? "Km Reading" : "Hour Meter",
                   item.meter_device === "Km"
                     ? `${(item.current_kilometer||0).toLocaleString()} km`
                     : `${(item.current_hour_meter||0).toLocaleString()} hrs`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span>{l}</span>
                    <span className="font-medium text-slate-700 text-right truncate ml-2">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Link href={`/equipment/${item.code}`}
                  className="flex-1 text-center text-xs py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                  View Details →
                </Link>
                {canSeeStatusBtn && (
                  <button onClick={() => setStatusItem(item)}
                    className="text-xs px-4 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium">
                    Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showExportModal && (
        <ExportModal
          equipment={filtered.length > 0 ? filtered : equipment}
          totalEquipment={equipment.length}
          onClose={() => setShowExportModal(false)}
          userName={profile?.full_name || "BuildFleet"}
        />
      )}

      {statusItem && (
        <StatusModal
          item={statusItem}
          isClerk={isClerk}
          onClose={() => setStatusItem(null)}
          onSave={async (status, yard) => {
            await updateStatus(statusItem.id, status, profile?.full_name || "User", yard);
            setStatusItem(null);
          }}
        />
      )}
    </div>
  );
}