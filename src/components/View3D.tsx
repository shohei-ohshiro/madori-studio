"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  FURNITURE_CATALOG,
  Furniture,
  Opening,
  Plan,
  roomFloorColor,
  snap,
} from "@/lib/plan";

const WALL_H = 2.4;
const WALL_T = 0.1;

function mat(
  color: THREE.ColorRepresentation,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {},
) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), ...opts });
}

function box(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  return m;
}

/** 家具の見た目を種類ごとに組み立てる（グループ原点=底面中心） */
function buildFurniture(f: Furniture): THREE.Group {
  const c = FURNITURE_CATALOG[f.type];
  const g = new THREE.Group();
  const w = f.w;
  const d = f.h;
  const H = c.height3d;
  const base = c.color;
  const dark = new THREE.Color(base).multiplyScalar(0.75);

  switch (f.type) {
    case "sofa": {
      const seatH = H * 0.5;
      const seat = box(w, seatH, d * 0.75, mat(base));
      seat.position.set(0, seatH / 2, d * 0.125);
      const back = box(w, H, d * 0.25, mat(dark));
      back.position.set(0, H / 2, -d * 0.375);
      const armW = Math.min(0.15, w * 0.12);
      for (const s of [-1, 1]) {
        const arm = box(armW, H * 0.75, d * 0.75, mat(dark));
        arm.position.set(s * (w / 2 - armW / 2), (H * 0.75) / 2, d * 0.125);
        g.add(arm);
      }
      g.add(seat, back);
      break;
    }
    case "bed": {
      const frame = box(w, H * 0.4, d, mat(dark));
      frame.position.y = H * 0.2;
      const mattress = box(w * 0.96, H * 0.35, d * 0.94, mat("#f8fafc"));
      mattress.position.y = H * 0.4 + H * 0.175;
      const pillow = box(0.4, 0.1, d * 0.5, mat("#e2e8f0"));
      pillow.position.set(-w / 2 + 0.3, H * 0.75 + 0.05, 0);
      const head = box(0.08, 0.9, d, mat(dark));
      head.position.set(-w / 2 + 0.04, 0.45, 0);
      g.add(frame, mattress, pillow, head);
      break;
    }
    case "table":
    case "desk": {
      const top = box(w, 0.05, d, mat(base));
      top.position.y = H - 0.025;
      g.add(top);
      const lw = 0.06;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = box(lw, H - 0.05, lw, mat(dark));
        leg.position.set(sx * (w / 2 - lw), (H - 0.05) / 2, sz * (d / 2 - lw));
        g.add(leg);
      }
      break;
    }
    case "chair": {
      const seat = box(w, 0.06, d, mat(base));
      seat.position.y = 0.42;
      const back = box(w, H - 0.45, 0.05, mat(dark));
      back.position.set(0, 0.45 + (H - 0.45) / 2, -d / 2 + 0.025);
      g.add(seat, back);
      const lw = 0.04;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = box(lw, 0.42, lw, mat(dark));
        leg.position.set(sx * (w / 2 - lw), 0.21, sz * (d / 2 - lw));
        g.add(leg);
      }
      break;
    }
    case "shelf": {
      const body = box(w, H, d, mat(base));
      body.position.y = H / 2;
      g.add(body);
      const shelves = Math.max(2, Math.round(H / 0.4));
      for (let i = 1; i < shelves; i++) {
        const line = box(w * 1.01, 0.02, d * 1.01, mat(dark));
        line.position.y = (H / shelves) * i;
        g.add(line);
      }
      break;
    }
    case "tv": {
      const board = box(w, H, d, mat(base));
      board.position.y = H / 2;
      const screen = box(w * 0.85, w * 0.85 * 0.5, 0.04, mat("#0f172a"));
      screen.position.set(0, H + (w * 0.85 * 0.5) / 2 + 0.02, 0);
      g.add(board, screen);
      break;
    }
    case "fridge": {
      const body = box(w, H, d, mat(base));
      body.position.y = H / 2;
      const line = box(w * 1.01, 0.015, d * 1.01, mat(dark));
      line.position.y = H * 0.62;
      const handle = box(0.03, 0.35, 0.03, mat(dark));
      handle.position.set(w / 2 - 0.06, H * 0.75, d / 2 + 0.02);
      g.add(body, line, handle);
      break;
    }
    case "plant": {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.24, 0.3, 16), mat("#b45309"));
      pot.position.y = 0.15;
      pot.castShadow = true;
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(w * 0.5, 12, 10), mat("#22c55e"));
      leaves.position.y = 0.3 + (H - 0.3) * 0.6;
      leaves.scale.y = ((H - 0.3) / (w * 0.5)) * 0.6;
      leaves.castShadow = true;
      g.add(pot, leaves);
      break;
    }
    case "trampoline": {
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) / 2, Math.min(w, d) / 2, 0.08, 20), mat("#0f172a"));
      bed.position.y = H;
      bed.castShadow = true;
      const frame = new THREE.Mesh(
        new THREE.TorusGeometry(Math.min(w, d) / 2, 0.04, 8, 20),
        mat(c.color),
      );
      frame.rotation.x = Math.PI / 2;
      frame.position.y = H;
      g.add(bed, frame);
      break;
    }
    case "cone": {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(w / 2, H, 16), mat(base));
      cone.position.y = H / 2;
      cone.castShadow = true;
      g.add(cone);
      break;
    }
    case "vaultbox": {
      const tiers = 3;
      for (let i = 0; i < tiers; i++) {
        const tw = w * (1 - i * 0.08);
        const td = d * (1 - i * 0.08);
        const th = H / tiers;
        const tier = box(tw, th, td, mat(i === tiers - 1 ? "#fef3c7" : i % 2 ? dark : base));
        tier.position.y = th * i + th / 2;
        g.add(tier);
      }
      break;
    }
    case "beam": {
      const bar = box(w, 0.12, Math.min(d, 0.15), mat(base));
      bar.position.y = H - 0.06;
      g.add(bar);
      for (const s of [-1, 1]) {
        const leg = box(0.1, H - 0.12, Math.min(d, 0.15), mat(dark));
        leg.position.set(s * (w / 2 - 0.2), (H - 0.12) / 2, 0);
        g.add(leg);
      }
      break;
    }
    case "hoop": {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w / 2 - 0.03, 0.025, 8, 24), mat(base));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      ring.castShadow = true;
      g.add(ring);
      break;
    }
    case "bar": {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w, 10), mat("#64748b"));
      rail.rotation.z = Math.PI / 2;
      rail.position.y = H;
      rail.castShadow = true;
      g.add(rail);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 10), mat(c.color));
        post.position.set(s * (w / 2), H / 2, 0);
        post.castShadow = true;
        const foot = box(0.1, 0.05, d, mat(c.color));
        foot.position.set(s * (w / 2), 0.025, 0);
        g.add(post, foot);
      }
      break;
    }
    case "wedge": {
      // 坂道: くさび形
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(0, H);
      shape.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
      const wedge = new THREE.Mesh(geo, mat(base));
      wedge.rotation.y = 0;
      wedge.position.set(-w / 2, 0, -d / 2);
      wedge.castShadow = true;
      g.add(wedge);
      break;
    }
    default: {
      const body = box(w, H, d, mat(base));
      body.position.y = H / 2;
      g.add(body);
    }
  }
  return g;
}

