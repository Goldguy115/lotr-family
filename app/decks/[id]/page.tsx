"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { RingsCard, cardStatsLine, fetchCardsByPack, isPlayerCard } from "@/lib/ringsdb";

type PackRow = { pack_code: string; pack_name: string; enabled: boolean };
type DeckCardRow = { card_code: string; qty: number };

const TYPE_ORDER = ["hero", "ally", "attachment", "event", "player-side-quest", "contract", "treasure"];
const SPHERE_ORDER = ["leadership", "lore", "spirit", "tactics", "neutral", "baggins", "fellowship"];

function cardImgUrl(code: string) {
  return `https://ringsdb.com/bundles/cards/${code}.png`;
}

function titleCase(s: string) {
  return s
    .split("-")
    .map(x => (x ? x[0].toUpperCase() + x.slice(1) : x))
    .join(" ");
}

function sphereLabel(code?: string | null) {
  const c = (code ?? "").toLowerCase();
  if (!c) return "Neutral";
  return titleCase(c);
}

function sphereAccent(code?: string | null) {
  switch ((code ?? "").toLowerCase()) {
    case "leadership":
      return "linear-gradient(90deg,#7b46a0,#9a6bd6)";
    case "tactics":
      return "linear-gradient(90deg,#d23c3c,#f07b7b)";
    case "spirit":
      return "linear-gradient(90deg,#4678d2,#6ea6ff)";
    case "lore":
      return "linear-gradient(90deg,#3ca05f,#6bd89a)";
    case "baggins":
      return "linear-gradient(90deg,#c8aa46,#f0d47a)";
    case "fellowship":
      return "linear-gradient(90deg,#b4b4b4,#dedede)";
    case "neutral":
    default:
      return "linear-gradient(90deg,#b4b4b4,#d0d0d0)";
  }
}

function sumSection(itemsBySphere: Record<string, { card: RingsCard; qty: number }[]>) {
  let total = 0;
  for (const s of Object.keys(itemsBySphere)) {
    const arr = itemsBySphere[s] ?? [];
    for (const it of arr) total += (it.qty ?? 0);
  }
  return total;
}

/** Small header with collapse toggle */
function TypeHeader({
  title,
  count,
  collapsed,
  onToggle,
}: {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="btn secondary"
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        background: "transparent",
      }}
      title={collapsed ? "Expand" : "Collapse"}
    >
      <span style={{ fontWeight: 900 }}>
        {title}{" "}
        <span style={{ color: "var(--muted)", fontWeight: 700 }}>
          ({count})
        </span>
      </span>
      <span style={{ opacity: 0.9, fontWeight: 900 }}>
        {collapsed ? "▸" : "▾"}
      </span>
    </button>
  );
}

