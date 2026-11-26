import * as THREE from 'three';
import { ABILITIES, ANIMALS, ELEMENT_COLOR, HOUSES, ITEMS, MOUNTS, POIS, QUESTS, SETTLEMENTS, FURNITURE, PROFS } from './data';
import { S, addItem, bark, bus, count, derived, emitHud, emitUI, foundLore, gainXp, houseSlots, houseState, masteryXp, openDialogue, profXp, questEvent, removeItem, saveGame, toast, clampVitals, useItem, addGold, checkHave } from './store';
import { audio } from './audio';
import { TEX, buildRivers, buildTerrain, buildVegetation, cullChunks, groundAt, HALF, initHeights, makeTextures, slopeAt, clamp, biomeAt, riverPts, rng } from './world';
import { ST, buildSettlements, defineRoads, groundFull, blocked, addCol } from './structures';
import { INT_Y, buildFurniture, buildInterior, footprint, type Interior } from './interiors';
import { G, applyGraphics, cfg, emit, floatText, initLights, initParticles, initPrecip, initSky, season, SEASONS, setWind, updateFloats, updateParticles, updatePrecip, updateSky, updateTorches, updateWeather } from './fx';
import { appearanceFor, collide, companions, damageFoe, ensureRemote, populateWorld, spawnInteriorFoes, spawnInteriorNpcs, spawnNpcs, syncCompanions, turn, updateAmbient, updateCompanions, updateFoes, updateInteriorNpcs, updateNpcs, updateRemotes, removeFoe } from './actors';
import { buildCreature, buildHumanoid } from './rigs';
import { net } from './net';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
let cullT = 0, raf = 0, running = false, canvasEl: HTMLCanvasElement | null = null, lastT = 0, hudT = 0, regT = 0, saveT = 0, ambT = 0, pickT = 0;
let intNpcs: any[] = [], intFoes: any[] = [], interior: Interior | null = null, homeGroup: THREE.Group | null = null, homeItems: any[] = [], homeBase = 0, houseId: string | null = null;
const keys = new Set<string>(), pressed = new Set<string>(); const mouse = { b: new Set<number>(), dx: 0, dy: 0, locked: false, drag: false };
const pad = { on: false, lx: 0, ly: 0, rx: 0, ry: 0, prev: [] as boolean[], btn: [] as boolean[], navT: 0 };
const act = { fx: 0, fz: 0 };
G.birds = []; G.fish = []; G.frogs = []; G.fxList = [];

export const api: any = {};
const codeToAction = () => { const m: Record<string, string> = {}; Object.entries(S.settings.keys).forEach(([a, c]) => (m[c as string] = a)); m.KeyF = m.KeyF || 'block'; return m; };
const down = (a: string) => keys.has(S.settings.keys[a]) || (a === 'block' && keys.has('KeyF')) || (a === 'attack' && mouse.b.has(0)) || (a === 'block' && mouse.b.has(2) && mouse.locked);
const uiOpen = () => { const u = S.ui; return !!(u.codex || u.dialogue || u.shop || u.stable || u.houseSale || u.storage || u.confirm || u.pause || u.settings || u.mp || u.dead || S.screen !== 'game' || u.loading); };
const hint = (k: string, t: string) => { if (!S.settings.tutorial || S.ui.tutorialSeen[k]) return; S.ui.tutorialSeen[k] = 1; toast(t, 'hint'); };

// =============== BOOT
export async function startGame(canvas: HTMLCanvasElement) {
  stopGame(); canvasEl = canvas; const L = (pct: number, text: string) => { S.ui.loading = { pct, text }; emitUI(); return tick(); };
  await L(2, 'Waking the engine…');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); renderer.outputColorSpace = THREE.SRGBColorSpace; G.renderer = renderer; (window as any).__aetherfall = { S, G, api, bus };
  const scene = new THREE.Scene(); G.scene = scene; G.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.15, 1100); scene.add(G.camera);
  G.plots = []; G.shards = []; G.floatPages = []; G.camInit = false; G.inter = []; G.weather = { type: 'clear', t: 0, next: 90, k: 0 }; G.world = new THREE.Group(); scene.add(G.world); G.intGroup = new THREE.Group(); G.intGroup.position.y = INT_Y; scene.add(G.intGroup); G.intGroup.visible = false;
  makeTextures(); initLights(scene, renderer); initSky(scene); initPrecip(scene); initParticles(scene);
  await L(10, 'Shaping the land of Valdoria…'); initHeights(); defineRoads(); G.terrain = buildTerrain(G.world); G.rivers = buildRivers(G.world);
  const wt = TEX.water.clone(); wt.needsUpdate = true; wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(60, 60);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: '#2b7aa0', transparent: true, opacity: 0.82, normalMap: wt, roughness: 0.12, metalness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.y = 0; water.renderOrder = 1; G.world.add(water); G.water = water; G.waterTex = wt;
  await L(30, 'Raising cities, castles and bridges…'); buildSettlements(G.world);
  await L(48, 'Planting forests and meadows…'); G.veg = buildVegetation(G.world, (x, z, m) => blocked(x, z, m));
  await L(66, 'Hiding secrets across the world…'); buildWorldObjects();
  await L(78, 'Waking the villagers…'); G.player = makePlayer(); spawnNpcs(); populateWorld(); buildMapImage();
  await L(92, 'Painting the sky…');
  try { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); const sm = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: {}, vertexShader: 'varying vec3 v; void main(){ v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'varying vec3 v; void main(){ vec3 c=mix(vec3(.75,.85,.95),vec3(.25,.5,.9),smoothstep(0.,.8,v.y)); c+=vec3(1.,.9,.6)*pow(max(dot(v,normalize(vec3(.5,.7,.3))),0.),30.)*2.; gl_FragColor=vec4(c,1.); }' })); es.add(sm); G.envMap = pm.fromScene(es).texture; pm.dispose(); } catch { /* optional */ }
  applyGraphics(); window.addEventListener('resize', onResize); bindInput(); bindBus();
  if (!S.flags.started) { const a = ST.anchors.thornwick.plaza; S.p.pos = { x: a.x + 3, y: 0, z: a.z + 7, ry: Math.PI }; }
  placePlayerFromSave(); syncCompanions(); S.screen = 'game'; S.ui.loading = null; emitUI(); audio.init(); audio.setMood('day');
  if (!S.flags.started) { S.flags.started = true; setTimeout(() => { hint('move', 'WASD to move · Shift sprint · Space jump (press Space again in mid-air to glide) · E interact'); }, 1500); setTimeout(() => hint('talk', 'Find Elder Maren in the village centre and press E to speak.'), 9000); }
  running = true; lastT = performance.now(); raf = requestAnimationFrame(loop);
}
export function stopGame() {
  running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); unbindInput(); handlers.forEach((u) => u()); handlers.length = 0;
  if (G.renderer) { G.renderer.dispose(); G.renderer = null; } G.scene = null; G.npcs = []; G.enemies = []; G.projectiles = []; G.inter = []; G.birds = []; G.fish = []; G.frogs = []; G.fxList = []; G.floats = []; G.remotes.clear(); companions.length = 0; interior = null; intNpcs = []; intFoes = [];
  if (document.pointerLockElement) document.exitPointerLock(); S.ui.loading = null;
}
const onResize = () => { if (!G.renderer) return; const w = canvasEl?.clientWidth || window.innerWidth; const h = canvasEl?.clientHeight || window.innerHeight; G.camera.aspect = w / h; G.camera.updateProjectionMatrix(); G.renderer.setSize(w, h, false); };
api.resize = onResize;
const handlers: (() => void)[] = [];
function bindBus() {
  const on = (e: string, f: Function) => handlers.push(bus.on(e, f));
  on('appearance', () => rebuildPlayerRig()); on('companions', () => syncCompanions()); on('presave', () => { const P = G.player; const p = P.inside ? P.ret : P.pos; S.p.pos = { x: p.x, y: p.y, z: p.z, ry: P.yaw }; S.world.clock = S.world.clock || 0; });
  on('buff', (b: string, d: number) => { G.player.buffs[b] = d; }); on('rest', () => sleepNow(true)); on('travel', (id: string) => travel(id)); on('respawn', () => respawn());
  on('kill', (f: any) => { if (f.boss) S.flags['dead_' + f.type] = true; });
  on('dialogueEnd', () => { G.player.act = 'none'; }); on('levelup', () => { G.player.joy = 3; emit('spark', G.player.pos.x, G.player.pos.y + 1, G.player.pos.z, '#ffe27a', 60, 5, 1.4, -1); });
  on('questdone', () => { /* refresh interior state */ });
}

// =============== PLAYER
function makePlayer() {
  const P: any = { pos: V3(), vel: V3(), yaw: 0, visYaw: 0, rig: null, grounded: true, coyote: 0, glide: false, crouch: false, swim: false, inside: null, insideKey: null, ret: null, mounted: null, act: 'none', actT: 0, actDur: 0, atkType: 0, comboT: 0, atkCd: 0, cd: {}, buffs: {}, ward: 0, blocking: false, rolling: 0, invul: 0, dead: false, combatT: 0, hurtT: 0, lastTarget: null, targetT: 0, staDelay: 0, sit: null, hpPct: 1, speedNow: 0, airState: 'ground', stepAcc: 0, airT: 0, joy: 0, lookYaw: 0, hitDone: true, pendingHit: null, fallV: 0 };
  P.rig = buildHumanoid(appearanceFor(S.p.look, S.p.equip, S.p.cls)); G.world.add(P.rig.group); return P;
}
function rebuildPlayerRig() { const P = G.player; if (!P) return; const par = P.rig.group.parent; par?.remove(P.rig.group); P.rig = buildHumanoid(appearanceFor(S.p.look, S.p.equip, S.p.cls)); (P.mounted ? P.mounted.creature.saddle : par || G.world).add(P.rig.group); P.rig.setCarry(false); }
function placePlayerFromSave() { const P = G.player, p = S.p.pos; const x = p.x, z = p.z; P.pos.set(x, groundFull(x, z, 99) + 0.1, z); P.yaw = p.ry || 0; P.visYaw = P.yaw; G.cam.yaw = P.yaw + Math.PI; G.cam.pitch = 0.3; const d = derived(); S.p.hp = clamp(S.p.hp, 1, d.maxHp); }
function doAct(name: string, dur: number, type = 0) { const P = G.player; P.act = name; P.actT = 0; P.actDur = dur; P.atkType = type; }
function camForward() { const f = V3(); G.camera.getWorldDirection(f); return f; }
function aimDir(from: THREE.Vector3) { const cam = G.camera; const o = cam.position.clone(), d = camForward(); const target = o.clone().addScaledVector(d, 36); for (const f of G.enemies) { if (f.dead || (!!f.inside !== !!G.player.inside)) continue; const c = V3(f.pos.x, f.pos.y + 1.1, f.pos.z); const to = c.clone().sub(o); const t = to.dot(d); if (t > 2 && t < 40 && to.sub(d.clone().multiplyScalar(t)).length() < 1.4) { target.copy(c); break; } } return target.sub(from).normalize(); }
const handPos = () => { const P = G.player; const v = V3(); P.rig.parts.armR.hand.getWorldPosition(v); return v; };

function foesIn(c: THREE.Vector3, r: number, cone?: { dir: THREE.Vector3; ang: number }) { const out: any[] = []; for (const f of G.enemies) { if (f.dead || f.ai === 'stag' || (!!f.inside !== !!G.player.inside)) continue; const dx = f.pos.x - c.x, dz = f.pos.z - c.z, d = Math.hypot(dx, dz) - 0.4 * (f.def.sc || 1); if (d > r || Math.abs(f.pos.y - (c.y - (G.player.inside ? INT_Y : 0))) > 4) continue; if (cone) { const l = Math.hypot(dx, dz) || 1; if ((dx / l) * cone.dir.x + (dz / l) * cone.dir.z < Math.cos(cone.ang)) continue; } out.push(f); } return out; }
function dmgMult() { const P = G.player; let m = 1; if (P.buffs.rage > 0) m *= 1.35; if (P.buffs.shadow > 0) m *= 2; return m; }
function rollDmg(base: number, el = 'phys') { const d = derived(); const crit = Math.random() < d.crit; return { v: base * (0.9 + Math.random() * 0.2) * (crit ? 1.8 : 1) * dmgMult(), crit, el }; }
function faceDir() { const P = G.player; return V3(Math.sin(P.visYaw), 0, Math.cos(P.visYaw)); }