function buildOpening(o: Opening): THREE.Group {
  const g = new THREE.Group();
  const along = o.w;
  if (o.type === "door") {
    const panel = box(o.rot === 0 ? along : 0.12, 2.0, o.rot === 0 ? 0.12 : along, mat("#92400e"));
    panel.position.y = 1.0;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat("#fbbf24"));
    knob.position.set(o.rot === 0 ? along / 2 - 0.1 : 0.09, 1.0, o.rot === 0 ? 0.09 : along / 2 - 0.1);
    g.add(panel, knob);
  } else {
    const glass = box(
      o.rot === 0 ? along : 0.12, 0.9, o.rot === 0 ? 0.12 : along,
      mat("#bae6fd", { transparent: true, opacity: 0.5 }),
    );
    glass.position.y = 1.35;
    const frame = box(
      o.rot === 0 ? along + 0.06 : 0.14, 0.06, o.rot === 0 ? 0.14 : along + 0.06,
      mat("#f8fafc"),
    );
    frame.position.y = 0.9;
    const frameTop = frame.clone();
    frameTop.position.y = 1.8;
    g.add(glass, frame, frameTop);
  }
  return g;
}

export default function View3D({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const planRef = useRef(plan);
  planRef.current = plan;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const width = mount.clientWidth;
    const height = Math.max(420, Math.round(width * 0.6));
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

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0xe2e8f0));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // 部屋
    for (const r of plan.rooms) {
      const floor = box(r.w, 0.05, r.h, mat(roomFloorColor(r)));
      floor.position.set(r.x + r.w / 2, 0.025, r.y + r.h / 2);
      floor.receiveShadow = true;
      floor.castShadow = false;
      scene.add(floor);

      const wallMat = mat(0xffffff, { transparent: true, opacity: 0.85 });
      const walls = [
        { w: r.w, d: WALL_T, x: r.x + r.w / 2, z: r.y },
        { w: r.w, d: WALL_T, x: r.x + r.w / 2, z: r.y + r.h },
        { w: WALL_T, d: r.h, x: r.x, z: r.y + r.h / 2 },
        { w: WALL_T, d: r.h, x: r.x + r.w, z: r.y + r.h / 2 },
      ];
      for (const s of walls) {
        const wall = box(s.w, WALL_H, s.d, wallMat);
        wall.position.set(s.x, WALL_H / 2, s.z);
        scene.add(wall);
      }
    }

    // ドラッグ対象（家具＋建具）
    const draggables: THREE.Group[] = [];

    for (const f of plan.furniture) {
      const g = buildFurniture(f);
      g.position.set(f.x + f.w / 2, 0, f.y + f.h / 2);
      g.userData = { kind: "furniture", id: f.id, w: f.w, h: f.h };
      scene.add(g);
      draggables.push(g);
    }
    for (const o of plan.openings) {
      const g = buildOpening(o);
      const w = o.rot === 0 ? o.w : 0.15;
      const h = o.rot === 0 ? 0.15 : o.w;
      g.position.set(o.x + w / 2, 0, o.y + h / 2);
      g.userData = { kind: "opening", id: o.id, w, h };
      scene.add(g);
      draggables.push(g);
    }

    // 3D編集: 家具・建具をドラッグで移動
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging: THREE.Group | null = null;
    let grabOffset = new THREE.Vector3();

    function setPointer(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function findGroup(obj: THREE.Object3D | null): THREE.Group | null {
      while (obj) {
        if (obj.userData?.id) return obj as THREE.Group;
        obj = obj.parent;
      }
      return null;
    }

    function onDown(e: PointerEvent) {
      setPointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(draggables, true);
      const g = findGroup(hits[0]?.object ?? null);
      if (g) {
        dragging = g;
        controls.enabled = false;
        const point = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, point);
        grabOffset = point.sub(g.position);
        renderer.domElement.setPointerCapture(e.pointerId);
      }
    }

    function onMove(e: PointerEvent) {
      if (!dragging) return;
      setPointer(e);
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, point)) {
        dragging.position.set(point.x - grabOffset.x, 0, point.z - grabOffset.z);
      }
    }

    function onUp() {
      if (!dragging) return;
      const { kind, id, w, h } = dragging.userData as { kind: string; id: string; w: number; h: number };
      const nx = snap(Math.max(0, dragging.position.x - w / 2));
      const ny = snap(Math.max(0, dragging.position.z - h / 2));
      dragging.position.set(nx + w / 2, 0, ny + h / 2);
      dragging = null;
      controls.enabled = true;
      const p = planRef.current;
      if (kind === "furniture") {
        onChangeRef.current({ ...p, furniture: p.furniture.map((f) => (f.id === id ? { ...f, x: nx, y: ny } : f)) });
      } else {
        onChangeRef.current({ ...p, openings: p.openings.map((o) => (o.id === id ? { ...o, x: nx, y: ny } : o)) });
      }
    }

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = Math.max(420, Math.round(w * 0.6));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  return (
    <div>
      <div ref={mountRef} className="overflow-hidden rounded-xl border border-slate-200" />
      <p className="mt-2 text-xs text-slate-500">
        <strong>家具・ドア・窓はこの3D画面でもドラッグで動かせます。</strong>
        空きスペースのドラッグで視点回転、ホイール/ピンチでズーム。サイズ変更・タイプ変更は「間取り編集」タブで。
      </p>
    </div>
  );
}
