import { supabase } from "./supabaseClient";
import { fetchAllPacks } from "./ringsdb";

export const DEFAULT_ENABLED_PACKS = new Set([
  "Core", "DoG", "DoD", "EoL", "RoR", "TBR", "TRD"
]);

let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const packs = await fetchAllPacks();
    const rows = packs.map(p => ({
      pack_code: p.code,
      pack_name: p.name,
      enabled: DEFAULT_ENABLED_PACKS.has(p.code),
    }));

    const { error } = await supabase.from("collection_packs").upsert(rows, { onConflict: "pack_code" });
    if (error) throw error;
  })();

  return initPromise;
}
