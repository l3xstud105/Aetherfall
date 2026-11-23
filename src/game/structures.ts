import * as THREE from 'three';
import { SETTLEMENTS } from './data';
import { ROADS, TEX, groundAt, distToRoads, rng, riverPts, lerp, clamp } from './world';

export interface Collider { x0: number; z0: number; x1: number; z1: number; tag?: string }
export interface Door { id: string; x: number; z: number; fx: number; fz: number; interior: string; label: string; name: string; shop?: string; fac?: string; houseId?: string; npc?: string; settle: string; open?: boolean }
export const ST = { colliders: [] as Collider[], doors: [] as Door[], platforms: [] as any[], anchors: {} as Record<string, any>, windows: [] as THREE.Mesh[], torches: [] as { x: number; y: number; z: number; big?: boolean }[], smoke: [] as { x: number; y: number; z: number }[], banners: [] as THREE.Mesh[], homes: [] as { x: number; z: number; s: string; fx: number; fz: number }[], benches: [] as { x: number; z: number; ry: number; s: string }[], updrafts: [] as any[], stalls: [] as any[], fires: [] as any[], water: [] as any[], wells: [] as any[] };
export const addCol = (x: number, z: number, w: number, d: number, tag?: string) => ST.colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, tag });
export function blocked(x: number, z: number, m = 0) { for (const c of ST.colliders) if (x > c.x0 - m && x < c.x1 + m && z > c.z0 - m && z < c.z1 + m) return true; for (const s of SETTLEMENTS) { if (s.kind === 'ruin') continue; const d = Math.hypot(x - s.x, z - s.z); if (d < 6 && s.id !== 'ashenvale') return true; } return false; }
export function groundFull(x: number, z: number, py: number) { let g = groundAt(x, z); for (const p of ST.platforms) { if (p.r !== undefined) { if (Math.hypot(x - p.x, z - p.z) < p.r && py >= p.y - 1.2) g = Math.max(g, p.y); } else if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && py >= p.y - 1.2) g = Math.max(g, p.y); } return g; }

// ---------- baking
const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 12), CONEG = new THREE.ConeGeometry(1, 1, 12);
function gableGeo(ends: boolean) {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0]; const t = ends ? [A, D, E, B, F, C] : [A, F, B, A, E, F, D, C, F, D, F, E];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(t.flat(), 3)); g.computeVertexNormals(); return g;
}
const GABLE = gableGeo(false), GABLE_E = gableGeo(true);
class Baker {
  groups: Record<string, THREE.BufferGeometry[]> = {};
  add(key: string, g0: THREE.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, ry = 0) {
    const g = (g0.index ? g0.toNonIndexed() : g0.clone()); const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz)); g.applyMatrix4(m);
    const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2), col = new Float32Array(p.count * 3), c = new THREE.Color(color), s = 0.25;
    for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); if (ay >= ax && ay >= az) { uv[i * 2] = p.getX(i) * s; uv[i * 2 + 1] = p.getZ(i) * s; } else if (ax >= az) { uv[i * 2] = p.getZ(i) * s; uv[i * 2 + 1] = p.getY(i) * s; } else { uv[i * 2] = p.getX(i) * s; uv[i * 2 + 1] = p.getY(i) * s; } const v = 0.9 + Math.random() * 0.1; col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); (this.groups[key] ||= []).push(g);
  }
  box(key: string, x: number, y: number, z: number, w: number, h: number, d: number, color: string, ry = 0) { this.add(key, BOXG, x, y, z, w, h, d, color, ry); }
  cyl(key: string, x: number, y: number, z: number, r: number, h: number, color: string) { this.add(key, CYLG, x, y, z, r, h, r, color); }
  cone(key: string, x: number, y: number, z: number, r: number, h: number, color: string) { this.add(key, CONEG, x, y, z, r, h, r, color); }
  gable(key: string, x: number, y: number, z: number, w: number, h: number, d: number, color: string, ry = 0, endColor?: string) { this.add(key, GABLE, x, y, z, w, h, d, color, ry); if (endColor) this.add('plaster', GABLE_E, x, y, z, w * 0.995, h, d * 0.97, endColor, ry); }
  finish(parent: THREE.Object3D, cast = true) {
    const texFor: Record<string, THREE.Texture | undefined> = { stone: TEX.stone, plaster: TEX.plaster, wood: TEX.wood, roof: TEX.roof, thatch: TEX.thatch, dark: undefined, glass: undefined };
    const out: Record<string, THREE.Mesh> = {};
    for (const k in this.groups) { const gs = this.groups[k]; let n = 0; gs.forEach((g) => (n += g.attributes.position.count)); const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3); let o = 0;
      gs.forEach((g) => { const c = g.attributes.position.count; pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3); uv.set(g.attributes.uv.array as Float32Array, o * 2); col.set(g.attributes.color.array as Float32Array, o * 3); o += c; g.dispose(); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = k === 'glass' ? new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color('#ffb85a'), emissiveIntensity: 0.15, roughness: 0.2 }) : new THREE.MeshStandardMaterial({ vertexColors: true, map: texFor[k] || null, roughness: 0.9 });
      const m = new THREE.Mesh(geo, mat); m.castShadow = cast && k !== 'glass'; m.receiveShadow = true; parent.add(m); out[k] = m; if (k === 'glass') ST.windows.push(m); }
    return out;
  }
}

const STYLES: Record<string, any> = {
  valdoria: { wall: ['#d8c7a0', '#cdbb90', '#d9cfae'], key: 'plaster', roof: ['#a8452e', '#9a3d2a', '#b4553a'], rk: 'roof', trim: '#5a3d22', base: '#8a8478' },
  thorn: { wall: ['#8a6a44', '#7d6040', '#94724a'], key: 'wood', roof: ['#b59a4a', '#a88e44', '#bda556'], rk: 'thatch', trim: '#4a3320', base: '#6e6a60' },
  kharun: { wall: ['#6a6e78', '#5e626c', '#747884'], key: 'stone', roof: ['#3c4350', '#343b47', '#444c5a'], rk: 'roof', trim: '#2c2a2e', base: '#505560' },
  salt: { wall: ['#e8e6dc', '#e0ddd0', '#ece9dc'], key: 'plaster', roof: ['#3a6e92', '#33627f', '#4a82a6'], rk: 'roof', trim: '#4a3a2c', base: '#9a9690' },
  burnt: { wall: ['#3a3330', '#2e2825', '#463d38'], key: 'stone', roof: ['#2a2420', '#2a2420', '#2a2420'], rk: 'wood', trim: '#1c1714', base: '#2c2826' },
};
const pick = (R: () => number, a: any[]): any => a[Math.floor(R() * a.length)];

