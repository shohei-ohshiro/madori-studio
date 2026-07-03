/** 間取りデータモデル。単位はメートル。 */

export const FLOOR_MATERIALS = {
  "flooring-light": { label: "フローリング（明）", color: "#e7d3ae" },
  "flooring-dark": { label: "フローリング（暗）", color: "#9c7b4f" },
  tatami: { label: "畳", color: "#c8d5a3" },
  "carpet-gray": { label: "カーペット（グレー）", color: "#c7ccd4" },
  "carpet-beige": { label: "カーペット（ベージュ）", color: "#e8ddc9" },
  mortar: { label: "モルタル", color: "#d1d5db" },
  cushion: { label: "クッションフロア", color: "#dbeafe" },
} as const;

export type FloorKey = keyof typeof FLOOR_MATERIALS;

export type Room = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string; // 旧フィールド（後方互換）。表示はfloorを優先
  floor?: FloorKey;
};

export type FurnitureType =
  | "bed"
  | "sofa"
  | "table"
  | "chair"
  | "shelf"
  | "tv"
  | "fridge"
  | "plant"
  | "desk"
  | "mat"
  | "thickmat"
  | "vaultbox"
  | "beam"
  | "hoop"
  | "trampoline"
  | "bar"
  | "wedge"
  | "ladder"
  | "airtrack"
  | "evermat"
  | "plyobox"
  | "cone"
  | "pillar"
  | "rug"
  | "floorlamp"
  | "tablelamp"
  | "wardrobe"
  | "chest";

export type Furniture = {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: 0 | 90;
  variant?: string;
  /** 色バリエーション（未指定はカタログ色） */
  color?: string;
};

export type OpeningType = "door" | "window";

export type Opening = {
  id: string;
  type: OpeningType;
  x: number;
  y: number;
  /** 開口部の幅(m)。厚みは固定0.15 */
  w: number;
  rot: 0 | 90;
};

export type Plan = { rooms: Room[]; furniture: Furniture[]; openings: Opening[] };

export type Category = "furniture" | "lesson";

export type Variant = { label: string; w: number; h: number; height3d?: number };

export type CatalogEntry = {
  label: string;
  w: number;
  h: number;
  height3d: number;
  color: string;
  cat: Category;
  genre: string;
  variants?: Variant[];
  colorVariants?: string[];
};

export const GENRES = [
  "ソファ",
  "ベッド",
  "テーブル・デスク",
  "チェア",
  "収納",
  "照明",
  "ラグ",
  "グリーン",
  "家電",
  "レッスン道具",
] as const;

