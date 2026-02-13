"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RingsCard, fetchCardsByPack, isPlayerCard } from "@/lib/ringsdb";

type PackRow = { pack_code: string; pack_name: string; enabled: boolean };

type DeckSummary = {
  id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
  heroes: string[];
  cards: { card_code: string; qty: number }[];
};

const SPHERES = ["leadership", "tactics", "spirit", "lore", "neutral", "baggins", "fellowship"] as const;

const TYPE_LABELS: Record<string, string> = {
  ally: "Allies",
  attachment: "Attachments",
  event: "Events",
};

function sphereAccent(s: string) {
  switch ((s ?? "").toLowerCase()) {
    case "leadership": return "#1abc9c";
    case "tactics": return "#e74c3c";
    case "spirit": return "#3498db";
    case "lore": return "#2ecc71";
    case "neutral": return "#95a5a6";
    case "baggins": return "#f1c40f";
    case "fellowship": return "#9b59b6";
    default: return "rgba(255,255,255,0.12)";
  }
}
function sphereLabel(s: string) {
  const x = (s ?? "").toLowerCase();
  return x ? x[0].toUpperCase() + x.slice(1) : "—";
}
function cardImgUrl(code: string) {
  return `https://ringsdb.com/bundles/cards/${code}.png`;
}

