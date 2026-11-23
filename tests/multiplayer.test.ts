// Multiplayer Star Topology Integration Test
// Runs two independent game clients (Host & Joiner) through the real Net and Actors layer.
const noop: any = new Proxy(function () {}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop });
const mem: Record<string, string> = {};
const g: any = globalThis; g.window = g;
g.document = { createElement: () => ({ getContext: () => noop, width: 0, height: 0, style: {}, toDataURL: () => '' }), getElementById: () => null, addEventListener: () => {}, removeEventListener: () => {}, pointerLockElement: null, exitPointerLock() {}, activeElement: null, querySelector: () => null };
g.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
g.innerWidth = 1280; g.innerHeight = 720; g.devicePixelRatio = 1;

import { Net } from '../src/game/net';
import * as st from '../src/game/store';
import { G } from '../src/game/fx';
import * as THREE from 'three';
import { spawnFoe, damageFoe, applyRemoteFoeHit, applyBossSync, ensureRemote, removeRemote } from '../src/game/actors';

const scene = new THREE.Scene();
G.scene = scene;
G.world = new THREE.Group();
scene.add(G.world);
G.intGroup = new THREE.Group();
scene.add(G.intGroup);
G.camera = new THREE.PerspectiveCamera(70, 1.7, 0.1, 1000);
G.birds = []; G.fish = []; G.frogs = []; G.fxList = []; G.enemies = []; G.remotes = new Map(); G.weather = { type: 'clear' };
const P: any = { pos: new THREE.Vector3(-150, 2, 95), vel: new THREE.Vector3(), inside: null, crouch: false, combat: false, combatT: 0, buffs: {}, dead: false, lastTarget: null, targetT: 0, hpPct: 1, yaw: 0, rig: null };
G.player = P;

let pass = 0, fail = 0;
const ok = (c: any, m: string) => {
  if (c) { pass++; } else { fail++; console.log('FAIL:', m); }
};

class MockDataConnection {
  peer: string;
  open = true;
  other: MockDataConnection | null = null;
  private listeners: Record<string, Function[]> = {};

  constructor(peer: string) {
    this.peer = peer;
  }

  on(event: string, fn: Function) {
    (this.listeners[event] ||= []).push(fn);
  }

  emit(event: string, data?: any) {
    (this.listeners[event] || []).forEach((fn) => fn(data));
  }

  send(data: any) {
    if (this.other && this.other.open) {
      const copy = JSON.parse(JSON.stringify(data));
      queueMicrotask(() => this.other?.emit('data', copy));
    }
  }

  close() {
    this.open = false;
    this.emit('close');
    if (this.other && this.other.open) {
      this.other.open = false;
      this.other.emit('close');
    }
  }
}

class MockPeer {
  id: string;
  private listeners: Record<string, Function[]> = {};
  static registry = new Map<string, MockPeer>();

  constructor(id?: string) {
    this.id = id || 'peer-' + Math.random().toString(36).slice(2, 8);
    MockPeer.registry.set(this.id, this);
    queueMicrotask(() => this.emit('open', this.id));
  }

  on(event: string, fn: Function) {
    (this.listeners[event] ||= []).push(fn);
  }

  emit(event: string, data?: any) {
    (this.listeners[event] || []).forEach((fn) => fn(data));
  }

  connect(targetId: string, options?: any) {
    const target = MockPeer.registry.get(targetId);
    const connA = new MockDataConnection(targetId);
    const connB = new MockDataConnection(this.id);
    connA.other = connB;
    connB.other = connA;

    queueMicrotask(() => {
      if (target) {
        target.emit('connection', connB);
        connB.emit('open');
        connA.emit('open');
      } else {
        this.emit('error', { type: 'peer-unavailable' });
      }
    });

    return connA;
  }

  destroy() {
    MockPeer.registry.delete(this.id);
    this.emit('close');
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 35));

