import * as THREE from 'three';

const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 12, 9), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 8);
const HEMI = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, glow?: string, rough = 0.75, metal = 0) {
  const k = color + '|' + (glow || '') + rough + metal; let m = mats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); if (glow) { m.emissive = new THREE.Color(glow); m.emissiveIntensity = 1.3; } mats.set(k, m); } return m;
}
type G = THREE.BufferGeometry;
function mesh(parent: THREE.Object3D, g: G, m: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, shadow = true) {
  const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = shadow; parent.add(o); return o;
}
const box = (p: THREE.Object3D, w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0, mm?: THREE.Material) => mesh(p, BOX, mm || mat(c), w, h, d, x, y, z);
const grp = (p: THREE.Object3D, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (cur: number, tar: number, rate: number, dt: number) => cur + (tar - cur) * (1 - Math.exp(-rate * dt));
export const shade = (hex: string, f: number) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

export interface Appearance {
  skin: string; hair: string; hairColor: string; eyes: string; beard: string; brow: string; build: number; height: number;
  chest?: { style: string; color: string } | null; helm?: { style: string; color: string } | null; gloves?: string | null; boots?: string | null; cape?: string | null;
  weapon?: { kind: string; color: string; bound?: string } | null; offhand?: { kind: string; color: string } | null; robe?: boolean; trim?: string; scale?: number; ghost?: string; skeleton?: boolean; tint?: string;
}
export interface Rig { group: THREE.Group; root: THREE.Group; parts: any; j: Record<string, number>; st: any; update: (dt: number, st: any) => void; setCarry: (v: boolean) => void; land: number; dispose: () => void; }

export function elementGlowColor(b?: string) { return ({ fire: '#ff7a2e', ice: '#7fe0ff', lightning: '#ffe85a', earth: '#a8805a', wind: '#bff3e4', heal: '#7dff9c', holy: '#fff0a0', aether: '#c08aff' } as any)[b || ''] || ''; }

export function buildHumanoid(ap: Appearance): Rig {
  const group = new THREE.Group(), root = grp(group), hips = grp(root, 0, 0.88), spine = grp(hips), P: any = {};
  const bw = ap.build || 1, ghost = ap.ghost;
  const skinM = ghost ? new THREE.MeshStandardMaterial({ color: ghost, emissive: ghost, emissiveIntensity: 0.9, transparent: true, opacity: 0.8 }) : ap.skeleton ? mat('#e6dfc8') : mat(ap.skin, undefined, 0.6);
  const cs = ap.chest?.style || 'cloth'; const cc = ghost || ap.chest?.color || ap.tint || '#7b6a50'; const metal = cs === 'plate' || cs === 'chain';
  const clothM = ghost ? skinM : mat(cc, undefined, metal ? 0.35 : 0.85, metal ? 0.6 : 0);
  const legCol = ghost ? ghost : cs === 'plate' ? shade(cc, 0.9) : cs === 'robe' ? shade(cc, 0.55) : cs === 'fur' ? '#4a3a2c' : shade(cc, 0.62);
  const legM = ghost ? skinM : mat(legCol, undefined, cs === 'plate' ? 0.4 : 0.85, cs === 'plate' ? 0.5 : 0);
  const bootM = ghost ? skinM : mat(ap.boots || '#4a3322', undefined, 0.8);
  // torso
  P.torso = box(spine, 0.4 * bw, 0.56, 0.23, cc, 0, 0.3, 0, clothM);
  box(spine, 0.34 * bw, 0.16, 0.2, '#000', 0, 0.02, 0, legM);
  if (cs === 'plate') { box(spine, 0.42 * bw, 0.36, 0.06, cc, 0, 0.36, 0.13, clothM); box(hips, 0.3, 0.2, 0.28, cc, 0, -0.06, 0, clothM); }
  if (cs === 'leather' || cs === 'chain') box(spine, 0.42 * bw, 0.06, 0.25, '#2a1c10', 0, 0.06, 0, mat('#2a1c10'));
  if (cs === 'fur') { box(spine, 0.46 * bw, 0.12, 0.28, '#7a6652', 0, 0.55, 0); }
  if (ap.robe || cs === 'robe') { const sk = mesh(hips, CYL, clothM, 0.27, 0.78, 0.27, 0, -0.42, 0); sk.scale.set(0.26 * bw, 0.78, 0.26); (sk.geometry as any); const sk2 = sk; P.skirt = sk2; box(spine, 0.43 * bw, 0.05, 0.25, ap.trim || '#d9a93c', 0, 0.06, 0, mat(ap.trim || '#d9a93c')); }
  // neck + head
  const neck = grp(spine, 0, 0.6), head = grp(neck, 0, 0.17); P.head = head;
  mesh(neck, CYL, skinM, 0.045, 0.1, 0.045, 0, 0.05, 0);
  const hs = ap.skeleton ? 1 : 1; mesh(head, SPH, skinM, 0.135 * hs, 0.155, 0.145, 0, 0, 0);
  // face
  const eyeBase = ap.skeleton ? '#111' : '#ffffff';
  const mkEye = (sx: number) => { const e = grp(head, sx * 0.055, 0.02, 0.128), w = box(e, 0.045, 0.036, 0.02, '#fff', 0, 0, 0, mat(eyeBase, ghost ? '#fff' : undefined, 0.3)); const iris = box(e, 0.024, 0.028, 0.012, ap.eyes, 0, 0, 0.012, ghost ? mat('#fff', '#fff') : mat(ap.skeleton ? '#ff5533' : ap.eyes, ap.skeleton ? '#ff5533' : undefined, 0.2)); w.castShadow = false; iris.castShadow = false; return { e, iris }; };
  P.eyeL = mkEye(1); P.eyeR = mkEye(-1);
  const brM = mat(shade(ap.hairColor, 0.8));
  P.browL = box(head, 0.06, 0.012, 0.015, '#000', 0.055, 0.065, 0.135, brM); P.browR = box(head, 0.06, 0.012, 0.015, '#000', -0.055, 0.065, 0.135, brM);
  P.mouth = box(head, 0.06, 0.012, 0.012, '#7a2a2a', 0, -0.065, 0.14, mat('#7a2a2a'));
  mesh(head, BOX, skinM, 0.025, 0.04, 0.03, 0, -0.01, 0.15); // nose
  // hair
  const hm = mat(ap.hairColor, undefined, 0.9), hr = ap.hair;
  if (!ap.skeleton && !ghost) {
    if (hr !== 'bald') { const cap = mesh(head, HEMI, hm, 0.15, 0.15, 0.16, 0, 0.035, -0.005); P.hair = cap; }
    if (hr === 'long') { box(head, 0.3, 0.46, 0.08, '', 0, -0.14, -0.1, hm); box(head, 0.03, 0.3, 0.14, '', 0.14, -0.04, -0.03, hm); box(head, 0.03, 0.3, 0.14, '', -0.14, -0.04, -0.03, hm); }
    if (hr === 'short') box(head, 0.29, 0.09, 0.08, '', 0, 0.0, -0.09, hm);
    if (hr === 'ponytail') { const t = grp(head, 0, 0.0, -0.14); t.rotation.x = 0.4; P.tail = t; box(t, 0.07, 0.34, 0.07, '', 0, -0.14, 0, hm); box(head, 0.28, 0.12, 0.06, '', 0, 0.02, -0.1, hm); }
    if (hr === 'mohawk') { box(head, 0.045, 0.1, 0.26, '', 0, 0.18, -0.01, hm); }
    if (hr === 'braids') { box(head, 0.28, 0.1, 0.07, '', 0, 0.0, -0.1, hm); box(head, 0.05, 0.4, 0.05, '', 0.11, -0.17, 0.0, hm); box(head, 0.05, 0.4, 0.05, '', -0.11, -0.17, 0.0, hm); }
    if (hr === 'bun') { mesh(head, SPH, hm, 0.07, 0.07, 0.07, 0, 0.19, -0.05); box(head, 0.28, 0.08, 0.07, '', 0, 0.0, -0.09, hm); }
    if (ap.beard === 'full') { box(head, 0.2, 0.13, 0.1, '', 0, -0.1, 0.07, hm); box(head, 0.28, 0.1, 0.1, '', 0, -0.06, -0.01, hm); }
    if (ap.beard === 'goatee') box(head, 0.07, 0.1, 0.05, '', 0, -0.11, 0.12, hm);
    if (ap.beard === 'stubble') box(head, 0.22, 0.09, 0.09, '', 0, -0.09, 0.06, mat(shade(ap.skin, 0.8)));
  }
  // helm
  const he = ap.helm; if (he) { const m = mat(he.color, undefined, 0.4, he.style === 'helm' ? 0.6 : 0);
    if (he.style === 'helm') { mesh(head, HEMI, m, 0.165, 0.17, 0.175, 0, 0.0, 0); box(head, 0.03, 0.14, 0.03, '', 0, -0.02, 0.15, m); box(head, 0.32, 0.03, 0.2, '', 0, 0.02, 0, m); }
    else if (he.style === 'hood') { mesh(head, HEMI, m, 0.17, 0.18, 0.18, 0, 0.0, -0.01); box(head, 0.3, 0.3, 0.08, '', 0, -0.12, -0.1, m); box(head, 0.03, 0.2, 0.13, '', 0.15, -0.02, -0.03, m); box(head, 0.03, 0.2, 0.13, '', -0.15, -0.02, -0.03, m); }
    else { const t = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 5, 14), mat(he.color, he.color, 0.3, 0.8)); t.position.set(0, 0.07, 0); t.rotation.x = Math.PI / 2; head.add(t); }
  }
  // arms
  const sh = 0.27 * bw; const sleeve = cs === 'fur' || cs === 'plate' ? (cs === 'plate' ? clothM : skinM) : clothM;
  const mkArm = (sx: number) => {
    const a = grp(spine, sx * sh, 0.52), up = box(a, 0.12, 0.3, 0.13, '', 0, -0.14, 0, sleeve);
    if (cs === 'plate') mesh(a, SPH, clothM, 0.11, 0.09, 0.11, 0, 0.02, 0); if (cs === 'fur') mesh(a, SPH, mat('#7a6652'), 0.11, 0.09, 0.11, 0, 0.03, 0);
    const el = grp(a, 0, -0.29, 0), fo = box(el, 0.105, 0.28, 0.11, '', 0, -0.14, 0, cs === 'plate' || cs === 'chain' ? clothM : ap.gloves || cs === 'leather' ? mat(ap.gloves || shade(cc, 0.7)) : skinM);
    const hand = mesh(el, SPH, ap.gloves ? mat(ap.gloves) : skinM, 0.06, 0.06, 0.06, 0, -0.3, 0); return { a, el, up, fo, hand };
  };
  P.armL = mkArm(1); P.armR = mkArm(-1);
  // legs
  const mkLeg = (sx: number) => {
    const l = grp(hips, sx * 0.1 * bw, 0, 0), th = box(l, 0.17, 0.44, 0.18, '', 0, -0.22, 0, legM), kn = grp(l, 0, -0.44, 0), sn = box(kn, 0.145, 0.44, 0.155, '', 0, -0.22, 0, cs === 'plate' ? legM : legM), bt = box(kn, 0.165, 0.11, 0.27, '', 0, -0.43, 0.04, bootM); void th; void sn; void bt;
    return { l, kn };
  };
  P.legL = mkLeg(1); P.legR = mkLeg(-1);
  // cape
  if (ap.cape) { const cp = grp(spine, 0, 0.56, -0.13); P.cape = cp; box(cp, 0.38 * bw, 0.95, 0.04, '', 0, -0.48, -0.02, mat(ap.cape, undefined, 0.9)); }
  // weapon / offhand
  const wp = ap.weapon; let weaponG: THREE.Group | null = null;
  if (wp) { weaponG = grp(P.armR.el, 0, -0.3, 0); const g = weaponG; const wc = mat(wp.color, undefined, 0.3, 0.7), glow = elementGlowColor(wp.bound);
    switch (wp.kind) {
      case 'sword': g.rotation.x = 1.15; box(g, 0.06, 0.8, 0.012, '', 0, 0.45, 0, wc); box(g, 0.2, 0.03, 0.04, '', 0, 0.04, 0, mat('#6a5a3a')); box(g, 0.035, 0.14, 0.035, '', 0, -0.05, 0, mat('#3a2a1a')); if (glow) box(g, 0.02, 0.7, 0.02, '', 0, 0.45, 0.012, mat(glow, glow)); break;
      case 'greatsword': g.rotation.x = 1.15; box(g, 0.1, 1.2, 0.016, '', 0, 0.7, 0, wc); box(g, 0.3, 0.04, 0.05, '', 0, 0.06, 0, mat('#6a5a3a')); box(g, 0.04, 0.3, 0.04, '', 0, -0.1, 0, mat('#3a2a1a')); if (glow) box(g, 0.03, 1.1, 0.02, '', 0, 0.7, 0.012, mat(glow, glow)); break;
      case 'axe': g.rotation.x = 1.15; box(g, 0.04, 0.8, 0.04, '', 0, 0.3, 0, mat('#5a3d22')); box(g, 0.3, 0.26, 0.03, '', 0.12, 0.62, 0, wc); if (glow) box(g, 0.05, 0.22, 0.04, '', 0.26, 0.62, 0, mat(glow, glow)); break;
      case 'hammer': g.rotation.x = 1.15; box(g, 0.05, 0.85, 0.05, '', 0, 0.3, 0, mat('#5a3d22')); box(g, 0.28, 0.2, 0.2, '', 0, 0.72, 0, wc); if (glow) box(g, 0.3, 0.05, 0.22, '', 0, 0.72, 0, mat(glow, glow)); break;
      case 'dagger': g.rotation.x = 1.15; box(g, 0.045, 0.32, 0.01, '', 0, 0.2, 0, wc); box(g, 0.12, 0.02, 0.03, '', 0, 0.03, 0, mat('#4a3a2a')); if (glow) box(g, 0.015, 0.28, 0.012, '', 0, 0.2, 0.007, mat(glow, glow)); break;
      case 'spear': case 'halberd': g.rotation.x = 0.95; box(g, 0.038, 1.9, 0.038, '', 0, 0.5, 0, mat('#5a3d22')); if (wp.kind === 'spear') { box(g, 0.08, 0.45, 0.015, '', 0, 1.5, 0, wc); if (glow) box(g, 0.04, 0.4, 0.02, '', 0, 1.5, 0.01, mat(glow, glow)); } else { box(g, 0.28, 0.35, 0.025, '', 0.1, 1.45, 0, wc); box(g, 0.06, 0.35, 0.015, '', 0, 1.65, 0, wc); if (glow) box(g, 0.05, 0.25, 0.03, '', 0.1, 1.45, 0, mat(glow, glow)); } break;
      case 'staff': g.rotation.x = 0.15; box(g, 0.05, 1.7, 0.05, '', 0, 0.4, 0, mat('#6a4a2a')); { const gl = glow || '#c08aff'; mesh(g, SPH, mat(gl, gl), 0.09, 0.09, 0.09, 0, 1.3, 0); const li = new THREE.PointLight(gl, 0.6, 5); li.position.set(0, 1.3, 0); g.add(li); P.staffLight = li; } break;
      case 'bow': P.bow = g; g.position.set(0, 0, 0); g.rotation.set(0.2, 0, 0); { const arc = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 5, 14, Math.PI), wc); arc.rotation.z = Math.PI / 2; arc.rotation.y = 0; arc.position.set(0, 0.05, 0.1); arc.castShadow = true; g.add(arc); box(g, 0.006, 0.92, 0.006, '', 0, 0.05, 0.1, mat('#ddd')); } break;
    }
  }
  const oh = ap.offhand; if (oh) { const g = grp(P.armL.el, 0.0, -0.12, 0.1); const m = mat(oh.color, undefined, 0.4, 0.5); if (oh.kind === 'shield') { const s = mesh(g, CYL, m, 0.24, 0.04, 0.24, 0, 0, 0.0); s.rotation.x = Math.PI / 2; box(g, 0.07, 0.07, 0.04, '', 0, 0, 0.04, mat('#d9c58a', undefined, 0.3, 0.8)); } }
  const carry = box(spine, 0.3, 0.24, 0.24, '', 0, 0.3, 0.3, mat('#8a6a3a')); carry.visible = false;

  const scale = (ap.height || 1) * 0.97 * (ap.scale || 1); group.scale.setScalar(scale);
  const j: Record<string, number> = { thL: 0, thR: 0, knL: 0, knR: 0, zL: 0, zR: 0, aLx: 0, aRx: 0, aLz: 0, aRz: 0, eL: 0, eR: 0, spX: 0, spY: 0, spZ: 0, hY: 0, hX: 0, hP: 0, hipY: 0, hipZ: 0, rootX: 0, rootZ: 0, mouth: 0, bL: 0, bR: 0, hpY: 0, hdZ: 0, cape: 0 };
  const rig: Rig = { group, root, parts: P, j, st: {}, land: 0, setCarry: (v) => { carry.visible = v; }, update: () => {}, dispose: () => { group.traverse((o: any) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); } };
  let t = Math.random() * 100, phase = Math.random() * 6, blink = 2 + Math.random() * 3, blinkT = 0, idleT = 6 + Math.random() * 8, idleV = 0, idleP = 0, eyeX = 0, eyeY = 0, eyeTimer = 1;
  let look0 = 0;
  rig.update = (dt, st) => {
    t += dt; const s = st || {}; rig.st = s; const sp = s.speed || 0, T: Record<string, number> = {}; for (const k in j) T[k] = 0;
    let rate = 14; const moving = sp > 0.15 && !s.sit;
    const stride = 1.5 + sp * 0.28; if (moving) phase += dt * (sp * Math.PI * 2 / stride);
    const A = clamp(0.18 + sp * 0.11, 0, 0.95) * (moving ? 1 : 0), ph = phase;
    // locomotion
    T.thL = Math.sin(ph) * A; T.thR = -Math.sin(ph) * A; T.knL = Math.max(0, -Math.cos(ph)) * A * 1.4; T.knR = Math.max(0, Math.cos(ph)) * A * 1.4;
    T.aLx = -Math.sin(ph) * A * 0.85; T.aRx = Math.sin(ph) * A * 0.85; T.eL = -0.15 - A * 0.5; T.eR = -0.15 - A * 0.5; T.aLz = 0.07; T.aRz = -0.07;
    T.hipY = moving ? -0.035 + Math.abs(Math.cos(ph)) * 0.04 * clamp(sp / 4, 0.4, 1.2) : 0; T.spX = moving ? 0.04 + clamp(sp * 0.018, 0, 0.2) : 0; T.spY = moving ? Math.sin(ph) * 0.09 * clamp(sp / 4, 0.3, 1) : 0; T.hipZ = moving ? Math.sin(ph) * 0.03 : 0;
    // idle breath + variations
    const br = Math.sin(t * 1.7); if (!moving) { T.spX += br * 0.014; T.hipY += br * 0.004; T.aLz += br * 0.012; T.aRz -= br * 0.012; T.eL = -0.12; T.eR = -0.12; T.hY += Math.sin(t * 0.37) * 0.05; }
    idleT -= dt; if (idleT <= 0 && !moving && !s.act) { idleV = 1 + Math.floor(Math.random() * 3); idleP = 0; idleT = 7 + Math.random() * 9; }
    if (idleV) { idleP += dt / 2.8; const b = Math.sin(clamp(idleP, 0, 1) * Math.PI); if (idleP > 1 || moving) idleV = 0; else if (idleV === 1) T.hY += Math.sin(idleP * Math.PI * 2) * 0.7; else if (idleV === 2) { T.hipZ += b * 0.06; T.thL -= b * 0.08; T.spZ += b * 0.05; T.hX += b * 0.1 * Math.sin(idleP * 9); } else { T.aLx -= b * 2.2; T.aRx -= b * 2.2; T.spX -= b * 0.12; T.hX -= b * 0.25; } }
    // glance at look target
    T.hY += clamp(s.lookYaw || 0, -0.95, 0.95) * 1; T.hX += clamp(s.lookPitch || 0, -0.4, 0.4);
    // air states
    const air = s.air || 'ground';
    if (air === 'rise') { T.aLx = -0.9; T.aRx = -0.6; T.aLz = 0.5; T.aRz = -0.5; T.thL = -0.7; T.knL = 1.1; T.thR = 0.2; T.knR = 0.3; T.spX = 0.05; rate = 12; }
    else if (air === 'fall') { T.aLx = -0.3; T.aRx = -0.3; T.aLz = 1.0; T.aRz = -1.0; T.thL = -0.3; T.thR = 0.15; T.knL = 0.5; T.knR = 0.2; T.spX = 0.05; }
    else if (air === 'glide') { T.rootX = 1.15; T.aLz = 1.5; T.aRz = -1.5; T.aLx = -0.1; T.aRx = -0.1; T.eL = 0; T.eR = 0; T.thL = 0.25; T.thR = 0.1; T.knL = 0.2; T.knR = 0.3; T.hX = -0.9; T.spX = -0.1; T.hipY = 0; rate = 8; }
    else if (air === 'swim') { T.spX = 1.1; T.hipY = -0.45; T.aLx = -2.2 + Math.sin(t * 5) * 1.2; T.aRx = -2.2 - Math.sin(t * 5) * 1.2; T.thL = Math.sin(t * 9) * 0.4; T.thR = -Math.sin(t * 9) * 0.4; T.knL = 0.2; T.knR = 0.2; T.hX = -0.9; }
    else if (air === 'ride') { T.thL = -1.15; T.thR = -1.15; T.zL = 0.35; T.zR = -0.35; T.knL = 1.0; T.knR = 1.0; T.aLx = -0.9; T.aRx = -0.9; T.eL = -0.7; T.eR = -0.7; T.spX = 0.05 + (s.mountSpeed || 0) * 0.02; T.hipY = -0.1; }
    if (s.crouch && air === 'ground') { T.hipY -= 0.3; T.thL -= 1.0 * (moving ? 0.6 : 1); T.thR -= 0.75 * (moving ? 0.6 : 1); T.knL += 1.4; T.knR += 1.2; T.spX += 0.4; T.hX -= 0.35; }
    if (s.sit) { T.hipY = -0.42; T.thL = T.thR = -1.55; T.knL = T.knR = 1.5; T.aLx = T.aRx = -0.8; T.eL = T.eR = -0.8; T.spX = 0.04; T.spY = 0; T.hipZ = 0; T.aLz = 0.15; T.aRz = -0.15; }
    // land impulse
    if (rig.land > 0.01) { rig.land = Math.max(0, rig.land - dt * 3.2); T.hipY -= rig.land * 0.28; T.thL -= rig.land * 0.6; T.thR -= rig.land * 0.6; T.knL += rig.land * 1.1; T.knR += rig.land * 1.1; T.spX += rig.land * 0.3; }
    // actions
    const act = s.act, at = clamp(s.at || 0, 0, 1), bell = Math.sin(at * Math.PI); let directRoot = false;
    switch (act) {
      case 'attack': { rate = 34; const ty = s.atkType || 0; if (s.ranged) { T.aLx = -1.45; T.aRx = -1.4 + at * 0.5; T.eR = -1.6 * (1 - at); T.eL = -0.1; T.spY = 0.5; T.aLz = 0.1; T.aRz = -0.5; } else if (ty === 0) { const e = at < 0.3 ? at / 0.3 : 1; T.aRx = at < 0.3 ? -0.4 - e * 2.3 : -2.7 + ((at - 0.3) / 0.7) * 3.1; T.eR = -0.5; T.spX = at < 0.3 ? -0.1 : 0.35; T.spY = at < 0.3 ? -0.35 : 0.5; T.hipY -= bell * 0.05; T.thL = -0.5 * bell; T.thR = 0.4 * bell; } else if (ty === 1) { T.aRx = -1.5; T.aRz = at < 0.4 ? -1.6 + at * 1 : -0.6 + (at - 0.4) * 3.2; T.spY = at < 0.35 ? 0.7 : -0.8; T.eR = -0.3; T.thL = -0.4 * bell; T.thR = 0.5 * bell; } else { T.aRx = at < 0.35 ? -0.9 : -1.7; T.eR = at < 0.35 ? -2 : -0.1; T.spX = at < 0.35 ? -0.1 : 0.4; T.spY = 0.3; T.thL = -0.7 * bell; T.thR = 0.5 * bell; T.aLx = -0.6; } break; }
      case 'cast': rate = 22; T.aLx = -1.4 - bell * 0.5; T.aRx = -1.4 - bell * 0.5; T.aLz = 0.2 + bell * 0.3; T.aRz = -0.2 - bell * 0.3; T.eL = -0.3; T.eR = -0.3; T.spX = -0.08 + bell * 0.1; T.hX = -0.15; break;
      case 'block': rate = 20; T.aLx = -1.35; T.eL = -1.3; T.aLz = -0.3; T.spX = 0.12; T.spY = -0.2; T.thL = -0.3; T.hipY -= 0.05; break;
      case 'roll': rate = 40; directRoot = true; j.rootX = at * Math.PI * 2; T.hipY = -0.4; T.thL = T.thR = -1.9; T.knL = T.knR = 2.1; T.aLx = T.aRx = -1.6; T.eL = T.eR = -2; T.spX = 0.8; break;
      case 'dead': rate = 6; T.rootX = -1.55; T.aLz = 0.8; T.aRz = -0.8; T.thL = 0.1; T.thR = -0.1; T.hX = 0; break;
      case 'talk': { const a = s.talkAmp ?? 1; T.aRx = -0.65 + Math.sin(t * 3.1) * 0.35 * a; T.eR = -1.0 + Math.sin(t * 2.3) * 0.3 * a; T.aLx = -0.25 + Math.sin(t * 2.1 + 1) * 0.15 * a; T.eL = -0.5 + Math.sin(t * 1.7) * 0.2 * a; T.hX += Math.sin(t * 2.7) * 0.06 * a; T.spZ += Math.sin(t * 1.3) * 0.03; break; }
      case 'work': rate = 20; T.aRx = -1.2 + Math.sin(t * 5.5) * 0.9; T.eR = -1.0 + Math.sin(t * 5.5 + 0.7) * 0.4; T.aLx = -0.8; T.eL = -1.0; T.spX = 0.25 + Math.sin(t * 5.5) * 0.08; T.hX = 0.2; T.thL -= 0.15; break;
      case 'sweep': T.spX = 0.3; T.aLx = -0.95 + Math.sin(t * 2) * 0.3; T.aRx = -0.95 - Math.sin(t * 2) * 0.3; T.eL = T.eR = -0.5; T.spY = Math.sin(t * 2) * 0.25; T.hX = 0.3; break;
      case 'carry': T.aLx = T.aRx = -1.2; T.eL = T.eR = -1.1; T.aLz = -0.12; T.aRz = 0.12; break;
      case 'pickup': rate = 18; T.spX = 0.95 * bell; T.hipY -= 0.25 * bell; T.thL -= 0.8 * bell; T.thR -= 0.5 * bell; T.knL += 1.2 * bell; T.knR += 1 * bell; T.aRx = -1.8 * bell; T.eR = -0.4 * bell; T.hX += 0.3 * bell; break;
      case 'interact': rate = 18; T.aRx = -1.4 - bell * 0.5; T.eR = -0.5; T.spX += 0.2 * bell; T.hX += 0.1 * bell; break;
      case 'eat': T.aRx = -1.1 - bell * 1.0; T.eR = -1.4 - bell * 0.7; T.hX = -0.1 + bell * 0.1; break;
      case 'drink': T.aRx = -1.2 - bell * 1.2; T.eR = -1.5 - bell * 0.8; T.hX = -0.25 * bell; break;
      case 'read': T.aLx = T.aRx = -1.1; T.eL = T.eR = -1.6; T.hX = 0.35; T.spX += 0.12; break;
      case 'pray': T.aLx = T.aRx = -0.9; T.eL = T.eR = -2.0; T.aLz = -0.2; T.aRz = 0.2; T.hX = 0.45; break;
      case 'wave': T.aRz = -2.7 + Math.sin(t * 9) * 0.25; T.aRx = 0; T.eR = -0.3 + Math.sin(t * 9) * 0.3; T.hY += 0.1; break;
      case 'bow': T.spX = 0.9 * bell; T.hX = 0.2 * bell; T.aLx = T.aRx = 0.2; break;
      case 'cheer': T.aLx = T.aRx = -2.8; T.aLz = 0.35; T.aRz = -0.35; T.hipY += Math.abs(Math.sin(t * 7)) * 0.1; T.thL = T.thR = Math.sin(t * 7) * 0.2; T.hX = -0.3; break;
      case 'point': T.aRx = -1.6; T.eR = -0.05; T.hY += 0.2; break;
      case 'practice': { const u = (t * 1.2) % 1; T.aRx = u < 0.3 ? -0.4 - (u / 0.3) * 2.3 : -2.7 + ((u - 0.3) / 0.7) * 3.1; T.spY = u < 0.3 ? -0.3 : 0.45; T.spX = 0.1; T.thL = -0.35; T.thR = 0.35; T.knL = 0.4; break; }
      case 'guard': T.aLz = 0.05; T.aRx = -0.3; T.hY += Math.sin(t * 0.5) * 0.4; T.spX = -0.03; break;
      case 'shoot': break;
    }
    // facial expression
    const em = s.emotion && s.emotion !== 'neutral' ? s.emotion : (ap.brow && ap.brow !== 'neutral' ? ap.brow : 'neutral');
    T.bL = em === 'angry' ? -0.35 : em === 'sad' ? 0.35 : em === 'surprised' ? 0.1 : 0; T.bR = -T.bL; T.hpY = em === 'surprised' ? 0.025 : em === 'sad' ? -0.01 : 0.0; if (em === 'angry') T.hpY = -0.012;
    const talking = act === 'talk' || s.talking; T.mouth = talking ? (0.4 + 0.6 * Math.abs(Math.sin(t * 17 + Math.sin(t * 5)))) * (s.talkAmp ?? 1) : em === 'surprised' ? 0.9 : em === 'happy' ? -0.4 : act === 'attack' || act === 'cast' ? 0.8 : 0;
    // smooth
    for (const k in T) { if (k === 'rootX' && directRoot) continue; let r = rate; if (k === 'bL' || k === 'bR' || k === 'mouth') r = 20; if (k === 'hY' || k === 'hX') r = Math.min(rate, 7); j[k] = damp(j[k], T[k], r, dt); }
    if (!directRoot && j.rootX > 3.2) j.rootX = 0;
    // cloth physics-ish
    const capeT = clamp(sp * 0.09, 0, 0.9) + Math.sin(t * 2.2 + phase) * 0.05 * (1 + sp * 0.2) + (air === 'glide' ? 0.6 : 0); j.cape = damp(j.cape, capeT, 5, dt);
    // blink & eyes
    blink -= dt; if (blink <= 0) { blinkT = 0.13; blink = 2 + Math.random() * 4.5; } blinkT = Math.max(0, blinkT - dt); const bl = blinkT > 0 ? 0.1 : (act === 'dead' ? 0.1 : 1);
    eyeTimer -= dt; if (eyeTimer <= 0) { eyeTimer = 0.6 + Math.random() * 2.2; eyeX = (Math.random() - 0.5) * 0.02; eyeY = (Math.random() - 0.5) * 0.01; }
    // apply
    root.rotation.x = j.rootX; root.rotation.z = j.rootZ; hips.position.y = 0.88 + j.hipY; hips.rotation.z = j.hipZ * 0.5; hips.rotation.y = -j.spY * 0.3;
    spine.rotation.set(j.spX, j.spY, j.spZ); P.head.rotation.set(j.hX, j.hY, j.hdZ);
    P.armL.a.rotation.set(j.aLx, 0, j.aLz); P.armR.a.rotation.set(j.aRx, 0, j.aRz); P.armL.el.rotation.x = j.eL; P.armR.el.rotation.x = j.eR;
    P.legL.l.rotation.set(j.thL, 0, j.zL); P.legR.l.rotation.set(j.thR, 0, j.zR); P.legL.kn.rotation.x = j.knL; P.legR.kn.rotation.x = j.knR;
    P.eyeL.e.scale.y = bl; P.eyeR.e.scale.y = bl; P.eyeL.iris.position.x = eyeX; P.eyeR.iris.position.x = eyeX; P.eyeL.iris.position.y = eyeY; P.eyeR.iris.position.y = eyeY;
    P.browL.rotation.z = j.bL; P.browR.rotation.z = j.bR; P.browL.position.y = 0.065 + j.hpY; P.browR.position.y = 0.065 + j.hpY; P.mouth.scale.y = 0.012 + Math.max(0, j.mouth) * 0.05; P.mouth.scale.x = 0.06 + (j.mouth < 0 ? -j.mouth * 0.03 : 0); P.mouth.position.y = -0.065 + (j.mouth < 0 ? 0.01 : 0);
    if (P.cape) P.cape.rotation.x = j.cape; if (P.tail) P.tail.rotation.x = 0.4 + j.cape * 0.5 + Math.sin(t * 3) * 0.04; if (P.skirt) { P.skirt.rotation.x = (j.thL + j.thR) * 0.1; }
    if (P.bow && act === 'attack') P.bow.rotation.x = 0.2;
    void look0;
  };
  return rig;
}

