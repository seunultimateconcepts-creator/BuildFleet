/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";

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

// ─────────────────────────────────────────────────────────────
// JOB CARD MODAL — view full details + parts
// ─────────────────────────────────────────────────────────────
function JobCardModal({ record, onClose, onUpdate, profile }: {
  record: any; onClose: () => void;
  onUpdate: () => void; profile: any;
}) {
  const [parts,        setParts]        = useState<any[]>(record.parts_used || []);
  const [newPart,      setNewPart]      = useState({ name:"", qty:1, unit:"", cost:0 });
  const [remarks,      setRemarks]      = useState(record.remarks || "");
  const [completionDate, setCompletionDate] = useState(record.completion_date || "");
  const [cost,         setCost]         = useState(record.cost || 0);
  const [saving,       setSaving]       = useState(false);

  const roles: string[] = profile?.roles || [];
  const isEngineer = roles.some((r:string) =>
    ["plant_engineer","plant_manager","plant_director","plant_admin"].includes(r));

  const totalPartsCost = parts.reduce((s,p) => s + (p.cost * p.qty || 0), 0);

  function addPart() {
    if (!newPart.name) return;
    setParts(prev => [...prev, { ...newPart, id: Date.now() }]);
    setNewPart({ name:"", qty:1, unit:"", cost:0 });
  }

  function removePart(id: any) {
    setParts(prev => prev.filter(p => p.id !== id));
  }

  async function handleApprove() {
    setSaving(true);
    await dbu.from("maintenance").update({
      status:          "Completed",
      completion_date: completionDate || new Date().toISOString().slice(0,10),
      cost:            Number(cost) || totalPartsCost,
      parts_used:      parts,
      remarks,
      approved_by:     profile?.full_name || "",
    }).eq("id", record.id);

    // Set equipment back to Working
    await dbu.from("equipment").update({ operational_status: "Working" })
      .eq("id", record.equipment_id);

    await dbu.from("equipment_history").insert([{
      equipment_id: record.equipment_id,
      fleet_number: record.equipment_code,
      action_type:  "Maintenance Completed",
      from_status:  "Under Repair",
      to_status:    "Working",
      performed_by: profile?.full_name || "",
      remarks:      `Repair completed. Cost: ₦${(Number(cost)||totalPartsCost).toLocaleString()}`,
    }]);

    setSaving(false);
    onUpdate();
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    await dbu.from("maintenance").update({
      status:          "In Progress",
      parts_used:      parts,
      remarks,
      cost:            Number(cost) || totalPartsCost,
      completion_date: completionDate || null,
    }).eq("id", record.id);
    setSaving(false);
    onUpdate();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between ${
          record.maintenance_type === "Breakdown" ? "bg-red-700" : "bg-slate-900"
        }`}>
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-0.5">
              Job Card — {record.job_order_no || `JO-${record.id?.slice(0,6).toUpperCase()}`}
            </p>
            <h2 className="text-lg font-bold text-white">
              {record.equipment_code} — {record.maintenance_type}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Equipment info */}
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Fleet No.",    record.equipment_code],
              ["Description",  record.equipment_name || "—"],
              ["Type",         record.maintenance_type],
              ["Reported By",  record.reported_by],
              ["Reported Date",new Date(record.reported_date || record.created_at).toLocaleDateString("en-GB")],
              ["Current Status", record.status],
            ].map(([l,v]) => (
              <div key={l}>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{l}</p>
                <p className="font-semibold text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Issue */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Fault / Issue</p>
            <p className="text-slate-800 text-sm">{record.issue || "—"}</p>
          </div>

          {/* Technician + Completion */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Technician
              </label>
              <div className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-700">
                {record.technician || "Not assigned"}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Completion Date
              </label>
              <input type="date" className={iCls} value={completionDate}
                onChange={e => setCompletionDate(e.target.value)} />
            </div>
          </div>

          {/* Parts Used */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Parts / Materials Used
            </p>

            {/* Add part row */}
            {isEngineer && (
              <div className="grid grid-cols-5 gap-2 mb-3">
                <input className={iCls + " col-span-2"} placeholder="Part name"
                  value={newPart.name} onChange={e => setNewPart(p=>({...p,name:e.target.value}))} />
                <input className={iCls} type="number" placeholder="Qty"
                  value={newPart.qty||""} onChange={e => setNewPart(p=>({...p,qty:Number(e.target.value)||1}))} />
                <input className={iCls} placeholder="Unit"
                  value={newPart.unit} onChange={e => setNewPart(p=>({...p,unit:e.target.value}))} />
                <input className={iCls} type="number" placeholder="₦ Cost"
                  value={newPart.cost||""} onChange={e => setNewPart(p=>({...p,cost:Number(e.target.value)||0}))} />
                <button onClick={addPart}
                  className="col-span-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900">
                  + Add Part
                </button>
              </div>
            )}

            {parts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-xl">
                No parts recorded yet.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Part Name","Qty","Unit","Unit Cost","Total",""].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parts.map((p:any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-slate-600">{p.qty}</td>
                        <td className="px-4 py-3 text-slate-500">{p.unit||"—"}</td>
                        <td className="px-4 py-3 text-slate-600">₦{Number(p.cost).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">₦{(p.qty*p.cost).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {isEngineer && (
                            <button onClick={() => removePart(p.id)}
                              className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-700">Parts Total:</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">₦{totalPartsCost.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total cost + Remarks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Total Job Cost (₦)
              </label>
              <input type="number" className={iCls} value={cost||""}
                onChange={e => setCost(Number(e.target.value)||0)}
                placeholder={`Auto: ₦${totalPartsCost.toLocaleString()}`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Remarks
              </label>
              <input className={iCls} value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Additional notes..." />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
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
              <button onClick={handleApprove} disabled={saving}
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
// NEW BREAKDOWN MODAL
// ─────────────────────────────────────────────────────────────
function NewBreakdownModal({ open, onClose, onSave, profile }: {
  open: boolean; onClose: () => void;
  onSave: () => void; profile: any;
}) {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [eqSearch,  setEqSearch]  = useState("");
  const [showDrop,  setShowDrop]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    equipment_id:     "",
    equipment_code:   "",
    equipment_name:   "",
    maintenance_type: "Breakdown",
    issue:            "",
    reported_by:      profile?.full_name || "",
    reported_date:    new Date().toISOString().slice(0,10),
    technician:       "",
    // eslint-disable-next-line react-hooks/purity
    job_order_no:     `JO-${Date.now().toString().slice(-6)}`,
    repair_yard:      "",
  });

  useEffect(() => {
    if (!open) return;
    async function load() {
      const { data } = await dbu.from("equipment")
        .select("id,fleet_number,name,category,site,operational_status")
        .neq("operational_status","Scrapped")
        .order("fleet_number");
      setEquipment(data || []);
    }
    load();
  }, [open]);

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  function selectEquipment(eq: any) {
    set("equipment_id",   eq.id);
    set("equipment_code", eq.fleet_number);
    set("equipment_name", eq.name || "");
    setEqSearch(eq.fleet_number);
    setShowDrop(false);
  }

  const filtered = equipment.filter((e:any) =>
    !eqSearch ||
    e.fleet_number.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (e.name||"").toLowerCase().includes(eqSearch.toLowerCase())
  ).slice(0,15);

  async function handleSubmit() {
    if (!form.equipment_id || !form.issue) return;
    setSaving(true);

    // Save maintenance record
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
      parts_used:       [],
      cost:             0,
    }]);

    // Update equipment status to Under Repair
    await dbu.from("equipment").update({
      operational_status: "Under Repair",
    }).eq("id", form.equipment_id);

    // Write history
    await dbu.from("equipment_history").insert([{
      equipment_id: form.equipment_id,
      fleet_number: form.equipment_code,
      action_type:  "Maintenance Started",
      from_status:  "Working",
      to_status:    "Under Repair",
      performed_by: form.reported_by,
      remarks:      `${form.maintenance_type}: ${form.issue}. Job Order: ${form.job_order_no}`,
    }]);

    setSaving(false);
    onSave();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-red-700 flex items-center justify-between">
          <div>
            <p className="text-red-300 text-xs font-bold uppercase tracking-widest mb-0.5">New Record</p>
            <h2 className="text-lg font-bold text-white">Log Breakdown / Maintenance</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Equipment search */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Equipment <span className="text-red-400">*</span>
            </label>
            <input className={iCls} placeholder="Search fleet number or name..."
              value={eqSearch}
              onChange={e => { setEqSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {filtered.map((e:any) => (
                  <button key={e.id} onClick={() => selectEquipment(e)}
                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0">
                    <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                    <span className="text-slate-600 text-sm ml-2">{e.name}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      e.operational_status === "Working" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>{e.operational_status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
              <select className={iCls} value={form.maintenance_type} onChange={e => set("maintenance_type",e.target.value)}>
                <option value="Breakdown">Breakdown</option>
                <option value="Scheduled">Scheduled Service</option>
                <option value="Preventive">Preventive Maintenance</option>
                <option value="Third Party">Third Party</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Job Order No.</label>
              <input className={iCls} value={form.job_order_no} onChange={e => set("job_order_no",e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Fault / Issue <span className="text-red-400">*</span>
            </label>
            <textarea className={`${iCls} h-20 resize-none`} value={form.issue}
              onChange={e => set("issue",e.target.value)}
              placeholder="Describe the fault or maintenance required..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Reported By</label>
              <input className={iCls} value={form.reported_by} onChange={e => set("reported_by",e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date Reported</label>
              <input type="date" className={iCls} value={form.reported_date} onChange={e => set("reported_date",e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Assigned Technician</label>
            <input className={iCls} value={form.technician} onChange={e => set("technician",e.target.value)}
              placeholder="Technician name (can be assigned later)" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.equipment_id || !form.issue}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
            {saving ? "Logging..." : "Log Breakdown →"}
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
  const [profile,    setProfile]    = useState<any>(null);
  const [records,    setRecords]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [jobCard,    setJobCard]    = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    loadProfile();
    fetchRecords();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await dbu.auth.getUser();
    if (!user) return;
    const { data } = await dbu.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
  }

  async function fetchRecords() {
    setLoading(true);
    const { data } = await dbu.from("maintenance")
      .select("*")
      .order("created_at", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }

  const filtered = records.filter((r:any) => {
    const q = search.toLowerCase();
    return (
      (!q || r.equipment_code.toLowerCase().includes(q) || (r.issue||"").toLowerCase().includes(q)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterType   || r.maintenance_type === filterType)
    );
  });

  const stats = {
    total:      records.length,
    pending:    records.filter(r => r.status === "Pending").length,
    inProgress: records.filter(r => r.status === "In Progress").length,
    completed:  records.filter(r => r.status === "Completed").length,
    totalCost:  records.filter(r => r.status === "Completed")
                       .reduce((s,r) => s + (r.cost||0), 0),
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Job orders, breakdowns, repairs and service records.
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 shadow-sm shrink-0">
          ⚠️ Log Breakdown
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm opacity-70 mt-1">Total Jobs</p>
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
          <p className="text-xl font-bold text-slate-800">₦{stats.totalCost.toLocaleString("en-NG")}</p>
          <p className="text-sm text-slate-500 mt-1">Total Repair Cost</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search fleet no. or issue..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {["Pending","In Progress","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {["Breakdown","Scheduled","Preventive","Third Party"].map(t => <option key={t}>{t}</option>)}
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
          <table className="w-full text-sm min-w-225">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Job Order","Fleet No.","Type","Issue","Reported","Technician",
                  "Status","Cost","Actions"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">
                  No maintenance records yet. Click &quot;Log Breakdown&quot; to start.
                </td></tr>
              ) : filtered.map((r:any) => (
                <tr key={r.id} className="hover:bg-amber-50/30 group transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">
                    {r.job_order_no || `JO-${r.id?.slice(0,6).toUpperCase()}`}
                  </td>
                  <td className="px-5 py-4 font-bold text-amber-600 font-mono text-xs">{r.equipment_code}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_STYLE[r.maintenance_type]||"bg-slate-100 text-slate-600"}`}>
                      {r.maintenance_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-700 text-xs max-w-50 truncate">{r.issue}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(r.reported_date||r.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs">{r.technician||"—"}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status]||""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs">
                    {r.cost ? `₦${Number(r.cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setJobCard(r)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 whitespace-nowrap">
                      View Job Card
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewBreakdownModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={fetchRecords}
        profile={profile}
      />

      {jobCard && (
        <JobCardModal
          record={jobCard}
          onClose={() => setJobCard(null)}
          onUpdate={fetchRecords}
          profile={profile}
        />
      )}
    </div>
  );
}