function playerAttack() {
  const P = G.player, d = derived(), w = ITEMS[S.p.equip.weapon], kind = w?.kind || 'fist'; if (P.atkCd > 0 || P.rolling > 0 || P.sit || P.dead) return; const sta = 6;
  if (S.p.sta < sta) { return; } S.p.sta -= sta; P.staDelay = 0.8; P.combatT = 6;
  // face camera forward
  const cf = camForward(); P.visYaw = Math.atan2(cf.x, cf.z); P.yaw = P.visYaw;
  if (kind === 'bow') { P.atkCd = 0.55; doAct('attack', 0.5); P.ranged = true; setTimeout(() => { if (!G.player || P.dead) return; const from = V3(P.pos.x, P.pos.y + 1.4, P.pos.z).addScaledVector(faceDir(), 0.4); if (P.inside) from.y = P.pos.y + 1.4; const dir = aimDir(from); const r = rollDmg(d.rangedAtk, 'phys'); spawnProj({ from, dir, speed: 48, dmg: r.v, crit: r.crit, el: w?.bound && w.bound !== 'heal' ? w.bound : 'phys', arrow: true, color: ELEMENT_COLOR[w?.bound || 'phys'], grav: 3, kindMastery: 'ranged' }); audio.sfx('bow'); }, 220); return; }
  if (kind === 'staff') { const cost = 4; const ok = S.p.mana >= cost; if (ok) S.p.mana -= cost; P.atkCd = 0.5; doAct('cast', 0.45); P.ranged = false; setTimeout(() => { if (!G.player || P.dead) return; const from = handPos(); const el = w?.bound || 'aether'; const dir = aimDir(from); const r = rollDmg(d.magicAtk * (ok ? 0.8 : 0.35), el); spawnProj({ from, dir, speed: 30, dmg: r.v, crit: r.crit, el, color: ELEMENT_COLOR[el], radius: el === 'fire' ? 1.8 : 0, heal: el === 'heal', kindMastery: 'magic' }); audio.sfx('spell_' + (el === 'heal' ? 'holy' : el)); }, 180); return; }
  const rangeBy: any = { sword: 2.8, greatsword: 3.5, axe: 2.7, hammer: 3, dagger: 2.1, fist: 1.8, spear: 3.6, halberd: 3.7 }, cdBy: any = { sword: 0.5, greatsword: 0.85, axe: 0.62, hammer: 0.9, dagger: 0.34, fist: 0.45, spear: 0.58, halberd: 0.75 };
  const combo = P.comboT > 0 ? (P.atkType + 1) % 3 : 0; P.ranged = false; P.atkCd = cdBy[kind] || 0.5; doAct('attack', P.atkCd * 0.95, combo); P.comboT = 1.0; audio.sfx('swing');
  P.pendingHit = { t: P.atkCd * 0.4, range: rangeBy[kind] || 2.6, mult: combo === 2 ? 1.5 : 1, kb: combo === 2 ? 8 : 3, bound: w?.bound, d: d.meleeAtk };
}
function resolveHit(h: any) {
  const P = G.player; const fd = faceDir(); const c = V3(P.pos.x, P.pos.y, P.pos.z); const hit = foesIn(c, h.range, { dir: fd, ang: 1.15 }); let any = false;
  if (P.counterBuff > 0) { h.mult *= 1.6; P.counterBuff = 0; floatText('COUNTER!', V3(P.pos.x, P.pos.y + 2.4, P.pos.z), '#ffaa33', true); }
  for (const f of hit) { const r = rollDmg(h.d * h.mult, h.bound || 'phys'); damageFoe(f, r.v, h.bound || 'phys', h.kb, P.pos, r.crit); emit('spark', f.pos.x, f.pos.y + 1.1, f.pos.z, ELEMENT_COLOR[h.bound || 'phys'], 8, 4, 0.4, 8); any = true; if (S.p.cls === 'berserker' || derived().steal) { const heal = r.v * (derived().steal + (S.p.cls === 'berserker' ? 0.03 : 0)); S.p.hp = Math.min(derived().maxHp, S.p.hp + heal); } }
  if (any) { rumble(0.25, 80); P.shake = 0.15; masteryXp('melee', hit.length); }
  if (h.bound && !any) emit('spark', P.pos.x + fd.x * 1.5, P.pos.y + 1.2, P.pos.z + fd.z * 1.5, ELEMENT_COLOR[h.bound], 5, 2, 0.4, 2);
}
function castAbility(slot: number) {
  const P = G.player, id = S.p.hotbar[slot]; if (!id || P.dead || P.sit) return; const ab = ABILITIES[id]; if (!ab) return; if ((P.cd[id] || 0) > 0) { audio.sfx('error'); return; }
  const res = ab.res === 'mana' ? 'mana' : 'sta'; if (S.p[res] < ab.cost) { toast(`Not enough ${res === 'mana' ? 'mana' : 'stamina'}.`, 'error'); return; }
  S.p[res] -= ab.cost; P.cd[id] = ab.cd; P.combatT = 6; P.staDelay = 1; const d = derived(); const el = ab.el; const col = ELEMENT_COLOR[el] || '#fff'; const cf = camForward(); const p0 = P.pos;
  if (ab.type !== 'heal' && ab.type !== 'buff') { P.visYaw = Math.atan2(cf.x, cf.z); P.yaw = P.visYaw; } const fd = faceDir(); const mag = (ab.type === 'proj' && ab.el === 'phys') || ab.type === 'volley' ? d.rangedAtk : ['melee', 'aoe'].includes(ab.type) && el === 'phys' ? d.meleeAtk : ['melee'].includes(ab.type) ? d.meleeAtk * 0.7 + d.magicAtk * 0.7 : d.magicAtk;
  const strike = (f: any, m = 1, kb = 4) => { const r = rollDmg(mag * (ab.mult || 1) * m, el); damageFoe(f, r.v, el, kb, p0, r.crit); emit('spark', f.pos.x, f.pos.y + 1, f.pos.z, col, 10, 4, 0.5, 6); };
  audio.sfx(ab.type === 'melee' ? 'swing' : 'spell_' + el);
  switch (ab.type) {
    case 'melee': doAct('attack', 0.55, 2); setTimeout(() => { for (const f of foesIn(p0, ab.range, { dir: fd, ang: 1.1 })) strike(f, 1, 7); ring(P.pos.x + fd.x * 1.5, P.pos.y + 1, P.pos.z + fd.z * 1.5, col, 2); P.shake = 0.2; rumble(0.4, 120); }, 220); break;
    case 'aoe': doAct('cast', 0.5); ring(p0.x, p0.y + 0.2, p0.z, col, ab.radius); setTimeout(() => { for (const f of foesIn(p0, ab.radius)) { strike(f, 1, 6); if (ab.slow) f.slow = 4; } if (ab.heal) { S.p.hp = Math.min(d.maxHp, S.p.hp + d.maxHp * ab.heal); } emit('spark', p0.x, p0.y + 0.5, p0.z, col, 60, ab.radius * 1.6, 0.8, 2); }, 150); break;
    case 'buff': doAct('cast', 0.5); P.buffs[ab.buff] = ab.dur; if (ab.buff === 'ward') P.ward = 60 + d.magicAtk; emit('spark', p0.x, p0.y + 1, p0.z, col, 40, 3, 1, -1); ring(p0.x, p0.y + 0.2, p0.z, col, 2.5); if (ab.buff === 'track') { hint('track', 'Tracking reveals creatures on your compass for a while.'); } break;
    case 'heal': doAct('cast', 0.6); S.p.hp = Math.min(d.maxHp, S.p.hp + d.maxHp * ab.amount + 20 + d.magicAtk * 0.3); emit('spark', p0.x, p0.y + 1, p0.z, col, 40, 2.5, 1.2, -2); floatText('+' + Math.round(d.maxHp * ab.amount), V3(p0.x, p0.y + 2.3, p0.z), '#7dff9c'); ring(p0.x, p0.y + 0.2, p0.z, col, 3); break;
    case 'volley': doAct('attack', 0.5); P.ranged = true; for (let i = 0; i < ab.count; i++) setTimeout(() => { const from = V3(P.pos.x, P.pos.y + 1.4, P.pos.z); const dir = aimDir(from); const a = (i - (ab.count - 1) / 2) * 0.1; dir.applyAxisAngle(V3(0, 1, 0), a); const r = rollDmg(mag * ab.mult, 'phys'); spawnProj({ from, dir, speed: 46, dmg: r.v, crit: r.crit, el: 'phys', arrow: true, color: '#d8c8a0', grav: 3 }); audio.sfx('bow'); }, 80 + i * 70); break;
    case 'proj': doAct(ab.el === 'phys' ? 'attack' : 'cast', 0.5); P.ranged = ab.el === 'phys'; setTimeout(() => { const from = ab.el === 'phys' ? V3(P.pos.x, P.pos.y + 1.4, P.pos.z) : handPos(); const dir = aimDir(from); const r = rollDmg(mag * ab.mult, el); spawnProj({ from, dir, speed: ab.speed, dmg: r.v, crit: r.crit, el, color: col, radius: ab.radius || 0, pierce: ab.pierce, arrow: ab.el === 'phys', grav: ab.el === 'phys' ? 1 : 0, big: true }); }, 200); break;
    case 'chain': doAct('cast', 0.5); { let cur: any = null, best = 18; for (const f of foesIn(p0, 18, { dir: fd, ang: 0.9 })) { const dd = Math.hypot(f.pos.x - p0.x, f.pos.z - p0.z); if (dd < best) { best = dd; cur = f; } } const hit = new Set<any>(); let from = handPos(); for (let i = 0; i < ab.hops && cur; i++) { hit.add(cur); const to = V3(cur.pos.x, cur.pos.y + 1.2, cur.pos.z); bolt(from, to, col); const cf2 = cur; setTimeout(() => strike(cf2, 1 - i * 0.12, 3), 100 + i * 90); from = to; let nx: any = null, nd = 9; for (const f of foesIn(cur.pos, 9)) { if (hit.has(f)) continue; const dd = Math.hypot(f.pos.x - cur.pos.x, f.pos.z - cur.pos.z); if (dd < nd) { nd = dd; nx = f; } } cur = nx; } if (!hit.size) bolt(handPos(), V3(p0.x + fd.x * 10, p0.y + 1.4, p0.z + fd.z * 10), col); } break;
    case 'line': doAct('cast', 0.5); for (let i = 1; i <= ab.range / 2; i++) { const x = p0.x + fd.x * i * 2, z = p0.z + fd.z * i * 2; setTimeout(() => { spike(x, P.inside ? p0.y : groundAt(x, z), z, col); for (const f of foesIn(V3(x, p0.y, z), 2)) strike(f, 1, 2); }, i * 70); } break;
    case 'cone': doAct('cast', 0.5); for (let i = 0; i < 40; i++) emit('spark', p0.x + fd.x, p0.y + 1, p0.z + fd.z, '#d8f3ee', 1, 12, 0.7, 0); for (const f of foesIn(p0, ab.range, { dir: fd, ang: 0.8 })) { strike(f, 1, ab.knock); } break;
    case 'blink': { doAct('cast', 0.35); const dist = ab.dist; let tx = p0.x, tz = p0.z; for (let s = 1; s <= dist; s++) { const nx = p0.x + fd.x * s, nz = p0.z + fd.z * s; if (P.inside ? (!P.inside.walk(nx, nz)) : blocked(nx, nz, 0.4)) break; tx = nx; tz = nz; } emit('spark', p0.x, p0.y + 1, p0.z, col, 40, 4, 0.7, 0); P.pos.x = tx; P.pos.z = tz; if (!P.inside) P.pos.y = Math.max(P.pos.y, groundFull(tx, tz, P.pos.y + 2)); emit('spark', tx, P.pos.y + 1, tz, col, 40, 4, 0.7, 0); if (ab.buff) P.buffs[ab.buff] = ab.dur; if (ab.mult) { ring(tx, P.pos.y + 0.2, tz, col, ab.radius); for (const f of foesIn(P.pos, ab.radius)) strike(f, 1, 8); P.shake = 0.3; } } break;
    case 'meteor': doAct('cast', 0.7); { const tx = p0.x + fd.x * 16, tz = p0.z + fd.z * 16, ty = P.inside ? p0.y : groundAt(tx, tz); ring(tx, ty + 0.2, tz, '#ff5a2a', ab.radius); const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff7a2e' })); m.position.set(tx - 14, ty + 40, tz); (P.inside ? G.scene : G.world).add(m); G.fxList.push({ t: 0, dur: 1.2, update(k: number) { m.position.set(tx - 14 * (1 - k), ty + 40 * (1 - k) + 1, tz); emit('spark', m.position.x, m.position.y, m.position.z, '#ff8a30', 3, 2, 0.5, 0); if (k > 0.97 && !this.hit) { this.hit = true; emit('spark', tx, ty + 1, tz, '#ff7a2e', 120, 14, 1.2, 6); emit('smoke', tx, ty + 1, tz, '#444', 20, 3, 3, 0); audio.sfx('explode'); P.shake = 0.5; rumble(0.8, 300); for (const f of foesIn(V3(tx, p0.y, tz), ab.radius)) strike(f, 1, 12); } }, done() { m.parent?.remove(m); } }); } break;
  }
  masteryXp(['volley', 'proj'].includes(ab.type) && el === 'phys' ? 'ranged' : el === 'phys' ? 'melee' : 'magic', 1); emitHud();
}
function dodge() { const P = G.player, d = 20; if (P.rolling > 0 || S.p.sta < d || P.sit || P.dead || P.mounted || !P.grounded) return; S.p.sta -= d; P.staDelay = 1; P.rolling = 0.5; P.invul = 0.38; doAct('roll', 0.5); audio.sfx('roll'); const dir = act.fx || act.fz ? V3(act.fx, 0, act.fz).normalize() : faceDir().negate(); P.rollDir = dir; P.visYaw = Math.atan2(dir.x, dir.z); }
function ring(x: number, y: number, z: number, color: string, r: number) { const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.05, z); (G.player.inside ? G.intGroup : G.world).add(m); if (G.player.inside) m.position.y -= 0; const base = G.player.inside ? G.player.pos.y - INT_Y - (G.player.pos.y - y) + 0.05 : y; if (G.player.inside) m.position.y = Math.max(0.05, y - INT_Y + 0.05); else m.position.y = base + 0.05; G.fxList.push({ t: 0, dur: 0.6, update(k: number) { m.scale.setScalar(0.3 + k * r); (m.material as any).opacity = 0.8 * (1 - k); }, done() { m.parent?.remove(m); m.geometry.dispose(); } }); }
function bolt(a: THREE.Vector3, b: THREE.Vector3, color: string) { const pts = [a.clone()]; const n = 7; for (let i = 1; i < n; i++) pts.push(a.clone().lerp(b, i / n).add(V3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9))); pts.push(b.clone()); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color })); G.scene.add(l); emit('spark', b.x, b.y, b.z, color, 8, 3, 0.4, 0); G.fxList.push({ t: 0, dur: 0.22, update() { /* */ }, done() { G.scene.remove(l); l.geometry.dispose(); } }); }
function spike(x: number, y: number, z: number, color: string) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#8a7050', emissive: color, emissiveIntensity: 0.3, flatShading: true })); m.position.set(x, y - 1, z); (G.player.inside ? G.intGroup : G.world).add(m); if (G.player.inside) m.position.y = y - INT_Y - 1; emit('spark', x, y + 0.3, z, '#a8805a', 8, 3, 0.5, 8); G.fxList.push({ t: 0, dur: 0.9, update(k: number) { m.position.y += (k < 0.2 ? 14 : -3) * 0.016; }, done() { m.parent?.remove(m); } }); }

