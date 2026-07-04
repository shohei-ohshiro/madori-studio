import {
  FloorKey,
  Furniture,
  FurnitureType,
  FURNITURE_CATALOG,
  Opening,
  Plan,
  Room,
  ROOM_COLORS,
  normalizePlan,
  snap,
  uid,
} from "@/lib/plan";

/**
 * おまかせ生成エンジン（ルールベース・レーン1）。
 * Brief（間取りタイプ×暮らし×テイスト×seed）から完成済みの Plan を決定的に生成する。
 * seed を変えるだけで別案が出るので「3案ガチャ」に使う。
 */

export type LayoutKind = "1R" | "1LDK" | "2LDK" | "luna";
export type Household = "single" | "couple" | "family";
export type Taste = "natural" | "monotone" | "nordic" | "vintage";

export type Brief = {
  layout: LayoutKind;
  household: Household;
  taste: Taste;
  seed: number;
};

export const LAYOUT_LABELS: Record<LayoutKind, string> = {
  "1R": "ワンルーム",
  "1LDK": "1LDK",
  "2LDK": "2LDK",
  luna: "LUNAコース",
};

export const HOUSEHOLD_LABELS: Record<Household, string> = {
  single: "ひとり",
  couple: "ふたり",
  family: "ファミリー",
};

export const TASTE_LABELS: Record<Taste, string> = {
  natural: "ナチュラル",
  monotone: "モノトーン",
  nordic: "北欧グリーン",
  vintage: "ヴィンテージ",
};

/** テイスト別パレット。色は既存カタログの colorVariants の範囲から選ぶ */
type Palette = {
  floor: FloorKey;
  sofa: string;
  rug: string;
  wood: string;
  bed: string;
  desk: string;
};

const PALETTES: Record<Taste, Palette> = {
  natural: { floor: "flooring-light", sofa: "#d6b28a", rug: "#e8ddc9", wood: "#c4a880", bed: "#d6b28a", desk: "#d9a97e" },
  monotone: { floor: "carpet-gray", sofa: "#1e293b", rug: "#e2e8f0", wood: "#475569", bed: "#475569", desk: "#475569" },
  nordic: { floor: "flooring-light", sofa: "#86efac", rug: "#4d7c0f", wood: "#e7d3ae", bed: "#e2e8f0", desk: "#e7d3ae" },
  vintage: { floor: "flooring-dark", sofa: "#94a3b8", rug: "#7f1d1d", wood: "#8a6a45", bed: "#d6b28a", desk: "#d9a97e" },
};

/** 再現可能な乱数（mulberry32） */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

function between(r: Rand, min: number, max: number): number {
  return snap(min + r() * (max - min));
}

type Rect = { x: number; y: number; w: number; h: number };

function overlaps(a: Rect, b: Rect, margin = 0.02): boolean {
  return (
    a.x < b.x + b.w + margin &&
    b.x < a.x + a.w + margin &&
    a.y < b.y + b.h + margin &&
    b.y < a.y + a.h + margin
  );
}

/** 敷物系（上に他の家具が乗ってよい・衝突判定しない） */
const FLAT_TYPES: ReadonlySet<FurnitureType> = new Set<FurnitureType>(["rug", "mat", "airtrack", "hoop", "ladder"]);

/** 部屋の内側に収まっていて既存家具と重ならない場合だけ配置する */
class Placer {
  placed: Rect[] = [];
  items: Furniture[] = [];
  constructor(private room: Room, private inset = 0.25) {}

  private fits(rect: Rect, flat: boolean): boolean {
    const r = this.room;
    // スナップ丸め（±半グリッド=0.125）で壁際アンカーが弾かれないよう許容
    const eps = 0.13;
    if (rect.x < r.x + this.inset - eps || rect.y < r.y + this.inset - eps) return false;
    if (rect.x + rect.w > r.x + r.w - this.inset + eps) return false;
    if (rect.y + rect.h > r.y + r.h - this.inset + eps) return false;
    // 敷物は部屋に収まりさえすればよい。実体のある家具同士だけ衝突判定
    return flat || !this.placed.some((p) => overlaps(p, rect));
  }

