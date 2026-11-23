// AETHERFALL — static game content (classes, items, skills, quests, dialogue, world definitions)
export const SAVE_VERSION = 1;
export const GAME_VERSION = '1.0.0';
export const VERSION_NAME = 'Broken Skies';
export const BUILD_DATE = 'November 2026';
export const GITHUB_REPO = 'https://github.com/l3xstud105/Aetherfall';
export const GITHUB_PAGES_URL = 'https://l3xstud105.github.io/Aetherfall/';
export const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-11',
    title: 'A Tale of Broken Skies — The 1.0 Master Release',
    highlights: [
      '4 Complete Underground Dungeons: Whispering Catacombs, Sunken Aether Temple, Bastion Undercroft, and Luminescent Grotto.',
      'Elemental Reaction Matrix: Conflagration, Superconductor, Vaporize (2×), Electro-Discharge, and Magma Eruption.',
      'Multi-Phase Boss Battles: Karreth, Gravewarden, Rift Warden, and Aether Colossus feature dynamic Phase II Enraged transformations.',
      'Timed 0.22s Perfect Parry with procedural metallic deflection chime and +60% counter attack multiplier.',
      'Rebuilt Ashenvale Outpost with dynamic reconstruction structures, Quartermaster Kaelen, and Rodrik Caravan merchant.',
      'Companion Perks: Active loyalty bonuses for Lyra, Ser Brann, Sister Iselle, Kestrel, and Corvin Vale.',
      'Consumable Food & Potion Buffs: Vitality, Warmth, Rage, Stoneskin, and Zephyr Tonic stat enhancements.',
      'Legendary Dungeon Relics: Sunken Dawn Relic, Voidheart Talisman, Heart of the Mountain, and Tempest Conduit.',
      'Cross-browser optimization, 60fps performance profiling, and complete desktop/web distribution.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-11',
    title: 'A Tale of Broken Skies — The 0.9 Overhaul',
    highlights: [
      'Unified Web & Desktop release architecture with automated GitHub Pages deployment.',
      '5-Element Magic System (Flame Slash, Frost Shield, Thunder Slam, Wind Step, Terra Wall).',
      'Advanced Combat: Poise & Stagger meter, Directional Blocking, Timed 0.22s Perfect Parry with stagger reflection and +60% counter buff.',
      'New Polearm weapon category: Iron Spear, Royal Halberd, and Aetherlance with 3.5m reach.',
      '5th Companion: Corvin Vale (Spellblade) with custom backstory quest in Thornwick.',
      'Real-Time Tactical Companion Orders (Follow, Defend, Attack, Hold) with hotkey T.',
      'New Enchanting profession, Enchanting Altar crafting station, and legendary recipes.',
      'New Foes & Bosses: Colossal Aether Golem world boss, Void Cultist camps, and Mountain Rams.',
      'Save Export & Import (JSON format) for transferring progression across web and desktop.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-10',
    title: 'Foundations of Valdoria',
    highlights: [
      '10 Playable Classes with custom 3D rigs and character creator.',
      '4 Kingdoms (Highcrown, Thornwick, Frostgate, Saltmere) with 520x520m open world.',
      'Enterable cut-away interiors and 4 purchaseable player homes with custom furniture.',
      'Peer-to-Peer WebRTC co-op multiplayer with room codes and shared time/weather.',
      '12-stage main questline with 4 distinct branching endings.',
      '100% Procedural WebAudio soundtrack with dynamic region and combat crossfading.',
    ],
  },
];

export const FACTIONS: Record<string, { name: string; color: string; desc: string }> = {
  crown: { name: 'Crown of Valdoria', color: '#d9a93c', desc: 'The old kingdom of the south, ruled from Highcrown. Its king lies dying while Duchess Maelis governs in his name.' },
  kharun: { name: 'Kharun Dominion', color: '#7fa3dc', desc: 'Mountain realm of Lord Vorn Kharun. Hard, proud, and at war with Valdoria over the fallen Spire.' },
  ashen: { name: 'Ashen Banner', color: '#d2603c', desc: 'Mercenary raiders who burned Ashenvale. Someone pays them in Valdorian crown coin.' },
  moon: { name: 'Moonwardens', color: '#6fd1a4', desc: 'Druidic rebels of the Thornwood who guard the glimmer groves and oppose both crowns.' },
  spire: { name: 'Spire Keepers', color: '#a98af5', desc: 'A secret society of mages tending the broken Spire and the prophecy of the Skyborn.' },
  league: { name: "Saltmere Traders' League", color: '#53bdd1', desc: 'Independent merchant-princes of the coast. They sell to anyone who pays.' },
};
export const repTier = (r: number) => (r <= -60 ? 'Hated' : r <= -20 ? 'Distrusted' : r < 20 ? 'Neutral' : r < 50 ? 'Friendly' : r < 80 ? 'Honored' : 'Revered');

export type Attrs = { str: number; dex: number; int: number; vit: number; wis: number };
export const ATTR_INFO: Record<string, { name: string; desc: string }> = {
  str: { name: 'Strength', desc: 'Melee damage and carrying capacity.' },
  dex: { name: 'Dexterity', desc: 'Ranged damage, critical chance, stamina.' },
  int: { name: 'Intellect', desc: 'Spell power and mana.' },
  vit: { name: 'Vitality', desc: 'Health, stamina and defence.' },
  wis: { name: 'Spirit', desc: 'Healing power, mana regeneration.' },
};

export const CLASSES: any[] = [
  { id: 'warrior', name: 'Warrior', icon: '⚔️', tag: 'Balanced melee fighter', desc: 'Adaptable and dependable. Sword, shield and mail; a little of everything.', attrs: { str: 7, dex: 5, int: 2, vit: 6, wis: 3 }, equip: { weapon: 'sword_iron', offhand: 'shield_wood', chest: 'chest_mail', feet: 'boots_leather' }, abilities: ['power_strike', 'war_cry'], branch: 'might' },
  { id: 'berserker', name: 'Berserker', icon: '🪓', tag: 'Aggressive close-range pressure', desc: 'Furs, fury and a heavy axe. Hits hard, wears little.', attrs: { str: 9, dex: 5, int: 1, vit: 6, wis: 1 }, equip: { weapon: 'axe_war', chest: 'chest_fur', feet: 'boots_leather' }, abilities: ['whirlwind', 'power_strike'], branch: 'might' },
  { id: 'archer', name: 'Archer', icon: '🏹', tag: 'Ranged precision', desc: 'Bow-first fighter who wins from a distance.', attrs: { str: 3, dex: 9, int: 2, vit: 4, wis: 3 }, equip: { weapon: 'bow_short', chest: 'chest_leather', feet: 'boots_leather', hands: 'gloves_leather' }, abilities: ['rapid_shot', 'piercing_shot'], branch: 'guile' },
  { id: 'mage', name: 'Mage', icon: '🔮', tag: 'Elemental spellcaster', desc: 'Fire, frost and storm answer to the Mage. Fragile but devastating.', attrs: { str: 1, dex: 3, int: 10, vit: 3, wis: 5 }, equip: { weapon: 'staff_oak', chest: 'chest_robe', feet: 'boots_cloth' }, abilities: ['fireball', 'frost_nova'], branch: 'arcana' },
  { id: 'rogue', name: 'Rogue', icon: '🗡️', tag: 'Stealth and trickery', desc: 'Quick blades, quick feet. Slips past what cannot be fought.', attrs: { str: 4, dex: 9, int: 3, vit: 4, wis: 2 }, equip: { weapon: 'dagger_iron', chest: 'chest_rogue', head: 'hood_rogue', feet: 'boots_leather' }, abilities: ['shadowstep', 'power_strike'], branch: 'guile' },
  { id: 'knight', name: 'Knight', icon: '🛡️', tag: 'Defensive bulwark', desc: 'Heavy plate and a tall shield. Holds the line.', attrs: { str: 6, dex: 3, int: 2, vit: 9, wis: 3 }, equip: { weapon: 'sword_iron', offhand: 'shield_kite', chest: 'chest_plate', head: 'helm_iron', hands: 'gauntlets_steel', feet: 'boots_iron' }, abilities: ['shield_wall', 'power_strike'], branch: 'spirit' },
  { id: 'healer', name: 'Healer', icon: '✨', tag: 'Restoration and protection', desc: 'Mender of wounds and weaver of wards.', attrs: { str: 1, dex: 3, int: 5, vit: 4, wis: 10 }, equip: { weapon: 'rod_mender', chest: 'chest_robe_white', feet: 'boots_cloth' }, abilities: ['heal', 'ward'], branch: 'spirit' },
  { id: 'paladin', name: 'Paladin', icon: '🔆', tag: 'Holy warrior', desc: 'Dawnlit hammer, golden plate. Smites foes and mends allies.', attrs: { str: 6, dex: 2, int: 3, vit: 7, wis: 6 }, equip: { weapon: 'hammer_holy', offhand: 'shield_holy', chest: 'chest_paladin', feet: 'boots_iron' }, abilities: ['smite', 'heal'], branch: 'spirit' },
  { id: 'hunter', name: 'Hunter', icon: '🦌', tag: 'Tracker and survivalist', desc: 'Reads the wilds, tracks quarry and gathers more from the land.', attrs: { str: 4, dex: 8, int: 2, vit: 5, wis: 4 }, equip: { weapon: 'bow_hunter', chest: 'chest_hunter', head: 'hood_hunter', feet: 'boots_leather' }, abilities: ['track', 'piercing_shot'], branch: 'wild' },
  { id: 'battlemage', name: 'Battlemage', icon: '⚡', tag: 'Spell-infused swordsman', desc: 'Runeblade in hand, lightning in the blood.', attrs: { str: 5, dex: 3, int: 7, vit: 5, wis: 3 }, equip: { weapon: 'sword_rune', chest: 'chest_battlemage', feet: 'boots_leather', hands: 'gloves_leather' }, abilities: ['arc_blade', 'fireball'], branch: 'arcana' },
];

export const ELEMENT_COLOR: Record<string, string> = { fire: '#ff7a2e', ice: '#7fe0ff', lightning: '#ffe85a', earth: '#a8805a', wind: '#d8f3ee', heal: '#7dff9c', protect: '#ffd86a', holy: '#fff0a0', aether: '#c08aff', phys: '#ffffff', none: '#ffffff' };

export const ABILITIES: Record<string, any> = {
  power_strike: { name: 'Power Strike', icon: '💥', el: 'phys', type: 'melee', res: 'sta', cost: 18, cd: 5, mult: 2.3, range: 3.2, desc: 'A crushing blow for 230% damage.' },
  whirlwind: { name: 'Whirlwind', icon: '🌀', el: 'phys', type: 'aoe', res: 'sta', cost: 30, cd: 9, mult: 1.6, radius: 4.2, desc: 'Spin and strike everything around you.' },
  war_cry: { name: 'War Cry', icon: '📣', el: 'phys', type: 'buff', res: 'sta', cost: 15, cd: 22, buff: 'rage', dur: 12, desc: '+35% damage for 12s.' },
  shield_wall: { name: 'Shield Wall', icon: '🛡️', el: 'protect', type: 'buff', res: 'sta', cost: 20, cd: 25, buff: 'wall', dur: 7, desc: 'Take 60% less damage for 7s.' },
  rapid_shot: { name: 'Rapid Shot', icon: '🏹', el: 'phys', type: 'volley', res: 'sta', cost: 22, cd: 8, mult: 0.9, count: 5, desc: 'Loose five arrows in a fan.' },
  piercing_shot: { name: 'Piercing Shot', icon: '🎯', el: 'phys', type: 'proj', res: 'sta', cost: 24, cd: 7, mult: 3, speed: 60, pierce: true, desc: 'A long, penetrating arrow.' },
  fireball: { name: 'Fireball', icon: '🔥', el: 'fire', type: 'proj', res: 'mana', cost: 25, cd: 4, mult: 2.4, speed: 26, radius: 3.2, desc: 'Explodes on impact in flame.' },
  frost_nova: { name: 'Frost Nova', icon: '❄️', el: 'ice', type: 'aoe', res: 'mana', cost: 30, cd: 10, mult: 1.4, radius: 6.5, slow: true, desc: 'Freezing burst that slows foes.' },
  chain_lightning: { name: 'Chain Lightning', icon: '⚡', el: 'lightning', type: 'chain', res: 'mana', cost: 28, cd: 6, mult: 1.7, hops: 4, desc: 'Arcs between up to four enemies.' },
  stone_spike: { name: 'Stone Spikes', icon: '⛰️', el: 'earth', type: 'line', res: 'mana', cost: 22, cd: 5, mult: 2.1, range: 14, desc: 'Spikes erupt in a line ahead.' },
  gale: { name: 'Gale', icon: '🌬️', el: 'wind', type: 'cone', res: 'mana', cost: 16, cd: 8, mult: 0.8, range: 9, knock: 14, desc: 'A blast of wind that shoves enemies away.' },
  heal: { name: 'Mending Light', icon: '💚', el: 'heal', type: 'heal', res: 'mana', cost: 30, cd: 6, amount: 0.4, desc: 'Restore 40% health to you and allies.' },
  ward: { name: 'Aegis Ward', icon: '🔰', el: 'protect', type: 'buff', res: 'mana', cost: 25, cd: 18, buff: 'ward', dur: 15, desc: 'Absorbs the next 60+ damage.' },
  smite: { name: 'Smite', icon: '☀️', el: 'holy', type: 'aoe', res: 'mana', cost: 25, cd: 6, mult: 2, radius: 4, heal: 0.08, desc: 'Holy fire that also mends you.' },
  shadowstep: { name: 'Shadowstep', icon: '🌑', el: 'aether', type: 'blink', res: 'sta', cost: 20, cd: 9, dist: 9, buff: 'shadow', dur: 4, desc: 'Blink forward; next strikes deal +100%.' },
  aether_rift: { name: 'Aether Rift', icon: '🌌', el: 'aether', type: 'blink', res: 'mana', cost: 40, cd: 14, dist: 20, mult: 2.5, radius: 5, desc: 'Tear the sky and step through, blasting the arrival.' },
  track: { name: 'Track', icon: '👣', el: 'none', type: 'buff', res: 'sta', cost: 10, cd: 20, buff: 'track', dur: 25, desc: 'Reveal nearby creatures and foes.' },
  arc_blade: { name: 'Arc Blade', icon: '🗲', el: 'lightning', type: 'melee', res: 'mana', cost: 20, cd: 5, mult: 2.4, range: 3.4, desc: 'Lightning-wreathed slash.' },
  meteor: { name: 'Meteorfall', icon: '☄️', el: 'fire', type: 'meteor', res: 'mana', cost: 70, cd: 40, mult: 6, radius: 8, desc: 'Call a burning stone from the broken sky.' },
  flame_slash: { name: 'Flame Slash', icon: '🗡️', el: 'fire', type: 'melee', res: 'sta', cost: 20, cd: 4, mult: 2.2, range: 3.4, desc: 'Ignited sweeping strike that scorches foes.' },
  frost_shield: { name: 'Glacial Ward', icon: '❄️', el: 'ice', type: 'buff', res: 'mana', cost: 26, cd: 20, buff: 'ice_ward', dur: 12, desc: 'Freezing barrier that slows attackers and reduces damage.' },
  thunder_slam: { name: 'Thunder Slam', icon: '⚡', el: 'lightning', type: 'aoe', res: 'sta', cost: 28, cd: 8, mult: 2.2, radius: 5.5, desc: 'Slam ground with lightning shockwave; shocks wet foes.' },
  wind_step: { name: 'Zephyr Step', icon: '🍃', el: 'wind', type: 'blink', res: 'sta', cost: 18, cd: 6, dist: 12, buff: 'speed', dur: 5, desc: 'Ride the wind forward; boosts glider flight.' },
  terra_wall: { name: 'Earthen Bastion', icon: '🪨', el: 'earth', type: 'buff', res: 'mana', cost: 24, cd: 22, buff: 'stone_armor', dur: 14, desc: 'Encase skin in granite; +25 defence and knockback resistance.' },
};