function house(bk: Baker, R: () => number, o: { x: number; z: number; w: number; d: number; floors: number; style: string; door: 'N' | 'S' | 'E' | 'W'; broken?: boolean; special?: string }) {
  const S = STYLES[o.style], gy = groundAt(o.x, o.z), fh = 3.1, H = o.floors * fh, wc = pick(R, S.wall), rc = pick(R, S.roof);
  bk.box('stone', o.x, gy - 0.3, o.z, o.w + 0.4, 1.6, o.d + 0.4, S.base);
  bk.box(S.key, o.x, gy + 0.5 + (H - 0.5) / 2, o.z, o.w, H - 0.5, o.d, wc);
  // timber frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bk.box('wood', o.x + sx * o.w / 2, gy + H / 2, o.z + sz * o.d / 2, 0.35, H, 0.35, S.trim);
  for (let f = 1; f <= o.floors; f++) { bk.box('wood', o.x, gy + f * fh - 0.1, o.z, o.w + 0.3, 0.25, o.d + 0.3, S.trim); }
  const rh = Math.min(o.w, o.d) * 0.55 + 0.6; const alongX = o.w >= o.d;
  if (!o.broken) { if (alongX) bk.gable(S.rk, o.x, gy + H, o.z, o.w + 1.2, rh, o.d + 1.2, rc, 0, wc); else bk.gable(S.rk, o.x, gy + H, o.z, o.d + 1.2, rh, o.w + 1.2, rc, Math.PI / 2, wc); }
  else { bk.box('wood', o.x - o.w * 0.2, gy + H + 0.4, o.z, 0.25, 1.2, o.d, '#1c1714'); bk.box('wood', o.x + o.w * 0.25, gy + H + 0.2, o.z + 1, 0.25, 0.9, o.d * 0.6, '#1c1714'); }
  if (!o.broken && o.floors <= 3) { const cx = o.x + (alongX ? o.w * 0.25 : 0), cz = o.z + (alongX ? 0 : o.d * 0.25); bk.box('stone', cx, gy + H + rh * 0.55, cz, 0.9, rh + 1.2, 0.9, S.base); ST.smoke.push({ x: cx, y: gy + H + rh * 1.2 + 0.8, z: cz }); }
  // windows
  const win = (px: number, pz: number, ry: number, py: number) => { bk.box('glass', px, py, pz, ry ? 0.1 : 1.0, 1.1, ry ? 1.0 : 0.1, '#ffd48a'); bk.box('wood', px, py, pz, ry ? 0.16 : 1.3, 1.4, ry ? 1.3 : 0.16, S.trim); bk.box('glass', px, py, pz, ry ? 0.2 : 1.0, 1.1, ry ? 1.0 : 0.2, '#ffd48a'); };
  for (let f = 0; f < o.floors; f++) { const py = gy + f * fh + 1.9; const nx = Math.max(1, Math.floor(o.w / 3.4)), nz = Math.max(1, Math.floor(o.d / 3.4)); for (let i = 0; i < nx; i++) { const px = o.x - o.w / 2 + (i + 0.5) * o.w / nx; if (!(f === 0 && o.door === 'S' && Math.abs(px - o.x) < 1.6)) win(px, o.z + o.d / 2 + 0.02, 0, py); if (!(f === 0 && o.door === 'N' && Math.abs(px - o.x) < 1.6)) win(px, o.z - o.d / 2 - 0.02, 0, py); } for (let i = 0; i < nz; i++) { const pz = o.z - o.d / 2 + (i + 0.5) * o.d / nz; if (!(f === 0 && o.door === 'E' && Math.abs(pz - o.z) < 1.6)) win(o.x + o.w / 2 + 0.02, pz, 1, py); if (!(f === 0 && o.door === 'W' && Math.abs(pz - o.z) < 1.6)) win(o.x - o.w / 2 - 0.02, pz, 1, py); } }
  // door
  const dx = o.door === 'E' ? 1 : o.door === 'W' ? -1 : 0, dz = o.door === 'S' ? 1 : o.door === 'N' ? -1 : 0; const px = o.x + dx * (o.w / 2 + 0.05), pz = o.z + dz * (o.d / 2 + 0.05);
  bk.box('dark', px, gy + 1.25, pz, dz ? 1.4 : 0.14, 2.4, dz ? 0.14 : 1.4, '#3a2412'); bk.box('wood', px + dx * 0.02, gy + 1.25, pz + dz * 0.02, dz ? 1.9 : 0.12, 2.8, dz ? 0.12 : 1.9, S.trim); bk.box('stone', px + dx * 0.5, gy + 0.1, pz + dz * 0.5, dz ? 2.0 : 1, 0.25, dz ? 1 : 2.0, S.base);
  addCol(o.x, o.z, o.w + 0.2, o.d + 0.2, 'bld');
  const sx = o.x + dx * (o.w / 2 + 1.5), sz = o.z + dz * (o.d / 2 + 1.5); ST.torches.push({ x: px + dx * 0.6 + dz * 1.2, y: gy + 2.6, z: pz + dz * 0.6 + dx * 1.2 });
  return { door: { x: sx, z: sz, fx: dx, fz: dz }, y: gy };
}