// ---- projectiles
const projGeo = { sph: new THREE.SphereGeometry(0.22, 8, 6), arrow: new THREE.BoxGeometry(0.05, 0.05, 0.9) };
function spawnProj(o: any) {
  const m = new THREE.Mesh(o.arrow ? projGeo.arrow : projGeo.sph, new THREE.MeshBasicMaterial({ color: o.color || '#fff' })); if (o.big) m.scale.setScalar(1.6); m.position.copy(o.from); G.scene.add(m);
  G.projectiles.push({ m, pos: o.from.clone(), vel: o.dir.clone().multiplyScalar(o.speed), ...o, life: 3.2, hits: new Set(), inside: G.player.inside });
}
function updateProjectiles(dt: number) {
  const P = G.player; for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i]; p.life -= dt; if (p.grav) p.vel.y -= p.grav * dt * 3; p.pos.addScaledVector(p.vel, dt); p.m.position.copy(p.pos); if (p.arrow) p.m.lookAt(p.pos.clone().add(p.vel)); emit('spark', p.pos.x, p.pos.y, p.pos.z, p.color || '#fff', 1, 0.3, 0.3, 0);
    let end = p.life <= 0; const lp = p.inside ? V3(p.pos.x, p.pos.y - INT_Y, p.pos.z) : p.pos;
    if (!p.foe) { for (const f of G.enemies) { if (f.dead || f.ai === 'stag' || p.hits.has(f) || (!!f.inside !== !!p.inside)) continue; const fy = f.pos.y + (f.inside ? INT_Y : 0); const sc = f.def.sc || 1; if (Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z) < 0.9 * sc + 0.2 && p.pos.y > fy - 0.3 && p.pos.y < fy + 2.2 * sc) { p.hits.add(f); if (p.radius) { explode(p); end = true; break; } damageFoe(f, p.dmg, p.el, 3, P.pos, p.crit); if (p.heal) { S.p.hp = Math.min(derived().maxHp, S.p.hp + 4); } if (p.kindMastery) masteryXp(p.kindMastery, 1); emit('spark', p.pos.x, p.pos.y, p.pos.z, p.color, 8, 3, 0.4, 5); if (!p.pierce) { end = true; break; } } } }
    else { const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z, dy = p.pos.y - (P.pos.y + 1); if (!p.comp && Math.hypot(dx, dz) < 0.8 && Math.abs(dy) < 1.2 && !!p.inside === !!P.inside) { G.hurtPlayer(p.dmg, null); end = true; } }
    if (!p.inside) { const gy = groundFull(p.pos.x, p.pos.z, p.pos.y + 1); if (p.pos.y < gy) { if (p.radius) explode(p); end = true; } for (const c of ST.colliders) { if (p.pos.x > c.x0 && p.pos.x < c.x1 && p.pos.z > c.z0 && p.pos.z < c.z1 && p.pos.y < groundAt(p.pos.x, p.pos.z) + 14) { if (p.radius) explode(p); end = true; break; } } }
    else if (!interior!.walk(lp.x, lp.z)) { if (p.radius) explode(p); end = true; }
    if (end) { G.scene.remove(p.m); G.projectiles.splice(i, 1); }
  }
}
function explode(p: any) { emit('spark', p.pos.x, p.pos.y, p.pos.z, p.color, 50, 9, 0.8, 4); audio.sfx(p.el === 'fire' ? 'explode' : 'hit'); for (const f of foesIn(V3(p.pos.x, p.pos.y - (p.inside ? INT_Y : 0) + (p.inside ? 0 : 0), p.pos.z), p.radius || 3)) { if (!p.inside || true) damageFoe(f, p.dmg, p.el, 6, p.pos, p.crit); } G.player.shake = 0.2; }
G.spawnProj = spawnProj;
G.hurtPlayer = (dmg: number, src: any, unblockable = false) => {
  const P = G.player; if (P.dead || P.invul > 0) return; const d = derived(); let v = dmg * 100 / (100 + d.def * 3); if (P.buffs.wall > 0) v *= 0.4;
  let blocked = false; let parried = false;
  if (P.blocking && !unblockable) {
    let facingSrc = true;
    if (src && src.pos) {
      const dx = src.pos.x - P.pos.x, dz = src.pos.z - P.pos.z;
      const angToSrc = Math.atan2(dx, dz);
      let diff = Math.abs(angToSrc - P.visYaw);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff > 1.85) facingSrc = false;
    }
    if (facingSrc) {
      if (P.blockTimer && P.blockTimer < 0.28) {
        parried = true; v = 0; P.counterBuff = 1.6;
        audio.sfx('parry'); emit('spark', P.pos.x, P.pos.y + 1.2, P.pos.z, '#ffe27a', 28, 6, 0.6, 6);
        floatText('PARRY!', V3(P.pos.x, P.pos.y + 2.4, P.pos.z), '#ffe27a', true);
        rumble(0.4, 100);
        if (src && !src.dead) {
          src.staggered = src.boss ? 1.5 : 2.5; src.atkT = 0;
          floatText('STAGGERED!', V3(src.pos.x, src.pos.y + 2.2, src.pos.z), '#ffe27a', true);
        }
      } else if (S.p.sta >= 10) {
        blocked = true; v *= ITEMS[S.p.equip.offhand] ? 0.2 : 0.45;
        S.p.sta -= 10; P.staDelay = 1.2; audio.sfx('block');
        emit('spark', P.pos.x, P.pos.y + 1.2, P.pos.z, '#ffe27a', 12, 4, 0.4, 5); rumble(0.3, 80);
      }
    } else {
      floatText('FLANKED!', V3(P.pos.x, P.pos.y + 2.2, P.pos.z), '#ff5544');
    }
  }
  if (!parried && !blocked) { audio.sfx('hurt'); P.hurtT = 0.4; rumble(0.5, 160); P.shake = 0.25; }
  if (P.ward > 0) { const ab = Math.min(P.ward, v); P.ward -= ab; v -= ab; floatText('absorbed', V3(P.pos.x, P.pos.y + 2.2, P.pos.z), '#ffd86a'); }
  S.p.hp -= v; S.hud.hurt = 1; P.combatT = 6; if (v > 0) floatText(String(Math.round(v)), V3(P.pos.x, P.pos.y + 2, P.pos.z), '#ff6a5a'); void src;
  if (S.p.hp <= 0) { S.p.hp = 0; P.dead = true; doAct('dead', 99); S.ui.dead = true; document.pointerLockElement && document.exitPointerLock(); audio.sfx('howl'); emitUI(); }
};
function respawn() {
  const P = G.player; if (P.inside) leaveInterior(true); const home = SETTLEMENTS[1]; const a = ST.anchors.thornwick.plaza; const d = derived(); P.dead = false; S.ui.dead = false; S.p.hp = d.maxHp * 0.5; S.p.mana = d.maxMana * 0.5; S.p.gold = Math.floor(S.p.gold * 0.9); P.act = 'none'; P.pos.set(a.x + 3, groundAt(a.x + 3, a.z + 3), a.z + 3); P.vel.set(0, 0, 0); P.invul = 2; G.enemies.forEach((f: any) => { if (!f.dead && f.aggro) { f.aggro = false; f.state = 'return'; } }); void home; toast('You wake in Thornwick, shaken. (−10% gold)', 'info'); emitUI();
}
function rumble(strong: number, ms: number) { if (!S.settings.vibration || !pad.on) return; const gp = navigator.getGamepads?.()[0] as any; gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong * 0.6 }).catch?.(() => {}); }

// =============== INPUT
function onKeyDown(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') { if (e.code === 'Escape') (e.target as HTMLElement).blur(); return; }
  S.hud.input !== 'kb' && ((S.hud.input = 'kb'), emitHud()); if (S.ui.rebind) return;
  if (S.screen !== 'game' || S.ui.loading) return; if (e.code === 'Escape') { e.preventDefault(); closeTop(); return; } if (e.code === 'Tab') e.preventDefault();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code);
  const a = codeToAction()[e.code]; if (a) { handleAction(a); }
}
function onKeyUp(e: KeyboardEvent) { keys.delete(e.code); }
function handleAction(a: string) {
  const u = S.ui; const toggle = (tab: string) => { if (u.dialogue || u.shop) return; u.codex = u.codex === tab ? null : tab; audio.sfx(u.codex ? 'open' : 'close'); if (u.codex && document.pointerLockElement) document.exitPointerLock(); emitUI(); };
  if (a === 'inventory') return toggle('inventory'); if (a === 'skills') return toggle('skills'); if (a === 'quests') return toggle('quests'); if (a === 'map') return toggle('map');
  if (uiOpen()) return; if (a === 'chat' && net.status !== 'offline') { u.chat = true; document.pointerLockElement && document.exitPointerLock(); emitUI(); return; }
  const P = G.player; if (P.dead) return;
  if (a === 'interact') interact(); else if (a === 'jump') jumpPressed(); else if (a === 'dodge') dodge(); else if (a === 'mount') toggleMount();
  else if (a === 'companion_cmd') cycleCompanionOrder();
  else if (a.startsWith('ability')) castAbility(Number(a.slice(7)) - 1); else if (a === 'potion') quickHeal(); else if (a === 'emote') { const em = ['wave', 'bow', 'cheer', 'point']; P.emoteI = ((P.emoteI ?? -1) + 1) % 4; doAct(em[P.emoteI], 1.8); P.netAct = em[P.emoteI]; }
}
function cycleCompanionOrder() {
  const activeComps = Object.keys(S.comp).filter((k) => S.comp[k]?.active);
  if (!activeComps.length) { toast('No active companion in your party.', 'info'); return; }
  const orders: ('follow' | 'defend' | 'attack' | 'wait')[] = ['follow', 'defend', 'attack', 'wait'];
  const cur = S.comp[activeComps[0]]?.stance || 'follow';
  const next = orders[(orders.indexOf(cur) + 1) % orders.length];
  activeComps.forEach((cid) => { S.comp[cid].stance = next; });
  audio.sfx('confirm');
  const labels: Record<string, string> = { follow: 'FOLLOW (Stay Close)', defend: 'DEFEND (Guard & Protect)', attack: 'ATTACK (Aggressive Charge)', wait: 'HOLD (Wait & Stand Ground)' };
  toast(`Companion Order: ${labels[next]}`, 'info');
  emitUI();
}
api.cycleCompanionOrder = cycleCompanionOrder;
api.setCompanionStance = (cid: string, s: any) => { if (S.comp[cid]) S.comp[cid].stance = s; emitUI(); };
function quickHeal() { const order = ['potion_health', 'potion_health_big', 'stew', 'roast_meat', 'grilled_fish', 'bread']; const id = order.find((i) => count(i) > 0); if (!id) { toast('No healing items.', 'error'); return; } doAct('drink', 0.8); useItem(id); }
function closeTop() {
  const u = S.ui; if (u.confirm) u.confirm = null; else if (u.settings) u.settings = false; else if (u.mp) u.mp = false; else if (u.chat) u.chat = false; else if (u.houseEdit) u.houseEdit = false; else if (u.storage) u.storage = false; else if (u.houseSale) u.houseSale = false; else if (u.stable) u.stable = false; else if (u.shop) u.shop = null; else if (u.dialogue) { bus.emit('dialogueEnd'); u.dialogue = null; } else if (u.codex) u.codex = null; else if (u.fish) { u.fish = null; } else if (u.dead) { return; } else u.pause = !u.pause;
  audio.sfx('close'); emitUI();
}
function onMouseDown(e: MouseEvent) { audio.init(); if (e.target !== canvasEl) return; S.hud.input !== 'kb' && ((S.hud.input = 'kb'), emitHud()); if (uiOpen() || S.screen !== 'game') return; if (!mouse.locked) { canvasEl?.requestPointerLock?.(); } mouse.b.add(e.button); if (e.button === 0 && !G.player.dead) { /* attack processed in loop */ } e.preventDefault(); }
function onMouseUp(e: MouseEvent) { mouse.b.delete(e.button); }
function onMouseMove(e: MouseEvent) { if (S.ui.rebind) return; if (mouse.locked || mouse.b.has(2)) { mouse.dx += e.movementX; mouse.dy += e.movementY; } }
function onLock() { mouse.locked = document.pointerLockElement === canvasEl; }
function onWheel(e: WheelEvent) { if (uiOpen()) return; G.cam.dist = clamp(G.cam.dist + Math.sign(e.deltaY) * 0.5, 2.5, 9); }
function bindInput() { window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('mousedown', onMouseDown); window.addEventListener('mouseup', onMouseUp); window.addEventListener('mousemove', onMouseMove); document.addEventListener('pointerlockchange', onLock); window.addEventListener('wheel', onWheel, { passive: true }); window.addEventListener('contextmenu', blockCtx); window.addEventListener('blur', () => { keys.clear(); mouse.b.clear(); }); }
function unbindInput() { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('mousedown', onMouseDown); window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('mousemove', onMouseMove); document.removeEventListener('pointerlockchange', onLock); window.removeEventListener('wheel', onWheel); window.removeEventListener('contextmenu', blockCtx); keys.clear(); mouse.b.clear(); }
const blockCtx = (e: Event) => { if (S.screen === 'game') e.preventDefault(); };
function padType(gp: Gamepad) { const id = gp.id.toLowerCase(); if (S.settings.glyphs !== 'auto') return S.settings.glyphs; if (/054c|playstation|dualshock|dualsense|sony|ps4|ps5/.test(id)) return 'ps'; return 'xbox'; }
function readPad(dt: number) {
  const gps = navigator.getGamepads ? navigator.getGamepads() : []; const gp = [...gps].find((g) => g && g.connected); if (!gp) { pad.on = false; return; }
  pad.on = true; const dz = S.settings.deadzone; const ax = (v: number) => (Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz)); pad.lx = ax(gp.axes[0] || 0); pad.ly = ax(gp.axes[1] || 0); pad.rx = ax(gp.axes[2] || 0); pad.ry = ax(gp.axes[3] || 0);
  const b = gp.buttons.map((x) => x.pressed); const edge = (i: number) => b[i] && !pad.prev[i]; const anyIn = b.some(Boolean) || Math.abs(pad.lx) + Math.abs(pad.ly) + Math.abs(pad.rx) + Math.abs(pad.ry) > 0.3;
  if (anyIn && S.hud.input !== 'pad') { S.hud.input = 'pad'; S.hud.pad = padType(gp); emitHud(); } if (S.hud.pad !== padType(gp)) { S.hud.pad = padType(gp); emitHud(); }
  pad.btn = b; const inUI = uiOpen();
  if (S.screen !== 'game' || S.ui.loading) { pad.prev = b; return; }
  if (inUI) { // menu navigation
    pad.navT -= dt; const dirX = (b[15] ? 1 : 0) - (b[14] ? 1 : 0) || (Math.abs(pad.lx) > 0.6 ? Math.sign(pad.lx) : 0), dirY = (b[13] ? 1 : 0) - (b[12] ? 1 : 0) || (Math.abs(pad.ly) > 0.6 ? Math.sign(pad.ly) : 0);
    if ((dirX || dirY) && pad.navT <= 0) { pad.navT = 0.18; navFocus(dirX, dirY); } if (!dirX && !dirY) pad.navT = 0;
    if (edge(0)) (document.activeElement as HTMLElement)?.click?.(); if (edge(1)) closeTop(); if (edge(4) || edge(5)) bus.emit('tabshift', edge(5) ? 1 : -1); if (edge(9)) closeTop();
  } else { if (edge(9)) { S.ui.pause = true; emitUI(); } if (edge(8)) handleAction('map'); if (edge(0)) handleAction('jump'); if (edge(1)) handleAction('dodge'); if (edge(3)) handleAction('interact'); if (edge(4)) handleAction('potion'); if (edge(2) || edge(7)) pressed.add('padAttack'); if (edge(14)) handleAction('ability1'); if (edge(12)) handleAction('ability2'); if (edge(15)) handleAction('ability3'); if (edge(13)) handleAction('ability4'); if (edge(10)) handleAction('mount'); if (edge(11)) G.player.crouchToggle = !G.player.crouchToggle; if (edge(6) && false) { /* */ } if (S.ui.fish && edge(3)) { /* handled in interact */ } }
  pad.prev = b;
}
function navFocus(dx: number, dy: number) {
  const root = document.querySelector('[data-modal="1"]') || document.body; const els = [...root.querySelectorAll<HTMLElement>('button:not([disabled]), [data-nav], input, select')].filter((e) => e.offsetParent !== null); if (!els.length) return; const cur = document.activeElement as HTMLElement; if (!els.includes(cur)) { els[0].focus(); audio.sfx('hover'); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best: HTMLElement | null = null, bs = 1e9;
  for (const e of els) { if (e === cur) continue; const q = e.getBoundingClientRect(), ex = q.left + q.width / 2 - cx, ey = q.top + q.height / 2 - cy; const along = dx ? ex * dx : ey * dy; if (along <= 4) continue; const perp = dx ? Math.abs(ey) : Math.abs(ex); const s = along + perp * 2.2; if (s < bs) { bs = s; best = e; } }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); audio.sfx('hover'); }
}

