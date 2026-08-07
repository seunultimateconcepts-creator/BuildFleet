/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────
// fetchAllRows — Supabase caps every query at 1,000 rows by
// default, silently. With 1,438+ equipment (and now 6,136+ stock
// items, spread across multiple stores in store_stock_balances)
// this truncates any unpaginated fetch and causes exactly the
// "only 1000 showing" / "438 failed on import" class of bug.
// This helper pages through .range() windows until every row is
// collected.
//
// ★ PERFORMANCE: pages are fetched in PARALLEL, not sequentially.
// The old version awaited each 1000-row page one at a time in a
// for-loop — on a table like store_stock_balances (tens of
// thousands of rows once joined across every store), that meant
// 10-20+ sequential network round trips stacked end to end, which
// is exactly what made the "All Stores" oversight view (Store
// Manager's default landing view) take 1-2 minutes to load. Now:
// fetch page 1, get an exact row count, then fire every remaining
// page at once with Promise.all — wall-clock time drops to roughly
// the slowest single page instead of the sum of all of them.
//
// ★ Stable tiebreaker, always applied: range-based pagination is
// only safe when the sort order is fully deterministic. If the
// caller's own .order() has ties (e.g. many items literally named
// "BEARING KIT"), Postgres can return them in a different relative
// order on each separate page request — the same row can then land
// on two pages (duplicate), or a different row can be skipped
// entirely (silent data loss). Chaining .order("id") as a secondary,
// always-unique sort after whatever the caller specifies removes the
// ambiguity completely — id is a uuid primary key, so this tiebreak
// can never itself have a tie. This was the root cause of the
// "duplicate key" React warning on the Store register.
//
// Usage:
//   const equipment = await fetchAllRows("equipment", "*",
//     q => q.neq("operational_status", "Scrapped").order("fleet_number"));
// ─────────────────────────────────────────────────────────────
import { dbu } from "@/lib/db";

const PAGE = 1000;

// ─────────────────────────────────────────────────────────────
// Lightweight in-memory cache — lives for the browser tab's session,
// cleared on a real page reload. This is what fixes "navigating back
// to a page reloads everything again": if the same cacheKey was
// fetched within the last cacheTTL, serve it instantly instead of
// hitting the database again. Purely opt-in — any call without a
// cacheKey behaves exactly as before, so nothing existing breaks.
// ─────────────────────────────────────────────────────────────
const _cache = new Map<string, { data: any[]; ts: number }>();

// Call after any write (GRN, SIV, Adjustment, etc.) so the next load
// shows the real, current data instead of serving a stale cached
// copy for up to cacheTTL. Pass a prefix to clear a family of keys
// (e.g. "store-balances-") or nothing to clear everything.
export function invalidateCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return; }
  for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k);
}

function buildPageQuery(table: string, select: string, modify: ((q: any) => any) | undefined, from: number) {
  let q = dbu.from(table).select(select).range(from, from + PAGE - 1);
  if (modify) q = modify(q);
  return q.order("id", { ascending: true }); // stable secondary sort — always last, always unique
}

export async function fetchAllRows(
  table: string,
  select: string = "*",
  modify?: (q: any) => any,
  options?: { cacheKey?: string; cacheTTL?: number }, // cacheTTL in ms, default 60s
): Promise<any[]> {
  const { cacheKey, cacheTTL = 60000 } = options || {};
  if (cacheKey) {
    const cached = _cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < cacheTTL) return cached.data;
  }

  const all: any[] = [];
  const seen = new Set<string>(); // belt-and-braces: drop any row whose id we've already collected
  function addRows(rows: any[] | null | undefined) {
    for (const row of rows || []) {
      if (row?.id != null) {
        if (seen.has(row.id)) continue; // defensive skip, shouldn't trigger now but costs nothing
        seen.add(row.id);
      }
      all.push(row);
    }
  }

  // ── Page 1 — always fetched first, on its own. This tells us
  // whether there's more data at all (short page = done already,
  // the common case for most tables) before spending a count query. ──
  const { data: firstPage, error: firstErr } = await buildPageQuery(table, select, modify, 0);
  if (firstErr) {
    console.error(`fetchAllRows(${table}) page 0:`, firstErr.message);
    return [];
  }
  addRows(firstPage);

  if (!firstPage || firstPage.length < PAGE) {
    if (cacheKey) _cache.set(cacheKey, { data: all, ts: Date.now() });
    return all; // only one page existed — nothing more to do
  }

  // ── More than one page exists. Get an exact count (same filters,
  // via modify) so we know exactly how many remaining pages to
  // request — then fire them ALL in parallel instead of one by one. ──
  let countQuery = dbu.from(table).select("id", { count: "exact", head: true });
  if (modify) countQuery = modify(countQuery);
  const { count, error: countErr } = await countQuery;

  if (countErr || count == null) {
    // Fallback: count failed for some reason — fetch remaining pages
    // sequentially, same as the old behavior, rather than guessing.
    for (let from = PAGE; ; from += PAGE) {
      const { data, error } = await buildPageQuery(table, select, modify, from);
      if (error) { console.error(`fetchAllRows(${table}) page ${from / PAGE}:`, error.message); break; }
      addRows(data);
      if (!data || data.length < PAGE) break;
    }
    if (cacheKey) _cache.set(cacheKey, { data: all, ts: Date.now() });
    return all;
  }

  const totalPages = Math.ceil(count / PAGE);
  const remainingRequests = [];
  for (let page = 1; page < totalPages; page++) {
    remainingRequests.push(buildPageQuery(table, select, modify, page * PAGE));
  }

  const results = await Promise.all(remainingRequests);
  for (const { data, error } of results) {
    if (error) { console.error(`fetchAllRows(${table}) parallel page error:`, error.message); continue; }
    addRows(data);
  }

  if (cacheKey) _cache.set(cacheKey, { data: all, ts: Date.now() });
  return all;
}