function tower(bk: Baker, x: number, z: number, r: number, h: number, color: string, roof = '#3a4a6a') { const gy = groundAt(x, z); bk.cyl('stone', x, gy + h / 2 - 1, z, r, h + 2, color); bk.cyl('stone', x, gy + h + 0.4, z, r * 1.15, 0.9, color); bk.cone('roof', x, gy + h + 0.9 + r * 0.9, z, r * 1.25, r * 1.8, roof); addCol(x, z, r * 2, r * 2, 'tower'); }
function wallSeg(bk: Baker, x0: number, z0: number, x1: number, z1: number, h: number, color: string, thick = 3) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = Math.abs(x1 - x0) + (x0 === x1 ? thick : 0), d = Math.abs(z1 - z0) + (z0 === z1 ? thick : 0); let gy = 1e9; for (let i = 0; i <= 8; i++) gy = Math.min(gy, groundAt(lerp(x0, x1, i / 8), lerp(z0, z1, i / 8)));
  bk.box('stone', cx, gy + h / 2 - 1.5, cz, w, h + 3, d, color); bk.box('stone', cx, gy + h + 0.2, cz, w + (x0 === x1 ? 0.5 : 0), 0.5, d + (z0 === z1 ? 0.5 : 0), color);
  const len = Math.max(w, d), n = Math.floor(len / 2.6); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; bk.box('stone', lerp(x0, x1, t), gy + h + 0.95, lerp(z0, z1, t), x0 === x1 ? thick * 0.9 : 1.2, 1, z0 === z1 ? thick * 0.9 : 1.2, color); }
  addCol(cx, cz, w, d, 'wall');
}
const stallColors = ['#b8452e', '#2e6ab8', '#c8a42e', '#4a8a3a', '#8a3a8a'];
function stall(bk: Baker, x: number, z: number, ry: number, ci: number) { const gy = groundAt(x, z); const c = stallColors[ci % 5]; for (const [dx, dz] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) bk.box('wood', x + dx, gy + 1.2, z + dz, 0.15, 2.4, 0.15, '#4a3320'); bk.gable('thatch', x, gy + 2.4, z, 3.4, 0.7, 2.8, c, 0); bk.box('wood', x, gy + 0.55, z - 0.4, 2.6, 1.1, 0.8, '#6a4a2c'); bk.box('plaster', x - 0.6, gy + 1.2, z - 0.4, 0.5, 0.25, 0.4, '#e8c46a'); bk.box('plaster', x + 0.5, gy + 1.2, z - 0.4, 0.4, 0.22, 0.4, '#c05a3a'); addCol(x, z - 0.4, 2.8, 1.2); ST.stalls.push({ x, z: z + 1.8, ry }); void ry; }
function well(bk: Baker, x: number, z: number) { const gy = groundAt(x, z); bk.cyl('stone', x, gy + 0.5, z, 1.2, 1.2, '#8a8478'); bk.box('wood', x - 1.1, gy + 1.7, z, 0.14, 2.2, 0.14, '#4a3320'); bk.box('wood', x + 1.1, gy + 1.7, z, 0.14, 2.2, 0.14, '#4a3320'); bk.gable('thatch', x, gy + 2.8, z, 3, 0.8, 2.2, '#8a5a3a', 0); addCol(x, z, 2.5, 2.5); ST.wells.push({ x, z }); }
function lamp(bk: Baker, x: number, z: number, h = 3.6) { const gy = groundAt(x, z); bk.box('wood', x, gy + h / 2, z, 0.14, h, 0.14, '#2a2420'); bk.box('glass', x, gy + h + 0.15, z, 0.4, 0.4, 0.4, '#ffd48a'); ST.torches.push({ x, y: gy + h + 0.2, z }); }
function crate(bk: Baker, x: number, z: number, s = 0.9, c = '#8a6a3a') { const gy = groundAt(x, z); bk.box('wood', x, gy + s / 2, z, s, s, s, c, Math.random() * 3); }
function barrel(bk: Baker, x: number, z: number) { const gy = groundAt(x, z); bk.cyl('wood', x, gy + 0.5, z, 0.45, 1, '#6a4a2c'); }
function fence(bk: Baker, x0: number, z0: number, x1: number, z1: number) { const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, z1 - z0) / 2)); for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t), gy = groundAt(x, z); bk.box('wood', x, gy + 0.6, z, 0.12, 1.2, 0.12, '#5a3d22'); if (i < n) { const t2 = (i + 0.5) / n, mx = lerp(x0, x1, t2), mz = lerp(z0, z1, t2); const ang = Math.atan2(x1 - x0, z1 - z0); bk.box('wood', mx, gy + 0.9, mz, 0.08, 0.1, Math.hypot(x1 - x0, z1 - z0) / n, '#5a3d22', ang); bk.box('wood', mx, gy + 0.5, mz, 0.08, 0.1, Math.hypot(x1 - x0, z1 - z0) / n, '#5a3d22', ang); } } }
function tent(bk: Baker, x: number, z: number, c: string) { const gy = groundAt(x, z); bk.gable('thatch', x, gy, z, 3.4, 2.2, 3.2, c, 0, c); addCol(x, z, 3.2, 3, 'tent'); }
function campfire(x: number, z: number) { ST.fires.push({ x, z, y: groundAt(x, z) }); ST.torches.push({ x, y: groundAt(x, z) + 1, z, big: true }); }

export function defineRoads() {
  ROADS.length = 0; const P = (a: [number, number][]) => ROADS.push(a);
  P([[0, 36], [0, -40], [0, -78]]); P([[-76, -40], [0, -40], [76, -40], [98, -40], [112, -80], [118, -130], [110, -190]]);
  P([[0, 36], [30, 50], [70, 62], [113, 45], [150, 48], [175, 50]]); P([[-76, -40], [-100, -10], [-130, 40], [-148, 80]]); P([[-150, 90], [-110, 135], [-60, 165]]); P([[-60, 165], [-30, 188], [-10, 205]]);
  P([[-76, -40], [-120, -95], [-165, -140]]); P([[-170, -150], [-130, -180], [-92, -200]]); P([[175, 50], [205, 85], [222, 112]]); P([[175, 50], [210, 10], [230, -30]]); P([[96, -40], [95, -30]]); P([[-150, 90], [-118, 45]]); P([[-148, 90], [-112, 148]]); P([[-148, 90], [-175, 60], [-205, 22]]);
}

