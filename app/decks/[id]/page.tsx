"use client";

import { useEffect, useMemo, useState } from "react";
import { RingsCard, cardStatsLine, fetchCardsByPack, isPlayerCard } from "@/lib/ringsdb";

type PackRow = { pack_code: string; pack_name: string; enabled: boolean };
type DeckCardRow = { card_code: string; qty: number };

const TYPE_ORDER = ["hero", "ally", "attachment", "event", "player-side-quest", "contract", "treasure"];
const SPHERE_ORDER = ["leadership", "lore", "spirit", "tactics", "neutral", "baggins", "fellowship"];

export default function DeckBuilder({ params }: { params: { id: string } }) {
  const deckId = params.id;

  const [deckName, setDeckName] = useState("");
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [packChoice, setPackChoice] = useState<string>("__enabled__"); // enabled packs
  const [cards, setCards] = useState<RingsCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [heroes, setHeroes] = useState<string[]>([]);
  const [deckCards, setDeckCards] = useState<Record<string, number>>({}); // code -> qty
  const [owned, setOwned] = useState<Record<string, number>>({}); // code -> owned qty
  const [usage, setUsage] = useState<Record<string, { deck_id: string; deck_name: string; qty: number }[]>>({});

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [sphereFilter, setSphereFilter] = useState<string>("__all__");

  // Load packs + deck state
  useEffect(() => {
    (async () => {
      const pRes = await fetch("/api/packs", { credentials: "same-origin" });
      const pj = await pRes.json().catch(() => ({}));
      if (!pRes.ok) throw new Error(pj.error ?? "Failed to load packs");
      setPacks(pj.packs ?? []);

      const dRes = await fetch(`/api/decks/${deckId}`, { credentials: "same-origin" });
      const dj = await dRes.json().catch(() => ({}));
      if (!dRes.ok) throw new Error(dj.error ?? "Failed to load deck");
      setDeckName(dj.deck?.name ?? "Deck");
      setHeroes(dj.heroes ?? []);
      const dc: Record<string, number> = {};
      for (const r of (dj.cards ?? []) as DeckCardRow[]) dc[r.card_code] = r.qty;
      setDeckCards(dc);
    })().catch(console.error);
  }, [deckId]);

  // Load cards from RingsDB based on pack choice
  useEffect(() => {
    (async () => {
      setLoadingCards(true);
      try {
        let packCodes: string[] = [];
        if (packChoice === "__enabled__") {
          packCodes = packs.filter(p => p.enabled).map(p => p.pack_code);
        } else {
          packCodes = [packChoice];
        }

        // Fetch each pack’s cards and combine
        const all: RingsCard[] = [];
        for (const code of packCodes) {
          const packCards = await fetchCardsByPack(code);
          all.push(...packCards.filter(isPlayerCard));
        }
        setCards(all);
      } finally {
        setLoadingCards(false);
      }
    })().catch(console.error);
  }, [packChoice, packs]);

  // When visible cards change, load owned + usage indicators for those codes
  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return cards.filter(c => {
      if (typeFilter !== "__all__" && c.type_code !== typeFilter) return false;
      if (sphereFilter !== "__all__" && (c.sphere_code ?? "") !== sphereFilter) return false;
      if (!qq) return true;
      const hay = `${c.name} ${c.traits ?? ""} ${c.text ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [cards, q, typeFilter, sphereFilter]);

  useEffect(() => {
    (async () => {
      const codes = visible.slice(0, 200).map(c => c.code); // cap to keep requests sane
      if (!codes.length) return;

      const p = new URLSearchParams();
      codes.forEach(code => p.append("code", code));

      const oRes = await fetch(`/api/owned?${p.toString()}`, { credentials: "same-origin" });
      const oj = await oRes.json().catch(() => ({}));
      if (oRes.ok) setOwned(oj.owned ?? {});

      const uRes = await fetch(`/api/usage?${p.toString()}`, { credentials: "same-origin" });
      const uj = await uRes.json().catch(() => ({}));
      if (uRes.ok) setUsage(uj.usage ?? {});
    })().catch(console.error);
  }, [visible]);

  // Group by type
  const grouped = useMemo(() => {
    const by: Record<string, RingsCard[]> = {};
    for (const c of visible) {
      const t = c.type_code ?? "other";
      (by[t] ||= []).push(c);
    }
    for (const t of Object.keys(by)) {
      by[t].sort((a, b) => {
        const sa = SPHERE_ORDER.indexOf(a.sphere_code ?? "");
        const sb = SPHERE_ORDER.indexOf(b.sphere_code ?? "");
        if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
        return a.name.localeCompare(b.name);
      });
    }
    return by;
  }, [visible]);

  async function saveName() {
    await fetch(`/api/decks/${deckId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: deckName }),
    });
  }

  async function saveHeroes(next: string[]) {
    setHeroes(next);
    await fetch(`/api/decks/${deckId}/heroes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ heroes: next }),
    });
  }

  async function setDeckQty(code: string, qty: number) {
    const q = Math.max(0, Math.trunc(qty));
    setDeckCards(prev => ({ ...prev, [code]: q }));
    await fetch(`/api/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ card_code: code, qty: q }),
    });
  }

  function otherDecksFor(code: string) {
    return (usage[code] ?? []).filter(u => u.deck_id !== deckId);
  }

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0 }}>Deck</h2>

        <div className="row" style={{ gap: 10 }}>
          <input value={deckName} onChange={e => setDeckName(e.target.value)} />
          <button className="btn secondary" onClick={saveName}>Save</button>
        </div>

        <hr className="sep" />

        <h3 style={{ marginTop: 0 }}>Heroes (1–3)</h3>
        <div className="small muted" style={{ marginBottom: 8 }}>Click a Hero card in the list to add/remove here.</div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {heroes.map(h => (
            <span key={h} className="pill">
              {h}
              <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => saveHeroes(heroes.filter(x => x !== h))}>x</button>
            </span>
          ))}
        </div>

        <hr className="sep" />

        <h3 style={{ marginTop: 0 }}>Main Deck</h3>
        <div className="small muted">Quantities saved to Supabase.</div>

        <div style={{ marginTop: 10, maxHeight: 420, overflow: "auto" }}>
          {Object.entries(deckCards)
            .filter(([_, qty]) => qty > 0)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([code, qty]) => (
              <div key={code} className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <span className="small"><span className="kbd">{code}</span></span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn secondary" onClick={() => setDeckQty(code, qty - 1)}>-</button>
                  <span className="pill"><strong style={{ color: "var(--text)" }}>{qty}</strong></span>
                  <button className="btn secondary" onClick={() => setDeckQty(code, qty + 1)}>+</button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="card" style={{ flex: "1 1 auto" }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Card Pool</h2>
            <div className="small muted">Enabled packs only by default • Search/Type/Sphere filters • Shows owned + “also in other decks”</div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <select value={packChoice} onChange={e => setPackChoice(e.target.value)}>
              <option value="__enabled__">All enabled packs</option>
              {packs.map(p => (
                <option key={p.pack_code} value={p.pack_code}>
                  {p.pack_name}
                </option>
              ))}
            </select>

            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="__all__">All types</option>
              {TYPE_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={sphereFilter} onChange={e => setSphereFilter(e.target.value)}>
              <option value="__all__">All spheres</option>
              {SPHERE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name/text/traits…" />
          </div>
        </div>

        <hr className="sep" />

        {loadingCards ? (
          <div className="muted">Loading cards…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {Object.keys(grouped)
              .sort((a, b) => {
                const ia = TYPE_ORDER.indexOf(a);
                const ib = TYPE_ORDER.indexOf(b);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
              })
              .map(type => (
                <div key={type}>
                  <h3 style={{ margin: "0 0 10px 0" }}>{type}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {grouped[type].slice(0, 200).map(c => {
                      const deckQty = deckCards[c.code] ?? 0;
                      const ownedQty = owned[c.code] ?? 0;
                      const others = otherDecksFor(c.code);

                      const isHero = c.type_code === "hero";
                      const heroSelected = heroes.includes(c.code);

                      return (
                        <div key={c.code} className="row" style={{ justifyContent: "space-between", gap: 14 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            <div className="small muted">
                              {(c.sphere_name ?? c.sphere_code ?? "—")} • {(c.type_name ?? c.type_code ?? "—")} • {cardStatsLine(c)}
                            </div>
                            {(c.traits || c.text) ? (
                              <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                                {c.traits ? <div><strong>Traits:</strong> {c.traits}</div> : null}
                                {c.text ? <div style={{ marginTop: 4 }}>{c.text}</div> : null}
                              </div>
                            ) : null}

                            <div className="small muted" style={{ marginTop: 6 }}>
                              Owned: <strong style={{ color: "var(--text)" }}>{ownedQty}</strong>
                              {" • "}
                              In this deck: <strong style={{ color: "var(--text)" }}>{deckQty}</strong>
                              {others.length ? (
                                <>
                                  {" • "}
                                  Also in:{" "}
                                  {others.slice(0, 3).map((o, i) => (
                                    <span key={o.deck_id}>
                                      {i ? ", " : ""}
                                      {o.deck_name} ({o.qty}x)
                                    </span>
                                  ))}
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="row" style={{ gap: 8 }}>
                            {isHero ? (
                              <button
                                className="btn secondary"
                                onClick={() => {
                                  if (heroSelected) {
                                    saveHeroes(heroes.filter(h => h !== c.code));
                                  } else {
                                    if (heroes.length >= 3) return;
                                    saveHeroes([...heroes, c.code]);
                                  }
                                }}
                              >
                                {heroSelected ? "Remove hero" : "Add hero"}
                              </button>
                            ) : (
                              <>
                                <button className="btn secondary" onClick={() => setDeckQty(c.code, deckQty - 1)}>-</button>
                                <span className="pill"><strong style={{ color: "var(--text)" }}>{deckQty}</strong></span>
                                <button className="btn secondary" onClick={() => setDeckQty(c.code, deckQty + 1)}>+</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