export const SKILLS: any[] = [
  { id: 'm1', branch: 'might', name: 'Hardened', tier: 1, cost: 1, lvl: 1, mods: { hp: 25 }, desc: '+25 max health.' },
  { id: 'm2', branch: 'might', name: 'Power Strike', tier: 2, cost: 1, lvl: 2, req: ['m1'], ability: 'power_strike' },
  { id: 'm3', branch: 'might', name: 'Weapon Mastery', tier: 2, cost: 1, lvl: 3, req: ['m1'], mods: { melee: 0.1 }, desc: '+10% melee damage.' },
  { id: 'm4', branch: 'might', name: 'Whirlwind', tier: 3, cost: 1, lvl: 4, req: ['m3'], ability: 'whirlwind' },
  { id: 'm5', branch: 'might', name: 'War Cry', tier: 3, cost: 1, lvl: 4, req: ['m2'], ability: 'war_cry' },
  { id: 'm6', branch: 'might', name: "Titan's Fury", tier: 4, cost: 3, lvl: 12, req: ['m4', 'm5'], mods: { melee: 0.25, steal: 0.05 }, desc: 'Legendary: +25% melee damage, 5% lifesteal.' },
  { id: 'm7', branch: 'might', name: 'Thunder Slam', tier: 4, cost: 2, lvl: 8, req: ['m4'], ability: 'thunder_slam' },
  { id: 'm8', branch: 'might', name: 'Juggernaut', tier: 4, cost: 2, lvl: 10, req: ['m3'], mods: { def: 12, hp: 35 }, desc: '+12 defence, +35 health, massive stagger resistance.' },
  { id: 'g1', branch: 'guile', name: 'Fleet Foot', tier: 1, cost: 1, lvl: 1, mods: { speed: 0.06 }, desc: '+6% movement speed.' },
  { id: 'g2', branch: 'guile', name: 'Rapid Shot', tier: 2, cost: 1, lvl: 2, req: ['g1'], ability: 'rapid_shot' },
  { id: 'g3', branch: 'guile', name: 'Keen Eye', tier: 2, cost: 1, lvl: 3, req: ['g1'], mods: { crit: 0.08 }, desc: '+8% critical chance.' },
  { id: 'g4', branch: 'guile', name: 'Shadowstep', tier: 3, cost: 1, lvl: 4, req: ['g3'], ability: 'shadowstep' },
  { id: 'g5', branch: 'guile', name: 'Piercing Shot', tier: 3, cost: 1, lvl: 4, req: ['g2'], ability: 'piercing_shot' },
  { id: 'g6', branch: 'guile', name: 'Phantom', tier: 4, cost: 3, lvl: 12, req: ['g4', 'g5'], mods: { crit: 0.15, ranged: 0.15 }, desc: 'Legendary: +15% crit, +15% ranged damage.' },
  { id: 'g7', branch: 'guile', name: 'Zephyr Step', tier: 3, cost: 1, lvl: 5, req: ['g1'], ability: 'wind_step' },
  { id: 'g8', branch: 'guile', name: 'Executioner', tier: 4, cost: 2, lvl: 10, req: ['g3'], mods: { crit: 0.12, speed: 0.05 }, desc: '+12% critical strike chance, +5% move speed.' },
  { id: 'a1', branch: 'arcana', name: 'Mana Well', tier: 1, cost: 1, lvl: 1, mods: { mana: 30 }, desc: '+30 max mana.' },
  { id: 'a2', branch: 'arcana', name: 'Fireball', tier: 2, cost: 1, lvl: 2, req: ['a1'], ability: 'fireball' },
  { id: 'a3', branch: 'arcana', name: 'Frost Nova', tier: 2, cost: 1, lvl: 3, req: ['a1'], ability: 'frost_nova' },
  { id: 'a4', branch: 'arcana', name: 'Chain Lightning', tier: 3, cost: 1, lvl: 4, req: ['a2'], ability: 'chain_lightning' },
  { id: 'a5', branch: 'arcana', name: 'Stone Spikes', tier: 3, cost: 1, lvl: 4, req: ['a3'], ability: 'stone_spike' },
  { id: 'a6', branch: 'arcana', name: 'Gale', tier: 3, cost: 1, lvl: 5, req: ['a3'], ability: 'gale' },
  { id: 'a7', branch: 'arcana', name: 'Arc Blade', tier: 3, cost: 1, lvl: 5, req: ['a2'], ability: 'arc_blade' },
  { id: 'a8', branch: 'arcana', name: 'Aether Rift', tier: 4, cost: 2, lvl: 9, req: ['a4'], ability: 'aether_rift', desc: 'Ancient dimension magic.' },
  { id: 'a9', branch: 'arcana', name: 'Meteorfall', tier: 5, cost: 3, lvl: 15, req: ['a8', 'a5'], ability: 'meteor' },
  { id: 'a10', branch: 'arcana', name: 'Spellweaver', tier: 4, cost: 2, lvl: 8, req: ['a4'], mods: { magic: 0.2 }, desc: '+20% spell damage.' },
  { id: 'a11', branch: 'arcana', name: 'Flame Slash', tier: 3, cost: 1, lvl: 5, req: ['a2'], ability: 'flame_slash' },
  { id: 'a12', branch: 'arcana', name: 'Prismatic Focus', tier: 4, cost: 2, lvl: 10, req: ['a10'], mods: { magic: 0.15, mana: 40 }, desc: '+15% elemental magic damage, +40 max mana.' },
  { id: 's1', branch: 'spirit', name: 'Resolve', tier: 1, cost: 1, lvl: 1, mods: { def: 5 }, desc: '+5 defence.' },
  { id: 's2', branch: 'spirit', name: 'Mending Light', tier: 2, cost: 1, lvl: 2, req: ['s1'], ability: 'heal' },
  { id: 's3', branch: 'spirit', name: 'Aegis Ward', tier: 2, cost: 1, lvl: 3, req: ['s1'], ability: 'ward' },
  { id: 's4', branch: 'spirit', name: 'Smite', tier: 3, cost: 1, lvl: 4, req: ['s2'], ability: 'smite' },
  { id: 's5', branch: 'spirit', name: 'Shield Wall', tier: 3, cost: 1, lvl: 4, req: ['s3'], ability: 'shield_wall' },
  { id: 's6', branch: 'spirit', name: 'Avatar of Dawn', tier: 4, cost: 3, lvl: 12, req: ['s4', 's5'], mods: { regen: 2, def: 10, hp: 40 }, desc: 'Legendary: regeneration, +10 defence, +40 health.' },
  { id: 's7', branch: 'spirit', name: 'Glacial Ward', tier: 3, cost: 1, lvl: 5, req: ['s3'], ability: 'frost_shield' },
  { id: 's8', branch: 'spirit', name: 'Divine Bastion', tier: 4, cost: 2, lvl: 10, req: ['s5'], mods: { def: 10, regen: 1.0 }, desc: '+10 defence, increased natural recovery.' },
  { id: 'w1', branch: 'wild', name: 'Tracker', tier: 1, cost: 1, lvl: 1, ability: 'track' },
  { id: 'w2', branch: 'wild', name: 'Forager', tier: 2, cost: 1, lvl: 2, req: ['w1'], mods: { gather: 0.5 }, desc: '50% chance of extra yield when gathering.' },
  { id: 'w3', branch: 'wild', name: 'Trailblazer', tier: 2, cost: 1, lvl: 3, req: ['w1'], mods: { speed: 0.08, sta: 20 }, desc: '+8% speed, +20 stamina.' },
  { id: 'w4', branch: 'wild', name: 'Beast Lore', tier: 3, cost: 1, lvl: 5, req: ['w2'], mods: { ranged: 0.1, hp: 20 }, desc: '+10% ranged damage, +20 health.' },
  { id: 'w5', branch: 'wild', name: 'Second Wind', tier: 3, cost: 2, lvl: 7, req: ['w3'], mods: { regen: 1.5, sta: 30 }, desc: 'Faster recovery, +30 stamina.' },
  { id: 'w6', branch: 'wild', name: 'Earthen Bastion', tier: 3, cost: 1, lvl: 6, req: ['w3'], ability: 'terra_wall' },
  { id: 'w7', branch: 'wild', name: 'Apex Predator', tier: 4, cost: 2, lvl: 10, req: ['w4'], mods: { ranged: 0.15, melee: 0.1 }, desc: '+15% ranged damage, +10% melee damage.' },
];
export const BRANCHES: Record<string, { name: string; title: string; color: string }> = {
  might: { name: 'Might', title: 'Warblade', color: '#e0724a' }, guile: { name: 'Guile', title: 'Shadowhand', color: '#79c978' },
  arcana: { name: 'Arcana', title: 'Spellwright', color: '#8f8cf5' }, spirit: { name: 'Spirit', title: 'Lightbearer', color: '#f3d36b' }, wild: { name: 'Wild', title: 'Wayfinder', color: '#57c9b0' },
};

