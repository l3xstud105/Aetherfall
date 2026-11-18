import * as THREE from 'three';
import { ANIMALS, ENEMIES, ITEMS, COMPANIONS, SETTLEMENTS, CLASSES, SHOPS } from './data';
import { S, addGold, addItem, bark, masteryXp, profXp, questEvent, gainXp, emitHud, derived, bus } from './store';
import { buildBird, buildCreature, buildFish, buildFrog, buildHumanoid, makeNameTag, shade, type Appearance } from './rigs';
import { ST, groundFull } from './structures';
import { INT_Y } from './interiors';
import { G, cfg, emit, floatText } from './fx';
import { groundAt, biomeAt, clamp, rng, LAKE } from './world';
import { audio } from './audio';

const rnd = (a: number, b: number) => a + Math.random() * (b - a); const pickA = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const SKINS = ['#f0c8a0', '#e0b48c', '#c99a72', '#a87a54', '#7a5238', '#f4d4b8'], HAIRC = ['#2a1a10', '#4a2f1b', '#7a4a24', '#b8864a', '#c9c9c9', '#1a1a1a', '#8a2a1a'], HAIRS = ['short', 'long', 'ponytail', 'braids', 'bun', 'bald'], EYES = ['#3a6ea5', '#4a7a3a', '#6a4a2a', '#5a5a5a'];
export const CAPES: Record<string, string> = { knight: '#2a4a8a', paladin: '#e8e0c8', battlemage: '#2a3a7a', mage: '#3a2a6a' };

export function appearanceFor(look: any, equip: any, cls?: string): Appearance {
  const it = (s: string) => (equip[s] ? ITEMS[equip[s]] : null); const ch = it('chest'), he = it('head'), w = it('weapon'), oh = it('offhand'), gl = it('hands'), bo = it('feet');
  return { skin: look.skin, hair: look.hair, hairColor: look.hairColor, eyes: look.eyes, beard: look.beard, brow: look.brow, build: look.build, height: look.height, chest: ch ? { style: ch.style || 'cloth', color: ch.color || '#7b6a50' } : { style: 'cloth', color: look.outfit }, helm: he ? { style: he.style || 'helm', color: he.color || '#999' } : null, gloves: gl?.color || null, boots: bo?.color || '#4a3322', cape: cls && CAPES[cls] && ch ? (look.outfit && look.outfit !== '#7b6a50' ? look.outfit : CAPES[cls]) : null, weapon: w ? { kind: w.kind!, color: w.color || '#bbb', bound: w.bound } : null, offhand: oh ? { kind: 'shield', color: oh.color || '#888' } : null, robe: ch?.style === 'robe', trim: look.outfit && look.outfit !== '#7b6a50' ? look.outfit : '#d9a93c' };
}
export const randomLook = () => ({ skin: pickA(SKINS), hair: pickA(HAIRS), hairColor: pickA(HAIRC), eyes: pickA(EYES), beard: Math.random() < 0.25 ? pickA(['stubble', 'full', 'goatee']) : 'none', brow: 'neutral', build: rnd(0.9, 1.15), height: rnd(0.92, 1.08), outfit: '#7b6a50' });

