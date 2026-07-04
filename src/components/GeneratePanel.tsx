"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brief,
  Candidate,
  generateCandidates,
  Household,
  HOUSEHOLD_LABELS,
  LayoutKind,
  LAYOUT_LABELS,
  Taste,
  TASTE_LABELS,
} from "@/lib/generate";
import { FURNITURE_CATALOG, OPENING_CATALOG, Plan, roomFloorColor } from "@/lib/plan";

/** 生成案の真上ミニプレビュー（canvas 2D、three.js不要で軽い） */
function PlanThumb({ plan }: { plan: Plan }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pad = 0.4;
    const minX = Math.min(...plan.rooms.map((r) => r.x)) - pad;
    const minY = Math.min(...plan.rooms.map((r) => r.y)) - pad;
    const maxX = Math.max(...plan.rooms.map((r) => r.x + r.w)) + pad;
    const maxY = Math.max(...plan.rooms.map((r) => r.y + r.h)) + pad;
    const scale = Math.min(canvas.width / (maxX - minX), canvas.height / (maxY - minY));
    const ox = (canvas.width - (maxX - minX) * scale) / 2;
    const oy = (canvas.height - (maxY - minY) * scale) / 2;
    const X = (v: number) => ox + (v - minX) * scale;
    const Y = (v: number) => oy + (v - minY) * scale;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const r of plan.rooms) {
      ctx.fillStyle = roomFloorColor(r);
      ctx.fillRect(X(r.x), Y(r.y), r.w * scale, r.h * scale);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(X(r.x), Y(r.y), r.w * scale, r.h * scale);
      ctx.fillStyle = "#475569";
      ctx.font = `${Math.max(9, scale * 0.32)}px sans-serif`;
      ctx.fillText(r.name, X(r.x) + 4, Y(r.y) + Math.max(10, scale * 0.36));
    }
    for (const f of plan.furniture) {
      ctx.fillStyle = f.color ?? FURNITURE_CATALOG[f.type].color;
      ctx.fillRect(X(f.x), Y(f.y), f.w * scale, f.h * scale);
      ctx.strokeStyle = "rgba(15,23,42,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(X(f.x), Y(f.y), f.w * scale, f.h * scale);
    }
    for (const o of plan.openings) {
      const w = o.rot === 0 ? o.w : 0.15;
      const h = o.rot === 0 ? 0.15 : o.w;
      ctx.fillStyle = OPENING_CATALOG[o.type].color;
      ctx.fillRect(X(o.x), Y(o.y), w * scale, h * scale);
    }
  }, [plan]);

  return <canvas ref={ref} width={300} height={200} className="w-full rounded-lg border border-slate-200 bg-slate-50" />;
}

const chipBase = "rounded-full border px-3 py-1.5 text-xs transition";
const chipOff = `${chipBase} border-slate-300 bg-white text-slate-600 hover:border-emerald-400`;
const chipOn = `${chipBase} border-emerald-500 bg-emerald-50 font-semibold text-emerald-700`;

export default function GeneratePanel({
  onAdopt,
}: {
  onAdopt: (name: string, plan: Plan) => void;
}) {
  const [layout, setLayout] = useState<LayoutKind>("1LDK");
  const [household, setHousehold] = useState<Household>("couple");
  const [taste, setTaste] = useState<Taste>("natural");
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    setCandidates(generateCandidates({ layout, household, taste }));
  }, [layout, household, taste]);

  function reroll() {
    setCandidates(generateCandidates({ layout, household, taste }));
  }

  function adopt(c: Candidate) {
    onAdopt(`おまかせ ${LAYOUT_LABELS[c.brief.layout]} ${c.label}`, c.plan);
  }

  const showHousehold = layout !== "luna";

  return (
    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-bold text-emerald-800">✨ おまかせ生成</span>
        <span className="text-xs text-slate-500">条件を選ぶだけ。完成した部屋から気に入った案を選んでください</span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {(Object.keys(LAYOUT_LABELS) as LayoutKind[]).map((k) => (
          <button key={k} onClick={() => setLayout(k)} className={k === layout ? chipOn : chipOff}>
            {LAYOUT_LABELS[k]}
          </button>
        ))}
        {showHousehold && (
          <>
            <span className="mx-1 text-slate-300">|</span>
            {(Object.keys(HOUSEHOLD_LABELS) as Household[]).map((k) => (
              <button key={k} onClick={() => setHousehold(k)} className={k === household ? chipOn : chipOff}>
                {HOUSEHOLD_LABELS[k]}
              </button>
            ))}
            <span className="mx-1 text-slate-300">|</span>
            {(Object.keys(TASTE_LABELS) as Taste[]).map((k) => (
              <button key={k} onClick={() => setTaste(k)} className={k === taste ? chipOn : chipOff}>
                {TASTE_LABELS[k]}
              </button>
            ))}
          </>
        )}
        <button onClick={reroll} className={`${chipBase} ml-auto border-slate-300 bg-white font-semibold text-slate-700 hover:border-emerald-400`}>
          🎲 べつの3案
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {candidates.map((c) => (
          <div key={c.brief.seed} className="rounded-xl border border-slate-200 bg-white p-2">
            <PlanThumb plan={c.plan} />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">{c.label}</span>
              <button
                onClick={() => adopt(c)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                この案で始める
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
