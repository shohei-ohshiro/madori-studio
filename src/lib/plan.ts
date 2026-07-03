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
  | "desk";

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

export const FURNITURE_CATALOG: Record<
  FurnitureType,
  { label: string; w: number; h: number; height3d: number; color: string }
> = {
  bed: { label: "ベッド", w: 2.0, h: 1.4, height3d: 0.5, color: "#93c5fd" },
  sofa: { label: "ソファ", w: 1.8, h: 0.85, height3d: 0.75, color: "#a5b4fc" },
  table: { label: "テーブル", w: 1.2, h: 0.8, height3d: 0.72, color: "#d6b28a" },
  chair: { label: "椅子", w: 0.5, h: 0.5, height3d: 0.9, color: "#e5c49a" },
  shelf: { label: "棚", w: 0.9, h: 0.35, height3d: 1.8, color: "#c4a880" },
  tv: { label: "テレビ台", w: 1.5, h: 0.4, height3d: 0.45, color: "#94a3b8" },
  fridge: { label: "冷蔵庫", w: 0.7, h: 0.7, height3d: 1.8, color: "#cbd5e1" },
  plant: { label: "観葉植物", w: 0.45, h: 0.45, height3d: 1.3, color: "#86efac" },
  desk: { label: "デスク", w: 1.2, h: 0.6, height3d: 0.72, color: "#d9a97e" },
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

const KEY = "madori-studio-plan-v1";

export function loadPlan(): Plan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Plan) : null;
  } catch {
    return null;
  }
}

export function savePlan(plan: Plan) {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    // 保存不可でも編集は続行できる
  }
}
