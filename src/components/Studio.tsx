"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  defaultPlan,
  defaultWorkspace,
  loadWorkspace,
  Plan,
  saveWorkspace,
  uid,
  Workspace,
} from "@/lib/plan";

const Editor3D = dynamic(() => import("@/components/Editor3D"), { ssr: false });
const GeneratePanel = dynamic(() => import("@/components/GeneratePanel"), { ssr: false });

export default function Studio() {
  const [ws, setWs] = useState<Workspace>(defaultWorkspace);
  const [loaded, setLoaded] = useState(false);
  const [showGen, setShowGen] = useState(false);

  useEffect(() => {
    const loadedWs = loadWorkspace();
    setWs(loadedWs);
    setLoaded(true);
    // まだ何も置いていない人には最初から生成パネルを開く（0から作らせない）
    const cur = loadedWs.entries.find((e) => e.id === loadedWs.currentId) ?? loadedWs.entries[0];
    if (cur.plan.furniture.length === 0) setShowGen(true);
  }, []);

  useEffect(() => {
    if (loaded) saveWorkspace(ws);
  }, [ws, loaded]);

  const current = ws.entries.find((e) => e.id === ws.currentId) ?? ws.entries[0];

  function setPlan(plan: Plan) {
    setWs({
      ...ws,
      entries: ws.entries.map((e) => (e.id === current.id ? { ...e, plan } : e)),
    });
  }

  function newPlan() {
    const entry = { id: uid(), name: `プラン${ws.entries.length + 1}`, plan: defaultPlan() };
    setWs({ currentId: entry.id, entries: [...ws.entries, entry] });
  }

  function adoptGenerated(name: string, plan: Plan) {
    const entry = { id: uid(), name, plan };
    setWs({ currentId: entry.id, entries: [...ws.entries, entry] });
  }

  function duplicatePlan() {
    const entry = {
      id: uid(),
      name: `${current.name}のコピー`,
      plan: JSON.parse(JSON.stringify(current.plan)) as Plan,
    };
    setWs({ currentId: entry.id, entries: [...ws.entries, entry] });
  }

  function deletePlan() {
    if (ws.entries.length <= 1) return;
    if (!confirm(`「${current.name}」を削除しますか？`)) return;
    const rest = ws.entries.filter((e) => e.id !== current.id);
    setWs({ currentId: rest[0].id, entries: rest });
  }

  function renamePlan(name: string) {
    setWs({
      ...ws,
      entries: ws.entries.map((e) => (e.id === current.id ? { ...e, name } : e)),
    });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(current.plan, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current.name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <button
          onClick={() => setShowGen(!showGen)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            showGen
              ? "bg-emerald-600 text-white"
              : "border border-emerald-400 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          ✨ おまかせ生成
        </button>
        <span className="text-xs font-semibold text-slate-500">プラン:</span>
        <select
          value={current.id}
          onChange={(e) => setWs({ ...ws, currentId: e.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          {ws.entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <input
          value={current.name}
          onChange={(e) => renamePlan(e.target.value)}
          className="w-36 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          aria-label="プラン名"
        />
        <button onClick={newPlan} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:border-emerald-400">
          ＋新規
        </button>
        <button onClick={duplicatePlan} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:border-emerald-400">
          複製
        </button>
        <button onClick={exportJson} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:border-emerald-400">
          書き出し
        </button>
        <button
          onClick={deletePlan}
          disabled={ws.entries.length <= 1}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-rose-600 hover:border-rose-400 disabled:opacity-40"
        >
          削除
        </button>
      </div>

      {showGen && <GeneratePanel onAdopt={adoptGenerated} />}

      <Editor3D plan={current.plan} onChange={setPlan} />
    </div>
  );
}