export function buildSettlements(parent: THREE.Object3D) {
  ST.colliders.length = 0; ST.doors.length = 0; ST.platforms.length = 0; ST.windows.length = 0; ST.torches.length = 0; ST.smoke.length = 0; ST.banners.length = 0; ST.homes.length = 0; ST.benches.length = 0; ST.updrafts.length = 0; ST.stalls.length = 0; ST.fires.length = 0; ST.water.length = 0; ST.wells.length = 0; ST.anchors = {};
  const bk = new Baker(), R = rng(777);
  const addDoor = (d: Partial<Door> & { x: number; z: number; fx: number; fz: number; interior: string; label: string; name: string; settle: string }) => ST.doors.push({ id: d.interior + ST.doors.length, ...d } as Door);
  const mk = (o: any, special?: any) => { const r = house(bk, R, o); ST.homes.push({ x: r.door.x, z: r.door.z, s: special?.settle || o.settle, fx: r.door.fx, fz: r.door.fz }); if (special) { addDoor({ ...r.door, ...special }); ST.homes.pop(); } return r; };
  // ===== HIGHCROWN
  { const S = SETTLEMENTS[0], cx = S.x, cz = S.z, W = 76, hy = 8; const wc = '#9a958a';
    wallSeg(bk, cx - W, cz + 76, cx - 7, cz + 76, hy, wc); wallSeg(bk, cx + 7, cz + 76, cx + W, cz + 76, hy, wc); wallSeg(bk, cx - W, cz - 76, cx + W, cz - 76, hy, wc);
    wallSeg(bk, cx + W, cz - 76, cx + W, cz - 6, hy, wc); wallSeg(bk, cx + W, cz + 6, cx + W, cz + 76, hy, wc); wallSeg(bk, cx - W, cz - 76, cx - W, cz - 6, hy, wc); wallSeg(bk, cx - W, cz + 6, cx - W, cz + 76, hy, wc);
    // note: south wall z=cz+76=36
    for (const [x, z] of [[cx - W, cz - 76], [cx + W, cz - 76], [cx - W, cz + 76], [cx + W, cz + 76], [cx - 7, cz + 76], [cx + 7, cz + 76], [cx + W, cz - 6], [cx + W, cz + 6], [cx - W, cz - 6], [cx - W, cz + 6]]) tower(bk, x, z, 3.4, 13, '#8e897e', '#8a3a2a');
    // castle keep
    const kz = cz - 56, ky = groundAt(cx, kz); bk.box('stone', cx, ky + 8, kz, 34, 18, 22, '#a8a296'); bk.box('stone', cx, ky + 1, kz + 11.2, 36, 2, 2, '#8e897e'); bk.gable('roof', cx, ky + 17, kz, 36, 5, 24, '#8a3a2a', Math.PI * 0 + 0, '#a8a296');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(bk, cx + sx * 17, kz + sz * 11, 4.2, 24, '#a29c90', '#8a3a2a'); addCol(cx, kz, 34, 22, 'keep');
    bk.box('dark', cx, ky + 2.6, kz + 11.1, 5, 5.2, 0.3, '#2a1a10'); bk.box('stone', cx, ky + 6, kz + 11.4, 7, 1, 1, '#8e897e'); bk.box('stone', cx, ky + 0.5, kz + 13, 9, 0.5, 4, '#8e897e'); bk.box('stone', cx, ky + 0.25, kz + 15, 11, 0.5, 4, '#8e897e');
    addDoor({ x: cx, z: kz + 17.5, fx: 0, fz: 1, interior: 'hall', label: 'Enter the Great Hall', name: 'Highcrown Great Hall', settle: 'highcrown', fac: 'crown', npc: 'maelis' });
    for (const sx of [-1, 1]) { bk.box('wood', cx + sx * 6, ky + 8, kz + 11.6, 0.2, 7, 0.2, '#3a2a1a'); const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6, 4, 8), new THREE.MeshStandardMaterial({ color: '#b8302a', side: THREE.DoubleSide, roughness: 0.9 })); b.position.set(cx + sx * 6, ky + 9.2, kz + 11.8); parent.add(b); ST.banners.push(b); }
    ST.anchors.highcrown = { plaza: { x: cx, z: cz + 2 }, castle: { x: cx, z: kz + 18 }, gate: { x: cx, z: cz + 74 }, forge: null };
    // market plaza
    const px = cx, pz = cz + 4; const gy = groundAt(px, pz); bk.cyl('stone', px, gy + 0.4, pz, 4.2, 0.8, '#9a958a'); bk.cyl('stone', px, gy + 1.2, pz, 0.9, 2.4, '#b0aa9e'); bk.cyl('stone', px, gy + 2.5, pz, 1.8, 0.4, '#b0aa9e'); addCol(px, pz, 8.4, 8.4); ST.water.push({ x: px, z: pz, y: gy + 0.85, r: 3.8 });
    for (let i = 0; i < 6; i++) stall(bk, cx - 22 + i * 8.8, cz + 20 + (i % 2) * 0, 0, i); for (let i = 0; i < 4; i++) { lamp(bk, cx - 12 + i * 8, cz - 8); }
    for (let i = 0; i < 6; i++) lamp(bk, cx + (i % 2 ? 5 : -5), cz + 30 - i * 14);
    // statue
    bk.box('stone', cx, groundAt(cx, cz - 16) + 1, cz - 16, 3, 2, 3, '#7a766c'); bk.cyl('stone', cx, groundAt(cx, cz - 16) + 4, cz - 16, 0.6, 4, '#a8a296'); bk.box('stone', cx, groundAt(cx, cz - 16) + 6.4, cz - 16, 1.4, 1.2, 1.4, '#a8a296'); addCol(cx, cz - 16, 3, 3);
    // houses grid
    const specials: Record<string, any> = {
      '-2,0': { w: 14, d: 11, f: 2, door: 'S', sp: { interior: 'tavern', label: "Enter The Gilded Stag", name: 'The Gilded Stag', shop: 'bess', npc: 'pell', fac: 'crown' } },
      '2,0': { w: 13, d: 10, f: 1, door: 'S', sp: { interior: 'smith', label: "Enter Ysolde's Forge", name: "Ysolde's Forge", shop: 'ysolde', npc: 'ysolde', fac: 'crown' } },
      '-2,1': { w: 13, d: 10, f: 1, door: 'N', sp: { interior: 'shop', label: "Enter Orrin's Goods", name: "Orrin's Goods", shop: 'orrin', npc: 'orrin', fac: 'crown' } },
      '2,1': { w: 15, d: 11, f: 2, door: 'N', sp: { interior: 'library', label: 'Enter the Highcrown Archive', name: 'Highcrown Archive', npc: 'tamsin', fac: 'crown' } },
    };
    for (let gx = -3; gx <= 3; gx++) for (let gz = -1; gz <= 3; gz++) { if (gx === 0) continue; const sp = specials[`${gx},${gz}`]; const bx = cx + gx * 22, bz = cz + gz * 22 - (gz >= 2 ? -4 : 0); if (Math.abs(gx) <= 1 && (gz === 0 || gz === 1)) continue;
      if (sp) { mk({ x: bx, z: bz, w: sp.w, d: sp.d, floors: sp.f, style: 'valdoria', door: sp.door }, { ...sp.sp, settle: 'highcrown' }); continue; }
      for (let lot = 0; lot < 2; lot++) { const w = 7.5 + R() * 2.5, d = 8 + R() * 2, x = bx + (lot ? 5.8 : -5.8) + (R() - 0.5), z = bz + (R() - 0.5) * 1.5; const floors = R() < 0.55 ? 2 : 1; const door = gz % 2 === 0 ? 'S' : 'N'; if (gx === 3 && gz === 1 && lot === 1) { mk({ x, z, w: 10, d: 10, floors: 2, style: 'valdoria', door }, { interior: 'home', label: 'Highcrown Townhouse (For Sale)', name: 'Highcrown Townhouse', houseId: 'townhouse', settle: 'highcrown' }); continue; } mk({ x, z, w, d, floors, style: 'valdoria', door, settle: 'highcrown' }); } }
    // estate
    mk({ x: cx + 52, z: cz - 40 + 10, w: 24, d: 16, floors: 2, style: 'valdoria', door: 'S' }, { interior: 'home', label: 'Royal Estate (For Sale)', name: 'Highcrown Royal Estate', houseId: 'estate', settle: 'highcrown' }); tower(bk, cx + 52 - 12, cz - 30 - 8, 2.6, 11, '#c8b890', '#a8452e'); tower(bk, cx + 52 + 12, cz - 30 - 8, 2.6, 11, '#c8b890', '#a8452e');
    ST.anchors.estate = { x: cx + 52, z: cz - 30 + 12 };
    // barracks yard
    ST.anchors.barracks = { x: cx - 30, z: cz - 60 }; bk.box('wood', cx - 30, groundAt(cx - 30, cz - 66) + 1.2, cz - 66, 6, 2.4, 0.5, '#5a3d22'); for (let i = 0; i < 3; i++) { bk.cyl('wood', cx - 33 + i * 3, groundAt(cx - 33, cz - 68) + 1, cz - 68, 0.4, 2, '#8a6a3a'); }
    ST.anchors.office = { x: cx + 14, z: cz + 6 };
  }
  // ===== VILLAGE / TOWN SCATTER
  const scatter = (S: any, n: number, R0: number, spec: any[], wallSize?: number, style?: string) => {
    const placed: Collider[] = []; const ok = (x: number, z: number, w: number, d: number) => { if (Math.hypot(x - S.x, z - S.z) < 11) return false; if (distToRoads(x, z) < Math.max(w, d) / 2 + 2) return false; for (const c of placed) if (x + w / 2 + 3 > c.x0 && x - w / 2 - 3 < c.x1 && z + d / 2 + 3 > c.z0 && z - d / 2 - 3 < c.z1) return false; if (groundAt(x, z) < 1.4) return false; if (wallSize && (Math.abs(x - S.x) > wallSize - 6 || Math.abs(z - S.z) > wallSize - 6)) return false; return true; };
    const doorToward = (x: number, z: number): 'N' | 'S' | 'E' | 'W' => { const dx = S.x - x, dz = S.z - z; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'E' : 'W') : dz > 0 ? 'S' : 'N'; };
    const all = [...spec, ...Array.from({ length: Math.max(0, n - spec.length) }, () => ({}))];
    all.forEach((sp: any) => { for (let t = 0; t < 140; t++) { const a = R() * 6.283, r = 13 + R() * (R0 - 13), w = sp.w || 7 + R() * 3.5, d = sp.d || 7 + R() * 3, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r; if (!ok(x, z, w, d)) continue; const door = doorToward(x, z); const fl = sp.f || (R() < 0.35 ? 2 : 1); placed.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
        if (sp.sp) mk({ x, z, w, d, floors: fl, style: style || S.style, door, settle: S.id }, { ...sp.sp, settle: S.id }); else mk({ x, z, w, d, floors: fl, style: style || S.style, door, settle: S.id }); break; } });
  };
  // Thornwick
  { const S = SETTLEMENTS[1]; well(bk, S.x, S.z); ST.anchors.thornwick = { plaza: { x: S.x, z: S.z + 4 }, farm: { x: S.x - 28, z: S.z + 24 }, stable: { x: S.x + 20, z: S.z + 22 } };
    scatter(S, S.houses, 40, [
      { w: 12, d: 10, f: 2, sp: { interior: 'tavern', label: 'Enter the Barley & Boar', name: 'The Barley & Boar', shop: 'bess', npc: 'bess', fac: 'moon' } },
      { w: 9, d: 8, f: 1, sp: { interior: 'alch', label: "Enter Wynn's Herbs", name: "Wynn's Herbs & Tinctures", shop: 'wynn', npc: 'wynn', fac: 'moon' } },
      { w: 9, d: 8, f: 1, sp: { interior: 'home', label: 'Thornwick Cottage (For Sale)', name: 'Thornwick Cottage', houseId: 'cottage' } }, { w: 10, d: 9, f: 1 }]);
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; lamp(bk, S.x + Math.cos(a) * 9, S.z + Math.sin(a) * 9, 3); }
    // farm
    const fx = S.x - 28, fz = S.z + 24; fence(bk, fx - 10, fz - 10, fx + 10, fz - 10); fence(bk, fx + 10, fz - 10, fx + 10, fz + 10); fence(bk, fx + 10, fz + 10, fx - 10, fz + 10); fence(bk, fx - 10, fz + 10, fx - 10, fz - 4);
    bk.box('wood', fx - 15, groundAt(fx - 15, fz - 14) + 2.5, fz - 14, 9, 5, 7, '#7a2a22'); bk.gable('roof', fx - 15, groundAt(fx - 15, fz - 14) + 5, fz - 14, 10, 3, 8, '#5a2a22', 0, '#7a2a22'); addCol(fx - 15, fz - 14, 9, 7, 'barn'); for (let i = 0; i < 3; i++) bk.cyl('wood', fx + 14 + i * 1.5, groundAt(fx + 14, fz - 14) + 0.7, fz - 14 + i, 0.9, 1.4, '#c8a84a');
    ST.anchors.plots = []; for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { const x = fx - 6 + j * 4.2, z = fz - 2 + i * 5; ST.anchors.plots.push({ x, z, id: `${i}${j}` }); bk.box('dark', x, groundAt(x, z) + 0.08, z, 3.4, 0.2, 3.6, '#4a3322'); }
    // stable paddock
    const sx = S.x + 20, sz = S.z + 22; fence(bk, sx - 8, sz - 6, sx + 8, sz - 6); fence(bk, sx + 8, sz - 6, sx + 8, sz + 8); fence(bk, sx + 8, sz + 8, sx - 8, sz + 8); fence(bk, sx - 8, sz + 8, sx - 8, sz - 6); bk.box('wood', sx, groundAt(sx, sz - 9) + 1.5, sz - 9, 8, 3, 3.5, '#6a4a2c'); bk.gable('thatch', sx, groundAt(sx, sz - 9) + 3, sz - 9, 9, 1.8, 4.5, '#b59a4a', 0, '#6a4a2c'); addCol(sx, sz - 9, 8, 3.5);
    ST.anchors.hob = { x: sx - 2, z: sz - 6 }; }
  // Frostgate
  { const S = SETTLEMENTS[2]; const wc = '#5a5e68'; const W = 44; wallSeg(bk, S.x - W, S.z - W, S.x + W, S.z - W, 7, wc); wallSeg(bk, S.x - W, S.z + W, S.x - 6, S.z + W, 7, wc); wallSeg(bk, S.x + 6, S.z + W, S.x + W, S.z + W, 7, wc); wallSeg(bk, S.x + W, S.z - W, S.x + W, S.z + W, 7, wc); wallSeg(bk, S.x - W, S.z - W, S.x - W, S.z + W, 7, wc);
    for (const [x, z] of [[S.x - W, S.z - W], [S.x + W, S.z - W], [S.x - W, S.z + W], [S.x + W, S.z + W], [S.x - 6, S.z + W], [S.x + 6, S.z + W]]) tower(bk, x, z, 3, 11, '#4e525c', '#2c3340');
    // keep
    const ky = groundAt(S.x, S.z - 30); bk.box('stone', S.x, ky + 7, S.z - 30, 22, 14, 16, '#4a4e58'); bk.gable('roof', S.x, ky + 14, S.z - 30, 24, 5, 18, '#2c3340', 0, '#4a4e58'); for (const sx of [-1, 1]) tower(bk, S.x + sx * 11, S.z - 30 - 8, 3.2, 18, '#454953', '#2c3340'); addCol(S.x, S.z - 30, 22, 16, 'keep'); ST.anchors.keep = { x: S.x, z: S.z - 19 };
    for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5.5, 4, 8), new THREE.MeshStandardMaterial({ color: '#2d4f9a', side: THREE.DoubleSide })); b.position.set(S.x + sx * 5, ky + 8, S.z - 21.6); parent.add(b); ST.banners.push(b); }
    ST.anchors.frostgate = { plaza: { x: S.x, z: S.z + 4 } }; well(bk, S.x, S.z + 4);
    scatter(S, S.houses, 36, [{ w: 12, d: 10, f: 2, sp: { interior: 'tavern', label: 'Enter the Frozen Flagon', name: 'The Frozen Flagon', shop: 'sigrun', npc: 'sigrun', fac: 'kharun' } }, { w: 11, d: 9, f: 1, sp: { interior: 'smith', label: "Enter Rurik's Frostforge", name: "Rurik's Frostforge", shop: 'rurik', npc: 'rurik', fac: 'kharun' } }], W);
    for (let i = 0; i < 5; i++) lamp(bk, S.x - 14 + i * 7, S.z + 12, 3.2); for (let i = 0; i < 3; i++) crate(bk, S.x + 14 + i, S.z + 8 + i); }
  // Saltmere
  { const S = SETTLEMENTS[3]; ST.anchors.saltmere = { plaza: { x: S.x - 6, z: S.z }, dock: { x: S.x + 38, z: S.z } }; well(bk, S.x - 6, S.z);
    scatter(S, S.houses, 36, [{ w: 12, d: 10, f: 2, sp: { interior: 'tavern', label: 'Enter the Drowned Lantern', name: 'The Drowned Lantern', shop: 'odo', npc: 'odo', fac: 'league' } }, { w: 11, d: 9, f: 1, sp: { interior: 'shop', label: "Enter Zaya's Exotics", name: "Zaya's Exotics", shop: 'zaya', npc: 'zaya', fac: 'league' } }, { w: 14, d: 11, f: 2, sp: { interior: 'home', label: 'Saltmere Manor (For Sale)', name: 'Saltmere Manor', houseId: 'manor' } }]);
    // pier
    const py = 1.3; for (let x = S.x + 28; x < S.x + 66; x += 2) { bk.box('wood', x, py, S.z, 2, 0.25, 6, '#7a5a38'); if ((x - S.x) % 6 === 0) { bk.cyl('wood', x, py - 1.5, S.z - 3, 0.25, 3.5, '#3a2a1a'); bk.cyl('wood', x, py - 1.5, S.z + 3, 0.25, 3.5, '#3a2a1a'); } } ST.platforms.push({ x0: S.x + 27, x1: S.x + 67, z0: S.z - 3, z1: S.z + 3, y: py + 0.12 });
    for (let k = 0; k < 2; k++) { const bx = S.x + 40 + k * 14, bz = S.z + 6 + (k ? 6 : 0); bk.box('wood', bx, 0.2, bz, 8, 1.2, 3, '#5a3d22'); bk.box('wood', bx, 3, bz, 0.2, 5, 0.2, '#3a2a1a'); bk.box('plaster', bx + 1, 3, bz, 0.1, 3.5, 2.5, '#e8e0cc'); }
    for (let i = 0; i < 6; i++) { crate(bk, S.x + 30 + i * 1.2, S.z - 5.5 + (i % 2) * 0.8, 1); barrel(bk, S.x + 30 + i * 1.5, S.z + 5); }
    for (let i = 0; i < 4; i++) lamp(bk, S.x + 29 + i * 11, S.z + 3.5, 3); }
  // Ashenvale (ruined)
  { const S = SETTLEMENTS[4]; ST.anchors.ashenvale = { plaza: { x: S.x, z: S.z } }; const pl: Collider[] = []; for (let i = 0; i < S.houses; i++) { for (let t = 0; t < 40; t++) { const a = i * 0.8 + R() * 0.6, r = 8 + R() * 16, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r; if (pl.some((c) => Math.abs(c.x0 - x) < 11 && Math.abs(c.z0 - z) < 11)) continue; pl.push({ x0: x, z0: z, x1: 0, z1: 0 }); house(bk, R, { x, z, w: 6 + R() * 3, d: 6 + R() * 3, floors: 1, style: 'burnt', door: 'S', broken: true }); break; } } ST.homes.length = ST.homes.length;
    bk.cyl('stone', S.x, groundAt(S.x, S.z) + 0.3, S.z, 1.5, 0.6, '#3a3430'); for (let i = 0; i < 6; i++) bk.box('wood', S.x + (R() - 0.5) * 30, groundAt(S.x, S.z) + 1, S.z + (R() - 0.5) * 30, 0.3, 2 + R() * 2, 0.3, '#1c1714');
    const gyA = groundAt(S.x, S.z); tent(bk, S.x - 8, S.z - 4, '#506850'); tent(bk, S.x + 8, S.z - 4, '#4a5a4a'); campfire(S.x, S.z + 4);
    for (let i = 0; i < 4; i++) bk.box('wood', S.x - 5 + i * 1.6, gyA + 0.6, S.z + 8, 1.4, 0.9, 3.2, '#8a6540');
    crate(bk, S.x + 4, S.z + 6, 1); crate(bk, S.x + 5.5, S.z + 6, 1); barrel(bk, S.x + 6, S.z + 7.5); lamp(bk, S.x - 2, S.z, 3); }
  buildLandmarks(bk, parent, R);
  bk.finish(parent);
  // waterfall foam mist handled in game
  return ST;
}

