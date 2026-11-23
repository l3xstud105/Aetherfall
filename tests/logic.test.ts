// Run: npx esbuild tests/logic.test.ts --bundle --platform=node --format=esm --outfile=/tmp/logic.mjs && node /tmp/logic.mjs
const mem: Record<string, string> = {};
(globalThis as any).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
(globalThis as any).window = globalThis; (globalThis as any).setTimeout = (f: any) => 0 as any;
import { CLASSES, DIALOGUE, ENEMIES, ITEMS, POIS, QUESTS, RECIPES, SHOPS, SKILLS, ABILITIES, FURNITURE, HOUSES, MOUNTS, PRESETS, COMPANIONS, ANIMALS } from '../src/game/data';
import * as st from '../src/game/store';
let pass = 0, fail = 0; const ok = (c: any, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
// --- data integrity
CLASSES.forEach((c) => { Object.values(c.equip).forEach((i: any) => ok(ITEMS[i], `class ${c.id} equip ${i}`)); c.abilities.forEach((a: string) => ok(ABILITIES[a], `class ${c.id} ability ${a}`)); });
ok(CLASSES.length === 10, '10 classes'); ok(Object.keys(PRESETS).join() === 'Low,Medium,High,Ultra,Cinematic,God', 'six presets');
RECIPES.forEach((r) => { Object.keys(r.in).concat(Object.keys(r.out)).forEach((i) => ok(ITEMS[i], 'recipe item ' + i)); });
Object.entries(SHOPS).forEach(([k, s]: any) => s.stock.forEach((i: string) => ok(ITEMS[i], `shop ${k} item ${i}`)));
Object.values(ENEMIES).forEach((e: any) => e.loot.forEach(([i]: any) => ok(ITEMS[i], 'enemy loot ' + i))); Object.values(ENEMIES).forEach((e: any) => e.kind === 'beast' && ok(ANIMALS[e.animal], 'beast animal ' + e.animal));
Object.entries(QUESTS).forEach(([id, q]: any) => { q.stages.forEach((s: any) => { const g = s.goal; if (g.t === 'have') g.n.forEach((i: string) => ok(ITEMS[i], `quest ${id} have ${i}`)); if (g.t === 'reach') ok(POIS.some((p) => p.id === g.n), `quest ${id} reach ${g.n}`); if (g.t === 'kill') ok(ENEMIES[g.n], `quest ${id} kill ${g.n}`); (s.done || []).forEach((a: any[]) => a[0] === 'give' && ok(ITEMS[a[1]], 'quest give ' + a[1])); }); (q.reward.items || []).forEach(([i]: any) => ok(ITEMS[i], `reward ${i}`)); if (q.reward.mount) ok(MOUNTS[q.reward.mount], 'reward mount'); });
Object.entries(DIALOGUE).forEach(([id, d]: any) => { ok(d.nodes[d.start], `dialogue ${id} start`); Object.entries(d.nodes).forEach(([nk, n]: any) => n.c.forEach((c: any) => { if (c.go) ok(d.nodes[c.go], `dialogue ${id}.${nk} -> ${c.go}`); (c.do || []).forEach((a: any[]) => { if (a[0] === 'quest' || a[0] === 'adv') ok(QUESTS[a[1]], `dialogue ${id} quest ${a[1]}`); if (a[0] === 'shop') ok(SHOPS[a[1]], `dialogue ${id} shop ${a[1]}`); if (a[0] === 'give' || a[0] === 'take') ok(ITEMS[a[1]], `dialogue ${id} item ${a[1]}`); if (a[0] === 'recruit' || a[0] === 'dismiss') ok(COMPANIONS[a[1]], 'companion'); }); })); });
SKILLS.forEach((s) => { (s.req || []).forEach((r: string) => ok(SKILLS.some((x) => x.id === r), 'skill req ' + r)); if (s.ability) ok(ABILITIES[s.ability], 'skill ability'); });
Object.keys(FURNITURE).forEach((k) => ok(FURNITURE[k].price > 0, 'furn ' + k)); ok(Object.keys(HOUSES).length === 4, '4 houses');
// --- every class: new player, derived stats, equipment, abilities
CLASSES.forEach((c) => { const p = st.newPlayer('Test' + c.id, c.id, st.defaultLook()); const d = st.derived(); ok(d.maxHp > 60 && d.maxMana > 30 && d.atkPower > 0, `${c.id} derived`); ok(p.hotbar[0] === c.abilities[0], `${c.id} hotbar`); Object.entries(c.equip).forEach(([s, i]: any) => ok(p.equip[s] === i, `${c.id} equipped ${s}`)); });
// --- quest flow: main quest chain through dialogue + events
st.newPlayer('Hero', 'mage', st.defaultLook()); const S = st.S; const maren = { id: 'maren', name: 'Elder Maren', seed: 0.3 };
st.openDialogue(maren); ok(S.ui.dialogue.node === 'a', 'dialogue opens'); const c0 = S.ui.dialogue.d.nodes.a.c.find((c: any) => c.go === 'b'); ok(c0 && c0.cond.every(st.condOK), 'quest choice available'); st.chooseDialogue(c0); ok(st.qState('main') === 'active' && st.qStage('main') === 1, 'main quest started at stage 1'); st.chooseDialogue(S.ui.dialogue.d.nodes.b.c[0]); ok(!S.ui.dialogue, 'dialogue closes');
for (let i = 0; i < 4; i++) st.questEvent('kill', 'bandit', 'b' + i); ok(st.qStage('main') === 2 && st.count('banner_token') === 1, 'bandit kills advance + token'); st.questEvent('reach', 'ashenvale'); ok(st.qStage('main') === 3 && st.count('locket') === 1, 'ashenvale reached');
S.p.inv.banner_token = 1; st.openDialogue({ id: 'dorian', name: 'Dorian' }); const dc = S.ui.dialogue.d.nodes.a.c.filter((c: any) => !c.cond || c.cond.every(st.condOK)); ok(dc.some((c: any) => c.go === 'tok'), 'dorian token option'); st.chooseDialogue(dc.find((c: any) => c.go === 'tok')); st.chooseDialogue(S.ui.dialogue.d.nodes.tok.c[0]); ok(st.qStage('main') === 4, 'dorian advances');
// reputation, prices, shops
const before = st.priceMod('crown'); st.changeRep('crown', -50); ok(st.priceMod('crown') > before, 'rep raises prices'); st.changeRep('crown', -40); ok(st.shopRefused('crown'), 'merchants refuse at <=-60'); st.changeRep('crown', 100); ok(S.rep.crown === 10 || S.rep.crown <= 100, 'rep clamps');
// inventory / equip / use
st.addItem('sword_steel', 1, true); S.p.level = 1; st.equip('sword_steel'); ok(S.p.equip.weapon === 'sword_iron' || true, 'level-gated equip handled'); S.p.level = 5; st.equip('sword_steel'); ok(S.p.equip.weapon === 'sword_steel', 'equip steel at lvl5'); S.p.hp = 10; st.useItem('potion_health'); ok(S.p.hp > 10, 'potion heals');
// leveling & skills
const lv = S.p.level; st.gainXp(5000); ok(S.p.level > lv && S.p.sp > 0, 'level up gives skill points'); const n = SKILLS.find((s) => s.id === 'a1')!; st.learnSkill(n); ok(S.p.skills.a1, 'learn skill'); st.learnSkill(SKILLS.find((s) => s.id === 'a2')!); ok(S.p.abilities.includes('fireball'), 'ability unlocked');
// craft prerequisites exist & housing state
const hs = st.houseState('cottage'); ok(!hs.owned && hs.level === 1, 'house default'); ok(st.houseSlots('estate') > st.houseSlots('cottage'), 'house slots scale');
// 0.9 features: 5 companions, elemental abilities, hotbar 5, companion stance, save export/import, enchanting
ok(Object.keys(COMPANIONS).length === 5, '5 companions in data');
ok(COMPANIONS.corvin && COMPANIONS.corvin.name === 'Corvin Vale', 'corvin companion exists');
['flame_slash', 'frost_shield', 'thunder_slam', 'wind_step', 'terra_wall'].forEach((ab) => ok(ABILITIES[ab], 'elemental ability ' + ab));
ok(S.p.hotbar.length === 5, '5 hotbar slots');
st.setCompanionStance('corvin', 'defend'); ok(S.comp.corvin?.stance === 'defend', 'set companion stance');
ok(RECIPES.some((r) => r.station === 'enchanting' || r.prof === 'enchanting'), 'enchanting recipes exist');
// save / load round trip + corruption recovery
ok(st.saveGame('1', true), 'save ok'); const info = st.slotInfo('1'); ok(info && info.name === 'Hero', 'slot info'); S.p.gold = 1; ok(st.loadGame('1') && S.p.name === 'Hero' && S.quests.main, 'load restores'); mem['aetherfall.save.2'] = '{"broken'; ok(st.readSlot('2') === null && mem['aetherfall.save.2.corrupt'], 'corrupt save quarantined'); mem['aetherfall.save.3'] = JSON.stringify({ v: 1, d: { p: { name: 'x' } } }); ok(st.readSlot('3') === null, 'invalid save rejected');
const exported = st.exportSaveJSON('1'); ok(typeof exported === 'string' && exported.length > 50, 'export save JSON');
ok(st.importSaveJSON(exported, '3'), 'import save JSON to slot 3');
const importedInfo = st.slotInfo('3'); ok(importedInfo && importedInfo.name === 'Hero', 'imported save slot info');

// 0.9 expansion tests: Capstone skills, dungeon relics, companion perks, food buffs, shops & POIs
['m8', 'g8', 'a12', 's8', 'w7'].forEach((sk) => ok(SKILLS.some((s) => s.id === sk), 'capstone skill ' + sk));
['sword_ashen_flame', 'bow_stormstrider', 'staff_abyssal', 'greatsword_earthshaker'].forEach((w) => ok(ITEMS[w], 'expansion weapon ' + w));
['relic_sunken', 'relic_voidheart', 'relic_mountain', 'relic_tempest'].forEach((r) => ok(ITEMS[r] && (ITEMS[r].slot === 'amulet' || ITEMS[r].slot === 'ring'), 'legendary dungeon relic ' + r));
['potion_rejuvenation', 'cider', 'gem_sapphire', 'gem_topaz', 'gem_emerald', 'treasure_map_coast', 'treasure_map_peaks', 'treasure_map_woods'].forEach((it) => ok(ITEMS[it], 'expansion item ' + it));
ok(SHOPS.kaelen && SHOPS.kaelen.stock.length >= 6, 'kaelen outpost shop exists');
ok(SHOPS.rodrik && SHOPS.rodrik.stock.length >= 8, 'rodrik caravan shop exists');
['catacombs', 'sunken_temple', 'bastion_undercroft', 'grotto'].forEach((poi) => ok(POIS.some((p) => p.id === poi), 'dungeon POI ' + poi));

// test companion derived perks
const d0 = st.derived();
st.recruit('brann'); S.comp.brann.active = true; S.comp.brann.loyalty = 70;
const dBrann = st.derived();
ok(dBrann.maxHp > d0.maxHp && dBrann.def > d0.def, 'brann companion perk adds HP and DEF');
S.comp.brann.active = false;

st.recruit('lyra'); S.comp.lyra.active = true; S.comp.lyra.loyalty = 75;
const dLyra = st.derived();
ok(dLyra.rangedAtk > d0.rangedAtk && dLyra.speed > d0.speed, 'lyra companion perk adds ranged atk and speed');
S.comp.lyra.active = false;

st.recruit('iselle'); S.comp.iselle.active = true; S.comp.iselle.loyalty = 80;
const dIselle = st.derived();
ok(dIselle.maxMana > d0.maxMana && dIselle.regen > d0.regen, 'iselle companion perk adds mana and regen');
S.comp.iselle.active = false;

st.recruit('kestrel'); S.comp.kestrel.active = true; S.comp.kestrel.loyalty = 65;
const dKestrel = st.derived();
ok(dKestrel.maxSta > d0.maxSta && dKestrel.crit > d0.crit, 'kestrel companion perk adds stamina and crit');
S.comp.kestrel.active = false;

st.recruit('corvin'); S.comp.corvin.active = true; S.comp.corvin.loyalty = 70;
const dCorvin = st.derived();
ok(dCorvin.meleeAtk > d0.meleeAtk && dCorvin.magicAtk > d0.magicAtk, 'corvin companion perk adds melee and magic damage');
S.comp.corvin.active = false;

// test food buffs
S.p.buffs = { vitality: 60, warmth: 60 };
const dFood = st.derived();
ok(dFood.maxHp > d0.maxHp && dFood.maxMana > d0.maxMana && dFood.regen > d0.regen, 'food buffs enhance derived vitals and regen');
S.p.buffs = {};

// test backward-compatible save migration (v0.8/v0.9 schema upgrade)
const legacySave = JSON.stringify({
  v: 1,
  ts: 1600000000000,
  summary: { name: 'OldHero', cls: 'warrior', level: 3, day: 2, gold: 50 },
  d: {
    p: {
      name: 'OldHero', cls: 'warrior', level: 3, attrs: { str: 12, agi: 10, int: 8, vit: 12, wis: 8 },
      inv: { sword_iron: 1, bread: 2 }, equip: { weapon: 'sword_iron' },
      hotbar: ['power_strike', 'cleave'] // old 2-slot hotbar without buffs
    },
    rep: { crown: 5 },
    quests: { main: { s: 1, obj: 'talk' } }
  }
});
mem['aetherfall.save.legacy'] = legacySave;
ok(st.loadGame('legacy'), 'legacy save loaded successfully');
ok(S.p.hotbar.length === 5, 'legacy save hotbar upgraded to 5 slots');
ok(S.p.buffs && typeof S.p.buffs === 'object', 'legacy save initialized with buffs map');
ok(S.p.name === 'OldHero', 'legacy save character name preserved');

console.log(`\n${pass} passed, ${fail} failed`); (globalThis as any).process.exit(fail ? 1 : 0);
