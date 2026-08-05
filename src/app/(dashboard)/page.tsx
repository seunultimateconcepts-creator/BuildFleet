/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dbu } from "@/lib/db";
import { fetchAllRows } from "@/lib/fetch-all";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type ChartRange = "7d" | "30d" | "90d";

// Store staff see a genuinely different dashboard — unless they ALSO
// hold a plant management-tier role, in which case they still get the
// full fleet overview as their primary job.
const STORE_ROLES = ["store_officer", "store_manager", "store_supervisor"];
const PROCUREMENT_ROLES = ["procurement_officer", "procurement_manager"];
const PLANT_OVERRIDE_ROLES = ["plant_admin", "plant_manager", "plant_director", "plant_engineer", "super_admin"];

// ─────────────────────────────────────────────────────────────
// SHARED — KPI CARD, ACTIVITY ITEM (used by both dashboards)
// ─────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, color = "white", link }: {
  title: string; value: number | string; sub: string;
  color?: "dark" | "amber" | "green" | "blue" | "red" | "white"; link?: string;
}) {
  const colors = {
    dark:  "bg-slate-900 text-white",
    amber: "bg-amber-500 text-white",
    green: "bg-emerald-500 text-white",
    blue:  "bg-blue-500 text-white",
    red:   "bg-red-600 text-white",
    white: "bg-white dark:bg-[#1A1D2E] border border-slate-200 dark:border-[#2A2D3E] text-slate-800 dark:text-white",
  };
  const card = (
    <div className={`${colors[color]} rounded-2xl p-5 ${link ? "hover:opacity-90 transition-opacity cursor-pointer" : ""}`}>
      <p className={`text-3xl font-bold ${color === "white" ? "text-slate-800" : "text-white"}`}>{value}</p>
      <p className={`text-sm font-semibold mt-1 ${color === "white" ? "text-slate-700" : "text-white"}`}>{title}</p>
      <p className={`text-xs mt-0.5 ${color === "white" ? "text-slate-400" : "opacity-70"}`}>{sub}</p>
    </div>
  );
  return link ? <Link href={link}>{card}</Link> : card;
}

