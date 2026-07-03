/** 間取りデータモデル。単位はメートル。 */

export type Room = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
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
  | "pillar";

export type Furniture = {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 回転（0 or 90度） */
  rot: 0 | 90;
};

export type Plan = { rooms: Room[]; furniture: Furniture[] };

export type Category = "furniture" | "lesson";

export const FURNITURE_CATALOG: Record<
  FurnitureType,
  { label: string; w: number; h: number; height3d: number; color: string; cat: Category }
> = {
  // 家具
  bed: { label: "ベッド", w: 2.0, h: 1.4, height3d: 0.5, color: "#93c5fd", cat: "furniture" },
  sofa: { label: "ソファ", w: 1.8, h: 0.85, height3d: 0.75, color: "#a5b4fc", cat: "furniture" },
  table: { label: "テーブル", w: 1.2, h: 0.8, height3d: 0.72, color: "#d6b28a", cat: "furniture" },
  chair: { label: "椅子", w: 0.5, h: 0.5, height3d: 0.9, color: "#e5c49a", cat: "furniture" },
  shelf: { label: "棚", w: 0.9, h: 0.35, height3d: 1.8, color: "#c4a880", cat: "furniture" },
  tv: { label: "テレビ台", w: 1.5, h: 0.4, height3d: 0.45, color: "#94a3b8", cat: "furniture" },
  fridge: { label: "冷蔵庫", w: 0.7, h: 0.7, height3d: 1.8, color: "#cbd5e1", cat: "furniture" },
  plant: { label: "観葉植物", w: 0.45, h: 0.45, height3d: 1.3, color: "#86efac", cat: "furniture" },
  desk: { label: "デスク", w: 1.2, h: 0.6, height3d: 0.72, color: "#d9a97e", cat: "furniture" },
  // レッスン道具（体操教室・運動遊び）
  mat: { label: "マット", w: 1.8, h: 0.9, height3d: 0.06, color: "#60a5fa", cat: "lesson" },
  thickmat: { label: "厚マット", w: 2.0, h: 1.2, height3d: 0.3, color: "#3b82f6", cat: "lesson" },
  vaultbox: { label: "跳び箱", w: 0.9, h: 0.6, height3d: 0.9, color: "#f59e0b", cat: "lesson" },
  beam: { label: "平均台", w: 3.0, h: 0.15, height3d: 0.3, color: "#f87171", cat: "lesson" },
  hoop: { label: "フープ", w: 0.65, h: 0.65, height3d: 0.03, color: "#fbbf24", cat: "lesson" },
  trampoline: { label: "トランポリン", w: 1.0, h: 1.0, height3d: 0.25, color: "#34d399", cat: "lesson" },
  bar: { label: "鉄棒", w: 1.2, h: 0.5, height3d: 1.2, color: "#a78bfa", cat: "lesson" },
  wedge: { label: "坂道マット", w: 1.2, h: 0.6, height3d: 0.4, color: "#38bdf8", cat: "lesson" },
  ladder: { label: "ラダー", w: 3.0, h: 0.5, height3d: 0.02, color: "#fde047", cat: "lesson" },
  airtrack: { label: "エアトラ", w: 6.0, h: 1.4, height3d: 0.3, color: "#818cf8", cat: "lesson" },
  evermat: { label: "エバーマット", w: 3.0, h: 2.0, height3d: 0.5, color: "#93c5fd", cat: "lesson" },
  plyobox: { label: "プライオボックス", w: 0.75, h: 0.6, height3d: 0.75, color: "#fb923c", cat: "lesson" },
  cone: { label: "コーン", w: 0.3, h: 0.3, height3d: 0.5, color: "#f97316", cat: "lesson" },
  pillar: { label: "柱(障害物)", w: 0.6, h: 0.6, height3d: 2.4, color: "#9ca3af", cat: "lesson" },
};

export const ROOM_COLORS = ["#fef3c7", "#e0f2fe", "#fce7f3", "#ecfccb", "#f3e8ff", "#ffedd5"];

export const GRID = 0.25; // スナップ単位(m)

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultPlan(): Plan {
  return {
    rooms: [
      { id: uid(), name: "リビング", x: 1, y: 1, w: 4.5, h: 3.5, color: ROOM_COLORS[0] },
      { id: uid(), name: "寝室", x: 5.5, y: 1, w: 3, h: 3.5, color: ROOM_COLORS[1] },
    ],
    furniture: [],
  };
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
      if (ws.entries?.length) return ws;
    }
    // 旧単一プラン形式からの移行
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const plan = JSON.parse(legacy) as Plan;
      const entry = { id: uid(), name: "マイプラン", plan };
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
