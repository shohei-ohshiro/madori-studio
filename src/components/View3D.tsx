"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FURNITURE_CATALOG, Plan } from "@/lib/plan";

const WALL_H = 2.4;
const WALL_T = 0.1;

export default function View3D({ plan }: { plan: Plan }) {
  const mountRef = useRef<HTMLDivElement>(null);

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

    // 地面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // 部屋: 床＋四周の壁（2D座標 x,y → 3D x,z）
    for (const r of plan.rooms) {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(r.w, 0.05, r.h),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(r.color) }),
      );
      floor.position.set(r.x + r.w / 2, 0.025, r.y + r.h / 2);
      floor.receiveShadow = true;
      scene.add(floor);

      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.88,
      });
      const walls = [
        { w: r.w, d: WALL_T, x: r.x + r.w / 2, z: r.y },
        { w: r.w, d: WALL_T, x: r.x + r.w / 2, z: r.y + r.h },
        { w: WALL_T, d: r.h, x: r.x, z: r.y + r.h / 2 },
        { w: WALL_T, d: r.h, x: r.x + r.w, z: r.y + r.h / 2 },
      ];
      for (const s of walls) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(s.w, WALL_H, s.d), wallMat);
        wall.position.set(s.x, WALL_H / 2, s.z);
        wall.castShadow = true;
        scene.add(wall);
      }
    }

    // 家具
    for (const f of plan.furniture) {
      const c = FURNITURE_CATALOG[f.type];
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(f.w, c.height3d, f.h),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(c.color) }),
      );
      mesh.position.set(f.x + f.w / 2, c.height3d / 2, f.y + f.h / 2);
      mesh.castShadow = true;
      scene.add(mesh);
    }

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
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [plan]);

  return (
    <div>
      <div ref={mountRef} className="overflow-hidden rounded-xl border border-slate-200" />
      <p className="mt-2 text-xs text-slate-500">
        ドラッグで回転、ホイール/ピンチでズーム、右ドラッグ（2本指ドラッグ）で移動。
      </p>
    </div>
  );
}