// ----- ITEMS -----
export type Item = { id: string; name: string; type: string; slot?: string; kind?: string; rarity: string; value: number; weight: number; desc: string; atk?: number; def?: number; mag?: number; hp?: number; mana?: number; speed?: number; style?: string; color?: string; bound?: string; req?: any; use?: any; two?: boolean };
export const ITEMS: Record<string, Item> = {};
const add = (id: string, name: string, type: string, rarity: string, value: number, weight: number, desc: string, x: any = {}) => { ITEMS[id] = { id, name, type, rarity, value, weight, desc, ...x }; };
const W = (id: string, name: string, kind: string, rarity: string, atk: number, value: number, desc: string, x: any = {}) => add(id, name, 'weapon', rarity, value, kind === 'greatsword' ? 6 : kind === 'hammer' ? 5 : kind === 'dagger' ? 1 : 3, desc, { slot: 'weapon', kind, atk, ...x });
const A = (id: string, name: string, slot: string, rarity: string, def: number, value: number, desc: string, x: any = {}) => add(id, name, 'armor', rarity, value, slot === 'chest' ? 8 : slot === 'offhand' ? 5 : 2, desc, { slot, def, ...x });
W('sword_iron', 'Iron Sword', 'sword', 'common', 12, 60, 'A plain, honest blade.', { color: '#b8c0c8' });
W('sword_steel', 'Steel Longsword', 'sword', 'uncommon', 18, 220, 'Well-balanced steel.', { color: '#d5dde6', req: { lvl: 3 } });
W('sword_rune', 'Runeblade', 'sword', 'rare', 20, 480, 'Etched with storm-runes. Crackles faintly.', { color: '#9fc4ff', bound: 'lightning', mag: 6 });
W('sword_flame', 'Emberbrand', 'sword', 'epic', 30, 1500, 'Forged in the Sundering fires. Burns what it cuts.', { color: '#ff8a3a', bound: 'fire', req: { lvl: 8 } });
W('sword_aether', 'Skybreaker', 'sword', 'legendary', 48, 9000, 'Sky-metal that remembers falling. Weapon-bound aether magic.', { color: '#c9a2ff', bound: 'aether', mag: 12, req: { lvl: 10 } });
W('sunshard_rapier', 'Sunshard Rapier', 'sword', 'epic', 32, 2200, 'A gilded rapier infused with radiant solar flame.', { color: '#ffb338', bound: 'fire', mag: 8, req: { lvl: 7 } });
W('void_cleaver', 'Void Cleaver', 'greatsword', 'epic', 42, 2600, 'Heavy dark blade that slices through dimensional fabric.', { color: '#683cb0', bound: 'aether', two: true, req: { lvl: 8 } });
W('spear_iron', 'Iron Spear', 'spear', 'common', 15, 80, 'Thrusting spear with superior reach.', { color: '#a0aab6', two: true });
W('halberd_royal', 'Royal Halberd', 'spear', 'rare', 28, 750, 'Gilded halberd of the Highcrown Palace Guard.', { color: '#d9a93c', two: true, req: { lvl: 6 } });
W('spear_aether', 'Aetherlance', 'spear', 'legendary', 46, 8500, 'Forged from fallen sky-metal; crackles with aether energy.', { color: '#c0a2ff', bound: 'aether', mag: 14, two: true, req: { lvl: 10 } });
W('sword_kharun_king', 'Frostbite Cleaver', 'greatsword', 'epic', 39, 2400, 'Lord Kharun\'s vanguard blade; permanently rimed in frost.', { color: '#7fe0ff', bound: 'ice', two: true, req: { lvl: 8 } });
W('dagger_whisper', 'Void Whisper', 'dagger', 'epic', 25, 2100, 'A blade folded in the shadows between dimensions.', { color: '#9060ff', bound: 'aether', req: { lvl: 8 } });
W('sword_flame_brand', 'Ashen Flameblade', 'sword', 'epic', 24, 650, 'Forged in the ruins of Ashenvale; strikes ignite foes in searing flame.', { bound: 'fire', color: '#ff6a20' });
W('bow_stormstrider', 'Stormstrider Bow', 'bow', 'epic', 26, 700, 'Looses crackling lightning arrows that shock foes.', { bound: 'lightning', color: '#ffd440', two: true });
W('staff_abyssal', 'Abyssal Scepter', 'staff', 'epic', 30, 750, 'Dredged from the sunken temple. Chills the air to freezing frost.', { bound: 'ice', color: '#7ad4ff', two: true });
W('greatsword_earthshaker', 'Earthshaker Greatsword', 'greatsword', 'epic', 34, 800, 'Crushing stone-edged blade capable of shattering armor and triggering magma.', { bound: 'earth', two: true, color: '#9a8060' });
W('bow_celestial', 'Sunstriker Bow', 'bow', 'legendary', 38, 8800, 'Fires arrows woven from pure dawn light.', { color: '#ffd24a', bound: 'fire', mag: 10, two: true, req: { lvl: 10 } });
W('greatsword_iron', 'Iron Greatsword', 'greatsword', 'common', 22, 160, 'Slow, heavy, two-handed.', { color: '#aab3bc', two: true });
W('greatsword_kharun', 'Dominion Cleaver', 'greatsword', 'rare', 34, 900, 'Black steel of the Kharun forges.', { color: '#5b6577', two: true, req: { lvl: 6 } });
W('axe_hand', 'Hand Axe', 'axe', 'common', 11, 50, 'Chops wood and skulls alike.', { color: '#9a8a78' });
W('axe_war', 'Reaver War-Axe', 'axe', 'uncommon', 20, 260, 'Broad-bladed berserker axe.', { color: '#c0b4a8', two: true });
W('axe_frost', 'Rimecleaver', 'axe', 'rare', 28, 950, 'Rimed with permanent frost.', { color: '#8fdcff', bound: 'ice', req: { lvl: 6 } });
W('hammer_smith', "Smith's Hammer", 'hammer', 'common', 14, 70, 'A tool turned weapon.', { color: '#8a8f97' });
W('hammer_holy', 'Dawnmaul', 'hammer', 'uncommon', 21, 300, 'Warm to the touch. Blessed at the Dawn Rite.', { color: '#f1d98a', bound: 'holy', mag: 4 });
W('dagger_iron', 'Iron Dagger', 'dagger', 'common', 8, 40, 'Fast and easy to hide.', { color: '#b3bac2' });
W('dagger_shadow', 'Nightsting', 'dagger', 'rare', 17, 700, 'Drinks the light around it.', { color: '#6d5a99', bound: 'aether', req: { lvl: 5 } });
W('bow_short', 'Shortbow', 'bow', 'common', 11, 55, 'Light and quick.', { color: '#8a6a44', two: true });
W('bow_hunter', "Hunter's Bow", 'bow', 'uncommon', 16, 240, 'Yew bow tuned for the wild.', { color: '#7a5a38', two: true });
W('bow_long', 'Longbow', 'bow', 'uncommon', 19, 280, 'Long reach, heavy draw.', { color: '#6e4f2f', two: true });
W('bow_moon', 'Moonwarden Bow', 'bow', 'rare', 27, 1100, 'Silver-strung. Arrows glow with moonlight.', { color: '#9ee8d0', bound: 'wind', two: true, req: { lvl: 6 } });
W('crossbow_light', 'Light Crossbow', 'bow', 'uncommon', 18, 260, 'Mechanical, reliable, loud.', { color: '#5f4a38', two: true });
W('staff_oak', 'Oak Staff', 'staff', 'common', 6, 60, 'Channels raw aether into bolts.', { color: '#8c6a43', mag: 8, two: true });
W('staff_ember', 'Ember Staff', 'staff', 'uncommon', 8, 320, 'Weapon-bound fire magic.', { color: '#ff7a2e', mag: 14, bound: 'fire', two: true });
W('staff_storm', 'Stormcaller', 'staff', 'rare', 9, 880, 'Weapon-bound lightning.', { color: '#ffe85a', mag: 20, bound: 'lightning', two: true, req: { lvl: 6 } });
W('staff_frost', 'Winterbloom Staff', 'staff', 'rare', 9, 880, 'Weapon-bound ice.', { color: '#7fe0ff', mag: 20, bound: 'ice', two: true, req: { lvl: 6 } });
W('rod_mender', "Mender's Rod", 'staff', 'common', 4, 70, 'A healer\'s rod; its bolts mend allies.', { color: '#9fe7a8', mag: 8, bound: 'heal' });
W('tome_ancient', 'Tome of Hollow Light', 'staff', 'epic', 10, 2000, 'Ancient, dimension-touched magic.', { color: '#b78cff', mag: 28, bound: 'aether', req: { lvl: 10 } });
A('shield_wood', 'Wooden Shield', 'offhand', 'common', 4, 40, 'Round, banded with iron.', { color: '#8a6a44', kind: 'shield' });
A('shield_kite', 'Kite Shield', 'offhand', 'uncommon', 8, 210, 'Tall and sturdy.', { color: '#9aa4b4', kind: 'shield' });
A('shield_tower', 'Tower Shield', 'offhand', 'rare', 14, 700, 'A moving wall.', { color: '#6b7584', kind: 'shield', req: { lvl: 6 } });
A('shield_holy', 'Sunward Shield', 'offhand', 'uncommon', 9, 320, 'Gilded with a rising sun.', { color: '#f1d98a', kind: 'shield', mana: 10 });
A('shield_aegis', 'Aegis of the Dawn', 'offhand', 'epic', 18, 1600, 'Sanctified buckler that expands your parry window.', { color: '#ffd24a', kind: 'shield', mana: 25, req: { lvl: 7 } });
A('shield_bastion', 'Bastion Bulwark', 'offhand', 'epic', 24, 600, 'Heavy iron-reinforced shield from the forgotten fortress.', { color: '#4a5060', kind: 'shield', hp: 40 });
A('chest_voidwalker', 'Voidwalker Vestments', 'chest', 'epic', 18, 900, 'Enchanted robes woven with void essence and celestial silk.', { style: 'robe', color: '#3a2060', mag: 20, mana: 40, req: { lvl: 6 } });
A('chest_cloth', 'Traveller\'s Tunic', 'chest', 'common', 2, 20, 'Simple wool.', { style: 'cloth', color: '#7b6a50' });
A('chest_robe', 'Apprentice Robe', 'chest', 'common', 3, 50, 'Blue wool robe.', { style: 'robe', color: '#3f58b5', mana: 15 });
A('chest_robe_white', "Mender's Robe", 'chest', 'common', 3, 55, 'White and gold.', { style: 'robe', color: '#e9e4d3', mana: 12, hp: 10 });
A('chest_leather', 'Leather Jerkin', 'chest', 'common', 5, 70, 'Boiled leather.', { style: 'leather', color: '#7a5636' });
A('chest_rogue', 'Shadowhide Vest', 'chest', 'uncommon', 6, 180, 'Dark and quiet.', { style: 'leather', color: '#2c2f3d' });
A('chest_hunter', 'Ranger Coat', 'chest', 'uncommon', 6, 180, 'Forest green leathers.', { style: 'leather', color: '#4a6b3a' });
A('chest_fur', 'Fur Mantle', 'chest', 'common', 5, 80, 'Wolf pelts over bare muscle.', { style: 'fur', color: '#6d5a48', hp: 15 });
A('chest_mail', 'Chainmail Hauberk', 'chest', 'uncommon', 10, 240, 'Riveted rings.', { style: 'chain', color: '#8e99a6' });
A('chest_plate', 'Knight\'s Plate', 'chest', 'rare', 16, 800, 'Heavy steel plate.', { style: 'plate', color: '#a4aebb', req: { lvl: 4 } });
A('chest_paladin', 'Dawnplate', 'chest', 'rare', 14, 760, 'White steel and gold.', { style: 'plate', color: '#eee7cf', mana: 15 });
A('chest_battlemage', 'Runed Hauberk', 'chest', 'uncommon', 8, 300, 'Chain under a blue surcoat.', { style: 'chain', color: '#4d6fd0', mana: 20 });
A('chest_moon', 'Moonweave Coat', 'chest', 'rare', 9, 640, 'Thornwood silk, impossibly light.', { style: 'robe', color: '#4bb89a', mana: 20, speed: 0.04 });
A('chest_kharun', 'Dominion Warplate', 'chest', 'epic', 22, 1800, 'Frostforged black plate.', { style: 'plate', color: '#4c5668', req: { lvl: 8 } });
A('chest_skyborn', 'Skyborn Regalia', 'chest', 'legendary', 24, 8500, 'Resplendent celestial armor that hums with ancient power.', { style: 'plate', color: '#c0a2ff', hp: 50, mana: 50, speed: 0.05, req: { lvl: 10 } });
A('robe_archmage', 'Archmage Robe', 'chest', 'epic', 9, 2200, 'Embroidered with elemental silver thread.', { style: 'robe', color: '#2b1a50', mana: 50, mag: 16, req: { lvl: 8 } });
A('robe_arcane', 'Arcane Robes', 'chest', 'rare', 7, 720, 'Finely woven silk steeped in elemental conduits.', { style: 'robe', color: '#6d4bc2', mana: 30, mag: 8, req: { lvl: 5 } });
A('helm_iron', 'Iron Helm', 'head', 'common', 4, 60, 'Plain and sturdy.', { style: 'helm', color: '#9ca6b2' });
A('helm_knight', 'Great Helm', 'head', 'rare', 9, 520, 'Full-face visor.', { style: 'helm', color: '#b0b9c5', req: { lvl: 5 } });
A('hood_rogue', 'Shadow Hood', 'head', 'uncommon', 3, 100, 'Deep hood.', { style: 'hood', color: '#2c2f3d' });
A('hood_hunter', 'Ranger Hood', 'head', 'uncommon', 3, 100, 'Leaf-green hood.', { style: 'hood', color: '#4a6b3a' });
A('circlet_sage', 'Sage\'s Circlet', 'head', 'epic', 5, 1400, 'Gold circlet that hums with aether.', { style: 'circlet', color: '#f0cd6a', mana: 40, mag: 6 });
A('helm_skyborn', 'Skyborn Crown', 'head', 'legendary', 10, 4000, 'Gilded crown bearing the constellation of the Spire.', { style: 'circlet', color: '#ffd24a', mana: 30, hp: 30 });
A('gloves_leather', 'Leather Gloves', 'hands', 'common', 2, 30, 'Worn but warm.', { color: '#6a4a2c' });
A('gauntlets_steel', 'Steel Gauntlets', 'hands', 'uncommon', 5, 160, 'Articulated plates.', { color: '#aab3be' });
A('gloves_spellweave', 'Spellweave Wraps', 'hands', 'rare', 5, 600, 'Woven from moon-silk and silver wire.', { color: '#3a2a6a', mag: 8 });
A('boots_cloth', 'Cloth Shoes', 'feet', 'common', 1, 15, 'Thin soles.', { color: '#5a4a38' });
A('boots_leather', 'Leather Boots', 'feet', 'common', 2, 30, 'Broken in.', { color: '#5a3d24' });
A('boots_iron', 'Iron Greaves', 'feet', 'uncommon', 5, 150, 'Clanking and solid.', { color: '#8e98a4' });
A('boots_swift', 'Windrunner Boots', 'feet', 'rare', 3, 700, 'Light as a gust.', { color: '#b6e6dc', speed: 0.08 });
A('boots_skyborn', 'Void Striders', 'feet', 'legendary', 7, 3500, 'Treads upon air as lightly as stone.', { color: '#9080ff', speed: 0.12, mana: 20 });
A('ring_vigor', 'Ring of Vigor', 'ring', 'uncommon', 0, 250, '+30 health.', { hp: 30, color: '#e06a5a' });
A('ring_arcane', 'Ring of the Well', 'ring', 'uncommon', 0, 250, '+30 mana.', { mana: 30, color: '#6a7ae0' });
A('ring_smith', "Ysolde's Signet", 'ring', 'rare', 3, 500, 'A smith\'s signet: +4 defence, +15 health.', { hp: 15, color: '#d9a93c' });
A('ring_elements', 'Ring of Five Winds', 'ring', 'epic', 3, 1400, 'Attuned to all five elements.', { mag: 10, hp: 25, mana: 25, color: '#40d0e0' });
A('amulet_ward', 'Amulet of Warding', 'amulet', 'rare', 6, 600, 'Pale blue ward-stone.', { color: '#8fd3ff' });
A('amulet_lore', 'Loremaster\'s Pendant', 'amulet', 'epic', 4, 1500, 'Reward for those who read the Sundering. +40 mana.', { mana: 40, color: '#e5c27a' });
A('amulet_skyborn', 'Skyborn Sigil', 'amulet', 'legendary', 10, 8000, 'It matches the mark on your palm. +60 health, +60 mana.', { hp: 60, mana: 60, color: '#c8a3ff', speed: 0.05 });
A('amulet_eternity', 'Amulet of Broken Skies', 'amulet', 'legendary', 8, 7500, 'Pulsing core fragment of the central Spire.', { hp: 50, mana: 50, color: '#e0b040', speed: 0.04 });
A('relic_sunken_dawn', 'Sunken Dawn Relic', 'amulet', 'legendary', 14, 2500, 'Recovered from the Whispering Catacombs. Mends the bearer and empowers holy magic.', { mag: 16, hp: 40, mana: 30, color: '#f7d070' });
A('relic_void_heart', 'Voidheart Talisman', 'amulet', 'legendary', 12, 2800, 'Pulsating void core from the sunken temple. Critical strikes hum with dark resonance.', { mag: 18, atk: 12, crit: 0.1, color: '#7a40c0' });
A('relic_earth_core', 'Heart of the Mountain', 'amulet', 'legendary', 18, 2400, 'Dense petrified core from the underground river grotto. Unflinching stagger resistance.', { def: 18, hp: 60, color: '#a08050' });
A('relic_storm_shard', 'Tempest Conduit', 'ring', 'legendary', 10, 2600, 'Crackling lightning fragment from the high skies. Accelerates movement and shock conduction.', { mag: 14, speed: 0.1, color: '#ffe250' });
const C = (id: string, name: string, v: number, desc: string, use: any, rarity = 'common') => add(id, name, 'consumable', rarity, v, 0.3, desc, { use });
C('potion_health', 'Healing Potion', 25, 'Restores 60 health.', { hp: 60 });
C('potion_health_big', 'Greater Healing Potion', 80, 'Restores 160 health.', { hp: 160 }, 'uncommon');
C('potion_mana', 'Mana Draught', 30, 'Restores 60 mana.', { mana: 60 });
C('potion_stamina', 'Stamina Tonic', 20, 'Restores 80 stamina.', { sta: 80 });
C('potion_rejuvenation', 'Rejuvenation Draught', 95, 'Restores 120 health and 100 mana.', { hp: 120, mana: 100, buff: 'vitality', dur: 90 }, 'rare');
C('elixir_might', 'Elixir of Might', 90, '+30% damage for 2 minutes.', { buff: 'rage', dur: 120 }, 'rare');
C('elixir_stoneskin', 'Stoneskin Elixir', 80, '+25 defence for 2 minutes.', { buff: 'wall', dur: 120 }, 'rare');
C('elixir_speed', 'Zephyr Tonic', 60, '+15% move speed for 2 minutes.', { buff: 'speed', dur: 120 }, 'uncommon');
C('apple_cider', 'Spiced Apple Cider', 18, 'Steaming hot cider that restores 30 stamina and warms against mountain blizzards.', { sta: 30, hp: 20, buff: 'warmth', dur: 120 });
ITEMS.cider = ITEMS.apple_cider;
ITEMS.sword_ashen_flame = ITEMS.sword_flame_brand;
ITEMS.relic_sunken = ITEMS.relic_sunken_dawn;
ITEMS.relic_voidheart = ITEMS.relic_void_heart;
ITEMS.relic_mountain = ITEMS.relic_earth_core;
ITEMS.relic_tempest = ITEMS.relic_storm_shard;
C('bread', 'Fresh Bread', 4, 'Restores 20 health.', { hp: 20 });
C('stew', 'Hearty Stew', 14, 'Restores 70 health and 40 stamina.', { hp: 70, sta: 40 });
C('roast_meat', 'Roast Venison', 12, 'Restores 55 health.', { hp: 55 });
C('grilled_fish', 'Grilled Fish', 10, 'Restores 45 health and 30 stamina.', { hp: 45, sta: 30 });
C('berry_tart', 'Berry Tart', 12, 'Restores 30 health and 40 mana.', { hp: 30, mana: 40 });
C('apple', 'Apple', 2, 'Restores 10 health.', { hp: 10 });
const M = (id: string, name: string, v: number, w: number, desc: string, rarity = 'common', x: any = {}) => add(id, name, 'material', rarity, v, w, desc, x);
M('iron_ore', 'Iron Ore', 6, 1.5, 'Raw iron.'); M('coal', 'Coal', 4, 1, 'Burns hot.'); M('silver_ore', 'Silver Ore', 25, 1.5, 'Gleaming silver.', 'uncommon');
M('iron_ingot', 'Iron Ingot', 18, 1, 'Smelted iron.'); M('steel_ingot', 'Steel Ingot', 45, 1, 'Iron folded with coal.', 'uncommon');
M('leather', 'Leather', 8, 0.5, 'Tanned hide.'); M('hide', 'Raw Hide', 5, 1, 'Needs tanning.'); M('meat_raw', 'Raw Meat', 5, 0.5, 'Fresh from the hunt.'); M('fish_raw', 'Fresh Fish', 6, 0.4, 'Still flopping.');
M('herb_red', 'Redroot', 5, 0.1, 'A healing herb.'); M('herb_blue', 'Frostbloom', 6, 0.1, 'A cold-growing herb with mana in the petals.'); M('moonpetal', 'Moonpetal', 30, 0.1, 'Glows under moonlight.', 'rare'); M('mushroom', 'Glowcap', 7, 0.1, 'Faintly luminous.'); M('berry', 'Wild Berries', 3, 0.1, 'Sweet.');
M('wheat', 'Wheat', 3, 0.3, 'Golden stalks.'); M('flour', 'Flour', 6, 0.5, 'Milled wheat.'); M('turnip', 'Turnip', 4, 0.4, 'Hardy root.'); M('seed_turnip', 'Turnip Seeds', 3, 0.05, 'Plant at a farm plot.'); M('seed_wheat', 'Wheat Seeds', 3, 0.05, 'Plant at a farm plot.');
M('feather', 'Feather', 2, 0.05, 'Fletching.'); M('pelt', 'Wolf Pelt', 18, 1, 'Thick fur.'); M('fang', 'Fang', 10, 0.1, 'Sharp.'); M('bone', 'Bone', 3, 0.5, 'Brittle.'); M('aether_dust', 'Aether Dust', 40, 0.1, 'Drifts upward when released.', 'rare'); M('gem_ruby', 'Ruby', 150, 0.1, 'Blood-red gem.', 'rare');
M('gem_sapphire', 'Sapphire', 150, 0.1, 'Glinting ice-blue gemstone.', 'rare');
M('gem_topaz', 'Topaz', 150, 0.1, 'Crackling golden-yellow gemstone.', 'rare');
M('gem_emerald', 'Emerald', 150, 0.1, 'Verdant green stone with deep earth energy.', 'rare');
M('aether_core', 'Aether Core', 220, 0.5, 'Crystalline heart of a dimensional entity.', 'epic');
M('quicksilver', 'Quicksilver Ore', 45, 1.2, 'Rare liquid metal extracted from deep veins.', 'rare');
M('enchanted_timber', 'Warded Timber', 25, 2, 'Heartwood treated with fire-resistant resins.', 'uncommon');
M('void_essence', 'Void Essence', 65, 0.2, 'Swirling dark vapor harnessed from void creatures.', 'rare');
add('treasure_map_coast', 'Treasure Map: Coastal Ruin', 'map', 'rare', 120, 0.1, 'Parchment sketch: Near the ruined lighthouse and chapel bluff, where salt spray meets stone.');
add('treasure_map_peaks', 'Treasure Map: Whispering Peak', 'map', 'rare', 140, 0.1, 'Faded parchment: Northwest along the snowy ridge of Frostgate, beneath the lone mountain evergreen.');
add('treasure_map_woods', 'Treasure Map: Ancient Oak', 'map', 'rare', 130, 0.1, 'Mossy charcoal sketch: Deep west within the Thornwood, three paces from the northern monolith.');
add('sunken_relic', 'Sunken Relic', 'collectible', 'rare', 350, 1, 'Barnacle-encrusted golden artifact from the Sunken Veil.');
add('banner_token', 'Ashen Banner Token', 'quest', 'common', 0, 0.1, 'A cinder-black brass token stamped with a burning banner.');
add('locket', 'Burned Locket', 'quest', 'common', 0, 0.1, 'Recovered from the ashes of Ashenvale. Contains a half-melted portrait.');
add('maelis_letter', "Maelis's Letter", 'quest', 'legendary', 0, 0.1, 'A sealed order to the Ashen Banner, bearing the Duchess\'s own signet. Proof of betrayal.');
add('shard_sky', 'Sky Shard', 'quest', 'epic', 0, 1, 'An aether shard that floats a hand above your palm.');
add('shard_deep', 'Deep Shard', 'quest', 'epic', 0, 1, 'A shard heavy with buried aether.');
add('shard_ember', 'Ember Shard', 'quest', 'epic', 0, 1, 'A shard warm as a coal.');
add('crate_manifest', 'Smuggler Manifest', 'quest', 'uncommon', 0, 0.1, 'A ledger of stolen League cargo and its buyers.');
add('golden_carp', 'Golden Carp', 'collectible', 'epic', 400, 1, 'A fish of impossible gold. Collectors would pay a fortune.');
const LORE = [
  ['The Sundering', 'In the hundred-and-first year of the Spire, the sky split along its seams. Islands of stone rose; rain fell upward for a day.'],
  ['Skyborn Prophecy I', '"One marked by the fallen sky shall walk the broken roads. They will mend what was sundered, or finish it."'],
  ['Skyborn Prophecy II', '"Three shards, three keys. Sky, Deep and Ember. Only the marked may carry all three through the Hollow Door."'],
  ['Valdoria\'s Founding', 'King Aldric the First raised Highcrown on the last stretch of ground the Sundering did not take.'],
  ['The Dominion Oath', 'Kharun swore never to kneel to a crown that let the sky fall. The war began over a single stolen shard.'],
  ['A Moonwarden\'s Diary', 'The glimmerstags will not approach armoured feet. Remove your boots, let them smell the moss.'],
  ['The Smith\'s Rule', 'Steel is iron that has argued with fire and lost. — Ysolde\'s grandmother'],
  ['Saltmere Ledger', 'Three barrels of "wine" that clink like coin. The harbormaster does not ask. The harbormaster has never asked.'],
  ['The Hollow Door', 'Beyond the Spire lies a place where up is only a suggestion. The Warden there was once a Keeper.'],
  ['Ashenvale Hymn', 'Ashes on the water, ashes on the stone, someone left a candle in the house that was your own.'],
  ['The Drowned Lantern', 'A lighthouse lit for a ship that sank before the Sundering; it still burns blue on moonless nights.'],
  ['Letters from the Wall', 'The wall at Frostgate is thirty feet of stone and a hundred of grudges.'],
];
LORE.forEach(([n, d], i) => add('lore_' + (i + 1), 'Lore: ' + n, 'collectible', 'uncommon', 20, 0.1, d));
add('relic_idol', 'Sunken Idol', 'collectible', 'rare', 300, 1, 'A gold idol of a bird with a sun for a heart.');
add('relic_crown', 'Fallen King\'s Circlet', 'collectible', 'rare', 500, 1, 'Dented, centuries old.');

