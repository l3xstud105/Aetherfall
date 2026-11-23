// Headless world-generation smoke test (no GL): npx esbuild tests/world.test.ts --bundle --platform=node --format=esm --outfile=tests/.w.mjs --external:react --external:peerjs
const noop: any = new Proxy(function () {}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : noop), apply: () => noop });
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => noop, toDataURL: () => '' }), getElementById: () => null };
(globalThis as any).localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; (globalThis as any).window = globalThis; (globalThis as any).innerWidth = 1280; (globalThis as any).innerHeight = 720; (globalThis as any).devicePixelRatio = 1;
import * as THREE from 'three';
import { CLASSES, ANIMALS, ENEMIES } from '../src/game/data';
import * as st from '../src/game/store';
import { makeTextures, initHeights, buildTerrain, buildRivers, buildVegetation, groundAt } from '../src/game/world';
import { defineRoads, buildSettlements, blocked, ST } from '../src/game/structures';
import { buildInterior } from '../src/game/interiors';
import { buildHumanoid, buildCreature, buildBird } from '../src/game/rigs';
import { G, initSky, initLights, initPrecip, initParticles, updateSky, updateWeather, updatePrecip, updateParticles, updateTorches, applyGraphics } from '../src/game/fx';
import * as A from '../src/game/actors';
import { HOUSES } from '../src/game/data';
const t0 = Date.now(); const lap = (m: string) => console.log(m.padEnd(28), ((Date.now() - t0) / 1000).toFixed(2) + 's');
st.newPlayer('T', 'mage', st.defaultLook());
const scene = new THREE.Scene(); G.scene = scene; G.world = new THREE.Group(); scene.add(G.world); G.intGroup = new THREE.Group(); scene.add(G.intGroup); G.camera = new THREE.PerspectiveCamera(70, 1.7, 0.1, 1000); G.birds = []; G.fish = []; G.frogs = []; G.fxList = [];
makeTextures(); initLights(scene, null as any); initSky(scene); initPrecip(scene); initParticles(scene); lap('textures+sky');
initHeights(); defineRoads(); buildTerrain(G.world); buildRivers(G.world); lap('terrain'); buildSettlements(G.world); lap('settlements (' + ST.colliders.length + ' colliders, ' + ST.doors.length + ' doors)');
G.veg = buildVegetation(G.world, (x: number, z: number, m: number) => blocked(x, z, m)); lap('vegetation'); let inst = 0; Object.values(G.veg).forEach((v: any) => v.chunks.forEach((c: any) => (inst += c.total))); console.log('  instances:', inst);
console.log('  ground checks:', groundAt(-150, 90).toFixed(1), groundAt(0, -40).toFixed(1), groundAt(110, -190).toFixed(1), groundAt(175, 50).toFixed(1), 'lake', groundAt(135, 112).toFixed(1));
['tavern', 'smith', 'shop', 'alch', 'library', 'hall', 'cave', 'rift', 'crypt', 'sunken_temple', 'fortress_undercroft', 'grotto'].forEach((t) => { const i = buildInterior(t, { npc: 'x', flags: {} }); if (!i.items.length || !i.spawn) throw new Error('interior ' + t); }); Object.keys(HOUSES).forEach((k) => buildInterior('home', { house: (HOUSES as any)[k], level: 3 })); lap('interiors');
CLASSES.forEach((c) => { const r = buildHumanoid(A.appearanceFor(st.defaultLook(), c.equip, c.id)); for (let i = 0; i < 30; i++) r.update(0.016, { speed: i * 0.3, act: ['attack', 'cast', 'block', 'roll', 'sit', 'talk', 'work', 'pickup', 'wave', 'dead', 'none'][i % 11], at: i / 30, air: ['ground', 'rise', 'fall', 'glide', 'swim', 'ride'][i % 6], crouch: i % 4 === 0, emotion: 'angry' }); });
Object.values(A.NPCDEFS).forEach((d: any) => { if (d.look) buildHumanoid(A.npcApp(d)).update(0.016, { act: 'talk' }); }); Object.keys(ANIMALS).forEach((k) => { const c = buildCreature(ANIMALS[k]); ['move', 'idle', 'graze', 'rest', 'alert', 'dead'].forEach((m) => c.update(0.016, { speed: 3, mode: m })); }); ['song', 'eagle', 'owl'].forEach((k) => buildBird(k).update(0.016, true)); lap('rigs');
const P: any = { pos: new THREE.Vector3(-150, 2, 95), vel: new THREE.Vector3(), inside: null, crouch: false, combat: false, combatT: 0, buffs: {}, dead: false, lastTarget: null, targetT: 0, hpPct: 1, yaw: 0, rig: null }; G.player = P; G.camera.position.set(-150, 5, 100);
A.spawnNpcs(); lap('npcs (' + G.npcs.length + ')'); A.populateWorld(); lap('wildlife+enemies (' + G.enemies.length + ' foes, ' + G.birds.length + ' birds)');
S_upd(); function S_upd() { const S = st.S; for (let f = 0; f < 120; f++) { G.t += 0.05; S.world.time = (f / 120) * 24; updateWeather(0.05); updateSky(0.05); updatePrecip(0.05); updateParticles(0.05); updateTorches(0.05); A.updateNpcs(0.05); A.updateFoes(0.05); A.updateAmbient(0.05); A.updateCompanions(0.05); P.pos.x += 0.2; } }
lap('120 frames of simulation'); st.recruit('lyra'); st.recruit('iselle'); A.syncCompanions(); for (let f = 0; f < 20; f++) A.updateCompanions(0.05); console.log('  companions:', A.companions.length);
// teleport player through every settlement and simulate NPC schedules at several hours
for (const [x, z] of [[0, -30], [110, -185], [175, 50], [-150, 90]]) { P.pos.set(x, groundAt(x, z), z); for (const hr of [3, 9, 13, 19, 23]) { st.S.world.time = hr; for (let f = 0; f < 40; f++) { G.t += 0.05; A.updateNpcs(0.05); } } }
const vis = G.npcs.filter((n: any) => n.rig.group.visible).length; console.log('  npcs visible near player:', vis);
// enemy combat tick
const foe = G.enemies.find((f: any) => f.type === 'bandit'); P.pos.set(foe.pos.x + 3, foe.pos.y, foe.pos.z); G.hurtPlayer = () => {}; G.spawnProj = () => {}; for (let f = 0; f < 80; f++) { A.updateFoes(0.05); } console.log('  bandit aggro:', foe.aggro); A.damageFoe(foe, 9999); console.log('  bandit dead:', foe.dead, 'xp/level', st.S.p.level, 'kills', st.S.p.kills);
console.log('\nWORLD SMOKE TEST OK'); applyGraphics; (globalThis as any).process.exit(0);