function ActivityItem({ icon, title, sub, time }: {
  icon: string; title: string; sub: string; time: string;
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
      <span className="text-xl mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{time}</span>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

// ═════════════════════════════════════════════════════════════
// STORE DASHBOARD — what a Store Officer/Manager/Supervisor sees
// instead of the Plant fleet dashboard. A scoped Data Analyst
// (store_officer only) sees just their own store's numbers; Store
// Manager/Supervisor/super_admin see the picture across every store.
// ═════════════════════════════════════════════════════════════
function StoreDashboard({ profile, roles }: { profile: any; roles: string[] }) {
  const isScopedOfficer = roles.includes("store_officer") && !roles.some(r => ["store_manager","store_supervisor","super_admin"].includes(r));

  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [pendingSROs, setPendingSROs] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [activeMUs, setActiveMUs] = useState<any[]>([]);
  const [myStore, setMyStore] = useState("");

  useEffect(() => { load(); }, []); // eslint-disable-line
  async function load() {
    setLoading(true);
    let storeFilter = "";
    if (isScopedOfficer) {
      const sites = await fetchAllRows("sites", "name");
      const storeNames = sites.filter((s:any) => /store/i.test(s.name)).map((s:any) => s.name);
      storeFilter = (profile?.assigned_sites || []).find((s:string) => storeNames.includes(s)) || "";
      setMyStore(storeFilter);
    }

    const [bal, items, sros, txns, mus] = await Promise.all([
      storeFilter
        ? fetchAllRows("store_stock_balances", "*", (q:any) => q.eq("store_location", storeFilter))
        : fetchAllRows("store_stock_balances", "*"),
      fetchAllRows("stock_items", "id,name,unit_cost"),
      fetchAllRows("sro", "*", (q:any) => q.in("status", ["At Store","In Progress"]).order("created_at", { ascending: false })),
      fetchAllRows("store_transactions", "*", (q:any) => q.order("created_at", { ascending: false })),
      fetchAllRows("movable_units", "*", (q:any) => q.in("status", ["In Transit","Approved"])),
    ]);

    const enriched = (bal as any[]).map(b => {
      const item = (items as any[]).find(i => i.id === b.stock_item_id);
      return { ...b, name: item?.name, unit_cost: item?.unit_cost || 0 };
    });
    setBalances(enriched);
    setPendingSROs(sros as any[]);
    setRecentTxns((txns as any[]).slice(0, 8));
    setActiveMUs(mus as any[]);
    setLoading(false);
  }

  const totalItems = balances.length;
  const stockValue = balances.reduce((s, b) => s + Number(b.balance||0) * Number(b.unit_cost||0), 0);
  const lowStock = balances.filter(b => Number(b.balance) <= Number(b.reorder_level || 10));
  const totalReceived = balances.reduce((s,b) => s + Number(b.qty_received||0), 0);
  const totalIssued = balances.reduce((s,b) => s + Number(b.qty_issued||0), 0);

  const txnIcon: Record<string,string> = { GRN: "📥", SIV: "📤", ADJUSTMENT: "⚠️", RETURN: "↩️" };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Store Overview</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {profile ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isScopedOfficer && myStore ? `${myStore} — ` : "All stores — "}
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className={`rounded-2xl px-5 py-3 text-center border ${lowStock.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          <p className={`text-3xl font-bold ${lowStock.length > 0 ? "text-red-600" : "text-emerald-600"}`}>{loading ? "..." : lowStock.length}</p>
          <p className={`text-xs font-semibold mt-0.5 ${lowStock.length > 0 ? "text-red-700" : "text-emerald-700"}`}>Low / Out of Stock</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Items"  value={loading ? "..." : totalItems}       sub={isScopedOfficer ? "At your store" : "Across all stores"} color="dark"  link="/store" />
        <KpiCard title="Stock Value"  value={loading ? "..." : naira(stockValue)} sub="Current inventory"  color="amber" link="/store" />
        <KpiCard title="Received"     value={loading ? "..." : totalReceived}     sub="Total received"     color="green" link="/store" />
        <KpiCard title="Issued"       value={loading ? "..." : totalIssued}       sub="Total issued"       color="blue"  link="/store" />
      </div>

      {!loading && (pendingSROs.length > 0 || activeMUs.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingSROs.length > 0 && (
            <Link href="/sro" className="bg-orange-50 border border-orange-200 rounded-2xl p-4 hover:bg-orange-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-bold text-orange-800 text-sm">{pendingSROs.length} SRO{pendingSROs.length>1?"s":""} awaiting store action</p>
                  <p className="text-orange-600 text-xs mt-0.5">Click to check availability &amp; issue</p>
                </div>
              </div>
            </Link>
          )}
          {activeMUs.length > 0 && (
            <Link href="/movable-units" className="bg-blue-50 border border-blue-200 rounded-2xl p-4 hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚚</span>
                <div>
                  <p className="font-bold text-blue-800 text-sm">{activeMUs.length} Movable Unit{activeMUs.length>1?"s":""} in progress</p>
                  <p className="text-blue-600 text-xs mt-0.5">Click to seal, approve, or receive</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1E2235]">
            <h2 className="font-bold text-slate-800 dark:text-white">Recent Store Activity</h2>
            <p className="text-slate-400 text-xs mt-0.5">Latest GRN, SIV and adjustments</p>
          </div>
          <div className="px-6 py-2">
            {loading ? (
              <p className="text-slate-400 text-sm py-8 text-center">Loading...</p>
            ) : recentTxns.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No store activity yet.</p>
            ) : recentTxns.map((t:any) => (
              <ActivityItem key={t.id} icon={txnIcon[t.txn_type] || "📦"}
                title={`${t.txn_type} — ${t.item_name || "Item"}`}
                sub={`${t.quantity ? Number(t.quantity).toLocaleString() + " units" : ""} ${t.store_location ? "at " + t.store_location : ""}`.trim()}
                time={timeAgo(t.created_at)} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E2235]">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Low Stock Alerts</h3>
          </div>
          <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-slate-400 text-xs text-center py-4">Loading...</p>
            ) : lowStock.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">✅ Nothing low right now.</p>
            ) : lowStock.slice(0, 10).map((b:any) => (
              <div key={b.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-32">{b.name}</span>
                <span className="font-bold text-red-600">{b.balance} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP for the wave chart
// ─────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════
// PROCUREMENT DASHBOARD — what a Procurement Officer/Manager sees
// instead of the Plant fleet dashboard.
// ═════════════════════════════════════════════════════════════
function ProcurementDashboard({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => { load(); }, []); // eslint-disable-line
  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([
      fetchAllRows("purchase_comparisons", "*", (q:any) => q.order("created_at",{ascending:false})),
      fetchAllRows("purchases", "*", (q:any) => q.order("purchase_date",{ascending:false})),
    ]);
    setComparisons(c); setPurchases(p);
    setLoading(false);
  }

  const month = new Date().toISOString().slice(0,7);
  const monthPurchases = purchases.filter((p:any) => (p.purchase_date||"").startsWith(month));
  const monthTotal = monthPurchases.reduce((s,p:any) => s + Number(p.amount||0), 0);
  const pendingCheck = comparisons.filter((c:any) => c.status === "Draft").length;
  const pendingApprove = comparisons.filter((c:any) => c.status === "Checked").length;

  const bySupplier: Record<string, number> = {};
  monthPurchases.forEach((p:any) => { bySupplier[p.supplier||"—"] = (bySupplier[p.supplier||"—"]||0) + Number(p.amount||0); });
  const topSuppliers = Object.entries(bySupplier).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const recentComparisons = comparisons.slice(0, 8);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Procurement Overview</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {profile ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Spend This Month" value={loading?"...":naira(monthTotal)} sub={`${monthPurchases.length} purchases`} color="dark" link="/procurement" />
        <KpiCard title="Awaiting Check"    value={loading?"...":pendingCheck}     sub="Draft comparisons"    color="amber" link="/procurement" />
        <KpiCard title="Awaiting Approval" value={loading?"...":pendingApprove}   sub="Checked, need sign-off" color="blue" link="/procurement" />
        <KpiCard title="Total Comparisons" value={loading?"...":comparisons.length} sub="All time"           color="white" link="/procurement" />
      </div>

      {!loading && (pendingCheck > 0 || pendingApprove > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingCheck > 0 && (
            <Link href="/procurement" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-bold text-amber-800 text-sm">{pendingCheck} comparison{pendingCheck>1?"s":""} awaiting check</p>
                  <p className="text-amber-600 text-xs mt-0.5">Click to review supplier quotes</p>
                </div>
              </div>
            </Link>
          )}
          {pendingApprove > 0 && (
            <Link href="/procurement" className="bg-blue-50 border border-blue-200 rounded-2xl p-4 hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-blue-800 text-sm">{pendingApprove} comparison{pendingApprove>1?"s":""} awaiting approval</p>
                  <p className="text-blue-600 text-xs mt-0.5">Click to sign off</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1E2235]">
            <h2 className="font-bold text-slate-800 dark:text-white">Recent Purchase Comparisons</h2>
          </div>
          <div className="px-6 py-2">
            {loading ? <p className="text-slate-400 text-sm py-8 text-center">Loading...</p>
            : recentComparisons.length === 0 ? <p className="text-slate-400 text-sm py-8 text-center">No comparisons yet.</p>
            : recentComparisons.map((c:any) => (
              <ActivityItem key={c.id} icon="📋"
                title={`${c.sro_number||"—"} — ${c.selected_supplier||"No supplier selected"}`}
                sub={`${c.status} · ${naira(c.total_amount)}`}
                time={timeAgo(c.created_at)} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E2235]">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Top Suppliers — {month}</h3>
          </div>
          <div className="p-5 space-y-3">
            {loading ? <p className="text-slate-400 text-xs text-center py-4">Loading...</p>
            : topSuppliers.length === 0 ? <p className="text-slate-400 text-xs text-center py-4">No spend this month yet.</p>
            : topSuppliers.map(([s,amt]) => (
              <div key={s} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-32">{s}</span>
                <span className="font-bold text-slate-800 dark:text-white">{naira(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1A1D2E] border border-slate-200 dark:border-[#2A2D3E] rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800 dark:text-white">
            {p.dataKey === "utilization" ? `${p.value}%` : `${p.value}h`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UTILIZATION WAVE CHART (unchanged)
// ─────────────────────────────────────────────────────────────
function UtilizationChart({ range, onRangeChange }: {
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
}) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    async function loadChartData() {
      setLoadingChart(true);

      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().split("T")[0];

      const { data, error } = await dbu
        .from("daily_logs")
        .select("log_date, working_hours, idle_hours, breakdown_hours, availability_status")
        .gte("log_date", fromStr)
        .order("log_date", { ascending: true });

      if (error || !data) { setLoadingChart(false); return; }

      const byDate: Record<string, { working: number; idle: number; breakdown: number; total: number }> = {};

      data.forEach((row: any) => {
        const d = row.log_date;
        if (!byDate[d]) byDate[d] = { working: 0, idle: 0, breakdown: 0, total: 0 };
        byDate[d].working   += Number(row.working_hours   || 0);
        byDate[d].idle      += Number(row.idle_hours      || 0);
        byDate[d].breakdown += Number(row.breakdown_hours || 0);
        byDate[d].total     += 1;
      });

      const points: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          ...(range === "90d" ? { month: "short" } : {}),
        });

        const day = byDate[key];
        if (day && day.total > 0) {
          const totalHours = day.working + day.idle + day.breakdown;
          const utilPct    = totalHours > 0 ? Math.round((day.working / totalHours) * 100) : 0;
          points.push({
            date:        label,
            utilization: utilPct,
            operatingHours: Math.round(day.working),
          });
        } else {
          points.push({
            date:          label,
            utilization:   null,
            operatingHours: null,
          });
        }
      }

      const trimmed = points.filter((_p, i) => {
        const hasData = points.some(p => p.utilization !== null);
        return hasData;
      });

      setChartData(trimmed.length > 0 ? trimmed : points);
      setLoadingChart(false);
    }

    loadChartData();
  }, [range]);

  const RANGES: { label: string; value: ChartRange }[] = [
    { label: "7 Days",   value: "7d"  },
    { label: "30 Days",  value: "30d" },
    { label: "90 Days",  value: "90d" },
  ];

  return (
    <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1E2235] flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-white">Plant Utilization Overview</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Working hours vs total logged hours across all sites
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-[#1A1D2E] rounded-xl p-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => onRangeChange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r.value
                  ? "bg-white dark:bg-[#0F1117] text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 pt-4 pb-2">
        {loadingChart ? (
          <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
            Loading chart data...
          </div>
        ) : chartData.every(p => p.utilization === null) ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <span className="text-3xl">📊</span>
            <p>No daily log data yet for this period.</p>
            <p className="text-xs">Start logging daily equipment activity to see utilization trends.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradUtil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                interval={range === "7d" ? 0 : range === "30d" ? 4 : 13}
              />

              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                width={38}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}h`}
                width={38}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => (
                  <span style={{ color: "#64748B" }}>{value}</span>
                )}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="utilization"
                name="Utilization (%)"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fill="url(#gradUtil)"
                dot={false}
                activeDot={{ r: 5, fill: "#3B82F6", strokeWidth: 0 }}
                connectNulls
              />

              <Area
                yAxisId="right"
                type="monotone"
                dataKey="operatingHours"
                name="Operating Hours (h)"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#gradHours)"
                dot={false}
                activeDot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN PAGE — routes to StoreDashboard or the existing Plant
// dashboard based on role. Plant dashboard logic below is UNCHANGED.
// ═════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [profile,     setProfile]     = useState<any>(null);
  const [roles,        setRoles]      = useState<string[]>([]);
  const [equipment,   setEquipment]   = useState<any[]>([]);
  const [transfers,   setTransfers]   = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [siteCount,   setSiteCount]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [chartRange,  setChartRange]  = useState<ChartRange>("30d");
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load profile first, alone, so we know which dashboard to render
  // before firing off the (unnecessary, for Store users) plant queries.
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await dbu.auth.getUser();
      if (user) {
        const { data } = await dbu.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
        setRoles(data?.roles || []);
      }
      setProfileLoaded(true);
    }
    loadProfile();
  }, []);

  const isStoreUser = roles.some(r => STORE_ROLES.includes(r)) && !roles.some(r => PLANT_OVERRIDE_ROLES.includes(r));
  const isProcurementUser = !isStoreUser && roles.some(r => PROCUREMENT_ROLES.includes(r)) && !roles.some(r => PLANT_OVERRIDE_ROLES.includes(r));

  useEffect(() => {
    if (!profileLoaded || isStoreUser || isProcurementUser) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      try {
        const assignedSites: string[] = profile?.assigned_sites || [];
        const isRestricted = (roles.includes("plant_clerk") || roles.includes("site_supervisor")) &&
          !roles.some((r: string) => ["plant_admin","plant_manager","plant_engineer","plant_director","super_admin"].includes(r));

        let equipQ1 = dbu.from("equipment")
          .select("id,fleet_number,operational_status,category,region,site")
          .range(0, 999);
        let equipQ2 = dbu.from("equipment")
          .select("id,fleet_number,operational_status,category,region,site")
          .range(1000, 1999);

        if (isRestricted && assignedSites.length > 0) {
          equipQ1 = equipQ1.in("site", assignedSites);
          equipQ2 = equipQ2.in("site", assignedSites);
        }

        let transQ = dbu.from("transfers")
          .select("*").order("created_at", { ascending: false }).limit(10);
        if (isRestricted && assignedSites.length > 0) {
          transQ = transQ.or(
            `from_site.in.(${assignedSites.map((s:string) => `"${s}"`).join(",")}),to_site.in.(${assignedSites.map((s:string) => `"${s}"`).join(",")})`
          );
        }

        let maintQ = dbu.from("maintenance")
          .select("*").order("created_at", { ascending: false }).limit(10);
        if (isRestricted && assignedSites.length > 0) {
          maintQ = maintQ.in("site", assignedSites);
        }

        let siteQ = dbu.from("sites")
          .select("*", { count: "exact", head: true }).eq("is_active", true);
        if (isRestricted && assignedSites.length > 0) {
          siteQ = siteQ.in("name", assignedSites);
        }

        const [equipResult, transResult, maintResult, siteResult] = await Promise.all([
          Promise.all([equipQ1, equipQ2]),
          transQ,
          maintQ,
          siteQ,
        ]);

        const [page1, page2] = equipResult;
        setEquipment([...(page1.data || []), ...(page2.data || [])]);
        setTransfers(transResult.data || []);
        setMaintenance(maintResult.data || []);
        setSiteCount(siteResult.count || 0);

      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profileLoaded, isStoreUser, isProcurementUser]); // eslint-disable-line

  // ── Route to the Store dashboard, entirely separate content ──
  if (profileLoaded && isStoreUser) {
    return <StoreDashboard profile={profile} roles={roles} />;
  }
  if (profileLoaded && isProcurementUser) {
    return <ProcurementDashboard profile={profile} />;
  }

  // ── Everything below is the ORIGINAL Plant dashboard, unchanged ──
  const total    = equipment.length;
  const working  = equipment.filter(e => e.operational_status === "Working").length;
  const repair   = equipment.filter(e => ["Under Repair","Break Down"].includes(e.operational_status)).length;
  const storage  = equipment.filter(e => ["Storage","Idle","Stand By"].includes(e.operational_status)).length;
  const scrapped = equipment.filter(e => e.operational_status === "Scrapped").length;

  const pendingTransfers = transfers.filter(t => t.status === "Pending").length;
  const inTransit        = transfers.filter(t => t.status === "In Transit").length;
  const pendingMaint     = maintenance.filter(m => m.status === "Pending").length;
  const inProgressMaint  = maintenance.filter(m => m.status === "In Progress").length;

  const utilization = total > 0 ? Math.round((working / total) * 100) : 0;

  const recentActivity = [
    ...transfers.slice(0, 5).map(t => ({
      icon: "🔄",
      title: `${t.equipment_code} transferred`,
      sub: `${t.from_site} → ${t.to_site}`,
      time: t.created_at,
    })),
    ...maintenance.slice(0, 5).map(m => ({
      icon: m.status === "Completed" ? "✅" : m.maintenance_type === "Breakdown" ? "⚠️" : "🔧",
      title: `${m.equipment_code} — ${m.maintenance_type}`,
      sub: m.issue,
      time: m.created_at,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

  const byCat = equipment.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const topCategories: [string, number][] = Object.entries(byCat)
    .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5) as [string, number][];

  const byRegion = equipment.reduce((acc, e) => {
    acc[e.region] = (acc[e.region] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const topRegions: [string, number][] = Object.entries(byRegion)
    .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5) as [string, number][];

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {profile ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-3 text-center">
          <p className="text-3xl font-bold text-amber-600">{loading ? "..." : `${utilization}%`}</p>
          <p className="text-xs text-amber-700 font-semibold mt-0.5">Fleet Utilization</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Fleet"  value={loading ? "..." : total}    sub="All equipment"      color="dark"  link="/equipment" />
        <KpiCard title="Working"      value={loading ? "..." : working}  sub="Operational"        color="green" link="/equipment" />
        <KpiCard title="Under Repair" value={loading ? "..." : repair}   sub="Breakdown / repair" color="amber" link="/maintenance" />
        <KpiCard title="Storage"      value={loading ? "..." : storage}  sub="In storage yards"   color="white" link="/equipment" />
        <KpiCard title="Scrapped"     value={loading ? "..." : scrapped} sub="Disposed assets"    color="white" link="/equipment" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Pending Transfers" value={loading ? "..." : pendingTransfers} sub="Awaiting receipt" color="white" link="/transfer" />
        <KpiCard title="In Transit"        value={loading ? "..." : inTransit}        sub="Currently moving" color="blue"  link="/transfer" />
        <KpiCard title="Pending Repairs"   value={loading ? "..." : pendingMaint}     sub="Not yet started"  color="white" link="/maintenance" />
        <KpiCard title="Active Sites"      value={loading ? "..." : siteCount}        sub="All locations"    color="white" link="/sites" />
      </div>

      {/* Alerts */}
      {!loading && (pendingTransfers > 0 || pendingMaint > 0 || inProgressMaint > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {pendingTransfers > 0 && (
            <Link href="/transfer" className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-bold text-amber-800 text-sm">
                    {pendingTransfers} transfer{pendingTransfers > 1 ? "s" : ""} pending receipt
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">Click to view and confirm</p>
                </div>
              </div>
            </Link>
          )}
          {pendingMaint > 0 && (
            <Link href="/maintenance" className="bg-red-50 border border-red-200 rounded-2xl p-4 hover:bg-red-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-red-800 text-sm">
                    {pendingMaint} maintenance job{pendingMaint > 1 ? "s" : ""} pending
                  </p>
                  <p className="text-red-600 text-xs mt-0.5">Click to assign technicians</p>
                </div>
              </div>
            </Link>
          )}
          {inProgressMaint > 0 && (
            <Link href="/maintenance" className="bg-blue-50 border border-blue-200 rounded-2xl p-4 hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔧</span>
                <div>
                  <p className="font-bold text-blue-800 text-sm">
                    {inProgressMaint} repair{inProgressMaint > 1 ? "s" : ""} in progress
                  </p>
                  <p className="text-blue-600 text-xs mt-0.5">Click to view status</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── UTILIZATION WAVE CHART ── */}
      <UtilizationChart range={chartRange} onRangeChange={setChartRange} />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1E2235]">
            <h2 className="font-bold text-slate-800 dark:text-white">Recent Activity</h2>
            <p className="text-slate-400 text-xs mt-0.5">Latest transfers and maintenance events</p>
          </div>
          <div className="px-6 py-2">
            {loading ? (
              <p className="text-slate-400 text-sm py-8 text-center">Loading...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">
                No activity yet. Start by commissioning equipment.
              </p>
            ) : recentActivity.map((a, i) => (
              <ActivityItem key={i} icon={a.icon} title={a.title} sub={a.sub} time={timeAgo(a.time)} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* By Category */}
          <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E2235]">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Fleet by Category</h3>
            </div>
            <div className="p-5 space-y-3">
              {loading ? (
                <p className="text-slate-400 text-xs text-center py-4">Loading...</p>
              ) : topCategories.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">No equipment yet</p>
              ) : topCategories.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-35">{cat}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Region */}
          <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E2235]">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Fleet by Region</h3>
            </div>
            <div className="p-5 space-y-2">
              {loading ? (
                <p className="text-slate-400 text-xs text-center py-4">Loading...</p>
              ) : topRegions.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">No equipment yet</p>
              ) : topRegions.map(([region, count]) => (
                <div key={region} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">{region}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{count}</span>
                    <span className="text-xs text-slate-400">
                      ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}