export const RARITY_COLOR: Record<string, string> = { common: '#c9c3b6', uncommon: '#6fd17e', rare: '#5aa9f5', epic: '#b66bf0', legendary: '#f2a93b' };

export const RECIPES: any[] = [
  { id: 'iron_ingot', name: 'Smelt Iron Ingot', station: 'smithy', prof: 'blacksmithing', lvl: 1, in: { iron_ore: 2, coal: 1 }, out: { iron_ingot: 1 }, xp: 8 },
  { id: 'steel_ingot', name: 'Forge Steel Ingot', station: 'smithy', prof: 'blacksmithing', lvl: 3, in: { iron_ingot: 2, coal: 2 }, out: { steel_ingot: 1 }, xp: 18 },
  { id: 'axe_hand', name: 'Forge Hand Axe', station: 'smithy', prof: 'blacksmithing', lvl: 1, in: { iron_ingot: 2, leather: 1 }, out: { axe_hand: 1 }, xp: 12 },
  { id: 'helm_iron', name: 'Forge Iron Helm', station: 'smithy', prof: 'blacksmithing', lvl: 2, in: { iron_ingot: 3 }, out: { helm_iron: 1 }, xp: 15 },
  { id: 'chest_mail', name: 'Forge Chainmail', station: 'smithy', prof: 'blacksmithing', lvl: 2, in: { iron_ingot: 4, leather: 2 }, out: { chest_mail: 1 }, xp: 25 },
  { id: 'sword_steel', name: 'Forge Steel Longsword', station: 'smithy', prof: 'blacksmithing', lvl: 3, in: { steel_ingot: 2, leather: 1 }, out: { sword_steel: 1 }, xp: 40 },
  { id: 'shield_kite', name: 'Forge Kite Shield', station: 'smithy', prof: 'blacksmithing', lvl: 4, in: { steel_ingot: 2, leather: 2 }, out: { shield_kite: 1 }, xp: 45 },
  { id: 'leather', name: 'Tan Leather', station: 'smithy', prof: 'blacksmithing', lvl: 1, in: { hide: 2 }, out: { leather: 1 }, xp: 5 },
  { id: 'potion_health', name: 'Brew Healing Potion', station: 'alchemy', prof: 'alchemy', lvl: 1, in: { herb_red: 2 }, out: { potion_health: 1 }, xp: 8 },
  { id: 'potion_mana', name: 'Brew Mana Draught', station: 'alchemy', prof: 'alchemy', lvl: 1, in: { herb_blue: 2 }, out: { potion_mana: 1 }, xp: 8 },
  { id: 'potion_stamina', name: 'Brew Stamina Tonic', station: 'alchemy', prof: 'alchemy', lvl: 2, in: { herb_red: 1, mushroom: 1 }, out: { potion_stamina: 1 }, xp: 10 },
  { id: 'elixir_might', name: 'Brew Elixir of Might', station: 'alchemy', prof: 'alchemy', lvl: 3, in: { moonpetal: 1, herb_red: 2 }, out: { elixir_might: 1 }, xp: 30 },
  { id: 'potion_health_big', name: 'Brew Greater Healing', station: 'alchemy', prof: 'alchemy', lvl: 4, in: { potion_health: 2, moonpetal: 1 }, out: { potion_health_big: 1 }, xp: 35 },
  { id: 'flour', name: 'Mill Flour', station: 'kitchen', prof: 'cooking', lvl: 1, in: { wheat: 2 }, out: { flour: 1 }, xp: 4 },
  { id: 'bread', name: 'Bake Bread', station: 'kitchen', prof: 'cooking', lvl: 1, in: { flour: 2 }, out: { bread: 2 }, xp: 6 },
  { id: 'roast_meat', name: 'Roast Venison', station: 'campfire', prof: 'cooking', lvl: 1, in: { meat_raw: 1 }, out: { roast_meat: 1 }, xp: 6 },
  { id: 'grilled_fish', name: 'Grill Fish', station: 'campfire', prof: 'cooking', lvl: 1, in: { fish_raw: 1 }, out: { grilled_fish: 1 }, xp: 6 },
  { id: 'stew', name: 'Simmer Stew', station: 'kitchen', prof: 'cooking', lvl: 2, in: { meat_raw: 1, turnip: 1 }, out: { stew: 1 }, xp: 14 },
  { id: 'berry_tart', name: 'Bake Berry Tart', station: 'kitchen', prof: 'cooking', lvl: 3, in: { flour: 1, berry: 3 }, out: { berry_tart: 1 }, xp: 18 },
  { id: 'spear_iron', name: 'Forge Iron Spear', station: 'smithy', prof: 'blacksmithing', lvl: 2, in: { iron_ingot: 2, leather: 1 }, out: { spear_iron: 1 }, xp: 16 },
  { id: 'spear_aether', name: 'Forge Aetherlance', station: 'smithy', prof: 'blacksmithing', lvl: 5, in: { steel_ingot: 3, aether_core: 1, aether_dust: 2 }, out: { spear_aether: 1 }, xp: 80 },
  { id: 'elixir_stoneskin', name: 'Brew Stoneskin Elixir', station: 'alchemy', prof: 'alchemy', lvl: 3, in: { herb_blue: 2, iron_ore: 2 }, out: { elixir_stoneskin: 1 }, xp: 22 },
  { id: 'elixir_speed', name: 'Brew Zephyr Tonic', station: 'alchemy', prof: 'alchemy', lvl: 2, in: { moonpetal: 1, herb_blue: 1 }, out: { elixir_speed: 1 }, xp: 18 },
  { id: 'quicksilver', name: 'Transmute Quicksilver', station: 'alchemy', prof: 'alchemy', lvl: 3, in: { silver_ore: 1, aether_dust: 1 }, out: { quicksilver: 1 }, xp: 25 },
  { id: 'ring_elements', name: 'Enchant Ring of Elements', station: 'enchanting', prof: 'enchanting', lvl: 3, in: { ring_arcane: 1, aether_dust: 2, gem_ruby: 1 }, out: { ring_elements: 1 }, xp: 60 },
  { id: 'sunshard_rapier', name: 'Imbue Sunshard Rapier', station: 'enchanting', prof: 'enchanting', lvl: 4, in: { sword_steel: 1, gem_ruby: 1, aether_dust: 2 }, out: { sunshard_rapier: 1 }, xp: 85 },
  { id: 'void_cleaver', name: 'Attune Void Cleaver', station: 'enchanting', prof: 'enchanting', lvl: 5, in: { greatsword_iron: 1, void_essence: 2, aether_core: 1 }, out: { void_cleaver: 1 }, xp: 110 },
  { id: 'robe_arcane', name: 'Weave Arcane Robes', station: 'enchanting', prof: 'enchanting', lvl: 2, in: { chest_moon: 1, aether_dust: 2 }, out: { robe_arcane: 1 }, xp: 45 },
  { id: 'sword_flame_brand', name: 'Forge Ashen Flameblade', station: 'smithy', prof: 'blacksmithing', lvl: 4, in: { steel_ingot: 3, gem_ruby: 1, coal: 2 }, out: { sword_flame_brand: 1 }, xp: 60 },
  { id: 'bow_stormstrider', name: 'Craft Stormstrider Bow', station: 'smithy', prof: 'blacksmithing', lvl: 4, in: { iron_ingot: 2, leather: 2, gem_topaz: 1 }, out: { bow_stormstrider: 1 }, xp: 55 },
  { id: 'shield_bastion', name: 'Forge Bastion Bulwark', station: 'smithy', prof: 'blacksmithing', lvl: 4, in: { steel_ingot: 3, iron_ingot: 2 }, out: { shield_bastion: 1 }, xp: 50 },
  { id: 'staff_abyssal', name: 'Enchant Abyssal Scepter', station: 'enchanting', prof: 'enchanting', lvl: 4, in: { staff_oak: 1, gem_sapphire: 1, aether_dust: 3 }, out: { staff_abyssal: 1 }, xp: 80 },
  { id: 'potion_rejuvenation', name: 'Brew Rejuvenation Draught', station: 'alchemy', prof: 'alchemy', lvl: 4, in: { potion_health: 1, potion_mana: 1, moonpetal: 1 }, out: { potion_rejuvenation: 2 }, xp: 40 },
  { id: 'apple_cider', name: 'Simmer Spiced Apple Cider', station: 'kitchen', prof: 'cooking', lvl: 1, in: { apple: 2 }, out: { apple_cider: 2 }, xp: 6 },
];
export const PROFS: Record<string, { name: string; icon: string; desc: string }> = {
  blacksmithing: { name: 'Blacksmithing', icon: '🔨', desc: 'Smelt and forge at a smithy or your own anvil.' },
  alchemy: { name: 'Alchemy', icon: '⚗️', desc: 'Brew potions at an alchemist\'s table.' },
  cooking: { name: 'Cooking', icon: '🍲', desc: 'Cook at campfires, hearths and tavern kitchens.' },
  mining: { name: 'Mining', icon: '⛏️', desc: 'Dig ore from veins in mountains and caves.' },
  herbalism: { name: 'Herbalism', icon: '🌿', desc: 'Gather herbs, mushrooms and moonpetals.' },
  fishing: { name: 'Fishing', icon: '🎣', desc: 'Fish lakes, rivers and the sea.' },
  hunting: { name: 'Hunting', icon: '🏹', desc: 'Harvest pelts and meat from wildlife.' },
  farming: { name: 'Farming', icon: '🌾', desc: 'Plant and harvest crops at farm plots.' },
  enchanting: { name: 'Enchanting', icon: '✨', desc: 'Imbue weapons with elemental power at an enchanting altar.' },
};

export const SHOPS: Record<string, any> = {
  orrin: { name: "Orrin's Goods", fac: 'crown', stock: ['potion_health', 'potion_mana', 'potion_stamina', 'bread', 'apple', 'stew', 'sword_iron', 'spear_iron', 'bow_short', 'chest_leather', 'shield_wood', 'boots_leather', 'gloves_leather', 'seed_turnip', 'seed_wheat', 'dagger_iron', 'staff_oak', 'hood_hunter', 'ring_vigor', 'ring_arcane', 'elixir_speed'] },
  ysolde: { name: "Ysolde's Forge", fac: 'crown', stock: ['sword_steel', 'greatsword_iron', 'halberd_royal', 'axe_hand', 'hammer_smith', 'chest_mail', 'chest_plate', 'helm_iron', 'helm_knight', 'shield_kite', 'shield_aegis', 'gauntlets_steel', 'boots_iron', 'iron_ore', 'coal', 'bow_long', 'crossbow_light'] },
  wynn: { name: "Wynn's Herbs & Tinctures", fac: 'moon', stock: ['herb_red', 'herb_blue', 'mushroom', 'potion_health', 'potion_health_big', 'potion_mana', 'elixir_might', 'elixir_stoneskin', 'staff_ember', 'chest_moon', 'bow_moon'] },
  bess: { name: 'The Gilded Stag Kitchen', fac: 'crown', stock: ['bread', 'stew', 'roast_meat', 'berry_tart', 'apple'] },
  rurik: { name: "Rurik's Frostforge", fac: 'kharun', stock: ['greatsword_kharun', 'sword_kharun_king', 'axe_frost', 'chest_kharun', 'shield_tower', 'steel_ingot', 'iron_ingot', 'coal', 'silver_ore', 'quicksilver', 'staff_frost'] },
  zaya: { name: "Zaya's Exotics", fac: 'league', stock: ['potion_health', 'potion_mana', 'staff_storm', 'dagger_shadow', 'dagger_whisper', 'boots_swift', 'amulet_ward', 'ring_elements', 'aether_dust', 'aether_core', 'gem_ruby', 'tome_ancient', 'circlet_sage'] },
  sigrun: { name: 'The Frozen Flagon', fac: 'kharun', stock: ['bread', 'stew', 'roast_meat', 'grilled_fish'] },
  odo: { name: 'The Drowned Lantern', fac: 'league', stock: ['bread', 'grilled_fish', 'stew', 'berry_tart'] },
  hob: { name: "Hob's Stables", fac: 'moon', stock: [] },
  kaelen: { name: 'Ashenvale Outpost', fac: 'moon', stock: ['iron_ingot', 'steel_ingot', 'enchanted_timber', 'coal', 'bread', 'stew', 'sword_steel', 'shield_kite'] },
  rodrik: { name: "Rodrik's Wandering Caravan", fac: 'league', stock: ['gem_ruby', 'gem_sapphire', 'gem_topaz', 'gem_emerald', 'seed_turnip', 'seed_wheat', 'treasure_map_coast', 'treasure_map_peaks', 'treasure_map_woods', 'quicksilver', 'potion_health_big', 'elixir_speed', 'void_essence'] },
};
export const MOUNTS: Record<string, any> = {
  horse: { name: 'Riding Horse', price: 400, speed: 2.1, desc: 'Swift and dependable.', req: null },
  warhorse: { name: 'Armoured Warhorse', price: 1200, speed: 2.0, desc: 'Barded in steel; sturdier.', req: null },
  dire_wolf: { name: 'Dire Wolf', price: 800, speed: 2.3, desc: 'A Moonwarden-trained wolf. Needs Moonwarden Friendly.', req: { moon: 20 } },
  glimmerstag: { name: 'Glimmerstag', price: 0, speed: 2.2, desc: 'Magical stag with starlit antlers. Found by those who heed the Thornwood.', req: { quest: 'stag' } },
  starmare: { name: 'Starmare', price: 0, speed: 2.4, desc: 'A mare of aether. Light-footed; floats down slowly. Reward for the Skyborn.', req: { quest: 'main' } },
};

