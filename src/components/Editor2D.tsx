"use client";

import { useRef, useState } from "react";
import {
  FURNITURE_CATALOG,
  GRID,
  Plan,
  ROOM_COLORS,
  snap,
  uid,
  type FurnitureType,
} from "@/lib/plan";

const SCALE = 48; // px per meter
const CANVAS_W = 12; // m
const CANVAS_H = 8; // m

type Selected = { kind: "room" | "furniture"; id: string } | null;

export default function Editor2D({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const [selected, setSelected] = useState<Selected>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    id: string;
    kind: "room" | "furniture" | "resize";
    dx: number;
    dy: number;
  } | null>(null);

  function toMeters(e: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = rect.width / (CANVAS_W * SCALE);
    return {
      x: (e.clientX - rect.left) / (SCALE * scale),
      y: (e.clientY - rect.top) / (SCALE * scale),
    };
  }

  function startDrag(
    e: React.PointerEvent,
    kind: "room" | "furniture" | "resize",
    id: string,
    ox: number,
    oy: number,
  ) {
    e.stopPropagation();
    const m = toMeters(e);
    drag.current = { id, kind, dx: m.x - ox, dy: m.y - oy };
    (e.target as Element).setPointerCapture(e.pointerId);
    if (kind !== "resize") setSelected({ kind, id });
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const m = toMeters(e);
    if (d.kind === "room") {
      onChange({
        ...plan,
        rooms: plan.rooms.map((r) =>
          r.id === d.id
            ? { ...r, x: snap(Math.max(0, m.x - d.dx)), y: snap(Math.max(0, m.y - d.dy)) }
            : r,
        ),
      });
    } else if (d.kind === "furniture") {
      onChange({
        ...plan,
        furniture: plan.furniture.map((f) =>
          f.id === d.id
            ? { ...f, x: snap(Math.max(0, m.x - d.dx)), y: snap(Math.max(0, m.y - d.dy)) }
            : f,
        ),
      });
    } else {
      onChange({
        ...plan,
        rooms: plan.rooms.map((r) =>
          r.id === d.id
            ? {
                ...r,
                w: Math.max(1, snap(m.x - r.x)),
                h: Math.max(1, snap(m.y - r.y)),
              }
            : r,
        ),
      });
    }
  }

  function endDrag() {
    drag.current = null;
  }

  function addRoom() {
    const room = {
      id: uid(),
      name: `部屋${plan.rooms.length + 1}`,
      x: 2,
      y: 2,
      w: 3,
      h: 3,
      color: ROOM_COLORS[plan.rooms.length % ROOM_COLORS.length],
    };
    onChange({ ...plan, rooms: [...plan.rooms, room] });
    setSelected({ kind: "room", id: room.id });
  }

  function addFurniture(type: FurnitureType) {
    const c = FURNITURE_CATALOG[type];
    const f = { id: uid(), type, x: 3, y: 3, w: c.w, h: c.h, rot: 0 as const };
    onChange({ ...plan, furniture: [...plan.furniture, f] });
    setSelected({ kind: "furniture", id: f.id });
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "room") {
      onChange({ ...plan, rooms: plan.rooms.filter((r) => r.id !== selected.id) });
    } else {
      onChange({ ...plan, furniture: plan.furniture.filter((f) => f.id !== selected.id) });
    }
    setSelected(null);
  }

  function rotateSelected() {
    if (selected?.kind !== "furniture") return;
    onChange({
      ...plan,
      furniture: plan.furniture.map((f) =>
        f.id === selected.id ? { ...f, rot: f.rot === 0 ? 90 : 0, w: f.h, h: f.w } : f,
      ),
    });
  }

  function renameSelected(name: string) {
    if (selected?.kind !== "room") return;
    onChange({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === selected.id ? { ...r, name } : r)),
    });
  }

  const selectedRoom =
    selected?.kind === "room" ? plan.rooms.find((r) => r.id === selected.id) : undefined;

  const gridLines = [];
  for (let i = 0; i <= CANVAS_W; i++) gridLines.push({ x1: i, y1: 0, x2: i, y2: CANVAS_H });
  for (let j = 0; j <= CANVAS_H; j++) gridLines.push({ x1: 0, y1: j, x2: CANVAS_W, y2: j });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-3">
        <button
          onClick={addRoom}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          ＋ 部屋を追加
        </button>
        <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
        {(Object.keys(FURNITURE_CATALOG) as FurnitureType[]).map((t) => (
          <button
            key={t}
            onClick={() => addFurniture(t)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-emerald-400"
          >
            ＋{FURNITURE_CATALOG[t].label}
          </button>
        ))}
        {selected && (
          <>
            <span className="mx-1 text-slate-300">|</span>
            {selectedRoom && (
              <input
                value={selectedRoom.name}
                onChange={(e) => renameSelected(e.target.value)}
                className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
              />
            )}
            {selected.kind === "furniture" && (
              <button
                onClick={rotateSelected}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:border-emerald-400"
              >
                ↻ 回転
              </button>
            )}
            <button
              onClick={removeSelected}
              className="rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
            >
              削除
            </button>
          </>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W * SCALE} ${CANVAS_H * SCALE}`}
        className="w-full touch-none rounded-b-xl border border-slate-200 bg-white"
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerDown={() => setSelected(null)}
      >
        {gridLines.map((l, i) => (
          <line
            key={i}
            x1={l.x1 * SCALE}
            y1={l.y1 * SCALE}
            x2={l.x2 * SCALE}
            y2={l.y2 * SCALE}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}
        {plan.rooms.map((r) => (
          <g key={r.id}>
            <rect
              x={r.x * SCALE}
              y={r.y * SCALE}
              width={r.w * SCALE}
              height={r.h * SCALE}
              fill={r.color}
              stroke={selected?.id === r.id ? "#10b981" : "#334155"}
              strokeWidth={selected?.id === r.id ? 3 : 2}
              className="cursor-move"
              onPointerDown={(e) => startDrag(e, "room", r.id, r.x, r.y)}
            />
            <text
              x={(r.x + r.w / 2) * SCALE}
              y={(r.y + r.h / 2) * SCALE}
              textAnchor="middle"
              className="pointer-events-none select-none"
              fontSize={14}
              fill="#334155"
            >
              {r.name} ({r.w}×{r.h}m)
            </text>
            <rect
              x={(r.x + r.w) * SCALE - 7}
              y={(r.y + r.h) * SCALE - 7}
              width={14}
              height={14}
              fill="#10b981"
              className="cursor-nwse-resize"
              onPointerDown={(e) => startDrag(e, "resize", r.id, 0, 0)}
            />
          </g>
        ))}
        {plan.furniture.map((f) => {
          const c = FURNITURE_CATALOG[f.type];
          return (
            <g key={f.id}>
              <rect
                x={f.x * SCALE}
                y={f.y * SCALE}
                width={f.w * SCALE}
                height={f.h * SCALE}
                rx={4}
                fill={c.color}
                stroke={selected?.id === f.id ? "#10b981" : "#64748b"}
                strokeWidth={selected?.id === f.id ? 3 : 1.5}
                className="cursor-move"
                onPointerDown={(e) => startDrag(e, "furniture", f.id, f.x, f.y)}
              />
              <text
                x={(f.x + f.w / 2) * SCALE}
                y={(f.y + f.h / 2) * SCALE + 4}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fontSize={11}
                fill="#1e293b"
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-slate-500">
        部屋や家具をドラッグで移動、部屋は右下の緑ハンドルでサイズ変更（{GRID}m単位スナップ）。データはこの端末に自動保存されます。
      </p>
    </div>
  );
}
