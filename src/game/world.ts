import * as THREE from 'three';
import { SETTLEMENTS } from './data';

export const HALF = 260, N = 260, STEP = (HALF * 2) / N;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(x: number, y: number) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x: number, y: number) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); }
export function fbm(x: number, y: number, o = 4) { let a = 0.5, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += vnoise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }

export const LAKE = { x: 135, z: 112, r: 42 };
const RIVER_RAW: [number, number][] = [[62, -182], [64, -165], [62, -148], [66, -120], [72, -92], [80, -60], [92, -25], [104, 15], [118, 55], [130, 85]];
export const PADS: { id: string; x: number; z: number; r: number; h?: number }[] = [
  ...SETTLEMENTS.map((s) => ({ id: s.id, x: s.x, z: s.z, r: s.flat })),
  { id: 'spire', x: -170, z: -150, r: 38 }, { id: 'fort', x: -10, z: 205, r: 32 }, { id: 'cave', x: -92, z: -205, r: 16 }, { id: 'grove', x: -205, z: 20, r: 20 }, { id: 'chapel', x: 95, z: -30, r: 14 }, { id: 'cove', x: 222, z: 112, r: 18 },
  { id: 'lodge', x: -110, z: 150, r: 12 }, { id: 'bandit1', x: -118, z: 40, r: 14 }, { id: 'bandit2', x: 40, z: 120, r: 12 }, { id: 'lighthouse', x: 230, z: -30, r: 12 },
];
export const ROADS: [number, number][][] = [];

function baseH(x: number, z: number) {
  let h = 8 + (fbm(x * 0.006 + 11, z * 0.006 + 7, 4) - 0.5) * 44 + (fbm(x * 0.022, z * 0.022, 3) - 0.5) * 8;
  const t = clamp((-62 - z) / 135, 0, 1); h += t * t * (62 + fbm(x * 0.012 + 5, z * 0.012, 3) * 62);
  h += smooth(-130, -200, x) * 6 * smooth(-100, -180, z); // western highlands
  const e = Math.max(Math.abs(x), Math.abs(z)); h -= smooth(214, 252, e) * 60;
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z); h -= (1 - smooth(LAKE.r * 0.55, LAKE.r * 1.15, dl)) * (h + 8);
  h += 14 * smooth(-146, -157, z) * (1 - smooth(25, 70, Math.abs(x - 62))); // waterfall cliff
  return h;
}
export const riverPts: { x: number; z: number; y: number }[] = [];
let heightFn: (x: number, z: number) => number;
let HG: Float32Array;
export function initHeights() {
  const pre = new Map<string, number>(); PADS.forEach((p) => { p.h = Math.max(2.4, baseH(p.x, p.z)); if (p.id === 'saltmere') p.h = 3.2; pre.set(p.id, p.h); });
  // river samples
  const pts: [number, number][] = []; for (let i = 0; i < RIVER_RAW.length - 1; i++) { const [ax, az] = RIVER_RAW[i], [bx, bz] = RIVER_RAW[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 4); for (let k = 0; k < n; k++) pts.push([lerp(ax, bx, k / n) + Math.sin(i * 3 + k) * 1.5, lerp(az, bz, k / n)]); }
  let lvl = 999; riverPts.length = 0;
  pts.forEach(([x, z]) => { const g = baseH(x, z); lvl = Math.min(lvl, g + 0.3); riverPts.push({ x, z, y: lvl }); });
  riverPts.forEach((p, i) => { p.y = Math.max(0.35, p.y - (i / riverPts.length) * 0.0); });
  const rv = (x: number, z: number) => { let bd = 1e9, by = 0; for (let i = 0; i < riverPts.length; i++) { const p = riverPts[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; by = p.y; } } return { d: Math.sqrt(bd), y: by }; };
  heightFn = (x, z) => {
    let h = baseH(x, z), pw = 0;
    for (const p of PADS) { const d = Math.hypot(x - p.x, z - p.z); const w = 1 - smooth(p.r, p.r + 26, d); if (w > 0) { h = lerp(h, p.h!, w); pw = Math.max(pw, w); } }
    if (pw < 0.99) { const r = rv(x, z); if (r.d < 9) { const w = (1 - smooth(2.6, 9, r.d)) * (1 - pw); h = lerp(h, Math.min(h, r.y - 1.0), w); } }
    return h;
  };
  HG = new Float32Array((N + 1) * (N + 1)); for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) HG[j * (N + 1) + i] = heightFn(-HALF + i * STEP, -HALF + j * STEP);
}
export function groundAt(x: number, z: number) {
  const fx = clamp((x + HALF) / STEP, 0, N - 0.001), fz = clamp((z + HALF) / STEP, 0, N - 0.001), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, W = N + 1;
  return lerp(lerp(HG[j * W + i], HG[j * W + i + 1], u), lerp(HG[(j + 1) * W + i], HG[(j + 1) * W + i + 1], u), v);
}
export const slopeAt = (x: number, z: number) => Math.max(Math.abs(groundAt(x + 1.5, z) - groundAt(x - 1.5, z)), Math.abs(groundAt(x, z + 1.5) - groundAt(x, z - 1.5))) / 3;
export function distToRoads(x: number, z: number) {
  let best = 1e9; for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) { const [ax, az] = r[i], [bx, bz] = r[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), d = Math.hypot(x - (ax + dx * t), z - (az + dz * t)); if (d < best) best = d; } return best;
}
export function forestness(x: number, z: number) { const f = fbm(x * 0.011 + 50, z * 0.011 - 20, 3); return f + 0.28 * (1 - clamp(Math.hypot(x + 165, z - 60) / 140, 0, 1)) + 0.1 * (1 - clamp(Math.hypot(x - 120, z + 140) / 80, 0, 1)); }
export function biomeAt(x: number, z: number) { const h = groundAt(x, z); if (h > 52) return 'snow'; if (h > 26 || z < -125) return 'mountain'; if (Math.hypot(x + 205, z - 20) < 28) return 'grove'; if (h < 2.8 && x > 150) return 'coast'; if (forestness(x, z) > 0.58) return 'forest'; return 'grass'; }