function buildLandmarks(bk: Baker, parent: THREE.Object3D, R: () => number) {
  const glowMesh = (x: number, y: number, z: number, r: number, h: number, color: string, op = 0.25) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, y, z); parent.add(m); return m; };
  // --- Spire ruins
  { const cx = -170, cz = -150, gy = groundAt(cx, cz); bk.cyl('stone', cx, gy + 14, cz, 6, 30, '#8a8a92'); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; bk.box('stone', cx + Math.cos(a) * 5.4, gy + 29 + R() * 4, cz + Math.sin(a) * 5.4, 1.6, 2 + R() * 4, 1.6, '#80808a'); } addCol(cx, cz, 12, 12, 'spire');
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, x = cx + Math.cos(a) * 20, z = cz + Math.sin(a) * 20, h = 2 + R() * 7; bk.cyl('stone', x, groundAt(x, z) + h / 2, z, 1, h, '#a0a0a8'); addCol(x, z, 2, 2); }
    bk.box('stone', cx + 20, groundAt(cx + 20, cz) + 5, cz + 5, 1.5, 10, 1.5, '#9a9aa2'); bk.box('stone', cx + 20, groundAt(cx + 20, cz) + 10, cz + 1, 1.5, 1.5, 9, '#9a9aa2');
    const px = cx, pz = cz + 10; const pg = groundAt(px, pz); const portal = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: '#7a4fe0', side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); portal.position.set(px, pg + 3.2, pz); parent.add(portal); const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.25, 8, 28), new THREE.MeshStandardMaterial({ color: '#b8a0ff', emissive: '#7a4fe0', emissiveIntensity: 1.2 })); ring.position.copy(portal.position); parent.add(ring); ST.anchors.portal = { x: px, z: pz + 1.5, mesh: portal, ring };
    bk.box('stone', px - 3.3, pg + 2.5, pz, 1, 5, 1, '#8a8a92'); bk.box('stone', px + 3.3, pg + 2.5, pz, 1, 5, 1, '#8a8a92'); bk.box('stone', px, pg + 6, pz, 8, 1, 1, '#8a8a92');
    ST.anchors.spire = { x: cx + 6, z: cz + 16 };
    for (const [ux, uz] of [[cx - 24, cz + 14], [cx + 28, cz - 8]]) { ST.updrafts.push({ x: ux, z: uz, r: 4, top: 75, mesh: glowMesh(ux, groundAt(ux, uz) + 38, uz, 4, 76, '#9fe8ff', 0.18) }); } }
  // --- Fort Cinderwatch
  { const cx = -10, cz = 205; const wc = '#4a423a'; for (const [a, b, c, d] of [[-18, -14, 18, -14], [18, -14, 18, 14], [-18, 14, -4, 14], [6, 14, 18, 14], [-18, -14, -18, 4]]) wallSeg(bk, cx + a, cz + b, cx + c, cz + d, 6, wc, 2.4); tower(bk, cx - 18, cz - 14, 3, 10, '#3e3730', '#2a2420'); tower(bk, cx + 18, cz - 14, 3, 10, '#3e3730', '#2a2420'); tower(bk, cx + 18, cz + 14, 3, 8, '#3e3730', '#2a2420');
    const ky = groundAt(cx, cz - 4); bk.box('stone', cx, ky + 5, cz - 6, 14, 10, 10, '#443c34'); bk.gable('roof', cx, ky + 10, cz - 6, 15, 3.5, 11, '#2a2420', 0, '#443c34'); addCol(cx, cz - 6, 14, 10, 'keep');
    tent(bk, cx - 10, cz + 4, '#5a3a2a'); tent(bk, cx + 10, cz + 4, '#5a3a2a'); campfire(cx, cz + 6); ST.anchors.fort = { x: cx, z: cz + 10 };
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2, 4.6, 4, 8), new THREE.MeshStandardMaterial({ color: '#c8302a', emissive: '#521008', side: THREE.DoubleSide })); b.position.set(cx - 18, ky + 9, cz - 14); parent.add(b); ST.banners.push(b);
    ST.doors.push({ id: 'fortress_undercroft_door', x: cx - 10, z: cz + 8, fx: 0, fz: -1, interior: 'fortress_undercroft', label: 'Enter Bastion Undercroft', name: 'Bastion Undercroft', settle: 'fort' }); }
  // --- Cave entrance
  { const cx = -92, cz = -205, gy = groundAt(cx, cz); bk.box('stone', cx - 4, gy + 3, cz, 3, 6, 4, '#6a6862'); bk.box('stone', cx + 4, gy + 3, cz, 3, 6, 4, '#6a6862'); bk.box('stone', cx, gy + 6.4, cz, 11, 2.4, 4.4, '#5e5c56'); bk.box('stone', cx, gy + 9, cz, 14, 4, 6, '#64625c'); bk.box('dark', cx, gy + 2.5, cz + 0.3, 5, 5, 2, '#050505'); addCol(cx - 4, cz, 3, 4); addCol(cx + 4, cz, 3, 4); ST.torches.push({ x: cx - 2.4, y: gy + 3, z: cz + 2.4 }, { x: cx + 2.4, y: gy + 3, z: cz + 2.4 });
    ST.doors.push({ id: 'cave_door', x: cx, z: cz + 4.5, fx: 0, fz: 1, interior: 'cave', label: 'Enter Hollowdeep Mine', name: 'Hollowdeep Mine', settle: 'cave' }); }
  // --- Glimmer grove standing stones
  { const cx = -205, cz = 20; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, x = cx + Math.cos(a) * 11, z = cz + Math.sin(a) * 11, h = 3 + R() * 2; bk.box('stone', x, groundAt(x, z) + h / 2, z, 1.2, h, 0.8, '#8aa8a0', a); addCol(x, z, 1.3, 1.3); } ST.anchors.grove = { x: cx, z: cz }; ST.updrafts.push({ x: cx, z: cz, r: 0.1, top: 0, mesh: glowMesh(cx, groundAt(cx, cz) + 4, cz, 11, 8, '#7affd8', 0.08) }); }
  // --- Smugglers cove
  { const cx = 222, cz = 112; tent(bk, cx - 5, cz - 3, '#3a4a58'); tent(bk, cx + 5, cz + 2, '#3a4a58'); for (let i = 0; i < 6; i++) crate(bk, cx - 3 + i * 1.2, cz + 5, 1); for (let i = 0; i < 4; i++) barrel(bk, cx + 8, cz - 4 + i); campfire(cx, cz); bk.box('wood', cx + 14, 0.3, cz + 4, 8, 1.2, 3, '#4a3320'); ST.anchors.cove = { x: cx, z: cz }; }
  // --- Chapel ruin & Crypt
  { const cx = 95, cz = -30; for (const [dx, dz, w, d] of [[-6, 0, 0.8, 10], [6, 0, 0.8, 10], [0, 5, 12, 0.8], [-4, -5, 4, 0.8], [4, -5, 3, 0.8]]) { bk.box('stone', cx + dx, groundAt(cx + dx, cz + dz) + 2.5 * (0.5 + R() * 0.5), cz + dz, w, 4 * (0.5 + R() * 0.5), d, '#8a867c'); addCol(cx + dx, cz + dz, w, d); } bk.box('stone', cx, groundAt(cx, cz - 3) + 0.6, cz - 3, 3, 1.2, 1.5, '#aaa59a'); ST.anchors.chapel = { x: cx, z: cz };
    ST.doors.push({ id: 'crypt_door', x: cx, z: cz - 4.5, fx: 0, fz: 1, interior: 'crypt', label: 'Enter Whispering Catacombs', name: 'Whispering Catacombs', settle: 'chapel' }); }
  // --- Sunken Veil & Temple
  { const cx = 210, cz = 10, gy = groundAt(cx, cz);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, x = cx + Math.cos(a) * 9, z = cz + Math.sin(a) * 9; bk.cyl('stone', x, groundAt(x, z) + 3, z, 1.1, 6, '#3a505a'); addCol(x, z, 2.2, 2.2); }
    bk.box('stone', cx, gy + 3, cz, 8, 1.2, 8, '#2a3a44');
    ST.doors.push({ id: 'sunken_temple_door', x: cx, z: cz + 3, fx: 0, fz: -1, interior: 'sunken_temple', label: 'Enter Sunken Aether Temple', name: 'Sunken Aether Temple', settle: 'sunken_veil' });
    ST.anchors.sunken_veil = { x: cx, z: cz + 4 }; }
  // --- Veilfall Cascade & Luminescent Grotto
  { const cx = 60, cz = -150, gy = groundAt(cx, cz);
    bk.box('stone', cx - 3, gy + 3, cz - 2, 3, 6, 4, '#4a5048'); bk.box('stone', cx + 3, gy + 3, cz - 2, 3, 6, 4, '#4a5048'); bk.box('stone', cx, gy + 6.5, cz - 2, 9, 2, 4, '#3e443c');
    addCol(cx - 3, cz - 2, 3, 4); addCol(cx + 3, cz - 2, 3, 4);
    ST.doors.push({ id: 'grotto_door', x: cx, z: cz + 2, fx: 0, fz: 1, interior: 'grotto', label: 'Enter Luminescent Grotto', name: 'Luminescent Grotto', settle: 'waterfall' });
    ST.anchors.waterfall = { x: cx, z: cz + 4 }; }
  // --- Lighthouse
  { const cx = 230, cz = -30, gy = groundAt(cx, cz); bk.cyl('plaster', cx, gy + 9, cz, 3, 22, '#e8e4d8'); bk.cyl('stone', cx, gy + 5, cz, 3.2, 3, '#c0382e'); bk.cyl('stone', cx, gy + 14, cz, 3.1, 3, '#c0382e'); bk.cyl('stone', cx, gy + 20.5, cz, 3.6, 1.2, '#444'); bk.cyl('glass', cx, gy + 22.2, cz, 2, 2.6, '#a8e4ff'); bk.cone('roof', cx, gy + 25, cz, 3.2, 3, '#3a3a44'); addCol(cx, cz, 6.4, 6.4, 'light'); ST.torches.push({ x: cx, y: gy + 22, z: cz, big: true }); ST.anchors.lighthouse = { x: cx, z: cz + 6 }; }
  // --- Lodge
  { const cx = -110, cz = 150; house(bk, R, { x: cx, z: cz, w: 7, d: 6, floors: 1, style: 'thorn', door: 'S' }); campfire(cx + 6, cz + 6); ST.anchors.lodge = { x: cx, z: cz + 6 }; }
  // --- Bandit camps
  { for (const [cx, cz, n] of [[-118, 40, 3], [40, 120, 2]] as [number, number, number][]) { for (let i = 0; i < n; i++) tent(bk, cx - 6 + i * 6, cz - 4 + (i % 2) * 5, '#4a3a30'); campfire(cx, cz); crate(bk, cx + 3, cz - 4); barrel(bk, cx + 4, cz - 5); } }
  // --- Floating islands
  const islands = [{ id: 'isle1', x: -40, z: -110, y: 62, r: 14 }, { id: 'isle2', x: -120, z: -60, y: 48, r: 13 }, { id: 'isle3', x: 60, z: 10, y: 38, r: 15 }];
  islands.forEach((is) => {
    const g = new THREE.Group(); g.position.set(is.x, is.y, is.z); parent.add(g); const top = new THREE.Mesh(new THREE.CylinderGeometry(is.r, is.r * 0.9, 2.2, 18), new THREE.MeshStandardMaterial({ color: '#68a048', map: TEX.ground, roughness: 1 })); top.position.y = -1.1; top.castShadow = true; top.receiveShadow = true; g.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(is.r * 0.92, is.r * 1.8, 8), new THREE.MeshStandardMaterial({ color: '#6a655c', roughness: 1, flatShading: true })); under.rotation.x = Math.PI; under.position.y = -2.2 - is.r * 0.9; under.castShadow = true; g.add(under);
    for (let i = 0; i < 5; i++) { const a = R() * 6.28, rr = R() * (is.r - 4), c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 5), new THREE.MeshStandardMaterial({ color: '#c8a8ff', emissive: '#7a4fe0', emissiveIntensity: 0.9 })); c.position.set(Math.cos(a) * rr, 1.1, Math.sin(a) * rr); g.add(c); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, tr = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4, 6), new THREE.MeshLambertMaterial({ color: '#3d7a3a' })); tr.position.set(Math.cos(a) * (is.r - 2), 2, Math.sin(a) * (is.r - 2)); g.add(tr); }
    ST.platforms.push({ x: is.x, z: is.z, r: is.r - 0.3, y: is.y, island: is.id }); (ST.anchors as any)[is.id] = { x: is.x, z: is.z, y: is.y, group: g };
    // updraft near
    const ux = is.x + (is.id === 'isle3' ? -22 : is.id === 'isle2' ? 22 : 0), uz = is.z + (is.id === 'isle1' ? 26 : is.id === 'isle3' ? 4 : 0); const gy2 = groundAt(ux, uz); ST.updrafts.push({ x: ux, z: uz, r: 3.6, top: is.y + 14, mesh: glowMesh(ux, gy2 + (is.y + 14 - gy2) / 2, uz, 3.6, is.y + 14 - gy2, '#9fe8ff', 0.16) });
  });
  // wooden bridges
  const bridge = (cx: number, cz: number, w: number, d: number) => { const y = Math.max(groundAt(cx - w / 2 - 1, cz), groundAt(cx + w / 2 + 1, cz)) + 0.25; for (let x = cx - w / 2; x < cx + w / 2; x += 1) bk.box('wood', x + 0.5, y - 0.1, cz, 1, 0.3, d, '#7a5a38'); for (const sz of [-1, 1]) { bk.box('wood', cx, y + 0.7, cz + sz * (d / 2 - 0.1), w, 0.12, 0.12, '#4a3320'); for (let x = cx - w / 2; x <= cx + w / 2; x += 3) bk.box('wood', x, y + 0.4, cz + sz * (d / 2 - 0.1), 0.14, 1.0, 0.14, '#4a3320'); addCol(cx, cz + sz * (d / 2 + 0.2), w, 0.3); } ST.platforms.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2 + 0.2, z1: cz + d / 2 - 0.2, y: y + 0.1 }); };
  const nearest = (z: number) => riverPts.reduce((b, p) => (Math.abs(p.z - z) < Math.abs(b.z - z) ? p : b), riverPts[0]);
  const r1 = nearest(-40), r2 = nearest(42); bridge(r1.x, -40, 18, 6); bridge(r2.x + 1, 44, 18, 6);
  void clamp;
}
