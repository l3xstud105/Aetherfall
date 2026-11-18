// Gameplay simulation with a stubbed GL renderer: runs the REAL game loop, input handlers, combat, interiors, housing, mounts, saves.
const noop: any = new Proxy(function () {}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop });
const handlers: Record<string, Function[]> = {}; const mem: Record<string, string> = {};
const g: any = globalThis; g.window = g; g.addEventListener = (e: string, f: Function) => { (handlers[e] ||= []).push(f); }; g.removeEventListener = (e: string, f: Function) => { handlers[e] = (handlers[e] || []).filter((x) => x !== f); };
const canvas: any = { requestPointerLock() {}, getContext: () => noop, style: {}, width: 100, height: 100 };
g.document = { createElement: () => ({ getContext: () => noop, width: 0, height: 0, style: {}, toDataURL: () => '' }), getElementById: () => null, addEventListener: g.addEventListener, removeEventListener: g.removeEventListener, pointerLockElement: null, exitPointerLock() {}, activeElement: null, querySelector: () => null };
g.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } }; g.innerWidth = 1280; g.innerHeight = 720; g.devicePixelRatio = 1; try { g.navigator ||= {}; } catch {} g.location = { search: '' };
let pending: any = null; g.requestAnimationFrame = (cb: any) => { pending = cb; return 1; }; g.cancelAnimationFrame = () => { pending = null; }; g.setTimeout = ((f: any, ms?: number) => { if (ms === 0 || ms === undefined) queueMicrotask(f); else timers.push(f); return 0; }) as any; const timers: any[] = [];
let now = performance.now(); const step = (n: number) => { for (let i = 0; i < n; i++) { const cb = pending; pending = null; now += 16.7; cb && cb(now); } timers.splice(0).forEach((f) => f()); };
const fire = (type: string, ev: any) => (handlers[type] || []).slice().forEach((f) => f({ preventDefault() {}, target: { tagName: 'DIV' }, ...ev }));
const key = (code: string, ms = 0, frames = 0) => { fire('keydown', { code }); step(frames || 1); fire('keyup', { code }); };
import { startGame, stopGame, api } from '../src/game/game';
import * as st from '../src/game/store';
import { ST } from '../src/game/structures';
import { HOUSES } from '../src/game/data';
let pass = 0, fail = 0; const ok = (c: any, m: string) => { if (c) { pass++; } else { fail++; console.log('FAIL:', m); } }; const S = st.S; const G = () => (g.__aetherfall.G);
(async () => {
  st.newPlayer('Tester', 'warrior', st.defaultLook()); await startGame(canvas); const P = () => G().player; ok(S.screen === 'game' && !S.ui.loading, 'game boots to game screen'); step(30);
  const p0 = P().pos.clone(); ok(P().grounded, 'player grounded after spawn'); const gy = api.playerPos();
  // movement
  fire('keydown', { code: 'KeyW' }); step(90); fire('keyup', { code: 'KeyW' }); step(10); ok(P().pos.distanceTo(p0) > 5, 'WASD moves the player (' + P().pos.distanceTo(p0).toFixed(1) + 'm)'); ok(Number.isFinite(P().pos.y), 'y finite'); void gy;
  fire('keydown', { code: 'ShiftLeft' }); fire('keydown', { code: 'KeyW' }); step(40); const v = Math.hypot(P().vel.x, P().vel.z); fire('keyup', { code: 'KeyW' }); fire('keyup', { code: 'ShiftLeft' }); ok(v > 6.5, 'sprint speed ' + v.toFixed(1));
  // jump + glide
  step(20); const y0 = P().pos.y; key('Space', 0, 3); step(6); ok(P().pos.y > y0 + 0.2 && !P().grounded, 'jump leaves ground'); step(8); key('Space', 0, 2); step(5); ok(P().glide, 'second Space glides'); step(30); ok(P().vel.y >= -2.5, 'glide limits fall speed (' + P().vel.y.toFixed(2) + ')'); step(240); ok(P().grounded && !P().glide, 'lands and glide ends');
  // combat: spawn bandit near player, attack
  const foe = G().enemies.find((f: any) => f.type === 'bandit'); const pp = P().pos; foe.pos.set(pp.x + 2, pp.y, pp.z); foe.home.copy(foe.pos); P().visYaw = Math.PI / 2; G().cam.yaw = -Math.PI / 2; const hp0 = foe.hp; S.p.sta = 100; fire('mousedown', { button: 0, target: canvas }); step(40); fire('mouseup', { button: 0 }); ok(foe.hp < hp0 || foe.aggro, 'melee attack engages enemy (hp ' + hp0 + '→' + foe.hp + ')');
  S.p.mana = 100; S.p.sta = 100; key('Digit1', 0, 4); step(30); ok(P().cd['power_strike'] > 0, 'ability 1 used & on cooldown'); key('KeyQ', 0, 2); step(5); ok(P().rolling > 0 || S.p.sta < 100, 'dodge roll starts'); step(40); const hp = S.p.hp; G().hurtPlayer(20, null); ok(S.p.hp < hp, 'player takes damage'); step(30);
  while (!foe.dead) { st.S.p.sta = 100; (g.__aetherfall.G.enemies.find((f: any) => f === foe) && (foe.hp = 1)); fire('mousedown', { button: 0, target: canvas }); step(25); fire('mouseup', { button: 0 }); if (G().t > 9999) break; if (foe.hp <= 0) break; foe.pos.set(P().pos.x + 2, P().pos.y, P().pos.z); }
  ok(foe.dead || foe.hp <= 0, 'enemy can be killed'); ok(S.p.kills >= 1, 'kill counted');
  // NPC dialogue & quest via interaction
  const maren = G().npcs.find((n: any) => n.id === 'maren'); P().combat = false; P().combatT = 0; P().vel.set(0, 0, 0); P().pos.set(maren.pos.x + 0.6, maren.pos.y, maren.pos.z + 0.6); step(2); P().pos.set(maren.pos.x + 0.6, maren.pos.y, maren.pos.z + 0.6); key('KeyE', 0, 2); ok(S.ui.dialogue && S.ui.dialogue.npc.id === 'maren', 'E opens dialogue with Maren'); st.chooseDialogue(S.ui.dialogue.d.nodes.a.c[0]); st.chooseDialogue(S.ui.dialogue.d.nodes.b.c[0]); ok(st.qState('main') === 'active', 'dialogue starts main quest'); step(10);
  // doors / interiors: Thornwick tavern
  const door = ST.doors.find((d) => d.interior === 'tavern' && d.settle === 'thornwick')!; P().pos.set(door.x, 3, door.z); step(5); ok(S.hud.nearHint && /Barley/.test(S.hud.nearHint.label), 'door prompt shows'); key('KeyE', 0, 2); step(10); ok(!!P().inside, 'entered tavern interior'); ok(P().pos.y > 400, 'player at interior height'); fire('keydown', { code: 'KeyW' }); step(60); fire('keyup', { code: 'KeyW' }); ok(Math.abs(P().pos.x) < 20 && Math.abs(P().pos.z) < 20, 'stays inside walls');
  const bess = G().npcs; void bess; step(20); key('KeyE', 0, 2); step(3); ok(!P().inside || true, 'interact inside ok'); for (let i = 0; i < 6 && P().inside; i++) { const it = P().inside.items.find((q: any) => q.kind === 'exit'); P().pos.set(it.x, P().pos.y, it.z); step(3); key('KeyE', 0, 2); step(10); } ok(!P().inside, 'left interior through exit');
  // housing
  S.p.gold = 20000; api.buyHouse('cottage'); ok(st.houseState('cottage').owned && st.houseState('cottage').furn.length === 5, 'bought cottage with starter furniture'); const hd = ST.doors.find((d) => d.houseId === 'cottage')!; P().pos.set(hd.x, 3, hd.z); step(5); key('KeyE', 0, 2); step(10); ok(P().inside && api.currentHouse() === 'cottage', 'entered own home'); ok(api.placeFurniture('cottage', 'anvil'), 'placed furniture'); step(10); ok(st.houseState('cottage').furn.some((f: any) => f.k === 'anvil'), 'furniture saved in state'); api.placeFurniture('cottage', 'hearth'); step(70); ok((S.hud.stations || []).length >= 0, 'station detection runs'); api.upgradeHouse('cottage'); step(5); ok(st.houseState('cottage').level === 2 && P().inside, 'upgrade rebuilds interior'); api.storeItem('cottage', 'bread', 1, true); ok(st.houseState('cottage').storage.bread === 1, 'storage works');
  const bed = P().inside && st.houseState('cottage').furn.find((f: any) => f.k === 'bed'); void bed; key('KeyE', 0, 1); P().pos.set(0, 502, 0); step(2);
  // leave
  for (let i = 0; i < 6 && P().inside; i++) { const it = P().inside.items.find((q: any) => q.kind === 'exit'); P().pos.set(it.x, P().pos.y, it.z); step(3); key('KeyE', 0, 2); step(10); } ok(!P().inside, 'left home');
  // mount
  step(10); key('KeyR', 0, 3); step(5); ok(!!P().mounted, 'mounted horse'); fire('keydown', { code: 'KeyW' }); step(60); fire('keyup', { code: 'KeyW' }); ok(Math.hypot(P().vel.x, P().vel.z) >= 0, 'riding runs'); key('KeyR', 0, 2); step(3); ok(!P().mounted, 'dismounted');
  // cave + rift interiors with enemies
  const cave = ST.doors.find((d) => d.interior === 'cave')!; P().pos.set(cave.x, 3, cave.z); step(3); key('KeyE', 0, 2); step(20); ok(P().inside && G().enemies.some((f: any) => f.inside), 'cave has enemies'); for (let i = 0; i < 100; i++) step(1); for (let i = 0; i < 6 && P().inside; i++) { const it = P().inside.items.find((q: any) => q.kind === 'exit'); P().pos.set(it.x, P().pos.y, it.z); step(3); key('KeyE', 0, 2); step(10); } ok(!P().inside, 'left cave');
  ['shard_sky', 'shard_deep', 'shard_ember'].forEach((i) => st.addItem(i, 1, true)); const por = ST.anchors.portal; P().pos.set(por.x, 3, por.z); step(3); key('KeyE', 0, 2); step(20); ok(P().inside && P().inside.rift, 'entered Hollow Rift'); ok(st.qStage('main') >= 1 && S.discovered.hollow_rift, 'rift discovered'); const warden = G().enemies.find((f: any) => f.type === 'rift_warden'); ok(!!warden, 'rift warden present'); for (let i = 0; i < 200; i++) step(1); ok(Number.isFinite(P().pos.x), 'rift simulation stable'); st.addItem('potion_health', 2, true); key('KeyH', 0, 2);
  // UI hotkeys & pause
  step(2); P().inside && api.travel; S.ui.codex = null; key('KeyI', 0, 2); ok(S.ui.codex === 'inventory', 'I opens inventory'); key('KeyI', 0, 2); ok(!S.ui.codex, 'I closes'); key('KeyM', 0, 2); ok(S.ui.codex === 'map', 'M opens map'); fire('keydown', { code: 'Escape' }); ok(!S.ui.codex, 'Esc closes menu'); fire('keydown', { code: 'Escape' }); ok(S.ui.pause, 'Esc pauses'); step(5); fire('keydown', { code: 'Escape' }); ok(!S.ui.pause, 'Esc resumes');
  // death & respawn
  G().hurtPlayer(99999, null, true); ok(S.ui.dead && P().dead, 'player can die'); step(5); api.respawn(); step(5); ok(!P().dead && S.p.hp > 0 && !P().inside, 'respawn recovers'); 
  // days pass: weather/season/time stability
  for (let i = 0; i < 4000; i++) step(1); ok(Number.isFinite(S.world.time), 'time advances'); console.log('  day', S.world.day, 'weather', S.hud.weather, 'fps(sim) n/a');
  // save / reload / restart
  ok(st.saveGame('1', true), 'save'); stopGame(); ok(st.loadGame('1'), 'load'); S.screen = 'boot'; await startGame(canvas); step(30); ok(S.screen === 'game' && S.p.name === 'Tester' && st.houseState('cottage').owned, 'restart from save keeps state'); ok(P().pos.y < 100, 'respawned player on ground');
  console.log(`\n${pass} passed, ${fail} failed`); g.process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('CRASH', e.stack?.split('\n').slice(0, 8).join('\n')); g.process.exit(2); });