  /** x,y は部屋ローカル座標。置けたら true */
  put(type: FurnitureType, lx: number, ly: number, opts: { variant?: string; color?: string; w?: number; h?: number } = {}): boolean {
    const c = FURNITURE_CATALOG[type];
    const v = opts.variant ? c.variants?.find((x) => x.label === opts.variant) : undefined;
    const w = opts.w ?? v?.w ?? c.w;
    const h = opts.h ?? v?.h ?? c.h;
    const rect = { x: snap(this.room.x + lx), y: snap(this.room.y + ly), w, h };
    const flat = FLAT_TYPES.has(type);
    if (!this.fits(rect, flat)) return false;
    if (!flat) this.placed.push(rect);
    this.items.push({ id: uid(), type, x: rect.x, y: rect.y, w, h, rot: 0, variant: opts.variant, color: opts.color });
    return true;
  }

  /** 内寸 */
  get iw(): number {
    return this.room.w - this.inset * 2;
  }
  get ih(): number {
    return this.room.h - this.inset * 2;
  }
}

function dimsOf(type: FurnitureType, variant?: string): { w: number; h: number } {
  const c = FURNITURE_CATALOG[type];
  const v = variant ? c.variants?.find((x) => x.label === variant) : undefined;
  return { w: v?.w ?? c.w, h: v?.h ?? c.h };
}

/** LDK/ワンルーム: ソファは上壁沿い（背面が壁・正面が部屋の中心を向く3D形状） */
function fillLiving(room: Room, brief: Brief, r: Rand, withDining: boolean): Furniture[] {
  const p = new Placer(room);
  const pal = PALETTES[brief.taste];
  const inset = 0.25;

  const sofaVariant = brief.household === "single" ? "1人掛け" : brief.household === "couple" ? "2人掛け" : "3人掛け";
  const sofa = dimsOf("sofa", sofaVariant);
  const sofaLx = snap(inset + r() * Math.max(0, p.iw * 0.4 - sofa.w * 0.5));
  p.put("sofa", sofaLx, inset, { variant: sofaVariant, color: pal.sofa });

  const rugVariant = brief.household === "family" ? "L(250×200)" : "M(200×140)";
  const rug = dimsOf("rug", rugVariant);
  const rugLx = snap(sofaLx + sofa.w / 2 - rug.w / 2);
  const rugLy = snap(inset + sofa.h + 0.15);
  p.put("rug", Math.max(inset, rugLx), rugLy, { variant: rugVariant, color: pal.rug });

  const low = dimsOf("table", "ローテーブル");
  p.put("table", snap(Math.max(inset, rugLx) + rug.w / 2 - low.w / 2), snap(rugLy + rug.h / 2 - low.h / 2), {
    variant: "ローテーブル",
    color: pal.wood,
  });

  const tvVariant = room.w >= 5 ? "150cm" : "120cm";
  const tv = dimsOf("tv", tvVariant);
  p.put("tv", snap(sofaLx + sofa.w / 2 - tv.w / 2), snap(room.h - inset - tv.h), { variant: tvVariant });

  if (withDining && p.iw >= 3.6) {
    const tableVariant = brief.household === "single" ? "2人用" : brief.household === "couple" ? "4人用" : "6人用";
    const dt = dimsOf("table", tableVariant);
    const dtLx = snap(room.w - inset - dt.w - 0.2);
    const dtLy = snap(room.h / 2 - dt.h / 2 + 0.4);
    if (p.put("table", dtLx, dtLy, { variant: tableVariant, color: pal.wood })) {
      const seats = brief.household === "single" ? 1 : 2;
      for (let i = 0; i < seats; i++) {
        p.put("chair", snap(dtLx + 0.15 + i * 0.7), snap(dtLy - 0.55), { variant: "ダイニングチェア", color: pal.wood });
      }
    }
  }

  p.put("floorlamp", snap(sofaLx + sofa.w + 0.2), inset, { variant: "ミドル" });
  p.put("shelf", inset, snap(room.h / 2 - 0.2), { variant: "ローシェルフ", color: pal.wood });
  const plantVariant = r() > 0.5 ? "L(シンボルツリー)" : "M";
  const plant = dimsOf("plant", plantVariant);
  p.put("plant", snap(room.w - inset - plant.w), snap(room.h - inset - plant.h - tvDodge(room, plant)), { variant: plantVariant });

  return p.items;
}

/** テレビ台と植物が同じ下壁で衝突しないための逃げ幅 */
function tvDodge(room: Room, plant: { w: number; h: number }): number {
  return room.w < 4.6 ? plant.h + 0.5 : 0;
}

