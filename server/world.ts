// AETHERFALL 1.0.0 — Server-Side World Simulation & Interest Management
// Fixed 20Hz tick rate, spatial grid partitioning, and authoritative enemy AI.
import { PersistentCharacter } from './db';

export interface WorldEvent {
  id: string;
  type: 'bandit_siege' | 'caravan' | 'void_surge' | 'world_boss';
  title: string;
  desc: string;
  region: string;
  x: number;
  z: number;
  startTime: number;
  durationMs: number;
  targetCount: number;
  currentCount: number;
  bossId?: string;
  contributions: Map<string, number>;
  status: 'active' | 'victory' | 'failed';
}

export interface ServerFoe {
  id: string;
  type: string;
  name: string;
  pos: { x: number; y: number; z: number };
  home: { x: number; y: number; z: number };
  yaw: number;
  hp: number;
  max: number;
  stagger: number;
  staggered: number;
  phase: number;
  boss: boolean;
  dead: boolean;
  deadT: number;
  respawnTime: number;
  aggroTarget: string | null; // character id
  elements: Record<string, number>;
  zone: string;
  dmg: number;
  spd: number;
  atkT: number;
  cd: number;
}

export interface ServerPlayer {
  ws: any;
  accountId: string;
  char: PersistentCharacter;
  pos: { x: number; y: number; z: number };
  yaw: number;
  speed: number;
  act: string;
  air: string;
  crouch: boolean;
  zone: string; // 'world' or dungeon/interior instance id
  insideKey: string | null;
  cellKey: string;
  lastPacketTime: number;
  seq: number;
  partyId: string | null;
}

export class WorldSimulation {
  time = 8.0; // 0.0 - 24.0 hours
  day = 1;
  weather: 'clear' | 'rain' | 'storm' | 'snow' | 'fog' = 'clear';
  weatherTimer = 0;
  tick = 0;

  players = new Map<string, ServerPlayer>(); // charId -> player
  foes = new Map<string, ServerFoe>(); // foeId -> foe
  spatialGrid = new Map<string, Set<string>>(); // cellKey -> Set<charId>

  currentEvent: WorldEvent | null = null;
  eventTimer = 0;
  settlementState = {
    ashenvale: { wood: 0, stone: 0, iron: 0, tier: 1, maxMaterials: 100 }
  };

  constructor() {
    this.initWorldSpawns();
  }

  // --- Spatial grid interest management (64m x 64m cells)
  getCellKey(x: number, z: number, zone = 'world'): string {
    const cx = Math.floor(x / 64);
    const cz = Math.floor(z / 64);
    return `${zone}:${cx},${cz}`;
  }