export const FURNITURE: Record<string, any> = {
  chair: { name: 'Chair', price: 30, icon: '🪑', station: null, use: 'sit' },
  bench: { name: 'Bench', price: 45, icon: '🛋️', station: null, use: 'sit' },
  table: { name: 'Table', price: 60, icon: '🍽️' }, bed: { name: 'Bed', price: 120, icon: '🛏️', use: 'sleep' }, chest: { name: 'Storage Chest', price: 90, icon: '📦', use: 'storage' },
  hearth: { name: 'Hearth & Cookpot', price: 200, icon: '🔥', station: 'kitchen', use: 'station' }, anvil: { name: 'Anvil & Forge', price: 250, icon: '🔨', station: 'smithy', use: 'station' },
  alchemy: { name: 'Alchemy Table', price: 220, icon: '⚗️', station: 'alchemy', use: 'station' },
  enchanter: { name: 'Enchanting Altar', price: 320, icon: '✨', station: 'enchanting', use: 'station' },
  weapon_rack: { name: 'Weapon Rack', price: 95, icon: '⚔️' },
  bookshelf: { name: 'Bookshelf', price: 110, icon: '📚', use: 'read' },
  rug: { name: 'Woven Rug', price: 40, icon: '🟥' }, lamp: { name: 'Standing Lamp', price: 35, icon: '🏮' }, plant: { name: 'Potted Fern', price: 25, icon: '🪴' },
  painting: { name: 'Painting', price: 55, icon: '🖼️' }, wardrobe: { name: 'Wardrobe', price: 90, icon: '🚪' }, mirror: { name: 'Standing Mirror', price: 140, icon: '🪞', use: 'mirror' },
  banner: { name: 'House Banner', price: 70, icon: '🚩' }, trophy: { name: 'Stag Trophy', price: 150, icon: '🦌' }, barrel: { name: 'Barrel', price: 20, icon: '🛢️' }, throne: { name: 'Carved Throne', price: 600, icon: '👑', use: 'sit' },
};
export const HOUSES: Record<string, any> = {
  cottage: { name: 'Thornwick Cottage', town: 'Thornwick', price: 400, w: 10, d: 8, tier: 1, desc: 'A snug timber cottage with a stone hearth.' },
  townhouse: { name: 'Highcrown Townhouse', town: 'Highcrown', price: 1500, w: 14, d: 10, tier: 2, desc: 'Two-storey townhouse near the market square.' },
  manor: { name: 'Saltmere Manor', town: 'Saltmere', price: 5000, w: 20, d: 14, tier: 3, stairs: true, desc: 'A sea-view manor with a split-level great hall.' },
  estate: { name: 'Highcrown Royal Estate', town: 'Highcrown', price: 15000, w: 26, d: 18, tier: 4, stairs: true, desc: 'A sprawling estate beneath the castle walls.' },
};

export const ENEMIES: Record<string, any> = {
  bandit: { name: 'Ashen Raider', hp: 70, dmg: 9, spd: 4.2, kind: 'human', fac: 'ashen', xp: 30, gold: [3, 14], loot: [['potion_health', 0.12], ['sword_iron', 0.05], ['leather', 0.2], ['bread', 0.25]], col: '#6a3a30', wep: 'sword', sc: 1 },
  bandit_archer: { name: 'Ashen Archer', hp: 50, dmg: 8, spd: 4, kind: 'human', fac: 'ashen', ranged: 'arrow', xp: 32, gold: [3, 14], loot: [['feather', 0.5], ['bow_short', 0.05], ['potion_stamina', 0.1]], col: '#5a4a30', wep: 'bow', sc: 1 },
  smuggler: { name: 'Smuggler', hp: 60, dmg: 8, spd: 4.2, kind: 'human', fac: 'ashen', xp: 28, gold: [8, 30], loot: [['dagger_iron', 0.1], ['potion_mana', 0.15]], col: '#304a58', wep: 'dagger', sc: 0.95 },
  scout: { name: 'Valdorian Scout', hp: 75, dmg: 10, spd: 4.4, kind: 'human', fac: 'crown', xp: 36, gold: [6, 20], loot: [['bow_long', 0.04], ['bread', 0.3]], col: '#a0852e', wep: 'sword', sc: 1 },
  deserter: { name: 'Knight Deserter', hp: 130, dmg: 14, spd: 3.6, kind: 'human', fac: 'ashen', xp: 60, gold: [10, 40], loot: [['helm_iron', 0.2], ['shield_kite', 0.1]], col: '#6e7680', wep: 'sword', sc: 1.08 },
  skeleton: { name: 'Gravebound', hp: 80, dmg: 11, spd: 3.6, kind: 'skeleton', fac: 'undead', xp: 38, gold: [0, 10], loot: [['bone', 0.7], ['silver_ore', 0.05]], col: '#d9d2bc', wep: 'sword', sc: 1 },
  wraith: { name: 'Aether Wraith', hp: 110, dmg: 13, spd: 4.4, kind: 'wraith', fac: 'rift', ranged: 'bolt', xp: 55, gold: [0, 0], loot: [['aether_dust', 0.5]], col: '#7b4fd0', sc: 1.1 },
  rift_hound: { name: 'Rift Hound', hp: 90, dmg: 14, spd: 7, kind: 'beast', fac: 'rift', xp: 50, gold: [0, 0], loot: [['aether_dust', 0.25], ['fang', 0.5]], col: '#4a2a8a', animal: 'wolf', sc: 1.1 },
  wolf: { name: 'Wolf', hp: 55, dmg: 8, spd: 6.2, kind: 'beast', fac: 'wild', xp: 22, gold: [0, 0], loot: [['pelt', 0.5], ['fang', 0.4], ['meat_raw', 0.6]], animal: 'wolf', sc: 1 },
  white_wolf: { name: 'Ghostmane (White Wolf)', hp: 220, dmg: 16, spd: 7, kind: 'beast', fac: 'wild', xp: 150, gold: [0, 0], loot: [['pelt', 1], ['fang', 1], ['gem_ruby', 0.3]], animal: 'wolf', col: '#e8eef2', sc: 1.5, elite: true },
  bear: { name: 'Brown Bear', hp: 150, dmg: 16, spd: 5, kind: 'beast', fac: 'wild', xp: 60, gold: [0, 0], loot: [['hide', 1], ['meat_raw', 1]], animal: 'bear', sc: 1 },
  bear_alpha: { name: 'Old Scarpaw', hp: 340, dmg: 24, spd: 5.2, kind: 'beast', fac: 'wild', xp: 220, gold: [0, 0], loot: [['hide', 3], ['meat_raw', 3], ['fang', 2]], animal: 'bear', col: '#3a281c', sc: 1.6, elite: true },
  assassin: { name: 'Crown Assassin', hp: 110, dmg: 18, spd: 5.4, kind: 'human', fac: 'crown', xp: 90, gold: [20, 60], loot: [['dagger_shadow', 0.1]], col: '#1b1b24', wep: 'dagger', sc: 1 },
  karreth: { name: 'Karreth the Hollow', hp: 650, dmg: 22, spd: 4.4, kind: 'human', fac: 'ashen', boss: true, xp: 800, gold: [200, 300], loot: [['sword_flame', 1], ['maelis_letter', 1]], col: '#2a1a1a', wep: 'greatsword', sc: 1.35, title: 'Warlord of the Ashen Banner' },
  gravewarden: { name: 'The Gravewarden', hp: 420, dmg: 19, spd: 3.6, kind: 'skeleton', fac: 'undead', boss: true, xp: 400, gold: [50, 120], loot: [['relic_crown', 1], ['silver_ore', 3], ['gem_ruby', 1]], col: '#bba98a', wep: 'greatsword', sc: 1.5, title: 'Keeper of the Cinder Crypt' },
  rift_warden: { name: 'The Rift Warden', hp: 1100, dmg: 28, spd: 4.8, kind: 'wraith', fac: 'rift', boss: true, ranged: 'bolt', xp: 1500, gold: [0, 0], loot: [['amulet_skyborn', 1], ['tome_ancient', 1]], col: '#a06bff', sc: 2.2, title: 'Fallen Keeper of the Hollow Door' },
  void_cultist: { name: 'Aether Cultist', hp: 95, dmg: 14, spd: 4.0, kind: 'human', fac: 'rift', ranged: 'bolt', xp: 55, gold: [5, 20], loot: [['aether_dust', 0.4]], col: '#3a2060', wep: 'staff', sc: 1.02 },
  cultist_reaver: { name: 'Aether Reaver', hp: 125, dmg: 15, spd: 4.4, kind: 'human', fac: 'rift', xp: 65, gold: [10, 30], loot: [['void_essence', 0.5], ['sword_iron', 0.2]], col: '#3a2060', wep: 'sword', sc: 1.05 },
  ashen_reaver: { name: 'Ashen Reaver', hp: 135, dmg: 16, spd: 4.0, kind: 'human', fac: 'ashen', xp: 70, gold: [12, 35], loot: [['iron_ingot', 0.5], ['potion_health', 0.2]], col: '#4a2020', wep: 'greatsword', sc: 1.1 },
  crypt_specter: { name: 'Crypt Specter', hp: 140, dmg: 16, spd: 4.2, kind: 'wraith', fac: 'undead', ranged: 'bolt', xp: 75, gold: [0, 0], loot: [['aether_dust', 0.6], ['bone', 1]], col: '#4080a0', sc: 1.15 },
  aether_golem: { name: 'The Aether Colossus', hp: 780, dmg: 26, spd: 3.4, kind: 'beast', fac: 'rift', animal: 'bear', col: '#504070', boss: true, xp: 950, gold: [120, 260], loot: [['aether_core', 1]], sc: 1.85, title: 'Guardian of the Sky Sanctum' },
};
export const ANIMALS: Record<string, any> = {
  deer: { name: 'Deer', len: 1.3, h: 0.95, col: '#a5764a', belly: '#d9c3a0', ears: 'long', tail: 'short', antlers: true, hp: 30, flee: 18, loot: [['meat_raw', 1], ['hide', 0.8]], spd: 8, biome: 'forest' },
  fox: { name: 'Fox', len: 0.8, h: 0.4, col: '#d0662a', belly: '#f2e4d0', ears: 'point', tail: 'bushy', hp: 20, flee: 14, loot: [['hide', 0.6]], spd: 7, biome: 'any' },
  rabbit: { name: 'Rabbit', len: 0.4, h: 0.22, col: '#a89a8a', belly: '#e8e0d4', ears: 'long', tail: 'puff', hp: 8, flee: 9, loot: [['meat_raw', 0.8]], spd: 7, hop: true, biome: 'grass' },
  boar: { name: 'Boar', len: 1.2, h: 0.7, col: '#4a3a2e', belly: '#6a5848', ears: 'round', tail: 'short', tusks: true, hp: 70, flee: 0, loot: [['meat_raw', 2], ['hide', 1]], spd: 5.5, neutral: true, dmg: 9, biome: 'forest' },
  squirrel: { name: 'Squirrel', len: 0.3, h: 0.16, col: '#9a5a2a', belly: '#e8d8b8', ears: 'round', tail: 'huge', hp: 5, flee: 6, loot: [], spd: 6, hop: true, biome: 'forest' },
  horse: { name: 'Wild Horse', len: 1.9, h: 1.4, col: '#7a4a2a', belly: '#9a6a44', ears: 'point', tail: 'long', mane: true, hp: 80, flee: 12, loot: [], spd: 9, biome: 'grass', neck: true },
  glimmerfox: { name: 'Glimmerfox', len: 0.8, h: 0.42, col: '#7fe9ff', belly: '#d8fbff', ears: 'point', tail: 'bushy', glow: '#7fe9ff', hp: 25, flee: 10, loot: [['aether_dust', 0.3]], spd: 8, biome: 'grove' },
  aether_stag: { name: 'Aether Stag', len: 1.6, h: 1.3, col: '#c9b8ff', belly: '#efe8ff', ears: 'long', tail: 'short', antlers: true, glow: '#c9a2ff', hp: 90, flee: 0, loot: [], spd: 9, biome: 'grove', neck: true },
  wolf: { name: 'Wolf', len: 1.2, h: 0.8, col: '#6e6e72', belly: '#9a9aa0', ears: 'point', tail: 'bushy', hp: 55, loot: [], spd: 6, biome: 'any' },
  bear: { name: 'Bear', len: 1.7, h: 1.1, col: '#5a3a24', belly: '#6a4a34', ears: 'round', tail: 'short', hp: 150, loot: [], spd: 5, biome: 'any', bulky: true },
  ram: { name: 'Mountain Ram', len: 1.3, h: 1.05, col: '#8a8278', belly: '#b0a89a', ears: 'short', horns: 'curled', hp: 50, flee: 14, loot: [['meat_raw', 1], ['hide', 1]], spd: 7.5, biome: 'mountain' },
};