export const FURNITURE_CATALOG: Record<FurnitureType, CatalogEntry> = {
  // 家具
  bed: {
    label: "ベッド", w: 2.0, h: 1.4, height3d: 0.5, color: "#93c5fd", cat: "furniture", genre: "ベッド",
    colorVariants: ["#93c5fd", "#e2e8f0", "#d6b28a", "#475569"],
    variants: [
      { label: "シングル", w: 2.0, h: 1.0 },
      { label: "セミダブル", w: 2.0, h: 1.2 },
      { label: "ダブル", w: 2.0, h: 1.4 },
      { label: "クイーン", w: 2.1, h: 1.6 },
    ],
  },
  sofa: {
    label: "ソファ", w: 1.8, h: 0.85, height3d: 0.75, color: "#a5b4fc", cat: "furniture", genre: "ソファ",
    colorVariants: ["#a5b4fc", "#94a3b8", "#d6b28a", "#86efac", "#fda4af", "#1e293b"],
    variants: [
      { label: "1人掛け", w: 0.9, h: 0.85 },
      { label: "2人掛け", w: 1.6, h: 0.85 },
      { label: "3人掛け", w: 2.0, h: 0.9 },
      { label: "カウチ(足伸ばし)", w: 2.4, h: 1.5 },
    ],
  },
  table: {
    label: "テーブル", w: 1.2, h: 0.8, height3d: 0.72, color: "#d6b28a", cat: "furniture", genre: "テーブル・デスク",
    variants: [
      { label: "2人用", w: 0.8, h: 0.8 },
      { label: "4人用", w: 1.4, h: 0.8 },
      { label: "6人用", w: 1.8, h: 0.9 },
      { label: "ローテーブル", w: 1.0, h: 0.55, height3d: 0.38 },
    ],
  },
  chair: { label: "椅子", w: 0.5, h: 0.5, height3d: 0.85, color: "#e5c49a", cat: "furniture", genre: "チェア" },
  shelf: {
    label: "棚", w: 0.9, h: 0.35, height3d: 1.8, color: "#c4a880", cat: "furniture", genre: "収納",
    variants: [
      { label: "本棚(高)", w: 0.9, h: 0.35, height3d: 1.8 },
      { label: "ローシェルフ", w: 1.2, h: 0.35, height3d: 0.9 },
      { label: "ワイド収納", w: 1.6, h: 0.45, height3d: 1.2 },
    ],
  },
  tv: { label: "テレビ台", w: 1.5, h: 0.4, height3d: 0.45, color: "#94a3b8", cat: "furniture", genre: "家電" },
  fridge: { label: "冷蔵庫", w: 0.7, h: 0.7, height3d: 1.8, color: "#cbd5e1", cat: "furniture", genre: "家電" },
  plant: { label: "観葉植物", w: 0.45, h: 0.45, height3d: 1.3, color: "#86efac", cat: "furniture", genre: "グリーン" },
  desk: { label: "デスク", w: 1.2, h: 0.6, height3d: 0.72, color: "#d9a97e", cat: "furniture", genre: "テーブル・デスク" },
  // レッスン道具（体操教室・運動遊び）
  mat: {
    label: "マット", w: 1.8, h: 0.9, height3d: 0.06, color: "#60a5fa", cat: "lesson", genre: "レッスン道具",
    variants: [
      { label: "標準(180×90)", w: 1.8, h: 0.9 },
      { label: "大(240×120)", w: 2.4, h: 1.2 },
    ],
  },
  thickmat: { label: "厚マット", w: 2.0, h: 1.2, height3d: 0.3, color: "#3b82f6", cat: "lesson", genre: "レッスン道具" },
  vaultbox: {
    label: "跳び箱", w: 0.9, h: 0.6, height3d: 0.9, color: "#f59e0b", cat: "lesson", genre: "レッスン道具",
    variants: [
      { label: "3段", w: 0.9, h: 0.6, height3d: 0.55 },
      { label: "5段", w: 0.9, h: 0.6, height3d: 0.8 },
      { label: "8段", w: 1.0, h: 0.6, height3d: 1.1 },
    ],
  },
  beam: { label: "平均台", w: 3.0, h: 0.15, height3d: 0.3, color: "#f87171", cat: "lesson", genre: "レッスン道具" },
  hoop: { label: "フープ", w: 0.65, h: 0.65, height3d: 0.03, color: "#fbbf24", cat: "lesson", genre: "レッスン道具" },
  trampoline: { label: "ミニトラ", w: 1.0, h: 1.0, height3d: 0.25, color: "#34d399", cat: "lesson", genre: "レッスン道具" },
  bar: { label: "鉄棒", w: 1.2, h: 0.5, height3d: 1.2, color: "#a78bfa", cat: "lesson", genre: "レッスン道具" },
  wedge: { label: "坂道マット", w: 1.2, h: 0.6, height3d: 0.4, color: "#38bdf8", cat: "lesson", genre: "レッスン道具" },
  ladder: { label: "ラダー", w: 3.0, h: 0.5, height3d: 0.02, color: "#fde047", cat: "lesson", genre: "レッスン道具" },
  airtrack: {
    label: "エアトラ", w: 6.0, h: 1.4, height3d: 0.3, color: "#818cf8", cat: "lesson", genre: "レッスン道具",
    variants: [
      { label: "6m", w: 6.0, h: 1.4 },
      { label: "4m", w: 4.0, h: 1.4 },
      { label: "3m", w: 3.0, h: 1.0 },
    ],
  },
  evermat: {
    label: "エバーマット", w: 3.0, h: 2.0, height3d: 0.5, color: "#93c5fd", cat: "lesson", genre: "レッスン道具",
    variants: [
      { label: "大(300×200)", w: 3.0, h: 2.0, height3d: 0.5 },
      { label: "中(200×150)", w: 2.0, h: 1.5, height3d: 0.4 },
    ],
  },
  plyobox: { label: "プライオボックス", w: 0.75, h: 0.6, height3d: 0.75, color: "#fb923c", cat: "lesson", genre: "レッスン道具" },
  cone: { label: "コーン", w: 0.3, h: 0.3, height3d: 0.5, color: "#f97316", cat: "lesson", genre: "レッスン道具" },
  pillar: { label: "柱(障害物)", w: 0.6, h: 0.6, height3d: 2.4, color: "#9ca3af", cat: "lesson", genre: "レッスン道具" },
  rug: {
    label: "ラグ", w: 2.0, h: 1.4, height3d: 0.02, color: "#94a3b8", cat: "furniture", genre: "ラグ",
    variants: [
      { label: "S(140×100)", w: 1.4, h: 1.0 },
      { label: "M(200×140)", w: 2.0, h: 1.4 },
      { label: "L(250×200)", w: 2.5, h: 2.0 },
    ],
    colorVariants: ["#94a3b8", "#e8ddc9", "#1e3a5f", "#4d7c0f", "#7f1d1d", "#e2e8f0"],
  },
  floorlamp: {
    label: "フロアランプ", w: 0.4, h: 0.4, height3d: 1.5, color: "#fbbf24", cat: "furniture", genre: "照明",
  },
  tablelamp: {
    label: "テーブルランプ", w: 0.25, h: 0.25, height3d: 0.45, color: "#fde68a", cat: "furniture", genre: "照明",
  },
  wardrobe: {
    label: "ワードローブ", w: 1.2, h: 0.6, height3d: 2.0, color: "#c4a880", cat: "furniture", genre: "収納",
    variants: [
      { label: "幅120", w: 1.2, h: 0.6 },
      { label: "幅160", w: 1.6, h: 0.6 },
    ],
  },
  chest: {
    label: "チェスト", w: 0.8, h: 0.45, height3d: 0.9, color: "#d9a97e", cat: "furniture", genre: "収納",
  },
};

