"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  FLOOR_MATERIALS,
  FURNITURE_CATALOG,
  GENRES,
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
import { buildFurniture, buildOpening } from "@/lib/builders";
import { getThumb, specKey, type PaletteSpec } from "@/lib/thumbs";

type Kind = "room" | "furniture" | "opening";
type Selected = { kind: Kind; id: string } | null;

const WALL_H = 2.4;
const WALL_T = 0.1;

type PaletteItem = { label: string; spec: PaletteSpec; w: number; h: number };

/** ジャンル内の全アイテム（タイプ×サイズ×色の展開） */
function paletteFor(genre: string): PaletteItem[] {
  const items: PaletteItem[] = [];
  for (const type of Object.keys(FURNITURE_CATALOG) as FurnitureType[]) {
    const c = FURNITURE_CATALOG[type];
    if (c.genre !== genre) continue;
    const variants = c.variants ?? [undefined];
    const colors = c.colorVariants ?? [undefined];
    for (const v of variants) {
      for (const col of colors) {
        items.push({
          label: v ? `${c.label}・${v.label}` : c.label,
          spec: { type, variant: v?.label, color: col },
          w: v?.w ?? c.w,
          h: v?.h ?? c.h,
        });
      }
    }
  }
  return items;
}

/** 実3D形状のサムネイル（実ビルダーでオフスクリーン描画） */
function Thumb({ spec }: { spec: PaletteSpec }) {
  const [url, setUrl] = useState("");
  const key = specKey(spec);
  useEffect(() => {
    setUrl(getThumb(spec));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-16 w-full object-contain" draggable={false} />
  ) : (
    <div className="h-16 w-full animate-pulse rounded bg-slate-100" />
  );
}

export default function Editor3D({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [genre, setGenre] = useState<string>("ソファ");

  const planRef = useRef(plan);
  planRef.current = plan;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const selectedRef = useRef<Selected>(null);
  selectedRef.current = selected;

  // three.js 永続オブジェクト（カメラ・シーンは作り直さない）
  const three = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    dynamic: THREE.Group;
    highlight: THREE.Box3Helper | null;
  } | null>(null);

  /** 選択ハイライトだけを更新（シーンは作り直さない） */
  const updateHighlight = useCallback(() => {
    const t = three.current;
    if (!t) return;
    if (t.highlight) {
      t.scene.remove(t.highlight);
      t.highlight.geometry?.dispose();
      (t.highlight.material as THREE.Material | undefined)?.dispose?.();
      t.highlight = null;
    }
    const sel = selectedRef.current;
    if (sel) {
      const target = t.dynamic.children.find((c) => c.userData.id === sel.id);
      if (target) {
        const boxb = new THREE.Box3().setFromObject(target);
        t.highlight = new THREE.Box3Helper(boxb, new THREE.Color(0x10b981));
        t.scene.add(t.highlight);
      }
    }
  }, []);

  /** シーン内の動的オブジェクト（部屋・家具・建具）を plan から再構築 */
  const rebuild = useCallback(() => {
    const t = three.current;
    if (!t) return;
    const p = planRef.current;
    // 破棄（geometryとmaterialの両方。materialは配列の場合もある。
    // ハイライトの破棄は updateHighlight() 側に集約）
    t.dynamic.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose?.();
    });
    t.dynamic.clear();

    for (const r of p.rooms) {
      const g = new THREE.Group();
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(r.w, 0.05, r.h),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(roomFloorColor(r)) }),
      );
      floor.position.set(r.w / 2, 0.025, r.h / 2);
      floor.receiveShadow = true;
      g.add(floor);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const walls = [
        { w: r.w, d: WALL_T, x: r.w / 2, z: 0 },
        { w: r.w, d: WALL_T, x: r.w / 2, z: r.h },
        { w: WALL_T, d: r.h, x: 0, z: r.h / 2 },
        { w: WALL_T, d: r.h, x: r.w, z: r.h / 2 },
      ];
      for (const s of walls) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(s.w, WALL_H, s.d), wallMat);
        wall.position.set(s.x, WALL_H / 2, s.z);
        wall.castShadow = true;
        g.add(wall);
      }
      g.position.set(r.x, 0, r.y);
      g.userData = { kind: "room", id: r.id, w: r.w, h: r.h };
      t.dynamic.add(g);
    }

    for (const f of p.furniture) {
      const g = buildFurniture(f);
      g.position.set(f.x + f.w / 2, 0, f.y + f.h / 2);
      g.userData = { kind: "furniture", id: f.id, w: f.w, h: f.h };
      t.dynamic.add(g);
    }
    for (const o of p.openings) {
      const g = buildOpening(o);
      const w = o.rot === 0 ? o.w : 0.15;
      const h = o.rot === 0 ? 0.15 : o.w;
      g.position.set(o.x + w / 2, 0, o.y + h / 2);
      g.userData = { kind: "opening", id: o.id, w, h };
      t.dynamic.add(g);
    }

    updateHighlight();
  }, [updateHighlight]);

  // 初期化（1回だけ）: カメラ・コントロールはここでしか作らないので視点が飛ばない
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    const width = mount.clientWidth;
    const height = Math.max(460, Math.round(width * 0.62));
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    camera.position.set(8, 9, 12);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(6, 0, 4);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 15, 8);
    sun.castShadow = true;
    scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const dynamic = new THREE.Group();
    scene.add(dynamic);
    three.current = { scene, camera, renderer, controls, dynamic, highlight: null };

    // --- 操作: 選択＆ドラッグ移動 ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging: THREE.Object3D | null = null;
    let moved = false;
    let grabOffset = new THREE.Vector3();
    let downX = 0;
    let downY = 0;

    function setPointer(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
    function topGroup(obj: THREE.Object3D | null): THREE.Object3D | null {
      while (obj && obj.parent !== dynamic) obj = obj.parent!;
      return obj && obj.userData?.id ? obj : null;
    }

    function onDown(e: PointerEvent) {
      setPointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(dynamic.children, true);
      const g = topGroup(hits[0]?.object ?? null);
      if (g) {
        setSelected({ kind: g.userData.kind, id: g.userData.id });
        // レイが床平面と交差しない角度ではドラッグを開始しない（位置ジャンプ防止）
        const point = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(groundPlane, point)) return;
        dragging = g;
        moved = false;
        downX = e.clientX;
        downY = e.clientY;
        controls.enabled = false;
        grabOffset = point.sub(g.position);
        renderer.domElement.setPointerCapture(e.pointerId);
      } else {
        setSelected(null);
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      // タップのブレ（数px）は移動として扱わない
      if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) return;
      setPointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, point)) {
        dragging.position.set(point.x - grabOffset.x, 0, point.z - grabOffset.z);
        moved = true;
        // ハイライト枠を追従させる
        const t = three.current;
        if (t?.highlight) t.highlight.box.setFromObject(dragging);
      }
    }
    function onUp() {
      if (!dragging) return;
      const { kind, id, w, h } = dragging.userData as {
        kind: Kind; id: string; w: number; h: number;
      };
      controls.enabled = true;
      if (moved) {
        const isRoom = kind === "room";
        const nx = snap(Math.max(0, dragging.position.x - (isRoom ? 0 : w / 2)));
        const ny = snap(Math.max(0, dragging.position.z - (isRoom ? 0 : h / 2)));
        const p = planRef.current;
        if (kind === "furniture") {
          onChangeRef.current({ ...p, furniture: p.furniture.map((f) => (f.id === id ? { ...f, x: nx, y: ny } : f)) });
        } else if (kind === "opening") {
          onChangeRef.current({ ...p, openings: p.openings.map((o) => (o.id === id ? { ...o, x: nx, y: ny } : o)) });
        } else {
          onChangeRef.current({ ...p, rooms: p.rooms.map((r) => (r.id === id ? { ...r, x: nx, y: ny } : r)) });
        }
      }
      dragging = null;
    }
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);

    // --- パレットからのドラッグ&ドロップ ---
    function onDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      const type = e.dataTransfer?.getData("furniture-type");
      const opening = e.dataTransfer?.getData("opening-type");
      setPointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(groundPlane, point)) return;
      const p = planRef.current;
      const itemJson = e.dataTransfer?.getData("application/x-madori-item");
      if (itemJson) {
        try {
          const item = JSON.parse(itemJson) as PaletteItem;
          const f = {
            id: uid(), type: item.spec.type,
            x: snap(Math.max(0, point.x - item.w / 2)), y: snap(Math.max(0, point.z - item.h / 2)),
            w: item.w, h: item.h, rot: 0 as const,
            variant: item.spec.variant, color: item.spec.color,
          };
          onChangeRef.current({ ...p, furniture: [...p.furniture, f] });
          setSelected({ kind: "furniture", id: f.id });
        } catch {
          // 不正なペイロードは無視
        }
      } else if (type) {
        const c = FURNITURE_CATALOG[type as FurnitureType];
        const f = {
          id: uid(), type: type as FurnitureType,
          x: snap(Math.max(0, point.x - c.w / 2)), y: snap(Math.max(0, point.z - c.h / 2)),
          w: c.w, h: c.h, rot: 0 as const,
        };
        onChangeRef.current({ ...p, furniture: [...p.furniture, f] });
        setSelected({ kind: "furniture", id: f.id });
      } else if (opening) {
        const c = OPENING_CATALOG[opening as OpeningType];
        const o = {
          id: uid(), type: opening as OpeningType,
          x: snap(Math.max(0, point.x - c.w / 2)), y: snap(Math.max(0, point.z)),
          w: c.w, rot: 0 as const,
        };
        onChangeRef.current({ ...p, openings: [...p.openings, o] });
        setSelected({ kind: "opening", id: o.id });
      }
    }
    renderer.domElement.addEventListener("dragover", onDragOver);
    renderer.domElement.addEventListener("drop", onDrop);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = Math.max(460, Math.round(w * 0.62));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    rebuild();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("dragover", onDragOver);
      renderer.domElement.removeEventListener("drop", onDrop);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      three.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // planが変わったらオブジェクトだけ再構築（カメラは維持。選択変更では作り直さない）
  useEffect(() => {
    rebuild();
  }, [plan, rebuild]);

  // 選択が変わったらハイライトだけ更新
  useEffect(() => {
    updateHighlight();
  }, [selected, updateHighlight]);

  // ===== サイドバー用の操作関数 =====
  const selRoom = selected?.kind === "room" ? plan.rooms.find((r) => r.id === selected.id) : undefined;
  const selFur = selected?.kind === "furniture" ? plan.furniture.find((f) => f.id === selected.id) : undefined;
  const selOpen = selected?.kind === "opening" ? plan.openings.find((o) => o.id === selected.id) : undefined;
  const selCat = selFur ? FURNITURE_CATALOG[selFur.type] : undefined;

  function addByClick(item: PaletteItem) {
    const t = three.current;
    // カメラ注視点の近くに置く
    const cx = t ? t.controls.target.x : 4;
    const cz = t ? t.controls.target.z : 3;
    const f = {
      id: uid(), type: item.spec.type,
      x: snap(Math.max(0, cx - item.w / 2)), y: snap(Math.max(0, cz - item.h / 2)),
      w: item.w, h: item.h, rot: 0 as const,
      variant: item.spec.variant, color: item.spec.color,
    };
    onChange({ ...plan, furniture: [...plan.furniture, f] });
    setSelected({ kind: "furniture", id: f.id });
  }
  function addOpeningByClick(type: OpeningType) {
    const c = OPENING_CATALOG[type];
    const t = three.current;
    const cx = t ? t.controls.target.x : 4;
    const cz = t ? t.controls.target.z : 1;
    const o = { id: uid(), type, x: snap(Math.max(0, cx)), y: snap(Math.max(0, cz)), w: c.w, rot: 0 as const };
    onChange({ ...plan, openings: [...plan.openings, o] });
    setSelected({ kind: "opening", id: o.id });
  }
  function addRoom() {
    const room = {
      id: uid(), name: `部屋${plan.rooms.length + 1}`, x: 1, y: 1, w: 3.5, h: 3,
      color: ROOM_COLORS[plan.rooms.length % ROOM_COLORS.length],
      floor: "flooring-light" as FloorKey,
    };
    onChange({ ...plan, rooms: [...plan.rooms, room] });
    setSelected({ kind: "room", id: room.id });
  }
  function patchFur(patch: Partial<Plan["furniture"][number]>) {
    if (!selFur) return;
    onChange({ ...plan, furniture: plan.furniture.map((f) => (f.id === selFur.id ? { ...f, ...patch } : f)) });
  }
  function patchRoom(patch: Partial<Plan["rooms"][number]>) {
    if (!selRoom) return;
    onChange({ ...plan, rooms: plan.rooms.map((r) => (r.id === selRoom.id ? { ...r, ...patch } : r)) });
  }
  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "room") onChange({ ...plan, rooms: plan.rooms.filter((r) => r.id !== selected.id) });
    else if (selected.kind === "furniture") onChange({ ...plan, furniture: plan.furniture.filter((f) => f.id !== selected.id) });
    else onChange({ ...plan, openings: plan.openings.filter((o) => o.id !== selected.id) });
    setSelected(null);
  }

  const stepBtn = "rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:border-emerald-400";

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {/* 3Dビュー */}
      <div className="min-w-0 flex-1">
        <div ref={mountRef} className="overflow-hidden rounded-xl border border-slate-200" />
        <p className="mt-2 text-xs text-slate-500">
          クリックで選択、そのままドラッグで移動（部屋も動かせます）。空きスペースのドラッグで視点回転。
          右のカタログからドラッグ＆ドロップ（スマホはタップで追加）。
        </p>
      </div>

      {/* 右サイドバー */}
      <aside className="w-full shrink-0 space-y-3 lg:w-72">
        {/* 選択中プロパティ */}
        {selected && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm">
            {selRoom && (
              <div className="space-y-2">
                <input
                  value={selRoom.name}
                  onChange={(e) => patchRoom({ name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1"
                />
                <label className="block text-xs text-slate-600">
                  床材
                  <select
                    value={selRoom.floor ?? "flooring-light"}
                    onChange={(e) => patchRoom({ floor: e.target.value as FloorKey })}
                    className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1"
                  >
                    {(Object.keys(FLOOR_MATERIALS) as FloorKey[]).map((k) => (
                      <option key={k} value={k}>{FLOOR_MATERIALS[k].label}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span>広さ {selRoom.w}×{selRoom.h}m</span>
                  <button className={stepBtn} onClick={() => patchRoom({ w: Math.max(1, selRoom.w - GRID) })}>幅−</button>
                  <button className={stepBtn} onClick={() => patchRoom({ w: selRoom.w + GRID })}>幅＋</button>
                  <button className={stepBtn} onClick={() => patchRoom({ h: Math.max(1, selRoom.h - GRID) })}>奥−</button>
                  <button className={stepBtn} onClick={() => patchRoom({ h: selRoom.h + GRID })}>奥＋</button>
                </div>
              </div>
            )}
            {selFur && selCat && (
              <div className="space-y-2">
                <p className="font-semibold">{selCat.label} <span className="text-xs font-normal text-slate-500">{selFur.w}×{selFur.h}m</span></p>
                {selCat.variants && (
                  <select
                    value={selFur.variant ?? ""}
                    onChange={(e) => {
                      const v = selCat.variants!.find((x) => x.label === e.target.value);
                      if (v) patchFur({ w: v.w, h: v.h, rot: 0, variant: v.label });
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="" disabled>タイプを選ぶ</option>
                    {selCat.variants.map((v) => (
                      <option key={v.label} value={v.label}>{v.label}（{v.w}×{v.h}m）</option>
                    ))}
                  </select>
                )}
                {selCat.colorVariants && (
                  <div className="flex flex-wrap gap-1.5">
                    {selCat.colorVariants.map((c) => (
                      <button
                        key={c}
                        onClick={() => patchFur({ color: c })}
                        className={`h-6 w-6 rounded-full border-2 ${
                          (selFur.color ?? selCat.color) === c ? "border-emerald-500" : "border-white"
                        }`}
                        style={{ background: c }}
                        aria-label={`色 ${c}`}
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button className={stepBtn} onClick={() => patchFur({ rot: selFur.rot === 0 ? 90 : 0, w: selFur.h, h: selFur.w })}>↻ 回転</button>
                  <button className={stepBtn} onClick={() => patchFur({ w: Math.max(0.25, selFur.w - GRID), variant: undefined })}>幅−</button>
                  <button className={stepBtn} onClick={() => patchFur({ w: selFur.w + GRID, variant: undefined })}>幅＋</button>
                  <button className={stepBtn} onClick={() => patchFur({ h: Math.max(0.25, selFur.h - GRID), variant: undefined })}>奥−</button>
                  <button className={stepBtn} onClick={() => patchFur({ h: selFur.h + GRID, variant: undefined })}>奥＋</button>
                </div>
              </div>
            )}
            {selOpen && (
              <div className="space-y-2">
                <p className="font-semibold">{OPENING_CATALOG[selOpen.type].label} <span className="text-xs font-normal text-slate-500">幅{selOpen.w}m</span></p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    className={stepBtn}
                    onClick={() =>
                      onChange({ ...plan, openings: plan.openings.map((o) => (o.id === selOpen.id ? { ...o, rot: o.rot === 0 ? 90 : 0 } : o)) })
                    }
                  >
                    ↻ 回転
                  </button>
                  <button
                    className={stepBtn}
                    onClick={() => onChange({ ...plan, openings: plan.openings.map((o) => (o.id === selOpen.id ? { ...o, w: Math.max(0.5, o.w - GRID) } : o)) })}
                  >
                    幅−
                  </button>
                  <button
                    className={stepBtn}
                    onClick={() => onChange({ ...plan, openings: plan.openings.map((o) => (o.id === selOpen.id ? { ...o, w: o.w + GRID } : o)) })}
                  >
                    幅＋
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={removeSelected}
              className="mt-2 w-full rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
            >
              削除
            </button>
          </div>
        )}

        {/* 部屋・建具 */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={addRoom} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">＋部屋</button>
            {(Object.keys(OPENING_CATALOG) as OpeningType[]).map((t) => (
              <button
                key={t}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("opening-type", t)}
                onClick={() => addOpeningByClick(t)}
                className="cursor-grab rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:border-emerald-400"
              >
                ＋{OPENING_CATALOG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* ジャンル別カタログ */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-1">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  genre === g ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="grid max-h-[26rem] grid-cols-2 gap-1.5 overflow-y-auto xl:grid-cols-3">
            {paletteFor(genre).map((item) => (
              <button
                key={`${item.label}-${specKey(item.spec)}`}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("application/x-madori-item", JSON.stringify(item))
                }
                onClick={() => addByClick(item)}
                className="cursor-grab rounded-lg border border-slate-200 p-1.5 text-left hover:border-emerald-400"
                title={`${item.label} ${item.w}×${item.h}m`}
              >
                <Thumb spec={item.spec} />
                <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-700">
                  {item.label}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  {item.spec.color && (
                    <span className="h-2 w-2 rounded-full" style={{ background: item.spec.color }} />
                  )}
                  {item.w}×{item.h}m
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            見たまま置けます：ドラッグして3Dへ／タップで画面中央に追加
          </p>
        </div>
      </aside>
    </div>
  );
}
