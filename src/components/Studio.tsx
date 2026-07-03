"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Editor2D from "@/components/Editor2D";
import { defaultPlan, loadPlan, Plan, savePlan } from "@/lib/plan";

const View3D = dynamic(() => import("@/components/View3D"), { ssr: false });

export default function Studio() {
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [tab, setTab] = useState<"2d" | "3d">("2d");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadPlan();
    if (saved) setPlan(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) savePlan(plan);
  }, [plan, loaded]);

  function reset() {
    if (confirm("間取りを初期状態に戻しますか？")) setPlan(defaultPlan());
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "madori.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            onClick={() => setTab("2d")}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === "2d" ? "bg-emerald-500 text-white" : "bg-white text-slate-600"
            }`}
          >
            ✏️ 間取り編集
          </button>
          <button
            onClick={() => setTab("3d")}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === "3d" ? "bg-emerald-500 text-white" : "bg-white text-slate-600"
            }`}
          >
            🏠 3Dで見る
          </button>
        </div>
        <button
          onClick={exportJson}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:border-emerald-400"
        >
          保存データを書き出す
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:border-rose-400"
        >
          リセット
        </button>
      </div>
      {tab === "2d" ? (
        <Editor2D plan={plan} onChange={setPlan} />
      ) : (
        <View3D plan={plan} />
      )}
    </div>
  );
}