// =============== INTERACTION
function jumpPressed() {
  const P = G.player; if (P.sit) { standUp(); return; } if (P.swim) return;
  if (P.grounded || P.coyote > 0) { P.vel.y = P.mounted ? 8 : 9; P.grounded = false; P.coyote = 0; audio.sfx(P.mounted ? 'whinny' : 'jump', 1); if (!P.mounted) doAct('none', 0); hint('glide', 'Jump, then press Space again in mid-air to GLIDE. Aether updrafts (glowing columns) carry you to the floating isles.'); }
  else if (!P.mounted || P.mounted.key === 'starmare') { if (!P.glide && P.airT > 0.2 && S.p.sta > 5) { P.glide = true; audio.sfx('glide'); } else P.glide = false; }
}
function standUp() { const P = G.player; if (!P.sit) return; P.pos.set(P.sit.ox, P.sit.oy, P.sit.oz); P.sit = null; audio.sfx('sit'); }
function nearestInter(): any {
  const P = G.player, pp = P.pos; let best: any = null, bd = 99; const list = P.inside ? homeItems.concat(interior!.items as any[]) : G.inter;
  for (const it of list) { if (it.kind === 'ignore' || (it.vis && !it.vis())) continue; const dx = it.x - pp.x, dz = it.z - pp.z, d = Math.hypot(dx, dz); const r = it.r || 2.2; if (d < r && d < bd && Math.abs((it.y ?? 0) + (P.inside ? INT_Y : 0) - pp.y) < 6) { bd = d; best = it; } }
  // NPCs
  const npcs = P.inside ? intNpcs : G.npcs; for (const n of npcs) { if (n.hidden || n.id === 'aether_stag') continue; const d = Math.hypot(n.pos.x - pp.x, n.pos.z - pp.z); if (d < 2.8 && d < bd + 0.4) { bd = d; best = { kind: 'npc', npc: n, label: `Talk to ${n.name}` }; } }
  for (const f of G.enemies) { if (f.ai === 'stag' && !f.dead) { const d = Math.hypot(f.pos.x - pp.x, f.pos.z - pp.z); if (d < 4 && d < bd + 0.5) { bd = d; best = { kind: 'stag', f, label: 'Approach the Aether Stag' }; } } }
  if (!best && !P.inside && !P.mounted && P.grounded) { const f = faceDir(); const wx = pp.x + f.x * 2.4, wz = pp.z + f.z * 2.4; if (groundAt(wx, wz) < -0.2 && groundAt(pp.x, pp.z) > -0.3 && Math.hypot(wx - pp.x, wz - pp.z) < 3) best = { kind: 'fish', label: 'Cast a fishing line' }; }
  if (!best) { const fire = ST.fires.find((f) => Math.hypot(f.x - pp.x, f.z - pp.z) < 3); if (fire && !P.inside) best = { kind: 'campfire', label: 'Cook at the campfire' }; }
  return best;
}
function interact() {
  const P = G.player; if (S.ui.fish) { fishPress(); return; } if (P.sit) { standUp(); return; } const it = nearestInter(); if (!it) return; audio.sfx('click');
  switch (it.kind) {
    case 'npc': { const n = it.npc; const ang = Math.atan2(n.pos.x - P.pos.x, n.pos.z - P.pos.z); P.visYaw = ang; P.yaw = ang; openDialogue(n); if (document.pointerLockElement) document.exitPointerLock(); break; }
    case 'stag': { P.visYaw = Math.atan2(it.f.pos.x - P.pos.x, it.f.pos.z - P.pos.z); if (S.quests.stag && !S.quests.stag.done) { openDialogue({ id: 'aether_stag', name: 'Aether Stag', pos: it.f.pos, role: 'animal', seed: 1 }); } else toast('The stag watches you quietly. (Ask Elder Maren about it.)', 'info'); break; }
    case 'fish': startFishing(); break; case 'campfire': S.ui.codex = 'craft'; document.pointerLockElement && document.exitPointerLock(); emitUI(); break;
    case 'door': useDoor(it.door); break; case 'exit': leaveInterior(); break; case 'use': it.use(); break;
    case 'sit': sitAt(it); break; case 'sleep': if (it.data?.inn) toast('Talk to the innkeeper to rent a bed.', 'info'); else { sleepNow(false); } break;
    case 'storage': S.ui.storage = true; document.pointerLockElement && document.exitPointerLock(); emitUI(); break;
    case 'read': { const l = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; const n = l[Math.floor(Math.random() * l.length)]; doAct('read', 1.5); toast(`You skim a book: ${ITEMS['lore_' + n].desc}`, 'info'); break; }
    case 'lore': foundLore(it.data.n); doAct('read', 1.2); break;
    case 'mirror': S.creatorMode = 'edit'; S.screen = 'creator'; document.pointerLockElement && document.exitPointerLock(); emitUI(); break;
    case 'station': S.ui.codex = 'craft'; document.pointerLockElement && document.exitPointerLock(); emitUI(); break;
    case 'rune': runePress(it.data.i); break; case 'ore': mineInterior(it); break; case 'chest': openChest(it); break;
  }
}
function sitAt(it: any) { const P = G.player; P.sit = { ox: P.pos.x, oy: P.pos.y, oz: P.pos.z }; P.pos.set(it.x, (P.inside ? INT_Y : groundFull(it.x, it.z, 99)) + (it.data?.y ?? 0.5) - 0.5, it.z); P.visYaw = it.ry ?? P.visYaw; audio.sfx('sit'); doAct('none', 0); hint('sit', 'Press E or Space to stand.'); }
function sleepNow(inn: boolean) { fade(); setTimeout(() => { const d = derived(); S.p.hp = d.maxHp; S.p.mana = d.maxMana; S.p.sta = d.maxSta; if (S.world.time > 7) S.world.day++; S.world.time = 7; audio.sfx('sleep'); saveGame('auto', true); toast(inn ? 'You rest at the inn. Health restored; game saved.' : 'You sleep soundly. Health restored; game saved.', 'info'); }, 600); }
function fade() { S.hud.fade = 1; emitHud(); setTimeout(() => { S.hud.fade = 0; emitHud(); }, 900); }
// ---- fishing
function startFishing() { const P = G.player; P.visYaw = P.visYaw; S.ui.fish = { state: 'wait', t: 2 + Math.random() * 3.5 }; doAct('interact', 99); audio.sfx('splash'); document.pointerLockElement && document.exitPointerLock(); emitUI(); }
function fishPress() { const f = S.ui.fish; if (f.state === 'bite') { const gold = Math.random() < 0.04 && Math.hypot(G.player.pos.x - 175, G.player.pos.z - 50) < 90; const id = gold ? 'golden_carp' : 'fish_raw'; addItem(id, 1); profXp('fishing', gold ? 40 : 10); questEvent('gather', id); audio.sfx('fish'); if (S.p.cls === 'hunter' && Math.random() < 0.3) { addItem('fish_raw', 1); questEvent('gather', 'fish_raw'); } f.state = 'wait'; f.t = 2 + Math.random() * 3.5; f.msg = 'Caught!'; } else if (f.state === 'wait') { S.ui.fish = null; G.player.act = 'none'; toast('You reeled in too early.', 'info'); } emitUI(); }
function updateFishing(dt: number) { const f = S.ui.fish; if (!f) return; f.t -= dt; if (f.state === 'wait' && f.t <= 0) { f.state = 'bite'; f.t = 1.1; audio.sfx('fish'); emitUI(); } else if (f.state === 'bite' && f.t <= 0) { f.state = 'wait'; f.t = 2 + Math.random() * 3; f.msg = 'It got away…'; emitUI(); } if (G.player.act !== 'interact') { S.ui.fish = null; emitUI(); } }