// ---------- procedural textures
function ctex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d')!; draw(x, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(rep, rep); return t;
}
const speckle = (x: CanvasRenderingContext2D, s: number, n: number, a: number, light = 128) => { for (let i = 0; i < n; i++) { const v = light + (Math.random() - 0.5) * a; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
export const TEX: Record<string, THREE.Texture> = {};
export function makeTextures() {
  TEX.ground = ctex(256, (x, s) => { x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, s, s); speckle(x, s, 5000, 90, 200); for (let i = 0; i < 200; i++) { x.strokeStyle = `rgba(90,90,90,${Math.random() * 0.25})`; const px = Math.random() * s, py = Math.random() * s; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 6, py - 4 - Math.random() * 6); x.stroke(); } }, 130);
  TEX.stone = ctex(256, (x, s) => { x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, s, s); const rh = s / 8; for (let r = 0; r < 8; r++) { const off = (r % 2) * s / 8; for (let c = 0; c < 4; c++) { const bw = s / 4; const g = 185 + Math.random() * 60; x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(c * bw + off + 1, r * rh + 1, bw - 3, rh - 3); } } speckle(x, s, 3000, 50, 190); x.strokeStyle = 'rgba(40,40,40,.55)'; x.lineWidth = 2; for (let r = 0; r <= 8; r++) { x.beginPath(); x.moveTo(0, r * rh); x.lineTo(s, r * rh); x.stroke(); } });
  TEX.wood = ctex(256, (x, s) => { x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, s, s); for (let i = 0; i < 12; i++) { const g = 190 + Math.random() * 50; x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(i * s / 12, 0, s / 12 - 2, s); } for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(60,40,20,${Math.random() * 0.25})`; x.fillRect(Math.random() * s, Math.random() * s, 1, 8 + Math.random() * 30); } x.fillStyle = 'rgba(30,20,10,.6)'; for (let i = 0; i <= 12; i++) x.fillRect(i * s / 12 - 1, 0, 2, s); });
  TEX.plaster = ctex(128, (x, s) => { x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, s, s); speckle(x, s, 2500, 40, 225); });
  TEX.roof = ctex(256, (x, s) => { x.fillStyle = '#bbb'; x.fillRect(0, 0, s, s); const rh = s / 8; for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { const g = 170 + Math.random() * 70; x.fillStyle = `rgb(${g},${g},${g})`; x.beginPath(); x.arc(c * s / 8 + (r % 2) * s / 16, r * rh, s / 16 + 1, 0, Math.PI); x.fill(); } } speckle(x, s, 2000, 50, 190); x.strokeStyle = 'rgba(0,0,0,.35)'; for (let r = 0; r < 8; r++) { x.beginPath(); x.moveTo(0, r * rh + rh * 0.55); x.lineTo(s, r * rh + rh * 0.55); x.stroke(); } });
  TEX.thatch = ctex(128, (x, s) => { x.fillStyle = '#c5c5c5'; x.fillRect(0, 0, s, s); for (let i = 0; i < 900; i++) { const g = 150 + Math.random() * 100; x.strokeStyle = `rgb(${g},${g},${g})`; const px = Math.random() * s; x.beginPath(); x.moveTo(px, Math.random() * s); x.lineTo(px + (Math.random() - 0.5) * 3, Math.random() * s); x.stroke(); } });
  TEX.floor = ctex(256, (x, s) => { x.fillStyle = '#ddd'; x.fillRect(0, 0, s, s); for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) { const g = 180 + Math.random() * 60; x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(c * s / 2 + (r % 2) * 40, r * s / 8, s / 2 - 3, s / 8 - 3); } speckle(x, s, 2000, 40, 210); });
  TEX.water = ctex(256, (x, s) => { x.fillStyle = '#8080ff'; x.fillRect(0, 0, s, s); for (let i = 0; i < 260; i++) { const px = Math.random() * s, py = Math.random() * s, r = 3 + Math.random() * 14; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(180,180,255,0.5)'); g.addColorStop(1, 'rgba(128,128,255,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } }, 40);
  TEX.flow = ctex(128, (x, s) => { x.fillStyle = '#3a8fb0'; x.fillRect(0, 0, s, s); for (let i = 0; i < 120; i++) { x.strokeStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.4})`; x.lineWidth = 1 + Math.random() * 2; const px = Math.random() * s; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (Math.random() - 0.5) * 8, s); x.stroke(); } });
  TEX.water.colorSpace = THREE.NoColorSpace;
}

