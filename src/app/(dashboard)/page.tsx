/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dbu } from "@/lib/db";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type ChartRange = "7d" | "30d" | "90d";

// ─────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, color = "white", link }: {
  title: string; value: number | string; sub: string;
  color?: "dark" | "amber" | "green" | "blue" | "white"; link?: string;
}) {
  const colors = {
    dark:  "bg-slate-900 text-white",
    amber: "bg-amber-500 text-white",
    green: "bg-emerald-500 text-white",
    blue:  "bg-blue-500 text-white",
    white: "bg-white border border-slate-200 text-slate-800",
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

// ─────────────────────────────────────────────────────────────
// ACTIVITY ITEM
// ─────────────────────────────────────────────────────────────
function ActivityItem({ icon, title, sub, time }: {
  icon: string; title: string; sub: string; time: string;
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
      <span className="text-xl mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
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

// ─────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP for the wave chart
// ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">
            {p.dataKey === "utilization" ? `${p.value}%` : `${p.value}h`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UTILIZATION WAVE CHART
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

      // Calculate date range
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().split("T")[0];

      // Fetch daily_logs grouped by date
      const { data, error } = await dbu
        .from("daily_logs")
        .select("log_date, working_hours, idle_hours, breakdown_hours, availability_status")
        .gte("log_date", fromStr)
        .order("log_date", { ascending: true });

      if (error || !data) { setLoadingChart(false); return; }

      // Group by date and calculate utilization + operating hours
      const byDate: Record<string, { working: number; idle: number; breakdown: number; total: number }> = {};

      data.forEach((row: any) => {
        const d = row.log_date;
        if (!byDate[d]) byDate[d] = { working: 0, idle: 0, breakdown: 0, total: 0 };
        byDate[d].working   += Number(row.working_hours   || 0);
        byDate[d].idle      += Number(row.idle_hours      || 0);
        byDate[d].breakdown += Number(row.breakdown_hours || 0);
        byDate[d].total     += 1;
      });

      // Build chart points — one per day in range
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
          // No logs for this day — keep continuity with null (chart skips gracefully)
          points.push({
            date:          label,
            utilization:   null,
            operatingHours: null,
          });
        }
      }

      // Remove leading/trailing nulls for cleaner wave
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Chart header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">Plant Utilization Overview</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Working hours vs total logged hours across all sites
          </p>
        </div>
        {/* Range selector */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => onRangeChange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r.value
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
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
                {/* Utilization gradient — blue */}
                <linearGradient id="gradUtil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
                {/* Operating hours gradient — green */}
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

              {/* Left Y axis — utilization % */}
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                width={38}
              />

              {/* Right Y axis — operating hours */}
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

              {/* Utilization % — smooth wave */}
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

              {/* Operating hours — smooth wave */}
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

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [profile,     setProfile]     = useState<any>(null);
  const [equipment,   setEquipment]   = useState<any[]>([]);
  const [transfers,   setTransfers]   = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [siteCount,   setSiteCount]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [chartRange,  setChartRange]  = useState<ChartRange>("30d");

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        // ── All queries fire in parallel — nothing blocks anything ──
        const [
          authResult,
          equipResult,
          transResult,
          maintResult,
          siteResult,
        ] = await Promise.all([
          dbu.auth.getUser(),
          // Equipment: two pages covers up to 2000 records — enough for Hartland
          Promise.all([
            dbu.from("equipment")
              .select("id,fleet_number,operational_status,category,region,site")
              .range(0, 999),
            dbu.from("equipment")
              .select("id,fleet_number,operational_status,category,region,site")
              .range(1000, 1999),
          ]),
          dbu.from("transfers")
            .select("*").order("created_at", { ascending: false }).limit(10),
          dbu.from("maintenance")
            .select("*").order("created_at", { ascending: false }).limit(10),
          dbu.from("sites")
            .select("*", { count: "exact", head: true }).eq("is_active", true),
        ]);

        // Profile
        const user = authResult.data?.user;
        if (user) {
          const { data: prof } = await dbu
            .from("profiles").select("*").eq("id", user.id).single();
          setProfile(prof);
        }

        // Equipment — merge both pages, filter out nulls
        const [page1, page2] = equipResult;
        const allEquip = [
          ...(page1.data || []),
          ...(page2.data || []),
        ];
        setEquipment(allEquip);

        setTransfers(transResult.data || []);
        setMaintenance(maintResult.data || []);
        setSiteCount(siteResult.count || 0);

      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        // Always stop loading — sidebar never gets stuck
        setLoading(false);
      }
    }
    load();
  }, []);

  const total    = equipment.length;
  const working  = equipment.filter(e => e.operational_status === "Working").length;
  const repair   = equipment.filter(e => ["Under Repair","Break Down"].includes(e.operational_status)).length;
  const idle     = equipment.filter(e => ["Idle","Stand By"].includes(e.operational_status)).length;
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
          <h1 className="text-3xl font-bold text-slate-900">
            {profile ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center">
          <p className="text-3xl font-bold text-amber-600">{loading ? "..." : `${utilization}%`}</p>
          <p className="text-xs text-amber-700 font-semibold mt-0.5">Fleet Utilization</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Fleet"     value={loading ? "..." : total}    sub="All equipment"      color="dark"  link="/equipment" />
        <KpiCard title="Working"         value={loading ? "..." : working}  sub="Operational"        color="green" link="/equipment" />
        <KpiCard title="Under Repair"    value={loading ? "..." : repair}   sub="Breakdown / repair" color="amber" link="/maintenance" />
        <KpiCard title="Idle / Stand By" value={loading ? "..." : idle}     sub="Not deployed"       color="white" />
        <KpiCard title="Scrapped"        value={loading ? "..." : scrapped} sub="Disposed assets"    color="white" />
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
            <Link href="/transfer" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Recent Activity</h2>
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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Fleet by Category</h3>
            </div>
            <div className="p-5 space-y-3">
              {loading ? (
                <p className="text-slate-400 text-xs text-center py-4">Loading...</p>
              ) : topCategories.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">No equipment yet</p>
              ) : topCategories.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 truncate max-w-35">{cat}</span>
                    <span className="font-bold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Fleet by Region</h3>
            </div>
            <div className="p-5 space-y-2">
              {loading ? (
                <p className="text-slate-400 text-xs text-center py-4">Loading...</p>
              ) : topRegions.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">No equipment yet</p>
              ) : topRegions.map(([region, count]) => (
                <div key={region} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{region}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{count}</span>
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