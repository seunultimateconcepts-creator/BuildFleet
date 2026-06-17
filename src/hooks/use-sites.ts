/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { dbu } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

export type Site = {
  id:string; name:string; code:string; region:string;
  type:string; cost_code?:string; project_manager?:string;
  is_active:boolean; created_at:string;
};

let _cache: Site[] = [];
let _loaded = false;
let _fetching = false;
let _cbs: Array<(s: Site[]) => void> = [];

export function useSites() {
  const [sites,   setSites]   = useState<Site[]>(_cache);
  const [loading, setLoading] = useState(!_loaded);
  const [error,   setError]   = useState<string|null>(null);
  const { profile, hasFullAccess, isClerk, isSupervisor } = useAuth();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (_loaded) { setSites(filterSites(_cache)); setLoading(false); return; }
    if (_fetching) {
      const cb = (s: Site[]) => { setSites(filterSites(s)); setLoading(false); };
      _cbs.push(cb);
      return () => { _cbs = _cbs.filter(x => x !== cb); };
    }
    doFetch();
  }, [profile]); // eslint-disable-line

  // Filter sites for restricted roles
  function filterSites(allSites: Site[]): Site[] {
    const isRestricted = (isClerk || isSupervisor) && !hasFullAccess;
    const assignedSites = profile?.assigned_sites || [];
    if (isRestricted && assignedSites.length > 0) {
      return allSites.filter(s => assignedSites.includes(s.name));
    }
    return allSites;
  }

  async function doFetch(force = false) {
    if (_loaded && !force) { setSites(filterSites(_cache)); setLoading(false); return; }
    setLoading(true); _fetching = true;
    const { data, error: err } = await dbu.from("sites").select("*").order("code", { ascending: true });
    _fetching = false;
    if (err) { setError(err.message); setLoading(false); return; }
    _cache = (data || []) as Site[];
    _loaded = true;
    setSites(filterSites(_cache));
    setLoading(false);
    _cbs.forEach(cb => cb([..._cache]));
    _cbs = [];
  }

  async function addSite(site: any) {
    const { error: err } = await dbu.from("sites").insert([site]);
    if (err) return { success: false, error: err.message };
    _loaded = false; await doFetch(true); return { success: true };
  }

  async function updateSite(id: string, updates: any) {
    const { error: err } = await dbu.from("sites").update(updates).eq("id", id);
    if (err) return { success: false, error: err.message };
    _loaded = false; await doFetch(true); return { success: true };
  }

  async function deactivateSite(id: string) {
    const { error: err } = await dbu.from("sites").update({ is_active: false }).eq("id", id);
    if (err) return { success: false, error: err.message };
    _loaded = false; await doFetch(true); return { success: true };
  }

  return {
    sites,
    siteNames: sites.map(s => s.name),
    siteCodes: sites.map(s => ({ label: `${s.code} — ${s.name}`, value: s.code })),
    sitesByCode: Object.fromEntries(sites.map(s => [s.code, s])),
    loading, error, fetchSites: doFetch, addSite, updateSite, deactivateSite
  };
}