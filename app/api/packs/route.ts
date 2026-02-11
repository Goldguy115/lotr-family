import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchAllPacks } from "@/lib/ringsdb";

// Keep this constant INSIDE the route so we don't import init.ts (which may have client-only code)
const DEFAULT_ENABLED_PACKS = new Set([
  "Core", "DoG", "DoD", "EoL", "RoR", "TBR", "TRD"
]);

export async function GET() {
  try {
    if (!(await requireFamilySession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = supabaseServer();

    // Ensure packs table is populated
    const packs = await fetchAllPacks();

    const rows = packs.map((p: any) => ({
      pack_code: String(p.code),
      pack_name: String(p.name),
      enabled: DEFAULT_ENABLED_PACKS.has(String(p.code)),
    }));

    const up = await sb.from("collection_packs").upsert(rows, { onConflict: "pack_code" });
    if (up.error) return NextResponse.json({ error: `upsert: ${up.error.message}` }, { status: 500 });

    const sel = await sb
      .from("collection_packs")
      .select("pack_code, pack_name, enabled")
      .order("pack_name", { ascending: true });

    if (sel.error) return NextResponse.json({ error: `select: ${sel.error.message}` }, { status: 500 });

    return NextResponse.json({ packs: sel.data ?? [] });
  } catch (e: any) {
    // This will finally show the real reason instead of a generic 500
    return NextResponse.json(
      { error: String(e?.message ?? e), detail: String(e?.stack ?? "") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await requireFamilySession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pack_code = String(body.pack_code ?? "");
    const enabled = Boolean(body.enabled);

    if (!pack_code) return NextResponse.json({ error: "pack_code required" }, { status: 400 });

    const sb = supabaseServer();
    const upd = await sb.from("collection_packs").update({ enabled }).eq("pack_code", pack_code);
    if (upd.error) return NextResponse.json({ error: `update: ${upd.error.message}` }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e), detail: String(e?.stack ?? "") },
      { status: 500 }
    );
  }
}
