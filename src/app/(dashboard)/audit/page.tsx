/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllRows } from "@/lib/fetch-all";

const iCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

const ACTION_STYLE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};
const ACTION_ICON: Record<string, string> = { INSERT: "＋", UPDATE: "✎", DELETE: "✕" };

// Human-friendly labels for the raw table_name — keeps the filter
// dropdown and table cells readable without a second lookup table.
const TABLE_LABELS: Record<string, string> = {
  equipment: "Equipment",
  profiles: "Users / Roles",
  maintenance: "Maintenance",
  transfers: "Transfers",
  sro: "SRO (Store Requisition)",
  lro: "LRO (Lubricant Requisition)",
  purchase_comparisons: "Procurement — Purchase Comparisons",
};
const FINANCIAL_TABLES = ["purchase_comparisons"];

function tableLabel(t: string) {
  return TABLE_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtValue(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

// ─────────────────────────────────────────────────────────────
// DETAIL MODAL — field-by-field old → new, for one audit_log row
// ─────────────────────────────────────────────────────────────
function AuditDetailModal({ entry, onClose }: { entry: any; onClose: () => void }) {
  const diffEntries = entry.diff ? Object.entries(entry.diff) : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">
              {tableLabel(entry.table_name)}
            </p>
            <h2 className="text-lg font-bold text-white">
              {ACTION_ICON[entry.action]} {entry.action} — record {String(entry.record_id).slice(0, 8)}…
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Changed By</p>
              <p className="font-semibold text-slate-800">{entry.changed_by || "System"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">When</p>
              <p className="font-semibold text-slate-800">
                {new Date(entry.changed_at).toLocaleString("en-GB")}
              </p>
            </div>
          </div>

          {entry.action === "UPDATE" && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                {diffEntries.length} field{diffEntries.length === 1 ? "" : "s"} changed
              </p>
              {diffEntries.length === 0 ? (
                <p className="text-sm text-slate-400">No field-level changes recorded.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase">Field</th>
                        <th className="text-left px-3 py-2 font-bold text-red-500 uppercase">Before</th>
                        <th className="text-left px-3 py-2 font-bold text-emerald-600 uppercase">After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {diffEntries.map(([field, v]: any) => (
                        <tr key={field}>
                          <td className="px-3 py-2 font-mono text-slate-600">{field}</td>
                          <td className="px-3 py-2 text-red-600">{fmtValue(v.old)}</td>
                          <td className="px-3 py-2 text-emerald-700 font-medium">{fmtValue(v.new)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {entry.action === "INSERT" && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Record created</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-h-64 overflow-y-auto">
                <pre className="text-xs text-emerald-800 whitespace-pre-wrap wrap-break-word">
                  {JSON.stringify(entry.new_values, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {entry.action === "DELETE" && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Record deleted — last known state</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-64 overflow-y-auto">
                <pre className="text-xs text-red-800 whitespace-pre-wrap wrap-break-word">
                  {JSON.stringify(entry.old_values, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { profile } = useAuth();
  const roles: string[] = (profile?.roles as string[]) || [];
  const canView = roles.some(r => ["super_admin", "plant_admin", "executive"].includes(r));

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [financialOnly, setFinancialOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => { if (canView) load(); }, [canView]); // eslint-disable-line

  async function load() {
    setLoading(true);
    const rows = await fetchAllRows("audit_log", "*", (q: any) => q.order("changed_at", { ascending: false }));
    setEntries(rows as any[]);
    setLoading(false);
  }

  if (!canView) {
    return <div className="py-24 text-center text-slate-400">You don&apos;t have access to the Audit Log.</div>;
  }

  const tableOptions = [...new Set(entries.map(e => e.table_name))].sort();

  const filtered = entries.filter(e => {
    if (financialOnly && !FINANCIAL_TABLES.includes(e.table_name)) return false;
    if (tableFilter && e.table_name !== tableFilter) return false;
    if (actionFilter && e.action !== actionFilter) return false;
    if (userFilter && !(e.changed_by || "").toLowerCase().includes(userFilter.toLowerCase())) return false;
    if (dateFrom && new Date(e.changed_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.changed_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const todayCount = entries.filter(e => {
    const d = new Date(e.changed_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const deleteCount = entries.filter(e => e.action === "DELETE").length;
  const roleChangeCount = entries.filter(e => e.table_name === "profiles").length;

  function resetFilters() {
    setTableFilter(""); setActionFilter(""); setUserFilter("");
    setFinancialOnly(false); setDateFrom(""); setDateTo(""); setPage(1);
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">Audit</p>
        <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 mt-1 text-sm max-w-lg">
          Every change to Equipment, Users, Maintenance, Transfers, Requisitions, and Procurement — captured automatically at the database level. This cannot be edited or deleted through the app.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : entries.length.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">Total Entries</p>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : todayCount}</p>
          <p className="text-sm opacity-70 mt-1">Today</p>
        </div>
        <div className="bg-red-600 text-white rounded-2xl p-5">
          <p className="text-2xl font-bold">{loading ? "..." : deleteCount}</p>
          <p className="text-sm opacity-70 mt-1">Deletions (all time)</p>
        </div>
        <button onClick={() => { setFinancialOnly(true); setTableFilter(""); setPage(1); }}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-5 text-left transition-colors">
          <p className="text-2xl font-bold">{loading ? "..." : roleChangeCount}</p>
          <p className="text-sm opacity-70 mt-1">Role Changes — click Financial ↓</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase">Filters</p>
          <button onClick={resetFilters} className="text-xs text-amber-600 font-semibold hover:text-amber-700">
            Reset all
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <select className={iCls} value={tableFilter} onChange={e => { setTableFilter(e.target.value); setFinancialOnly(false); setPage(1); }}>
            <option value="">All Modules</option>
            {tableOptions.map(t => <option key={t} value={t}>{tableLabel(t)}</option>)}
          </select>
          <select className={iCls} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            <option value="INSERT">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="DELETE">Deleted</option>
          </select>
          <input className={iCls} placeholder="Search by user..." value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(1); }} />
          <input className={iCls} type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
          <input className={iCls} type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer w-fit">
          <input type="checkbox" checked={financialOnly}
            onChange={e => { setFinancialOnly(e.target.checked); setTableFilter(""); setPage(1); }}
            className="accent-amber-500" />
          Financial only (Procurement / Purchase Comparisons)
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-slate-500 text-sm">{loading ? "Loading..." : `${filtered.length.toLocaleString()} entries`}</p>
          {!loading && totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40">‹</button>
              Page {page} of {totalPages}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40">›</button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["When", "Module", "Action", "Record", "By"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No entries match these filters.</td></tr>
              ) : pageRows.map(e => (
                <tr key={e.id} onClick={() => setSelected(e)} className="hover:bg-amber-50/20 cursor-pointer">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap" title={new Date(e.changed_at).toLocaleString("en-GB")}>
                    {timeAgo(e.changed_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs font-medium">{tableLabel(e.table_name)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_STYLE[e.action]}`}>
                      {ACTION_ICON[e.action]} {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{String(e.record_id).slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{e.changed_by || "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}