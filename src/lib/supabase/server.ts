import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Uses anon key — there is no per-user auth in this app, so the anon key
 * is acceptable. For sensitive ops you may swap this for a service-role
 * client read from a non-public env var.
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase no está configurado en el servidor.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfiguredServer() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
