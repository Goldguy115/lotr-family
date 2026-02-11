export type RingsPack = { 
  code: string; 
  name: string; 
};

export type RingsCard = {
  code: string;
  name: string;
  pack_code: string;
  pack_name: string;
  type_code?: string;
  type_name?: string;
  sphere_code?: string;
  sphere_name?: string;
  cost?: number | string | null;
  threat?: number | null;
  willpower?: number | null;
  attack?: number | null;
  defense?: number | null;
  health?: number | null;
  traits?: string | null;
  text?: string | null;
};

export async function fetchAllPacks(): Promise<RingsPack[]> {
  const res = await fetch("https://ringsdb.com/api/public/packs/", { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`RingsDB packs failed: ${res.status}`);
  }

  const data = await res.json();

  // RingsDB sometimes returns an array, sometimes an object keyed by code.
  if (Array.isArray(data)) {
    return data as RingsPack[];
  }

  return Object.values(data) as RingsPack[];
}

export async function fetchCardsByPack(packCode: string): Promise<RingsCard[]> {
  const res = await fetch(
    `https://ringsdb.com/api/public/cards/${packCode}.json`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`RingsDB cards failed (${packCode}): ${res.status}`);
  }

  return (await res.json()) as RingsCard[];
}

const PLAYER_TYPE_CODES = new Set([
  "hero",
  "ally",
  "attachment",
  "event",
  "player-side-quest",
  "contract",
  "treasure",
]);

export function isPlayerCard(c: RingsCard): boolean {
  return !!c.type_code && PLAYER_TYPE_CODES.has(c.type_code);
}

export function cardStatsLine(c: RingsCard): string {
  if (c.type_code === "hero") {
    const wp = c.willpower ?? "–";
    const at = c.attack ?? "–";
    const df = c.defense ?? "–";
    const hp = c.health ?? "–";
    const th = c.threat ?? "–";
    return `Threat ${th} • ${wp}/${at}/${df}/${hp}`;
  }

  const cost = c.cost ?? "–";
  const parts: string[] = [`Cost ${cost}`];

  const wp = c.willpower ?? null;
  const at = c.attack ?? null;
  const df = c.defense ?? null;
  const hp = c.health ?? null;

  if (wp !== null || at !== null || df !== null || hp !== null) {
    parts.push(`${wp ?? "–"}/${at ?? "–"}/${df ?? "–"}/${hp ?? "–"}`);
  }

  return parts.join(" • ");
}