type DeckThumbProps = {
  card: RingsCard;
  qty: number;
  size?: "hero" | "main" | "pool";
  // callbacks for floating preview
  onHoverStart?: (code: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  onInc?: () => void;
  onDec?: () => void;
  onRemoveHero?: () => void;
  onToggleHero?: () => void;
  topLeftBadge?: string | null;
  topLeftTitle?: string;
  warn?: boolean; // overload indicator
};

function DeckThumb({
  card,
  qty,
  size = "main",
  onHoverStart,
  onHoverEnd,
  onInc,
  onDec,
  onRemoveHero,
  onToggleHero,
  topLeftBadge,
  topLeftTitle,
  warn = false,
}: DeckThumbProps) {
  const [hover, setHover] = useState(false);
  const w = size === "hero" ? 114 : size === "pool" ? 92 : 86;

  return (
    <div
      style={{
        position: "relative",
        width: w,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: hover ? "0 10px 22px rgba(0,0,0,0.22)" : "0 6px 16px rgba(0,0,0,0.18)",
        transform: hover ? "translateY(-2px)" : "translateY(0px)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => {
        setHover(true);
        const el = e.currentTarget as HTMLElement;
        try {
          const rect = el.getBoundingClientRect();
          onHoverStart?.(card.code, rect);
        } catch {
          onHoverStart?.(card.code, new DOMRect());
        }
      }}
      onMouseLeave={() => {
        setHover(false);
        onHoverEnd?.();
      }}
    >
      <img
        src={cardImgUrl(card.code)}
        alt={card.name}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />

      {/* top-left badge (e.g., owned count) */}
      {topLeftBadge ? (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            minWidth: 26,
            height: 26,
            padding: "0 8px",
            borderRadius: 999,
            background: warn ? "linear-gradient(90deg,#b94a4a,#ff7a7a)" : "rgba(0,0,0,0.62)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 12,
            color: "white",
            lineHeight: 1,
          }}
          title={topLeftTitle ?? ""}
        >
          {topLeftBadge}
        </div>
      ) : null}

      {/* qty badge top-right */}
      {qty > 0 ? (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            minWidth: 26,
            height: 26,
            padding: "0 8px",
            borderRadius: 999,
            background: warn ? "linear-gradient(90deg,#b94a4a,#ff7a7a)" : "rgba(0,0,0,0.78)",
            border: "1px solid rgba(255,255,255,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 13,
            color: "white",
            lineHeight: 1,
          }}
          title={`In deck: ${qty}`}
        >
          {qty}
        </div>
      ) : null}

      {/* hover overlay controls (still clickable even without expansion) */}
      {(onInc || onDec || onRemoveHero || onToggleHero) ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: hover ? 1 : 0,
            pointerEvents: hover ? "auto" : "none",
            transition: "opacity 120ms ease",
            background: "linear-gradient(to top, rgba(0,0,0,0.52), rgba(0,0,0,0.08))",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {onDec ? (
              <button
                className="btn secondary"
                style={{ padding: "6px 8px", lineHeight: 1 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDec();
                }}
                title="Decrease"
              >
                −
              </button>
            ) : null}
            {onInc ? (
              <button
                className="btn secondary"
                style={{ padding: "6px 8px", lineHeight: 1 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onInc();
                }}
                title="Increase"
              >
                +
              </button>
            ) : null}
          </div>

          {onRemoveHero ? (
            <button
              className="btn secondary"
              style={{ padding: "6px 8px", lineHeight: 1 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveHero();
              }}
              title="Remove hero"
            >
              ✕
            </button>
          ) : null}

          {onToggleHero ? (
            <button
              className="btn secondary"
              style={{ padding: "6px 8px", lineHeight: 1 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleHero();
              }}
              title="Toggle hero"
            >
              Hero
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function DeckBuilder() {
  const params = useParams<{ id: string }>();
  const deckId = params.id;

  const [deckName, setDeckName] = useState("");
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [packChoice, setPackChoice] = useState<string>("__enabled__");
  const [cards, setCards] = useState<RingsCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [heroes, setHeroes] = useState<string[]>([]);
  const [deckCards, setDeckCards] = useState<Record<string, number>>({});
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [usage, setUsage] = useState<Record<string, { deck_id: string; deck_name: string; qty: number }[]>>({});

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [sphereFilter, setSphereFilter] = useState<string>("__all__");

  const [enabledIndex, setEnabledIndex] = useState<Record<string, RingsCard>>({});
  const [loadingEnabledIndex, setLoadingEnabledIndex] = useState(false);

  // hovering preview state (floating preview)
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);
  const hidePreviewTimeout = useRef<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // collapsible sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    allies: false,
    attachments: false,
    events: false,
    other: true,
  });

  // Collapsible card pool
  const [poolHidden, setPoolHidden] = useState(false);
const [importOpen, setImportOpen] = useState(false);
const [importText, setImportText] = useState("");
const [importErr, setImportErr] = useState<string | null>(null);
const [importBusy, setImportBusy] = useState(false);

  // show preview immediately (cancels hide timeout)
  function showPreview(code: string, rect: DOMRect) {
    if (hidePreviewTimeout.current) {
      window.clearTimeout(hidePreviewTimeout.current);
      hidePreviewTimeout.current = null;
    }
    setPreviewCode(code);
    setPreviewRect(rect);
    setPreviewVisible(true);
  }

  // hide preview after short delay
  function hidePreviewSoon(delay = 120) {
    if (hidePreviewTimeout.current) window.clearTimeout(hidePreviewTimeout.current);
    hidePreviewTimeout.current = window.setTimeout(() => {
      setPreviewVisible(false);
      // allow CSS transition then clear code
      window.setTimeout(() => {
        setPreviewCode(null);
        setPreviewRect(null);
      }, 160);
      hidePreviewTimeout.current = null;
    }, delay) as unknown as number;
  }

  // immediate hide
  function hidePreviewNow() {
    if (hidePreviewTimeout.current) {
      window.clearTimeout(hidePreviewTimeout.current);
      hidePreviewTimeout.current = null;
    }
    setPreviewVisible(false);
    setPreviewCode(null);
    setPreviewRect(null);
  }

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

  // Build enabledIndex (cards from enabled packs)
  useEffect(() => {
    (async () => {
      const enabledPacks = packs.filter(p => p.enabled).map(p => p.pack_code);
      if (!enabledPacks.length) {
        setEnabledIndex({});
        return;
      }

      setLoadingEnabledIndex(true);
      try {
        const map: Record<string, RingsCard> = {};
        for (const code of enabledPacks) {
          const packCards = await fetchCardsByPack(code);
          for (const c of packCards) {
            if (!isPlayerCard(c)) continue;
            map[c.code] = c;
          }
        }
        setEnabledIndex(map);
      } finally {
        setLoadingEnabledIndex(false);
      }
    })().catch(console.error);
  }, [packs]);

  // Load cards for Card Pool
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

  // Visible pool based on filters
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

  // Owned/usage for visible pool
  useEffect(() => {
    (async () => {
      const codes = visible.slice(0, 220).map(c => c.code);
      if (!codes.length) return;

      const p = new URLSearchParams();
      codes.forEach(code => p.append("code", code));

      const oRes = await fetch(`/api/owned?${p.toString()}`, { credentials: "same-origin" });
      const oj = await oRes.json().catch(() => ({}));
      if (oRes.ok) setOwned(prev => ({ ...prev, ...(oj.owned ?? {}) }));

      const uRes = await fetch(`/api/usage?${p.toString()}`, { credentials: "same-origin" });
      const uj = await uRes.json().catch(() => ({}));
      if (uRes.ok) setUsage(prev => ({ ...prev, ...(uj.usage ?? {}) }));
    })().catch(console.error);
  }, [visible]);

  // Owned/usage for deck cards & heroes too
  useEffect(() => {
    (async () => {
      const codes = [
        ...new Set([
          ...heroes,
          ...Object.entries(deckCards).filter(([_, qty]) => qty > 0).map(([code]) => code),
        ]),
      ].slice(0, 220);

      if (!codes.length) return;

      const p = new URLSearchParams();
      codes.forEach(code => p.append("code", code));

      const oRes = await fetch(`/api/owned?${p.toString()}`, { credentials: "same-origin" });
      const oj = await oRes.json().catch(() => ({}));
      if (oRes.ok) setOwned(prev => ({ ...prev, ...(oj.owned ?? {}) }));

      const uRes = await fetch(`/api/usage?${p.toString()}`, { credentials: "same-origin" });
      const uj = await uRes.json().catch(() => ({}));
      if (uRes.ok) setUsage(prev => ({ ...prev, ...(uj.usage ?? {}) }));
    })().catch(console.error);
  }, [deckCards, heroes]);

  // Pool grouped by type->sphere
  const poolByTypeSphere = useMemo(() => {
    const out: Record<string, Record<string, RingsCard[]>> = {};
    for (const c of visible) {
      const t = (c.type_code ?? "other").toLowerCase();
      const s = (c.sphere_code ?? "neutral").toLowerCase() || "neutral";
      (out[t] ||= {});
      (out[t][s] ||= []).push(c);
    }
    for (const t of Object.keys(out)) {
      for (const s of Object.keys(out[t])) {
        out[t][s].sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    return out;
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

function parseImportedText(text: string) {
  const heroesOut: string[] = [];
  const cardsOut: { card_code: string; qty: number }[] = [];

  const lines = (text ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/^deck\b/i.test(line)) continue;
    if (/^heroes?\b/i.test(line)) continue;

    const m = line.match(/^(\d+)\s*x?\s*([0-9A-Za-z]{5,})\b/);
    if (!m) continue;

    const qty = Math.max(0, Math.trunc(Number(m[1] ?? "0")));
    const code = String(m[2] ?? "").trim();
    if (!code) continue;

    if (qty === 1 && heroesOut.length < 3 && !heroesOut.includes(code)) {
      heroesOut.push(code);
      continue;
    }

    if (qty > 0) {
      cardsOut.push({ card_code: code, qty });
    }
  }

  return { heroes: heroesOut.slice(0, 3), cards: cardsOut };
}

async function runImportReplace() {

  setImportErr(null); 

  setImportBusy(true); 

  try { 

    const parsed = parseImportedText(importText); 

    if (!parsed.heroes.length && !parsed.cards.length) { 

      setImportErr("Could not find any lines like '2x 01016 ...'. Paste the export text format (qty + code)."); 

      return; 

    } 

 

    const res = await fetch(`/api/decks/${deckId}/replace`, { 

      method: "POST", 

      headers: { "content-type": "application/json" }, 

      credentials: "same-origin", 

      body: JSON.stringify(parsed), 

    }); 

 

    const j = await res.json().catch(() => ({})); 

    if (!res.ok) { 

      setImportErr(j.error ?? "Import failed"); 

      return; 

    } 

 

    // refresh deck state 

    const dRes = await fetch(`/api/decks/${deckId}`, { credentials: "same-origin" }); 

    const dj = await dRes.json().catch(() => ({})); 

    if (dRes.ok) { 

      setDeckName(dj.deck?.name ?? deckName); 

      setHeroes(dj.heroes ?? []); 

      const dc: Record<string, number> = {}; 

      for (const r of (dj.cards ?? []) as { card_code: string; qty: number }[]) dc[r.card_code] = r.qty; 

      setDeckCards(dc); 

    } 

 

    setImportOpen(false); 

    setImportText(""); 

  } finally { 

    setImportBusy(false); 

  } 

} 
function exportDeckAsText() {
  const lines: string[] = [];
  lines.push(`Deck: ${deckName}`);
  lines.push("");

  const heroCards = heroes
    .map((code) => enabledIndex[code] ?? cards.find((x) => x.code === code))
    .filter(Boolean) as RingsCard[];

  lines.push(`Heroes (${heroCards.length}):`);
  for (const h of heroCards) {
    lines.push(`1x ${h.code} ${h.name}`);
  }

  lines.push("");

  const main = Object.entries(deckCards)
    .filter(([code, qty]) => qty > 0 && !heroes.includes(code))
    .map(([code, qty]) => ({
      code,
      qty,
      card: enabledIndex[code] ?? cards.find((x) => x.code === code),
    }))
    .filter((x) => !!x.card) as { code: string; qty: number; card: RingsCard }[];

  for (const it of main.sort((a, b) => a.card.name.localeCompare(b.card.name))) {
    lines.push(`${it.qty}x ${it.code} ${it.card.name}`);
  }

  return lines.join("\n");
}


  function otherDecksFor(code: string) {
    function exportDeckAsText() {
  const lines: string[] = [];
  lines.push(`Deck: ${deckName}`);
  lines.push(``);

  const heroCards = heroes
    .map((code) => enabledIndex[code] ?? cards.find((x) => x.code === code))
    .filter(Boolean) as RingsCard[];

  lines.push(`Heroes (${heroCards.length}):`);
  for (const h of heroCards) {
    lines.push(`1x ${h.code} ${h.name}`);
  }
  lines.push(``);

  const main = Object.entries(deckCards)
    .filter(([code, qty]) => qty > 0 && !heroes.includes(code))
    .map(([code, qty]) => ({
      code,
      qty,
      card: enabledIndex[code] ?? cards.find((x) => x.code === code),
    }))
    .filter((x) => !!x.card) as { code: string; qty: number; card: RingsCard }[];

  const byType: Record<string, { code: string; qty: number; card: RingsCard }[]> = {};
  for (const it of main) {
    const t = (it.card.type_code ?? "other").toLowerCase();
    (byType[t] ||= []).push(it);
  }

  const typeOrder = ["ally", "attachment", "event", "player-side-quest", "contract", "treasure", "other"];
  for (const t of typeOrder) {
    const arr = (byType[t] ?? []).slice().sort((a, b) => a.card.name.localeCompare(b.card.name));
    if (!arr.length) continue;
    const count = arr.reduce((s, x) => s + x.qty, 0);
    lines.push(`${t.toUpperCase()} (${count}):`);
    for (const it of arr) lines.push(`${it.qty}x ${it.code} ${it.card.name}`);
    lines.push(``);
  }

  return lines.join("\n");
}

function parseImportedText(text: string): { heroes: string[]; cards: { card_code: string; qty: number }[] } {
  const heroesOut: string[] = [];
  const cardsOut: { card_code: string; qty: number }[] = [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let inHeroes = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("heroes")) {
      inHeroes = true;
      continue;
    }
    if (/\)\s*:$/i.test(line) && !lower.startsWith("heroes")) {
      inHeroes = false;
      continue;
    }

    const m = line.match(/^(\d+)\s*x\s*([0-9a-zA-Z]+)\b/);
    if (!m) continue;

    const qty = Math.max(0, Math.trunc(Number(m[1])));
    const code = String(m[2]);
    if (!qty || !code) continue;

    if (inHeroes) {
      if (!heroesOut.includes(code)) heroesOut.push(code);
    } else {
      cardsOut.push({ card_code: code, qty });
    }
  }

  return { heroes: heroesOut.slice(0, 3), cards: cardsOut };
}


    return (usage[code] ?? []).filter(u => u.deck_id !== deckId);
  }

  // derive deck hero cards and main cards (stable using enabledIndex)
  const deckHeroCards = useMemo(() => {
    const out: RingsCard[] = [];
    for (const code of heroes) {
      const c = enabledIndex[code] ?? cards.find(x => x.code === code);
      if (c) out.push(c);
    }
    return out;
  }, [heroes, enabledIndex, cards]);

  const deckMainCards = useMemo(() => {
    const out: { card: RingsCard; qty: number }[] = [];
    for (const [code, qty] of Object.entries(deckCards)) {
      if (!qty || qty <= 0) continue;
      if (heroes.includes(code)) continue;
      const c = enabledIndex[code] ?? cards.find(x => x.code === code);
      if (!c) continue;
      out.push({ card: c, qty });
    }
    out.sort((a, b) => {
      const ta = TYPE_ORDER.indexOf(a.card.type_code ?? "");
      const tb = TYPE_ORDER.indexOf(b.card.type_code ?? "");
      if (ta !== tb) return (ta === -1 ? 99 : ta) - (tb === -1 ? 99 : tb);
      const sa = SPHERE_ORDER.indexOf(a.card.sphere_code ?? "");
      const sb = SPHERE_ORDER.indexOf(b.card.sphere_code ?? "");
      if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
      return a.card.name.localeCompare(b.card.name);
    });
    return out;
  }, [deckCards, heroes, enabledIndex, cards]);

  const deckSections = useMemo(() => {
    type SectionKey = "ally" | "attachment" | "event" | "other";
    const by: Record<SectionKey, Record<string, { card: RingsCard; qty: number }[]>> = {
      ally: {},
      attachment: {},
      event: {},
      other: {},
    };

    for (const item of deckMainCards) {
      const t = (item.card.type_code ?? "other").toLowerCase();
      const section: SectionKey =
        t === "ally" ? "ally" :
        t === "attachment" ? "attachment" :
        t === "event" ? "event" :
        "other";

      const sphere = (item.card.sphere_code ?? "neutral").toLowerCase() || "neutral";
      (by[section][sphere] ||= []).push(item);
    }

    for (const sec of Object.keys(by) as SectionKey[]) {
      for (const sphere of Object.keys(by[sec])) {
        by[sec][sphere].sort((a, b) => a.card.name.localeCompare(b.card.name));
      }
    }

    return by;
  }, [deckMainCards]);

  // main deck size (heroes excluded)
  const mainDeckSize = useMemo(() => {
    let sum = 0;
    for (const [code, qty] of Object.entries(deckCards)) {
      if (!qty || qty <= 0) continue;
      if (heroes.includes(code)) continue;
      sum += qty;
    }
    return sum;
  }, [deckCards, heroes]);

  // counts for collapsible headers
  const alliesCount = useMemo(() => sumSection(deckSections.ally), [deckSections]);
  const attachmentsCount = useMemo(() => sumSection(deckSections.attachment), [deckSections]);
  const eventsCount = useMemo(() => sumSection(deckSections.event), [deckSections]);
  const otherCount = useMemo(() => sumSection(deckSections.other), [deckSections]);

  // --- Phase A: Stats / buckets / avg cost
  const sphereCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [code, qty] of Object.entries(deckCards)) {
      if (!qty || qty <= 0) continue;
      if (heroes.includes(code)) continue;
      const c = enabledIndex[code] ?? cards.find(x => x.code === code);
      if (!c) continue;
      const s = (c.sphere_code ?? "neutral").toLowerCase();
      out[s] = (out[s] || 0) + qty;
    }
    return out;
  }, [deckCards, heroes, enabledIndex, cards]);

  const typeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [code, qty] of Object.entries(deckCards)) {
      if (!qty || qty <= 0) continue;
      if (heroes.includes(code)) continue;
      const c = enabledIndex[code] ?? cards.find(x => x.code === code);
      if (!c) continue;
      const t = (c.type_code ?? "other").toLowerCase();
      out[t] = (out[t] || 0) + qty;
    }
    return out;
  }, [deckCards, heroes, enabledIndex, cards]);

  const avgCost = useMemo(() => {
    let totalCost = 0;
    let totalQty = 0;
    for (const [code, qty] of Object.entries(deckCards)) {
      if (!qty || qty <= 0) continue;
      if (heroes.includes(code)) continue;
      const c = enabledIndex[code] ?? cards.find(x => x.code === code);
      const cost = c && typeof (c as any).cost === "number" ? (c as any).cost : null;
      if (cost === null || cost === undefined) continue;
      totalCost += cost * qty;
      totalQty += qty;
    }
    return totalQty ? totalCost / totalQty : null;
  }, [deckCards, heroes, enabledIndex, cards]);

  const costBuckets = useMemo(() => {
    const buckets: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
    for (const [code, qty] of Object.entries(deckCards)) {
      if (!qty || qty <= 0) continue;
      if (heroes.includes(code)) continue;
      const c = enabledIndex[code] ?? cards.find(x => x.code === code);
      const cost = c && typeof (c as any).cost === "number" ? (c as any).cost : null;
      if (cost === null || cost === undefined) continue;
      if (cost >= 5) buckets["5+"] += qty;
      else buckets[String(Math.max(0, Math.trunc(cost)))] += qty;
    }
    return buckets;
  }, [deckCards, heroes, enabledIndex, cards]);

  // small helper to determine overload for a code
  function isOverloaded(code: string) {
    const ownedQty = owned[code] ?? 0;
    const deckQty = deckCards[code] ?? 0;
    return deckQty > ownedQty;
  }

  return (
    <div style={{ display: "block" }}>
      {/* LEFT: deck + pool */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "nowrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Deck card */}
          <div className="card" style={{ paddingBottom: 14 }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ marginTop: 0, marginBottom: 6 }}>
                  Deck{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 700, fontSize: 14 }}>
                    ({mainDeckSize})
                  </span>
                </h2>
                <div className="small muted">
                  Main deck size: <strong style={{ color: "var(--text)" }}>{mainDeckSize}</strong> (heroes excluded)
                  {loadingEnabledIndex ? " • Loading enabled packs…" : ""}
                </div>

                {/* --- STATS PANEL --- */}
                <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.02)", fontWeight: 800 }}>
                    Cards: <strong>{mainDeckSize}</strong>
                  </div>

                  <div style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.02)", fontWeight: 800 }}>
                    Avg cost: <strong>{avgCost === null ? "—" : avgCost.toFixed(2)}</strong>
                  </div>

                  {/* sphere chips */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {Object.entries(sphereCounts).map(([sphere, count]) => (
                      <div key={sphere} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: sphereAccent(sphere) }} />
                        <div className="small muted" style={{ fontWeight: 700 }}>{sphereLabel(sphere)} {count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* resource curve */}
                <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
                  {["0","1","2","3","4","5+"].map(k => (
                    <div key={k} style={{ textAlign: "center", width: 40 }}>
                      <div style={{ fontWeight: 900 }}>{costBuckets[k]}</div>
                      <div className="small muted">{k}</div>
                    </div>
                  ))}
                </div>
                {/* --- end stats --- */}
              </div>

              <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
  <input value={deckName} onChange={e => setDeckName(e.target.value)} />
  <button className="btn secondary" onClick={saveName}>Save</button>

  <button
    className="btn secondary"
    onClick={async () => {
      const text = exportDeckAsText();
      await navigator.clipboard.writeText(text);
    }}
  >
    Copy as text
  </button>

  <button className="btn secondary" onClick={() => setImportOpen(true)}>
    Import
  </button>
</div>
            </div>

            <hr className="sep" />

            {/* Heroes */}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px 0" }}>
                Heroes{" "}
                {deckHeroCards.length ? (
                  <span style={{ color: "var(--muted)", fontWeight: 700 }}>({deckHeroCards.length})</span>
                ) : null}
              </h3>

              {deckHeroCards.length ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {deckHeroCards.map(hc => (
                    <div key={hc.code} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <DeckThumb
                        card={hc}
                        qty={1}
                        size="hero"
                        onHoverStart={(code, rect) => showPreview(code, rect)}
                        onHoverEnd={() => hidePreviewSoon()}
                        onRemoveHero={() => saveHeroes(heroes.filter(x => x !== hc.code))}
                        topLeftBadge={String(owned[hc.code] ?? 0)}
                        topLeftTitle={`Owned: ${owned[hc.code] ?? 0}`}
                        warn={isOverloaded(hc.code)}
                      />
                      <div
                        className="small"
                        style={{
                          maxWidth: 114,
                          textAlign: "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          opacity: 0.95,
                        }}
                        title={hc.name}
                      >
                        {hc.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No heroes selected yet.</div>
              )}
            </div>

            <hr className="sep" />

            {/* Collapsible sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <TypeHeader
                title="Allies"
                count={alliesCount}
                collapsed={!!collapsed.allies}
                onToggle={() => setCollapsed(prev => ({ ...prev, allies: !prev.allies }))}
              />
              {!collapsed.allies ? (
                <DeckTypeSection
                  title="Allies"
                  itemsBySphere={deckSections.ally}
                  onHover={(code, rect) => showPreview(code, rect)}
                  onHoverEnd={() => hidePreviewSoon()}
                  onInc={(code) => setDeckQty(code, (deckCards[code] ?? 0) + 1)}
                  onDec={(code) => setDeckQty(code, (deckCards[code] ?? 0) - 1)}
                />
              ) : null}

              <TypeHeader
                title="Attachments"
                count={attachmentsCount}
                collapsed={!!collapsed.attachments}
                onToggle={() => setCollapsed(prev => ({ ...prev, attachments: !prev.attachments }))}
              />
              {!collapsed.attachments ? (
                <DeckTypeSection
                  title="Attachments"
                  itemsBySphere={deckSections.attachment}
                  onHover={(code, rect) => showPreview(code, rect)}
                  onHoverEnd={() => hidePreviewSoon()}
                  onInc={(code) => setDeckQty(code, (deckCards[code] ?? 0) + 1)}
                  onDec={(code) => setDeckQty(code, (deckCards[code] ?? 0) - 1)}
                />
              ) : null}

              <TypeHeader
                title="Events"
                count={eventsCount}
                collapsed={!!collapsed.events}
                onToggle={() => setCollapsed(prev => ({ ...prev, events: !prev.events }))}
              />
              {!collapsed.events ? (
                <DeckTypeSection
                  title="Events"
                  itemsBySphere={deckSections.event}
                  onHover={(code, rect) => showPreview(code, rect)}
                  onHoverEnd={() => hidePreviewSoon()}
                  onInc={(code) => setDeckQty(code, (deckCards[code] ?? 0) + 1)}
                  onDec={(code) => setDeckQty(code, (deckCards[code] ?? 0) - 1)}
                />
              ) : null}

              {Object.keys(deckSections.other).length ? (
                <>
                  <TypeHeader
                    title="Other"
                    count={otherCount}
                    collapsed={!!collapsed.other}
                    onToggle={() => setCollapsed(prev => ({ ...prev, other: !prev.other }))}
                  />
                  {!collapsed.other ? (
                    <DeckTypeSection
                      title="Other"
                      itemsBySphere={deckSections.other}
                      onHover={(code, rect) => showPreview(code, rect)}
                      onHoverEnd={() => hidePreviewSoon()}
                      onInc={(code) => setDeckQty(code, (deckCards[code] ?? 0) + 1)}
                      onDec={(code) => setDeckQty(code, (deckCards[code] ?? 0) - 1)}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {/* Card Pool - thumbnail grid */}
          {!poolHidden ? (
            <div className="card" style={{ flex: "1 1 auto" }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ marginTop: 0, marginBottom: 6 }}>Card Pool</h2>
                  <div className="small muted">
                    Thumbnail grid • Hover for preview • +/− to add/remove • Heroes: toggle hero selection
                  </div>
                </div>

                <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn secondary" onClick={() => setPoolHidden(true)}>
                    Hide Card Pool
                  </button>

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

                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" />
                </div>
              </div>

              <hr className="sep" />

              {loadingCards ? (
                <div className="muted">Loading cards…</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.keys(poolByTypeSphere)
                    .sort((a, b) => {
                      const ia = TYPE_ORDER.indexOf(a);
                      const ib = TYPE_ORDER.indexOf(b);
                      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                    })
                    .map(type => (
                      <PoolTypeSection
                        key={type}
                        type={type}
                        itemsBySphere={poolByTypeSphere[type]}
                        onHover={(code, rect) => showPreview(code, rect)}
                        onHoverEnd={() => hidePreviewSoon()}
                        deckQtyFor={(code) => deckCards[code] ?? 0}
                        ownedFor={(code) => owned[code] ?? 0}
                        isHeroSelected={(code) => heroes.includes(code)}
                        onToggleHero={(code) => {
                          if (heroes.includes(code)) {
                            saveHeroes(heroes.filter(h => h !== code));
                          } else {
                            if (heroes.length >= 3) return;
                            saveHeroes([...heroes, code]);
                          }
                        }}
                        onInc={(code) => setDeckQty(code, (deckCards[code] ?? 0) + 1)}
                        onDec={(code) => setDeckQty(code, (deckCards[code] ?? 0) - 1)}
                      />
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              <button className="btn" onClick={() => setPoolHidden(false)}>Show Card Pool</button>
            </div>
          )}
        </div>

        {/* small spacer (keeps area free for floating preview) */}
        <div style={{ width: 12 }} />
      </div>

      {/* Floating hover preview + backdrop (fade & scale) */}
      {previewCode && previewRect ? (
        <>
          {/* backdrop that blurs a little; keep it low z so panel sits above */}
          <div
            onMouseEnter={() => {
              if (hidePreviewTimeout.current) {
                window.clearTimeout(hidePreviewTimeout.current);
                hidePreviewTimeout.current = null;
              }
            }}
            onMouseLeave={() => {
              hidePreviewSoon();
            }}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              zIndex: 2100,
              pointerEvents: "none",
              backdropFilter: "none",
              transition: "backdrop-filter 160ms ease, opacity 160ms ease",
              opacity: previewVisible ? 1 : 0,
            }}
          />

          {(() => {
            const padding = 12;
            const panelW = Math.min(420, window.innerWidth * 0.44);
            const panelH = Math.min(window.innerHeight * 0.72, 680);
            const gap = 12;

            let left = previewRect.right + gap;
            let top = previewRect.top - 40;
            if (left + panelW + padding > window.innerWidth) {
              left = previewRect.left - panelW - gap;
            }
            if (top + panelH + padding > window.innerHeight) top = window.innerHeight - panelH - padding;
            if (top < padding) top = padding;

            const pCard = (enabledIndex[previewCode] ?? cards.find(x => x.code === previewCode)) ?? null;
            if (!pCard) return null;

            return (
              <div
                onMouseEnter={() => {
                  if (hidePreviewTimeout.current) {
                    window.clearTimeout(hidePreviewTimeout.current);
                    hidePreviewTimeout.current = null;
                  }
                }}
                onMouseLeave={() => {
                  hidePreviewSoon();
                }}
                style={{
                  position: "fixed",
                  left,
                  top,
                  width: panelW,
                  maxHeight: panelH,
                  borderRadius: 12,
                  padding: 10,
                  background: "rgba(18,18,18,0.98)",
                  boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
                  zIndex: 2200,
                  overflow: "auto",
                  color: "white",
                  transition: "opacity 160ms ease, transform 160ms ease",
                  opacity: previewVisible ? 1 : 0,
                  transform: previewVisible ? "translateY(0) scale(1)" : "translateY(6px) scale(0.98)",
                }}
              >
                <img
                  src={cardImgUrl(pCard.code)}
                  alt={pCard.name}
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: panelH * 0.62,
                    objectFit: "contain",
                    borderRadius: 8,
                    display: "block",
                  }}
                  loading="lazy"
                />

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{pCard.name}</div>
                  <div className="small muted" style={{ marginTop: 6, opacity: 0.95 }}>
                    {(pCard.sphere_name ?? pCard.sphere_code ?? "—")} • {(pCard.type_name ?? pCard.type_code ?? "—")} • {cardStatsLine(pCard)}
                  </div>

                  <div className="small muted" style={{ marginTop: 8 }}>
                    Owned: <strong style={{ color: "var(--text)" }}>{owned[pCard.code] ?? 0}</strong>
                    {" • "}
                    In this deck: <strong style={{ color: "var(--text)" }}>{deckCards[pCard.code] ?? (heroes.includes(pCard.code) ? 1 : 0)}</strong>
                  </div>

                  {otherDecksFor(pCard.code).length ? (
                    <div className="small muted" style={{ marginTop: 8 }}>
                      Also in:{" "}
                      {otherDecksFor(pCard.code).slice(0, 6).map((o, i) => (
                        <span key={o.deck_id}>
                          {i ? ", " : ""}
                          {o.deck_name} ({o.qty}x)
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </>
      ) : null}
       {importOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 5000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => { if (!importBusy) setImportOpen(false); }}
        >
          <div
            className="card"
            style={{ width: "min(860px, 96vw)", maxHeight: "88vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Import deck (Replace)</h2>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{ width: "100%", minHeight: 280 }}
            />

            {importErr ? (
              <div style={{ color: "salmon", marginTop: 10 }}>{importErr}</div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
              <button
                className="btn secondary"
                onClick={() => setImportOpen(false)}
                disabled={importBusy}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={runImportReplace}
                disabled={importBusy}
              >
                {importBusy ? "Importing…" : "Import (Replace)"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** DeckTypeSection: renders sphere columns (overflow visible so floating preview isn't clipped) */
function DeckTypeSection(props: {
  title: string;
  itemsBySphere: Record<string, { card: RingsCard; qty: number }[]>;
  onHover: (code: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  onInc: (code: string) => void;
  onDec: (code: string) => void;
}) {
  const { itemsBySphere, onHover, onHoverEnd, onInc, onDec } = props;

  const spheres = Object.keys(itemsBySphere)
    .filter(s => (itemsBySphere[s]?.length ?? 0) > 0)
    .sort((a, b) => {
      const ia = SPHERE_ORDER.indexOf(a);
      const ib = SPHERE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  if (!spheres.length) return <div className="muted small" style={{ marginTop: 8 }}>No cards yet.</div>;

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: `repeat(${Math.min(5, spheres.length)}, minmax(170px, 1fr))`,
        alignItems: "start",
        marginTop: 10,
      }}
    >
      {spheres.map(sphere => {
        const items = itemsBySphere[sphere] ?? [];
        const sphereCount = items.reduce((sum, it) => sum + (it.qty ?? 0), 0);

        return (
          <div
            key={sphere}
            style={{
              borderRadius: 14,
              padding: 0,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "visible", // allow floating preview to show
            }}
          >
            <div style={{ height: 8, background: sphereAccent(sphere) }} />
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                {sphereLabel(sphere)}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>({sphereCount})</span>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {items.map(({ card, qty }) => (
                  <DeckThumb
                    key={card.code}
                    card={card}
                    qty={qty}
                    onHoverStart={(code, rect) => onHover(code, rect)}
                    onHoverEnd={() => onHoverEnd?.()}
                    onInc={() => onInc(card.code)}
                    onDec={() => onDec(card.code)}
                    topLeftBadge={String((window && (window as any).__ownedCache?.[card.code]) ?? "")}
                    topLeftTitle={`Owned: ${String((window && (window as any).__ownedCache?.[card.code]) ?? "")}`}
                    warn={false}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** PoolTypeSection: pool thumbnail grid by sphere (overflow visible) */
function PoolTypeSection(props: {
  type: string;
  itemsBySphere: Record<string, RingsCard[]>;
  onHover: (code: string, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  deckQtyFor: (code: string) => number;
  ownedFor: (code: string) => number;
  isHeroSelected: (code: string) => boolean;
  onToggleHero: (code: string) => void;
  onInc: (code: string) => void;
  onDec: (code: string) => void;
}) {
  const { type, itemsBySphere, onHover, onHoverEnd, deckQtyFor, ownedFor, isHeroSelected, onToggleHero, onInc, onDec } = props;

  const spheres = Object.keys(itemsBySphere)
    .filter(s => (itemsBySphere[s]?.length ?? 0) > 0)
    .sort((a, b) => {
      const ia = SPHERE_ORDER.indexOf(a);
      const ib = SPHERE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  const typeCount = spheres.reduce((acc, s) => acc + (itemsBySphere[s]?.length ?? 0), 0);

  return (
    <div>
      <h3 style={{ margin: "0 0 10px 0" }}>
        {type} <span style={{ color: "var(--muted)", fontWeight: 700 }}>({typeCount})</span>
      </h3>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: `repeat(${Math.min(5, spheres.length)}, minmax(190px, 1fr))`,
          alignItems: "start",
        }}
      >
        {spheres.map(sphere => {
          const list = itemsBySphere[sphere] ?? [];
          return (
            <div
              key={sphere}
              style={{
                borderRadius: 14,
                padding: 0,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "visible", // allow floating preview
              }}
            >
              <div style={{ height: 8, background: sphereAccent(sphere) }} />
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  {sphereLabel(sphere)} <span style={{ color: "var(--muted)", fontWeight: 700 }}>({list.length})</span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {list.slice(0, 160).map(c => {
                    const inDeck = deckQtyFor(c.code);
                    const owned = ownedFor(c.code);
                    const isHero = (c.type_code ?? "").toLowerCase() === "hero";
                    const heroSel = isHeroSelected(c.code);
                    const overload = inDeck > (owned || 0);

                    return (
                      <DeckThumb
                        key={c.code}
                        card={c}
                        qty={isHero ? (heroSel ? 1 : 0) : inDeck}
                        size="pool"
                        onHoverStart={(code, rect) => onHover(code, rect)}
                        onHoverEnd={() => onHoverEnd?.()}
                        topLeftBadge={owned ? String(owned) : null}
                        topLeftTitle={`Owned: ${owned}`}
                        warn={!!overload}
                        onInc={!isHero ? () => onInc(c.code) : undefined}
                        onDec={!isHero ? () => onDec(c.code) : undefined}
                        onToggleHero={isHero ? () => onToggleHero(c.code) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
