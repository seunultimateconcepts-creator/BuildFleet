/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const STATUS_STYLE: Record<string,string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100   text-amber-700",
  "Break Down":   "bg-orange-100  text-orange-700",
  "Storage":      "bg-slate-100   text-slate-600",
  "Scrapped":     "bg-red-100     text-red-600",
};

// ─────────────────────────────────────────────────────────────
// RENTAL LIST TAB
// ─────────────────────────────────────────────────────────────
function RentalListTab() {
  const [logs,        setLogs]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [generated,   setGenerated]   = useState(false);
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear,  setFilterYear]  = useState(new Date().getFullYear());

  async function generate() {
    setLoading(true);
    const { data } = await dbu
      .from("daily_logs").select("*")
      .eq("month", filterMonth).eq("year", filterYear)
      .eq("is_chargeable", true).order("site");
    setLogs(data || []);
    setGenerated(true);
    setLoading(false);
  }

  const bySite = logs.reduce((acc: any, log: any) => {
    if (!acc[log.site]) acc[log.site] = { site: log.site, cost_code: log.cost_code, items: [] };
    acc[log.site].items.push(log);
    return acc;
  }, {});
  const siteGroups = Object.values(bySite) as any[];
  const grandTotal = logs.reduce((s: number, l: any) => s + (Number(l.total_charge)||0), 0);

  function exportCSV() {
    const rows: string[][] = [];
    rows.push(["HARTLAND NIGERIA LIMITED"]);
    rows.push(["PLANT DEPARTMENT"]);
    rows.push([`EQUIPMENT RENTAL LIST FOR THE MONTH OF ${filterMonth.toUpperCase()}, ${filterYear}`]);
    rows.push([]);
    siteGroups.forEach((group: any) => {
      rows.push([`SITE: ${group.site}`, `COST CODE: ${group.cost_code || "—"}`]);
      rows.push(["S/NO","FLEET NO","DESCRIPTION","DAYS","HIRE RATE (₦)","TOTAL INVOICED (₦)"]);
      const byFleet: Record<string, any> = {};
      group.items.forEach((item: any) => {
        if (!byFleet[item.fleet_no]) byFleet[item.fleet_no] = { fleet_no:item.fleet_no, equipment_name:item.equipment_name||"", hire_rate:item.hire_rate||0, days:0, total:0 };
        byFleet[item.fleet_no].days += 1;
        byFleet[item.fleet_no].total += Number(item.hire_rate)||0;
      });
      Object.values(byFleet).forEach((item: any, idx: number) => {
        rows.push([String(idx+1), item.fleet_no, item.equipment_name, String(item.days), String(item.hire_rate), String(item.total)]);
      });
      const siteTotal = group.items.reduce((s: number, i: any) => s+(Number(i.hire_rate)||0), 0);
      rows.push(["","","TOTAL","","",String(siteTotal)]);
      rows.push([]);
    });
    rows.push(["GRAND TOTAL","","","","",String(grandTotal)]);
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = `Rental_List_${filterMonth}_${filterYear}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Generate Rental List</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Month</label>
            <select className={iCls+" w-40"} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Year</label>
            <select className={iCls+" w-28"} value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
              {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={loading}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 disabled:opacity-50">
            {loading ? "Generating..." : "📊 Generate"}
          </button>
          {generated && logs.length > 0 && (
            <button onClick={exportCSV} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 ml-auto">
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>
      {generated && logs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-lg font-semibold text-slate-600">No chargeable logs for {filterMonth} {filterYear}</p>
          <p className="text-sm text-slate-400 mt-1">Make sure daily logs have been entered and equipment marked as Working (A) for this month.</p>
        </div>
      )}
      {generated && logs.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{siteGroups.length}</p><p className="text-sm opacity-70 mt-1">Sites</p></div>
            <div className="bg-amber-500 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{logs.length}</p><p className="text-sm opacity-70 mt-1">Chargeable Days</p></div>
            <div className="bg-emerald-600 text-white rounded-2xl p-5"><p className="text-2xl font-bold">₦{grandTotal.toLocaleString("en-NG")}</p><p className="text-sm opacity-70 mt-1">Grand Total</p></div>
          </div>
          {siteGroups.map((group: any) => {
            const byFleet: Record<string, any> = {};
            group.items.forEach((item: any) => {
              if (!byFleet[item.fleet_no]) byFleet[item.fleet_no] = { fleet_no:item.fleet_no, equipment_name:item.equipment_name||"", hire_rate:item.hire_rate||0, days:0, total:0 };
              byFleet[item.fleet_no].days += 1;
              byFleet[item.fleet_no].total += Number(item.hire_rate)||0;
            });
            const fleetList = Object.values(byFleet) as any[];
            const siteTotal = fleetList.reduce((s:number,i:any)=>s+i.total,0);
            return (
              <div key={group.site} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
                  <div><p className="font-bold">{group.site}</p><p className="text-slate-400 text-xs mt-0.5">Cost Code: {group.cost_code||"—"}</p></div>
                  <p className="font-bold text-amber-400 text-lg">₦{siteTotal.toLocaleString("en-NG")}</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["S/NO","Fleet No.","Description","Days","Hire Rate","Total Invoiced"].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {fleetList.map((item:any,idx:number)=>(
                      <tr key={item.fleet_no} className="hover:bg-amber-50/20">
                        <td className="px-5 py-3 text-slate-400 text-xs">{idx+1}</td>
                        <td className="px-5 py-3 font-bold text-amber-600 font-mono text-xs">{item.fleet_no}</td>
                        <td className="px-5 py-3 text-slate-700">{item.equipment_name||"—"}</td>
                        <td className="px-5 py-3 font-bold text-slate-800">{item.days}</td>
                        <td className="px-5 py-3 text-slate-600">₦{Number(item.hire_rate).toLocaleString()}</td>
                        <td className="px-5 py-3 font-bold text-emerald-700">₦{item.total.toLocaleString("en-NG")}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={5} className="px-5 py-3 text-right font-bold text-slate-700">Site Total:</td>
                      <td className="px-5 py-3 font-bold text-emerald-700">₦{siteTotal.toLocaleString("en-NG")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex items-center justify-between">
            <p className="font-bold text-xl">GRAND TOTAL — {filterMonth.toUpperCase()} {filterYear}</p>
            <p className="text-3xl font-bold text-amber-400">₦{grandTotal.toLocaleString("en-NG")}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FLEET UTILIZATION TAB — Storage replaces Idle/Stand By
// ─────────────────────────────────────────────────────────────
function UtilizationTab() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const [p1, p2] = await Promise.all([
        dbu.from("equipment").select("fleet_number,name,category,site,region,operational_status,assessment").range(0,999),
        dbu.from("equipment").select("fleet_number,name,category,site,region,operational_status,assessment").range(1000,1999),
      ]);
      setEquipment([...(p1.data||[]), ...(p2.data||[])]);
      setLoading(false);
    }
    load();
  }, []);

  const total       = equipment.length;
  const working     = equipment.filter(e => e.operational_status === "Working").length;
  const repair      = equipment.filter(e => ["Under Repair","Break Down"].includes(e.operational_status)).length;
  const storage     = equipment.filter(e => ["Storage","Idle","Stand By"].includes(e.operational_status)).length;
  const scrapped    = equipment.filter(e => e.operational_status === "Scrapped").length;
  const utilization = total > 0 ? Math.round((working/total)*100) : 0;

  const byRegion = equipment.reduce((acc:any,e:any) => {
    const r = e.region||"Unknown";
    if (!acc[r]) acc[r]={total:0,working:0,repair:0,storage:0};
    acc[r].total++;
    if (e.operational_status==="Working") acc[r].working++;
    else if (["Under Repair","Break Down"].includes(e.operational_status)) acc[r].repair++;
    else if (["Storage","Idle","Stand By"].includes(e.operational_status)) acc[r].storage++;
    return acc;
  },{});

  const byCat = equipment.reduce((acc:any,e:any) => {
    const c=e.category||"Unknown";
    if (!acc[c]) acc[c]={total:0,working:0};
    acc[c].total++;
    if (e.operational_status==="Working") acc[c].working++;
    return acc;
  },{});
  const topCats = Object.entries(byCat).sort((a:any,b:any)=>b[1].total-a[1].total).slice(0,10) as [string,any][];

  function exportReport() {
    const rows:any[]=[
      ["HARTLAND NIGERIA LIMITED — FLEET UTILIZATION REPORT"],
      [`Generated: ${new Date().toLocaleDateString("en-GB")}`],[],
      ["OVERALL SUMMARY"],["Total Fleet",total],["Working",working,`${utilization}%`],
      ["Under Repair / Breakdown",repair],["Storage",storage],["Scrapped",scrapped],[],
      ["BY REGION"],["Region","Total","Working","Under Repair","Storage","Utilization %"],
      ...Object.entries(byRegion).map(([r,v]:any)=>[r,v.total,v.working,v.repair,v.storage,`${Math.round((v.working/v.total)*100)}%`]),[],
      ["BY CATEGORY"],["Category","Total","Working","Utilization %"],
      ...topCats.map(([c,v])=>[c,v.total,v.working,`${Math.round((v.working/v.total)*100)}%`]),
    ];
    const csv=rows.map((r:any)=>Array.isArray(r)?r.map((v:any)=>`"${String(v).replace(/"/g,'""')}"`).join(","):`"${r}"`).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`Fleet_Utilization_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={exportReport} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">↓ Export Report</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {label:"Total Fleet",        value:total,                    bg:"bg-slate-900 text-white"},
          {label:"Working",            value:`${working} (${utilization}%)`, bg:"bg-emerald-600 text-white"},
          {label:"Under Repair",       value:repair,                   bg:"bg-amber-500 text-white"},
          {label:"Storage",            value:storage,                  bg:"bg-slate-500 text-white"},
          {label:"Scrapped",           value:scrapped,                 bg:"bg-red-100 text-red-700"},
        ].map(k=>(
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-2xl font-bold">{loading?"...":k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-slate-800">Overall Fleet Utilization</p>
          <p className="text-3xl font-bold text-amber-600">{utilization}%</p>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full" style={{width:`${utilization}%`}}/>
        </div>
        <div className="flex gap-6 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>Working: {working}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"/>Repair: {repair}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block"/>Storage: {storage}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/>Scrapped: {scrapped}</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">Utilization by Region</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["Region","Total","Working","Under Repair","Storage","Utilization"].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading?<tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
              :Object.entries(byRegion).sort((a:any,b:any)=>b[1].total-a[1].total).map(([region,v]:any)=>{
                const pct=Math.round((v.working/v.total)*100);
                return(<tr key={region} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-800">{region}</td>
                  <td className="px-5 py-3 font-bold text-slate-700">{v.total}</td>
                  <td className="px-5 py-3 text-emerald-700 font-semibold">{v.working}</td>
                  <td className="px-5 py-3 text-amber-600">{v.repair}</td>
                  <td className="px-5 py-3 text-slate-500">{v.storage}</td>
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{width:`${pct}%`}}/></div><span className="text-xs font-bold text-slate-700">{pct}%</span></div></td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">Fleet by Category</h3></div>
        <div className="p-5 space-y-3">
          {loading?<p className="text-slate-400 text-sm text-center py-4">Loading...</p>
          :topCats.map(([cat,v])=>{
            const pct=total>0?Math.round((v.total/total)*100):0;
            const workPct=v.total>0?Math.round((v.working/v.total)*100):0;
            return(<div key={cat}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">{cat}</span>
                <div className="flex items-center gap-3"><span className="text-slate-500">{v.total} units ({pct}%)</span><span className="text-emerald-600 font-semibold">{workPct}% working</span></div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{width:`${pct}%`}}/></div>
            </div>);
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BREAKDOWN REPORT TAB — workshops only in site filter
// ─────────────────────────────────────────────────────────────
function BreakdownReportTab() {
  const [records,      setRecords]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [generated,    setGenerated]    = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterMonth,  setFilterMonth]  = useState(MONTHS[new Date().getMonth()]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterYear,   setFilterYear]   = useState(new Date().getFullYear());
  const [filterSite,   setFilterSite]   = useState("");
  const [workshops,    setWorkshops]    = useState<any[]>([]); // only workshops

  // Load ONLY Repair Yards for the breakdown report filter
  useEffect(() => {
    dbu.from("sites")
      .select("name,code,site_type,region")
      .eq("site_type", "Repair Yard")
      .order("code")
      .then(({ data }: { data: any[] | null }) => setWorkshops(data || []));
  }, []);

  async function generate() {
    setLoading(true);

    // Query equipment currently at repair yards
    // (Break Down or Under Repair status at a Repair Yard site)
    let q = dbu
      .from("equipment")
      .select("id,fleet_number,name,category,site,region,operational_status,current_yard,assessment,make,model")
      .in("operational_status", ["Break Down","Under Repair"])
      .order("fleet_number");

    // Filter by specific repair yard if selected
    if (filterSite) {
      q = q.or(`site.eq.${filterSite},current_yard.eq.${filterSite}`);
    } else {
      // Show all equipment at any repair yard
      const repairYardNames = workshops.map(s => s.name);
      if (repairYardNames.length > 0) {
        q = q.or(
          `site.in.(${repairYardNames.map(n=>`"${n}"`).join(",")}),current_yard.in.(${repairYardNames.map(n=>`"${n}"`).join(",")})`
        );
      }
    }

    const { data } = await q;
    setRecords(data || []);
    setGenerated(true);
    setLoading(false);
  }

  const breakDown   = records.filter(r => r.operational_status === "Break Down").length;
  const underRepair = records.filter(r => r.operational_status === "Under Repair").length;

  const byCat = records.reduce((acc:any, r:any) => {
    const c = r.category || "Unknown";
    acc[c] = (acc[c]||0) + 1;
    return acc;
  }, {});

  const byRegion = records.reduce((acc:any, r:any) => {
    const reg = r.region || "Unknown";
    acc[reg] = (acc[reg]||0) + 1;
    return acc;
  }, {});

  function exportCSV() {
    const headers = ["S/NO","Fleet No.","Description","Category","Make","Model",
      "Repair Yard","Region","Status","Condition"];
    const rows = records.map((r:any, i:number) => [
      String(i+1), r.fleet_number||"", r.name||"",
      r.category||"", r.make||"", r.model||"",
      r.current_yard||r.site||"", r.region||"",
      r.operational_status||"", r.assessment||"",
    ]);
    const csv = [headers,...rows].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `Breakdown_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Generate Breakdown Report</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Repair Yard (optional)
            </label>
            <select className={iCls+" w-72"} value={filterSite} onChange={e=>setFilterSite(e.target.value)}>
              <option value="">All Repair Yards ({workshops.length})</option>
              {workshops.map(s => (
                <option key={s.name} value={s.name}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          <button onClick={generate} disabled={loading}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">
            {loading ? "Loading..." : "⚠️ Generate Report"}
          </button>
          {generated && records.length > 0 && (
            <button onClick={exportCSV} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 ml-auto">
              ↓ Export CSV
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Shows all equipment currently at repair yards (Break Down or Under Repair status) · {workshops.length} repair yards across all regions
        </p>
      </div>

      {generated && records.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-lg font-semibold text-slate-600">No equipment at repair yards</p>
          <p className="text-sm text-slate-400 mt-1">{filterSite ? `at ${filterSite}` : "across all repair yards"}</p>
        </div>
      )}

      {generated && records.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-600 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{records.length}</p><p className="text-sm opacity-70 mt-1">Total at Repair Yards</p></div>
            <div className="bg-orange-500 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{breakDown}</p><p className="text-sm opacity-70 mt-1">Break Down</p></div>
            <div className="bg-amber-500 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{underRepair}</p><p className="text-sm opacity-70 mt-1">Under Repair</p></div>
            <div className="bg-slate-900 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{Object.keys(byRegion).length}</p><p className="text-sm opacity-70 mt-1">Regions Affected</p></div>
          </div>

          {Object.keys(byCat).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">By Category</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(byCat).sort((a:any,b:any)=>b[1]-a[1]).map(([cat,count]:any) => (
                  <span key={cat} className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-700">
                    {cat}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                Equipment at Repair Yards {filterSite ? `— ${filterSite}` : "(All)"}
              </h3>
              <span className="text-sm text-slate-400">{records.length} equipment</span>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    {["#","Fleet No.","Description","Category","Make/Model","Repair Yard","Region","Status","Condition"].map(h=>(
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r:any, i:number) => (
                    <tr key={r.id} className="hover:bg-red-50/20">
                      <td className="px-5 py-3 text-slate-400 text-xs">{i+1}</td>
                      <td className="px-5 py-3 font-bold text-amber-600 font-mono text-xs">{r.fleet_number}</td>
                      <td className="px-5 py-3 text-slate-700 max-w-40 truncate">{r.name||"—"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{r.category||"—"}</td>
                      <td className="px-5 py-3 text-xs">
                        <div className="text-slate-700">{r.make||"—"}</div>
                        <div className="text-slate-400">{r.model||""}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-36 truncate">{r.current_yard || r.site||"—"}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{r.region||"—"}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.operational_status==="Break Down" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                        }`}>{r.operational_status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{r.assessment||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MASTER PLANT LIST TAB — Storage replaces Idle/Stand By
// ─────────────────────────────────────────────────────────────
function MasterPlantListTab() {
  const [equipment,     setEquipment]     = useState<any[]>([]);
  const [commissioning, setCommissioning] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterCat,     setFilterCat]     = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterSite,    setFilterSite]    = useState("");

  useEffect(() => {
    async function load() {
      const [e1, e2, comm] = await Promise.all([
        dbu.from("equipment").select("*").range(0, 999),
        dbu.from("equipment").select("*").range(1000, 1999),
        dbu.from("commissioning").select("fleet_number,date_commissioned,serial_no,supplier,purchase_cost,landed_cost,insurance_company,policy_cover_no,insurance_expiry,opening_hour_meter,opening_kilometer,plant_engineer,plant_manager").range(0,1999),
      ]);
      setEquipment([...(e1.data||[]), ...(e2.data||[])]);
      setCommissioning(comm.data||[]);
      setLoading(false);
    }
    load();
  }, []);

  const commMap = commissioning.reduce((acc:any, c:any) => {
    acc[c.fleet_number] = c; return acc;
  }, {});

  const merged = equipment.map(e => ({ ...e, ...(commMap[e.fleet_number]||{}) }));

  const filtered = merged.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      (e.fleet_number||"").toLowerCase().includes(q) ||
      (e.name||"").toLowerCase().includes(q) ||
      (e.make||"").toLowerCase().includes(q) ||
      (e.model||"").toLowerCase().includes(q) ||
      (e.serial_no||"").toLowerCase().includes(q);
    return matchQ &&
      (!filterCat    || e.category === filterCat) &&
      (!filterStatus || e.operational_status === filterStatus) &&
      (!filterSite   || e.site === filterSite);
  });

  const categories = [...new Set(equipment.map(e=>e.category))].filter(Boolean).sort();
  const statuses   = ["Working","Under Repair","Break Down","Storage","Scrapped"];
  const sites      = [...new Set(equipment.map(e=>e.site))].filter(Boolean).sort();

  function exportMasterList() {
    const headers = [
      "S/NO","Fleet No.","Description","Category","Make","Model","Year",
      "Serial No.","Chassis No.","Reg. No.","Engine Power","Size/Capacity",
      "Meter Device","Site","Region","Cost Code",
      "Operational Status","Condition","Current Yard",
      "Comm. Date","Date Received","Supplier",
      "Purchase Cost (₦)","Landed Cost (₦)",
      "Insurance Co.","Policy No.","Insurance Expiry",
      "Opening Hour Meter","Opening KM Reading",
      "Plant Engineer","Plant Manager",
      "Current Hour Meter","Current KM Reading","Hire Rate (₦)",
    ];
    const rows = filtered.map((e:any, i:number) => [
      String(i+1), e.fleet_number||"", e.name||"", e.category||"",
      e.make||"", e.model||"", e.year||"",
      e.serial_no||"", e.chassis_no||"", e.reg_no||"",
      e.engine_power||"", e.size_capacity||"",
      e.meter_device||"", e.site||"", e.region||"", e.cost_code||"",
      e.operational_status||"", e.assessment||"", e.current_yard||"",
      e.date_commissioned ? new Date(e.date_commissioned).toLocaleDateString("en-GB") : "",
      e.date_received     ? new Date(e.date_received).toLocaleDateString("en-GB") : "",
      e.supplier||"",
      String(e.purchase_cost||0), String(e.landed_cost||0),
      e.insurance_company||"", e.policy_cover_no||"",
      e.insurance_expiry  ? new Date(e.insurance_expiry).toLocaleDateString("en-GB") : "",
      String(e.opening_hour_meter||0), String(e.opening_kilometer||0),
      e.plant_engineer||"", e.plant_manager||"",
      String(e.current_hour_meter||0), String(e.current_kilometer||0),
      String(e.hire_rate||0),
    ]);
    const csv = [headers,...rows].map(row=>row.map((v:any)=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `Master_Plant_List_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-slate-800">Master Plant List / Commissioning Register</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? "loading..." : `${filtered.length} of ${equipment.length} records`}
            </p>
          </div>
          <button onClick={exportMasterList} disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
            ↓ Export Master List
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <input placeholder="Search fleet no., name, make, serial..."
            value={search} onChange={e=>setSearch(e.target.value)} className={iCls} />
          <select className={iCls} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className={iCls} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map(s=><option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e=>setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr>
                {["#","Fleet No.","Description","Category","Make / Model",
                  "Site","Region","Status","Condition","Comm. Date",
                  "Serial No.","Supplier","Purchase Cost","Hire Rate"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={14} className="px-5 py-16 text-center text-slate-400">Loading master plant list...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={14} className="px-5 py-16 text-center text-slate-400">No records match your filters.</td></tr>
              ) : filtered.map((e:any, i:number) => (
                <tr key={e.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                  <td className="px-4 py-3 font-bold text-amber-600 font-mono text-xs whitespace-nowrap">{e.fleet_number}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-44 truncate" title={e.name}>{e.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{e.category}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-slate-700">{e.make}</div>
                    <div className="text-slate-400">{e.model}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-32 truncate">{e.site}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{e.region}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[e.operational_status]||"bg-slate-100 text-slate-600"}`}>
                      {e.operational_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{e.assessment||"—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {e.date_commissioned
                      ? new Date(e.date_commissioned).toLocaleDateString("en-GB")
                      : <span className="text-red-400">Not set</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{e.serial_no||"—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-32 truncate">{e.supplier||"—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {e.purchase_cost ? `₦${Number(e.purchase_cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {e.hire_rate ? `₦${Number(e.hire_rate).toLocaleString()}` : "—"}
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
export default function ReportsPage() {
  const [tab,     setTab]     = useState<"rental"|"utilization"|"breakdown"|"masterlist">("rental");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await dbu.auth.getUser();
      if (!user) return;
      const { data } = await dbu.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    }
    loadProfile();
  }, []);

  const roles: string[] = profile?.roles || [];
  const canAccess = roles.some(r =>
    ["super_admin","plant_manager","plant_director","plant_admin","plant_engineer"].includes(r)
  );

  if (profile && !canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 mt-2 text-sm">Reports are only available to Plant Admin, Manager and Engineer.</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: "rental",      label: "📋 Rental List" },
    { key: "utilization", label: "📊 Fleet Utilization" },
    { key: "breakdown",   label: "⚠️ Breakdown Report" },
    { key: "masterlist",  label: "📁 Master Plant List" },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Rental list, fleet utilization, breakdown analysis and master plant register.
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
      {tab === "rental"      && <RentalListTab />}
      {tab === "utilization" && <UtilizationTab />}
      {tab === "breakdown"   && <BreakdownReportTab />}
      {tab === "masterlist"  && <MasterPlantListTab />}
    </div>
  );
}