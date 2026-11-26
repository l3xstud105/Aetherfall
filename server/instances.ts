// AETHERFALL 1.0.0 — Dungeon Instancing & Group Dungeon Manager
import { WorldSimulation, ServerFoe } from './world';

export interface DungeonInstance {
  id: string;
  type: string;
  name: string;
  partyId: string | null;
  leaderId: string;
  foes: Map<string, ServerFoe>;
  cleared: boolean;
  createdAt: number;
}

export class DungeonManager {
  private world: WorldSimulation;
  instances = new Map<string, DungeonInstance>(); // instanceId -> DungeonInstance

  constructor(world: WorldSimulation) {
    this.world = world;
  }

  getOrCreateInstance(type: string, partyId: string | null, leaderId: string): DungeonInstance {
    const instanceKey = partyId ? `inst_${type}_party_${partyId}` : `inst_${type}_solo_${leaderId}`;
    let inst = this.instances.get(instanceKey);
    if (!inst) {
      inst = {
        id: instanceKey,
        type,
        name: this.getDungeonName(type),
        partyId,
        leaderId,
        foes: new Map(),
        cleared: false,
        createdAt: Date.now()
      };
      this.populateDungeonFoes(inst);
      this.instances.set(instanceKey, inst);
    }
    return inst;
  }

  private getDungeonName(type: string): string {
    switch (type) {
      case 'crypt': return 'Whispering Catacombs';
      case 'sunken_temple': return 'Sunken Aether Temple';
      case 'fortress_undercroft': return 'Bastion Undercroft';
      case 'grotto': return 'Luminescent Grotto';
      case 'rift': return 'The Hollow Rift';
      default: return 'Ancient Ruins';
    }
  }

  private populateDungeonFoes(inst: DungeonInstance) {
    if (inst.type === 'crypt') {
      // Whispering Catacombs
      this.spawnDungeonFoe(inst, 'skel_1', 'Skeletal Knight', -4, -12, 110, 16);
      this.spawnDungeonFoe(inst, 'skel_2', 'Skeletal Knight', 4, -12, 110, 16);
      this.spawnDungeonFoe(inst, 'gravewarden', 'Gravewarden Malakar', 0, -42, 650, 26, true);
    } else if (inst.type === 'sunken_temple') {
      // Sunken Temple
      this.spawnDungeonFoe(inst, 'drowned_1', 'Drowned Guardian', -6, -14, 130, 18);
      this.spawnDungeonFoe(inst, 'drowned_2', 'Drowned Guardian', 6, -14, 130, 18);
      this.spawnDungeonFoe(inst, 'leviathan', 'Leviathan Construct', 0, -48, 750, 28, true);
    } else if (inst.type === 'fortress_undercroft') {
      // Bastion Undercroft
      this.spawnDungeonFoe(inst, 'guard_1', 'Cinderwatch Guard', -5, -15, 140, 20);
      this.spawnDungeonFoe(inst, 'guard_2', 'Cinderwatch Guard', 5, -15, 140, 20);
      this.spawnDungeonFoe(inst, 'cinder_capt', 'Captain of the Undercroft', 0, -44, 700, 30, true);
    } else if (inst.type === 'grotto') {
      // Luminescent Grotto
      this.spawnDungeonFoe(inst, 'crawler_1', 'Grotto Crawler', -6, -16, 120, 15);
      this.spawnDungeonFoe(inst, 'crawler_2', 'Grotto Crawler', 6, -16, 120, 15);
      this.spawnDungeonFoe(inst, 'matriarch', 'Cave Matriarch', 0, -45, 680, 25, true);
    } else if (inst.type === 'rift') {
      // Hollow Rift
      this.spawnDungeonFoe(inst, 'rift_warden', 'Rift Warden', 0, -38, 900, 32, true);
    }
  }

  private spawnDungeonFoe(inst: DungeonInstance, id: string, name: string, x: number, z: number, hp: number, dmg: number, boss = false) {
    const fullId = `${inst.id}_${id}`;
    const f = this.world.spawnFoe(fullId, name, x, z, {
      zone: inst.id,
      hp,
      dmg,
      boss
    });
    inst.foes.set(fullId, f);
  }
}