export const WIND = { value: 0 }; export const SEASON = { tint: new THREE.Color(1, 1, 1) };
export function windMat(m: THREE.Material, amp: number, speed = 1.5) {
  (m as any).customProgramCacheKey = () => `wind${amp}_${speed}`;
  (m as any).onBeforeCompile = (sh: any) => {
    sh.uniforms.uTime = WIND; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ph = instanceMatrix[3].x*0.21 + instanceMatrix[3].z*0.27;
      #else
      float ph = position.x*0.3;
      #endif
      float sw = max(position.y, 0.0);
      transformed.x += sin(uTime*${speed.toFixed(2)}+ph)*${amp.toFixed(3)}*sw + sin(uTime*${(speed * 2.7).toFixed(2)}+ph*2.0)*${(amp * 0.3).toFixed(3)}*sw;
      transformed.z += cos(uTime*${(speed * 0.8).toFixed(2)}+ph)*${(amp * 0.6).toFixed(3)}*sw;`);
  };
  return m;
}

export interface Chunked { meshes: THREE.InstancedMesh[]; chunks: { cx: number; cz: number; ms: THREE.InstancedMesh[]; total: number }[]; }
export function chunkedInstances(parts: { g: THREE.BufferGeometry; m: THREE.Material; colorFn?: (i: number) => THREE.Color }[], items: THREE.Matrix4[], parent: THREE.Object3D, cell = 64, shadow = false): Chunked {
  const buckets = new Map<string, THREE.Matrix4[]>(); const p = new THREE.Vector3();
  items.forEach((m) => { p.setFromMatrixPosition(m); const k = Math.floor((p.x + HALF) / cell) + ',' + Math.floor((p.z + HALF) / cell); (buckets.get(k) || buckets.set(k, []).get(k)!).push(m); });
  const out: Chunked = { meshes: [], chunks: [] };
  buckets.forEach((arr, k) => { const [ix, iz] = k.split(',').map(Number); const ms = parts.map((pt) => { const im = new THREE.InstancedMesh(pt.g, pt.m, arr.length); arr.forEach((mx, i) => { im.setMatrixAt(i, mx); if (pt.colorFn) im.setColorAt(i, pt.colorFn(i)); }); im.instanceMatrix.needsUpdate = true; im.castShadow = shadow; im.receiveShadow = false; im.computeBoundingSphere(); im.frustumCulled = true; parent.add(im); out.meshes.push(im); return im; });
    out.chunks.push({ cx: -HALF + (ix + 0.5) * cell, cz: -HALF + (iz + 0.5) * cell, ms, total: arr.length }); });
  return out;
}
export const setDensity = (c: Chunked, d: number) => c.chunks.forEach((ch) => ch.ms.forEach((m) => (m.count = Math.floor(ch.total * Math.min(1, d)))));
export function cullChunks(c: Chunked, px: number, pz: number, dist: number) { c.chunks.forEach((ch) => { const v = Math.hypot(ch.cx - px, ch.cz - pz) < dist + 50; ch.ms.forEach((m) => (m.visible = v)); }); }

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
export const mx = (x: number, y: number, z: number, s: number, ry = 0, sy?: number, tilt = 0) => { tmpE.set(tilt, ry, 0); tmpQ.setFromEuler(tmpE); tmpS.set(s, sy ?? s, s); tmpP.set(x, y, z); return new THREE.Matrix4().compose(tmpP, tmpQ, tmpS); };
void tmpM;

export function buildVegetation(parent: THREE.Object3D, blocked: (x: number, z: number, m: number) => boolean) {
  const R = rng(1337), V: Record<string, Chunked> = {};
  const trunkG = new THREE.CylinderGeometry(0.22, 0.34, 3.2, 5); trunkG.translate(0, 1.6, 0);
  const lm = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  const trunkM = lm(0x6b4a2c);
  const crownG = new THREE.IcosahedronGeometry(2.3, 0); crownG.translate(0, 4.6, 0); const crown2 = new THREE.IcosahedronGeometry(1.6, 0); crown2.translate(0.7, 5.8, 0.4);
  const merged = mergeG([crownG, crown2]);
  const oakM = windMat(lm(0xffffff), 0.03, 1.3); (oakM as any).color.set(0x4f8a3a); SEASON_MATS.oak = oakM as any;
  const pineG = mergeG([cone(2.4, 3.2, 1.5), cone(1.9, 3.0, 3.4), cone(1.3, 2.6, 5.2), cone(0.8, 2.0, 6.8)]);
  const pineM = windMat(lm(0xffffff), 0.02, 1.1); (pineM as any).color.set(0x2f5f3a); SEASON_MATS.pine = pineM as any;
  const glowM = windMat(new THREE.MeshLambertMaterial({ color: 0x66e0ff, emissive: 0x2288aa, emissiveIntensity: 0.9 }), 0.03, 1);
  const mk = (n: number, test: (x: number, z: number, h: number) => number, minD = 3) => { // returns items with type
    const arr: { x: number; z: number; h: number; k: number }[] = []; let tries = 0; while (arr.length < n && tries < n * 14) { tries++; const x = (R() * 2 - 1) * (HALF - 8), z = (R() * 2 - 1) * (HALF - 8), h = groundAt(x, z); if (h < 0.7) continue; const k = test(x, z, h); if (k <= 0 || R() > k) continue; if (blocked(x, z, minD) || distToRoads(x, z) < 3.5) continue; arr.push({ x, z, h, k }); } return arr;
  };
  const oaks = mk(5200, (x, z, h) => (h < 32 && z > -130 ? clamp((forestness(x, z) - 0.46) * 4, 0.02, 1) : 0), 4);
  const pines = mk(3600, (x, z, h) => (h > 5 && h < 58 ? clamp((forestness(x, z) - 0.44) * 3, 0.01, 1) * (z < -100 || h > 24 ? 1 : 0.15) : 0), 4);
  const glows = mk(260, (x, z) => (Math.hypot(x + 205, z - 20) < 26 || Math.hypot(x + 170, z + 150) < 36 ? 1 : 0), 4);
  const col = (a: number[]) => () => new THREE.Color().setHSL(a[0] + R() * a[1], a[2], a[3] + R() * 0.12);
  V.oakT = chunkedInstances([{ g: trunkG, m: trunkM }, { g: merged, m: oakM, colorFn: col([0.27, 0.06, 0.45, 0.8]) }], oaks.map((t) => mx(t.x, t.h - 0.1, t.z, 0.8 + R() * 0.9, R() * 6.28, undefined, (R() - 0.5) * 0.08)), parent, 64, true);
  V.pine = chunkedInstances([{ g: trunkG, m: trunkM }, { g: pineG, m: pineM, colorFn: col([0.38, 0.04, 0.4, 0.78]) }], pines.map((t) => mx(t.x, t.h - 0.1, t.z, 0.8 + R() * 1.0, R() * 6.28, 0.9 + R() * 0.9)), parent, 64, true);
  V.glow = chunkedInstances([{ g: trunkG, m: trunkM }, { g: merged, m: glowM }], glows.map((t) => mx(t.x, t.h - 0.1, t.z, 0.9 + R() * 0.6, R() * 6.28)), parent, 64, false);
  // grass
  const gg = new THREE.BufferGeometry(); { const pos: number[] = [], colr: number[] = []; for (let b = 0; b < 3; b++) { const a = b * 2.1, ox = Math.cos(a) * 0.12, oz = Math.sin(a) * 0.12, tx = Math.cos(a + 1.6) * 0.07, tz = Math.sin(a + 1.6) * 0.07; pos.push(ox - tx, 0, oz - tz, ox + tx, 0, oz + tz, ox * 1.6, 0.62 + b * 0.08, oz * 1.6); colr.push(0.35, 0.5, 0.2, 0.35, 0.5, 0.2, 0.85, 1, 0.5); } gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); gg.computeVertexNormals(); }
  const grassM = windMat(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.16, 2.2); (grassM as any).color.set(0xffffff); SEASON_MATS.grass = grassM as any;
  const grass = mk(60000, (x, z, h) => (h < 40 && h > 0.9 && slopeAt(x, z) < 0.7 && !isRoadish(x, z) ? 0.9 : 0), 0.5);
  V.grass = chunkedInstances([{ g: gg, m: grassM, colorFn: col([0.24, 0.08, 0.5, 0.75]) }], grass.map((t) => mx(t.x, t.h - 0.02, t.z, 0.8 + R() * 1.1, R() * 6.28, 0.8 + R() * 0.9)), parent, 48, false);
  // flowers
  const stemG = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 3); stemG.translate(0, 0.16, 0); const headG = new THREE.OctahedronGeometry(0.075, 0); headG.translate(0, 0.36, 0);
  const flowerCols = ['#ffffff', '#ffd23a', '#ff6a8a', '#8a7bff', '#ff8a3a'].map((c) => new THREE.Color(c));
  const fl = mk(12000, (x, z, h) => (h < 30 && h > 0.9 && !isRoadish(x, z) ? 0.5 : 0), 0.5); const fm = fl.map((t) => mx(t.x, t.h, t.z, 0.7 + R() * 0.9, R() * 6.28));
  V.flowerS = chunkedInstances([{ g: stemG, m: windMat(lm(0x3d7a2a), 0.12, 2) }], fm, parent, 48);
  const fcol = fm.map(() => flowerCols[Math.floor(R() * 5)]); V.flowerH = chunkedInstances([{ g: headG, m: windMat(new THREE.MeshLambertMaterial({ color: 0xffffff }), 0.12, 2), colorFn: (i) => fcol[i % fcol.length] }], fm, parent, 48);
  // bushes
  const bushG = new THREE.IcosahedronGeometry(0.9, 0); bushG.translate(0, 0.6, 0); const bushM = windMat(lm(0xffffff), 0.04, 1.6); (bushM as any).color.set(0x4a7a30); SEASON_MATS.bush = bushM as any;
  const bushes = mk(2600, (x, z, h) => (h < 36 && h > 0.9 ? 0.35 + forestness(x, z) * 0.3 : 0), 1.5); V.bush = chunkedInstances([{ g: bushG, m: bushM, colorFn: col([0.25, 0.07, 0.4, 0.75]) }], bushes.map((t) => mx(t.x, t.h - 0.1, t.z, 0.7 + R() * 0.9, R() * 6, 0.7 + R() * 0.5)), parent, 64, false);
  // rocks
  const rockG = new THREE.DodecahedronGeometry(1, 0); rockG.translate(0, 0.4, 0); const rockM = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.95, flatShading: true });
  const rocks = mk(1900, (x, z, h) => (h > 0.5 ? 0.25 + (h > 24 ? 0.7 : 0) + slopeAt(x, z) * 0.6 : 0), 2); V.rock = chunkedInstances([{ g: rockG, m: rockM, colorFn: () => new THREE.Color().setHSL(0.1, 0.05, 0.6 + R() * 0.3) }], rocks.map((t) => { const s = 0.4 + Math.pow(R(), 3) * 3.2; return mx(t.x, t.h - 0.15, t.z, s, R() * 6, s * (0.6 + R() * 0.6), (R() - 0.5) * 0.4); }), parent, 64, true);
  // logs & mushrooms
  const logG = new THREE.CylinderGeometry(0.25, 0.3, 3, 6); logG.rotateZ(Math.PI / 2); logG.translate(0, 0.25, 0); const logs = mk(320, (x, z, h) => (h < 30 ? clamp((forestness(x, z) - 0.5) * 4, 0, 1) : 0), 2);
  V.log = chunkedInstances([{ g: logG, m: trunkM }], logs.map((t) => mx(t.x, t.h - 0.05, t.z, 0.8 + R() * 0.6, R() * 6.28)), parent, 64);
  const mushG = mergeG([cylG(0.035, 0.16, 0.08), (() => { const g = new THREE.SphereGeometry(0.11, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(0, 0.16, 0); return g; })()]);
  const mush = mk(900, (x, z, h) => (h < 26 ? clamp((forestness(x, z) - 0.55) * 5, 0, 1) : 0), 1); V.mush = chunkedInstances([{ g: mushG, m: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x335544, emissiveIntensity: 0.6 }), colorFn: () => new THREE.Color().setHSL(R() < 0.5 ? 0.02 : 0.12, 0.7, 0.55) }], mush.map((t) => mx(t.x, t.h, t.z, 0.8 + R() * 1.3, R() * 6)), parent, 64);
  return V;
}
export const SEASON_MATS: Record<string, THREE.MeshLambertMaterial> = {};
function isRoadish(x: number, z: number) { return distToRoads(x, z) < 4.5; }
function cone(r: number, h: number, y: number) { const g = new THREE.ConeGeometry(r, h, 6); g.translate(0, y + h / 2, 0); return g; }
function cylG(r1: number, h: number, y: number) { const g = new THREE.CylinderGeometry(r1, r1 * 1.3, h, 5); g.translate(0, y, 0); return g; }
export function mergeG(gs: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], idx: number[] = []; let off = 0; gs.forEach((g0) => { const g = g0.index ? g0 : g0; const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off); off += p.count; });
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); o.setIndex(idx); return o;
}

export function buildTerrain(parent: THREE.Object3D) {
  const g = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N); g.rotateX(-Math.PI / 2); const pos = g.attributes.position; const cols = new Float32Array(pos.count * 3);
  const C = (h: string) => new THREE.Color(h); const grass = C('#5f9440'), grass2 = C('#7aa648'), rock = C('#7c7a74'), snow = C('#f2f6fa'), sand = C('#d6c690'), forest = C('#3f6b30'), road = C('#9c8660'), cobble = C('#8e8a80'), burnt = C('#3a3430');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), j = Math.round((z + HALF) / STEP), ii = Math.round((x + HALF) / STEP), h = HG[j * (N + 1) + ii]; pos.setY(i, h);
    const sl = slopeAt(x, z), n = fbm(x * 0.05, z * 0.05, 2); const c = grass.clone().lerp(grass2, n);
    const f = forestness(x, z); if (f > 0.55) c.lerp(forest, clamp((f - 0.55) * 4, 0, 0.8));
    if (h < 1.6) c.lerp(sand, smooth(1.6, 0.3, h)); if (h < 0.3) c.lerp(C('#6a5a40'), 0.6);
    if (h > 24) c.lerp(rock, smooth(24, 38, h)); if (sl > 0.65) c.lerp(rock, smooth(0.65, 1.1, sl)); if (h > 50) c.lerp(snow, smooth(50, 60, h)); if (sl > 1.4 && h > 40) c.lerp(rock, 0.7);
    const dr = distToRoads(x, z); if (dr < 3.6) c.lerp(road, smooth(3.6, 1.6, dr) * 0.95);
    for (const s of SETTLEMENTS) { const d = Math.hypot(x - s.x, z - s.z); if (s.id === 'highcrown' && d < 40) c.lerp(cobble, smooth(40, 34, d)); else if (s.id === 'ashenvale' && d < s.flat) c.lerp(burnt, 0.7 * smooth(s.flat, 8, d)); else if (d < 10) c.lerp(cobble, smooth(10, 7, d)); }
    if (Math.hypot(x + 205, z - 20) < 24) c.lerp(C('#4aa090'), 0.5); if (Math.hypot(x - 222, z - 112) < 14) c.lerp(sand, 0.8);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.ground, roughness: 0.95 }); (SEASON_MATS as any).terrain = m; const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function buildRivers(parent: THREE.Object3D) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; const w = 3.4; let acc = 0;
  riverPts.forEach((p, i) => { const n = riverPts[Math.min(i + 1, riverPts.length - 1)], pr = riverPts[Math.max(i - 1, 0)]; let dx = n.x - pr.x, dz = n.z - pr.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const px = -dz, pz = dx; const ww = w + Math.min(3, i * 0.15); pos.push(p.x + px * ww, p.y, p.z + pz * ww, p.x - px * ww, p.y, p.z - pz * ww); acc += i ? Math.hypot(p.x - riverPts[i - 1].x, p.z - riverPts[i - 1].z) : 0; uv.push(0, acc / 6, 1, acc / 6); if (i < riverPts.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const tex = TEX.flow.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.88, roughness: 0.15, metalness: 0.1 }); const mesh = new THREE.Mesh(g, m); parent.add(mesh); return { mesh, tex };
}