// =============== WORLD OBJECTS (nodes, chests, lore, farm, portal, doors)
const nodeGeo = { cone: new THREE.ConeGeometry(0.12, 0.5, 5), sph: new THREE.SphereGeometry(0.28, 7, 5), rock: new THREE.DodecahedronGeometry(0.7, 0) };
function addInter(o: any) { G.inter.push(o); return o; }
function chestLoot(tier: number, extra?: string) {
  const gold = Math.round((20 + Math.random() * 40) * tier * tier); addGold(gold); const pool: string[][] = [['potion_health', 'potion_mana', 'iron_ore', 'bread', 'leather', 'herb_red'], ['potion_health_big', 'steel_ingot', 'ring_vigor', 'ring_arcane', 'gloves_leather', 'boots_iron', 'herb_blue'], ['sword_steel', 'chest_mail', 'amulet_ward', 'bow_long', 'staff_ember', 'silver_ore', 'shield_kite'], ['sword_rune', 'chest_moon', 'boots_swift', 'staff_storm', 'axe_frost', 'gem_ruby', 'aether_dust'], ['sword_flame', 'circlet_sage', 'tome_ancient', 'chest_kharun', 'relic_idol', 'aether_dust']]; const p = pool[Math.min(tier, 5) - 1]; const n = tier >= 3 ? 2 : 1 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) { const id = p[Math.floor(Math.random() * p.length)]; addItem(id, ITEMS[id].type === 'material' || ITEMS[id].type === 'consumable' ? 1 + Math.floor(Math.random() * 3) : 1); } if (extra) addItem(extra, 1);
}
function openChest(it: any) { const id = it.data.id; if (S.flags['chest_' + id]) { toast('Already empty.', 'info'); return; } S.flags['chest_' + id] = true; doAct('pickup', 0.7); audio.sfx('chest'); const lid = it.mesh?.getObjectByName('lid'); if (lid) lid.rotation.x = -1.1; chestLoot(it.data.tier || 1, it.data.extra); profXp('herbalism', 0); const ch = id; S.discovered['c_' + ch] = true; gainXp(20 * (it.data.tier || 1)); emitHud(); }
function buildWorldObjects() {
  const R = rng(2024); const W = G.world; const cols = { herb_red: '#d84a4a', herb_blue: '#6ab4ff', mushroom: '#c8a0ff', berry: '#d83a6a', moonpetal: '#bfe8ff' };
  const mkNode = (kind: string, item: string, x: number, z: number, o: any = {}) => { const y = o.y ?? groundAt(x, z); const g = new THREE.Group(); g.position.set(x, y, z); const c = (cols as any)[item] || '#aaa';
    if (kind === 'ore') { const r = new THREE.Mesh(nodeGeo.rock, new THREE.MeshStandardMaterial({ color: '#55555a', roughness: 1, flatShading: true })); r.scale.set(1, 0.8, 1); r.position.y = 0.4; r.castShadow = true; g.add(r); const colr = item === 'coal' ? '#111' : item === 'silver_ore' ? '#e8f0ff' : '#c88a50'; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(nodeGeo.sph, new THREE.MeshStandardMaterial({ color: colr, emissive: item === 'coal' ? '#000' : colr, emissiveIntensity: 0.25 })); s.scale.setScalar(0.4); s.position.set(Math.cos(i * 1.6) * 0.5, 0.5 + (i % 2) * 0.2, Math.sin(i * 1.6) * 0.5); g.add(s); } }
    else if (kind === 'berry') { const b = new THREE.Mesh(nodeGeo.sph, new THREE.MeshLambertMaterial({ color: '#3f7a2f' })); b.scale.set(1.8, 1.2, 1.8); b.position.y = 0.4; g.add(b); for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(nodeGeo.sph, new THREE.MeshBasicMaterial({ color: c })); s.scale.setScalar(0.18); s.position.set(Math.cos(i * 1.1) * 0.5, 0.5 + (i % 3) * 0.15, Math.sin(i * 1.1) * 0.5); g.add(s); } }
    else if (kind === 'mushroom') { for (let i = 0; i < 3; i++) { const cap = new THREE.Mesh(nodeGeo.sph, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 })); cap.scale.set(0.5, 0.3, 0.5); cap.position.set(Math.cos(i * 2.1) * 0.25, 0.3 + i * 0.05, Math.sin(i * 2.1) * 0.25); g.add(cap); } }
    else { for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(nodeGeo.cone, new THREE.MeshStandardMaterial({ color: c, emissive: item === 'moonpetal' ? c : '#000', emissiveIntensity: item === 'moonpetal' ? 1.4 : 0 })); f.position.set(Math.cos(i * 1.3) * 0.25, 0.3, Math.sin(i * 1.3) * 0.25); f.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i) * 0.3); g.add(f); } if (item === 'moonpetal') { const l = new THREE.PointLight('#bfe8ff', 0.6, 5); l.position.y = 0.6; g.add(l); } }
    W.add(g); const lab = { herb_red: 'Gather Redroot', herb_blue: 'Gather Frostbloom', mushroom: 'Pick Glowcaps', berry: 'Pick Wild Berries', moonpetal: 'Gather Moonpetal', iron_ore: 'Mine Iron Ore', coal: 'Mine Coal', silver_ore: 'Mine Silver Ore' }[item] || 'Gather'; const node: any = { kind: 'use', x, z, y, r: 1.9, label: lab, mesh: g, dead: 0, vis: () => !node.dead && (item !== 'moonpetal' || (S.world.time < 5.5 || S.world.time > 19.5)),
      use() { const prof = kind === 'ore' ? 'mining' : 'herbalism'; const need = item === 'silver_ore' ? 3 : 1; if (kind === 'ore' && S.p.prof.mining.lvl < need) { toast(`Requires Mining ${need}.`, 'error'); return; } doAct(kind === 'ore' ? 'work' : 'pickup', 0.8); G.player.actDur = 0.8; audio.sfx(kind === 'ore' ? 'craft' : 'pickup'); const bonus = Math.random() < derived().gather ? 1 : 0; const n = (kind === 'ore' ? 1 + (Math.random() < 0.4 ? 1 : 0) : 1) + bonus; addItem(item, n); questEvent('gather', item, undefined, n); profXp(prof, kind === 'ore' ? 8 : 6); if (kind === 'ore' && Math.random() < 0.4) addItem('coal', 1); node.dead = 1; g.visible = false; setTimeout(() => { node.dead = 0; g.visible = true; }, 240000); emit('spark', x, y + 0.5, z, c, 8, 2, 0.5, 2); } };
    addInter(node); return node; };
  const scatterN = (n: number, test: (x: number, z: number) => boolean, f: (x: number, z: number) => void) => { let c = 0, t = 0; while (c < n && t < n * 80) { t++; const x = (R() * 2 - 1) * 235, z = (R() * 2 - 1) * 235, h = groundAt(x, z); if (h < 1 || blocked(x, z, 2) || !test(x, z)) continue; f(x, z); c++; } };
  scatterN(34, (x, z) => ['forest', 'grass'].includes(biomeAt(x, z)), (x, z) => mkNode('herb', 'herb_red', x, z)); scatterN(24, (x, z) => biomeAt(x, z) === 'mountain' || biomeAt(x, z) === 'snow', (x, z) => mkNode('herb', 'herb_blue', x, z));
  scatterN(30, (x, z) => biomeAt(x, z) === 'forest', (x, z) => mkNode('mushroom', 'mushroom', x, z)); scatterN(22, (x, z) => biomeAt(x, z) !== 'mountain', (x, z) => mkNode('berry', 'berry', x, z));
  scatterN(18, (x, z) => x < -60 && z > -40 && biomeAt(x, z) === 'forest', (x, z) => mkNode('herb', 'moonpetal', x, z)); for (let i = 0; i < 6; i++) mkNode('herb', 'moonpetal', -205 + Math.cos(i) * 8, 20 + Math.sin(i) * 8);
  scatterN(22, (x, z) => z < -110 && biomeAt(x, z) !== 'snow', (x, z) => mkNode('ore', R() < 0.35 ? 'coal' : 'iron_ore', x, z)); scatterN(10, (x, z) => Math.hypot(x - 110, z + 190) < 70, (x, z) => mkNode('ore', R() < 0.5 ? 'silver_ore' : 'iron_ore', x, z));
  // chests
  const chestAt = (id: string, x: number, z: number, tier: number, y?: number, ry = 0) => { const f = buildFurniture('chest'); const gy = y ?? groundFull(x, z, 99); f.position.set(x, gy, z); f.rotation.y = ry; W.add(f); if (S.flags['chest_' + id]) { const lid = f.getObjectByName('lid'); if (lid) lid.rotation.x = -1.1; } addInter({ kind: 'chest', x, z, y: gy, r: 2.4, label: 'Open chest', mesh: f, data: { id, tier }, vis: () => true }); };
  chestAt('spire', -170, -132, 3); chestAt('fort', -10, 199, 3, undefined, Math.PI); chestAt('cove', 226, 117, 2); chestAt('chapel', 95, -34, 2); chestAt('lodge', -108, 156, 1); chestAt('grove', -208, 26, 3); chestAt('falls', 56, -149, 3); chestAt('frost', 96, -218, 2); chestAt('beach', 190, 96, 2); chestAt('ash', -62, 168, 1); chestAt('light', 226, -25, 2);
  const isl = ST.anchors; chestAt('isle3', isl.isle3.x + 3, isl.isle3.z + 2, 4, isl.isle3.y); chestAt('isle2', isl.isle2.x + 4, isl.isle2.z - 3, 3, isl.isle2.y); chestAt('isle1', isl.isle1.x - 4, isl.isle1.z + 3, 3, isl.isle1.y);
  // lore pages
  const lorePos: any = { 1: [-165, -125], 2: [isl.isle1.x + 2, isl.isle1.z - 3, isl.isle1.y], 3: [isl.isle2.x - 2, isl.isle2.z + 4, isl.isle2.y], 5: [92, -205], 6: [-200, 14], 7: [175 + 62, 50, 1.6], 8: [218, 108], 11: [226, -35], 12: [93, -27], 10: [-58, 160] };
  Object.entries(lorePos).forEach(([n, p]: any) => { const [x, z, yy] = p; const y = yy ?? groundAt(x, z); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), new THREE.MeshStandardMaterial({ color: '#f4e6b0', emissive: '#e8c050', emissiveIntensity: 0.9, side: THREE.DoubleSide })); m.position.set(x, y + 0.9, z); W.add(m); const l = new THREE.PointLight('#ffd070', 0.5, 4); l.position.copy(m.position); W.add(l); G.floatPages = (G.floatPages || []).concat([m]); addInter({ kind: 'use', x, z, y, r: 2, label: 'Take lore page', mesh: m, vis: () => !S.lore[n], use() { foundLore(Number(n)); m.visible = false; l.visible = false; doAct('pickup', 0.6); } }); if (S.lore[n]) { m.visible = false; l.visible = false; } });
  // shards
  const shard = (item: string, x: number, z: number, y: number, col: string) => { const g = new THREE.Group(); g.position.set(x, y, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1, 6), new THREE.MeshStandardMaterial({ color: '#777' })); p.position.y = 0.5; g.add(p); const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6 })); c.position.y = 1.7; g.add(c); const l = new THREE.PointLight(col, 1.4, 12); l.position.y = 1.7; g.add(l); W.add(g); G.shards = (G.shards || []).concat([c]); addInter({ kind: 'use', x, z, y, r: 2.4, label: 'Take the shard', mesh: g, vis: () => count(item) === 0 && !S.flags['took_' + item], use() { S.flags['took_' + item] = true; addItem(item, 1); doAct('pickup', 0.8); g.visible = false; audio.sfx('unlock'); } }); if (S.flags['took_' + item]) g.visible = false; };
  shard('shard_sky', isl.isle1.x, isl.isle1.z, isl.isle1.y, '#7fd8ff'); shard('shard_ember', isl.isle2.x, isl.isle2.z, isl.isle2.y, '#ff7a3a');
  // portal
  const por = ST.anchors.portal; addInter({ kind: 'use', x: por.x, z: por.z, y: groundAt(por.x, por.z), r: 3.6, label: 'The Hollow Door', use() { const have = ['shard_sky', 'shard_deep', 'shard_ember'].every((i) => count(i) > 0); if (!have) { toast('The door is sealed. It hungers for three shards: Sky, Deep and Ember.', 'error'); bark('Fenn', 'Bring the three shards, then press the glowing stone!', 4000); return; } audio.sfx('portal'); enterInterior('rift', {}); } });
  // doors
  ST.doors.forEach((d) => addInter({ kind: 'door', door: d, x: d.x, z: d.z, y: groundAt(d.x, d.z), r: 2.4, label: d.houseId ? (houseState(d.houseId).owned ? `Enter your ${HOUSES[d.houseId].name}` : `${HOUSES[d.houseId].name} — for sale (${HOUSES[d.houseId].price}g)`) : d.label, get lbl() { return d.label; } }));
  // farm plots
  (ST.anchors.plots || []).forEach((p: any) => { const key = 'thornwick_' + p.id; const crop = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 6), new THREE.MeshLambertMaterial({ color: '#7aa83a' })); crop.position.set(p.x, groundAt(p.x, p.z) + 0.3, p.z); crop.visible = false; W.add(crop);
    const it: any = { kind: 'use', x: p.x, z: p.z, r: 2.4, y: groundAt(p.x, p.z), get label() { const f = S.farm[key]; if (!f) return 'Plant seeds'; return S.world.clock - f.t0 >= 150 ? 'Harvest crop' : `Growing… ${Math.floor(Math.min(1, (S.world.clock - f.t0) / 150) * 100)}%`; },
      use() { const f = S.farm[key]; if (!f) { const seed = count('seed_turnip') > 0 ? 'turnip' : count('seed_wheat') > 0 ? 'wheat' : null; if (!seed) { toast('You need turnip or wheat seeds (Orrin sells them).', 'error'); return; } removeItem('seed_' + seed, 1); S.farm[key] = { crop: seed, t0: S.world.clock }; doAct('pickup', 0.8); audio.sfx('sit'); toast(`Planted ${seed} seeds. They'll ripen in ~2.5 minutes.`, 'info'); hint('farm', 'Crops grow in real time while you play. Come back to harvest!'); } else if (S.world.clock - f.t0 >= 150) { const item = f.crop === 'wheat' ? 'wheat' : 'turnip'; const n = 2 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < derived().gather ? 1 : 0); addItem(item, n); questEvent('gather', item, undefined, n); addItem('seed_' + item, 1 + (Math.random() < 0.5 ? 1 : 0), true); profXp('farming', 12); delete S.farm[key]; doAct('pickup', 0.8); audio.sfx('pickup'); } } };
    G.plots = (G.plots || []).concat([{ key, crop, p }]); addInter(it); });
}
export function updateFarm() { (G.plots || []).forEach((q: any) => { const f = S.farm[q.key]; q.crop.visible = !!f && !G.player.inside; if (f) { const k = Math.min(1, (S.world.clock - f.t0) / 150); q.crop.scale.set(0.5 + k, 0.4 + k * 1.2, 0.5 + k); (q.crop.material as any).color.set(f.crop === 'wheat' ? (k >= 1 ? '#d8b84a' : '#9ab83a') : k >= 1 ? '#8a3a8a' : '#7aa83a'); } }); }