// ----- QUESTS -----
export const QUESTS: Record<string, any> = {
  main: {
    name: 'A Tale of Broken Skies', kind: 'main', giver: 'maren', desc: 'The sky is broken, Ashenvale is ash, and you bear a mark no one can explain.',
    stages: [
      { text: 'Speak with Elder Maren in Thornwick.', goal: { t: 'talk', n: 'maren' } },
      { text: 'Drive off the Ashen raiders camped near Thornwick (4).', goal: { t: 'kill', n: 'bandit', c: 4 }, done: [['give', 'banner_token', 1], ['toast', 'You pry a brass token from the last raider\'s belt.']] },
      { text: 'Walk the ashes of Ashenvale, south of Thornwick.', goal: { t: 'reach', n: 'ashenvale' }, done: [['give', 'locket', 1], ['lore', 10]] },
      { text: 'Show the banner token to Captain Dorian Vale in Highcrown.', goal: { t: 'talk', n: 'dorian' } },
      { text: 'Learn who paid the Ashen Banner. Ask around the Gilded Stag tavern.', goal: { t: 'talk', n: 'stranger' } },
      { text: 'Seek an audience with Duchess Maelis in the Highcrown castle hall.', goal: { t: 'talk', n: 'maelis' } },
      { text: 'Destroy Karreth the Hollow at Fort Cinderwatch.', goal: { t: 'kill', n: 'karreth', c: 1 } },
      { text: 'Carry the truth to Keeper Aurel at the Spire ruins.', goal: { t: 'talk', n: 'aurel' } },
      { text: 'Recover the Sky, Deep and Ember aether shards.', goal: { t: 'have', n: ['shard_sky', 'shard_deep', 'shard_ember'] } },
      { text: 'Open the Hollow Door at the Spire and step through.', goal: { t: 'reach', n: 'hollow_rift' } },
      { text: 'Defeat the Rift Warden.', goal: { t: 'kill', n: 'rift_warden', c: 1 } },
      { text: 'Return to Duchess Maelis in Highcrown and decide the fate of the kingdom.', goal: { t: 'talk', n: 'maelis_final' } },
    ],
    reward: { xp: 2500, gold: 1000, items: [['sword_aether', 1]], mount: 'starmare' },
  },
  moonpetals: { name: 'Petals Under Moonlight', kind: 'side', giver: 'wynn', desc: 'Wynn needs moonpetals, which only bloom at night.', stages: [{ text: 'Gather 5 moonpetals (glowing flowers in the Thornwood at night).', goal: { t: 'gather', n: 'moonpetal', c: 5 } }, { text: 'Bring the petals to Wynn.', goal: { t: 'talk', n: 'wynn' } }], reward: { xp: 250, gold: 150, items: [['potion_health_big', 2]], rep: { moon: 15 } } },
  stag: { name: 'The Stag Who Wasn\'t', kind: 'hidden', giver: 'maren', desc: 'Maren whispers of a glimmerstag in the grove, a Moonwarden test of heart.', stages: [{ text: 'Find the Glimmer Grove (northwest of Thornwick).', goal: { t: 'reach', n: 'glimmer_grove' } }, { text: 'Approach the aether stag calmly and speak to it.', goal: { t: 'talk', n: 'aether_stag' } }], reward: { xp: 400, rep: { moon: 20 }, mount: 'glimmerstag' } },
  shipment: { name: 'The Missing Shipment', kind: 'side', giver: 'dalla', desc: 'League cargo has vanished from Saltmere docks.', stages: [{ text: 'Find the smugglers\' cove east of Saltmere.', goal: { t: 'reach', n: 'smuggler_cove' } }, { text: 'Defeat the smugglers (3).', goal: { t: 'kill', n: 'smuggler', c: 3 }, done: [['give', 'crate_manifest', 1]] }, { text: 'Return the manifest to Harbormaster Dalla… or use it differently.', goal: { t: 'talk', n: 'dalla' } }], reward: { xp: 350 } },
  smith_pride: { name: "A Smith's Pride", kind: 'side', giver: 'ysolde', desc: 'Ysolde wants proof that a new hand can forge a steel longsword.', stages: [{ text: 'Forge a Steel Longsword (needs Blacksmithing 3).', goal: { t: 'craft', n: 'sword_steel', c: 1 } }, { text: 'Show Ysolde your work.', goal: { t: 'talk', n: 'ysolde' } }], reward: { xp: 300, items: [['ring_smith', 1]], rep: { crown: 8 } } },
  frost_siege: { name: 'The Frostgate Siege', kind: 'side', giver: 'hilde', desc: 'Valdorian scouts probe the wall at Frostgate.', stages: [{ text: 'Defeat Valdorian scouts outside Frostgate (5).', goal: { t: 'kill', n: 'scout', c: 5 } }, { text: 'Report to Warden Hilde.', goal: { t: 'talk', n: 'hilde' } }], reward: { xp: 450, gold: 250, rep: { kharun: 20, crown: -15 }, items: [['axe_frost', 1]] } },
  beast: { name: 'The Beast of the Thornwood', kind: 'side', giver: 'tobin', desc: 'Old Scarpaw has been raiding Tobin\'s fields.', stages: [{ text: 'Hunt Old Scarpaw in the forest east of Thornwick.', goal: { t: 'kill', n: 'bear_alpha', c: 1 } }, { text: 'Tell Tobin the beast is dead.', goal: { t: 'talk', n: 'tobin' } }], reward: { xp: 500, gold: 200, rep: { moon: 8 }, items: [['bow_hunter', 1]] } },
  harvest: { name: "Tobin's Harvest", kind: 'side', giver: 'tobin', desc: 'Learn to farm: plant and harvest turnips at Tobin\'s plots.', stages: [{ text: 'Harvest 4 turnips (plant seeds at farm plots; they grow over a few minutes).', goal: { t: 'gather', n: 'turnip', c: 4 } }, { text: 'Show Tobin your harvest.', goal: { t: 'talk', n: 'tobin' } }], reward: { xp: 200, gold: 80, items: [['seed_wheat', 6]] } },
  angler: { name: 'The Big One', kind: 'side', giver: 'poul', desc: 'Poul swears a golden carp haunts the Saltmere shallows.', stages: [{ text: 'Catch 5 fish (stand at the water\'s edge, press E).', goal: { t: 'gather', n: 'fish_raw', c: 5 } }, { text: 'Talk to Poul.', goal: { t: 'talk', n: 'poul' } }], reward: { xp: 220, gold: 120, rep: { league: 6 } } },
  ore_walls: { name: 'Ore for the Walls', kind: 'side', giver: 'dorian', desc: 'Highcrown\'s walls need iron.', stages: [{ text: 'Mine 8 iron ore (veins in the mountain cave or Frostgate cliffs).', goal: { t: 'gather', n: 'iron_ore', c: 8 } }, { text: 'Deliver to Captain Dorian.', goal: { t: 'talk', n: 'dorian' } }], reward: { xp: 300, gold: 220, rep: { crown: 12 } } },
  collector: { name: 'Pages of the Sundering', kind: 'hidden', giver: null, desc: 'Scattered lore pages tell the true history of the sky. Collect all twelve.', stages: [{ text: 'Find all 12 lore pages hidden around the world.', goal: { t: 'lorecount', n: 12 } }], reward: { xp: 900, items: [['amulet_lore', 1]] } },
  lyra_q: { name: 'Lyra: Trail of the White Wolf', kind: 'companion', giver: 'lyra', desc: 'Lyra\'s pack was lost to a ghost-white wolf.', stages: [{ text: 'Hunt Ghostmane in the northern foothills.', goal: { t: 'kill', n: 'white_wolf', c: 1 } }], reward: { xp: 400, loyalty: { lyra: 30 } } },
  brann_q: { name: "Brann: Honor's Debt", kind: 'companion', giver: 'brann', desc: 'Brann\'s old comrades deserted their oath.', stages: [{ text: 'Defeat the knight deserters at the ruined chapel (2).', goal: { t: 'kill', n: 'deserter', c: 2 } }], reward: { xp: 400, loyalty: { brann: 30 } } },
  iselle_q: { name: 'Iselle: The Fading Lamp', kind: 'companion', giver: 'iselle', desc: 'A fever spreads in Saltmere\'s lower docks.', stages: [{ text: 'Gather 3 frostbloom herbs for Iselle\'s remedy.', goal: { t: 'have', n: ['herb_blue'], c: 3 } }, { text: 'Give the herbs to Iselle.', goal: { t: 'talk', n: 'iselle' } }], reward: { xp: 400, loyalty: { iselle: 30 } } },
  kestrel_q: { name: 'Kestrel: Old Debts', kind: 'companion', giver: 'kestrel', desc: 'Kestrel owes a debt to the Ashen Banner.', stages: [{ text: 'Defeat Ashen archers harassing Kestrel\'s route (3).', goal: { t: 'kill', n: 'bandit_archer', c: 3 } }], reward: { xp: 400, loyalty: { kestrel: 30 } } },
  corvin_q: { name: 'Corvin: The Broken Brand', kind: 'companion', giver: 'corvin', desc: 'Corvin is hunted by his former Ashen squad.', stages: [{ text: 'Defeat the Ashen raiders pursuing Corvin (3).', goal: { t: 'kill', n: 'bandit', c: 3 } }], reward: { xp: 450, loyalty: { corvin: 35 } } },
  ashenvale_rebuild: { name: 'Hope from the Ashes', kind: 'side', giver: 'tobin', desc: 'Aid the survivors by gathering iron ingots to begin rebuilding Ashenvale.', stages: [{ text: 'Gather 4 Iron Ingots for construction.', goal: { t: 'have', n: ['iron_ingot'], c: 4 } }, { text: 'Deliver the ingots to Elder Maren in Thornwick.', goal: { t: 'talk', n: 'maren' } }], reward: { xp: 400, gold: 200, rep: { moon: 25, crown: 15 }, items: [['enchanted_timber', 2]] } },
  sunken_secrets: { name: 'Echoes of the Sunken Veil', kind: 'side', giver: 'poul', desc: 'Explore the sunken coastal ruins and recover the ancient Tide Stone.', stages: [{ text: 'Reach the Sunken Veil on the eastern coast.', goal: { t: 'reach', n: 'sunken_veil' } }, { text: 'Recover the Sunken Relic and speak with Poul.', goal: { t: 'talk', n: 'poul' } }], reward: { xp: 400, gold: 250, rep: { league: 20 }, items: [['ring_elements', 1]] } },
};
export const COMPANIONS: Record<string, any> = {
  lyra: { name: 'Lyra Thornfield', role: 'Hunter', cls: 'hunter', fac: 'moon', color: '#4a6b3a', hair: '#7a4a24', ranged: true, personality: 'Quiet, wry, loves the wilds.', bio: 'A Moonwarden scout whose pack-bond was broken by a ghost-white wolf.', likes: ['moon', 'spire'], dislikes: ['ashen'], quest: 'lyra_q', bark: { forest: 'The trees are listening. Be kind to them.', city: 'Too many chimneys. I can\'t hear the wind.', night: 'Moon\'s up. Good hunting weather.', combat: 'Down, you brutes!', ruin: 'Old stones. Old grief.' } },
  brann: { name: 'Ser Brann Aldous', role: 'Knight', cls: 'knight', fac: 'crown', color: '#a0aab6', hair: '#3a3a3a', ranged: false, personality: 'Dutiful, haunted, stubbornly decent.', bio: 'A disgraced knight of Valdoria who knelt to the wrong lord.', likes: ['crown'], dislikes: ['ashen', 'league'], quest: 'brann_q', bark: { city: 'Highcrown. I swore my life on these stones once.', mountain: 'Kharun country. Keep your guard up.', night: 'I\'ll take first watch.', combat: 'For the broken oath!', ruin: 'Even stone remembers duty.' } },
  iselle: { name: 'Sister Iselle', role: 'Healer', cls: 'healer', fac: 'spire', color: '#e9e4d3', hair: '#d8c8a8', ranged: true, healer: true, personality: 'Gentle, curious, stubborn when it counts.', bio: 'A Spire Keeper who left the order to heal rather than hide.', likes: ['spire', 'moon'], dislikes: ['ashen', 'kharun'], quest: 'iselle_q', bark: { ruin: 'The aether is thick here. It tastes like copper.', city: 'So many bruises, so little time.', night: 'Rest. I\'ll mend what I can.', combat: 'Stay close — I\'ve got you!', coast: 'The sea mends nothing, but it listens.' } },
  kestrel: { name: 'Kestrel', role: 'Rogue', cls: 'rogue', fac: 'league', color: '#2c2f3d', hair: '#1a1a1a', ranged: false, personality: 'Sharp-tongued, loyal to coin, secretly loyal to you.', bio: 'A League smuggler with a debt and a knack for locks.', likes: ['league'], dislikes: ['crown'], quest: 'kestrel_q', bark: { coast: 'Smell that? Salt, tar and opportunity.', city: 'Guards everywhere. Keep your pockets close.', night: 'Perfect. Nobody sees a thing.', combat: 'Behind you, friend!', ruin: 'Something valuable\'s buried here, I can smell it.' } },
  corvin: { name: 'Corvin Vale', role: 'Spellblade', cls: 'battlemage', fac: 'ashen', color: '#5b2f6b', hair: '#1a1a24', ranged: false, personality: 'Brooding, razor-sharp, seeking redemption.', bio: 'Former champion of the Ashen Banner who deserted when Ashenvale burned. Seeks to mend the realm.', likes: ['moon', 'spire'], dislikes: ['ashen'], quest: 'corvin_q', bark: { ruin: 'The smoke never washes out of memory.', city: 'Too much gold and not enough spine.', night: 'Cold night. Watch your shadows.', combat: 'Arcane steel answers!', mountain: 'The wind here doesn\'t forgive mistakes.' } },
};

