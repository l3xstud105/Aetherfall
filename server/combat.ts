// AETHERFALL 1.0.0 — Authoritative Combat & Elemental Reaction System
import { WorldSimulation, ServerFoe, ServerPlayer } from './world';
import { DB } from './db';

export interface CombatHitResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  elementalReaction: string;
  reactionColor: string;
  foeHp: number;
  foeDead: boolean;
  phase: number;
  lootAwarded?: Record<string, number>;
  goldAwarded?: number;
  xpAwarded?: number;
}

export class AuthoritativeCombat {
  private world: WorldSimulation;
  private db: DB;

  constructor(world: WorldSimulation, db: DB) {
    this.world = world;
    this.db = db;
  }

  processPlayerAttack(
    player: ServerPlayer,
    targetId: string,
    actionType: 'attack' | 'ability',
    abilityId?: string
  ): CombatHitResult {
    const foe = this.world.foes.get(targetId);
    if (!foe || foe.dead || foe.zone !== player.zone) {
      return { hit: false, damage: 0, critical: false, elementalReaction: '', reactionColor: '', foeHp: 0, foeDead: false, phase: 1 };
    }

    // 1. Range Validation
    const dx = foe.pos.x - player.pos.x;
    const dz = foe.pos.z - player.pos.z;
    const dist = Math.hypot(dx, dz);

    const maxMeleeRange = 3.6; // Allows polearms & swords
    const maxMagicRange = 25.0;
    const isMagic = abilityId && ['fireball', 'lightning', 'meteor', 'frost_shield'].includes(abilityId);
    const maxAllowedDist = isMagic ? maxMagicRange : maxMeleeRange;

    if (dist > maxAllowedDist + 0.5) {
      // Out of range: reject attack
      return { hit: false, damage: 0, critical: false, elementalReaction: '', reactionColor: '', foeHp: foe.hp, foeDead: false, phase: foe.phase };
    }

    // 2. Resource check & Stamina/Mana consumption
    if (actionType === 'ability' && abilityId) {
      const manaCost = 20;
      if (player.char.mana < manaCost) {
        return { hit: false, damage: 0, critical: false, elementalReaction: '', reactionColor: '', foeHp: foe.hp, foeDead: false, phase: foe.phase };
      }
      player.char.mana -= manaCost;
    } else {
      const staCost = 10;
      if (player.char.sta < staCost) {
        return { hit: false, damage: 0, critical: false, elementalReaction: '', reactionColor: '', foeHp: foe.hp, foeDead: false, phase: foe.phase };
      }
      player.char.sta -= staCost;
    }

    // 3. Base Damage calculation
    let baseDmg = 18 + player.char.level * 4;
    let element = 'phys';

    if (abilityId === 'fireball' || abilityId === 'flame_slash') {
      baseDmg *= 1.6;
      element = 'fire';
    } else if (abilityId === 'thunder_slam') {
      baseDmg *= 1.5;
      element = 'lightning';
    } else if (abilityId === 'wind_step') {
      baseDmg *= 1.3;
      element = 'wind';
    } else if (abilityId === 'terra_wall') {
      baseDmg *= 1.4;
      element = 'earth';
    }

    const critical = Math.random() < 0.18; // 18% crit chance
    if (critical) baseDmg *= 1.6;

    // 4. Elemental Reaction Resolution
    let reactionText = '';
    let reactionColor = '';
    let bonusDmg = 0;
    let elMult = 1.0;

    if (element !== 'phys') {
      if ((element === 'fire' && foe.elements.wind) || (element === 'wind' && foe.elements.fire)) {
        reactionText = 'CONFLAGRATION!';
        reactionColor = '#ff6622';
        bonusDmg = baseDmg * 0.6;
        delete foe.elements.wind;
        delete foe.elements.fire;
      } else if ((element === 'ice' && foe.elements.lightning) || (element === 'lightning' && foe.elements.ice)) {
        reactionText = 'SUPERCONDUCTOR!';
        reactionColor = '#60e0ff';
        bonusDmg = baseDmg * 0.5;
        foe.staggered = Math.max(foe.staggered, 2.5);
        delete foe.elements.ice;
        delete foe.elements.lightning;
      } else if ((element === 'fire' && (foe.elements.water || foe.elements.ice)) || (element === 'water' && foe.elements.fire)) {
        reactionText = 'VAPORIZE 2×!';
        reactionColor = '#ffa533';
        elMult *= 2.0;
        delete foe.elements.water;
        delete foe.elements.ice;
        delete foe.elements.fire;
      } else if ((element === 'lightning' && foe.elements.water) || (element === 'water' && foe.elements.lightning)) {
        reactionText = 'ELECTRO-DISCHARGE!';
        reactionColor = '#ffee44';
        bonusDmg = baseDmg * 0.45;
        delete foe.elements.water;
        delete foe.elements.lightning;
      } else if ((element === 'fire' && foe.elements.earth) || (element === 'earth' && foe.elements.fire)) {
        reactionText = 'MAGMA ERUPTION!';
        reactionColor = '#ff3300';
        bonusDmg = baseDmg * 0.65;
        foe.stagger += 50;
        delete foe.elements.earth;
        delete foe.elements.fire;
      } else {
        foe.elements[element] = 6.0; // Apply element status for 6 seconds
      }
    }

    // 5. Poise & Stagger check
    const isStaggered = foe.staggered > 0;
    const finalDmg = Math.round((isStaggered ? baseDmg * 1.35 : baseDmg) * elMult + bonusDmg);

    foe.hp = Math.max(0, foe.hp - finalDmg);
    foe.aggroTarget = player.char.id; // Switch aggro to attacker

    if (!isStaggered) {
      foe.stagger += finalDmg * 1.2;
      const thresh = foe.boss ? 200 : 70;
      if (foe.stagger >= thresh) {
        foe.stagger = 0;
        foe.staggered = foe.boss ? 1.5 : 2.4;
      }
    }

    // 6. Boss Phase II Enrage
    if (foe.boss && foe.phase === 1 && foe.hp <= foe.max * 0.5) {
      foe.phase = 2;
      foe.staggered = 0;
      foe.spd *= 1.25;
      foe.dmg = Math.round(foe.dmg * 1.3);

      const enragePacket = {
        t: 'boss_enrage',
        id: foe.id,
        name: foe.name,
        phase: 2,
        x: foe.pos.x,
        z: foe.pos.z
      };
      this.world.broadcastNearby(foe.pos.x, foe.pos.z, foe.zone, enragePacket);
    }

    // 7. Death & Server-Authoritative Reward Distribution
    let lootAwarded: Record<string, number> | undefined;
    let goldAwarded: number | undefined;
    let xpAwarded: number | undefined;

    if (foe.hp <= 0) {
      foe.dead = true;
      foe.deadT = 0;

      goldAwarded = foe.boss ? 150 : Math.floor(8 + Math.random() * 15);
      xpAwarded = foe.boss ? 800 : Math.floor(35 + Math.random() * 30);
      lootAwarded = {};

      if (foe.boss) {
        lootAwarded.aether_core = 1;
        lootAwarded.gem_ruby = 1;
      } else {
        if (Math.random() < 0.6) lootAwarded.meat_raw = 1;
        if (Math.random() < 0.4) lootAwarded.potion_health = 1;
      }

      // Add to player's persistent character
      player.char.gold += goldAwarded;
      player.char.xp += xpAwarded;

      // Check level up
      const nextXp = player.char.level * 100;
      if (player.char.xp >= nextXp) {
        player.char.level++;
        player.char.xp -= nextXp;
      }

      // Merge inventory
      for (const item in lootAwarded) {
        player.char.inventory[item] = (player.char.inventory[item] || 0) + lootAwarded[item];
      }

      // Commit to DB
      this.db.saveCharacter(player.char);

      // Notify player of inventory & gold update
      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({
          t: 'inv_update',
          gold: player.char.gold,
          level: player.char.level,
          xp: player.char.xp,
          inventory: player.char.inventory
        }));
      }
    }

    // 8. Send hit packet directly to attacker and broadcast to other nearby players
    const hitPacket = {
      t: 'foe_hit',
      id: foe.id,
      attackerId: player.char.id,
      attackerName: player.char.name,
      dmg: finalDmg,
      crit: critical,
      el: element,
      reaction: reactionText,
      reactionColor,
      foeHp: foe.hp,
      dead: foe.dead,
      phase: foe.phase
    };
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify(hitPacket));
    }
    this.world.broadcastNearby(foe.pos.x, foe.pos.z, foe.zone, hitPacket, player.char.id);

    return {
      hit: true,
      damage: finalDmg,
      critical,
      elementalReaction: reactionText,
      reactionColor,
      foeHp: foe.hp,
      foeDead: foe.dead,
      phase: foe.phase,
      lootAwarded,
      goldAwarded,
      xpAwarded
    };
  }
}
