/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export const dynamic = 'force-dynamic';

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Upload, X, ZoomIn, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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
          <Image src={photo.url} alt={photo.caption||photo.fleet_number} fill
            className="object-contain rounded-xl" />
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
// UPLOAD MODAL
// ─────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, onUploaded, preselectedFleet }: {
  open: boolean; onClose: () => void;
  onUploaded: () => void; preselectedFleet?: string;
}) {
  const { profile } = useAuth();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [equipment, setEquipment]  = useState<any[]>([]);
  const [selected,  setSelected]   = useState(preselectedFleet || "");
  const [files,     setFiles]      = useState<File[]>([]);
  const [previews,  setPreviews]   = useState<string[]>([]);
  const [photoType, setPhotoType]  = useState("General");
  const [caption,   setCaption]    = useState("");
  const [uploading, setUploading]  = useState(false);
  const [progress,  setProgress]   = useState(0);
  const [error,     setError]      = useState<string|null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      dbu.from("equipment").select("id,fleet_number,name").range(0,999),
      dbu.from("equipment").select("id,fleet_number,name").range(1000,1999),
    ]).then(([p1,p2]) => {
      const all = [...(p1.data||[]), ...(p2.data||[])];
      setEquipment(all.filter(e => e && e.fleet_number).sort((a,b)=>
        (a.fleet_number||"").localeCompare(b.fleet_number||"")
      ));
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preselectedFleet) setSelected(preselectedFleet);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleFiles(selectedFiles: FileList|null) {
    if (!selectedFiles) return;
    const arr = Array.from(selectedFiles).filter(f => f.type.startsWith("image/")).slice(0,10);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_,idx)=>idx!==i));
    setPreviews(prev => prev.filter((_,idx)=>idx!==i));
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

      const { error: upErr } = await dbu.storage
        .from("equipment-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (upErr) { setError(`Upload failed: ${upErr.message}`); continue; }

      const { data: { publicUrl } } = dbu.storage
        .from("equipment-photos")
        .getPublicUrl(path);

      results.push({
        equipment_id:  equip.id,
        fleet_number:  equip.fleet_number,
        url:           publicUrl,
        caption:       caption || null,
        photo_type:    photoType,
        uploaded_by:   profile?.full_name || "User",
      });

      uploaded++;
      setProgress(Math.round((uploaded / files.length) * 100));
    }

    if (results.length > 0) {
      await dbu.from("equipment_photos").insert(results);
    }

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
          {/* Equipment select */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Equipment <span className="text-red-400">*</span>
            </label>
            <select className={iCls} value={selected} onChange={e=>setSelected(e.target.value)}>
              <option value="">— Select equipment —</option>
              {equipment.map(e=>(
                <option key={e.id} value={e.fleet_number}>
                  {e.fleet_number} — {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Photo Type</label>
              <select className={iCls} value={photoType} onChange={e=>setPhotoType(e.target.value)}>
                {PHOTO_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Caption (optional)</label>
              <input className={iCls} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="e.g. After engine overhaul"/>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{ e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-slate-200 dark:border-[#1E2235] rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/5 transition-colors"
          >
            <Camera size={32} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Click or drag photos here
            </p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — up to 10 photos at once</p>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
              onChange={e=>handleFiles(e.target.files)}/>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src,i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <Image src={src} alt="" fill className="object-cover"/>
                  <button onClick={()=>removeFile(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Uploading {files.length} photo{files.length>1?"s":""}...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all"
                  style={{width:`${progress}%`}}/>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
          )}
        </div>

        <div className="px-7 py-5 border-t border-slate-100 dark:border-[#1E2235] flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E2235] text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1A1D2E]">
            Cancel
          </button>
          <button onClick={handleUpload} disabled={uploading||files.length===0||!selected}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
            <Upload size={16}/>
            {uploading ? `Uploading ${progress}%...` : `Upload ${files.length > 0 ? files.length : ""} Photo${files.length>1?"s":""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EQUIPMENT CARD
// ─────────────────────────────────────────────────────────────
function EquipmentCard({ fleetNumber, name, category, status, photos, onUpload, onView }: {
  fleetNumber: string; name: string; category: string; status: string;
  photos: any[]; onUpload: () => void; onView: (idx: number) => void;
}) {
  const STATUS_STYLE: Record<string,string> = {
    "Working":      "bg-emerald-100 text-emerald-700",
    "Under Repair": "bg-amber-100 text-amber-700",
    "Idle":         "bg-slate-100 text-slate-600",
    "Scrapped":     "bg-red-100 text-red-600",
    "Break Down":   "bg-orange-100 text-orange-700",
    "Stand By":     "bg-blue-100 text-blue-700",
  };

  const cover = photos[0];
  const extra = photos.length - 3;

  return (
    <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] overflow-hidden hover:shadow-md hover:border-amber-200 transition-all group">
      {/* Cover photo or placeholder */}
      <div className="relative aspect-video bg-slate-100 dark:bg-[#1A1D2E] overflow-hidden cursor-pointer"
        onClick={() => photos.length > 0 && onView(0)}>
        {cover ? (
          <Image src={cover.url} alt={name}
            fill
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
            <Camera size={32} className="mb-2"/>
            <p className="text-xs">No photos yet</p>
          </div>
        )}

        {/* Photo count badge */}
        {photos.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg font-medium">
            {photos.length} photo{photos.length>1?"s":""}
          </div>
        )}

        {/* Zoom overlay */}
        {photos.length > 0 && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-1 p-2 bg-slate-50 dark:bg-[#0D0F1A]">
          {photos.slice(1,3).map((p,i) => (
            <div key={p.id || i} onClick={()=>onView(i+1)}
              className="w-12 h-10 rounded-lg overflow-hidden cursor-pointer shrink-0 hover:opacity-80 transition-opacity">
              <Image src={p.url} alt="" width={48} height={40} className="w-full h-full object-cover"/>
            </div>
          ))}
          {extra > 0 && (
            <div onClick={()=>onView(3)}
              className="w-12 h-10 rounded-lg bg-slate-200 dark:bg-[#1A1D2E] flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors shrink-0">
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
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLE[status]||"bg-slate-100 text-slate-600"}`}>
            {status}
          </span>
        </div>

        <button onClick={onUpload}
          className="w-full mt-3 py-2 rounded-xl border border-slate-200 dark:border-[#1E2235] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors flex items-center justify-center gap-1.5">
          <Upload size={13}/>
          Add Photos
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function PlantGalleryPage() {
  const { profile } = useAuth();
  const [equipment,  setEquipment]  = useState<any[]>([]);
  const [photos,     setPhotos]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterType, setFilterType] = useState<"all"|"with"|"without">("all");
  const [uploadModal,    setUploadModal]    = useState(false);
  const [uploadFleet,    setUploadFleet]    = useState<string|undefined>();
  const [lightboxPhotos, setLightboxPhotos] = useState<any[]>([]);
  const [lightboxIndex,  setLightboxIndex]  = useState(0);
  const [deleteMode,     setDeleteMode]     = useState(false);

  const canManage = (profile?.roles as string[]||[]).some(r =>
    ["super_admin","plant_admin","plant_engineer","plant_manager"].includes(r)
  );

  async function load() {
    setLoading(true);
    const [e1, e2, p] = await Promise.all([
      dbu.from("equipment").select("id,fleet_number,name,category,site,region,operational_status").range(0,999),
      dbu.from("equipment").select("id,fleet_number,name,category,site,region,operational_status").range(1000,1999),
      dbu.from("equipment_photos").select("*").order("created_at", { ascending: false }),
    ]);
    setEquipment([...(e1.data||[]), ...(e2.data||[])].filter(e => e && e.fleet_number));
    setPhotos(p.data||[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function deletePhoto(photoId: string, url: string) {
    if (!confirm("Delete this photo?")) return;
    // Extract storage path from URL
    const path = url.split("/equipment-photos/")[1];
    if (path) await dbu.storage.from("equipment-photos").remove([path]);
    await dbu.from("equipment_photos").delete().eq("id", photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  // Build photo map by fleet number
  const photoMap = photos.reduce((acc:any, p:any) => {
    if (!acc[p.fleet_number]) acc[p.fleet_number] = [];
    acc[p.fleet_number].push(p);
    return acc;
  }, {});

  const categories = [...new Set(equipment.map(e=>e.category))].filter(Boolean).sort();
  const sites      = [...new Set(equipment.map(e=>e.site))].filter(Boolean).sort();

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      e.fleet_number.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    const ePhotos = photoMap[e.fleet_number]||[];
    const matchType =
      filterType === "all" ? true :
      filterType === "with" ? ePhotos.length > 0 :
      ePhotos.length === 0;
    return matchQ &&
      (!filterCat  || e.category === filterCat) &&
      (!filterSite || e.site === filterSite) &&
      matchType;
  });

  const withPhotos    = equipment.filter(e=>(photoMap[e.fleet_number]||[]).length>0).length;
  const withoutPhotos = equipment.length - withPhotos;

  function openLightbox(fleetNumber: string, index: number) {
    setLightboxPhotos(photoMap[fleetNumber]||[]);
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
              <button
                onClick={() => setDeleteMode(d=>!d)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${
                  deleteMode
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white dark:bg-[#0F1117] border-slate-200 dark:border-[#1E2235] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}>
                <Trash2 size={15}/>
                {deleteMode ? "Done Deleting" : "Delete Photos"}
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
          { label:"Total Equipment",   value:equipment.length, bg:"bg-slate-900 text-white" },
          { label:"With Photos",       value:withPhotos,       bg:"bg-emerald-500 text-white" },
          { label:"No Photos Yet",     value:withoutPhotos,    bg:"bg-amber-500 text-white" },
          { label:"Total Photos",      value:photos.length,    bg:"bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-[#1E2235] text-slate-800 dark:text-white" },
        ].map(k=>(
          <div key={k.label} className={`${k.bg} rounded-2xl p-5`}>
            <p className="text-3xl font-bold">{loading?"...":k.value}</p>
            <p className="text-sm opacity-70 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-slate-200 dark:border-[#1E2235] p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input placeholder="Search fleet no., name, category..."
            value={search} onChange={e=>setSearch(e.target.value)} className={iCls}/>
          <select className={iCls} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className={iCls} value={filterSite} onChange={e=>setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s=><option key={s}>{s}</option>)}
          </select>
          <select className={iCls} value={filterType} onChange={e=>setFilterType(e.target.value as any)}>
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
          {[...Array(8)].map((_,i)=>(
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
            const ePhotos = photoMap[e.fleet_number]||[];
            return (
              <div key={e.id}>
                {/* Delete mode — show all photos with delete buttons */}
                {deleteMode && ePhotos.length > 0 ? (
                  <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-red-200 dark:border-red-800 overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                      <p className="font-bold text-amber-600 font-mono text-xs">{e.fleet_number}</p>
                      <p className="text-slate-700 dark:text-white text-sm font-semibold truncate">{e.name}</p>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {ePhotos.map((p:any) => (
                        <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer"
                          onClick={()=>deletePhoto(p.id, p.url)}>
                          <Image src={p.url} alt="" fill className="object-cover" unoptimized />
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