export const OPENING_CATALOG: Record<OpeningType, { label: string; w: number; color: string }> = {
  door: { label: "ドア", w: 0.8, color: "#92400e" },
  window: { label: "窓", w: 1.2, color: "#7dd3fc" },
};

export const ROOM_COLORS = ["#fef3c7", "#e0f2fe", "#fce7f3", "#ecfccb", "#f3e8ff", "#ffedd5"];

export const GRID = 0.25;

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function roomFloorColor(r: Room): string {
  return FLOOR_MATERIALS[r.floor ?? "flooring-light"].color;
}

export function normalizePlan(p: Partial<Plan> | null | undefined): Plan {
  return {
    rooms: (p?.rooms ?? []).map((r) => ({ floor: "flooring-light" as FloorKey, ...r })),
    furniture: p?.furniture ?? [],
    openings: p?.openings ?? [],
  };
}

export function defaultPlan(): Plan {
  return normalizePlan({
    rooms: [
      { id: uid(), name: "リビング", x: 1, y: 1, w: 4.5, h: 3.5, color: ROOM_COLORS[0] },
      { id: uid(), name: "寝室", x: 5.5, y: 1, w: 3, h: 3.5, color: ROOM_COLORS[1] },
    ],
    furniture: [],
    openings: [],
  });
}

/** 複数プランのワークスペース */
export type PlanEntry = { id: string; name: string; plan: Plan };
export type Workspace = { currentId: string; entries: PlanEntry[] };

const WS_KEY = "madori-studio-workspace-v1";
const LEGACY_KEY = "madori-studio-plan-v1";

export function defaultWorkspace(): Workspace {
  const entry = { id: uid(), name: "マイプラン", plan: defaultPlan() };
  return { currentId: entry.id, entries: [entry] };
}

export function loadWorkspace(): Workspace {
  if (typeof window === "undefined") return defaultWorkspace();
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (raw) {
      const ws = JSON.parse(raw) as Workspace;
      if (ws.entries?.length) {
        return {
          currentId: ws.currentId,
          entries: ws.entries.map((e) => ({ ...e, plan: normalizePlan(e.plan) })),
        };
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const entry = { id: uid(), name: "マイプラン", plan: normalizePlan(JSON.parse(legacy)) };
      return { currentId: entry.id, entries: [entry] };
    }
  } catch {
    // 壊れたデータは初期化
  }
  return defaultWorkspace();
}

export function saveWorkspace(ws: Workspace) {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(ws));
  } catch {
    // 保存不可でも編集は続行できる
  }
}