/** 寝室: ベッドは左壁沿い（ヘッドボードが壁側を向く3D形状） */
function fillBedroom(room: Room, brief: Brief, r: Rand): Furniture[] {
  const p = new Placer(room);
  const pal = PALETTES[brief.taste];
  const inset = 0.25;

  const bedVariant = brief.household === "single" ? "シングル" : brief.household === "couple" ? "ダブル" : "クイーン";
  const bed = dimsOf("bed", bedVariant);
  p.put("bed", inset, snap(room.h / 2 - bed.h / 2), { variant: bedVariant, color: pal.bed });

  const wr = dimsOf("wardrobe", "幅120");
  p.put("wardrobe", snap(room.w - inset - wr.w), inset, { variant: "幅120", color: pal.wood });
  const chest = dimsOf("chest");
  p.put("chest", snap(room.w - inset - chest.w), snap(room.h - inset - chest.h), { color: pal.wood });
  p.put("tablelamp", snap(inset + bed.w + 0.1), snap(room.h / 2 - bed.h / 2), {});
  if (r() > 0.4) p.put("plant", snap(room.w - inset - 0.45), snap(room.h / 2 - 0.2), { variant: "M" });

  return p.items;
}

/** 洋室（子ども部屋/書斎）: デスクは下壁沿い・椅子はその北側（正面がデスクを向く3D形状） */
function fillStudy(room: Room, brief: Brief, withKidBed: boolean): Furniture[] {
  const p = new Placer(room);
  const pal = PALETTES[brief.taste];
  const inset = 0.25;

  const desk = dimsOf("desk", "標準(120)");
  const deskLx = snap(room.w / 2 - desk.w / 2 + (withKidBed ? 0.5 : 0));
  const deskLy = snap(room.h - inset - desk.h);
  if (p.put("desk", deskLx, deskLy, { variant: "標準(120)", color: pal.desk })) {
    p.put("chair", snap(deskLx + desk.w / 2 - 0.25), snap(deskLy - 0.55), { variant: "ダイニングチェア", color: pal.wood });
  }
  if (withKidBed) {
    const bed = dimsOf("bed", "シングル");
    p.put("bed", inset, snap(inset), { variant: "シングル", color: pal.bed });
  }
  p.put("shelf", snap(room.w - inset - 0.9), inset, { variant: "本棚(高)", color: pal.wood });

  return p.items;
}

/** LUNAレッスンコース: サーキット状にステーションを並べる */
function fillLuna(room: Room, r: Rand): Furniture[] {
  const p = new Placer(room, 0.25);
  const inset = 0.25;

  const airVariant = room.w >= 8 ? "6m" : "4m";
  const air = dimsOf("airtrack", airVariant);
  p.put("airtrack", inset, snap(room.h - inset - air.h), { variant: airVariant });
  p.put("evermat", snap(inset + air.w + 0.3), snap(room.h - inset - 2.0), { variant: "大(300×200)" });

  const mats = 2 + Math.floor(r() * 2);
  for (let i = 0; i < mats; i++) {
    p.put("mat", snap(inset + i * 2.0), inset, { variant: "標準(180×90)" });
  }
  const vbVariant = r() > 0.5 ? "5段" : "3段";
  const vb = dimsOf("vaultbox", vbVariant);
  const vbLx = snap(inset + mats * 2.0 + 0.4);
  if (p.put("vaultbox", vbLx, inset, { variant: vbVariant })) {
    p.put("thickmat", snap(vbLx + vb.w + 0.1), inset, {});
  }

  const midY = snap(room.h / 2 - 0.4);
  p.put("beam", inset, midY, {});
  p.put("trampoline", snap(inset + 3.3), midY, {});
  for (let i = 0; i < 3; i++) {
    p.put("hoop", snap(inset + 4.6 + i * 0.85), snap(midY + 0.1), {});
  }
  p.put("bar", snap(room.w - inset - 1.2), midY, {});

  for (let i = 0; i < 3; i++) {
    p.put("cone", snap(room.w - inset - 0.35), snap(inset + i * 0.7), {});
  }
  if (r() > 0.5) p.put("wedge", snap(room.w / 2 - 0.6), inset, {});

  return p.items;
}

