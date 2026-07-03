"use client";

import { useRef, useState } from "react";
import {
  FLOOR_MATERIALS,
  FURNITURE_CATALOG,
  GRID,
  OPENING_CATALOG,
  Plan,
  ROOM_COLORS,
  roomFloorColor,
  snap,
  uid,
  type FloorKey,
  type FurnitureType,
  type OpeningType,
} from "@/lib/plan";

const SCALE = 48;
const CANVAS_W = 12;
const CANVAS_H = 8;

type Kind = "room" | "furniture" | "opening";
type Selected = { kind: Kind; id: string } | null;

export default function Editor2D({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const [selected, setSelected] = useState<Selected>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; kind: Kind; mode: "move" | "resize"; dx: number; dy: number } | null>(null);

  function toMeters(e: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = rect.width / (CANVAS_W * SCALE);
    return {
      x: (e.clientX - rect.left) / (SCALE * scale),
      y: (e.clientY - rect.top) / (SCALE * scale),
    };
  }

  function startDrag(e: React.PointerEvent, kind: Kind, mode: "move" | "resize", id: string, ox: number, oy: number) {
    e.stopPropagation();
    const m = toMeters(e);
    drag.current = { id, kind, mode, dx: m.x - ox, dy: m.y - oy };
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelected({ kind, id });
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const m = toMeters(e);
    if (d.mode === "move") {
      const nx = snap(Math.max(0, m.x - d.dx));
      const ny = snap(Math.max(0, m.y - d.dy));
      if (d.kind === "room") {
        onChange({ ...plan, rooms: plan.rooms.map((r) => (r.id === d.id ? { ...r, x: nx, y: ny } : r)) });
      } else if (d.kind === "furniture") {
        onChange({ ...plan, furniture: plan.furniture.map((f) => (f.id === d.id ? { ...f, x: nx, y: ny } : f)) });
      } else {
        onChange({ ...plan, openings: plan.openings.map((o) => (o.id === d.id ? { ...o, x: nx, y: ny } : o)) });
      }
    } else {
      if (d.kind === "room") {
        onChange({
          ...plan,
          rooms: plan.rooms.map((r) =>
            r.id === d.id ? { ...r, w: Math.max(1, snap(m.x - r.x)), h: Math.max(1, snap(m.y - r.y)) } : r,
          ),
        });
      } else if (d.kind === "furniture") {
        onChange({
          ...plan,
          furniture: plan.furniture.map((f) =>
            f.id === d.id
              ? { ...f, w: Math.max(0.25, snap(m.x - f.x)), h: Math.max(0.25, snap(m.y - f.y)), variant: undefined }
              : f,
          ),
        });
      } else {
        onChange({
          ...plan,
          openings: plan.openings.map((o) =>
            o.id === d.id
              ? { ...o, w: Math.max(0.5, snap(o.rot === 0 ? m.x - o.x : m.y - o.y)) }
              : o,
          ),
        });
      }
    }
  }

  function endDrag() {
    drag.current = null;
  }

  function addRoom() {
    const room = {
      id: uid(),
      name: `部屋${plan.rooms.length + 1}`,
      x: 2, y: 2, w: 3, h: 3,
      color: ROOM_COLORS[plan.rooms.length % ROOM_COLORS.length],
      floor: "flooring-light" as FloorKey,
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

  function addOpening(type: OpeningType) {
    const c = OPENING_CATALOG[type];
    const o = { id: uid(), type, x: 3, y: 1, w: c.w, rot: 0 as const };
    onChange({ ...plan, openings: [...plan.openings, o] });
    setSelected({ kind: "opening", id: o.id });
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "room") onChange({ ...plan, rooms: plan.rooms.filter((r) => r.id !== selected.id) });
    else if (selected.kind === "furniture") onChange({ ...plan, furniture: plan.furniture.filter((f) => f.id !== selected.id) });
    else onChange({ ...plan, openings: plan.openings.filter((o) => o.id !== selected.id) });
    setSelected(null);
  }

  function rotateSelected() {
    if (selected?.kind === "furniture") {
      onChange({
        ...plan,
        furniture: plan.furniture.map((f) =>
          f.id === selected.id ? { ...f, rot: f.rot === 0 ? 90 : 0, w: f.h, h: f.w } : f,
        ),
      });
    } else if (selected?.kind === "opening") {
      onChange({
        ...plan,
        openings: plan.openings.map((o) => (o.id === selected.id ? { ...o, rot: o.rot === 0 ? 90 : 0 } : o)),
      });
    }
  }

  const selectedRoom = selected?.kind === "room" ? plan.rooms.find((r) => r.id === selected.id) : undefined;
  const selectedFurniture =
    selected?.kind === "furniture" ? plan.furniture.find((f) => f.id === selected.id) : undefined;
  const selectedCat = selectedFurniture ? FURNITURE_CATALOG[selectedFurniture.type] : undefined;

  function applyVariant(label: string) {
    if (!selectedFurniture || !selectedCat?.variants) return;
    const v = selectedCat.variants.find((x) => x.label === label);
    if (!v) return;
    onChange({
      ...plan,
      furniture: plan.furniture.map((f) =>
        f.id === selectedFurniture.id ? { ...f, w: v.w, h: v.h, rot: 0, variant: v.label } : f,
      ),
    });
  }

  function applyFloor(key: FloorKey) {
    if (!selectedRoom) return;
    onChange({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, floor: key } : r)),
    });
  }

  const gridLines = [];
  for (let i = 0; i <= CANVAS_W; i++) gridLines.push({ x1: i, y1: 0, x2: i, y2: CANVAS_H });
  for (let j = 0; j <= CANVAS_H; j++) gridLines.push({ x1: 0, y1: j, x2: CANVAS_W, y2: j });

  return (
    <div>
      <div className="flex flex-wrap items-start gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-3">
        <button
          onClick={addRoom}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          ＋ 部屋
        </button>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          {(["furniture", "lesson"] as const).map((cat) => (
            <div key={cat} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                {cat === "furniture" ? "家具" : "レッスン道具"}
              </span>
              {(Object.keys(FURNITURE_CATALOG) as FurnitureType[])
                .filter((t) => FURNITURE_CATALOG[t].cat === cat)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => addFurniture(t)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-emerald-400"
                  >
                    ＋{FURNITURE_CATALOG[t].label}
                  </button>
                ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">建具</span>
            {(Object.keys(OPENING_CATALOG) as OpeningType[]).map((t) => (
              <button
                key={t}
                onClick={() => addOpening(t)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-emerald-400"
              >
                ＋{OPENING_CATALOG[t].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 選択中ツールバー */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2 border border-b-0 border-slate-200 bg-emerald-50 px-3 py-2">
          {selectedRoom && (
            <>
              <input
                value={selectedRoom.name}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    rooms: plan.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, name: e.target.value } : r)),
                  })
                }
                className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <label className="flex items-center gap-1 text-xs text-slate-600">
                床材:
                <select
                  value={selectedRoom.floor ?? "flooring-light"}
                  onChange={(e) => applyFloor(e.target.value as FloorKey)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  {(Object.keys(FLOOR_MATERIALS) as FloorKey[]).map((k) => (
                    <option key={k} value={k}>
                      {FLOOR_MATERIALS[k].label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {selectedFurniture && selectedCat && (
            <>
              <span className="text-sm font-semibold text-slate-700">{selectedCat.label}</span>
              {selectedCat.variants && (
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  タイプ:
                  <select
                    value={selectedFurniture.variant ?? ""}
                    onChange={(e) => applyVariant(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value="" disabled>
                      選択（カスタム: {selectedFurniture.w}×{selectedFurniture.h}m）
                    </option>
                    {selectedCat.variants.map((v) => (
                      <option key={v.label} value={v.label}>
                        {v.label}（{v.w}×{v.h}m）
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <span className="text-xs text-slate-500">
                {selectedFurniture.w}×{selectedFurniture.h}m
              </span>
            </>
          )}
          {(selected.kind === "furniture" || selected.kind === "opening") && (
            <button
              onClick={rotateSelected}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs hover:border-emerald-400"
            >
              ↻ 回転
            </button>
          )}
          <button
            onClick={removeSelected}
            className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
          >
            削除
          </button>
        </div>
      )}

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
            x1={l.x1 * SCALE} y1={l.y1 * SCALE} x2={l.x2 * SCALE} y2={l.y2 * SCALE}
            stroke="#f1f5f9" strokeWidth={1}
          />
        ))}

        {plan.rooms.map((r) => (
          <g key={r.id}>
            <rect
              x={r.x * SCALE} y={r.y * SCALE} width={r.w * SCALE} height={r.h * SCALE}
              fill={roomFloorColor(r)}
              stroke={selected?.id === r.id ? "#10b981" : "#334155"}
              strokeWidth={selected?.id === r.id ? 3 : 2}
              className="cursor-move"
              onPointerDown={(e) => startDrag(e, "room", "move", r.id, r.x, r.y)}
            />
            <text
              x={(r.x + r.w / 2) * SCALE} y={(r.y + r.h / 2) * SCALE}
              textAnchor="middle" className="pointer-events-none select-none" fontSize={14} fill="#334155"
            >
              {r.name} ({r.w}×{r.h}m)
            </text>
            <rect
              x={(r.x + r.w) * SCALE - 7} y={(r.y + r.h) * SCALE - 7} width={14} height={14}
              fill="#10b981" className="cursor-nwse-resize"
              onPointerDown={(e) => startDrag(e, "room", "resize", r.id, 0, 0)}
            />
          </g>
        ))}

        {plan.openings.map((o) => {
          const c = OPENING_CATALOG[o.type];
          const w = o.rot === 0 ? o.w : 0.15;
          const h = o.rot === 0 ? 0.15 : o.w;
          return (
            <g key={o.id}>
              <rect
                x={o.x * SCALE} y={o.y * SCALE} width={w * SCALE} height={h * SCALE}
                fill={c.color}
                stroke={selected?.id === o.id ? "#10b981" : "#475569"}
                strokeWidth={selected?.id === o.id ? 3 : 1.5}
                className="cursor-move"
                onPointerDown={(e) => startDrag(e, "opening", "move", o.id, o.x, o.y)}
              />
              <text
                x={(o.x + w / 2) * SCALE} y={o.y * SCALE - 4}
                textAnchor="middle" className="pointer-events-none select-none" fontSize={10} fill="#64748b"
              >
                {c.label}
              </text>
              <rect
                x={(o.x + w) * SCALE - 6} y={(o.y + h) * SCALE - 6} width={12} height={12}
                fill="#10b981" className="cursor-ew-resize"
                onPointerDown={(e) => startDrag(e, "opening", "resize", o.id, 0, 0)}
              />
            </g>
          );
        })}

        {plan.furniture.map((f) => {
          const c = FURNITURE_CATALOG[f.type];
          return (
            <g key={f.id}>
              <rect
                x={f.x * SCALE} y={f.y * SCALE} width={f.w * SCALE} height={f.h * SCALE}
                rx={4} fill={c.color}
                stroke={selected?.id === f.id ? "#10b981" : "#64748b"}
                strokeWidth={selected?.id === f.id ? 3 : 1.5}
                className="cursor-move"
                onPointerDown={(e) => startDrag(e, "furniture", "move", f.id, f.x, f.y)}
              />
              <text
                x={(f.x + f.w / 2) * SCALE} y={(f.y + f.h / 2) * SCALE + 4}
                textAnchor="middle" className="pointer-events-none select-none" fontSize={11} fill="#1e293b"
              >
                {c.label}
              </text>
              <rect
                x={(f.x + f.w) * SCALE - 6} y={(f.y + f.h) * SCALE - 6} width={12} height={12}
                fill="#10b981" className="cursor-nwse-resize"
                onPointerDown={(e) => startDrag(e, "furniture", "resize", f.id, 0, 0)}
              />
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-slate-500">
        ドラッグで移動、右下の緑ハンドルでサイズ変更（{GRID}m単位）。部屋を選ぶと床材、家具を選ぶとタイプを変更できます。
        ドア・窓は壁の上に重ねて配置してください。データはこの端末に自動保存。
      </p>
    </div>
  );
}