// ---------- creatures (quadrupeds)
export function buildCreature(sp: any) {
  const g = new THREE.Group(); const L = sp.len, H = sp.h, legLen = H * 0.52, bw = (sp.bulky ? 0.55 : 0.4) * H * 0.8, bh = H * (sp.bulky ? 0.55 : 0.42);
  const col = sp.col, m = mat(col, sp.glow, 0.85), bm = mat(sp.belly || col, sp.glow, 0.85), dk = mat(shade(col, 0.6), undefined, 0.9);
  const body = grp(g, 0, legLen + bh / 2 - 0.02, 0); const trunk = box(body, bw, bh, L, col, 0, 0, 0, m); box(body, bw * 0.8, bh * 0.4, L * 0.7, '', 0, -bh * 0.35, 0, bm); void trunk;
  const mkLeg = (x: number, z: number) => { const l = grp(body, x, -bh * 0.35, z), w = Math.max(0.04, H * 0.07); const up = box(l, w, legLen * 0.55, w, '', 0, -legLen * 0.27, 0, m); const kn = grp(l, 0, -legLen * 0.52, 0); box(kn, w * 0.85, legLen * 0.52, w * 0.85, '', 0, -legLen * 0.26, 0, dk); void up; return { l, kn }; };
  const legs = [mkLeg(bw * 0.38, L * 0.36), mkLeg(-bw * 0.38, L * 0.36), mkLeg(bw * 0.38, -L * 0.36), mkLeg(-bw * 0.38, -L * 0.36)]; // FL FR RL RR
  const neck = grp(body, 0, bh * 0.25, L * 0.4); const nl = sp.neck ? H * 0.38 : H * 0.12;
  if (sp.neck) { const nk = box(neck, bw * 0.45, nl, bw * 0.45, '', 0, nl / 2, 0.02, m); nk.rotation.x = 0.5; } neck.rotation.x = 0;
  const head = grp(neck, 0, sp.neck ? nl * 0.9 : nl * 0.2, sp.neck ? nl * 0.4 : H * 0.12); const hs = Math.max(0.1, H * (sp.bulky ? 0.32 : 0.24));
  box(head, hs * 0.8, hs * 0.8, hs * 1.0, '', 0, 0, 0, m); box(head, hs * 0.5, hs * 0.45, hs * 0.8, '', 0, -hs * 0.12, hs * 0.75, sp.neck ? m : bm); box(head, hs * 0.14, hs * 0.1, hs * 0.1, '#111', 0, -hs * 0.08, hs * 1.15, mat('#111'));
  const ey = (sx: number) => box(head, hs * 0.1, hs * 0.1, hs * 0.06, '', sx * hs * 0.32, hs * 0.12, hs * 0.5, mat(sp.glow || '#111', sp.glow)); ey(1); ey(-1);
  const ears: any[] = []; const earL = sp.ears === 'long' ? hs * 1.0 : sp.ears === 'point' ? hs * 0.55 : hs * 0.28;
  for (const sx of [1, -1]) { const e = grp(head, sx * hs * 0.3, hs * 0.4, -hs * 0.1); box(e, hs * 0.18, earL, hs * 0.1, '', 0, earL / 2, 0, m); e.rotation.z = -sx * 0.3; ears.push(e); }
  if (sp.antlers) for (const sx of [1, -1]) { const a = grp(head, sx * hs * 0.2, hs * 0.5, -hs * 0.1), am = mat(sp.glow ? '#e8dcff' : '#d8c8a0', sp.glow); box(a, 0.025, hs * 1.3, 0.025, '', 0, hs * 0.65, 0, am); for (let k = 0; k < 3; k++) { const b = box(a, 0.02, hs * 0.55, 0.02, '', sx * hs * 0.2, hs * (0.5 + k * 0.28), 0, am); b.rotation.z = -sx * 0.7; } a.rotation.z = -sx * 0.25; }
  if (sp.horns === 'curled') for (const sx of [1, -1]) { const hg = grp(head, sx * hs * 0.35, hs * 0.45, -hs * 0.1); const hm = mat('#c8baa0'); const h1 = box(hg, 0.05, hs * 0.45, 0.05, '', 0, hs * 0.22, 0, hm); h1.rotation.z = -sx * 0.7; const h2 = box(hg, 0.04, hs * 0.4, 0.04, '', -sx * hs * 0.2, hs * 0.1, -hs * 0.15, hm); h2.rotation.x = -0.8; }
  if (sp.tusks) for (const sx of [1, -1]) box(head, 0.03, 0.03, hs * 0.35, '', sx * hs * 0.25, -hs * 0.3, hs * 1.1, mat('#eee'));
  if (sp.mane) box(neck, bw * 0.2, nl * 0.9, bw * 0.55, '', 0, nl * 0.5, -0.1, dk);
  const tail = grp(body, 0, bh * 0.3, -L / 2); const tl = sp.tail === 'long' ? H * 0.8 : sp.tail === 'bushy' ? L * 0.55 : sp.tail === 'huge' ? L * 1.6 : H * 0.18;
  const tm = box(tail, sp.tail === 'bushy' || sp.tail === 'huge' ? bw * 0.7 : bw * 0.25, tl, sp.tail === 'bushy' || sp.tail === 'huge' ? bw * 0.7 : bw * 0.25, '', 0, -tl * (sp.tail === 'huge' ? -0.5 : 0.45), -0.02, sp.tail === 'bushy' ? mat(col, sp.glow) : m); tail.rotation.x = sp.tail === 'huge' ? -0.7 : sp.tail === 'bushy' ? 0.9 : 0.4; void tm;
  const saddle = grp(body, 0, bh / 2 + 0.02, -L * 0.05); g.userData.saddle = saddle; g.userData.height = legLen + bh;
  let ph = Math.random() * 6, t = Math.random() * 50, earT = 1; const J = { head: 0, neckX: 0, body: 0, rest: 0, tailZ: 0 };
  const update = (dt: number, st: any) => {
    t += dt; const spd = st.speed || 0, mode = st.mode || (spd > 0.2 ? 'move' : 'idle'); const run = spd > sp.spd * 0.55 ? 1 : 0;
    const f = spd * Math.PI * 2 / (sp.len * (run ? 2.2 : 1.6) + 0.4); if (spd > 0.15) ph += dt * f;
    const A = clamp(0.25 + spd * 0.07, 0, run ? 0.95 : 0.55) * (spd > 0.15 ? 1 : 0);
    const hop = sp.hop && spd > 0.15; const rest = mode === 'rest' ? 1 : 0, graze = mode === 'graze' ? 1 : 0, dead = mode === 'dead' ? 1 : 0;
    J.rest = damp(J.rest, rest, 3, dt); J.head = damp(J.head, graze ? 1 : mode === 'alert' ? -0.4 : 0, 4, dt);
    let fl: number, fr: number, rl: number, rr: number;
    if (run) { fl = Math.sin(ph); fr = Math.sin(ph + 0.4); rl = Math.sin(ph + Math.PI); rr = Math.sin(ph + Math.PI + 0.4); } else { fl = Math.sin(ph); rr = Math.sin(ph); fr = Math.sin(ph + Math.PI); rl = Math.sin(ph + Math.PI); }
    if (hop) { fl = fr = Math.sin(ph) * 0.9; rl = rr = -Math.sin(ph) * 0.9; }
    const vals = [fl, fr, rl, rr];
    legs.forEach((lg, i) => { const rv = J.rest; const sw = vals[i] * A; lg.l.rotation.x = damp(lg.l.rotation.x, sw * (1 - rv) + rv * (i < 2 ? -1.5 : 1.5), 12, dt); lg.kn.rotation.x = damp(lg.kn.rotation.x, (Math.max(0, i % 2 ? -Math.cos(ph + (i < 2 ? Math.PI : 0)) : Math.cos(ph + (i < 2 ? 0 : Math.PI))) * A * 1.3) * (1 - rv) + rv * (i < 2 ? 2.2 : -2.2), 12, dt); });
    const bob = (spd > 0.15 ? Math.abs(Math.sin(ph)) * (hop ? 0.22 : 0.035) * H * (run ? 1.4 : 1) : Math.sin(t * 1.6) * 0.005) - J.rest * legLen * 0.55;
    body.position.y = damp(body.position.y, legLen + bh / 2 - 0.02 + bob, 14, dt); body.rotation.x = damp(body.rotation.x, run ? Math.sin(ph) * 0.05 : 0, 8, dt);
    neck.rotation.x = damp(neck.rotation.x, J.head * (sp.neck ? 1.1 : 0.9) + Math.sin(t * 0.8) * 0.04 + (spd > 0.15 ? Math.sin(ph * 2) * 0.04 : 0), 6, dt); head.rotation.y = damp(head.rotation.y, mode === 'alert' ? Math.sin(t * 0.9) * 0.6 : Math.sin(t * 0.4) * 0.15, 3, dt);
    tail.rotation.z = Math.sin(t * (spd > 0.5 ? 5 : 2) + 1) * 0.25; earT -= dt; if (earT < 0) { earT = 1 + Math.random() * 3; ears[Math.random() < 0.5 ? 0 : 1].userData.tw = 0.3; }
    ears.forEach((e, i) => { const tw = e.userData.tw || 0; e.userData.tw = Math.max(0, tw - dt); e.rotation.x = Math.sin(e.userData.tw * 30) * 0.4 * (tw > 0 ? 1 : 0) + (mode === 'alert' ? -0.2 : 0); e.rotation.z = (i ? 1 : -1) * (0.3 + (mode === 'alert' ? -0.2 : 0)); });
    if (st.attack) { neck.rotation.x = -0.4 + st.attack * 0.8; }
    g.rotation.z = damp(g.rotation.z, dead ? Math.PI / 2 : 0, 6, dt); g.position.y = damp(g.position.y, dead ? 0.15 * H : 0, 6, dt);
  };
  g.traverse((o: any) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, update, saddle, height: legLen + bh };
}