// ----- DIALOGUE -----
// conds: ['rep>=', fac, n] ['rep<', fac, n] ['flag', f] ['!flag', f] ['q', id, 'none'|'active'|'done'] ['stage', id, n] (>=) ['cls', id] ['night'] ['gold', n]
// actions: ['quest',id] ['adv',id] ['rep',fac,n] ['gold',n] ['give',item,n] ['take',item,n] ['flag',f] ['shop',id] ['rest'] ['recruit',id] ['toast',t] ['house'] ['stable'] ['ending',id] ['lore',n] ['xp',n]
export const DIALOGUE: Record<string, any> = {
  maren: { start: 'a', nodes: {
    a: { t: 'Child of the ash… you live. Ashenvale burned two nights ago, and the Banner left no one. Yet here you stand, with a mark on your palm that glows when the sky is angry.', c: [
      { t: 'Where is Ashenvale\'s killer? Tell me.', go: 'b', cond: [['q', 'main', 'none']], do: [['quest', 'main']] },
      { t: 'Who are the Ashen Banner?', go: 'banner' },
      { t: '(As a {cls}) I won\'t stand idle.', go: 'cls', cond: [['q', 'main', 'active']] },
      { t: 'You mentioned a stag…', go: 'stag', cond: [['q', 'moonpetals', 'done'], ['q', 'stag', 'none']] },
      { t: 'I brought the iron to rebuild Ashenvale.', go: 'rebuild_done', cond: [['q', 'ashenvale_rebuild', 'active'], ['stage', 'ashenvale_rebuild', 1]] },
      { t: 'Any rumours worth knowing?', go: 'rumor' },
      { t: 'Farewell.', go: null }] },
    b: { t: 'Raiders camp at the edge of the Thornwood — four of them tonight, more behind. Drive them off; they carry a brass token. It will lead you to who pays them. Take what gear you need from my stores… and stay alive.', c: [{ t: 'I will.', go: null, do: [['give', 'potion_health', 2], ['rep', 'moon', 5]] }] },
    banner: { t: 'Mercenaries. Brutal, well-paid. Their banner is a burning flag; their coin is bright Valdorian silver. That should trouble us all.', c: [{ t: 'Understood.', go: 'a' }] },
    cls: { t: 'Then use that gift well. The Thornwood respects those who fight with purpose.', c: [{ t: 'Thank you.', go: null }] },
    stag: { t: 'Wynn trusts you now — that means the wood does. There is a grove northwest, where an aether stag walks. Go gently, and unarmed of spirit.', c: [{ t: 'I\'ll find it.', go: null, do: [['quest', 'stag']] }] },
    rebuild_done: { t: 'Bless your kind heart. The carpenters are already preparing the foundation timber. Ashenvale shall rise again!', c: [{ t: 'May the skies smile on them.', go: null, do: [['take', 'iron_ingot', 4], ['adv', 'ashenvale_rebuild']] }] },
    rumor: { t: 'They say a Spire Keeper watches the ruins to the northwest, and that Kharun\'s scouts have grown bold. Mind the night road — wolves hunt the river.', c: [{ t: 'Thank you.', go: 'a' }] },
  } },
  wynn: { start: 'a', nodes: {
    a: { t: 'Redroot, frostbloom, glowcap… anything the Thornwood grows, I know. What can I do for you?', c: [
      { t: 'Let me see your wares.', go: null, do: [['shop', 'wynn']] },
      { t: 'Do you need help?', go: 'q', cond: [['q', 'moonpetals', 'none']] },
      { t: 'I have the moonpetals.', go: 'done', cond: [['q', 'moonpetals', 'active'], ['stage', 'moonpetals', 1]] },
      { t: 'Goodbye.', go: null }] },
    q: { t: 'Moonpetals — five of them. They only open under moonlight, in the deep wood. They\'re the key to my best elixirs.', c: [{ t: 'I\'ll gather them.', go: null, do: [['quest', 'moonpetals']] }] },
    done: { t: 'Beautiful! The Moonwardens will hear of this.', c: [{ t: 'My pleasure.', go: null, do: [['take', 'moonpetal', 5], ['adv', 'moonpetals']] }] },
  } },
  tobin: { start: 'a', nodes: {
    a: { t: 'Fields don\'t plant themselves, and the bear has been at my turnips. Work to be done.', c: [
      { t: 'Teach me to farm.', go: 'farm', cond: [['q', 'harvest', 'none']] },
      { t: 'How can we help Ashenvale?', go: 'rebuild', cond: [['q', 'ashenvale_rebuild', 'none']] },
      { t: 'About the bear…', go: 'bear', cond: [['q', 'beast', 'none']] },
      { t: 'I have your harvest.', go: 'h', cond: [['q', 'harvest', 'active'], ['stage', 'harvest', 1]] },
      { t: 'The beast is dead.', go: 'b2', cond: [['q', 'beast', 'active'], ['stage', 'beast', 1]] },
      { t: 'Never mind.', go: null }] },
    farm: { t: 'Plant seeds at the plots by my barn — press E on tilled soil. Come back when you\'ve harvested four turnips. Here\'s seed.', c: [{ t: 'Thanks.', go: null, do: [['quest', 'harvest'], ['give', 'seed_turnip', 6]] }] },
    rebuild: { t: 'The refugees from Ashenvale need iron ingots to secure shelter frames before the winter frosts. Gather four iron ingots and bring them to Elder Maren.', c: [{ t: 'I will help.', go: null, do: [['quest', 'ashenvale_rebuild']] }] },
    bear: { t: 'Old Scarpaw, they call him. Big as a cart. East of the village, in the forest.', c: [{ t: 'I\'ll deal with him.', go: null, do: [['quest', 'beast']] }] },
    h: { t: 'Fine turnips! Thornwick eats well tonight.', c: [{ t: 'Glad to help.', go: null, do: [['adv', 'harvest']] }] },
    b2: { t: 'You\'ve saved my fields… and probably my life.', c: [{ t: 'Anytime.', go: null, do: [['adv', 'beast']] }] },
  } },
  bess: { start: 'a', nodes: { a: { t: 'Welcome to the Barley & Boar! Hot food, warm beds, cold ale.', c: [{ t: 'What\'s cooking?', go: null, do: [['shop', 'bess']] }, { t: 'A room for the night (10g).', go: null, cond: [['gold', 10]], do: [['gold', -10], ['rest']] }, { t: 'Any gossip?', go: 'g' }, { t: 'Goodbye.', go: null }] }, g: { t: 'They say Duchess Maelis hasn\'t left her tower in months, and the King hasn\'t been seen in longer. And that the Kharun are massing on the pass.', c: [{ t: 'Interesting.', go: 'a' }] } } },
  hob: { start: 'a', nodes: { a: { t: 'Stables, friend. Four hooves beat two feet any day. Want to see what\'s in the stalls?', c: [{ t: 'Show me the mounts.', go: null, do: [['stable']] }, { t: 'Maybe later.', go: null }] } } },
  lyra: { start: 'a', nodes: {
    a: { t: 'Hm. You walk like someone hunting something bigger than themselves.', c: [
      { t: 'Travel with me, Lyra?', go: 'r', cond: [['!flag', 'rec_lyra']] },
      { t: 'About the white wolf…', go: 'w', cond: [['flag', 'rec_lyra'], ['q', 'lyra_q', 'none']] },
      { t: 'Wait here — I\'ll go alone.', go: null, cond: [['flag', 'rec_lyra']], do: [['dismiss', 'lyra']] },
      { t: 'Nothing.', go: null }] },
    r: { t: 'You\'re not Moonwarden, and not quite a stranger either. Fine. I\'ll watch your back — and the trees will watch mine.', c: [{ t: 'Welcome aboard.', go: null, do: [['recruit', 'lyra']] }] },
    w: { t: 'Ghostmane. White as bone, big as a bear. He took my pack in the northern foothills. I need him gone.', c: [{ t: 'We\'ll hunt him.', go: null, do: [['quest', 'lyra_q']] }] } } },
  brann: { start: 'a', nodes: {
    a: { t: 'You\'ve the look of someone the Crown needs. Or someone it\'ll hang.', c: [
      { t: 'Will you join me, Ser Brann?', go: 'r', cond: [['!flag', 'rec_brann']] },
      { t: 'Tell me about your oath.', go: 'w', cond: [['flag', 'rec_brann'], ['q', 'brann_q', 'none']] },
      { t: 'Wait here, Brann.', go: null, cond: [['flag', 'rec_brann']], do: [['dismiss', 'brann']] },
      { t: 'Nothing.', go: null }] },
    r: { t: 'A knight without a lord is a sword without a wall. I\'ll follow while you\'re worth following.', c: [{ t: 'Fair.', go: null, do: [['recruit', 'brann']] }] },
    w: { t: 'Three men I trained deserted when the war soured. They haunt a ruined chapel. I\'d have them answer for it.', c: [{ t: 'Then let\'s go.', go: null, do: [['quest', 'brann_q']] }] } } },
  iselle: { start: 'a', nodes: {
    a: { t: 'Peace to you, traveller. You carry a great deal of sorrow. May I help?', c: [
      { t: 'Heal me, if you can.', go: null, do: [['heal']] },
      { t: 'Come with me, Sister.', go: 'r', cond: [['!flag', 'rec_iselle']] },
      { t: 'The lower docks…', go: 'w', cond: [['flag', 'rec_iselle'], ['q', 'iselle_q', 'none']] },
      { t: 'I have the frostbloom.', go: 'done', cond: [['q', 'iselle_q', 'active'], ['stage', 'iselle_q', 1]] },
      { t: 'Wait here, Sister.', go: null, cond: [['flag', 'rec_iselle']], do: [['dismiss', 'iselle']] },
      { t: 'Farewell.', go: null }] },
    r: { t: 'I left the Keepers because I couldn\'t heal anyone behind their walls. Yes — I will come.', c: [{ t: 'Welcome.', go: null, do: [['recruit', 'iselle']] }] },
    w: { t: 'A fever in the lower docks. I need three frostbloom — they grow in cold places.', c: [{ t: 'I\'ll find some.', go: null, do: [['quest', 'iselle_q']] }] },
    done: { t: 'You\'ve saved so many with this. Thank you.', c: [{ t: 'Glad to help.', go: null, do: [['take', 'herb_blue', 3], ['adv', 'iselle_q']] }] } } },
  kestrel: { start: 'a', nodes: {
    a: { t: 'Well, well. A stranger with a stranger\'s coin. What do you want?', c: [
      { t: 'Interested in some work?', go: 'r', cond: [['!flag', 'rec_kestrel']] },
      { t: 'Tell me about your debts.', go: 'w', cond: [['flag', 'rec_kestrel'], ['q', 'kestrel_q', 'none']] },
      { t: 'Wait here.', go: null, cond: [['flag', 'rec_kestrel']], do: [['dismiss', 'kestrel']] },
      { t: 'Nothing.', go: null }] },
    r: { t: 'Work? Pays? …Fine. I\'m in. Don\'t make me regret it.', c: [{ t: 'Deal.', go: null, do: [['recruit', 'kestrel']] }] },
    w: { t: 'Ashen Banner bowmen have been on my back since I skipped a payment. Three of them. Lose them for me.', c: [{ t: 'Done.', go: null, do: [['quest', 'kestrel_q']] }] } } },
  corvin: { start: 'a', nodes: {
    a: { t: 'The Ashen Banner claimed to bring reform. They brought blood and ashes. I broke my brand after Ashenvale. Now I walk alone… unless our blades point the same way.', c: [
      { t: 'Travel with me, Corvin.', go: 'r', cond: [['!flag', 'rec_corvin']] },
      { t: 'Tell me of your hunted past.', go: 'w', cond: [['flag', 'rec_corvin'], ['q', 'corvin_q', 'none']] },
      { t: 'Wait here, Corvin.', go: null, cond: [['flag', 'rec_corvin']], do: [['dismiss', 'corvin']] },
      { t: 'Farewell.', go: null }] },
    r: { t: 'Then my spellblade is pledged to you. Let us see justice done.', c: [{ t: 'Welcome, Corvin.', go: null, do: [['recruit', 'corvin']] }] },
    w: { t: 'My old Ashen unit tracks my footsteps. Three raiders lurk nearby. Let us end their pursuit.', c: [{ t: 'We strike together.', go: null, do: [['quest', 'corvin_q']] }] } } },
  dorian: { start: 'a', nodes: {
    a: { t: 'Captain Dorian Vale, Highcrown Watch. State your business, and keep your hands visible.', c: [
      { t: 'I found this on an Ashen raider.', go: 'tok', cond: [['q', 'main', 'active'], ['stage', 'main', 3], ['item', 'banner_token']] },
      { t: 'Do you need help with the walls?', go: 'ore', cond: [['q', 'ore_walls', 'none']] },
      { t: 'I\'ve got your iron.', go: 'ore2', cond: [['q', 'ore_walls', 'active'], ['stage', 'ore_walls', 1]] },
      { t: '(As a {cls}) Any work for someone like me?', go: 'cls' },
      { t: 'Just passing through.', go: null }] },
    tok: { t: 'An Ashen token… And you say it was clean Valdorian silver in his purse? That\'s a problem. A silver mint problem. Ask around the Gilded Stag — somebody there sells whispers. Then see the Duchess; she\'ll want to know. And be careful what you say aloud.', c: [{ t: 'I\'ll go to the Stag.', go: null, do: [['adv', 'main'], ['rep', 'crown', 5]] }] },
    ore: { t: 'The walls need iron: eight ore, delivered. The Crown pays, and remembers.', c: [{ t: 'I\'ll mine it.', go: null, do: [['quest', 'ore_walls']] }] },
    ore2: { t: 'Good iron. The Watch thanks you.', c: [{ t: 'Anytime.', go: null, do: [['adv', 'ore_walls']] }] },
    cls: { t: 'Soldiers, scouts, scribes — everyone has a use in wartime. Prove yours.', c: [{ t: 'Fair enough.', go: 'a' }] } } },
  stranger: { start: 'a', nodes: {
    a: { t: '(a cloaked figure lowers their voice) You\'re the one asking about brass tokens. Silver for the Banner came from the Duchess\'s own coffers. Don\'t repeat that — not here.', c: [
      { t: 'Prove it.', go: 'b', cond: [['q', 'main', 'active'], ['stage', 'main', 4]] },
      { t: 'I\'ll keep it quiet.', go: null, cond: [['q', 'main', 'active'], ['stage', 'main', 4]], do: [['adv', 'main'], ['flag', 'knows_coin']] },
      { t: 'Who are you?', go: 'w' }, { t: 'Leave.', go: null }] },
    b: { t: 'The proof is in Karreth\'s pocket at Fort Cinderwatch — a signed letter. Kill him, and find out for yourself. Until then, smile at the Duchess.', c: [{ t: 'Understood.', go: null, do: [['adv', 'main'], ['flag', 'knows_coin']] }] },
    w: { t: 'Someone who sells silence to the Crown, and silence to the Banner. Business is good.', c: [{ t: '…', go: 'a' }] } } },
  pell: { start: 'a', nodes: { a: { t: 'Welcome to the Gilded Stag — finest ale this side of the Sundering.', c: [{ t: 'What\'s on the menu?', go: null, do: [['shop', 'bess']] }, { t: 'A bed (15g).', go: null, cond: [['gold', 15]], do: [['gold', -15], ['rest']] }, { t: 'Heard anything?', go: 'g' }, { t: 'No thanks.', go: null }] }, g: { t: 'The man in the cloak in the corner? Keeps asking about tokens. Odd. I\'d keep clear — or get your answers quick.', c: [{ t: 'Thanks.', go: 'a' }] } } },
  maelis: { start: 'a', nodes: {
    a: { t: 'Welcome, Skyborn. Yes, I know the mark — the Keepers whispered of you. Highcrown stands on the edge of ruin, and you walk in with Ashenvale\'s ash still on your cloak.', c: [
      { t: 'I seek the truth about the Ashen Banner.', go: 'b', cond: [['q', 'main', 'active'], ['stage', 'main', 5], ['rep>=', 'crown', -40]] },
      { t: 'I have things to discuss.', go: 'noaud', cond: [['q', 'main', 'active'], ['stage', 'main', 5], ['rep<', 'crown', -40]] },
      { t: 'The Duchess is busy.', go: null, cond: [['!flag', 'x']] }] },
    noaud: { t: 'The Crown does not receive enemies. Win back our trust first.', c: [{ t: '…', go: null }] },
    b: { t: 'Karreth the Hollow burned Ashenvale. A butcher. A weapon of Kharun\'s making, I am sure of it. Find him at Fort Cinderwatch — end him — and the Crown will not forget it.', c: [
      { t: 'I will find him. (trust her)', go: null, do: [['adv', 'main'], ['flag', 'trust_maelis'], ['rep', 'crown', 10]] },
      { t: 'Strange — the Banner was paid in Valdorian silver. (confront)', go: 'conf', cond: [['flag', 'knows_coin']] },
      { t: 'I\'ll see for myself. (stay wary)', go: null, do: [['adv', 'main']] }] },
    conf: { t: '(her smile does not move) Forgeries are easy. Go, Skyborn. Kill the man — and perhaps ask him who taught him to lie.', c: [{ t: 'I will.', go: null, do: [['adv', 'main'], ['rep', 'crown', -5]] }] } } },
  maelis_final: { start: 'a', nodes: {
    a: { t: 'You return from the Hollow, Skyborn, with your hands full of sky. The kingdom waits on you. What is your decision?', c: [
      { t: 'Hand the letter to the King. Expose you. (Crown of Dawn)', go: null, cond: [['item', 'maelis_letter']], do: [['ending', 'dawn']] },
      { t: 'Rule beside me? …Yes. Together. (Crown of Ash)', go: null, do: [['ending', 'ash']] },
      { t: 'Vorn Kharun will hear the truth first. (Dominion Dawn)', go: null, cond: [['rep>=', 'kharun', 10], ['item', 'maelis_letter']], do: [['ending', 'dominion']] },
      { t: 'The Spire falls. Let the sky be free. (Shatter)', go: null, cond: [['rep>=', 'spire', -10]], do: [['ending', 'shatter']] }] } } },
  aurel: { start: 'a', nodes: {
    a: { t: 'The marked one at last. I am Aurel, last Keeper of the Spire. The prophecy says: one shall mend or finish what the Sundering began. You carry all the signs.', c: [
      { t: 'I killed Karreth. The Duchess paid him.', go: 'b', cond: [['q', 'main', 'active'], ['stage', 'main', 7]] },
      { t: '(As a {cls}) What does the Spire ask of me?', go: 'cls' },
      { t: 'Tell me about the shards.', go: 'sh' },
      { t: 'Farewell.', go: null }] },
    b: { t: 'Then it begins in earnest. Three shards — Sky, Deep, Ember — open the Hollow Door below the Spire. Sky drifts on the high islands; Deep sleeps in the mountain cave; Ember burns on the second island, guarded by a wraith. Take them.', c: [{ t: 'Where do I begin?', go: null, do: [['adv', 'main'], ['rep', 'spire', 15], ['quest', 'collector']] }] },
    cls: { t: 'A {cls} serves the broken sky in their own manner. The Spire does not demand obedience — only decision.', c: [{ t: 'Understood.', go: 'a' }] },
    sh: { t: 'Look up when you walk. The islands are not far, if you know how to fall slowly. Aether updrafts rise near the Spire — step in, then glide.', c: [{ t: 'Thank you.', go: 'a' }] } } },
  ysolde: { start: 'a', nodes: {
    a: { t: 'Steel is just iron that argued with fire and lost. What do you need?', c: [
      { t: 'Show me your wares.', go: null, do: [['shop', 'ysolde']] },
      { t: 'Teach me smithing.', go: 'q', cond: [['q', 'smith_pride', 'none']] },
      { t: 'Here\'s your steel sword.', go: 'd', cond: [['q', 'smith_pride', 'active'], ['stage', 'smith_pride', 1]] },
      { t: 'Goodbye.', go: null }] },
    q: { t: 'Forge a steel longsword. Smelt iron at any forge — your own anvil works too. Bring me the proof when you\'re done.', c: [{ t: 'Challenge accepted.', go: null, do: [['quest', 'smith_pride']] }] },
    d: { t: 'Hm. Even edge, honest weight. You\'ll do.', c: [{ t: 'Thank you.', go: null, do: [['adv', 'smith_pride']] }] } } },
  orrin: { start: 'a', nodes: { a: { t: 'Orrin\'s Goods — a little of everything, and a lot of nothing you\'ll regret.', c: [{ t: 'Browse your wares.', go: null, do: [['shop', 'orrin']] }, { t: 'Goodbye.', go: null }] } } },
  halvard: { start: 'a', nodes: { a: { t: 'Reeve Halvard, Highcrown Property Office. A man without a roof is a man without a vote. Interested in a home?', c: [{ t: 'Show me what\'s for sale.', go: null, do: [['house']] }, { t: 'Not today.', go: null }] } } },
  tamsin: { start: 'a', nodes: { a: { t: 'Archivist Tamsin. Shh — the dead are sleeping on these shelves.', c: [{ t: 'What do you know about the Sundering?', go: 'l' }, { t: 'About the lore pages…', go: 'p', cond: [['q', 'collector', 'none']] }, { t: 'Goodbye.', go: null }] }, l: { t: 'A hundred years ago the Spire broke the sky. We call it the Sundering. Twelve pages of testimony survive, scattered by thieves and storms.', c: [{ t: 'Where?', go: 'p', cond: [['q', 'collector', 'none']] }, { t: 'Thanks.', go: 'a' }] }, p: { t: 'Collect all twelve and bring… well, just read them. The truth sorts itself out.', c: [{ t: 'I\'ll hunt them down.', go: null, do: [['quest', 'collector']] }] } } },
  hilde: { start: 'a', nodes: { a: { t: 'Warden Hilde of Frostgate. The wall holds, so long as we do.', c: [{ t: 'Need a hand?', go: 'q', cond: [['q', 'frost_siege', 'none']] }, { t: 'The scouts are dead.', go: 'd', cond: [['q', 'frost_siege', 'active'], ['stage', 'frost_siege', 1]] }, { t: 'Can I get the Ember Shard?', go: 'em', cond: [['q', 'main', 'active'], ['rep>=', 'kharun', 40], ['!flag', 'hilde_gift']] }, { t: 'Goodbye.', go: null }] }, q: { t: 'Valdorian scouts probe the foothills, five at least. Break them, and Kharun will remember.', c: [{ t: 'Consider it done.', go: null, do: [['quest', 'frost_siege']] }] }, d: { t: 'Lord Vorn will hear of this. Take this axe; it was my father\'s.', c: [{ t: 'Honored.', go: null, do: [['adv', 'frost_siege']] }] }, em: { t: 'The Dominion keeps no shards. But the Ember Shard you seek rests on a floating island — try Aurel\'s advice.', c: [{ t: 'Understood.', go: null, do: [['flag', 'hilde_gift']] }] } } },
  rurik: { start: 'a', nodes: { a: { t: 'Frostforge steel is thicker than Valdoria\'s and twice as cold.', c: [{ t: 'Show me.', go: null, do: [['shop', 'rurik']] }, { t: 'No.', go: null }] } } },
  sigrun: { start: 'a', nodes: { a: { t: 'Frozen Flagon. Eat, drink, thaw.', c: [{ t: 'Food, please.', go: null, do: [['shop', 'sigrun']] }, { t: 'A bed (12g).', go: null, cond: [['gold', 12]], do: [['gold', -12], ['rest']] }, { t: 'No.', go: null }] } } },
  dalla: { start: 'a', nodes: {
    a: { t: 'Harbormaster Dalla. Every crate is counted. Except lately.', c: [
      { t: 'Something missing?', go: 'q', cond: [['q', 'shipment', 'none']] },
      { t: 'I found the smugglers\' manifest.', go: 'd', cond: [['q', 'shipment', 'active'], ['stage', 'shipment', 2]] },
      { t: 'Goodbye.', go: null }] },
    q: { t: 'Cargo vanished from the east docks. There\'s a hidden cove east of town — smugglers, I\'d wager.', c: [{ t: 'I\'ll look into it.', go: null, do: [['quest', 'shipment']] }] },
    d: { t: 'The manifest… names half the harbor board. What will you do with it?', c: [
      { t: 'Return it to you. (honest)', go: null, do: [['take', 'crate_manifest', 1], ['adv', 'shipment'], ['gold', 300], ['rep', 'league', 20], ['rep', 'crown', 5]] },
      { t: 'Hand it to Highcrown\'s Crown. (political)', go: null, do: [['take', 'crate_manifest', 1], ['adv', 'shipment'], ['rep', 'league', -10], ['rep', 'crown', 20], ['gold', 100]] },
      { t: 'It\'s worth a lot to the buyers. (blackmail)', go: null, do: [['take', 'crate_manifest', 1], ['adv', 'shipment'], ['gold', 700], ['rep', 'league', -25], ['rep', 'ashen', 10]] }] } } },
  poul: { start: 'a', nodes: {
    a: { t: 'The sea gives to those who wait. Just ask old Poul.', c: [
      { t: 'Teach me to fish.', go: 'q', cond: [['q', 'angler', 'none']] },
      { t: 'What is the Sunken Veil?', go: 'sunken', cond: [['q', 'sunken_secrets', 'none']] },
      { t: 'I caught five.', go: 'd', cond: [['q', 'angler', 'active'], ['stage', 'angler', 1]] },
      { t: 'I recovered the Tide Stone.', go: 'sunken_done', cond: [['q', 'sunken_secrets', 'active'], ['stage', 'sunken_secrets', 1]] },
      { t: 'Goodbye.', go: null }] },
    q: { t: 'Stand at the water\'s edge, press E, and strike when the float dips. Catch five. And if you see gold… tell nobody.', c: [{ t: 'I\'ll try.', go: null, do: [['quest', 'angler']] }] },
    d: { t: 'Fine haul! You\'ve got the patience.', c: [{ t: 'Thanks.', go: null, do: [['adv', 'angler']] }] },
    sunken: { t: 'Ancient flooded ruins lie off the eastern shore — the Sunken Veil. The old folks say an ancient Tide Stone rests within the drowned altar.', c: [{ t: 'I will find it.', go: null, do: [['quest', 'sunken_secrets']] }] },
    sunken_done: { t: 'By the tides! The ancient stone! You have done what none in Saltmere dared. Take this ring from the old fleet.', c: [{ t: 'Thank you, Poul.', go: null, do: [['take', 'sunken_relic', 1], ['adv', 'sunken_secrets']] }] }
  } },
  zaya: { start: 'a', nodes: { a: { t: 'Zaya, purveyor of the unusual. Prices are firm. Coin is always welcome.', c: [{ t: 'Show me.', go: null, do: [['shop', 'zaya']] }, { t: 'No.', go: null }] } } },
  odo: { start: 'a', nodes: { a: { t: 'Drowned Lantern. Don\'t ask about the blue light.', c: [{ t: 'Food?', go: null, do: [['shop', 'odo']] }, { t: 'A bed (10g).', go: null, cond: [['gold', 10]], do: [['gold', -10], ['rest']] }, { t: 'No.', go: null }] } } },
  kaelen: { start: 'a', nodes: { a: { t: 'The Ashenvale rebuild moves forward day by day. We will make these stones proud again. Need supplies or building stock?', c: [{ t: 'Show me your supplies.', go: null, do: [['shop', 'kaelen']] }, { t: 'Keep strong, Kaelen.', go: null }] } } },
  rodrik: { start: 'a', nodes: { a: { t: 'Greetings wanderer! Rodrik\'s Travelling Caravan carries curiosities from every corner of the realm—gems, maps, and rare draughts.', c: [{ t: 'Browse your wares.', go: null, do: [['shop', 'rodrik']] }, { t: 'Safe travels.', go: null }] } } },
  aether_stag: { start: 'a', nodes: { a: { t: '(The stag studies you, antlers humming softly. It lowers its head — and lets you touch its brow.)', c: [{ t: '(Stay calm and bow.)', go: null, do: [['adv', 'stag'], ['toast', 'The aether stag accepts you.']] }] } } },
  fenn: { start: 'a', nodes: { a: { t: 'Aurel says the Door only opens when three shards are set. I\'ve checked the runes twice. Bring them and press the glowing stone.', c: [{ t: 'Thanks, Fenn.', go: null }] } } },
};
export const GENERIC_LINES: Record<string, string[]> = {
  farmer: ['Weather\'s turning. Crops can feel it.', 'The soil here is good if you respect it.', 'Mind the bear, friend.'],
  guard: ['Keep your blade sheathed in town.', 'Move along, citizen.', 'Eyes up. These are dangerous days.'],
  smith: ['Heat and hammer — that\'s the whole secret.', 'Bring ore if you want work done.'],
  merchant: ['Fine goods, fair prices!', 'Coin makes the world turn.'],
  child: ['Look! A real adventurer!', 'Have you seen the floating rocks?', 'I\'m going to be a knight!'],
  priest: ['May the sky look kindly on you.', 'The Sundering is a wound, not a curse.'],
  sailor: ['Salt and tar, that\'s a sailor\'s lot.', 'Smugglers on the east coast, mark my words.'],
  noble: ['Do not touch the silk.', 'The Duchess is a marvel, don\'t you think?'],
  villager: ['Good day!', 'Rain soon, I think.', 'Heard there\'s a Skyborn marked by the fallen sky.', 'The prophecy… my gran swore by it.'],
  miner: ['Iron\'s thin this season.', 'There\'s a cave north of Highcrown where the walls hum.'],
  hunter: ['Deer are skittish at dusk.', 'Wolves hunt the river bank at night.'],
  bard: ['♪ Oh, the sky came down and the stars all fell… ♪', 'Want a song? A coin buys a verse.'],
};

