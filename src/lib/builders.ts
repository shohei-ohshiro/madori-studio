import * as THREE from "three";
import { FURNITURE_CATALOG, Furniture, Opening } from "@/lib/plan";

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
export function buildFurniture(f: Furniture): THREE.Group {
  const c = FURNITURE_CATALOG[f.type];
  const g = new THREE.Group();
  const w = f.w;
  const d = f.h;
  const H = c.height3d;
  const base = f.color ?? c.color;
  const dark = new THREE.Color(base).multiplyScalar(0.72);

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
    case "shelf":
    case "wardrobe": {
      const body = box(w, H, d, mat(base));
      body.position.y = H / 2;
      g.add(body);
      if (f.type === "wardrobe") {
        const line = box(0.015, H * 0.96, d * 1.01, mat(dark));
        line.position.set(0, H / 2, 0);
        g.add(line);
      } else {
        const shelves = Math.max(2, Math.round(H / 0.4));
        for (let i = 1; i < shelves; i++) {
          const line = box(w * 1.01, 0.02, d * 1.01, mat(dark));
          line.position.y = (H / shelves) * i;
          g.add(line);
        }
      }
      break;
    }
    case "chest": {
      const body = box(w, H, d, mat(base));
      body.position.y = H / 2;
      g.add(body);
      const drawers = 3;
      for (let i = 1; i < drawers; i++) {
        const line = box(w * 1.01, 0.015, d * 1.01, mat(dark));
        line.position.y = (H / drawers) * i;
        g.add(line);
      }
      break;
    }
    case "rug": {
      const rug = box(w, 0.02, d, mat(base));
      rug.position.y = 0.01;
      rug.castShadow = false;
      rug.receiveShadow = true;
      g.add(rug);
      break;
    }
    case "floorlamp": {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.04, 16), mat("#475569"));
      foot.position.y = 0.02;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, H - 0.35, 10), mat("#475569"));
      pole.position.y = (H - 0.35) / 2;
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.3, 16, 1, true),
        mat(base, { emissive: new THREE.Color("#fbbf24"), emissiveIntensity: 0.5, side: THREE.DoubleSide }),
      );
      shade.position.y = H - 0.18;
      const bulb = new THREE.PointLight(0xffe9b0, 6, 4);
      bulb.position.y = H - 0.2;
      g.add(foot, pole, shade, bulb);
      break;
    }
    case "tablelamp": {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 12), mat("#475569"));
      foot.position.y = 0.015;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, H - 0.2, 8), mat("#475569"));
      pole.position.y = (H - 0.2) / 2;
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 0.15, 12, 1, true),
        mat(base, { emissive: new THREE.Color("#fde68a"), emissiveIntensity: 0.6, side: THREE.DoubleSide }),
      );
      shade.position.y = H - 0.1;
      g.add(foot, pole, shade);
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
      const bed = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.min(w, d) / 2, Math.min(w, d) / 2, 0.08, 20),
        mat("#0f172a"),
      );
      bed.position.y = H;
      bed.castShadow = true;
      const frame = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w, d) / 2, 0.04, 8, 20), mat(base));
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
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 10), mat(base));
        post.position.set(s * (w / 2), H / 2, 0);
        post.castShadow = true;
        const foot = box(0.1, 0.05, d, mat(base));
        foot.position.set(s * (w / 2), 0.025, 0);
        g.add(post, foot);
      }
      break;
    }
    case "wedge": {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(0, H);
      shape.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
      const wedge = new THREE.Mesh(geo, mat(base));
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

export function buildOpening(o: Opening): THREE.Group {
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
