import * as THREE from "three";
import { buildFurniture } from "@/lib/builders";
import { FURNITURE_CATALOG, uid, type FurnitureType } from "@/lib/plan";

/**
 * カタログサムネイル生成。実際の3Dビルダーでオフスクリーン描画するので、
 * パレットの見た目と配置後の見た目が必ず一致する。
 */

export type PaletteSpec = {
  type: FurnitureType;
  variant?: string;
  color?: string;
};

const SIZE = 120;
const cache = new Map<string, string>();
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;

function ensure() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
}

function dims(spec: PaletteSpec): { w: number; h: number } {
  const c = FURNITURE_CATALOG[spec.type];
  const v = spec.variant ? c.variants?.find((x) => x.label === spec.variant) : undefined;
  return { w: v?.w ?? c.w, h: v?.h ?? c.h };
}

export function specKey(spec: PaletteSpec): string {
  return `${spec.type}|${spec.variant ?? ""}|${spec.color ?? ""}`;
}

/** サムネイル dataURL を返す（キャッシュ付き・クライアント専用） */
export function getThumb(spec: PaletteSpec): string {
  const key = specKey(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  ensure();
  if (!renderer || !scene || !camera) return "";

  const d = dims(spec);
  const group = buildFurniture({
    id: uid(),
    type: spec.type,
    x: 0,
    y: 0,
    w: d.w,
    h: d.h,
    rot: 0,
    variant: spec.variant,
    color: spec.color,
  });
  scene.add(group);

  // バウンディングに合わせてカメラを配置（斜め上からのアイソ風）
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.72 + 0.12;
  camera.position.set(center.x + radius * 1.4, center.y + radius * 1.15, center.z + radius * 1.55);
  camera.lookAt(center);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");

  // 後片付け
  scene.remove(group);
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose?.();
  });

  cache.set(key, url);
  return url;
}
