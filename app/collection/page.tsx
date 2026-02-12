"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCardsByPack, isPlayerCard, cardStatsLine, RingsCard } from "@/lib/ringsdb";

type PackRow = { pack_code: string; pack_name: string; enabled: boolean };

export default function CollectionPage() {
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [packCards, setPackCards] = useState<RingsCard[]>([]);
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [packSearch, setPackSearch] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Load packs
  useEffect(() => {
    (async () => {
      setLoading(true);
      setAuthError(null);

      const me = await fetch("/api/me", { credentials: "same-origin" });
      if (!me.ok) {
        setAuthError("Not logged in. Go to /login.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/packs", { credentials: "same-origin" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(j.error ?? "Failed to load packs");
        setLoading(false);
        return;
      }

      const packRows: PackRow[] = j.packs ?? [];
      setPacks(packRows);

      // Select first enabled pack by default
      const firstEnabled = packRows.find(p => p.enabled)?.pack_code ?? null;
      setSelectedPack(firstEnabled);

      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setAuthError(String(e.message ?? e));
      setLoading(false);
    });
  }, []);

  // Load cards + owned for selected pack
  useEffect(() => {
    if (!selectedPack) {
      setPackCards([]);
      setOwned({});
      return;
    }

    (async () => {
      const me = await fetch("/api/me", { credentials: "same-origin" });
      if (!me.ok) return;

      const cards = await fetchCardsByPack(selectedPack);
      const playerCards = cards.filter(isPlayerCard);
      setPackCards(playerCards);

      // owned quantities for these cards
      const params = new URLSearchParams();
      for (const c of playerCards) params.append("code", c.code);

      const res = await fetch(`/api/owned?${params.toString()}`, { credentials: "same-origin" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("owned load failed", j);
        setOwned({});
        return;
      }
      setOwned(j.owned ?? {});
    })().catch(console.error);
  }, [selectedPack]);

  const filteredPacks = useMemo(() => {
    const q = packSearch.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter(
      p => p.pack_name.toLowerCase().includes(q) || p.pack_code.toLowerCase().includes(q)
    );
  }, [packs, packSearch]);

  async function togglePack(pack_code: string, enabled: boolean) {
    const res = await fetch("/api/packs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ pack_code, enabled }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("update pack failed", j);
      alert(j.error ?? "Failed to update pack");
      return;
    }

    setPacks(prev => prev.map(p => (p.pack_code === pack_code ? { ...p, enabled } : p)));

    if (enabled && !selectedPack) setSelectedPack(pack_code);
    if (!enabled && selectedPack === pack_code) {
      const next = packs.find(p => p.pack_code !== pack_code && p.enabled)?.pack_code ?? null;
      setSelectedPack(next);
    }
  }

  async function setOwnedQty(card_code: string, qty: number) {
    const clamped = Math.max(0, Math.trunc(qty));
    setOwned(prev => ({ ...prev, [card_code]: clamped }));

    const res = await fetch("/api/owned", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ card_code, owned_qty: clamped }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("save owned failed", j);
      alert(j.error ?? "Failed to save owned qty");
    }
  }

  if (loading) return <div className="card">Loading…</div>;

  if (authError) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Login required</h2>
        <p className="muted">{authError}</p>
        <p className="muted">Open <code>/login</code> and enter the family passcode.</p>
      </div>
    );
  }

  const selectedPackName =
    selectedPack ? (packs.find(p => p.pack_code === selectedPack)?.pack_name ?? selectedPack) : "Select a pack";

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0 }}>Expansions</h2>
        <p className="small">Enable packs you own. Select a pack to edit owned card quantities.</p>

        <input
          value={packSearch}
          onChange={(e) => setPackSearch(e.target.value)}
          placeholder="Search packs…"
          style={{ width: "100%" }}
        />

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflow: "auto" }}>
          {filteredPacks.map(p => (
            <label key={p.pack_code} className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.pack_name}
                </div>
                <div className="small">{p.pack_code}</div>
              </div>

              <div className="row" style={{ gap: 8 }}>
                <button className="btn secondary" onClick={() => setSelectedPack(p.pack_code)}>View</button>
                <input type="checkbox" checked={p.enabled} onChange={(e) => togglePack(p.pack_code, e.target.checked)} />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: "1 1 auto" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>{selectedPackName}</h2>
            <div className="small muted">
              Showing player cards only • Owned quantities are stored in Supabase
            </div>
          </div>

          <div className="pill">
            Cards: <strong style={{ color: "var(--text)" }}>{packCards.length}</strong>
          </div>
        </div>

        <hr className="sep" />

        {!selectedPack ? (
          <div className="muted">Enable and select a pack to view its cards.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {packCards.map(c => {
              const qty = owned[c.code] ?? 0;

              const imgUrl = `https://ringsdb.com/bundles/cards/${c.code}.png`;


              return (
                <div key={c.code} className="row" style={{ justifyContent: "space-between", gap: 14 }}>
                  <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
                    {/* Card image */}
                    <img
                      src={imgUrl}
                      alt={c.name}
                      style={{
                        width: 160,
                        height: "auto",
                        borderRadius: 12,
                        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                        flex: "0 0 auto",
                      }}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />

                    {/* Text details */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{c.name}</div>

                      <div className="small muted" style={{ marginTop: 4 }}>
                        {(c.sphere_name ?? c.sphere_code ?? "—")} •{" "}
                        {(c.type_name ?? c.type_code ?? "—")} •{" "}
                        {cardStatsLine(c)}
                      </div>

                      {(c.traits || c.text) ? (
                        <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                          {c.traits ? <div><strong>Traits:</strong> {c.traits}</div> : null}
                          {c.text ? <div style={{ marginTop: 4 }}>{c.text}</div> : null}
                        </div>
                      ) : null}

                      <div className="small muted" style={{ marginTop: 6 }}>
                        Code: <span className="kbd">{c.code}</span>
                      </div>
                    </div>
                  </div>

                  {/* Owned controls */}
                  <div className="row" style={{ gap: 8, flex: "0 0 auto" }}>
                    <button className="btn secondary" onClick={() => setOwnedQty(c.code, qty - 1)}>-</button>
                    <span className="pill" style={{ minWidth: 70, justifyContent: "center" }}>
                      <strong style={{ color: "var(--text)" }}>{qty}</strong>
                    </span>
                    <button className="btn secondary" onClick={() => setOwnedQty(c.code, qty + 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