// =============== DOORS / INTERIORS / HOUSING
function useDoor(d: any) {
  if (d.houseId) { const h = houseState(d.houseId); if (!h.owned) { S.ui.saleId = d.houseId; S.ui.houseSale = true; document.pointerLockElement && document.exitPointerLock(); emitUI(); return; } return enterInterior('home', { houseId: d.houseId, door: d }); }
  if (d.interior === 'hall' && S.rep.crown <= -60) { toast('The palace guards bar the door. The Crown considers you an enemy.', 'error'); return; }
  enterInterior(d.interior, { door: d, npc: d.npc });
}
function enterInterior(type: string, o: any) {
  const P = G.player; fade(); audio.sfx(type === 'rift' ? 'portal' : 'door'); if (P.mounted) dismount(); P.ret = P.pos.clone(); if (o.door) P.ret.set(o.door.x, groundAt(o.door.x, o.door.z), o.door.z);
  const house = o.houseId ? HOUSES[o.houseId] : null; interior = buildInterior(type, { npc: o.npc, house, level: o.houseId ? houseState(o.houseId).level : 1, flags: S.flags }); houseId = o.houseId || null;
  G.intGroup.clear(); G.intGroup.add(interior.group); G.intGroup.add(P.rig.group); G.world.visible = false; G.intGroup.visible = true; P.inside = interior; P.insideKey = o.houseId ? 'home:' + o.houseId : type + (o.door?.settle ? '@' + o.door.settle : ''); G.cam.dist = Math.min(G.cam.dist, 6);
  if (type === 'rift') { S.discovered.hollow_rift = true; questEvent('reach', 'hollow_rift'); G.intGroup.position.y = INT_Y; hint('rift', 'The Rift Warden guards the Hollow. Use your abilities and dodge its shockwaves!'); }
  let extraNpcs: any[] = []; if (type === 'tavern' && o.door?.settle === 'highcrown') extraNpcs = [{ id: 'stranger', x: -6.5, z: -4.5, ry: Math.PI / 2, act: 'sit' }];
  intNpcs = spawnInteriorNpcs(interior, interior.group, extraNpcs); intFoes = spawnInteriorFoes(interior, interior.group); intFoes.forEach((f: any) => { if (S.flags['dead_' + f.type]) removeFoe(f); }); intFoes = intFoes.filter((f) => G.enemies.includes(f));
  if (type === 'home') { homeGroup = new THREE.Group(); interior.group.add(homeGroup); homeBase = interior.blockers.length; refreshHome(); }
  const sp = interior.spawn; P.pos.set(sp.x, INT_Y + interior.ground(sp.x, sp.z) + 0.05, sp.z); P.vel.set(0, 0, 0); P.visYaw = Math.PI; P.yaw = Math.PI; G.cam.yaw = 0; G.cam.pitch = 0.5; syncCompanions(); companions.forEach((c) => c.pos.set(P.pos.x + 1.5, P.pos.y, P.pos.z + 0.5));
  audio.setMood(({ tavern: 'village', smith: 'village', shop: 'village', alch: 'village', library: 'story', hall: 'story', home: 'village', cave: 'cave', rift: 'rift', crypt: 'cave', sunken_temple: 'coast', fortress_undercroft: 'ruin', grotto: 'cave' } as any)[type] || 'village'); applyGraphics();
  if (type === 'cave') hint('cave', 'Three runes glow in the first chamber. Touch them all to open the hidden vault.');
  if (type === 'crypt') hint('crypt', 'Whispering Catacombs: Ancient tombs of the fallen. Beware spectral guardians.');
  if (type === 'sunken_temple') hint('sunken_temple', 'Sunken Aether Temple: Flooded chambers filled with volatile void magic.');
  if (type === 'fortress_undercroft') hint('fortress_undercroft', 'Bastion Undercroft: Fort Cinderwatch subterranean garrison and armory.');
  if (type === 'grotto') hint('grotto', 'Luminescent Grotto: Subterranean caverns glowing with aether flora.');
  net.sendDungeon(P.insideKey, type.replace(/_/g, ' '));
}
function leaveInterior(silent = false) {
  const P = G.player; if (!P.inside) return; if (!silent) { fade(); audio.sfx('door'); } const type = interior ? [...[]].length : 0; void type;
  intFoes.forEach((f) => removeFoe(f)); intFoes = []; intNpcs = []; G.intGroup.clear(); G.intGroup.visible = false; G.world.visible = true; interior = null; homeGroup = null; homeItems = []; houseId = null; P.inside = null; P.insideKey = null; G.projectiles.forEach((p: any) => G.scene.remove(p.m)); G.projectiles.length = 0;
  const r = P.ret || V3(-150, 0, 100); P.pos.set(r.x, groundFull(r.x, r.z, 99) + 0.1, r.z); P.vel.set(0, 0, 0); P.sit = null; if (P.rig.group.parent !== G.world) G.world.add(P.rig.group); syncCompanions(); companions.forEach((c) => c.pos.set(P.pos.x + 1.5, P.pos.y, P.pos.z + 1)); applyGraphics(); G.cam.yaw = Math.atan2(-(P.pos.x - (P.ret?.x ?? 0)), 1) + Math.PI;
  net.sendDungeon('world', 'the overworld');
}
function refreshHome() {
  if (!interior || !homeGroup || !houseId) return; const hs = houseState(houseId); homeGroup.clear(); interior.blockers.length = homeBase; homeItems = [];
  const hw = interior.w / 2 - 0.8, hd = interior.d / 2 - 0.8;
  hs.furn.forEach((f: any) => { const g = buildFurniture(f.k); g.position.set(f.x, interior!.ground(f.x, f.z), f.z); g.rotation.y = f.r; homeGroup!.add(g); const fp = footprint(f.k); if (fp) { const sw = Math.abs(Math.cos(f.r)) > 0.5; const ww = sw ? fp[0] : fp[1], dd = sw ? fp[1] : fp[0]; interior!.blockers.push({ x0: f.x - ww / 2, z0: f.z - dd / 2, x1: f.x + ww / 2, z1: f.z + dd / 2 }); }
    const use = FURNITURE[f.k].use; const fx = f.x + Math.sin(f.r) * 1.3, fz = f.z + Math.cos(f.r) * 1.3; const base = { x: fx, z: fz, y: interior!.ground(f.x, f.z), ry: f.r + Math.PI, mesh: g };
    if (use === 'sit') homeItems.push({ ...base, kind: 'sit', label: 'Sit', x: f.x, z: f.z, data: { y: 0.55 }, ry: f.r }); else if (use === 'sleep') homeItems.push({ ...base, kind: 'sleep', label: 'Sleep until morning (saves game)', data: {} }); else if (use === 'storage') homeItems.push({ ...base, kind: 'storage', label: 'Open storage chest' }); else if (use === 'read') homeItems.push({ ...base, kind: 'read', label: 'Browse the bookshelf' }); else if (use === 'mirror') homeItems.push({ ...base, kind: 'mirror', label: 'Change appearance' }); else if (use === 'station') homeItems.push({ ...base, kind: 'station', label: `Use ${FURNITURE[f.k].name}`, data: { st: FURNITURE[f.k].station } }); });
  void hw; void hd; bus.emit('homechanged');
}
const clampHome = (x: number, z: number) => { const w = interior!.w / 2 - 1.2, d = interior!.d / 2 - 1.2; return [clamp(Math.round(x * 2) / 2, -w, w), clamp(Math.round(z * 2) / 2, -d, d)]; };
api.placeFurniture = (hid: string, kind: string) => {
  const hs = houseState(hid); if (!interior || houseId !== hid) { toast('Enter your home to furnish it.', 'error'); return false; } if (hs.furn.length >= houseSlots(hid)) { toast('No free furniture slots. Upgrade the property for more.', 'error'); audio.sfx('error'); return false; }
  hs.stash ||= {}; if ((hs.stash[kind] || 0) > 0) hs.stash[kind]--; else { const price = FURNITURE[kind].price; if (S.p.gold < price) { toast('Not enough gold.', 'error'); audio.sfx('error'); return false; } S.p.gold -= price; }
  const P = G.player; const f = faceDir(); const [x, z] = clampHome(P.pos.x + f.x * 2, P.pos.z + f.z * 2); hs.furn.push({ id: hs.nid++, k: kind, x, z, r: Math.round(P.visYaw / (Math.PI / 2)) * (Math.PI / 2) + Math.PI }); audio.sfx('equip'); refreshHome(); emitUI(); return true;
};
api.moveFurniture = (hid: string, id: number) => { const hs = houseState(hid); const f = hs.furn.find((q: any) => q.id === id); if (!f || !interior) return; const P = G.player, fd = faceDir(); [f.x, f.z] = clampHome(P.pos.x + fd.x * 2, P.pos.z + fd.z * 2); audio.sfx('equip'); refreshHome(); emitUI(); };
api.rotateFurniture = (hid: string, id: number) => { const f = houseState(hid).furn.find((q: any) => q.id === id); if (!f) return; f.r += Math.PI / 2; audio.sfx('tab'); refreshHome(); emitUI(); };
api.removeFurniture = (hid: string, id: number) => { const hs = houseState(hid); const i = hs.furn.findIndex((q: any) => q.id === id); if (i < 0) return; const k = hs.furn[i].k; hs.furn.splice(i, 1); hs.stash ||= {}; hs.stash[k] = (hs.stash[k] || 0) + 1; audio.sfx('unequip'); refreshHome(); emitUI(); };
api.buyHouse = (hid: string) => { const H = HOUSES[hid], hs = houseState(hid); if (hs.owned) return; if (S.p.gold < H.price) { toast('Not enough gold.', 'error'); audio.sfx('error'); return; } S.p.gold -= H.price; hs.owned = true; hs.furn = [{ id: hs.nid++, k: 'bed', x: -H.w / 2 + 2, z: -H.d / 2 + 2, r: 0 }, { id: hs.nid++, k: 'chest', x: H.w / 2 - 2, z: -H.d / 2 + 1.2, r: 0 }, { id: hs.nid++, k: 'table', x: 0, z: 0, r: 0 }, { id: hs.nid++, k: 'chair', x: -1.4, z: 0, r: Math.PI / 2 }, { id: hs.nid++, k: 'lamp', x: H.w / 2 - 1, z: H.d / 2 - 3, r: 0 }]; toast(`You now own ${H.name}! A bed, chest, table, chair and lamp were delivered.`, 'unlock'); audio.sfx('unlock'); saveGame('auto', true); emitUI(); };
api.upgradeHouse = (hid: string) => { const H = HOUSES[hid], hs = houseState(hid); if (hs.level >= 3) return; const cost = Math.round(H.price * 0.5 * hs.level); if (S.p.gold < cost) { toast('Not enough gold.', 'error'); audio.sfx('error'); return; } S.p.gold -= cost; hs.level++; toast(`${H.name} upgraded to level ${hs.level}: larger rooms, more furniture slots.`, 'unlock'); audio.sfx('unlock'); if (interior && houseId === hid) { const P = G.player; const door = ST.doors.find((d) => d.houseId === hid); leaveInterior(true); P.ret = V3(door!.x, 0, door!.z); enterInterior('home', { houseId: hid, door }); } emitUI(); };
api.storeItem = (hid: string, id: string, n: number, toHouse: boolean) => { const hs = houseState(hid); if (toHouse) { if (count(id) < n) return; removeItem(id, n); hs.storage[id] = (hs.storage[id] || 0) + n; } else { if ((hs.storage[id] || 0) < n) return; hs.storage[id] -= n; if (hs.storage[id] <= 0) delete hs.storage[id]; addItem(id, n, true); } audio.sfx('pickup'); emitUI(); };
api.currentHouse = () => houseId;

function runePress(i: number) { if (S.flags['rune' + i]) { toast('The rune is already awake.', 'info'); return; } S.flags['rune' + i] = true; audio.sfx('spell_aether'); doAct('interact', 0.8); const gl = interior!.meshes['gl' + i]; if (gl) (gl.material as any).emissiveIntensity = 2.5; toast(`Rune ${Object.keys(S.flags).filter((k) => /^rune\d$/.test(k)).length}/3 awakened.`, 'discover'); if ([0, 1, 2].every((k) => S.flags['rune' + k])) { S.flags.cave_open = true; audio.sfx('door'); toast('A grinding sound echoes from the boss chamber… a hidden vault has opened!', 'unlock'); interior!.meshes.secretDoor.visible = false; } }
function mineInterior(it: any) { const id = 'ore_' + it.data.id; if (S.flags[id] && Date.now() - S.flags[id] < 240000) { toast('This vein is depleted for now.', 'info'); return; } S.flags[id] = Date.now(); doAct('work', 1); audio.sfx('craft'); const n = 1 + (Math.random() < 0.5 ? 1 : 0); const pick = Math.random(); const item = pick < 0.6 ? 'iron_ore' : pick < 0.85 ? 'coal' : S.p.prof.mining.lvl >= 3 ? 'silver_ore' : 'iron_ore'; addItem(item, n); questEvent('gather', item, undefined, n); profXp('mining', 8); }
function travel(id: string) {
  const P = G.player; if (P.combat) { toast('You cannot fast travel during combat.', 'error'); return; } if (P.inside) { toast('Leave the building first.', 'error'); return; } const poi = POIS.find((p) => p.id === id); if (!poi || !S.discovered[id]) return; const cost = 10; if (S.p.gold < cost) { toast('Fast travel costs 10 gold.', 'error'); return; } S.p.gold -= cost;
  const a = ST.anchors[id]; let x = poi.x + 4, z = poi.z + 4; if (a?.plaza) { x = a.plaza.x + 3; z = a.plaza.z + 3; } else if (a?.x !== undefined) { x = a.x + 2; z = a.z + 2; } fade(); setTimeout(() => { P.pos.set(x, groundFull(x, z, 999) + 0.2, z); P.vel.set(0, 0, 0); if (P.mounted) dismount(); }, 450); S.ui.codex = null; toast(`Travelled to ${poi.name}.`, 'info'); audio.sfx('portal'); emitUI();
}
api.travel = travel;

// =============== MOUNTS
function toggleMount() {
  const P = G.player; if (P.mounted) return dismount(); if (P.inside) { toast('You cannot ride indoors.', 'error'); return; } const key = S.p.mount; if (!S.p.mounts.includes(key)) { toast('Choose a mount in the Mounts tab.', 'error'); return; }
  const spec: any = ({ horse: { ...ANIMALS.horse, col: '#7a4a2a' }, warhorse: { ...ANIMALS.horse, col: '#3a3a42', belly: '#555a64', bulky: true, mane: true }, dire_wolf: { ...ANIMALS.wolf, len: 2.0, h: 1.2, col: '#3a3a40', belly: '#55555c', bulky: false }, glimmerstag: { ...ANIMALS.aether_stag }, starmare: { ...ANIMALS.horse, col: '#e8e4ff', belly: '#f4f0ff', glow: '#c9a2ff' } } as any)[key];
  const creature = buildCreature(spec); const grp = new THREE.Group(); grp.add(creature.group); grp.position.copy(P.pos); G.world.add(grp); creature.saddle.add(P.rig.group); P.rig.group.position.set(0, 0.0, 0); P.rig.group.scale.divideScalar(1); P.mounted = { key, creature, grp, speed: MOUNTS[key].speed, yaw: P.visYaw }; audio.sfx('mount'); setTimeout(() => audio.sfx('whinny'), 150); hint('mount', 'Press R to dismount. Mounts are faster, and your companions keep up.');
}
function dismount() { const P = G.player, m = P.mounted; if (!m) return; m.grp.parent?.remove(m.grp); (P.inside ? G.intGroup : G.world).add(P.rig.group); P.mounted = null; P.rig.group.rotation.set(0, 0, 0); P.pos.y = groundFull(P.pos.x, P.pos.z, 99) + 0.1; audio.sfx('mount'); }
api.setMount = (k: string) => { S.p.mount = k; if (G.player?.mounted) { dismount(); toggleMount(); } emitUI(); };
api.summon = toggleMount;

// =============== MAP IMAGE
function buildMapImage() {
  const n = 260, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d')!; const img = x.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const wx = -HALF + (i + 0.5) * (HALF * 2 / n), wz = -HALF + (j + 0.5) * (HALF * 2 / n); const h = groundAt(wx, wz), sh = clamp(1 + (groundAt(wx - 3, wz - 3) - groundAt(wx + 3, wz + 3)) * 0.06, 0.6, 1.4); let col = [92, 140, 70]; const b = biomeAt(wx, wz); if (h < 0) col = [38, 92, 130]; else if (h < 1.4) col = [214, 198, 144]; else if (b === 'forest') col = [58, 104, 52]; else if (b === 'mountain') col = [128, 124, 116]; else if (b === 'snow') col = [240, 244, 248]; else if (b === 'grove') col = [80, 170, 150]; const k = (j * n + i) * 4; img.data[k] = clamp(col[0] * sh, 0, 255); img.data[k + 1] = clamp(col[1] * sh, 0, 255); img.data[k + 2] = clamp(col[2] * sh, 0, 255); img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0); x.strokeStyle = 'rgba(70,160,200,0.9)'; x.lineWidth = 2; x.beginPath(); riverPts.forEach((p, i) => { const px = (p.x + HALF) / (HALF * 2) * n, pz = (p.z + HALF) / (HALF * 2) * n; i ? x.lineTo(px, pz) : x.moveTo(px, pz); }); x.stroke(); G.mapURL = c.toDataURL(); S.ui.mapURL = G.mapURL;
}
api.mapSize = HALF * 2; api.playerPos = () => G.player ? { x: G.player.pos.x, z: G.player.pos.z, yaw: G.cam.yaw } : { x: 0, z: 0, yaw: 0 };
api.applyGraphics = () => { if (G.renderer) applyGraphics(); };
api.respawn = respawn; api.stations = () => S.hud.stations || [];
api.getNpcs = () => G.npcs;