export function buildBird(kind: string) {
  const g = new THREE.Group(); const big = kind === 'eagle' ? 2.6 : kind === 'owl' ? 1.3 : 0.7, col = kind === 'eagle' ? '#5a3f26' : kind === 'owl' ? '#a6926e' : ['#d9533a', '#4a7fb0', '#d8c04a'][Math.floor(Math.random() * 3)];
  const m = mat(col), s = 0.12 * big; const body = mesh(g, SPH, m, s * 0.9, s * 0.8, s * 1.5); const head = mesh(g, SPH, kind === 'eagle' ? mat('#f0ead8') : m, s * 0.55, s * 0.55, s * 0.55, 0, s * 0.3, s * 1.3); mesh(g, CONE, mat('#e0a63a'), s * 0.15, s * 0.4, s * 0.15, 0, s * 0.25, s * 1.8).rotation.x = Math.PI / 2; void head;
  if (kind === 'owl') { for (const sx of [1, -1]) mesh(g, SPH, mat('#ffe27a', '#ffcc33'), s * 0.14, s * 0.14, s * 0.1, sx * s * 0.25, s * 0.38, s * 1.65); }
  const wings = [1, -1].map((sx) => { const w = grp(g, sx * s * 0.6, s * 0.2, 0); box(w, s * 3, s * 0.1, s * 1.1, '', sx * s * 1.5, 0, 0, m); return w; });
  box(g, s * 0.7, s * 0.06, s * 1.3, '', 0, 0, -s * 1.8, m); g.traverse((o: any) => { if (o.isMesh) o.castShadow = false; });
  let t = Math.random() * 10;
  return { group: g, update: (dt: number, flying: boolean) => { t += dt; const f = flying ? (kind === 'eagle' ? 2.2 : 14) : 0; wings[0].rotation.z = Math.sin(t * f) * 0.7 + (flying ? 0 : -0.9); wings[1].rotation.z = -wings[0].rotation.z; body.rotation.x = flying ? 0 : -0.3; } };
}
export function buildFish(col = '#e8a23a') { const g = new THREE.Group(); mesh(g, SPH, mat(col), 0.09, 0.07, 0.25, 0, 0, 0, false); const tail = grp(g, 0, 0, -0.25); box(tail, 0.02, 0.14, 0.12, '', 0, 0, -0.04, mat(col)); return { group: g, tail }; }
export function buildFrog() { const g = new THREE.Group(); mesh(g, SPH, mat('#4d9a3a'), 0.1, 0.07, 0.12, 0, 0.07, 0, false); for (const sx of [1, -1]) mesh(g, SPH, mat('#e8f2a0'), 0.03, 0.03, 0.03, sx * 0.05, 0.14, 0.07, false); return g; }
export function makeNameTag(text: string, color = '#ffffff', sub?: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d')!; x.font = '600 26px Georgia,serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(10,8,6,0.55)'; const w = Math.min(250, x.measureText(text).width + 24);
  x.beginPath(); x.roundRect(128 - w / 2, 6, w, sub ? 52 : 40, 14); x.fill(); x.fillStyle = color; x.fillText(text, 128, 34); if (sub) { x.font = '18px Georgia,serif'; x.fillStyle = '#e5d6a8'; x.fillText(sub, 128, 54); }
  const tex = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); sp.scale.set(1.8, 0.45, 1); sp.renderOrder = 10; return sp;
}