// ---------- collision helpers
export function collide(x: number, z: number, r: number, interior: any) {
  if (interior) { for (const c of interior.blockers) { if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) { const dl = x - (c.x0 - r), dr = c.x1 + r - x, dt = z - (c.z0 - r), db = c.z1 + r - z, m = Math.min(dl, dr, dt, db); if (m === dl) x = c.x0 - r; else if (m === dr) x = c.x1 + r; else if (m === dt) z = c.z0 - r; else z = c.z1 + r; } } return [x, z]; }
  for (const c of ST.colliders) { if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) { const dl = x - (c.x0 - r), dr = c.x1 + r - x, dt = z - (c.z0 - r), db = c.z1 + r - z, m = Math.min(dl, dr, dt, db); if (m === dl) x = c.x0 - r; else if (m === dr) x = c.x1 + r; else if (m === dt) z = c.z0 - r; else z = c.z1 + r; } }
  return [x, z];
}
export const faceAngle = (dx: number, dz: number) => Math.atan2(dx, dz);
const turn = (cur: number, tar: number, rate: number, dt: number) => { let d = ((tar - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return cur + d * (1 - Math.exp(-rate * dt)); };
export { turn };

// ---------- NPC definitions
const L = (skin: string, hair: string, hc: string, eyes = '#3a6ea5', beard = 'none') => ({ skin, hair, hairColor: hc, eyes, beard, brow: 'neutral', build: 1, height: 1, outfit: '#7b6a50' });
export const NPCDEFS: Record<string, any> = {
  maren: { name: 'Elder Maren', role: 'villager', fac: 'moon', s: 'thornwick', post: 'plaza', off: [3, -2], look: L('#d9b08c', 'long', '#d0d0d0', '#6a8a6a'), chest: ['robe', '#5a7a4a'], pitch: 0.8, act: 'talk' },
  lyra: { name: 'Lyra Thornfield', role: 'hunter', fac: 'moon', s: 'thornwick', post: 'plaza', off: [-7, 3], look: L('#d4a47c', 'ponytail', '#7a4a24', '#4a7a3a'), chest: ['leather', '#4a6b3a'], helm: ['hood', '#4a6b3a'], weapon: ['bow', '#7a5a38'], act: 'guard', pitch: 1.2 },
  tobin: { name: 'Old Tobin', role: 'farmer', fac: 'moon', s: 'thornwick', post: 'farm', off: [-3, 12], look: L('#c99a72', 'bald', '#888', '#6a4a2a', 'full'), chest: ['cloth', '#8a7a5a'], act: 'work', pitch: 0.7 },
  hob: { name: 'Hob the Stablemaster', role: 'villager', fac: 'moon', s: 'thornwick', post: 'hob', off: [0, 2], look: L('#d4a47c', 'short', '#4a2f1b', '#5a5a5a', 'stubble'), chest: ['leather', '#7a5a3a'], act: 'sweep', pitch: 0.9 },
  dorian: { name: 'Captain Dorian Vale', role: 'guard', fac: 'crown', s: 'highcrown', post: 'barracks', off: [0, 0], look: L('#d4a47c', 'short', '#2a1a10', '#3a6ea5', 'stubble'), chest: ['plate', '#a4aebb'], helm: ['helm', '#b0b9c5'], weapon: ['sword', '#d5dde6'], offhand: ['shield', '#9aa4b4'], cape: '#8a2a2a', act: 'guard', pitch: 0.7 },
  brann: { name: 'Ser Brann Aldous', role: 'guard', fac: 'crown', s: 'highcrown', post: 'barracks', off: [6, 4], look: L('#c99a72', 'short', '#3a3a3a', '#5a5a5a', 'full'), chest: ['plate', '#8a94a0'], weapon: ['sword', '#c0c8d0'], offhand: ['shield', '#6b7584'], cape: '#2a4a8a', act: 'guard', pitch: 0.75 },
  halvard: { name: 'Reeve Halvard', role: 'noble', fac: 'crown', s: 'highcrown', post: 'office', off: [0, 0], look: L('#e0b48c', 'short', '#b8864a', '#6a4a2a'), chest: ['cloth', '#3a5a8a'], act: 'talk', pitch: 1.1 },
  hilde: { name: 'Warden Hilde', role: 'guard', fac: 'kharun', s: 'frostgate', post: 'keep', off: [0, 2], look: L('#e0b48c', 'braids', '#c9a24a', '#4a7aa5'), chest: ['plate', '#4c5668'], helm: ['helm', '#5a6478'], weapon: ['axe', '#8fdcff'], act: 'guard', pitch: 1.0 },
  dalla: { name: 'Harbormaster Dalla', role: 'merchant', fac: 'league', s: 'saltmere', post: 'dock', off: [-6, 0], look: L('#a87a54', 'bun', '#1a1a1a', '#3a3a3a'), chest: ['cloth', '#3a6e92'], act: 'talk', pitch: 1.05 },
  poul: { name: 'Old Poul', role: 'sailor', fac: 'league', s: 'saltmere', post: 'dock', off: [16, -1.5], look: L('#c99a72', 'bald', '#c9c9c9', '#5a7a9a', 'full'), chest: ['leather', '#4a5a6a'], act: 'work', pitch: 0.7 },
  kestrel: { name: 'Kestrel', role: 'villager', fac: 'league', s: 'saltmere', post: 'plaza', off: [5, 3], look: L('#c99a72', 'ponytail', '#1a1a1a', '#6a4a2a'), chest: ['leather', '#2c2f3d'], helm: ['hood', '#2c2f3d'], weapon: ['dagger', '#b3bac2'], act: 'guard', pitch: 1.25 },
  corvin: { name: 'Corvin Vale', role: 'hunter', fac: 'ashen', s: 'thornwick', post: 'plaza', off: [-12, -8], look: L('#c99a72', 'short', '#1a1a24', '#7a4a24', 'stubble'), chest: ['plate', '#5b2f6b'], weapon: ['sword', '#a070cc', 'aether'], act: 'guard', pitch: 0.8 },
  iselle: { name: 'Sister Iselle', role: 'priest', fac: 'spire', s: 'saltmere', post: 'plaza', off: [-5, -4], look: L('#f0c8a0', 'long', '#d8c8a8', '#4a7a9a'), chest: ['robe', '#e9e4d3'], weapon: ['staff', '#9fe7a8', 'heal'], act: 'pray', pitch: 1.3 },
  aurel: { name: 'Keeper Aurel', role: 'priest', fac: 'spire', s: 'spire', post: 'spire', off: [0, 0], look: L('#d9b08c', 'long', '#e0e0e8', '#a08aff', 'full'), chest: ['robe', '#5a3aa0'], weapon: ['staff', '#c9a2ff', 'aether'], act: 'talk', pitch: 0.8 },
  fenn: { name: 'Fenn the Apprentice', role: 'villager', fac: 'spire', s: 'spire', post: 'spire', off: [5, -4], look: L('#e0b48c', 'short', '#8a2a1a', '#4a7a3a'), chest: ['robe', '#3f58b5'], act: 'read', pitch: 1.2 },
  // interior folk
  pell: { name: 'Innkeeper Pell', role: 'merchant', fac: 'crown', look: L('#e0b48c', 'bald', '#888', '#6a4a2a', 'full'), chest: ['cloth', '#8a3a2a'], pitch: 0.8 }, ysolde: { name: 'Ysolde the Smith', role: 'smith', fac: 'crown', look: L('#a87a54', 'braids', '#2a1a10', '#4a3a2a'), chest: ['leather', '#4a3a2a'], pitch: 1.0 },
  orrin: { name: 'Merchant Orrin', role: 'merchant', fac: 'crown', look: L('#e0b48c', 'short', '#4a2f1b', '#5a5a5a', 'goatee'), chest: ['cloth', '#3a6a4a'], pitch: 0.95 }, tamsin: { name: 'Archivist Tamsin', role: 'noble', fac: 'crown', look: L('#f0c8a0', 'bun', '#c9c9c9', '#4a6a9a'), chest: ['robe', '#6a4a7a'], pitch: 1.2 },
  bess: { name: 'Innkeeper Bess', role: 'merchant', fac: 'moon', look: L('#e0b48c', 'ponytail', '#b8864a', '#4a7a3a'), chest: ['cloth', '#7a5a8a'], pitch: 1.2 }, wynn: { name: 'Herbalist Wynn', role: 'merchant', fac: 'moon', look: L('#d4a47c', 'long', '#4a2f1b', '#4a7a3a'), chest: ['robe', '#4bb89a'], pitch: 1.15 },
  rurik: { name: 'Rurik Ironhand', role: 'smith', fac: 'kharun', look: L('#e0b48c', 'braids', '#7a4a24', '#4a7aa5', 'full'), chest: ['leather', '#3a3a44'], pitch: 0.65 }, sigrun: { name: 'Keeper Sigrun', role: 'merchant', fac: 'kharun', look: L('#f0c8a0', 'braids', '#c9a24a', '#4a7aa5'), chest: ['cloth', '#4a5a8a'], pitch: 1.1 },
  zaya: { name: 'Zaya the Trader', role: 'merchant', fac: 'league', look: L('#7a5238', 'bun', '#1a1a1a', '#5a3a1a'), chest: ['cloth', '#c08a2a'], pitch: 1.1 }, odo: { name: 'Odo the Landlord', role: 'merchant', fac: 'league', look: L('#c99a72', 'bald', '#888', '#5a5a5a', 'stubble'), chest: ['cloth', '#3a6e92'], pitch: 0.75 },
  maelis: { name: 'Duchess Maelis', role: 'noble', fac: 'crown', look: L('#f0c8a0', 'long', '#1a1a1a', '#3a3a6a'), chest: ['robe', '#6a1a2a'], helm: ['circlet', '#f0cd6a'], pitch: 1.05 },
  king: { name: 'King Aldric III', role: 'noble', fac: 'crown', look: L('#e8c8a8', 'short', '#d0d0d0', '#6a8aaa', 'full'), chest: ['robe', '#8a6a1a'], helm: ['circlet', '#f0cd6a'], pitch: 0.6 },
  hallguard1: { name: 'Palace Guard', role: 'guard', fac: 'crown', look: L('#d4a47c', 'short', '#2a1a10'), chest: ['plate', '#a4aebb'], helm: ['helm', '#b0b9c5'], weapon: ['sword', '#d5dde6'], pitch: 0.8 }, hallguard2: { name: 'Palace Guard', role: 'guard', fac: 'crown', look: L('#c99a72', 'short', '#2a1a10'), chest: ['plate', '#a4aebb'], helm: ['helm', '#b0b9c5'], weapon: ['sword', '#d5dde6'], pitch: 0.85 },
  patron1: { name: 'Patron', role: 'villager', look: L('#e0b48c', 'short', '#4a2f1b'), chest: ['cloth', '#6a5a3a'], pitch: 0.9 }, patron2: { name: 'Patron', role: 'villager', look: L('#c99a72', 'long', '#2a1a10'), chest: ['cloth', '#5a4a6a'], pitch: 1.1 },
  stranger: { name: 'Cloaked Stranger', role: 'villager', look: L('#c99a72', 'short', '#1a1a1a', '#555', 'stubble'), chest: ['leather', '#2a2a30'], helm: ['hood', '#2a2a30'], pitch: 0.85 },
  aether_stag: { name: 'Aether Stag', role: 'animal' },
};
export const npcApp = (d: any): Appearance => ({ ...d.look, chest: d.chest ? { style: d.chest[0], color: d.chest[1] } : { style: 'cloth', color: '#7b6a50' }, helm: d.helm ? { style: d.helm[0], color: d.helm[1] } : null, weapon: d.weapon ? { kind: d.weapon[0], color: d.weapon[1], bound: d.weapon[2] } : null, offhand: d.offhand ? { kind: d.offhand[0], color: d.offhand[1] } : null, cape: d.cape || null, robe: d.chest?.[0] === 'robe', boots: '#4a3322', trim: '#d9a93c', build: d.look.build, height: d.look.height });

export interface NPC { id: string; def: any; rig: any; pos: THREE.Vector3; yaw: number; seed: number; named: boolean; s?: string; role: string; fac?: string; shop?: string; tag?: any; act: string; actT: number; at: number; state: string; home?: any; dest: THREE.Vector3 | null; hidden: boolean; stuck: number; busy: boolean; lookYaw: number; emotion: string; patrol?: any[]; pi: number; sitSpot?: any; interior?: boolean; wake: number; greet: number; name: string; talking: boolean; talkT: number; speed: number; flee: number; fixed?: boolean; post?: THREE.Vector3 }

function mkNpc(id: string, def: any, x: number, z: number, o: any = {}): NPC {
  const rig = buildHumanoid(npcApp(def)); const y = o.y ?? groundFull(x, z, 99);
  const n: NPC = { id, def, rig, pos: new THREE.Vector3(x, y, z), yaw: o.ry ?? Math.random() * 6, seed: Math.random(), named: !!o.named, s: o.s || def.s, role: def.role, fac: def.fac, shop: SHOPS[id] ? id : def.shop, act: o.act || def.act || 'none', actT: 0, at: 0, state: 'task', dest: null, hidden: false, stuck: 0, busy: false, lookYaw: 0, emotion: 'neutral', pi: 0, wake: 0, greet: 0, name: def.name, talking: false, talkT: 0, speed: 0, flee: 0, fixed: o.fixed, interior: o.interior };
  n.shop = def.shop || (SHOPS[id] ? id : undefined); if (id === 'pell' || id === 'bess' && !def.shop) n.shop = 'bess'; if (id === 'bess' || id === 'pell') n.shop = 'bess';
  rig.group.position.copy(n.pos); rig.root.rotation.y = n.yaw; (o.parent || G.world).add(rig.group);
  if (o.named) { const tag = makeNameTag(def.name, def.fac ? ({ crown: '#f0d080', kharun: '#a0c0ff', league: '#80e0f0', moon: '#90f0c0', spire: '#c8b0ff', ashen: '#ff9070' } as any)[def.fac] : '#fff'); tag.position.set(0, 2.35, 0); tag.visible = false; rig.group.add(tag); n.tag = tag; }
  return n;
}
function anchor(s: string, post: string, off: number[] = [0, 0]) { const a = ST.anchors[s]?.[post]; if (a) return { x: a.x + off[0], z: a.z + off[1] }; const S0 = SETTLEMENTS.find((q) => q.id === s); if (post === 'spire') return { x: ST.anchors.spire.x + off[0], z: ST.anchors.spire.z + off[1] }; return { x: (S0?.x || 0) + off[0], z: (S0?.z || 0) + off[1] }; }

export function spawnNpcs() {
  G.npcs.forEach((n: NPC) => G.world.remove(n.rig.group)); G.npcs.length = 0;
  Object.entries(NPCDEFS).forEach(([id, d]) => { if (!d.post) return; const a = anchor(d.s, d.post, d.off); const n = mkNpc(id, d, a.x, a.z, { named: true, fixed: true }); n.post = new THREE.Vector3(a.x, n.pos.y, a.z); n.dest = null; n.yaw = Math.atan2((G.player?.pos.x ?? 0) - a.x, (G.player?.pos.z ?? 0) - a.z) * 0 + (d.s === 'highcrown' ? 0.3 : Math.PI * 0.8); G.npcs.push(n); });
  const civ = (s: string, count: number, roles: string[]) => { const homes = ST.homes.filter((h) => h.s === s); for (let i = 0; i < count; i++) { const role = roles[i % roles.length]; const lk = randomLook(); const kid = role === 'child'; lk.height = kid ? 0.62 : lk.height; lk.build = kid ? 0.8 : lk.build; const palette = { highcrown: ['#8a3a2a', '#3a5a8a', '#6a8a3a', '#8a7a2a', '#7a3a7a'], thornwick: ['#6a8a4a', '#8a6a3a', '#5a7a5a', '#8a7a5a'], frostgate: ['#4a5a7a', '#5a5a6a', '#7a6a5a'], saltmere: ['#3a6e92', '#c8b878', '#8a8a7a', '#6a4a3a'] }[s] || ['#7b6a50']; const col = pickA(palette);
      const def: any = { name: ({ guard: 'Guard', merchant: 'Merchant', child: 'Child', farmer: 'Farmhand', sailor: 'Sailor', noble: 'Noble', bard: 'Bard', priest: 'Priest', hunter: 'Hunter', miner: 'Miner', villager: 'Villager' } as any)[role] || 'Villager', role, fac: SETTLEMENTS.find((q) => q.id === s)?.fac, s, look: lk, chest: role === 'guard' ? ['plate', s === 'frostgate' ? '#4c5668' : '#a4aebb'] : role === 'noble' ? ['robe', pickA(['#6a1a2a', '#2a3a6a', '#2a5a3a'])] : role === 'priest' ? ['robe', '#e9e4d3'] : [pickA(['cloth', 'leather']), col], helm: role === 'guard' ? ['helm', '#b0b9c5'] : null, weapon: role === 'guard' ? ['sword', '#d5dde6'] : null, offhand: role === 'guard' && i % 2 ? ['shield', '#9aa4b4'] : null, cape: role === 'guard' && s === 'highcrown' ? '#8a2a2a' : null, pitch: kid ? 1.5 : rnd(0.7, 1.25) };
      const home = homes.length ? homes[Math.floor(Math.random() * homes.length)] : null; const a = anchor(s, 'plaza', [rnd(-8, 8), rnd(-8, 8)]); const n = mkNpc(`${s}_${i}`, def, a.x, a.z, { s }); n.home = home; n.dest = null; n.state = 'think'; n.actT = Math.random() * 3; if (role === 'guard') n.patrol = guardRoute(s, i); G.npcs.push(n); } };
  civ('highcrown', 36, ['villager', 'guard', 'merchant', 'villager', 'guard', 'child', 'noble', 'villager', 'merchant', 'guard', 'bard', 'priest', 'villager', 'guard']);
  civ('thornwick', 14, ['villager', 'farmer', 'villager', 'child', 'hunter', 'farmer', 'villager']);
  civ('frostgate', 14, ['guard', 'villager', 'miner', 'villager', 'guard', 'villager']);
  civ('saltmere', 16, ['sailor', 'villager', 'sailor', 'child', 'sailor', 'villager', 'merchant']);
}
function guardRoute(s: string, i: number) { const pl = anchor(s, 'plaza'); const pts: any[] = []; if (s === 'highcrown') { const c = ST.anchors.highcrown; const rt = [[c.gate.x, c.gate.z], [pl.x, pl.z], [c.castle.x, c.castle.z], [pl.x + 20, pl.z - 20], [pl.x - 20, pl.z - 20]]; for (let k = 0; k < rt.length; k++) pts.push(rt[(k + i) % rt.length]); } else { const S0 = SETTLEMENTS.find((q) => q.id === s)!; for (let k = 0; k < 4; k++) { const a = (k + i) * 1.57; pts.push([S0.x + Math.cos(a) * 24, S0.z + Math.sin(a) * 24]); } pts.push([pl.x, pl.z]); } return pts; }

export function updateNpcs(dt: number) {
  const P = G.player, pp = P.pos, c = cfg(), t = S.world.time; const night = t < 6 || t >= 22, evening = t >= 18 && t < 22, rain = !!G.weather.precip && G.weather.k > 0.5;
  for (const n of G.npcs as NPC[]) {
    if (n.interior) continue; const d = Math.hypot(n.pos.x - pp.x, n.pos.z - pp.z); const near = !P.inside && d < c.npcDist; const sim = !P.inside && d < c.npcDist * 1.5;
    n.rig.group.visible = near && !n.hidden; if (n.tag) n.tag.visible = near && d < 14 && !n.hidden;
    if (n.fixed) { // named, stationary NPCs: look & react
      if (!near) continue; const dx = pp.x - n.pos.x, dz = pp.z - n.pos.z; const ang = Math.atan2(dx, dz); const rel = ((ang - n.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; n.lookYaw = d < 9 ? clamp(rel, -0.9, 0.9) : 0; if (d < 6 && n.act !== 'talk' || (S.ui.dialogue && S.ui.dialogue.npc === n)) n.yaw = turn(n.yaw, ang, 3, dt);
      const talking = S.ui.dialogue?.npc === n; n.rig.root.rotation.y = n.yaw; n.rig.group.position.set(n.pos.x, n.pos.y, n.pos.z);
      n.greet -= dt; if (!talking && d < 5 && n.greet < -20) { n.greet = 1.6; n.emotion = 'happy'; } n.emotion = talking ? 'neutral' : n.greet > 0 ? 'happy' : 'neutral';
      n.rig.update(dt, { speed: 0, act: talking ? 'talk' : n.greet > 0 ? 'wave' : n.act === 'talk' ? (Math.sin(G.t * 0.3 + n.seed * 9) > 0.3 ? 'talk' : 'none') : n.act, at: 0, lookYaw: n.lookYaw, emotion: n.emotion, talkAmp: talking ? 1 : 0.6, talking: talking && S.hud.speaking === n.id }); continue; }
    if (!sim) { n.rig.group.visible = false; n.actT -= dt * 0.5; if (n.actT <= 0) { npcDecide(n, t, night, evening, rain, true); } continue; }
    // civilians
    n.actT -= dt; const talking = S.ui.dialogue?.npc === n;
    if (talking) { n.speed = 0; const ang = Math.atan2(pp.x - n.pos.x, pp.z - n.pos.z); n.yaw = turn(n.yaw, ang, 5, dt); n.rig.root.rotation.y = n.yaw; n.rig.update(dt, { speed: 0, act: 'talk', talkAmp: 1, talking: S.hud.speaking === n.id, emotion: 'neutral', lookYaw: 0 }); continue; }
    // react to combat nearby
    if (P.combatT > 0 && d < 14 && n.role !== 'guard' && n.role !== 'child' ? true : false) { if (n.flee <= 0) { n.flee = 5; n.emotion = 'surprised'; n.dest = n.home ? new THREE.Vector3(n.home.x, 0, n.home.z) : new THREE.Vector3(n.pos.x + (n.pos.x - pp.x) * 2, 0, n.pos.z + (n.pos.z - pp.z) * 2); n.state = 'walk'; } }
    n.flee -= dt; if (n.flee <= 0 && n.emotion === 'surprised') n.emotion = 'neutral';
    if (n.state === 'think' || (n.actT <= 0 && n.state === 'task')) npcDecide(n, t, night, evening, rain, false);
    let sp = 0;
    if (n.state === 'walk' && n.dest) {
      const dx = n.dest.x - n.pos.x, dz = n.dest.z - n.pos.z, dl = Math.hypot(dx, dz); const spd = (n.flee > 0 ? 4.8 : n.role === 'child' ? 3 : n.role === 'guard' ? 1.9 : 1.55 + n.seed * 0.5);
      if (dl < 0.7) { n.state = 'task'; n.pos.x = n.dest.x; n.pos.z = n.dest.z; arriveNpc(n, night, rain); } else { const nx = n.pos.x + dx / dl * spd * dt, nz = n.pos.z + dz / dl * spd * dt; const [cx, cz] = collide(nx, nz, 0.45, null); const moved = Math.hypot(cx - n.pos.x, cz - n.pos.z); n.pos.x = cx; n.pos.z = cz; sp = moved / dt; n.yaw = turn(n.yaw, Math.atan2(dx, dz), 8, dt); if (moved < spd * dt * 0.3) { n.stuck += dt; if (n.stuck > 1.6) { n.pos.x = n.dest.x; n.pos.z = n.dest.z; n.stuck = 0; n.state = 'task'; arriveNpc(n, night, rain); } } else n.stuck = 0; }
    }
    n.pos.y = groundFull(n.pos.x, n.pos.z, n.pos.y + 1); n.speed = n.speed + (sp - n.speed) * Math.min(1, dt * 8);
    // look at player when near & facing
    const ang = Math.atan2(pp.x - n.pos.x, pp.z - n.pos.z); const rel = ((ang - n.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; n.lookYaw = d < 8 && Math.abs(rel) < 2 ? clamp(rel, -0.9, 0.9) : 0;
    if (n.state === 'task' && d < 4 && n.greet <= 0 && Math.random() < dt * 0.4 && !n.hidden) { n.greet = 2; const rep = n.fac ? S.rep[n.fac] || 0 : 0; if (rep < -40 && n.role === 'guard') bark(n.name, 'I have my eye on you.', 2500); else if (rep >= 30) { n.act = 'wave'; n.actT = 1.6; n.emotion = 'happy'; } else if (n.role === 'merchant' && n.act === 'none') bark(n.name, pickA(['Fresh goods!', 'Finest prices in the realm!', 'Step right up!']), 2500); }
    n.greet -= dt * 0.5;
    if (n.state === 'task' && n.act !== 'none' && n.act !== 'sit' && n.act !== 'work' && n.act !== 'sweep' && n.act !== 'wave' && n.act !== 'carry' && n.act !== 'practice') { n.yaw = turn(n.yaw, n.yaw, 1, dt); }
    n.rig.group.position.set(n.pos.x, n.pos.y + (n.act === 'sit' && n.state === 'task' ? -0.0 : 0), n.pos.z); n.rig.root.rotation.y = n.yaw;
    if (n.rig.group.visible) n.rig.update(dt, { speed: n.speed, act: n.state === 'walk' ? (n.role === 'farmer' && n.act === 'carry' ? 'carry' : 'none') : n.act, at: ((G.t * 0.6 + n.seed) % 1), lookYaw: n.lookYaw, sit: n.act === 'sit' && n.state === 'task', emotion: n.emotion, talkAmp: 0.7, air: 'ground', crouch: false });
  }
}
function arriveNpc(n: NPC, night: boolean, rain: boolean) {
  const t = S.world.time; n.hidden = false; n.act = 'none';
  if (n.dest && n.home && Math.hypot(n.dest.x - n.home.x, n.dest.z - n.home.z) < 1.5 && (night || rain)) { n.hidden = true; n.actT = 25 + Math.random() * 20; return; }
  const kinds: Record<string, string[]> = { villager: ['talk', 'none', 'wave', 'eat', 'talk'], farmer: ['work', 'work', 'sweep', 'carry'], merchant: ['none', 'talk', 'none'], guard: ['guard', 'guard', 'none'], child: ['cheer', 'none', 'wave'], sailor: ['work', 'carry', 'work', 'talk'], noble: ['talk', 'none', 'point'], bard: ['cheer', 'talk'], priest: ['pray', 'pray', 'none'], hunter: ['guard', 'none', 'practice'], miner: ['work', 'none', 'carry'] };
  let a = pickA(kinds[n.role] || kinds.villager); if (t >= 18 && n.role === 'villager' && Math.random() < 0.4) a = 'sit'; n.act = a; n.actT = rnd(5, 16); if (a === 'sit') { n.actT = rnd(10, 25); }
  const b = G.npcs.find((o: NPC) => o !== n && !o.hidden && !o.interior && Math.hypot(o.pos.x - n.pos.x, o.pos.z - n.pos.z) < 4); if (b && (a === 'talk' || a === 'wave')) { n.yaw = Math.atan2(b.pos.x - n.pos.x, b.pos.z - n.pos.z); n.emotion = a === 'wave' ? 'happy' : 'neutral'; }
  if (a === 'carry') (n.rig as any).setCarry(true); else (n.rig as any).setCarry(false);
}
function npcDecide(n: NPC, t: number, night: boolean, evening: boolean, rain: boolean, far: boolean) {
  n.state = 'walk'; n.hidden = false; let tx: number, tz: number; const S0 = SETTLEMENTS.find((q) => q.id === n.s)!; const pl = anchor(n.s!, 'plaza');
  if (n.role === 'guard') { if (!n.patrol) n.patrol = guardRoute(n.s!, 0); n.pi = (n.pi + 1) % n.patrol.length; [tx, tz] = n.patrol[n.pi]; tx += rnd(-3, 3); tz += rnd(-3, 3); n.actT = 4; }
  else if (night || (rain && n.role !== 'sailor')) { if (n.home) { tx = n.home.x; tz = n.home.z; } else { tx = pl.x; tz = pl.z; } }
  else if (t < 8 && n.home && t >= 6) { tx = pl.x + rnd(-12, 12); tz = pl.z + rnd(-12, 12); }
  else if (n.role === 'merchant' && S0.id === 'highcrown') { const st = ST.stalls[Math.floor(n.seed * 997) % Math.max(1, ST.stalls.length)]; tx = st.x; tz = st.z - 1.2; n.actT = 20; }
  else if (n.role === 'farmer') { const f = anchor('thornwick', 'farm', [rnd(-8, 8), rnd(-8, 8)]); tx = f.x; tz = f.z; }
  else if (n.role === 'sailor') { const d = anchor('saltmere', 'dock', [rnd(-2, 22), rnd(-2, 2)]); tx = d.x; tz = d.z; }
  else if (n.role === 'miner') { const k = anchor('frostgate', 'plaza', [rnd(-20, 20), rnd(-8, 20)]); tx = k.x; tz = k.z; }
  else if (evening && ST.doors.length) { const door = ST.doors.filter((d) => d.settle === n.s && d.interior === 'tavern')[0]; if (door && Math.random() < 0.6) { tx = door.x; tz = door.z; } else { tx = pl.x + rnd(-10, 10); tz = pl.z + rnd(-10, 10); } }
  else if (n.role === 'child') { tx = pl.x + rnd(-16, 16); tz = pl.z + rnd(-16, 16); n.actT = 3; }
  else { const bench = ST.benches.filter((b) => b.s === n.s); if (bench.length && Math.random() < 0.15) { const b = pickA(bench); tx = b.x; tz = b.z; } else { tx = pl.x + rnd(-18, 18); tz = pl.z + rnd(-14, 14); } }
  [tx, tz] = collide(tx, tz, 0.6, null);
  if (far) { n.pos.x = tx; n.pos.z = tz; n.pos.y = groundAt(tx, tz); n.state = 'task'; n.actT = rnd(20, 40); if (n.home && Math.hypot(tx - n.home.x, tz - n.home.z) < 2) n.hidden = night || rain; return; }
  n.dest = new THREE.Vector3(tx, 0, tz); n.rig.setCarry(false);
}

// interior NPCs
export function spawnInteriorNpcs(interior: any, parent: THREE.Object3D, extra: any[] = []) {
  const out: NPC[] = []; [...interior.npcs, ...extra].forEach((q: any) => { const d = NPCDEFS[q.id]; if (!d) return; const n = mkNpc(q.id, d, q.x, q.z, { named: true, y: 0, parent, ry: q.ry, act: q.act, interior: true, fixed: true }); n.rig.group.position.set(q.x, (q.y || 0), q.z); n.pos.set(q.x, INT_Y + (q.y || 0), q.z); n.act = q.act || 'none'; if (n.act === 'sit') { n.rig.group.position.y = 0.0; } n.interior = true; out.push(n); }); return out;
}
export function updateInteriorNpcs(list: NPC[], dt: number) {
  const pp = G.player.pos; for (const n of list) { const d = Math.hypot(pp.x - n.pos.x, pp.z - n.pos.z); const talking = S.ui.dialogue?.npc === n; const ang = Math.atan2(pp.x - n.pos.x, pp.z - n.pos.z); if (talking || (d < 7 && n.act !== 'sit' && n.act !== 'work')) n.yaw = turn(n.yaw, ang, 3, dt); const rel = ((ang - n.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; if (n.tag) n.tag.visible = d < 12; n.rig.root.rotation.y = n.yaw;
    n.rig.group.position.y = n.act === 'sit' ? 0.0 : 0; n.rig.update(dt, { speed: 0, act: talking ? 'talk' : n.act, sit: n.act === 'sit', lookYaw: d < 9 ? clamp(rel, -0.9, 0.9) : 0, talkAmp: talking ? 1 : 0.5, talking: talking && S.hud.speaking === n.id, emotion: 'neutral', at: (G.t * 0.5) % 1 }); }
}

// ---------- enemies & wildlife
export interface Foe { id: string; type: string; def: any; rig: any; creature: any; pos: THREE.Vector3; yaw: number; hp: number; max: number; ai: string; state: string; home: THREE.Vector3; vel: THREE.Vector3; atkT: number; cd: number; dead: boolean; deadT: number; hitT: number; slow: number; timer: number; dest: THREE.Vector3 | null; passive: boolean; spd: number; aggro: boolean; key?: string; sp1: number; inside?: any; boss: boolean; name: string; flying: boolean; kb: THREE.Vector3; fleeFrom?: boolean; respawn: number; spec: any; zone: string; animal?: string; hover: number; attackAnim: number; ranged?: string }
export function spawnFoe(type: string, x: number, z: number, o: any = {}): Foe {
  const def = ENEMIES[type]; const sc = def.sc || 1; let rig: any = null, creature: any = null; let name = def.name;
  const grp = new THREE.Group(); (o.parent || G.world).add(grp);
  if (def.kind === 'beast') { const spec = { ...ANIMALS[def.animal], col: def.col || ANIMALS[def.animal].col, glow: def.fac === 'rift' ? '#a06bff' : undefined, belly: def.col ? shade(def.col, 1.2) : ANIMALS[def.animal].belly }; creature = buildCreature(spec); creature.group.scale.setScalar(sc); grp.add(creature.group); }
  else { const lk = randomLook(); const ap: any = { ...lk, chest: { style: def.kind === 'human' ? (def.wep === 'greatsword' || type === 'deserter' || type === 'assassin' ? (type === 'assassin' ? 'leather' : 'plate') : 'leather') : 'cloth', color: def.col || '#6a3a30' }, helm: type === 'karreth' || type === 'deserter' ? { style: 'helm', color: '#3a3a3e' } : type === 'assassin' ? { style: 'hood', color: '#1b1b24' } : null, weapon: def.wep ? { kind: def.wep, color: def.kind === 'skeleton' ? '#8a8a82' : '#b8c0c8', bound: type === 'karreth' ? 'fire' : undefined } : null, offhand: type === 'deserter' ? { kind: 'shield', color: '#6e7680' } : null, scale: sc, cape: type === 'karreth' ? '#2a0a0a' : type === 'rift_warden' ? '#3a1a6a' : null, boots: '#2a2018', skeleton: def.kind === 'skeleton', ghost: def.kind === 'wraith' ? def.col : undefined, robe: def.kind === 'wraith' };
    rig = buildHumanoid(ap); grp.add(rig.group); }
  if (def.boss || def.elite) { /* boss tint */ }
  const y = o.y ?? groundFull(x, z, 99); grp.position.set(x, y, z);
  const f: Foe = { id: o.id || type + Math.floor(Math.random() * 1e6), type, def, rig, creature, pos: new THREE.Vector3(x, y, z), yaw: Math.random() * 6, hp: def.hp, max: def.hp, ai: 'hostile', state: 'idle', home: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), atkT: 0, cd: 1, dead: false, deadT: 0, hitT: 0, slow: 0, timer: Math.random() * 3, dest: null, passive: false, spd: def.spd, aggro: false, sp1: 0, boss: !!def.boss, name, flying: def.kind === 'wraith', kb: new THREE.Vector3(), respawn: def.boss || o.noRespawn ? 0 : 300, spec: { t: 5 }, zone: o.zone || 'world', animal: def.animal, hover: 0, attackAnim: 0, inside: o.inside, ranged: def.ranged };
  (f as any).grp = grp; G.enemies.push(f); return f;
}
export function spawnAnimal(kind: string, x: number, z: number, o: any = {}) {
  const def = ANIMALS[kind]; const creature = buildCreature(def); const grp = new THREE.Group(); grp.add(creature.group); (o.parent || G.world).add(grp); const y = groundAt(x, z); grp.position.set(x, y, z);
  const f: any = { id: kind + Math.floor(Math.random() * 1e6), type: kind, def: { ...def, hp: def.hp, xp: Math.round(def.hp / 5), loot: def.loot, gold: [0, 0] }, rig: null, creature, pos: new THREE.Vector3(x, y, z), yaw: Math.random() * 6, hp: def.hp, max: def.hp, ai: def.neutral ? 'neutral' : 'prey', state: 'idle', home: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), atkT: 0, cd: 1, dead: false, deadT: 0, hitT: 0, slow: 0, timer: Math.random() * 4, dest: null, passive: true, spd: def.spd, aggro: false, sp1: 0, boss: false, name: def.name, flying: false, kb: new THREE.Vector3(), respawn: 360, spec: {}, zone: 'world', hover: 0, attackAnim: 0, grp, speciesSpeed: def.spd, animal: kind };
  G.enemies.push(f); return f;
}
const landOK = (x: number, z: number, minH = 1.1) => { const h = groundAt(x, z); return h > minH && h < 60; };
export function populateWorld() {
  G.enemies.forEach((f: any) => f.grp.parent?.remove(f.grp)); G.enemies.length = 0;
  const camp = (cx: number, cz: number, list: [string, number][]) => { list.forEach(([t, n]) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = 3 + Math.random() * 7; spawnFoe(t, cx + Math.cos(a) * r, cz + Math.sin(a) * r); } }); };
  camp(-118, 40, [['bandit', 4], ['bandit_archer', 1]]); camp(40, 120, [['bandit', 3], ['bandit_archer', 2]]); camp(-10, 205, [['bandit', 4], ['bandit_archer', 2], ['deserter', 1]]); spawnFoe('karreth', -10, 196, { id: 'karreth' });
  camp(222, 112, [['smuggler', 4]]); camp(95, -30, [['deserter', 2]]); camp(-170, -150, [['wraith', 3]]); camp(110, -150, [['scout', 7]]); camp(-120, -60 + 0, []);
  camp(210, 10, [['void_cultist', 3]]); spawnFoe('aether_golem', -80, -140, { id: 'aether_golem', noRespawn: true }); camp(-80, -140, [['void_cultist', 3]]);
  spawnFoe('bear_alpha', -105, 95, { id: 'bear_alpha', noRespawn: true }); spawnFoe('white_wolf', -30, -150, { id: 'white_wolf', noRespawn: true });
  const rr = rng(99); const place = (n: number, fn: (x: number, z: number) => boolean, f: (x: number, z: number) => void) => { let c = 0, tries = 0; while (c < n && tries < n * 60) { tries++; const x = (rr() * 2 - 1) * 230, z = (rr() * 2 - 1) * 230; if (!landOK(x, z) || !fn(x, z)) continue; f(x, z); c++; } };
  const far = (x: number, z: number) => SETTLEMENTS.every((s) => Math.hypot(x - s.x, z - s.z) > s.flat + 8) && ST.doors.every((d) => Math.hypot(x - d.x, z - d.z) > 12);
  place(12, (x, z) => far(x, z) && biomeAt(x, z) === 'forest', (x, z) => { for (let i = 0; i < 3; i++) spawnFoe('wolf', x + i * 2, z + (i % 2) * 2); });
  place(6, (x, z) => far(x, z) && (biomeAt(x, z) === 'forest' || biomeAt(x, z) === 'mountain'), (x, z) => spawnFoe('bear', x, z));
  place(10, (x, z) => far(x, z) && biomeAt(x, z) === 'mountain', (x, z) => spawnAnimal('ram', x, z));
  place(34, (x, z) => far(x, z) && biomeAt(x, z) === 'forest', (x, z) => spawnAnimal('deer', x, z)); place(14, far, (x, z) => spawnAnimal('fox', x, z));
  place(40, (x, z) => far(x, z) && biomeAt(x, z) !== 'mountain', (x, z) => spawnAnimal('rabbit', x, z)); place(16, (x, z) => far(x, z) && biomeAt(x, z) === 'forest', (x, z) => spawnAnimal('boar', x, z)); place(26, (x, z) => biomeAt(x, z) === 'forest', (x, z) => spawnAnimal('squirrel', x, z)); place(12, (x, z) => far(x, z) && biomeAt(x, z) === 'grass', (x, z) => spawnAnimal('horse', x, z));
  for (let i = 0; i < 6; i++) spawnAnimal('glimmerfox', -205 + rnd(-12, 12), 20 + rnd(-12, 12));
  const stag: any = spawnAnimal('aether_stag', -205, 18); stag.ai = 'stag'; stag.passive = true; stag.def.loot = []; stag.hp = stag.max = 9999; stag.unique = true;
  // birds, fish, frogs
  G.birds.length = 0; G.fish.length = 0; G.frogs.length = 0;
  for (let i = 0; i < 40; i++) { const x = (rr() * 2 - 1) * 220, z = (rr() * 2 - 1) * 220; if (!landOK(x, z)) continue; const b = buildBird('song'); G.world.add(b.group); G.birds.push({ ...b, kind: 'song', cx: x, cz: z, r: 6 + rr() * 12, a: rr() * 6, sp: 0.4 + rr() * 0.4, alt: 5 + rr() * 8 }); }
  for (let i = 0; i < 6; i++) { const x = (rr() * 2 - 1) * 200, z = -60 - rr() * 150; const b = buildBird('eagle'); G.world.add(b.group); G.birds.push({ ...b, kind: 'eagle', cx: x, cz: z, r: 40 + rr() * 30, a: rr() * 6, sp: 0.18, alt: 70 + rr() * 30 }); }
  for (let i = 0; i < 8; i++) { const x = -250 + rr() * 200, z = rr() * 200 - 50; if (!landOK(x, z) || biomeAt(x, z) !== 'forest') continue; const b = buildBird('owl'); G.world.add(b.group); G.birds.push({ ...b, kind: 'owl', cx: x, cz: z, r: 10 + rr() * 8, a: rr() * 6, sp: 0.25, alt: 6 + rr() * 5 }); }
  for (let i = 0; i < 70; i++) { const a = rr() * 6.28, r = rr() * LAKE.r * 0.8; const x = LAKE.x + Math.cos(a) * r, z = LAKE.z + Math.sin(a) * r; if (groundAt(x, z) > -1.2) continue; const f = buildFish(pickA(['#e8a23a', '#c8c8d0', '#d85a3a', '#6aa0d0'])); G.world.add(f.group); G.fish.push({ ...f, cx: x, cz: z, r: 2 + rr() * 5, a: rr() * 6, sp: 0.6 + rr() }); }
  for (let i = 0; i < 40; i++) { const x = 205 + rr() * 40, z = -100 + rr() * 260; if (groundAt(x, z) > -1.5) continue; const f = buildFish(pickA(['#e8a23a', '#6aa0d0', '#c8c8d0'])); G.world.add(f.group); G.fish.push({ ...f, cx: x, cz: z, r: 3 + rr() * 6, a: rr() * 6, sp: 0.6 + rr() }); }
  for (let i = 0; i < 18; i++) { const a = rr() * 6.28, r = LAKE.r * (0.9 + rr() * 0.4); const x = LAKE.x + Math.cos(a) * r, z = LAKE.z + Math.sin(a) * r; const h = groundAt(x, z); if (h < 0.1 || h > 1.5) continue; const fr = buildFrog(); fr.position.set(x, h, z); G.world.add(fr); G.frogs.push({ g: fr, x, z, t: rr() * 5, vy: 0 }); }
}
export function spawnInteriorFoes(interior: any, parent: THREE.Object3D) { const out: Foe[] = []; interior.enemies.forEach((q: any) => { const f = spawnFoe(q.type, q.x, q.z, { parent, y: 0, zone: 'int', id: q.type === 'gravewarden' || q.type === 'rift_warden' ? q.type : undefined, noRespawn: true, inside: interior }); f.pos.y = 0; (f as any).grp.position.set(q.x, 0, q.z); out.push(f); }); return out; }
export function removeFoe(f: any) { f.grp.parent?.remove(f.grp); const i = G.enemies.indexOf(f); if (i >= 0) G.enemies.splice(i, 1); }

export function damageFoe(f: any, dmg: number, el = 'phys', kb = 0, from?: THREE.Vector3, crit = false) {
  if (f.dead || f.invuln) return; if (f.ai === 'stag') { return; }
  const isStaggered = (f.staggered || 0) > 0;
  const effectiveDmg = isStaggered ? dmg * 1.35 : dmg;
  f.hp -= effectiveDmg; f.hitT = 0.18; f.aggro = true; if (f.passive && f.ai === 'neutral') { f.passive = false; f.ai = 'hostile'; f.def = { ...f.def, dmg: f.def.dmg || 9 }; }
  if (from && kb) { const dx = f.pos.x - from.x, dz = f.pos.z - from.z, l = Math.hypot(dx, dz) || 1; f.kb.set(dx / l * kb, 0, dz / l * kb); }
  
  if (!isStaggered && !f.passive) {
    const sc = f.def.sc || 1;
    const thresh = f.boss ? 190 : 80;
    f.stagger = (f.stagger || 0) + dmg * (kb > 0 ? 1.6 : 1) * (crit ? 1.8 : 1);
    if (f.stagger >= thresh) {
      f.stagger = 0;
      f.staggered = f.boss ? 1.5 : 2.4;
      floatText('STAGGERED!', new THREE.Vector3(f.pos.x, f.pos.y + 2.3 * sc, f.pos.z), '#ffe27a', true);
      audio.sfx('unlock');
      emit('spark', f.pos.x, f.pos.y + 1.2 * sc, f.pos.z, '#ffe27a', 25, 4, 0.6, 5);
    }
  }

  floatText(String(Math.round(effectiveDmg)) + (crit ? '!' : '') + (isStaggered ? ' [VULN]' : ''), new THREE.Vector3(f.pos.x, f.pos.y + 2 * (f.def.sc || 1), f.pos.z), crit ? '#ffd24a' : isStaggered ? '#ffaa40' : el === 'fire' ? '#ff9a50' : el === 'ice' ? '#9fe8ff' : el === 'lightning' ? '#fff27a' : '#ffffff', crit);
  audio.sfx('hit'); G.player.lastTarget = f; G.player.targetT = 4;
  if (f.hp <= 0) killFoe(f);
}
export function killFoe(f: any) {
  f.dead = true; f.deadT = 0; f.state = 'dead'; const def = f.def; if (f.creature) f.creature.update(0.01, { mode: 'dead' }); S.p.kills++;
  const gold = def.gold ? Math.round(rnd(def.gold[0], def.gold[1])) : 0; if (gold) addGold(gold);
  (def.loot || []).forEach(([id, ch]: any) => { if (Math.random() < ch) { let n = 1; if (id === 'meat_raw' || id === 'hide') { n = f.type === 'bear' ? 2 : 1; if (S.p.cls === 'hunter') n++; } addItem(id, n); } });
  if (f.passive || ['wolf', 'bear', 'bear_alpha', 'white_wolf'].includes(f.type)) profXp('hunting', 8);
  gainXp(def.xp || 10); const w = ITEMS[S.p.equip.weapon]; masteryXp(w?.kind === 'bow' ? 'ranged' : w?.kind === 'staff' ? 'magic' : 'melee', 2);
  questEvent('kill', f.type, f.id); if (f.boss) { toastBoss(f); } if (f.zone === 'world' && f.respawn) setTimeout(() => { if (!f.grp.parent) return; f.respawnNow = true; }, f.respawn * 1000);
  bus.emit('kill', f); emitHud();
}
function toastBoss(f: any) { bark(f.name, 'Defeated.', 2500); audio.sfx('unlock'); gainXp(0); void f; }

function foeMove(f: any, dx: number, dz: number, spd: number, dt: number, turnRate = 8) {
  const l = Math.hypot(dx, dz) || 1; const nx = f.pos.x + dx / l * spd * dt, nz = f.pos.z + dz / l * spd * dt; let [cx, cz] = collide(nx, nz, 0.5 * (f.def.sc || 1), f.inside || null);
  if (f.inside && !f.inside.walk(cx, cz)) { cx = f.pos.x; cz = f.pos.z; } if (!f.inside && f.zone === 'world') { const g2 = groundAt(cx, cz); if (g2 < -0.6 && !f.flying) { cx = f.pos.x; cz = f.pos.z; } }
  const moved = Math.hypot(cx - f.pos.x, cz - f.pos.z); f.pos.x = cx; f.pos.z = cz; f.yaw = turn(f.yaw, Math.atan2(dx, dz), turnRate, dt); return moved / dt;
}
export function updateFoes(dt: number) {
  const P = G.player, pp = P.pos, c = cfg(); let anyAggro = false; let nearestBoss: any = null;
  for (let i = G.enemies.length - 1; i >= 0; i--) { const f = G.enemies[i]; const inInt = !!f.inside; if (inInt !== !!P.inside || (inInt && P.inside !== f.inside)) { f.grp.visible = false; continue; }
    const dx = pp.x - f.pos.x, dz = pp.z - f.pos.z, d = Math.hypot(dx, dz); const lim = f.passive ? c.animalDist : c.npcDist; const active = d < lim * 1.15 || inInt; f.grp.visible = d < lim || inInt;
    if (f.dead) { f.deadT += dt; if (f.rig) f.rig.update(dt, { act: 'dead', speed: 0 }); f.grp.position.y = f.pos.y; if (f.deadT > 5) { f.grp.scale.setScalar(Math.max(0.01, 1 - (f.deadT - 5) * 0.8)); } if (f.deadT > 6.2) { if (f.respawn && !f.respawnNow) { f.grp.visible = false; f.grp.scale.setScalar(1); if (f.respawnNow) { /* handled below */ } } if (f.respawn && f.respawnNow) { f.dead = false; f.hp = f.max; f.pos.copy(f.home); f.grp.scale.setScalar(1); f.respawnNow = false; f.state = 'idle'; f.aggro = false; if (f.creature) f.creature.update(0.01, { mode: 'idle' }); if (f.rig) f.rig.update(0.01, { act: 'none' }); } else if (!f.respawn) { removeFoe(f); } else f.grp.visible = false; } continue; }
    if (!active) continue; f.hitT = Math.max(0, f.hitT - dt); f.slow = Math.max(0, f.slow - dt); f.cd -= dt;
    if (f.staggered > 0) {
      f.staggered -= dt; f.atkT = 0; f.cd = Math.max(f.cd, 0.4);
      if (f.kb.lengthSq() > 0.01) { const [cx, cz] = collide(f.pos.x + f.kb.x * dt, f.pos.z + f.kb.z * dt, 0.5, f.inside || null); if (!f.inside || f.inside.walk(cx, cz)) { f.pos.x = cx; f.pos.z = cz; } f.kb.multiplyScalar(Math.exp(-dt * 7)); }
      if (f.rig) f.rig.update(dt, { speed: 0, act: 'stagger', at: 0.5, emotion: 'surprised', air: 'ground', crouch: false });
      f.grp.scale.setScalar(1.08 + Math.sin(G.t * 15) * 0.04);
      continue;
    }
    // knockback
    if (f.kb.lengthSq() > 0.01) { const [cx, cz] = collide(f.pos.x + f.kb.x * dt, f.pos.z + f.kb.z * dt, 0.5, f.inside || null); if (!f.inside || f.inside.walk(cx, cz)) { f.pos.x = cx; f.pos.z = cz; } f.kb.multiplyScalar(Math.exp(-dt * 7)); }
    const spd = f.spd * (f.slow > 0 ? 0.45 : 1); let moveSp = 0; let mode = 'idle'; let act = 'none'; let at = 0;
    if (f.passive || f.ai === 'stag') { // wildlife
      const fl = f.def.flee || 0; const inFear = fl > 0 && d < fl * (P.crouch ? 0.5 : 1) && !P.inside && f.ai !== 'stag';
      if (f.ai === 'stag') { if (d < 6) { f.yaw = turn(f.yaw, Math.atan2(dx, dz), 2, dt); mode = 'alert'; } else if (f.state === 'roam' && f.dest) { moveSp = foeMove(f, f.dest.x - f.pos.x, f.dest.z - f.pos.z, 2, dt); if (Math.hypot(f.dest.x - f.pos.x, f.dest.z - f.pos.z) < 1.5) f.state = 'idle'; mode = 'move'; } f.timer -= dt; if (f.timer < 0) { f.timer = rnd(4, 9); if (f.state === 'idle' && Math.random() < 0.5) { f.state = 'roam'; f.dest = new THREE.Vector3(f.home.x + rnd(-8, 8), 0, f.home.z + rnd(-8, 8)); } } }
      else if (inFear) { f.state = 'flee'; moveSp = foeMove(f, -dx, -dz, f.spd, dt, 10); mode = 'move'; f.timer = 2; if (f.creature) f.def.hop && (mode = 'move'); }
      else if (f.state === 'flee' && f.timer > 0) { f.timer -= dt; moveSp = foeMove(f, -dx, -dz, f.spd * 0.6, dt); mode = 'move'; if (f.timer <= 0) f.state = 'idle'; }
      else { f.timer -= dt; if (f.state === 'roam' && f.dest) { moveSp = foeMove(f, f.dest.x - f.pos.x, f.dest.z - f.pos.z, f.spd * 0.28, dt, 4); mode = 'move'; if (Math.hypot(f.dest.x - f.pos.x, f.dest.z - f.pos.z) < 1.2) { f.state = 'idle'; f.timer = rnd(3, 8); } } else if (f.state === 'graze') mode = 'graze'; else if (f.state === 'rest') mode = 'rest'; else if (d < (fl || 10) * 1.6 && fl > 0) mode = 'alert';
        if (f.timer < 0) { const r = Math.random(); if (r < 0.35) { f.state = 'roam'; const a = Math.random() * 6.28, rr2 = rnd(4, 20); f.dest = new THREE.Vector3(f.home.x + Math.cos(a) * rr2, 0, f.home.z + Math.sin(a) * rr2); if (!landOK(f.dest.x, f.dest.z, 0.9)) f.state = 'idle'; f.timer = 14; } else if (r < 0.65) { f.state = 'graze'; f.timer = rnd(5, 10); } else if (r < 0.8 && f.type !== 'squirrel') { f.state = 'rest'; f.timer = rnd(8, 18); } else { f.state = 'idle'; f.timer = rnd(2, 6); } } }
      if (f.creature) f.creature.update(dt, { speed: moveSp, mode, t: G.t });
    } else { // hostile
      const sight = (f.def.kind === 'beast' ? 17 : 15) * (P.crouch ? (S.p.cls === 'rogue' ? 0.3 : 0.5) : 1) * (S.world.time < 5 || S.world.time > 21 ? 0.85 : 1) * (P.buffs.shadow ? 0.4 : 1); const noAggroRep = f.def.fac && S.rep[f.def.fac] >= 60 && f.def.fac !== 'ashen'; const canSee = d < sight && !P.dead && !noAggroRep && (!!P.inside === inInt);
      if (!f.aggro && canSee && !(f.type === 'wolf' && S.world.time > 6 && S.world.time < 18 && d > 10)) { f.aggro = true; if (f.def.kind !== 'beast') audio.sfx('growl', 0.5); if (f.boss) { audio.sfx('boss'); bark(f.name, f.def.title || '', 3500); } }
      const leash = f.home.distanceTo(f.pos) > (f.boss ? 70 : 48); if (f.aggro && (leash || P.dead || (!!P.inside !== inInt))) { f.aggro = false; f.state = 'return'; }
      if (f.aggro) { anyAggro = true; if (f.boss && (!nearestBoss || d < 60)) nearestBoss = f; const range = f.def.kind === 'beast' ? 2.4 * (f.def.sc || 1) : f.def.wep === 'greatsword' ? 3.2 : f.def.wep === 'dagger' ? 1.9 : 2.5; const rngd = f.ranged ? 12 : range;
        f.yaw = turn(f.yaw, Math.atan2(dx, dz), 9, dt);
        if (f.atkT > 0) { f.atkT += dt; const dur = f.def.boss ? 1.1 : 0.95; at = f.atkT / dur; act = 'attack'; if (f.atkT > dur * 0.45 && !f.hitDone) { f.hitDone = true; if (f.ranged) { G.spawnProj({ from: new THREE.Vector3(f.pos.x, f.pos.y + 1.4 * (f.def.sc || 1), f.pos.z), dir: new THREE.Vector3(dx, (pp.y + 1.2) - (f.pos.y + 1.4), dz).normalize(), speed: 22, dmg: f.def.dmg, el: f.ranged === 'bolt' ? 'aether' : 'phys', foe: true, color: f.ranged === 'bolt' ? '#b08aff' : '#d8c8a0', arrow: f.ranged === 'arrow' }); } else if (d < range + 0.8) G.hurtPlayer(f.def.dmg * (0.9 + Math.random() * 0.2), f); } if (f.atkT > dur) { f.atkT = 0; f.cd = f.boss ? 0.8 : 1.1 + Math.random() * 0.6; f.hitDone = false; } }
        else { if (d > rngd * (f.ranged ? 0.8 : 0.9)) { moveSp = foeMove(f, dx, dz, spd, dt, 9); } else if (f.ranged && d < 6) { moveSp = foeMove(f, -dx, -dz, spd * 0.7, dt, 9); } if (d < rngd && f.cd <= 0 && !P.dead) { f.atkT = 0.001; f.hitDone = false; if (f.def.kind === 'beast') audio.sfx('growl', 0.6); } }
        if (f.boss) bossSpecial(f, dt, d);
        if (f.def.kind === 'wraith') { f.hover = Math.sin(G.t * 2 + f.timer) * 0.2; }
        mode = moveSp > 0.5 ? 'move' : 'idle'; if (f.atkT > 0) f.creature && (f.creature.update(dt, { speed: moveSp, mode, attack: Math.sin(Math.min(1, f.atkT) * Math.PI) })); }
      else if (f.state === 'return') { const hd = f.home.distanceTo(f.pos); if (hd < 1.5) { f.state = 'idle'; f.hp = Math.min(f.max, f.hp + 5); } else { moveSp = foeMove(f, f.home.x - f.pos.x, f.home.z - f.pos.z, spd * 0.8, dt); f.hp = Math.min(f.max, f.hp + dt * 20); } mode = 'move'; }
      else { f.timer -= dt; if (f.state === 'roam' && f.dest) { moveSp = foeMove(f, f.dest.x - f.pos.x, f.dest.z - f.pos.z, spd * 0.3, dt, 4); if (Math.hypot(f.dest.x - f.pos.x, f.dest.z - f.pos.z) < 1) { f.state = 'idle'; f.timer = rnd(3, 8); } mode = 'move'; } else if (f.timer < 0) { f.timer = rnd(3, 7); if (Math.random() < 0.5) { f.state = 'roam'; f.dest = new THREE.Vector3(f.home.x + rnd(-6, 6), 0, f.home.z + rnd(-6, 6)); } else f.state = 'idle'; } if (f.def.kind === 'beast' && f.state === 'idle') mode = Math.random() < 0.0 ? 'idle' : 'idle'; if (f.def.kind === 'human' && f.state === 'idle') act = 'guard'; }
      if (f.creature) f.creature.update(dt, { speed: moveSp, mode: f.atkT > 0 ? 'move' : mode, attack: f.atkT > 0 ? Math.sin(Math.min(1, f.atkT) * Math.PI) : 0 });
    }
    // ground
    if (f.inside) f.pos.y = 0; else if (f.flying) f.pos.y = groundAt(f.pos.x, f.pos.z) + 0.8 + (f.hover || 0); else f.pos.y = damp(f.pos.y, groundFull(f.pos.x, f.pos.z, f.pos.y + 1), 14, dt);
    const gy = f.zone === 'int' ? 0 : f.pos.y; f.grp.position.set(f.pos.x, gy, f.pos.z); (f.creature ? f.creature.group : f.rig.root).rotation.y = f.yaw; if (f.rig) f.rig.root.rotation.y = f.yaw;
    if (f.rig) { f.rig.update(dt, { speed: moveSp, act, at: clamp(at, 0, 1), atkType: f.def.wep === 'greatsword' ? 0 : 2, emotion: f.aggro ? 'angry' : 'neutral', air: 'ground', crouch: false }); }
    f.grp.scale.setScalar(f.hitT > 0 ? 1.06 : 1);
  }
  P.combat = anyAggro; S.hud.combat = anyAggro; S.hud.boss = nearestBoss ? { name: nearestBoss.name, hp: nearestBoss.hp, max: nearestBoss.max, title: nearestBoss.def.title } : null;
  const lt = P.lastTarget; S.hud.target = lt && !lt.dead && P.targetT > 0 ? { name: lt.name, hp: lt.hp, max: lt.max } : null; P.targetT -= dt;
  // respawn when player far (world foes)
}
const damp = (c: number, t: number, r: number, dt: number) => c + (t - c) * (1 - Math.exp(-r * dt));
function bossSpecial(f: any, dt: number, d: number) {
  f.spec.t -= dt; if (f.spec.t > 0) return; const P = G.player; f.spec.t = f.type === 'rift_warden' ? 7 : 9;
  if (f.type === 'karreth' || f.type === 'gravewarden') { // shockwave telegraph
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 1, 32), new THREE.MeshBasicMaterial({ color: '#ff4a2a', transparent: true, opacity: 0.6, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(f.pos.x, (f.inside ? 0 : f.pos.y) + 0.1, f.pos.z); (f.inside ? f.grp.parent : G.world).add(ring); audio.sfx('boss');
    G.fxList.push({ t: 0, dur: 1.1, update(k: number) { const s = 2 + k * 9; ring.scale.set(s, s, s); (ring.material as any).opacity = 0.7 - k * 0.5; if (k > 0.8 && !this.hit) { this.hit = true; const dd = Math.hypot(P.pos.x - f.pos.x, P.pos.z - f.pos.z); if (dd < 11 && !f.dead && (P.pos.y - (f.inside ? INT_Y : 0)) < f.pos.y + 3) G.hurtPlayer(f.def.dmg * 1.4, f, true); emit('spark', f.pos.x, f.pos.y + 0.4, f.pos.z, '#ff7a3a', 40, 8, 0.8, 8); } }, done() { ring.parent?.remove(ring); } });
  } else if (f.type === 'rift_warden') { audio.sfx('spell_aether'); for (let i = -2; i <= 2; i++) { const ang = Math.atan2(P.pos.x - f.pos.x, P.pos.z - f.pos.z) + i * 0.25; G.spawnProj({ from: new THREE.Vector3(f.pos.x, f.pos.y + 2.5, f.pos.z), dir: new THREE.Vector3(Math.sin(ang), 0.02, Math.cos(ang)), speed: 18, dmg: f.def.dmg * 0.7, el: 'aether', foe: true, color: '#b08aff' }); } if (G.enemies.filter((e: any) => e.type === 'wraith' && !e.dead).length < 3) { const w = spawnFoe('wraith', f.pos.x + rnd(-6, 6), f.pos.z + rnd(4, 8), { parent: f.grp.parent, y: 0, zone: 'int', noRespawn: true, inside: f.inside }); w.aggro = true; w.pos.y = 0; } }
  void d;
}

// ---------- ambient creatures
export function updateAmbient(dt: number) {
  const P = G.player, pp = P.pos, c = cfg(); const night = S.world.time < 5.5 || S.world.time > 19.5;
  for (const b of G.birds) { if (P.inside) { b.group.visible = false; continue; } b.a += dt * b.sp / (b.r * 0.1 + 1); const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r; const dd = Math.hypot(x - pp.x, z - pp.z); const vis = dd < c.animalDist * (b.kind === 'eagle' ? 2.2 : 1) && (b.kind !== 'owl' || night) && (b.kind !== 'song' || (!night && G.weather.k < 0.8)); b.group.visible = vis; if (!vis) continue; const y = groundAt(x, z) + b.alt + Math.sin(b.a * 3) * 1.2; b.group.position.set(x, y, z); b.group.rotation.y = -b.a + Math.PI; b.group.rotation.z = Math.sin(b.a * 2) * 0.2; b.update(dt, true); }
  for (const f of G.fish) { f.a += dt * f.sp / f.r; const x = f.cx + Math.cos(f.a) * f.r, z = f.cz + Math.sin(f.a) * f.r; const dd = Math.hypot(x - pp.x, z - pp.z); f.group.visible = !P.inside && dd < 60; if (!f.group.visible) continue; f.group.position.set(x, -0.9 + Math.sin(f.a * 4) * 0.12, z); f.group.rotation.y = -f.a + Math.PI; f.tail.rotation.y = Math.sin(G.t * 9 + f.a) * 0.5; }
  for (const fr of G.frogs) { const dd = Math.hypot(fr.x - pp.x, fr.z - pp.z); fr.g.visible = !P.inside && dd < 50; if (!fr.g.visible) continue; fr.t -= dt; if (dd < 4 && fr.vy === 0 && fr.t > 0.3) fr.t = 0.2; if (fr.t < 0 && fr.vy === 0) { fr.vy = 4; fr.t = 2 + Math.random() * 5; fr.dx = Math.cos(fr.g.rotation.y) * 1.5; fr.dz = Math.sin(fr.g.rotation.y) * 1.5; fr.g.rotation.y += (Math.random() - 0.5) * 2; } if (fr.vy !== 0) { fr.vy -= 14 * dt; fr.g.position.y += fr.vy * dt; fr.x += fr.dx * dt; fr.z += fr.dz * dt; fr.g.position.x = fr.x; fr.g.position.z = fr.z; const h = groundAt(fr.x, fr.z); if (fr.g.position.y <= h) { fr.g.position.y = Math.max(h, 0.05); fr.vy = 0; if (h < 0.1) { fr.x -= fr.dx; fr.z -= fr.dz; } } } }
}

// ---------- companions
export const companions: any[] = [];
export function syncCompanions() {
  companions.forEach((c) => G.world.remove(c.rig.group)); companions.length = 0;
  Object.entries(S.comp).forEach(([id, st]: any) => { if (!st.recruited || !st.active) return; const def = COMPANIONS[id]; const cls = CLASSES.find((x) => x.id === def.cls)!; const eq: any = { ...cls.equip }; const look = { ...randomLook(), hair: id === 'lyra' || id === 'kestrel' ? 'ponytail' : id === 'iselle' ? 'long' : 'short', hairColor: def.hair, skin: id === 'kestrel' || id === 'corvin' || id === 'brann' ? '#c99a72' : '#e0b48c', outfit: def.color };
    const ap = appearanceFor(look, eq, def.cls); const rig = buildHumanoid(ap); rig.group.position.copy(G.player.pos); (G.player.inside ? G.intGroup : G.world).add(rig.group); const tag = makeNameTag(def.name, '#9ae8b0'); tag.position.set(0, 2.3, 0); rig.group.add(tag);
    companions.push({ id, def, rig, pos: G.player.pos.clone().add(new THREE.Vector3(rnd(-2, 2), 0, rnd(-2, 2))), yaw: 0, atkCd: 0, healCd: 5, barkT: 20, speed: 0, act: 'none', at: 0, lastRegion: '', target: null }); });
}
export function updateCompanions(dt: number) {
  const P = G.player; companions.forEach((c, idx) => {
    const par = P.inside ? G.intGroup : G.world; if (c.rig.group.parent !== par) { c.rig.group.parent?.remove(c.rig.group); par.add(c.rig.group); c.pos.copy(P.pos).add(new THREE.Vector3(1.5, 0, 1.5)); }
    const stance = S.comp[c.id]?.stance || 'follow';
    const ang = P.yaw + Math.PI + (idx ? 0.9 : -0.9);
    const tx = stance === 'wait' ? c.pos.x : P.pos.x + Math.sin(ang) * 2.4;
    const tz = stance === 'wait' ? c.pos.z : P.pos.z + Math.cos(ang) * 2.4;
    const dPl = Math.hypot(P.pos.x - c.pos.x, P.pos.z - c.pos.z);
    let foe: any = null, fd = stance === 'attack' ? 22 : stance === 'defend' ? 9 : 14;
    for (const f of G.enemies) {
      if (f.dead || f.passive || (stance !== 'attack' && !f.aggro && !P.combat) || (!!f.inside !== !!P.inside)) continue;
      const dd = Math.hypot(f.pos.x - c.pos.x, f.pos.z - c.pos.z);
      if (dd < fd) { fd = dd; foe = f; }
    }
    c.atkCd -= dt; c.healCd -= dt; c.act = 'none'; c.at = 0; let gx = tx, gz = tz, sp = 0; const cls = c.def.cls;
    if (foe && (stance === 'wait' ? fd < 7 : dPl < 34)) {
      c.barkT -= 10;
      if (c.def.ranged) {
        gx = c.pos.x; gz = c.pos.z; c.yaw = turn(c.yaw, Math.atan2(foe.pos.x - c.pos.x, foe.pos.z - c.pos.z), 10, dt);
        if (fd > 11) { gx = foe.pos.x; gz = foe.pos.z; } else if (fd < 5) { gx = c.pos.x - (foe.pos.x - c.pos.x); gz = c.pos.z - (foe.pos.z - c.pos.z); }
        if (c.atkCd <= 0) {
          c.atkCd = c.def.healer ? 2.2 : 1.3; c.act = 'attack';
          G.spawnProj({ from: new THREE.Vector3(c.pos.x, (P.inside ? INT_Y : c.pos.y) + 1.3, c.pos.z), dir: new THREE.Vector3(foe.pos.x - c.pos.x, 0.05, foe.pos.z - c.pos.z).normalize(), speed: 36, dmg: 9 + S.p.level * 1.6, el: c.def.healer ? 'holy' : 'phys', color: c.def.healer ? '#fff0a0' : '#d8c8a0', arrow: !c.def.healer, comp: true });
          audio.sfx(c.def.healer ? 'spell_holy' : 'bow');
        }
      } else if (cls === 'battlemage') {
        gx = foe.pos.x; gz = foe.pos.z; c.yaw = turn(c.yaw, Math.atan2(foe.pos.x - c.pos.x, foe.pos.z - c.pos.z), 10, dt);
        if (fd < 2.9 && c.atkCd <= 0) {
          c.atkCd = 0.85; c.act = 'attack';
          damageFoe(foe, 12 + S.p.level * 2.0, 'aether', 4, c.pos);
          audio.sfx('spell_aether');
          emit('spark', foe.pos.x, foe.pos.y + 1, foe.pos.z, '#b08aff', 12, 4, 0.4, 6);
        } else if (fd <= 14 && fd >= 3.2 && c.atkCd <= 0) {
          c.atkCd = 2.2; c.act = 'attack';
          G.spawnProj({ from: new THREE.Vector3(c.pos.x, (P.inside ? INT_Y : c.pos.y) + 1.3, c.pos.z), dir: new THREE.Vector3(foe.pos.x - c.pos.x, 0.05, foe.pos.z - c.pos.z).normalize(), speed: 32, dmg: 13 + S.p.level * 1.8, el: 'aether', color: '#b08aff', comp: true });
          audio.sfx('spell_aether');
        }
      } else {
        gx = foe.pos.x; gz = foe.pos.z; c.yaw = turn(c.yaw, Math.atan2(foe.pos.x - c.pos.x, foe.pos.z - c.pos.z), 10, dt);
        if (fd < 2.6 && c.atkCd <= 0) {
          c.atkCd = cls === 'rogue' ? 0.6 : 1.0; c.act = 'attack';
          damageFoe(foe, (cls === 'knight' ? 11 : 9) + S.p.level * 1.8, 'phys', 3, c.pos);
          audio.sfx('swing');
        }
      }
      if (c.def.healer && P.hpPct < 0.55 && c.healCd <= 0) {
        c.healCd = 9; const d2 = derived(); S.p.hp = Math.min(d2.maxHp, S.p.hp + d2.maxHp * 0.25);
        audio.sfx('spell_heal'); emit('spark', P.pos.x, P.pos.y + 1, P.pos.z, '#7dff9c', 18, 2, 1, -2);
        floatText('+' + Math.round(d2.maxHp * 0.25), new THREE.Vector3(P.pos.x, P.pos.y + 2.2, P.pos.z), '#7dff9c');
        bark(c.def.name, 'Hold still — mending!', 2000);
      }
    } else if (stance === 'wait') {
      gx = c.pos.x; gz = c.pos.z;
    }
    const dx = gx - c.pos.x, dz = gz - c.pos.z, dl = Math.hypot(dx, dz); const want = foe ? 6.5 : stance === 'wait' ? 0 : clamp((dl - 0.8) * 3, 0, P.mounted ? 12 : 8.2); if (dl > 0.6 && !(c.act === 'attack' && c.def.ranged) && want > 0) { const [cx, cz] = collide(c.pos.x + dx / dl * want * dt, c.pos.z + dz / dl * want * dt, 0.45, P.inside); if (!P.inside || P.inside.walk(cx, cz)) { sp = Math.hypot(cx - c.pos.x, cz - c.pos.z) / dt; c.pos.x = cx; c.pos.z = cz; } if (!foe) c.yaw = turn(c.yaw, Math.atan2(dx, dz), 8, dt); }
    if (dPl > 45 && stance !== 'wait') { c.pos.set(P.pos.x + 2, P.pos.y, P.pos.z + 2); }
    c.pos.y = P.inside ? P.pos.y : groundFull(c.pos.x, c.pos.z, c.pos.y + 1); c.speed += (sp - c.speed) * Math.min(1, dt * 8); const gy = P.inside ? c.pos.y - INT_Y : c.pos.y; c.rig.group.position.set(c.pos.x, gy, c.pos.z); c.rig.root.rotation.y = c.yaw;
    const idleLook = Math.atan2(P.pos.x - c.pos.x, P.pos.z - c.pos.z) - c.yaw; c.rig.update(dt, { speed: c.speed, act: c.act === 'attack' ? 'attack' : 'none', at: (G.t * 2.2) % 1, atkType: 0, ranged: c.def.ranged && c.act === 'attack' && !c.def.healer, lookYaw: c.speed < 0.3 ? clamp(((idleLook + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI, -0.8, 0.8) : 0, air: P.mounted ? 'ground' : 'ground', emotion: foe ? 'angry' : 'neutral', cast: false });
    // barks
    c.barkT -= dt; if (c.barkT <= 0 && !foe) { c.barkT = 45 + Math.random() * 50; const reg = S.hud.region; const type = P.inside ? null : S.world.time < 5.5 || S.world.time > 20 ? 'night' : /Highcrown|Saltmere|Thornwick|Frostgate/.test(reg) ? (/Saltmere/.test(reg) ? 'coast' : /Frostgate/.test(reg) ? 'mountain' : 'city') : /Ruin|Spire|Ashenvale/.test(reg) ? 'ruin' : biomeAt(P.pos.x, P.pos.z) === 'forest' ? 'forest' : biomeAt(P.pos.x, P.pos.z) === 'mountain' ? 'mountain' : null; const line = type && c.def.bark[type]; if (line) bark(c.def.name, line, 4500); }
  });
}

// ---------- remote players
export function ensureRemote(id: string, info: any) {
  let r = G.remotes.get(id); if (r) return r; const look = info.look, eq = info.equip || {}; const rig = buildHumanoid(appearanceFor(look, eq, info.cls)); const tag = makeNameTag(info.name, '#8ae0ff', info.cls ? (CLASSES.find((c) => c.id === info.cls)?.name || '') : ''); tag.position.set(0, 2.5, 0); rig.group.add(tag); G.world.add(rig.group); r = { rig, tag, pos: new THREE.Vector3(), tp: new THREE.Vector3(), yaw: 0, ty: 0, info, speed: 0, act: 'none', inside: null }; G.remotes.set(id, r); bark('Multiplayer', `${info.name} joined the world.`, 3500); return r;
}
export function removeRemote(id: string) { const r = G.remotes.get(id); if (!r) return; bark('Multiplayer', `${r.info.name} left the world.`, 3500); r.rig.group.parent?.remove(r.rig.group); G.remotes.delete(id); }
export function updateRemotes(dt: number) {
  G.remotes.forEach((r: any) => { r.pos.lerp(r.tp, Math.min(1, dt * 8)); const sp = r.pos.distanceTo(r.tp) / Math.max(dt, 0.001) * 0.4 + r.speed * 0.6; r.yaw = turn(r.yaw, r.ty, 10, dt); const vis = (r.inside || null) === (G.player.insideKey || null); r.rig.group.visible = vis; if (r.rig.group.parent !== (G.player.inside ? G.intGroup : G.world)) { r.rig.group.parent?.remove(r.rig.group); (G.player.inside ? G.intGroup : G.world).add(r.rig.group); } r.rig.group.position.set(r.pos.x, r.pos.y - (r.inside ? INT_Y : 0), r.pos.z); r.rig.root.rotation.y = r.yaw; r.rig.update(dt, { speed: r.speed, act: r.act, air: r.air || 'ground', crouch: r.crouch, at: (G.t * 2) % 1 }); void sp; });
}