export default function DecksPage() {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"updated_desc" | "created_desc" | "name" | "size_desc">("updated_desc");
  const [sphereFilter, setSphereFilter] = useState<string>("__all__");

  const [packs, setPacks] = useState<PackRow[]>([]);
  const [deckSummaries, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [index, setIndex] = useState<Record<string, RingsCard>>({});
  const [loadingIndex, setLoadingIndex] = useState(false);

  async function loadPacks() {
    const pRes = await fetch("/api/packs", { credentials: "same-origin" });
    const pj = await pRes.json().catch(() => ({}));
    if (!pRes.ok) throw new Error(pj.error ?? "Failed to load packs");
    setPacks(pj.packs ?? []);
  }

  async function loadSummaries() {
    const res = await fetch("/api/decks/summary", { credentials: "same-origin" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Failed to load deck summaries");
    setDeckSummaries((j.decks ?? []).map((d: any) => ({
      ...d,
      heroes: d.heroes ?? [],
      cards: d.cards ?? [],
    })));
  }

  useEffect(() => {
    (async () => {
      await loadPacks();
      await loadSummaries();
    })().catch(console.error);
  }, []);

  // Build card index from enabled packs (for sphere/type counts)
  useEffect(() => {
    (async () => {
      if (!packs.length) return;
      setLoadingIndex(true);
      try {
        const enabled = packs.filter(p => p.enabled).map(p => p.pack_code);
        const all: RingsCard[] = [];
        for (const code of enabled) {
          const packCards = await fetchCardsByPack(code);
          all.push(...packCards.filter(isPlayerCard));
        }
        const map: Record<string, RingsCard> = {};
        for (const c of all) map[c.code] = c;
        setIndex(map);
      } finally {
        setLoadingIndex(false);
      }
    })().catch(console.error);
  }, [packs]);

  async function create() {
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j.error ?? "Failed to create deck");
      return;
    }
    setName("");
    await loadSummaries();
  }

  async function del(deckId: string, deckName: string) {
    if (!confirm(`Delete "${deckName}"?\n\nThis cannot be undone.`)) return;
    const res = await fetch(`/api/decks/${deckId}/delete`, { method: "POST", credentials: "same-origin" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j.error ?? "Delete failed");
      return;
    }
    await loadSummaries();
  }

  function deckMainSize(d: DeckSummary) {
    let sum = 0;
    for (const c of d.cards) {
      if (!d.heroes.includes(c.card_code)) sum += (c.qty ?? 0);
    }
    return sum;
  }

  function deckTypeCounts(d: DeckSummary) {
    const out: Record<string, number> = {};
    for (const c of d.cards) {
      if (d.heroes.includes(c.card_code)) continue;
      const meta = index[c.card_code];
      const t = (meta?.type_code ?? "other").toLowerCase();
      out[t] = (out[t] ?? 0) + (c.qty ?? 0);
    }
    return out;
  }

  function deckSphereCounts(d: DeckSummary) {
    const out: Record<string, number> = {};
    for (const c of d.cards) {
      if (d.heroes.includes(c.card_code)) continue;
      const meta = index[c.card_code];
      const s = (meta?.sphere_code ?? "unknown").toLowerCase();
      out[s] = (out[s] ?? 0) + (c.qty ?? 0);
    }
    return out;
  }

  function deckPrimarySpheres(d: DeckSummary) {
    const sc = deckSphereCounts(d);
    const entries = Object.entries(sc)
      .filter(([k]) => k !== "unknown")
      .sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 3).map(([k]) => k);
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let arr = deckSummaries.filter(d => !qq || (d.name ?? "").toLowerCase().includes(qq));

    if (sphereFilter !== "__all__") {
      arr = arr.filter(d => (deckSphereCounts(d)[sphereFilter] ?? 0) > 0);
    }

    arr = arr.slice();

    if (sort === "name") {
      arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    } else if (sort === "size_desc") {
      arr.sort((a, b) => deckMainSize(b) - deckMainSize(a));
    } else if (sort === "created_desc") {
      arr.sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""));
    } else {
      arr.sort((a, b) => Date.parse(b.updated_at ?? "") - Date.parse(a.updated_at ?? ""));
    }

    return arr;
  }, [deckSummaries, q, sort, sphereFilter, index]);

  return (
    <div className="card" style={{ paddingBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>Decks</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search decks…" style={{ width: 220 }} />

          <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="updated_desc">Last edited (new → old)</option>
            <option value="created_desc">Created (new → old)</option>
            <option value="name">Name (A → Z)</option>
            <option value="size_desc">Deck size (big → small)</option>
          </select>

          <select value={sphereFilter} onChange={(e) => setSphereFilter(e.target.value)}>
            <option value="__all__">All spheres</option>
            {SPHERES.map(s => (
              <option key={s} value={s}>{sphereLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <hr className="sep" />

      <div style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New deck name…" style={{ minWidth: 240 }} />
        <button className="btn" onClick={create}>Create</button>
        <div className="small muted" style={{ marginLeft: "auto" }}>
          {loadingIndex ? "Loading card index…" : ""} Showing <strong>{filtered.length}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, alignItems: "start" }}>
        {filtered.map((d) => {
          const size = deckMainSize(d);
          const typeCounts = deckTypeCounts(d);
          const spheres = deckPrimarySpheres(d);

          return (
            <div key={d.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", height: 10 }}>
                {(spheres.length ? spheres : ["unknown"]).map((s) => (
                  <div key={s} style={{ flex: 1, background: sphereAccent(s) }} />
                ))}
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Link href={`/decks/${d.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {d.name}
                      </Link>
                    </div>

                    <div className="small muted" style={{ marginTop: 6 }}>
                      {size} cards • {d.heroes.length} hero{d.heroes.length === 1 ? "" : "es"}
                    </div>

                    <div className="small muted" style={{ marginTop: 6 }}>
                      Last edited:{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {d.heroes.slice(0, 3).map((h) => (
                      <img
                        key={h}
                        src={cardImgUrl(h)}
                        alt={h}
                        style={{ width: 52, borderRadius: 8, boxShadow: "0 6px 14px rgba(0,0,0,0.18)" }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  {["ally", "attachment", "event"].map(t => (
                    <div key={t} style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.03)", fontWeight: 800 }}>
                      {TYPE_LABELS[t]}: <strong>{typeCounts[t] ?? 0}</strong>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  {Object.entries(deckSphereCounts(d))
                    .filter(([s, n]) => s !== "unknown" && n > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([s, n]) => (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: sphereAccent(s) }} />
                        <div className="small muted" style={{ fontWeight: 800 }}>{sphereLabel(s)} {n}</div>
                      </div>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link href={`/decks/${d.id}`} className="btn secondary" style={{ textDecoration: "none" }}>
                    Open
                  </Link>
                  <button className="btn" onClick={() => del(d.id, d.name)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