// =============== MAIN LOOP
function loop(now: number) {
  if (!running) return; raf = requestAnimationFrame(loop); let dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000)); lastT = now; if (!G.renderer) return; G.dt = dt;
  readPad(dt); const paused = S.ui.pause && net.status === 'offline'; if (!paused) { G.t += dt; update(dt); } else { G.camera.updateMatrixWorld(); }
  S.hud.fps = Math.round(S.hud.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05); G.renderer.render(G.scene, G.camera);
}
function update(dt: number) {
  const P = G.player, W = S.world; W.clock += dt; setWind(G.t);
  // time
  if (net.status !== 'joined') { W.time += dt * 0.025; if (W.time >= 24) { W.time -= 24; W.day++; toast(`Day ${W.day} — ${SEASONS[season()]}`, 'info'); } }
  S.hud.time = `${String(Math.floor(W.time)).padStart(2, '0')}:${String(Math.floor((W.time % 1) * 60)).padStart(2, '0')}`;
  updateWeather(dt); updateSky(dt); updateTorches(dt); updatePrecip(dt); updateParticles(dt); updateFloats(dt);
  if (G.waterTex) { G.waterTex.offset.x += dt * 0.004; G.waterTex.offset.y += dt * 0.003; } if (G.rivers) G.rivers.tex.offset.y -= dt * 0.55;
  playerUpdate(dt); updateNpcs(dt); if (P.inside) { updateInteriorNpcs(intNpcs, dt); interior!.update?.(dt, G.t); }
  updateFoes(dt); updateAmbient(dt); updateCompanions(dt); updateProjectiles(dt); updateRemotes(dt); updateFishing(dt); updateFarm(); net.sendState(dt);
  for (let i = G.fxList.length - 1; i >= 0; i--) { const f = G.fxList[i]; f.t += dt; f.update(Math.min(1, f.t / f.dur)); if (f.t >= f.dur) { f.done?.(); G.fxList.splice(i, 1); } }
  // banners / props / shards
  ST.banners.forEach((b, i) => { const a = b.geometry.attributes.position; const base = (b.userData.base ||= (a.array as Float32Array).slice()); for (let k = 0; k < a.count; k++) { const x = base[k * 3], y = base[k * 3 + 1]; (a.array as Float32Array)[k * 3 + 2] = Math.sin(G.t * 3 + x * 2 + y * 0.6 + i) * 0.12 * (1 - (y + 3) / 6.5) * (1 + (G.weather.k > 0.5 ? 1.5 : 0)); } a.needsUpdate = true; });
  (G.shards || []).forEach((m: any) => { m.rotation.y += dt; m.position.y = 1.7 + Math.sin(G.t * 2) * 0.12; }); (G.floatPages || []).forEach((m: any, i: number) => { m.rotation.y += dt * 0.8; m.position.y += Math.sin(G.t * 2 + i) * 0.002; });
  const portal = ST.anchors.portal; if (portal) { portal.ring.rotation.z += dt * 0.6; (portal.mesh.material as any).opacity = 0.6 + Math.sin(G.t * 3) * 0.2; }
  ST.updrafts.forEach((u: any) => { if (u.top > 0) { u.mesh.material.opacity = 0.14 + Math.sin(G.t * 2 + u.x) * 0.04; if (Math.hypot(u.x - P.pos.x, u.z - P.pos.z) < 40 && Math.random() < 0.4) emit('spark', u.x + (Math.random() - 0.5) * u.r * 1.4, groundAt(u.x, u.z) + Math.random() * 6, u.z + (Math.random() - 0.5) * u.r * 1.4, '#bff4ff', 1, 0.5, 1.2, -8); } });
  cameraUpdate(dt);
  // slow systems
  regT -= dt; if (regT <= 0) { regT = 0.5; regionUpdate(); }
  ambT -= dt; if (ambT <= 0) { ambT = 0.5; ambienceUpdate(); }
  hudT -= dt; if (hudT <= 0) { hudT = 0.1; hudUpdate(); } saveT += dt; if (saveT > 90 && S.settings.autosave && !P.combat && !P.dead) { saveT = 0; saveGame('auto', true); }
  pickT -= dt; cullT -= dt; if (cullT <= 0 && !P.inside) { cullT = 0.3; const vd = cfg().vegDist; for (const k in G.veg) cullChunks(G.veg[k], P.pos.x, P.pos.z, k === 'grass' || k.startsWith('flower') ? vd * 0.45 : k === 'mush' || k === 'log' ? vd * 0.5 : vd); }
}

