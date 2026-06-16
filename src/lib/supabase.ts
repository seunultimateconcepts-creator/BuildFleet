/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const g = globalThis as any;

export const supabase =
  g.__supabase ??
  (g.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         "buildfleet-auth",
    },
  }));

export const dbu = supabase as any;