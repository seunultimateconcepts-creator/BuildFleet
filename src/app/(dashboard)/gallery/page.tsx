/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Upload, X, ZoomIn, Trash2, ChevronLeft, ChevronRight, FolderOpen, AlertCircle, CheckCircle } from "lucide-react";

const PHOTO_TYPES = ["General","Commissioning","Before Repair","After Repair","Damage","Site Photo"];

const iCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-[#0F1117] dark:border-[#1E2235] dark:text-white";

// ─────────────────────────────────────────────────────────────
// LIGHTBOX
// ─────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose }: {
  photos: any[]; index: number; onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  function prev() { setCurrent(i => (i - 1 + photos.length) % photos.length); }
  function next() { setCurrent(i => (i + 1) % photos.length); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photo = photos[current];

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white z-10">
        <X size={28}/>
      </button>
      {photos.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10">
            <ChevronLeft size={24}/>
          </button>
          <button onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10">
            <ChevronRight size={24}/>
          </button>
        </>
      )}
      <div onClick={e => e.stopPropagation()} className="max-w-5xl w-full">
        <div className="relative w-full h-[80vh]">
          <Image src={photo.url} alt={photo.caption || photo.fleet_number}
            fill unoptimized className="object-contain rounded-xl" />
        </div>
        <div className="mt-4 text-center">
          <p className="text-white font-bold text-lg">{photo.fleet_number}</p>
          {photo.caption && <p className="text-slate-400 text-sm mt-1">{photo.caption}</p>}
          <p className="text-slate-500 text-xs mt-1">
            {photo.photo_type} · {new Date(photo.created_at).toLocaleDateString("en-GB")}
          </p>
          <p className="text-slate-600 text-xs mt-0.5">{current + 1} of {photos.length}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SINGLE UPLOAD MODAL
// ─────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, onUploaded, preselectedFleet }: {
  open: boolean; onClose: () => void;
  onUploaded: () => void; preselectedFleet?: string;
}) {
  const { profile } = useAuth();
  const fileRef     = useRef<HTMLInputElement>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selected,  setSelected]  = useState(preselectedFleet || "");
  const [files,     setFiles]     = useState<File[]>([]);
  const [previews,  setPreviews]  = useState<string[]>([]);
  const [photoType, setPhotoType] = useState("General");
  const [caption,   setCaption]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState<string|null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name").range(0, 999),
      dbu.from("equipment").select("id,fleet_number,name").range(1000, 1999),
    ]).then(([p1, p2]) => {
      const all = [...(p1.data||[]), ...(p2.data||[])];
      setEquipment(all.filter(e => e?.fleet_number).sort((a, b) =>
        (a.fleet_number||"").localeCompare(b.fleet_number||"")
      ));
    });
    if (preselectedFleet) setSelected(preselectedFleet);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    const arr = Array.from(selectedFiles).filter(f => f.type.startsWith("image/")).slice(0, 20);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleUpload() {
    if (!selected || files.length === 0) { setError("Select equipment and at least one photo."); return; }
    setUploading(true); setError(null); setProgress(0);
    const equip = equipment.find(e => e.fleet_number === selected || e.id === selected);
    if (!equip) { setError("Equipment not found."); setUploading(false); return; }

    let uploaded = 0;
    const results: any[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop();
      const path = `${equip.fleet_number}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await dbu.storage.from("equipment-photos").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); continue; }
      const { data: { publicUrl } } = dbu.storage.from("equipment-photos").getPublicUrl(path);
      results.push({ equipment_id: equip.id, fleet_number: equip.fleet_number, url: publicUrl, caption: caption || null, photo_type: photoType, uploaded_by: profile?.full_name || "User" });
      uploaded++;
      setProgress(Math.round((uploaded / files.length) * 100));
    }
    if (results.length > 0) await dbu.from("equipment_photos").insert(results);
    setUploading(false);
    onUploaded();
    onClose();
    setFiles([]); setPreviews([]); setCaption(""); setProgress(0);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0F1117] rounded-2xl shadow-2xl w-full max-w-2xl my-6">
        <div className="px-7 py-5 bg-slate-900 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">Plant Gallery</p>
            <h2 className="text-lg font-bold text-white">Upload Equipment Photos</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-7 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Equipment <span className="text-red-400">*</span>
            </label>
            <select className={iCls} value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">— Select equipment —</option>
              {equipment.map(e => (
                <option key={e.id} value={e.fleet_number}>{e.fleet_number} — {e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Photo Type</label>
              <select className={iCls} value={photoType} onChange={e => setPhotoType(e.target.value)}>
                {PHOTO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Caption (optional)</label>
              <input className={iCls} value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. After engine overhaul"/>
            </div>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-slate-200 dark:border-[#1E2235] rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/5 transition-colors">
            <Camera size={32} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Click or drag photos here</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — up to 20 photos at once</p>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
              onChange={e => handleFiles(e.target.files)}/>
          </div>
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <Image src={src} alt="" fill unoptimized className="object-cover"/>
                  <button onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Uploading {files.length} photo{files.length > 1 ? "s" : ""}...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
        </div>
        <div className="px-7 py-5 border-t border-slate-100 dark:border-[#1E2235] flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E2235] text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || files.length === 0 || !selected}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
            <Upload size={16}/>
            {uploading ? `Uploading ${progress}%...` : `Upload ${files.length > 0 ? files.length : ""} Photo${files.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BULK FOLDER UPLOAD MODAL
// ─────────────────────────────────────────────────────────────
type BulkGroup = {
  fleetNumber: string;
  equipmentId: string;
  equipmentName: string;
  files: File[];
  matched: boolean;
};

function BulkUploadModal({ open, onClose, onUploaded }: {
  open: boolean; onClose: () => void; onUploaded: () => void;
}) {
  const { profile }     = useAuth();
  const folderRef       = useRef<HTMLInputElement>(null);
  const [equipment,     setEquipment]     = useState<any[]>([]);
  const [groups,        setGroups]        = useState<BulkGroup[]>([]);
  const [photoType,     setPhotoType]     = useState("General");
  const [stage,         setStage]         = useState<"pick"|"preview"|"uploading"|"done">("pick");
  const [totalFiles,    setTotalFiles]    = useState(0);
  const [uploaded,      setUploaded]      = useState(0);
  const [skipped,       setSkipped]       = useState(0);
  const [currentLabel,  setCurrentLabel]  = useState("");
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setStage("pick"); setGroups([]); setUploaded(0); setSkipped(0); setUnmatchedNames([]);
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name").range(0, 999),
      dbu.from("equipment").select("id,fleet_number,name").range(1000, 1999),
    ]).then(([p1, p2]) => {
      const all = [...(p1.data||[]), ...(p2.data||[])];
      setEquipment(all.filter(e => e?.fleet_number));
    });
  }, [open]);

  function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Build a map: folderName -> File[]
    const folderMap: Record<string, File[]> = {};

    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const parts = file.webkitRelativePath.split("/");

      let folderName: string;
      if (parts.length >= 3) {
        // ROOT/FLEET_FOLDER/filename.jpg → use folder name
        folderName = parts[1].trim().toUpperCase();
      } else if (parts.length === 2) {
        // ROOT/AC-07.jpg → use filename without extension
        folderName = parts[1].replace(/\.[^.]+$/, "").trim().toUpperCase();
      } else {
        return; // skip
      }

      if (!folderMap[folderName]) folderMap[folderName] = [];
      folderMap[folderName].push(file);
    });

    // Match against equipment
    const equipMap: Record<string, any> = {};
    equipment.forEach(eq => {
      equipMap[eq.fleet_number.toUpperCase()] = eq;
    });

    const matched: BulkGroup[] = [];
    const unmatched: string[]  = [];

    Object.entries(folderMap).forEach(([folderName, folderFiles]) => {
      const eq = equipMap[folderName];
      if (eq) {
        matched.push({
          fleetNumber:   eq.fleet_number,
          equipmentId:   eq.id,
          equipmentName: eq.name,
          files:         folderFiles,
          matched:       true,
        });
      } else {
        unmatched.push(`${folderName} (${folderFiles.length} photos)`);
      }
    });

    matched.sort((a, b) => a.fleetNumber.localeCompare(b.fleetNumber));
    setGroups(matched);
    setTotalFiles(matched.reduce((n, g) => n + g.files.length, 0));
    setUnmatchedNames(unmatched);
    setStage("preview");
  }

  async function handleBulkUpload() {
    setStage("uploading");
    let done = 0;
    let skip = 0;

    for (const group of groups) {
      setCurrentLabel(`${group.fleetNumber} — ${group.equipmentName}`);
      const results: any[] = [];

      for (const file of group.files) {
        const ext  = file.name.split(".").pop();
        const path = `${group.fleetNumber}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await dbu.storage.from("equipment-photos").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) { skip++; continue; }
        const { data: { publicUrl } } = dbu.storage.from("equipment-photos").getPublicUrl(path);
        results.push({
          equipment_id: group.equipmentId,
          fleet_number: group.fleetNumber,
          url:          publicUrl,
          caption:      null,
          photo_type:   photoType,
          uploaded_by:  profile?.full_name || "User",
        });
        done++;
        setUploaded(done);
      }

      if (results.length > 0) {
        await dbu.from("equipment_photos").insert(results);
      }
    }

    setSkipped(skip);
    setStage("done");
    onUploaded();
  }

  if (!open) return null;

  const matchedCount   = groups.length;
  const progress       = totalFiles > 0 ? Math.round((uploaded / totalFiles) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0F1117] rounded-2xl shadow-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="px-7 py-5 bg-slate-900 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">Plant Gallery</p>
            <h2 className="text-lg font-bold text-white">Bulk Upload — All Equipment Folders</h2>
          </div>
          {stage !== "uploading" && (
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          )}
        </div>

        <div className="p-7">

          {/* ── STAGE: PICK ────────────────────────────────────── */}
          {stage === "pick" && (
            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <p className="font-bold">How this works:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Select your <strong>GRAPHICS</strong> folder (or any root folder)</li>
                  <li>Each <strong>subfolder name must match a fleet number</strong> (e.g. folder named "AC-07" → equipment AC-07)</li>
                  <li>Loose image files at the root are also matched by filename (e.g. AC-02.jpg → AC-02)</li>
                  <li>All matched photos upload automatically — one shot</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Photo Type (applied to all)</label>
                <select className={iCls} value={photoType} onChange={e => setPhotoType(e.target.value)}>
                  {PHOTO_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div
                onClick={() => folderRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-[#1E2235] rounded-xl p-10 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/5 transition-colors">
                <FolderOpen size={40} className="mx-auto text-slate-300 mb-3"/>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Click to select your GRAPHICS folder</p>
                <p className="text-xs text-slate-400 mt-2">All subfolders will be scanned. Folder names must match fleet numbers.</p>
                <input
                  ref={folderRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  // @ts-expect-error
                  webkitdirectory=""
                  directory=""
                  onChange={handleFolderSelect}
                />
              </div>
            </div>
          )}

          {/* ── STAGE: PREVIEW ─────────────────────────────────── */}
          {stage === "preview" && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{matchedCount}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Equipment Matched</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{totalFiles}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Photos Ready</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{unmatchedNames.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Folders Unmatched</p>
                </div>
              </div>

              {/* Unmatched warning */}
              {unmatchedNames.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-orange-600 shrink-0"/>
                    <p className="text-sm font-bold text-orange-800 dark:text-orange-400">
                      {unmatchedNames.length} folder{unmatchedNames.length > 1 ? "s" : ""} not matched — will be skipped
                    </p>
                  </div>
                  <div className="max-h-24 overflow-y-auto">
                    {unmatchedNames.map(n => (
                      <p key={n} className="text-xs text-orange-600 dark:text-orange-500">{n}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched list */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Matched Equipment ({matchedCount})
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {groups.map(g => (
                    <div key={g.fleetNumber}
                      className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-[#1A1D2E] rounded-xl">
                      <div>
                        <span className="font-bold text-amber-600 font-mono text-xs">{g.fleetNumber}</span>
                        <span className="text-slate-500 text-xs ml-2 truncate">{g.equipmentName}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {g.files.length} photo{g.files.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {matchedCount === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  ⚠️ No folders matched any fleet numbers. Make sure folder names match exactly (e.g. "AC-07", "SN-40").
                </div>
              )}
            </div>
          )}

          {/* ── STAGE: UPLOADING ───────────────────────────────── */}
          {stage === "uploading" && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{uploaded} / {totalFiles}</p>
                <p className="text-slate-500 text-sm mt-1">photos uploaded</p>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-[#1A1D2E] rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}/>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Currently uploading:</p>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5 truncate">{currentLabel}</p>
              </div>
              <p className="text-center text-xs text-slate-400">
                Please keep this window open. Do not refresh the page.
              </p>
            </div>
          )}

          {/* ── STAGE: DONE ────────────────────────────────────── */}
          {stage === "done" && (
            <div className="space-y-5 py-4 text-center">
              <CheckCircle size={52} className="mx-auto text-emerald-500"/>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">Upload Complete</p>
                <p className="text-slate-500 text-sm mt-2">
                  <span className="font-bold text-emerald-600">{uploaded}</span> photos uploaded successfully
                  {skipped > 0 && <span className="text-orange-500"> · {skipped} failed</span>}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-600">{uploaded}</p>
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">Uploaded</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{matchedCount}</p>
                  <p className="text-slate-500 text-xs mt-1">Equipment Updated</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-slate-100 dark:border-[#1E2235] flex gap-3 justify-end">
          {stage === "pick" && (
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E2235] text-sm text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
          )}
          {stage === "preview" && (
            <>
              <button onClick={() => setStage("pick")}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E2235] text-sm text-slate-500 hover:bg-slate-50">
                ← Back
              </button>
              <button onClick={handleBulkUpload} disabled={matchedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-40 flex items-center gap-2">
                <Upload size={16}/>
                Upload All {totalFiles} Photos
              </button>
            </>
          )}
          {stage === "done" && (
            <button onClick={() => { onClose(); setStage("pick"); setGroups([]); }}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600">
              Done ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EQUIPMENT CARD
// ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  "Working":      "bg-emerald-100 text-emerald-700",
  "Under Repair": "bg-amber-100 text-amber-700",
  "Storage":      "bg-slate-100 text-slate-600",
  "Scrapped":     "bg-red-100 text-red-600",
  "Break Down":   "bg-orange-100 text-orange-700",
};

function EquipmentCard({ fleetNumber, name, category, status, photos, onUpload, onView }: {
  fleetNumber: string; name: string; category: string; status: string;
  photos: any[]; onUpload: () => void; onView: (idx: number) => void;
}) {
  const cover = photos[0];
  const extra = photos.length - 3;

  return (
    <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden hover:shadow-md hover:border-amber-200 transition-all group">
      {/* Cover */}
      <div className="relative aspect-video bg-slate-100 dark:bg-[#1A1D2E] overflow-hidden cursor-pointer"
        onClick={() => photos.length > 0 && onView(0)}>
        {cover ? (
          // ← FIX: unoptimized so Supabase URLs render without next.config domain setup
          <Image src={cover.url} alt={name} fill unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-300"/>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
            <Camera size={32} className="mb-2"/>
            <p className="text-xs">No photos yet</p>
          </div>
        )}
        {photos.length > 0 && (
          <>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg font-medium">
              {photos.length} photo{photos.length > 1 ? "s" : ""}
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-1 p-2 bg-slate-50 dark:bg-[#0D0F1A]">
          {photos.slice(1, 3).map((p, i) => (
            <div key={p.id || i} onClick={() => onView(i + 1)}
              className="w-12 h-10 rounded-lg overflow-hidden cursor-pointer shrink-0 hover:opacity-80 transition-opacity">
              {/* ← FIX: unoptimized */}
              <Image src={p.url} alt="" width={48} height={40} unoptimized className="w-full h-full object-cover"/>
            </div>
          ))}
          {extra > 0 && (
            <div onClick={() => onView(3)}
              className="w-12 h-10 rounded-lg bg-slate-200 dark:bg-[#1A1D2E] flex items-center justify-center cursor-pointer hover:bg-slate-300 shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">+{extra}</span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-bold text-amber-600 font-mono text-xs">{fleetNumber}</p>
            <p className="font-semibold text-slate-800 dark:text-white text-sm truncate mt-0.5">{name}</p>
            <p className="text-slate-400 text-xs mt-0.5">{category}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>
            {status}
          </span>
        </div>
        <button onClick={onUpload}
          className="w-full mt-3 py-2 rounded-xl border border-slate-200 dark:border-[#1E2235] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors flex items-center justify-center gap-1.5">
          <Upload size={13}/> Add Photos
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function PlantGalleryPage() {
  const { profile }     = useAuth();
  const [equipment,     setEquipment]     = useState<any[]>([]);
  const [photos,        setPhotos]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterCat,     setFilterCat]     = useState("");
  const [filterSite,    setFilterSite]    = useState("");
  const [filterType,    setFilterType]    = useState<"all"|"with"|"without">("all");
  const [uploadModal,   setUploadModal]   = useState(false);
  const [bulkModal,     setBulkModal]     = useState(false);
  const [uploadFleet,   setUploadFleet]   = useState<string|undefined>();
  const [lightboxPhotos,setLightboxPhotos]= useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteMode,    setDeleteMode]    = useState(false);

  const canManage = (profile?.roles as string[] || []).some(r =>
    ["super_admin","plant_admin","plant_engineer","plant_manager"].includes(r)
  );

  async function load() {
    setLoading(true);
    const [e1, e2, p] = await Promise.all([
      dbu.from("equipment").select("id,fleet_number,name,category,site,region,operational_status").range(0, 999),
      dbu.from("equipment").select("id,fleet_number,name,category,site,region,operational_status").range(1000, 1999),
      dbu.from("equipment_photos").select("*").order("created_at", { ascending: false }),
    ]);
    setEquipment([...(e1.data||[]), ...(e2.data||[])].filter(e => e?.fleet_number));
    setPhotos(p.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deletePhoto(photoId: string, url: string) {
    if (!confirm("Delete this photo?")) return;
    const path = url.split("/equipment-photos/")[1];
    if (path) await dbu.storage.from("equipment-photos").remove([path]);
    await dbu.from("equipment_photos").delete().eq("id", photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  const photoMap = photos.reduce((acc: any, p: any) => {
    if (!acc[p.fleet_number]) acc[p.fleet_number] = [];
    acc[p.fleet_number].push(p);
    return acc;
  }, {});

  const categories = [...new Set(equipment.map(e => e.category))].filter(Boolean).sort();
  const sites      = [...new Set(equipment.map(e => e.site))].filter(Boolean).sort();

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      e.fleet_number.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    const ePhotos = photoMap[e.fleet_number] || [];
    const matchType =
      filterType === "all" ? true :
      filterType === "with" ? ePhotos.length > 0 :
      ePhotos.length === 0;
    return matchQ &&
      (!filterCat  || e.category === filterCat) &&
      (!filterSite || e.site === filterSite) &&
      matchType;
  });

  const withPhotos    = equipment.filter(e => (photoMap[e.fleet_number]||[]).length > 0).length;
  const withoutPhotos = equipment.length - withPhotos;

  function openLightbox(fleetNumber: string, index: number) {
    setLightboxPhotos(photoMap[fleetNumber] || []);
    setLightboxIndex(index);
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">PLT Gallery</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Plant Gallery</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Visual register of all fleet equipment — photos, condition records and repair documentation.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          {canManage && (
            <>
              <button onClick={() => setDeleteMode(d => !d)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${
                  deleteMode
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white dark:bg-[#0F1117] border-slate-200 dark:border-[#1E2235] text-slate-600 hover:bg-slate-50"
                }`}>
                <Trash2 size={15}/>
                {deleteMode ? "Done Deleting" : "Delete Photos"}
              </button>
              <button
                onClick={() => setBulkModal(true)}
                className="border border-amber-300 bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-100 flex items-center gap-2">
                <FolderOpen size={16}/>
                Bulk Upload (Folders)
              </button>
              <button
                onClick={() => { setUploadFleet(undefined); setUploadModal(true); }}
                className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm flex items-center gap-2">
                <Camera size={16}/>
                Upload Photos
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Equipment", value: equipment.length, bg: "bg-slate-900 text-white" },
          { label: "With Photos",     value: withPhotos,       bg: "bg-emerald-500 text-white" },
          { label: "No Photos Yet",   value: withoutPhotos,    bg: "bg-amber-500 text-white" },
          { label: "Total Photos",    value: photos.length,    bg: "bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-[#1E2235] text-slate-800 dark:text-white" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{loading ? "..." : k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search fleet no., name, category..."
            value={search} onChange={e => setSearch(e.target.value)} className={iCls}/>
          <select className={iCls} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="all">All Equipment</option>
            <option value="with">With Photos</option>
            <option value="without">No Photos Yet</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Showing <span className="font-bold text-slate-600 dark:text-slate-300">{filtered.length}</span> of {equipment.length} equipment
        </p>
      </div>

      {/* Delete mode banner */}
      {deleteMode && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <Trash2 size={20} className="text-red-600 shrink-0"/>
          <div>
            <p className="font-bold text-red-800 dark:text-red-400 text-sm">Delete mode active</p>
            <p className="text-red-600 dark:text-red-500 text-xs mt-0.5">
              Click any photo thumbnail to delete it permanently. Click "Done Deleting" when finished.
            </p>
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-100 dark:bg-[#1A1D2E]"/>
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-100 dark:bg-[#1A1D2E] rounded w-1/3"/>
                <div className="h-4 bg-slate-100 dark:bg-[#1A1D2E] rounded w-2/3"/>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235]">
          <Camera size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4"/>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No equipment found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filtered.map(e => {
            const ePhotos = photoMap[e.fleet_number] || [];
            return (
              <div key={e.id}>
                {deleteMode && ePhotos.length > 0 ? (
                  <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-red-200 dark:border-red-800 overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                      <p className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</p>
                      <p className="text-slate-700 dark:text-white text-sm font-semibold truncate">{e.name}</p>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {ePhotos.map((p: any) => (
                        <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer"
                          onClick={() => deletePhoto(p.id, p.url)}>
                          <Image src={p.url} alt="" fill unoptimized className="object-cover"/>
                          <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/60 transition-colors flex items-center justify-center">
                            <Trash2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EquipmentCard
                    fleetNumber={e.fleet_number}
                    name={e.name}
                    category={e.category}
                    status={e.operational_status}
                    photos={ePhotos}
                    onUpload={() => { setUploadFleet(e.fleet_number); setUploadModal(true); }}
                    onView={(idx) => openLightbox(e.fleet_number, idx)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        open={uploadModal}
        onClose={() => { setUploadModal(false); setUploadFleet(undefined); }}
        onUploaded={load}
        preselectedFleet={uploadFleet}
      />
      <BulkUploadModal
        open={bulkModal}
        onClose={() => setBulkModal(false)}
        onUploaded={load}
      />
      {lightboxPhotos.length > 0 && (
        <Lightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxPhotos([])}
        />
      )}
    </div>
  );
}