export const PRESETS: Record<string, any> = {
  Low: { scale: 0.6, shadows: 0, shadowSize: 0, trees: 0.18, grass: 0.12, flowers: 0.1, rocks: 0.4, npcDist: 45, animalDist: 55, vegDist: 110, particles: 0.2, fogFar: 140, tone: false, env: false, water: 0, fov: 70, birds: 0.3, moths: 0, vignette: false, treeShadows: false, antialiasHint: false, bloomGlow: 0 },
  Medium: { scale: 0.8, shadows: 1, shadowSize: 1024, trees: 0.4, grass: 0.35, flowers: 0.3, rocks: 0.6, npcDist: 70, animalDist: 80, vegDist: 170, particles: 0.5, fogFar: 220, tone: false, env: false, water: 1, fov: 72, birds: 0.6, moths: 0.2, vignette: false, treeShadows: false, bloomGlow: 0.2 },
  High: { scale: 1, shadows: 1, shadowSize: 2048, trees: 0.65, grass: 0.6, flowers: 0.6, rocks: 0.85, npcDist: 95, animalDist: 105, vegDist: 230, particles: 0.75, fogFar: 300, tone: true, env: false, water: 2, fov: 74, birds: 0.85, moths: 0.5, vignette: false, treeShadows: true, bloomGlow: 0.4 },
  Ultra: { scale: 1, shadows: 2, shadowSize: 3072, trees: 0.85, grass: 0.85, flowers: 0.85, rocks: 1, npcDist: 120, animalDist: 130, vegDist: 300, particles: 1, fogFar: 380, tone: true, env: true, water: 2, fov: 75, birds: 1, moths: 0.8, vignette: false, treeShadows: true, bloomGlow: 0.6 },
  Cinematic: { scale: 1, shadows: 2, shadowSize: 2048, trees: 0.75, grass: 0.7, flowers: 0.8, rocks: 1, npcDist: 105, animalDist: 115, vegDist: 260, particles: 1, fogFar: 340, tone: true, env: true, water: 3, fov: 68, birds: 1, moths: 1, vignette: true, treeShadows: true, bloomGlow: 0.8, letterbox: true },
  God: { scale: 1.5, shadows: 3, shadowSize: 4096, trees: 1, grass: 1, flowers: 1, rocks: 1, npcDist: 150, animalDist: 160, vegDist: 380, particles: 1.6, fogFar: 450, tone: true, env: true, water: 3, fov: 70, birds: 1.5, moths: 1.5, vignette: true, treeShadows: true, bloomGlow: 1, letterbox: true },
};
export const PRESET_DESC: Record<string, string> = {
  Low: 'Reduced render scale, no shadows, sparse vegetation. Best for weak hardware.',
  Medium: 'Balanced: soft shadow map, moderate vegetation and view distance.',
  High: 'Tone-mapped lighting, tree shadows, denser vegetation, animated water.',
  Ultra: 'Maximum standard quality: big shadow maps, dense world, environment reflections.',
  Cinematic: 'Atmospheric lighting, vignette & letterbox grading, reflective water, fireflies. Default.',
  God: 'Everything on: 4K shadows, 1.5× render scale, densest world, extra particles & effects.',
};

export const DEFAULT_KEYS: Record<string, string> = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', sprint: 'ShiftLeft', crouch: 'KeyC', interact: 'KeyE', attack: 'Mouse0', block: 'Mouse2', dodge: 'KeyQ', mount: 'KeyR', inventory: 'KeyI', skills: 'KeyK', quests: 'KeyJ', map: 'KeyM', ability1: 'Digit1', ability2: 'Digit2', ability3: 'Digit3', ability4: 'Digit4', ability5: 'Digit5', companion_cmd: 'KeyT', emote: 'KeyG', chat: 'Enter', potion: 'KeyH' };
export const KEY_LABELS: Record<string, string> = { forward: 'Move forward', back: 'Move back', left: 'Move left', right: 'Move right', jump: 'Jump / Glide', sprint: 'Sprint', crouch: 'Crouch / Sneak', interact: 'Interact', attack: 'Attack / Strike', block: 'Block / Parry', dodge: 'Dodge roll', mount: 'Mount / Dismount', inventory: 'Inventory', skills: 'Skills', quests: 'Journal', map: 'Map', ability1: 'Ability 1', ability2: 'Ability 2', ability3: 'Ability 3', ability4: 'Ability 4', ability5: 'Ability 5', companion_cmd: 'Companion Order', emote: 'Emote', chat: 'Chat', potion: 'Quick heal' };

// ----- WORLD DEFINITION -----
export const SETTLEMENTS: any[] = [
  { id: 'highcrown', name: 'Highcrown', kind: 'city', x: 0, z: -40, flat: 92, fac: 'crown', style: 'valdoria', houses: 44, walls: 76, music: 'city' },
  { id: 'thornwick', name: 'Thornwick', kind: 'village', x: -150, z: 90, flat: 48, fac: 'moon', style: 'thorn', houses: 15, music: 'village' },
  { id: 'frostgate', name: 'Frostgate', kind: 'town', x: 110, z: -190, flat: 60, fac: 'kharun', style: 'kharun', houses: 20, walls: 44, music: 'mountain' },
  { id: 'saltmere', name: 'Saltmere', kind: 'town', x: 175, z: 50, flat: 44, fac: 'league', style: 'salt', houses: 22, music: 'coast' },
  { id: 'ashenvale', name: 'Ashenvale (ruined)', kind: 'ruin', x: -60, z: 165, flat: 30, fac: null, style: 'burnt', houses: 8, music: 'ruin' },
];
export const POIS: any[] = [
  { id: 'highcrown', name: 'Highcrown', x: 0, z: -40, type: 'city', r: 75, xp: 60, always: true },
  { id: 'thornwick', name: 'Thornwick', x: -150, z: 90, type: 'village', r: 45, xp: 40, always: true },
  { id: 'frostgate', name: 'Frostgate', x: 110, z: -190, type: 'town', r: 50, xp: 60 },
  { id: 'saltmere', name: 'Saltmere', x: 175, z: 50, type: 'town', r: 50, xp: 60 },
  { id: 'ashenvale', name: 'Ashenvale (ruined)', x: -60, z: 165, type: 'ruin', r: 28, xp: 80 },
  { id: 'spire', name: 'Spire Ruins', x: -170, z: -150, type: 'ruin', r: 35, xp: 120 },
  { id: 'fort', name: 'Fort Cinderwatch', x: -10, z: 205, type: 'fort', r: 30, xp: 100 },
  { id: 'cave', name: 'Hollowdeep Mine', x: -92, z: -205, type: 'cave', r: 14, xp: 90 },
  { id: 'glimmer_grove', name: 'Glimmer Grove', x: -205, z: 20, type: 'magic', r: 22, xp: 120 },
  { id: 'smuggler_cove', name: "Smugglers' Cove", x: 222, z: 112, type: 'camp', r: 20, xp: 80 },
  { id: 'waterfall', name: 'Veilfall Cascade', x: 60, z: -150, type: 'wonder', r: 18, xp: 60 },
  { id: 'isle1', name: 'Skyreach Isle', x: -40, z: -110, type: 'sky', r: 20, xp: 100 },
  { id: 'isle2', name: 'Emberfloat Isle', x: -120, z: -60, type: 'sky', r: 20, xp: 100 },
  { id: 'isle3', name: 'Drift Garden', x: 60, z: 10, type: 'sky', r: 20, xp: 100 },
  { id: 'chapel', name: 'Ruined Chapel', x: 95, z: -30, type: 'ruin', r: 16, xp: 60 },
  { id: 'lighthouse', name: 'Drowned Lantern Light', x: 230, z: -30, type: 'wonder', r: 16, xp: 60 },
  { id: 'lodge', name: "Lyra's Old Lodge", x: -110, z: 150, type: 'camp', r: 14, xp: 40 },
  { id: 'sunken_veil', name: 'The Sunken Veil', x: 210, z: 10, type: 'ruin', r: 24, xp: 120 },
  { id: 'catacombs', name: 'Whispering Catacombs', x: 95, z: -35, type: 'cave', r: 18, xp: 110 },
  { id: 'sunken_temple', name: 'Sunken Aether Temple', x: 212, z: 12, type: 'ruin', r: 20, xp: 130 },
  { id: 'bastion_undercroft', name: 'Bastion Undercroft', x: -12, z: 215, type: 'fort', r: 18, xp: 120 },
  { id: 'grotto', name: 'Luminescent Grotto', x: 62, z: -155, type: 'cave', r: 18, xp: 100 },
  { id: 'sky_sanctum', name: 'Sky Sanctum', x: -80, z: -140, type: 'sky', r: 25, xp: 150 },
  { id: 'hollow_rift', name: 'The Hollow Rift', x: 0, z: 0, type: 'dimension', r: 0, xp: 300, hidden: true },
];
export const TIME_SPEED = 1 / 6; // in-game hours per real second  => 24h in 144s... see engine