function playerUpdate(dt: number) {
  const P = G.player, d = derived(), inUI = uiOpen(), p = S.p;
  // timers
  P.atkCd -= dt; P.comboT -= dt; P.invul -= dt; P.hurtT -= dt; P.combatT -= dt; P.joy -= dt; S.hud.hurt = Math.max(0, (S.hud.hurt || 0) - dt * 2); P.shake = Math.max(0, (P.shake || 0) - dt);
  for (const k in P.cd) if (P.cd[k] > 0) P.cd[k] -= dt; for (const k in P.buffs) if (P.buffs[k] > 0) P.buffs[k] -= dt; if (P.buffs.ward <= 0) P.ward = 0;
  if (P.pendingHit) { P.pendingHit.t -= dt; if (P.pendingHit.t <= 0) { resolveHit(P.pendingHit); P.pendingHit = null; } }
  if (P.act !== 'none') { P.actT += dt; if (P.actT >= P.actDur && P.act !== 'dead') { P.act = 'none'; if (P.netAct !== 'none') P.netAct = 'none'; } }
  // input
  let ix = 0, iz = 0; const locked = inUI || P.dead || !!P.sit || P.act === 'pickup' || P.act === 'read';
  if (!locked) { if (down('forward')) iz += 1; if (down('back')) iz -= 1; if (down('right')) ix += 1; if (down('left')) ix -= 1; if (pad.on && S.hud.input === 'pad') { ix += pad.lx; iz -= pad.ly; } ix = clamp(ix, -1, 1); iz = clamp(iz, -1, 1); }
  // camera look
  const sens = 0.0022 * S.settings.sens; if (!inUI) { G.cam.yaw -= mouse.dx * sens; G.cam.pitch += mouse.dy * sens * (S.settings.invertY ? -1 : 1); if (pad.on && S.hud.input === 'pad') { G.cam.yaw -= pad.rx * 2.6 * S.settings.sens * dt; G.cam.pitch += pad.ry * 1.8 * S.settings.sens * dt * (S.settings.invertY ? -1 : 1); } const ar = 1.9 * dt; if (keys.has('ArrowLeft')) G.cam.yaw += ar; if (keys.has('ArrowRight')) G.cam.yaw -= ar; if (keys.has('ArrowUp')) G.cam.pitch -= ar * 0.7; if (keys.has('ArrowDown')) G.cam.pitch += ar * 0.7; } mouse.dx = 0; mouse.dy = 0; G.cam.pitch = clamp(G.cam.pitch, -0.6, 1.3);
  const cy = G.cam.yaw; const fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy);
  let mx = rx * ix + fx * iz, mz = rz * ix + fz * iz; const ml = Math.hypot(mx, mz); const mag = Math.min(1, ml); if (ml > 0.01) { mx /= ml; mz /= ml; } act.fx = mx * mag; act.fz = mz * mag;
  if (!inUI && !P.dead) { if (pressed.has('padAttack') || mouse.b.has(0) || down('attack')) { if (pressed.has('padAttack') || mouse.locked || !mouse.b.has(0) ? true : true) playerAttack(); } P.blocking = (down('block') || (pad.on && S.hud.input === 'pad' && pad.btn[6])) && !P.rolling && !P.mounted && S.p.sta > 0; } else P.blocking = false; pressed.clear();
  if (P.blocking) P.blockTimer = (P.blockTimer || 0) + dt; else P.blockTimer = 0;
  if (P.counterBuff > 0) P.counterBuff = Math.max(0, P.counterBuff - dt);
  const wantSprint = !locked && (down('sprint') || (pad.on && pad.btn[5] && S.hud.input === 'pad')) && mag > 0.1 && p.sta > 4 && !P.blocking; P.crouch = !locked && !P.mounted && (down('crouch') || !!P.crouchToggle) && !P.swim;
  if (P.crouch) hint('sneak', 'Crouching makes you harder to detect — Rogues are nearly invisible.');
  // speeds
  const base = P.mounted ? 6.3 * P.mounted.speed : 5.4; let spd = P.crouch ? 2.2 : wantSprint ? (P.mounted ? base * 1.15 : 8.4) : (mag < 0.55 && pad.on && S.hud.input === 'pad' ? 3.0 : base); spd *= d.speed * (d.over ? 0.75 : 1) * (P.blocking ? 0.45 : 1) * (P.act === 'attack' || P.act === 'cast' ? 0.55 : 1) * (P.swim ? 0.5 : 1);
  if (P.rolling > 0) { P.rolling -= dt; const dir = P.rollDir; P.vel.x = dir.x * 11; P.vel.z = dir.z * 11; } else {
    const tx = mx * mag * spd, tz = mz * mag * spd; if (P.glide) { const gd = mag > 0.1 ? V3(mx, 0, mz) : V3(fx, 0, fz); P.vel.x += (gd.x * 12 - P.vel.x) * (1 - Math.exp(-3 * dt)); P.vel.z += (gd.z * 12 - P.vel.z) * (1 - Math.exp(-3 * dt)); } else { const k = P.grounded || P.swim ? 11 : 2.6; P.vel.x += (tx - P.vel.x) * (1 - Math.exp(-k * dt)); P.vel.z += (tz - P.vel.z) * (1 - Math.exp(-k * dt)); } }
  // facing
  const hsp = Math.hypot(P.vel.x, P.vel.z); P.speedNow = hsp;
  if (P.sit) { P.vel.set(0, 0, 0); } else if (P.act === 'attack' || P.act === 'cast' || P.blocking) { /* faced camera */ if (P.blocking) { P.visYaw = turn(P.visYaw, Math.atan2(fx, fz), 14, dt); } } else if (S.ui.dialogue) { const n = S.ui.dialogue.npc; if (n?.pos) P.visYaw = turn(P.visYaw, Math.atan2(n.pos.x - P.pos.x, n.pos.z - P.pos.z), 6, dt); } else if (hsp > 0.4 && P.rolling <= 0) P.visYaw = turn(P.visYaw, Math.atan2(P.vel.x, P.vel.z), 12, dt);
  // gravity & vertical
  const inside = P.inside; const gnd = (x: number, z: number, y: number) => (inside ? INT_Y + inside.ground(x, z) : groundFull(x, z, y)); const gy0 = gnd(P.pos.x, P.pos.z, P.pos.y);
  P.swim = !inside && !P.mounted && gy0 < -0.45 && P.pos.y < 0.2; if (P.swim) { if (!P.wasSwim) { audio.sfx('splash'); emit('spark', P.pos.x, 0.2, P.pos.z, '#bfe8ff', 25, 4, 0.7, 10); } }
  P.wasSwim = P.swim; let sleepy = false; void sleepy;
  if (P.swim) { P.vel.y = 0; P.pos.y += (-0.55 + Math.sin(G.t * 2) * 0.05 - P.pos.y) * Math.min(1, dt * 6); P.glide = false; P.grounded = false; P.airT = 0; }
  else { if (P.glide) { P.vel.y = Math.max(P.vel.y - 6 * dt, -2.3); p.sta = Math.max(0, p.sta - 3.5 * dt); P.staDelay = 0.6; if (p.sta <= 0) P.glide = false; } else { const g = P.mounted?.key === 'starmare' ? 14 : 24; P.vel.y -= g * dt; if (P.mounted?.key === 'starmare' && P.vel.y < -3.5) P.vel.y = -3.5; } for (const u of ST.updrafts) { if (u.top > 0 && !inside && Math.hypot(u.x - P.pos.x, u.z - P.pos.z) < u.r && P.pos.y < u.top) { P.vel.y = Math.min(P.vel.y + 46 * dt, 11); P.grounded = false; if (!P.glideHint) { P.glideHint = true; hint('updraft', 'Aether updraft! Rise, then press Space to glide toward the floating isle.'); } } } }
  // horizontal move with collision
  if (!P.sit) { let nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.z * dt; const rad = P.mounted ? 0.8 : 0.42;
    if (inside) { if (!inside.walk(nx, P.pos.z)) nx = P.pos.x; if (!inside.walk(nx, nz)) nz = P.pos.z; [nx, nz] = collide(nx, nz, rad, inside); } else { [nx, nz] = collide(nx, nz, rad, null); nx = clamp(nx, -HALF + 4, HALF - 4); nz = clamp(nz, -HALF + 4, HALF - 4); const ng = groundFull(nx, nz, P.pos.y + 0.5); const step = ng - P.pos.y; const dd = Math.hypot(nx - P.pos.x, nz - P.pos.z); if (P.grounded && dd > 0.001 && step / dd > 1.45 && step > 0.5 && !P.swim) { nx = P.pos.x; nz = P.pos.z; P.vel.x *= 0.2; P.vel.z *= 0.2; } }
    P.pos.x = nx; P.pos.z = nz; }
  if (!P.swim && !P.sit) { P.pos.y += P.vel.y * dt; const g = gnd(P.pos.x, P.pos.z, P.pos.y + 0.6); if (P.pos.y <= g + 0.02 && P.vel.y <= 0.01) { if (!P.grounded && P.vel.y < -4) { audio.sfx('land', clamp(-P.vel.y / 14, 0.3, 1.4)); P.rig.land = clamp(-P.vel.y / 12, 0.2, 1); emit('smoke', P.pos.x, g + 0.1, P.pos.z, '#8a7a5a', 4, 1, 0.8, 0); if (P.vel.y < -19 && !P.glide) { const dmg = (-P.vel.y - 19) * 6; G.hurtPlayer(dmg, null, true); } } P.pos.y = g; P.vel.y = 0; P.grounded = true; P.glide = false; P.airT = 0; P.coyote = 0.12; } else if (P.grounded && P.pos.y - g < 0.35 && P.vel.y <= 0.01) { P.pos.y = g; P.vel.y = 0; } else { if (P.grounded) P.coyote = 0.1; P.grounded = false; P.airT += dt; } P.coyote -= dt; }
  // resources
  if (!P.dead) { p.mana = Math.min(d.maxMana, p.mana + (2.2 + p.attrs.wis * 0.25) * d.regen * dt * (P.combat ? 0.6 : 1)); if (!wantSprint && !P.glide && !P.blocking) { P.staDelay -= dt; if (P.staDelay <= 0) p.sta = Math.min(d.maxSta, p.sta + 22 * dt * d.regen); } else if (wantSprint) { p.sta = Math.max(0, p.sta - 14 * dt); P.staDelay = 0.8; } if (!P.combat) p.hp = Math.min(d.maxHp, p.hp + 0.6 * d.regen * dt + d.maxHp * 0.002 * dt); P.hpPct = p.hp / d.maxHp; }
  // mount follow
  const m = P.mounted; if (m) { m.grp.position.set(P.pos.x, P.pos.y - (inside ? INT_Y : 0), P.pos.z); m.yaw = turn(m.yaw, P.visYaw, 6, dt); m.grp.rotation.y = m.yaw; m.creature.update(dt, { speed: hsp, mode: hsp > 0.3 ? 'move' : 'idle' }); P.rig.group.position.set(0, 0.0, 0); P.rig.root.rotation.y = 0; }
  // footsteps
  if (P.grounded && hsp > 1 && !P.sit && P.rolling <= 0) { P.stepAcc += hsp * dt; const stride = P.mounted ? 2.1 : hsp > 6.5 ? 2.4 : 1.7; if (P.stepAcc > stride) { P.stepAcc = 0; const h = P.pos.y; const surf = inside ? 'step_wood' : P.swim ? 'step_water' : (h > 50 || (season() === 3 && h > 1)) ? 'step_snow' : h < 1.7 ? 'step_sand' : groundDistRoad(P.pos.x, P.pos.z) < 3 ? 'step_stone' : 'step_grass'; audio.sfx(surf, (P.crouch ? 0.4 : 1) * (P.mounted ? 1.5 : 1)); } } else if (P.swim && hsp > 0.8) { P.stepAcc += hsp * dt; if (P.stepAcc > 1.8) { P.stepAcc = 0; audio.sfx('step_water', 0.7); } }
  // rig drive
  if (!m) { P.rig.group.position.set(P.pos.x, P.pos.y - (inside ? INT_Y : 0) + (P.sit ? 0 : 0) + (P.act === 'dead' ? 0.12 : 0), P.pos.z); P.rig.root.rotation.y = P.visYaw; }
  const air = P.swim ? 'swim' : m ? 'ride' : P.glide ? 'glide' : !P.grounded ? (P.vel.y > 0.5 ? 'rise' : 'fall') : 'ground'; P.airState = air;
  let near: any = null, nd = 7; if (!inUI || S.ui.dialogue) { for (const n of (inside ? intNpcs : G.npcs)) { if (n.hidden) continue; const dd = Math.hypot(n.pos.x - P.pos.x, n.pos.z - P.pos.z); if (dd < nd) { nd = dd; near = n; } } }
  const targetLook = near && hsp < 0.5 ? clamp(((Math.atan2(near.pos.x - P.pos.x, near.pos.z - P.pos.z) - P.visYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI, -0.9, 0.9) : 0; P.lookYaw += (targetLook - P.lookYaw) * Math.min(1, dt * 4);
  const rigAct = P.blocking ? 'block' : P.act !== 'none' ? P.act : S.ui.dialogue ? 'talk' : 'none'; P.netAct = rigAct;
  P.rig.update(dt, { speed: m ? 0 : hsp, mountSpeed: hsp, act: rigAct, at: P.actDur > 0 ? Math.min(1, P.actT / Math.max(0.01, P.actDur)) : 0, atkType: P.atkType, ranged: P.ranged && P.act === 'attack', crouch: P.crouch, sit: !!P.sit, air, lookYaw: P.lookYaw, emotion: P.hurtT > 0 ? 'surprised' : P.combatT > 0 ? 'angry' : P.joy > 0 ? 'happy' : 'neutral', talkAmp: 0.35, talking: !!S.ui.dialogue && S.hud.speaking === 'player' });
  // companion look & misc
  if (P.ward > 0 && Math.random() < 0.2) emit('spark', P.pos.x + (Math.random() - 0.5), P.pos.y + 1 + Math.random(), P.pos.z + (Math.random() - 0.5), '#ffd86a', 1, 0.5, 0.6, 0);
  if (P.buffs.rage > 0 && Math.random() < 0.2) emit('spark', P.pos.x, P.pos.y + 1.5, P.pos.z, '#ff5a3a', 1, 1, 0.5, -1);
  // pressing jump hold for glide etc handled via events; held jump when swimming to surface not needed
  // interaction hint
  const it = P.dead ? null : nearestInter(); const lbl = it ? (it.kind === 'door' ? (it.door.houseId ? (houseState(it.door.houseId).owned ? `Enter your ${HOUSES[it.door.houseId].name}` : `${HOUSES[it.door.houseId].name} — for sale (${HOUSES[it.door.houseId].price}g)`) : it.door.label) : it.label) : null; if ((S.hud.nearHint?.label || null) !== lbl) { S.hud.nearHint = lbl ? { label: lbl, kind: it.kind } : null; emitHud(); }
  // stations
  if (pickT <= 0) { pickT = 0.4; const st = new Set<string>(); if (inside) { homeItems.concat(inside.items as any[]).forEach((q: any) => { if (q.kind === 'station' && Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < 4.5) st.add(q.data.st); }); } else if (ST.fires.some((f) => Math.hypot(f.x - P.pos.x, f.z - P.pos.z) < 4)) st.add('campfire'); S.hud.stations = [...st]; if (st.has('kitchen')) st.add('campfire'); S.hud.stations = [...st]; }
}
const groundDistRoad = (x: number, z: number) => { let m = 99; for (const r of (ST as any).roadsRef || []) void r; return biomeAt(x, z) === 'grass' && Math.hypot(x, z + 40) < 80 ? 1 : m; };

function cameraUpdate(dt: number) {
  const P = G.player, cam = G.camera, C = G.cam; let tx = P.pos.x, ty = P.pos.y + (P.crouch ? 1.1 : 1.55) + (P.mounted ? 0.9 : 0), tz = P.pos.z; let yaw = C.yaw, pitch = C.pitch, dist = C.dist + (P.mounted ? 1.8 : 0) + (P.glide ? 1.5 : 0);
  if (S.ui.dialogue?.npc?.pos) { const n = S.ui.dialogue.npc; const dx = n.pos.x - P.pos.x, dz = n.pos.z - P.pos.z; C.yaw = turn(C.yaw, Math.atan2(-dx, -dz) + 0.45, 3, dt); C.pitch += (0.1 - C.pitch) * Math.min(1, dt * 3); C.dist += (3.0 - C.dist) * Math.min(1, dt * 3); yaw = C.yaw; pitch = C.pitch; dist = C.dist; tx = (P.pos.x + n.pos.x) / 2; tz = (P.pos.z + n.pos.z) / 2; ty = P.pos.y + 1.55; }
  else if (C.dist < 3.2 && !P.inside) C.dist += (5 - C.dist) * Math.min(1, dt * 2);
  if (P.inside) dist = Math.min(dist, 8); const shake = P.shake > 0 ? (Math.random() - 0.5) * P.shake * 0.5 : 0;
  const cp = Math.cos(pitch), sp = Math.sin(pitch); const px = tx + Math.sin(yaw) * cp * dist + shake, py = ty + sp * dist + shake, pz = tz + Math.cos(yaw) * cp * dist;
  let gy = P.inside ? INT_Y + 0.5 : groundFull(px, pz, 999) + 0.6; if (P.swim) gy = 0.4; const fy = Math.max(py, gy);
  if (!G.camInit) { cam.position.set(px, fy, pz); G.camInit = true; } else { const k = 1 - Math.exp(-22 * dt); cam.position.x += (px - cam.position.x) * k; cam.position.y += (fy - cam.position.y) * k; cam.position.z += (pz - cam.position.z) * k; }
  cam.lookAt(tx, ty + (P.inside ? -0.2 : 0.1), tz);
  const fov = (cfg().fov || 70) + (S.settings.fovAdd || 0) + (P.speedNow > 7 ? 4 : 0) + (P.glide ? 6 : 0); cam.fov += (fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix();
  S.hud.compass = C.yaw;
}
let lastRegion = '';
function regionUpdate() {
  const P = G.player, p = P.pos; if (P.inside) { S.hud.region = interior ? ({ tavern: 'Tavern', smith: 'Smithy', shop: 'Shop', alch: 'Alchemist', library: 'Archive', hall: 'Great Hall', home: houseId ? HOUSES[houseId].name : 'Home', cave: 'Hollowdeep Mine', rift: 'The Hollow Rift' } as any)[(P.insideKey || '').split(/[@:]/)[0]] || 'Interior' : ''; S.hud.inside = true; return; } S.hud.inside = false;
  let name = ''; for (const poi of POIS) { if (poi.hidden || !poi.r) continue; const dd = Math.hypot(poi.x - p.x, poi.z - p.z); if (dd < poi.r + 6 && (poi.type !== 'sky' || p.y > 20)) { name = poi.name; } if (dd < poi.r + 12 && !S.discovered[poi.id] && !poi.always) { discover(poi); } else if (poi.always && dd < poi.r && !S.discovered[poi.id]) discover(poi); }
  if (!name) { if (p.y > 28) name = 'The Sundered Sky'; else { const b = biomeAt(p.x, p.z); name = ({ forest: 'The Thornwood', mountain: 'Kharun Highlands', snow: 'Frostpeak Heights', grass: 'Valdorian Plains', grove: 'Glimmer Grove', coast: 'Saltmere Coast' } as any)[b] || 'The Wilds'; if (p.y < -0.3) name = 'Open Waters'; } }
  S.hud.region = name; if (name !== lastRegion) { lastRegion = name; S.hud.banner = { name, t: Date.now() }; emitHud(); }
}
function discover(poi: any) { S.discovered[poi.id] = true; if (!poi.always) { toast(`Discovered: ${poi.name}`, 'discover'); gainXp(poi.xp || 40); } questEvent('reach', poi.id); checkHave(); emitUI(); }
function ambienceUpdate() {
  const P = G.player, p = P.pos, w = G.weather, t = S.world.time, night = t < 5.5 || t > 19.5; const inside = P.inside; const type = (P.insideKey || '').split(/[@:]/)[0];
  const region = S.hud.region || ''; const town = /Highcrown|Thornwick|Frostgate|Saltmere/.test(region); const b = inside ? 'in' : biomeAt(p.x, p.z);
  let nearWater = 0; if (!inside) { const g = groundAt(p.x, p.z); if (g < 0.3) nearWater = 1; else { for (let i = 0; i < riverPts.length; i += 2) { const q = riverPts[i]; const dd = Math.hypot(q.x - p.x, q.z - p.z); if (dd < 14) nearWater = Math.max(nearWater, 1 - dd / 14); } if (p.x > 200) nearWater = Math.max(nearWater, 0.6); if (Math.hypot(p.x - 60, p.z + 150) < 25) nearWater = 1; } }
  const hi = clamp((p.y - 5) / 60, 0, 1);
  audio.setAmbient({ wind: inside ? (type === 'rift' ? 0.7 : 0.05) : 0.18 + hi * 0.7 + w.k * 0.3 + (b === 'mountain' || b === 'snow' ? 0.3 : 0) + (P.glide ? 0.5 : 0), rain: inside ? 0.12 * G.rainAmt : G.rainAmt, water: nearWater * (inside ? 0 : 1), crowd: inside ? (type === 'tavern' ? 0.9 : type === 'hall' ? 0.3 : 0.1) : town && !night ? 0.55 : town ? 0.2 : 0, birds: !inside && !night && w.k < 0.6 && (b === 'forest' || b === 'grass' || b === 'grove') ? 0.8 : 0, crickets: !inside && night && w.type !== 'rain' && b !== 'mountain' ? 0.8 : 0, cave: type === 'cave' ? 1 : 0, fire: inside ? (type === 'smith' ? 0.9 : type === 'tavern' || type === 'hall' ? 0.6 : 0.3) : ST.fires.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < 10) ? 0.7 : 0, thunder: w.type === 'storm' && !inside ? 1 : 0 });
  let mood = 'day'; if (S.screen !== 'game') mood = 'menu'; else if (inside) mood = ({ tavern: 'village', smith: 'village', shop: 'village', alch: 'village', library: 'story', hall: 'story', home: 'village', cave: 'cave', rift: 'rift' } as any)[type] || 'village'; else if (P.combat) mood = 'combat'; else { const poi = POIS.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < (q.r || 0) + 4 && S.discovered[q.id]); const st = SETTLEMENTS.find((s) => Math.hypot(s.x - p.x, s.z - p.z) < s.flat + 10); if (st) mood = st.music; else if (poi && (poi.type === 'ruin' || poi.type === 'sky' || poi.type === 'magic')) mood = 'ruin'; else if (b === 'mountain' || b === 'snow') mood = 'mountain'; else if (b === 'coast') mood = 'coast'; else mood = night ? 'night' : 'day'; if (night && (mood === 'city' || mood === 'village')) mood = 'night'; }
  audio.setMood(mood);
  // tracking reveal
}
function hudUpdate() {
  const P = G.player, d = derived(), p = S.p; const h = S.hud; h.hp = p.hp; h.maxHp = d.maxHp; h.mana = p.mana; h.maxMana = d.maxMana; h.sta = p.sta; h.maxSta = d.maxSta; h.mounted = !!P.mounted; h.glide = P.glide; h.cd = p.hotbar.map((id: string | null) => (id ? Math.max(0, P.cd[id] || 0) / (ABILITIES[id]?.cd || 1) : 0)); h.buffs = Object.entries(P.buffs).filter(([, v]: any) => v > 0).map(([k, v]: any) => ({ k, v: Math.ceil(v) })); h.tracking = P.buffs.track > 0; h.px = P.pos.x; h.pz = P.pos.z; h.py = P.pos.y; h.over = d.over; h.weight = Math.round(d.weight); h.cap = d.cap; h.players = net.count();
  if (h.tracking) h.tracked = G.enemies.filter((f: any) => !f.dead && Math.hypot(f.pos.x - P.pos.x, f.pos.z - P.pos.z) < 70 && !f.inside).slice(0, 40).map((f: any) => ({ x: f.pos.x, z: f.pos.z, hostile: !f.passive }));
  p.pos = p.pos || {}; emitHud();
  if (!G.hudStat) G.hudStat = 0; void QUESTS; void PROFS; void addCol; void slopeAt; void ensureRemote; void clampVitals; void bark;
}