function makeRooms(brief: Brief, r: Rand): Room[] {
  const pal = PALETTES[brief.taste];
  const floor = brief.layout === "luna" ? ("cushion" as FloorKey) : pal.floor;

  if (brief.layout === "1R") {
    const w = between(r, 4.5, 5.75);
    const h = between(r, 3.5, 4.25);
    return [{ id: uid(), name: "ワンルーム", x: 1, y: 1, w, h, color: ROOM_COLORS[0], floor }];
  }
  if (brief.layout === "1LDK") {
    const h = between(r, 3.25, 4);
    const ldkW = between(r, 4.5, 5.5);
    const bedW = between(r, 2.75, 3.25);
    return [
      { id: uid(), name: "LDK", x: 1, y: 1, w: ldkW, h, color: ROOM_COLORS[0], floor },
      { id: uid(), name: "寝室", x: snap(1 + ldkW), y: 1, w: bedW, h, color: ROOM_COLORS[1], floor },
    ];
  }
  if (brief.layout === "2LDK") {
    const ldkW = between(r, 5, 5.5);
    const ldkH = between(r, 3.5, 4);
    const sideW = between(r, 3, 3.5);
    const bedH = snap(ldkH * 0.55);
    return [
      { id: uid(), name: "LDK", x: 1, y: 1, w: ldkW, h: ldkH, color: ROOM_COLORS[0], floor },
      { id: uid(), name: "寝室", x: snap(1 + ldkW), y: 1, w: sideW, h: bedH, color: ROOM_COLORS[1], floor },
      { id: uid(), name: "洋室", x: snap(1 + ldkW), y: snap(1 + bedH), w: sideW, h: snap(ldkH - bedH), color: ROOM_COLORS[3], floor },
    ];
  }
  const w = between(r, 9, 11);
  const h = between(r, 5.5, 6.5);
  return [{ id: uid(), name: "レッスンスタジオ", x: 1, y: 1, w, h, color: ROOM_COLORS[2], floor }];
}

function makeOpenings(rooms: Room[], layout: LayoutKind): Opening[] {
  const openings: Opening[] = [];
  const first = rooms[0];
  // 玄関ドア: 最初の部屋の下壁
  openings.push({ id: uid(), type: "door", x: snap(first.x + first.w * 0.25), y: snap(first.y + first.h - 0.075), w: 0.8, rot: 0 });
  // 窓: 各部屋の上壁
  for (const room of rooms) {
    openings.push({ id: uid(), type: "window", x: snap(room.x + room.w / 2 - 0.6), y: snap(room.y - 0.075), w: 1.2, rot: 0 });
  }
  // 部屋間ドア: 左右に隣接する部屋の境界壁
  if (layout === "1LDK" || layout === "2LDK") {
    for (const room of rooms.slice(1)) {
      openings.push({ id: uid(), type: "door", x: snap(room.x - 0.075), y: snap(room.y + room.h / 2 - 0.4), w: 0.8, rot: 90 });
    }
  }
  return openings;
}

export function generatePlan(brief: Brief): Plan {
  const r = rng(brief.seed);
  const rooms = makeRooms(brief, r);
  const furniture: Furniture[] = [];

  if (brief.layout === "luna") {
    furniture.push(...fillLuna(rooms[0], r));
  } else if (brief.layout === "1R") {
    furniture.push(...fillLiving(rooms[0], brief, r, false));
    // ワンルームはベッドも同室（右上コーナー）
    const p = new Placer(rooms[0]);
    p.placed = furniture.filter((f) => !FLAT_TYPES.has(f.type)).map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h }));
    const bed = dimsOf("bed", "シングル");
    p.put("bed", snap(rooms[0].w - 0.3 - bed.w), 0.3, { variant: "シングル", color: PALETTES[brief.taste].bed });
    furniture.push(...p.items);
  } else {
    furniture.push(...fillLiving(rooms[0], brief, r, true));
    furniture.push(...fillBedroom(rooms[1], brief, r));
    if (brief.layout === "2LDK") {
      furniture.push(...fillStudy(rooms[2], brief, brief.household === "family"));
    }
  }

  return normalizePlan({ rooms, furniture, openings: makeOpenings(rooms, brief.layout) });
}

export type Candidate = { brief: Brief; plan: Plan; label: string };

/** 3案ガチャ。呼ぶたびに別のseed群で生成する */
export function generateCandidates(base: Omit<Brief, "seed">, count = 3): Candidate[] {
  const out: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const brief = { ...base, seed };
    out.push({ brief, plan: generatePlan(brief), label: `案${"ABC"[i] ?? i + 1}` });
  }
  return out;
}