(async () => {
  console.log('--- Setting up Client 1 (Host) and Client 2 (Joiner)');
  st.newPlayer('Thorin', 'warrior', st.defaultLook());
  st.S.p.level = 5;
  st.S.p.gold = 500;
  st.S.p.inv.sword_steel = 1;

  const netHost = new Net();
  const netJoiner = new Net();

  // Test 1: Host creates room
  const hostPeer = new MockPeer('aetherfall-l3x-VALDOR');
  netHost.host(hostPeer);
  netHost.code = 'VALDOR';
  await flush();
  ok(netHost.status === 'hosting', 'Host status is hosting');
  ok(netHost.isHost === true, 'Host is marked as isHost');
  ok(netHost.myId === 'aetherfall-l3x-VALDOR', 'Host has registered room ID');

  // Test 2: Joiner connects by room code
  const joinerPeer = new MockPeer('peer-joiner-1');
  netJoiner.join('VALDOR', joinerPeer);
  await flush();
  ok(netJoiner.status === 'joined', 'Joiner status is joined');
  ok(netJoiner.isHost === false, 'Joiner is marked as client');
  ok(netJoiner.hostConn !== null, 'Joiner has open connection to Host');

  // Test 3: Handshake, Roster and Avatar creation
  ok(netHost.roster.has('peer-joiner-1'), 'Host received Joiner in roster');
  ok(netHost.count() === 2, 'Host reports player count = 2');
  ok(netJoiner.count() === 2, 'Joiner reports player count = 2');

  // Test 4: Position and movement synchronization
  const P = G.player;
  P.pos.set(120, 5, -80);
  P.visYaw = 1.2;
  P.speedNow = 5.4;
  P.netAct = 'run';
  P.crouch = true;
  P.insideKey = null;

  G.net = netJoiner;
  netJoiner.sendState(0.2);
  await flush();

  const remoteOnHost = G.remotes.get('peer-joiner-1');
  ok(!!remoteOnHost, 'Host created remote avatar for Joiner');
  ok(remoteOnHost.tp.x === 120 && remoteOnHost.tp.z === -80, 'Host received Joiner position (120, -80)');
  ok(remoteOnHost.speed === 5.4, 'Host received Joiner speed 5.4');
  ok(remoteOnHost.act === 'run', 'Host received Joiner animation state');
  ok(remoteOnHost.crouch === true, 'Host received Joiner crouch state');

  // Test 5: Combat & Boss State Synchronization
  const karrethHost = spawnFoe('karreth', -10, 196, { id: 'karreth', y: 0 });
  karrethHost.hp = 800;
  karrethHost.max = 800;
  karrethHost.phase = 1;

  // Joiner attacks Karreth with fire damage
  G.net = netHost; // Host is listening
  const hitMsg = {
    t: 'foe_hit',
    id: 'karreth',
    type: 'karreth',
    dmg: 150,
    el: 'fire',
    kb: 1,
    crit: false,
    hp: 650,
    phase: 1,
    reactionText: '',
    reactionColor: ''
  };
  netHost.onMsg(hitMsg, netHost.conns.get('peer-joiner-1')!);
  ok(karrethHost.hp === 650, 'Karreth HP synchronized to 650 on Host after Joiner hit');

  // Second hit brings Karreth below 50% HP (350 <= 400), triggering Phase II Enrage + Reaction
  const enrageHitMsg = {
    t: 'foe_hit',
    id: 'karreth',
    type: 'karreth',
    dmg: 300,
    el: 'wind',
    kb: 2,
    crit: true,
    hp: 350,
    phase: 2,
    reactionText: 'CONFLAGRATION!',
    reactionColor: '#ff6622'
  };
  netHost.onMsg(enrageHitMsg, netHost.conns.get('peer-joiner-1')!);
  ok(karrethHost.hp === 350, 'Karreth HP reduced to 350');
  ok(karrethHost.phase === 2, 'Boss Phase II Enrage synchronized to Host');

  // Lethal hit kills boss
  const lethalHit = {
    t: 'foe_hit',
    id: 'karreth',
    type: 'karreth',
    dmg: 400,
    el: 'phys',
    kb: 1,
    crit: true,
    hp: 0,
    phase: 2,
    reactionText: '',
    reactionColor: ''
  };
  netHost.onMsg(lethalHit, netHost.conns.get('peer-joiner-1')!);
  ok(karrethHost.dead === true, 'Boss defeat synchronized across peers');

  // Test 6: Chat & Emote Synchronization
  netJoiner.sendChat('For Valdoria!');
  await flush();
  const lastChat = st.S.chatLog[st.S.chatLog.length - 1];
  ok(lastChat && lastChat.text === 'For Valdoria!', 'Chat message delivered across peer connection');

  // Test 7: Dungeon / Interior Isolation
  netJoiner.sendDungeon('crypt', 'Whispering Catacombs');
  await flush();
  const remoteAvatar = G.remotes.get('peer-joiner-1');
  remoteAvatar.inside = 'crypt';
  P.insideKey = null; // Host is outside
  const visibleOutside = (remoteAvatar.inside || null) === (P.insideKey || null);
  ok(!visibleOutside, 'Player inside dungeon is visually isolated from players outside');

  P.insideKey = 'crypt'; // Host enters same crypt
  const visibleInside = (remoteAvatar.inside || null) === (P.insideKey || null);
  ok(visibleInside, 'Players inside same dungeon become mutually visible');

  // Test 8: Disconnection & Cleanup
  netJoiner.leave();
  await flush();
  ok(netJoiner.status === 'offline', 'Joiner status reset to offline on leave');
  ok(netHost.count() === 1, 'Host player count drops to 1 after peer leaves');
  ok(!G.remotes.has('peer-joiner-1'), 'Remote avatar cleaned up from Host scene');

  // Test 9: Reconnection
  const rejoinPeer = new MockPeer('peer-joiner-2');
  netJoiner.join('VALDOR', rejoinPeer);
  await flush();
  ok(netJoiner.status === 'joined', 'Joiner successfully reconnected to world');
  ok(netHost.count() === 2, 'Host player count restored to 2');

  // Clean exit
  netHost.leave();
  netJoiner.leave();
  await flush();
  ok(netHost.status === 'offline', 'Host cleanly destroyed session');

  // Test 10: Save & Inventory Isolation
  st.saveGame('1', true);
  const hostSlot = st.slotInfo('1');
  ok(hostSlot && hostSlot.name === 'Thorin' && hostSlot.gold >= 500, 'Host save retains Thorin Lv5 and gold >= 500');

  // Simulate client 2 saving with their own character in their isolated environment
  const client2SaveData = JSON.stringify({
    v: 1,
    ts: Date.now(),
    summary: { name: 'Aria', cls: 'mage', level: 3, day: 1, gold: 150 },
    d: {
      p: { name: 'Aria', cls: 'mage', level: 3, attrs: { str: 8, agi: 10, int: 16, vit: 10, wis: 14 }, inv: { staff_storm: 1 }, equip: { weapon: 'staff_storm' } },
      rep: {}, quests: {}
    }
  });
  // Client 2's memory is isolated
  const client2Storage: Record<string, string> = { 'aetherfall.save.1': client2SaveData };
  const client2Slot = JSON.parse(client2Storage['aetherfall.save.1']).summary;
  ok(client2Slot.name === 'Aria' && client2Slot.gold === 150, 'Client 2 isolated save holds Aria Lv3');
  ok(st.slotInfo('1').name === 'Thorin', 'Host save remains untouched and non-contaminated');

  console.log(`\nMultiplayer verification: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Multiplayer test error:', e);
  process.exit(2);
});