  getNeighborCellKeys(x: number, z: number, zone = 'world'): string[] {
    const cx = Math.floor(x / 64);
    const cz = Math.floor(z / 64);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        keys.push(`${zone}:${cx + dx},${cz + dz}`);
      }
    }
    return keys;
  }

  updatePlayerCell(p: ServerPlayer) {
    const newKey = this.getCellKey(p.pos.x, p.pos.z, p.zone);
    if (newKey !== p.cellKey) {
      if (p.cellKey && this.spatialGrid.has(p.cellKey)) {
        this.spatialGrid.get(p.cellKey)!.delete(p.char.id);
      }
      p.cellKey = newKey;
      if (!this.spatialGrid.has(newKey)) {
        this.spatialGrid.set(newKey, new Set());
      }
      this.spatialGrid.get(newKey)!.add(p.char.id);
    }
  }

  removePlayerFromGrid(p: ServerPlayer) {
    if (p.cellKey && this.spatialGrid.has(p.cellKey)) {
      this.spatialGrid.get(p.cellKey)!.delete(p.char.id);
    }
  }

  getNearbyPlayers(x: number, z: number, zone = 'world'): ServerPlayer[] {
    const cells = this.getNeighborCellKeys(x, z, zone);
    const result: ServerPlayer[] = [];
    cells.forEach((k) => {
      const set = this.spatialGrid.get(k);
      if (set) {
        set.forEach((cid) => {
          const p = this.players.get(cid);
          if (p) result.push(p);
        });
      }
    });
    return result;
  }

  // --- World Spawns (Bosses, Camps, Wildlife)
  private initWorldSpawns() {
    // World Bosses
    this.spawnFoe('karreth', 'Karreth the Hollow', -10, 196, { hp: 850, boss: true, dmg: 28, spd: 4.8 });
    this.spawnFoe('aether_golem', 'Aether Golem', -80, -140, { hp: 1200, boss: true, dmg: 35, spd: 3.5 });
    this.spawnFoe('bear_alpha', 'Alpha Greatbear', -105, 95, { hp: 550, boss: true, dmg: 22, spd: 5.2 });
    this.spawnFoe('white_wolf', 'Ghostmane White Wolf', -30, -150, { hp: 420, boss: true, dmg: 18, spd: 6.0 });

    // Bandit camps
    this.spawnCamp(-118, 40, [['bandit', 4], ['bandit_archer', 1]]);
    this.spawnCamp(40, 120, [['bandit', 3], ['bandit_archer', 2]]);
    this.spawnCamp(-10, 205, [['bandit', 4], ['bandit_archer', 2], ['deserter', 1]]);
    this.spawnCamp(222, 112, [['smuggler', 4]]);
    this.spawnCamp(210, 10, [['void_cultist', 3]]);
    this.spawnCamp(-170, -150, [['wraith', 3]]);
  }

  private spawnCamp(cx: number, cz: number, list: [string, number][]) {
    let idx = 0;
    list.forEach(([t, n]) => {
      for (let i = 0; i < n; i++) {
        const a = (idx * 1.3) % 6.28, r = 3 + (idx % 4) * 1.5;
        const id = `camp_${cx}_${cz}_${t}_${i}`;
        const name = t.replace('_', ' ').toUpperCase();
        this.spawnFoe(id, name, cx + Math.cos(a) * r, cz + Math.sin(a) * r, {
          type: t,
          hp: t === 'deserter' ? 140 : t === 'bandit_archer' ? 80 : 100,
          dmg: t === 'deserter' ? 16 : 12,
          spd: 4.5
        });
        idx++;
      }
    });
  }

  spawnFoe(id: string, name: string, x: number, z: number, o: any = {}): ServerFoe {
    const hp = o.hp || 100;
    const f: ServerFoe = {
      id,
      type: o.type || id,
      name,
      pos: { x, y: o.y || 0, z },
      home: { x, y: o.y || 0, z },
      yaw: 0,
      hp,
      max: hp,
      stagger: 0,
      staggered: 0,
      phase: 1,
      boss: !!o.boss,
      dead: false,
      deadT: 0,
      respawnTime: o.boss ? 600 : 180, // seconds
      aggroTarget: null,
      elements: {},
      zone: o.zone || 'world',
      dmg: o.dmg || 12,
      spd: o.spd || 4.2,
      atkT: 0,
      cd: 1.0
    };
    this.foes.set(id, f);
    return f;
  }

  // --- 20Hz Simulation Tick (dt = 0.05s)
  update(dt: number) {
    this.tick++;

    // 1. World Time & Weather
    this.time += dt * 0.025; // ~1 real minute per in-game hour
    if (this.time >= 24) {
      this.time -= 24;
      this.day++;
    }

    this.weatherTimer += dt;
    if (this.weatherTimer > 300) {
      this.weatherTimer = 0;
      const options: ('clear' | 'rain' | 'storm' | 'snow' | 'fog')[] = ['clear', 'rain', 'storm', 'fog', 'clear'];
      this.weather = options[Math.floor(Math.random() * options.length)];
    }

    // 2. Authoritative Enemy AI Loop
    this.foes.forEach((f) => {
      // Dead respawn handling
      if (f.dead) {
        f.deadT += dt;
        if (f.deadT >= f.respawnTime) {
          f.dead = false;
          f.deadT = 0;
          f.hp = f.max;
          f.phase = 1;
          f.stagger = 0;
          f.staggered = 0;
          f.pos.x = f.home.x;
          f.pos.z = f.home.z;
          f.aggroTarget = null;
        }
        return;
      }

      // Elemental duration ticks
      for (const el in f.elements) {
        f.elements[el] -= dt;
        if (f.elements[el] <= 0) delete f.elements[el];
      }

      // Stagger recovery
      if (f.staggered > 0) {
        f.staggered -= dt;
        return; // immobilized while staggered
      }

      // Find or track target
      let targetPlayer: ServerPlayer | null = null;
      if (f.aggroTarget && this.players.has(f.aggroTarget)) {
        targetPlayer = this.players.get(f.aggroTarget)!;
        const dist = Math.hypot(targetPlayer.pos.x - f.home.x, targetPlayer.pos.z - f.home.z);
        if (dist > 50 || targetPlayer.zone !== f.zone) {
          // Leashed: target too far from home spawn
          f.aggroTarget = null;
          targetPlayer = null;
        }
      }

      if (!targetPlayer) {
        // Search for nearest player within aggro radius (14m for normal, 24m for boss)
        const aggroRadius = f.boss ? 24 : 14;
        const candidates = this.getNearbyPlayers(f.pos.x, f.pos.z, f.zone);
        let bestDist = aggroRadius;
        for (const p of candidates) {
          const d = Math.hypot(p.pos.x - f.pos.x, p.pos.z - f.pos.z);
          if (d < bestDist && !p.crouch) {
            bestDist = d;
            targetPlayer = p;
            f.aggroTarget = p.char.id;
          }
        }
      }

      // AI movement & combat actions
      if (targetPlayer) {
        const dx = targetPlayer.pos.x - f.pos.x;
        const dz = targetPlayer.pos.z - f.pos.z;
        const dist = Math.hypot(dx, dz);
        f.yaw = Math.atan2(dx, dz);

        const attackRange = f.boss ? 3.8 : 2.2;
        if (dist > attackRange) {
          // Advance towards player
          const step = Math.min(dist - attackRange + 0.2, f.spd * dt);
          f.pos.x += (dx / dist) * step;
          f.pos.z += (dz / dist) * step;
        } else {
          // In range: perform attack
          f.atkT -= dt;
          if (f.atkT <= 0) {
            f.atkT = f.cd;
            // Send authoritative attack event against player
            this.damagePlayer(targetPlayer, f.dmg, f);
          }
        }
      } else {
        // Return to home position
        const dx = f.home.x - f.pos.x;
        const dz = f.home.z - f.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.0) {
          const step = Math.min(dist, (f.spd * 0.6) * dt);
          f.pos.x += (dx / dist) * step;
          f.pos.z += (dz / dist) * step;
          f.yaw = Math.atan2(dx, dz);
        }
      }
    });

    // 3. Player Regeneration & Safe Boundary Clamping
    this.players.forEach((p) => {
      // Natural regen
      if (p.char.hp < 100) p.char.hp = Math.min(100, p.char.hp + 2 * dt);
      if (p.char.mana < 50) p.char.mana = Math.min(50, p.char.mana + 4 * dt);
      if (p.char.sta < 100) p.char.sta = Math.min(100, p.char.sta + 15 * dt);
    });

    // 4. World Events Loop
    this.eventTimer += dt;
    if (this.currentEvent && this.currentEvent.status === 'active') {
      const elapsed = Date.now() - this.currentEvent.startTime;
      if (elapsed > this.currentEvent.durationMs) {
        if (this.currentEvent.currentCount >= this.currentEvent.targetCount) {
          this.currentEvent.status = 'victory';
          this.distributeEventRewards(this.currentEvent);
        } else {
          this.currentEvent.status = 'failed';
          this.broadcastAll({
            t: 'world_event_end',
            event: this.getEventSummary(this.currentEvent),
            result: 'failed',
            msg: `The defenders were overwhelmed at ${this.currentEvent.title}.`
          });
        }
      }
    } else if (this.eventTimer >= 300) {
      this.eventTimer = 0;
      this.triggerRandomEvent();
    }
  }

  triggerRandomEvent(): WorldEvent {
    const types: WorldEvent['type'][] = ['bandit_siege', 'caravan', 'void_surge', 'world_boss'];
    const chosen = types[Math.floor(Math.random() * types.length)];
    return this.triggerEvent(chosen);
  }

  triggerEvent(type: WorldEvent['type']): WorldEvent {
    const id = 'ev_' + Date.now();
    let title = 'Bandit Siege on Ashenvale Outpost';
    let desc = 'Bandit raiders are attacking Ashenvale! Defeat 10 raiders to secure the outpost.';
    let region = 'Ashenvale Outpost';
    let x = -10, z = 205;
    let targetCount = 10;
    let bossId: string | undefined;

    if (type === 'caravan') {
      title = 'Royal Merchant Caravan Ambush';
      desc = 'Smugglers have ambushed the royal caravan on the eastern road! Defend the cargo.';
      region = 'Eastern Highway';
      x = 110; z = -150;
      targetCount = 8;
    } else if (type === 'void_surge') {
      title = 'Void Incursion at Hollow Rift';
      desc = 'Void aberrations are surging from the Hollow Door! Banish the void creatures.';
      region = 'The Hollow Rift';
      x = -80; z = -140;
      targetCount = 12;
    } else if (type === 'world_boss') {
      title = 'Ancient Storm Warden Kharun Awakens';
      desc = 'The ancient titan Kharun has broken his seal! Band together to fell the storm titan.';
      region = 'Veilfall Basin';
      x = 60; z = -150;
      targetCount = 1;
      bossId = 'world_boss_kharun';
      if (!this.foes.has(bossId)) {
        this.spawnFoe({
          id: bossId,
          type: 'storm_warden',
          name: 'Kharun, Storm Warden',
          x, z,
          max: 5000,
          ai: 'boss',
          boss: true,
          respawnTime: 600,
          dmg: 35,
          spd: 3.8
        });
      }
    }

    this.currentEvent = {
      id,
      type,
      title,
      desc,
      region,
      x, z,
      startTime: Date.now(),
      durationMs: 180000,
      targetCount,
      currentCount: 0,
      bossId,
      contributions: new Map(),
      status: 'active'
    };

    this.broadcastAll({
      t: 'world_event_start',
      event: this.getEventSummary(this.currentEvent)
    });

    return this.currentEvent;
  }

  recordEventProgress(charId: string, amount = 1) {
    if (!this.currentEvent || this.currentEvent.status !== 'active') return;
    this.currentEvent.currentCount = Math.min(this.currentEvent.targetCount, this.currentEvent.currentCount + amount);
    const prev = this.currentEvent.contributions.get(charId) || 0;
    this.currentEvent.contributions.set(charId, prev + amount);

    this.broadcastAll({
      t: 'world_event_update',
      event: this.getEventSummary(this.currentEvent)
    });

    if (this.currentEvent.currentCount >= this.currentEvent.targetCount) {
      this.currentEvent.status = 'victory';
      this.distributeEventRewards(this.currentEvent);
    }
  }

  private distributeEventRewards(ev: WorldEvent) {
    const contributors = [...ev.contributions.entries()];
    this.broadcastAll({
      t: 'world_event_end',
      event: this.getEventSummary(ev),
      result: 'victory',
      msg: `VICTORY! ${ev.title} has been completed! All champions awarded bonus gold & XP.`
    });

    contributors.forEach(([cId, score]) => {
      const p = this.players.get(cId);
      if (p) {
        const bonusGold = Math.min(250, 50 + score * 20);
        const bonusXp = Math.min(1000, 200 + score * 80);
        p.char.gold += bonusGold;
        p.char.xp += bonusXp;
        if (p.ws.readyState === 1) {
          p.ws.send(JSON.stringify({
            t: 'inv_update',
            gold: p.char.gold,
            xp: p.char.xp,
            level: p.char.level,
            rewardMsg: `World Event: +${bonusGold} gold, +${bonusXp} XP!`
          }));
        }
      }
    });
  }

  getEventSummary(ev: WorldEvent) {
    return {
      id: ev.id,
      type: ev.type,
      title: ev.title,
      desc: ev.desc,
      region: ev.region,
      x: ev.x,
      z: ev.z,
      currentCount: ev.currentCount,
      targetCount: ev.targetCount,
      status: ev.status,
      remainingSec: Math.max(0, Math.floor((ev.durationMs - (Date.now() - ev.startTime)) / 1000))
    };
  }

  contributeToSettlement(settlement: string, material: 'wood' | 'stone' | 'iron', qty: number) {
    if (settlement === 'ashenvale') {
      const ash = this.settlementState.ashenvale;
      ash[material] = (ash[material] || 0) + qty;
      if (ash.wood >= 30 && ash.stone >= 30 && ash.iron >= 20 && ash.tier < 2) {
        ash.tier = 2;
        this.broadcastAll({
          t: 'chat_msg',
          channel: 'world',
          from: 'System',
          text: '🏛️ Ashenvale Outpost has reached Rebuilding Tier II! Artisan merchants have set up shop.'
        });
      } else if (ash.wood >= 80 && ash.stone >= 80 && ash.iron >= 60 && ash.tier < 3) {
        ash.tier = 3;
        this.broadcastAll({
          t: 'chat_msg',
          channel: 'world',
          from: 'System',
          text: '🏰 Ashenvale Outpost has been fully restored to a Grand Bastion!'
        });
      }
    }
  }

  damagePlayer(p: ServerPlayer, rawDmg: number, attacker: ServerFoe) {
    const effectiveDmg = Math.max(1, rawDmg * (1 - (p.crouch ? 0.1 : 0)));
    p.char.hp = Math.max(0, p.char.hp - effectiveDmg);

    const packet = {
      t: 'player_hurt',
      charId: p.char.id,
      dmg: effectiveDmg,
      hp: p.char.hp,
      attackerId: attacker.id
    };

    if (p.ws.readyState === 1) {
      p.ws.send(JSON.stringify(packet));
    }

    // Broadcast to nearby players so they see hit effects
    this.broadcastNearby(p.pos.x, p.pos.z, p.zone, packet);

    if (p.char.hp <= 0) {
      // Respawn at Thornwick sanctuary
      p.char.hp = 100;
      p.pos.x = -140;
      p.pos.y = 0;
      p.pos.z = 100;
      const respawnPacket = {
        t: 'player_respawn',
        charId: p.char.id,
        hp: p.char.hp,
        x: p.pos.x,
        y: p.pos.y,
        z: p.pos.z
      };
      if (p.ws.readyState === 1) p.ws.send(JSON.stringify(respawnPacket));
      this.broadcastNearby(p.pos.x, p.pos.z, p.zone, respawnPacket);
    }
  }

  broadcastNearby(x: number, z: number, zone: string, packet: any, exceptCharId?: string) {
    const raw = typeof packet === 'string' ? packet : JSON.stringify(packet);
    const nearby = this.getNearbyPlayers(x, z, zone);
    nearby.forEach((p) => {
      if (p.char.id !== exceptCharId && p.ws.readyState === 1) {
        p.ws.send(raw);
      }
    });
  }

  broadcastGlobal(packet: any, exceptCharId?: string) {
    const raw = typeof packet === 'string' ? packet : JSON.stringify(packet);
    this.players.forEach((p) => {
      if (p.char.id !== exceptCharId && p.ws.readyState === 1) {
        p.ws.send(raw);
      }
    });
  }

  broadcastAll(packet: any) {
    this.broadcastGlobal(packet);
  }
}
