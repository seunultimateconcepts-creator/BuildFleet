/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect } from "react";
import { dbu } from "@/lib/db";
import { printTransfer } from "@/lib/transfer-print";
import { useTransfers } from "@/hooks/use-transfers";
import { useEquipment } from "@/hooks/use-equipment";
import { useSites } from "@/hooks/use-sites";
import { useAuth } from "@/hooks/use-auth";
import type { Transfer, TransferType } from "@/types";

const STATUS_STYLE: Record<string, string> = {
  "Pending Approval": "bg-orange-100 text-orange-700",
  "Pending":          "bg-amber-100  text-amber-700",
  "In Transit":       "bg-blue-100   text-blue-700",
  "Received":         "bg-emerald-100 text-emerald-700",
  "Rejected":         "bg-red-100    text-red-600",
  "Cancelled":        "bg-slate-100  text-slate-500",
};

const TRANSPORT_MODES  = ["Own Power","Low Loader","Flatbed Truck","Crane Truck","Other"];
const FIRE_EXT_OPTIONS = ["Present","Not Present","Expired","N/A"];
const CONDITION_OPTIONS = ["Very Good","Good","Fair-Good","Fair","Poor-Fair","Poor"];

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

function F({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionHead({ title, sub, color = "slate" }: {
  title: string; sub: string; color?: "slate"|"blue"|"emerald";
}) {
  const colors = { slate:"bg-slate-800 text-white", blue:"bg-blue-600 text-white", emerald:"bg-emerald-600 text-white" };
  return (
    <div className={`${colors[color]} rounded-xl px-4 py-3 col-span-2`}>
      <p className="font-bold text-sm">{title}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

function EquipmentSearch({ equipment, value, onChange }: {
  equipment: any[]; value: string; onChange: (id: string, equip: any) => void;
}) {
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = equipment
    .filter(e => e.operational_status !== "Scrapped")
    .filter(e => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        e.fleet_number.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.make.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.reg_no || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 20);

  function select(e: any) {
    setSelected(e); setQuery(""); setOpen(false); onChange(e.id, e);
  }

  function clear() {
    setSelected(null); setQuery(""); onChange("", null);
  }

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-amber-700 font-mono text-sm">{selected.fleet_number}</p>
            <p className="text-slate-700 text-sm font-medium">{selected.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">{selected.make} {selected.model} · {selected.site}</p>
          </div>
          <button onClick={clear} className="text-slate-400 hover:text-red-500 text-lg leading-none shrink-0">×</button>
        </div>
      ) : (
        <>
          <input placeholder="Type fleet number, name, make or category..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className={iCls} />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  {query ? "No equipment matches your search." : "Start typing to search equipment..."}
                </div>
              ) : filtered.map(e => (
                <button key={e.id} onClick={() => select(e)}
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          e.operational_status === "Working" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>{e.operational_status}</span>
                      </div>
                      <p className="text-slate-700 text-sm font-medium truncate">{e.name}</p>
                      <p className="text-slate-400 text-xs">{e.make} {e.model} · {e.category}</p>
                    </div>
                    <p className="text-slate-400 text-xs text-right shrink-0 max-w-30 truncate">{e.site}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 20 && (
                <div className="px-4 py-2 text-center text-xs text-slate-400">Showing first 20 — type more to narrow down</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReceiptModal({ transfer, profile, onClose, onConfirm }: {
  transfer: Transfer; profile: any; onClose: () => void;
  onConfirm: (data: Partial<Transfer>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    receival_date: new Date().toISOString().slice(0, 16),
    receiving_officer: profile?.full_name || "",
    receiving_plant_engineer: "",
    equipment_condition_receipt: "", history_file_receipt: false,
    speedometer_receipt: 0, fire_extinguisher_receipt: "", receipt_remarks: "",
  });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  async function handleConfirm() {
    if (!form.receiving_officer || !form.receiving_plant_engineer) {
      alert("Please fill receiving officer and plant engineer."); return;
    }
    setSaving(true);
    await onConfirm(form);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-6 py-5 bg-emerald-700 flex items-center justify-between">
          <div>
            <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-0.5">Receiving Area</p>
            <h2 className="text-lg font-bold text-white">Confirm Equipment Receipt</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-sm">
            <p className="font-bold text-slate-800">{transfer.equipment_code} — {transfer.equipment_name}</p>
            <p className="text-slate-500 mt-0.5">From: {transfer.from_site} → To: {transfer.to_site}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Receival Date" required>
              <input className={iCls} type="datetime-local" value={form.receival_date}
                onChange={e => set("receival_date", e.target.value)} />
            </F>
            <F label="Equipment Condition">
              <select className={iCls} value={form.equipment_condition_receipt}
                onChange={e => set("equipment_condition_receipt", e.target.value)}>
                <option value="">Select...</option>
                {CONDITION_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Receiving Officer" required>
              <input className={iCls} value={form.receiving_officer}
                onChange={e => set("receiving_officer", e.target.value)} />
            </F>
            <F label="Plant Engineer" required>
              <input className={iCls} value={form.receiving_plant_engineer}
                onChange={e => set("receiving_plant_engineer", e.target.value)} />
            </F>
            <F label="Speedometer / Hour Reading">
              <input className={iCls} type="number" value={form.speedometer_receipt || ""}
                onChange={e => set("speedometer_receipt", parseFloat(e.target.value) || 0)} />
            </F>
            <F label="Fire Extinguisher">
              <select className={iCls} value={form.fire_extinguisher_receipt}
                onChange={e => set("fire_extinguisher_receipt", e.target.value)}>
                <option value="">Select...</option>
                {FIRE_EXT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
          </div>
          <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={form.history_file_receipt}
              onChange={e => set("history_file_receipt", e.target.checked)}
              className="w-4 h-4 accent-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Accompanying History File received</span>
          </label>
          <F label="Remarks">
            <textarea className={`${iCls} h-20 resize-none`} value={form.receipt_remarks}
              onChange={e => set("receipt_remarks", e.target.value)} />
          </F>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Confirming..." : "Confirm Receipt ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW TRANSFER MODAL
// ─────────────────────────────────────────────────────────────
function NewTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createTransfer } = useTransfers();
  const { equipment }      = useEquipment();
  const { sites }          = useSites(); // filtered by role — for from_site context
  const { profile }        = useAuth();
  const [allSites, setAllSites] = useState<any[]>([]); // ALL sites — for to_site dropdown

  // Always fetch ALL sites for the destination dropdown
  // regardless of the user's role restriction
  useEffect(() => {
    if (!open) return;
    dbu.from("sites")
      .select("id,name,code,cost_code")
      .order("code", { ascending: true })
      .then(({ data }: { data: any[] | null }) => setAllSites(data || []));
  }, [open]);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<any>(null);

  const [form, setForm] = useState({
    equipment_id: "", transfer_type: "Temporary Release" as TransferType,
    from_site: "", from_cost_code: "",
    transfer_date: new Date().toISOString().slice(0, 16),
    expected_arrival_date: "",
    dispatching_officer: "",
    dispatching_plant_engineer: "",
    to_site: "", to_cost_code: "",
    equipment_condition_dispatch: "", transport_mode: "",
    history_file_dispatch: false, accompanying_operator: "",
    speedometer_dispatch: 0, fire_extinguisher_dispatch: "",
    fleet_attachments: "", dispatch_remarks: "",
  });

  // Auto-fill dispatching officer when profile loads or modal opens
  useEffect(() => {
    if (profile?.full_name && open) {
      setForm(p => ({ ...p, dispatching_officer: p.dispatching_officer || profile.full_name }));
    }
  }, [profile, open]);

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })); }

  function handleEquipmentSelect(id: string, equip: any) {
    set("equipment_id", id);
    if (equip) {
      set("from_site", equip.site || "");
      const siteRecord = allSites.find(s => s.name === equip.site);
      if (siteRecord) set("from_cost_code", siteRecord.cost_code || siteRecord.code || "");
    }
    setSelectedEquip(equip);
  }

  function handleToSiteChange(siteName: string) {
    set("to_site", siteName);
    const siteRecord = allSites.find(s => s.name === siteName);
    if (siteRecord) set("to_cost_code", siteRecord.cost_code || siteRecord.code || "");
  }

  async function handleSubmit() {
    if (!form.equipment_id || !form.to_site ||
        !form.dispatching_officer || !form.dispatching_plant_engineer) {
      setError("Please fill all required fields."); return;
    }
    if (form.from_site === form.to_site) {
      setError("Destination cannot be the same as current site."); return;
    }
    setSaving(true); setError(null);

    // Determine who needs to approve based on from_site type
    const fromSiteRecord = allSites.find((s: any) => s.name === form.from_site);
    const isWorkshop = fromSiteRecord?.site_type?.includes("Workshop");

    // Find approver — plant_engineer for workshops, site_supervisor for projects
    const approverRole = isWorkshop ? "plant_engineer" : "site_supervisor";
    const { data: approvers } = await dbu
      .from("profiles")
      .select("id,full_name,email,assigned_sites,roles")
      .contains("roles", [approverRole]);

    // Find approver assigned to from_site
    const approver = approvers?.find((p: any) =>
      (p.assigned_sites || []).includes(form.from_site)
    ) || approvers?.[0]; // fallback to first approver of that role

    const result = await createTransfer({
      equipment_id: form.equipment_id,
      equipment_code: selectedEquip?.fleet_number || "",
      equipment_name: selectedEquip?.name || "",
      machine_type: selectedEquip?.category || "",
      machine_make: selectedEquip?.make || "",
      machine_model: selectedEquip?.model || "",
      reg_no: selectedEquip?.reg_no || "",
      transfer_type: form.transfer_type,
      from_site: form.from_site, from_cost_code: form.from_cost_code,
      transfer_date: form.transfer_date,
      expected_arrival_date: form.expected_arrival_date || undefined,
      dispatching_officer: form.dispatching_officer,
      dispatching_plant_engineer: form.dispatching_plant_engineer,
      to_site: form.to_site, to_cost_code: form.to_cost_code,
      equipment_condition_dispatch: form.equipment_condition_dispatch,
      transport_mode: form.transport_mode,
      history_file_dispatch: form.history_file_dispatch,
      accompanying_operator: form.accompanying_operator,
      speedometer_dispatch: form.speedometer_dispatch,
      fire_extinguisher_dispatch: form.fire_extinguisher_dispatch,
      fleet_attachments: form.fleet_attachments,
      dispatch_remarks: form.dispatch_remarks,
      // Approval fields
      approval_status: "Pending Approval",
      initiated_by: profile?.full_name || "",
      initiated_by_email: profile?.email || "",
    } as any);

    if (!result.success) { setError(result.error || "Transfer failed."); setSaving(false); return; }

    // Notify approver (in-app + email)
    if (approver) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: approver.id,
          to_email: approver.email,
          to_name: approver.full_name,
          title: "Transfer Approval Required",
          message: `${form.dispatching_officer} initiated a transfer of ${selectedEquip?.fleet_number} (${selectedEquip?.name}) from ${form.from_site} to ${form.to_site}. Please review and approve or reject.`,
          type: "warning",
          link: "/transfer",
          send_email: true,
        }),
      }).catch(() => null);
    }

    setSaving(false);
    onClose();
    printTransfer({
      ...(result.data || {}),
      equipment_code: selectedEquip?.fleet_number || "",
      equipment_name: selectedEquip?.name || "",
      machine_make: selectedEquip?.make || "",
      machine_model: selectedEquip?.model || "",
      reg_no: selectedEquip?.reg_no || "",
      machine_type: selectedEquip?.category || "",
      transfer_type: form.transfer_type,
      from_site: form.from_site, from_cost_code: form.from_cost_code,
      to_site: form.to_site, to_cost_code: form.to_cost_code,
      transfer_date: form.transfer_date,
      expected_arrival_date: form.expected_arrival_date,
      dispatching_officer: form.dispatching_officer,
      dispatching_plant_engineer: form.dispatching_plant_engineer,
      transport_mode: form.transport_mode,
      speedometer_dispatch: form.speedometer_dispatch,
      fire_extinguisher_dispatch: form.fire_extinguisher_dispatch,
      history_file_dispatch: form.history_file_dispatch,
      fleet_attachments: form.fleet_attachments,
      dispatch_remarks: form.dispatch_remarks,
      status: "Pending Approval",
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl my-6 overflow-hidden">
        <div className="px-8 py-5 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-0.5">Equipment Transfer Form</p>
            <h2 className="text-xl font-bold text-white">New Transfer — Dispatching Area</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">×</button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <SectionHead title="Equipment Details" sub="Search by fleet number, name, make or category" />
            <div className="col-span-2">
              <F label="Select Equipment" required>
                <EquipmentSearch equipment={equipment} value={form.equipment_id} onChange={handleEquipmentSelect} />
              </F>
            </div>
            {selectedEquip && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[
                    ["Fleet No.", selectedEquip.fleet_number],
                    ["Category", selectedEquip.category],
                    ["Make / Model", `${selectedEquip.make} ${selectedEquip.model}`],
                    ["Current Site", selectedEquip.site],
                    ["Reg. No.", selectedEquip.reg_no || "—"],
                    ["Condition", selectedEquip.assessment],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-slate-400">{l}</p><p className="font-semibold text-slate-800">{v}</p></div>
                  ))}
                </div>
              </div>
            )}
            <F label="Transfer Type" required>
              <select className={iCls} value={form.transfer_type} onChange={e => set("transfer_type", e.target.value)}>
                <option value="Temporary Release">Temporary Release</option>
                <option value="Final Release">Final Release</option>
              </select>
            </F>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <SectionHead title="Dispatching Area" sub="Current location and transfer details" />
            <F label="From Site" required>
              <input className={`${iCls} bg-slate-50 text-slate-500`} value={form.from_site} readOnly />
            </F>
            <F label="From Cost Code">
              <input className={iCls} value={form.from_cost_code} onChange={e => set("from_cost_code", e.target.value)} />
            </F>
            <F label="Transfer Date" required>
              <input className={iCls} type="datetime-local" value={form.transfer_date}
                onChange={e => set("transfer_date", e.target.value)} />
            </F>
            <F label="Expected Arrival Date">
              <input className={iCls} type="datetime-local" value={form.expected_arrival_date}
                onChange={e => set("expected_arrival_date", e.target.value)} />
            </F>
            <F label="Dispatching Officer" required>
              <input className={iCls} value={form.dispatching_officer}
                onChange={e => set("dispatching_officer", e.target.value)} />
            </F>
            <F label="Plant Engineer" required>
              <input className={iCls} value={form.dispatching_plant_engineer}
                onChange={e => set("dispatching_plant_engineer", e.target.value)} />
            </F>
            <F label="Equipment Condition">
              <select className={iCls} value={form.equipment_condition_dispatch}
                onChange={e => set("equipment_condition_dispatch", e.target.value)}>
                <option value="">Select...</option>
                {CONDITION_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Transport Mode">
              <select className={iCls} value={form.transport_mode} onChange={e => set("transport_mode", e.target.value)}>
                <option value="">Select...</option>
                {TRANSPORT_MODES.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Accompanying Operator / Driver">
              <input className={iCls} value={form.accompanying_operator}
                onChange={e => set("accompanying_operator", e.target.value)} />
            </F>
            <F label="Speedometer / Hour Reading">
              <input className={iCls} type="number" value={form.speedometer_dispatch || ""}
                onChange={e => set("speedometer_dispatch", parseFloat(e.target.value) || 0)} />
            </F>
            <F label="Fire Extinguisher">
              <select className={iCls} value={form.fire_extinguisher_dispatch}
                onChange={e => set("fire_extinguisher_dispatch", e.target.value)}>
                <option value="">Select...</option>
                {FIRE_EXT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F label="Fleet Attachments">
              <input className={iCls} value={form.fleet_attachments}
                onChange={e => set("fleet_attachments", e.target.value)}
                placeholder="e.g. Bucket, Ripper, Blade" />
            </F>
            <label className="col-span-2 flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={form.history_file_dispatch}
                onChange={e => set("history_file_dispatch", e.target.checked)}
                className="w-4 h-4 accent-amber-500" />
              <span className="text-sm font-medium text-slate-700">Accompanying History File / Tyre Pass included</span>
            </label>
            <div className="col-span-2">
              <F label="Dispatch Remarks">
                <textarea className={`${iCls} h-20 resize-none`} value={form.dispatch_remarks}
                  onChange={e => set("dispatch_remarks", e.target.value)}
                  placeholder="Please note that the above fleet has been transferred from our site / yard as follows..." />
              </F>
            </div>
          </div>

          {/* Receiving Area — uses allSites (unfiltered) */}
          <div className="grid grid-cols-2 gap-5">
            <SectionHead title="Receiving Area" sub="Destination site — all 117 sites available" color="blue" />
            <F label="To Site" required>
              <select className={iCls} value={form.to_site} onChange={e => handleToSiteChange(e.target.value)}>
                <option value="">Select destination site...</option>
                {allSites
                  .filter(s => s.name !== form.from_site)
                  .map(s => (
                    <option key={s.id || s.code} value={s.name}>
                      {s.code} — {s.name}
                    </option>
                  ))}
              </select>
            </F>
            <F label="To Cost Code">
              <input className={`${iCls} bg-slate-50`} value={form.to_cost_code}
                onChange={e => set("to_cost_code", e.target.value)}
                placeholder="Auto-filled from site" />
            </F>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">⚠️ {error}</div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
            {saving ? "Submitting..." : "Submit Transfer →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TRANSFER HISTORY TAB
// ─────────────────────────────────────────────────────────────
function TransferHistoryTab() {
  const { profile, hasFullAccess, isClerk, isSupervisor } = useAuth();
  const [allTransfers, setAllTransfers] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterSite,   setFilterSite]   = useState("");
  const [filterYear,   setFilterYear]   = useState("");
  const [selected,     setSelected]     = useState<any>(null);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  async function fetchAll() {
    setLoading(true);
    const isRestricted = (isClerk || isSupervisor) && !hasFullAccess;
    const assignedSites = profile?.assigned_sites || [];

    let q = dbu.from("transfers").select("*").order("created_at", { ascending: false });
    if (isRestricted && assignedSites.length > 0) {
      q = q.or(`from_site.in.(${assignedSites.map((s:string) => `"${s}"`).join(",")}),to_site.in.(${assignedSites.map((s:string) => `"${s}"`).join(",")})`);
    }
    const { data } = await q;
    setAllTransfers(data || []);
    setLoading(false);
  }

  const filtered = allTransfers.filter((t: any) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      t.equipment_code.toLowerCase().includes(q) ||
      (t.equipment_name||"").toLowerCase().includes(q) ||
      t.from_site.toLowerCase().includes(q) ||
      t.to_site.toLowerCase().includes(q) ||
      (t.dispatching_officer||"").toLowerCase().includes(q);
    const matchSite = !filterSite || t.from_site === filterSite || t.to_site === filterSite;
    const matchYear = !filterYear || new Date(t.transfer_date).getFullYear().toString() === filterYear;
    return matchQ && matchSite && matchYear;
  });

  const allSites = [...new Set([
    ...allTransfers.map(t => t.from_site),
    ...allTransfers.map(t => t.to_site),
  ])].filter(Boolean).sort() as string[];

  const years = [...new Set(
    allTransfers.map(t => new Date(t.transfer_date).getFullYear().toString())
  )].sort((a,b) => Number(b)-Number(a));

  const fmt = (d: string) => d
    ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search fleet no., site, officer..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={iCls + " lg:col-span-2"} />
          <select className={iCls} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {allSites.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <p className="text-sm text-slate-500 mt-3">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {allTransfers.length} records
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm min-w-225">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {["Fleet No.","Equipment","Transfer Type","From","To","Date","Dispatched By","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">Loading transfer history...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">No transfers match your search.</td></tr>
              ) : filtered.map((t: any) => (
                <tr key={t.id} className="hover:bg-amber-50/30 group transition-colors">
                  <td className="px-4 py-3 font-bold text-amber-600 font-mono text-xs">{t.equipment_code}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-35 truncate">{t.equipment_name||"—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                      t.transfer_type === "Final Release" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    }`}>{t.transfer_type}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-32 truncate">{t.from_site}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-32 truncate">{t.to_site}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(t.transfer_date)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{t.dispatching_officer}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[t.status]||""}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelected(t)}
                        className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">Details</button>
                      <button onClick={() => printTransfer(t)}
                        className="px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs hover:bg-amber-200">🖨 Print</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-6 overflow-hidden">
            <div className="px-6 py-5 bg-slate-900 flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Transfer Record</p>
                <h2 className="text-lg font-bold text-white">{selected.equipment_code} — {selected.equipment_name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Equipment</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[["Fleet No.",selected.equipment_code],["Description",selected.equipment_name||"—"],["Category",selected.machine_type||"—"],["Make",selected.machine_make||"—"],["Model",selected.machine_model||"—"],["Reg. No.",selected.reg_no||"—"]].map(([l,v])=>(
                    <div key={l}><p className="text-slate-400">{l}</p><p className="font-semibold text-slate-800 mt-0.5">{v}</p></div>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Dispatching Area</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[["From Site",selected.from_site],["Cost Code",selected.from_cost_code||"—"],["Transfer Date",fmt(selected.transfer_date)],["Expected Arrival",fmt(selected.expected_arrival_date)],["Transport Mode",selected.transport_mode||"—"],["Condition",selected.equipment_condition_dispatch||"—"],["Dispatching Officer",selected.dispatching_officer],["Plant Engineer",selected.dispatching_plant_engineer||"—"],["Speedometer",selected.speedometer_dispatch||0],["Fire Ext.",selected.fire_extinguisher_dispatch||"—"],["History File",selected.history_file_dispatch?"Included":"Not Included"],["Attachments",selected.fleet_attachments||"—"]].map(([l,v])=>(
                    <div key={l}><p className="text-slate-400">{l}</p><p className="font-semibold text-slate-800 mt-0.5">{v}</p></div>
                  ))}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Receiving Area</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[["To Site",selected.to_site],["Cost Code",selected.to_cost_code||"—"],["Status",selected.status],["Receival Date",fmt(selected.receival_date)],["Condition",selected.equipment_condition_receipt||"—"],["Receiving Officer",selected.receiving_officer||"—"],["Plant Engineer",selected.receiving_plant_engineer||"—"],["Speedometer",selected.speedometer_receipt||"—"]].map(([l,v])=>(
                    <div key={l}><p className="text-slate-400">{l}</p><p className="font-semibold text-slate-800 mt-0.5">{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button onClick={() => setSelected(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">Close</button>
              <button onClick={() => printTransfer(selected)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">🖨 Print Transfer Form</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransferPage() {
  const { transfers, loading, updateStatus, confirmReceipt } = useTransfers();
  const { profile, canTransfer } = useAuth();

  const [tab,           setTab]           = useState<'register'|'history'>('register');
  const [modal,         setModal]         = useState(false);
  const [receiptItem,   setReceiptItem]   = useState<Transfer | null>(null);
  const [filterStatus,  setFilterStatus]  = useState("");
  const [search,        setSearch]        = useState("");
  const [approvalModal, setApprovalModal] = useState<Transfer | null>(null);
  const [approvalNote,  setApprovalNote]  = useState("");
  const [approving,     setApproving]     = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showBell,      setShowBell]      = useState(false);

  const roles: string[] = profile?.roles || [];
  const isApprover = roles.some(r =>
    ["plant_engineer","site_supervisor","plant_manager","plant_director","super_admin"].includes(r)
  );

  // Load unread notifications for current user
  useEffect(() => {
    if (!profile?.id) return;
    dbu.from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => setNotifications(data || []));
  }, [profile]);

  async function markAllRead() {
    if (!profile?.id) return;
    await dbu.from("notifications").update({ read: true }).eq("user_id", profile.id);
    setNotifications([]);
  }

  async function handleApprove(transfer: Transfer) {
    setApproving(true);
    // Update transfer
    await dbu.from("transfers").update({
      approval_status: "Approved",
      status: "Pending",
      approved_by: profile?.full_name,
      approved_at: new Date().toISOString(),
      approval_note: approvalNote || null,
    }).eq("id", transfer.id);

    // Notify initiator
    if ((transfer as any).initiated_by_email) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: (transfer as any).initiated_by_email,
          to_name: (transfer as any).initiated_by,
          title: "Transfer Approved ✅",
          message: `Your transfer of ${transfer.equipment_code} from ${transfer.from_site} to ${transfer.to_site} has been approved by ${profile?.full_name}.`,
          type: "success",
          link: "/transfer",
          send_email: true,
        }),
      }).catch(() => null);
    }

    setApproving(false);
    setApprovalModal(null);
    setApprovalNote("");
    window.location.reload();
  }

  async function handleReject(transfer: Transfer) {
    if (!approvalNote.trim()) {
      alert("Please add a reason for rejection."); return;
    }
    setApproving(true);
    await dbu.from("transfers").update({
      approval_status: "Rejected",
      status: "Cancelled",
      approved_by: profile?.full_name,
      approved_at: new Date().toISOString(),
      approval_note: approvalNote,
    }).eq("id", transfer.id);

    // Notify initiator of rejection
    if ((transfer as any).initiated_by_email) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: (transfer as any).initiated_by_email,
          to_name: (transfer as any).initiated_by,
          title: "Transfer Rejected ❌",
          message: `Your transfer of ${transfer.equipment_code} from ${transfer.from_site} to ${transfer.to_site} was rejected by ${profile?.full_name}. Reason: ${approvalNote}`,
          type: "error",
          link: "/transfer",
          send_email: true,
        }),
      }).catch(() => null);
    }

    setApproving(false);
    setApprovalModal(null);
    setApprovalNote("");
    window.location.reload();
  }

  const filtered = transfers.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      t.equipment_code.toLowerCase().includes(q) ||
      t.equipment_name.toLowerCase().includes(q) ||
      t.from_site.toLowerCase().includes(q) ||
      t.to_site.toLowerCase().includes(q);
    return matchQ && (!filterStatus || t.status === filterStatus);
  });

  const counts = {
    total:           transfers.length,
    pendingApproval: transfers.filter(t => (t as any).approval_status === "Pending Approval").length,
    inTransit:       transfers.filter(t => t.status === "In Transit").length,
    received:        transfers.filter(t => t.status === "Received").length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transfers</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage equipment movement between sites.</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0 items-center">

          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => setShowBell(b => !b)}
              className="relative p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showBell && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="font-bold text-slate-800 text-sm">Notifications</p>
                  {notifications.length > 0 && (
                    <button onClick={markAllRead}
                      className="text-xs text-amber-500 hover:text-amber-600 font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-slate-400 text-sm">No new notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 ${
                      n.type === "warning" ? "bg-amber-50" :
                      n.type === "success" ? "bg-emerald-50" :
                      n.type === "error"   ? "bg-red-50" : "bg-white"
                    }`}>
                      <p className="font-semibold text-slate-800 text-xs">{n.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-slate-300 text-[10px] mt-1">
                        {new Date(n.created_at).toLocaleDateString("en-GB",{
                          day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="border border-slate-200 bg-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">↓ Export</button>
          {canTransfer && (
            <button onClick={() => setModal(true)}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm shadow-amber-200">
              + New Transfer
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([["register","📋 Transfer Register"],["history","📜 Transfer History"]] as const).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>{label}</button>
        ))}
      </div>

      {tab === "history" ? <TransferHistoryTab /> : <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:"Total Transfers",   value:counts.total,           bg:"bg-slate-900 text-white" },
            { label:"Pending Approval",  value:counts.pendingApproval, bg:"bg-orange-500 text-white" },
            { label:"In Transit",        value:counts.inTransit,       bg:"bg-blue-500 text-white" },
            { label:"Received",          value:counts.received,        bg:"bg-emerald-500 text-white" },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
              <p className="text-3xl font-bold">{k.value}</p>
              <p className="text-sm opacity-70 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Approval needed banner for approvers */}
        {isApprover && counts.pendingApproval > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold text-orange-800 text-sm">
                {counts.pendingApproval} transfer{counts.pendingApproval > 1 ? "s" : ""} waiting for your approval
              </p>
              <p className="text-orange-600 text-xs mt-0.5">
                Review and approve or reject before equipment can move.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <input placeholder="Search equipment, site..."
              value={search} onChange={e => setSearch(e.target.value)}
              className={iCls + " lg:col-span-2"} />
            <select className={iCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {["Pending Approval","Pending","In Transit","Received","Rejected","Cancelled"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-lg">Transfer Register</h2>
            <p className="text-slate-400 text-sm">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Equipment","Type","From","To","Transfer Date","Dispatched By","Approval","Status","Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">Loading transfers...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400">
                    {transfers.length === 0 ? 'No transfers yet.' : "No transfers match your filters."}
                  </td></tr>
                ) : filtered.map(t => {
                  const isPendingApproval = (t as any).approval_status === "Pending Approval";
                  const isApproved        = (t as any).approval_status === "Approved" || !(t as any).approval_status;
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 group ${isPendingApproval ? "bg-orange-50/30" : ""}`}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 font-mono text-xs">{t.equipment_code}</p>
                        <p className="text-slate-500 text-xs mt-0.5 truncate max-w-35">{t.equipment_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          t.transfer_type === "Final Release" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                        }`}>{t.transfer_type}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs max-w-30 truncate">{t.from_site}</td>
                      <td className="px-5 py-4 text-slate-600 text-xs max-w-30 truncate">{t.to_site}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(t.transfer_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs">{t.dispatching_officer}</td>
                      <td className="px-5 py-4">
                        {isPendingApproval ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            ⏳ Awaiting
                          </span>
                        ) : (t as any).approval_status === "Rejected" ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            ✗ Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            ✓ Approved
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[t.status] || "bg-slate-100 text-slate-500"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">

                          {/* APPROVER ACTIONS */}
                          {isApprover && isPendingApproval && (
                            <button onClick={() => { setApprovalModal(t); setApprovalNote(""); }}
                              className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium whitespace-nowrap">
                              Review
                            </button>
                          )}

                          {/* CONFIRM RECEIPT — only after approval */}
                          {isApproved && (t.status === "Pending" || t.status === "In Transit") && (
                            <button onClick={() => setReceiptItem(t)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium whitespace-nowrap">
                              Confirm Receipt
                            </button>
                          )}

                          {/* IN TRANSIT — only after approval */}
                          {isApproved && t.status === "Pending" && (
                            <button onClick={() => updateStatus(t.id, "In Transit")}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium whitespace-nowrap">
                              In Transit
                            </button>
                          )}

                          {/* CANCEL */}
                          {t.status === "Pending" && canTransfer && (
                            <button onClick={() => updateStatus(t.id, "Cancelled")}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium whitespace-nowrap">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 bg-slate-900">
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-0.5">Transfer Review</p>
              <h3 className="font-bold text-white text-lg">Approve or Reject Transfer</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Equipment</span>
                  <span className="font-bold text-amber-600">{approvalModal.equipment_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">From</span>
                  <span className="font-medium text-slate-700 text-right max-w-48 truncate">{approvalModal.from_site}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">To</span>
                  <span className="font-medium text-slate-700 text-right max-w-48 truncate">{approvalModal.to_site}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Initiated By</span>
                  <span className="font-medium text-slate-700">{(approvalModal as any).initiated_by || approvalModal.dispatching_officer}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Note / Reason (required for rejection)
                </label>
                <textarea
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  placeholder="Add a note or reason..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setApprovalModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-white">
                Cancel
              </button>
              <button onClick={() => handleReject(approvalModal)} disabled={approving}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {approving ? "..." : "✗ Reject"}
              </button>
              <button onClick={() => handleApprove(approvalModal)} disabled={approving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-50">
                {approving ? "..." : "✓ Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      <NewTransferModal open={modal} onClose={() => setModal(false)} />
      {receiptItem && (
        <ReceiptModal
          transfer={receiptItem}
          profile={profile}
          onClose={() => setReceiptItem(null)}
          onConfirm={async (data) => { await confirmReceipt(receiptItem.id, data as any); }}
        />
      )}
    </div>
  );
}