import { useSyncExternalStore } from 'react';
import { ABILITIES, CLASSES, COMPANIONS, DEFAULT_KEYS, DIALOGUE, FACTIONS, GENERIC_LINES, HOUSES, ITEMS, MOUNTS, PROFS, QUESTS, repTier, SAVE_VERSION, SHOPS, SKILLS } from './data';
import { audio } from './audio';

// ---------- tiny event bus + reactive store
const listeners = { ui: new Set<() => void>(), hud: new Set<() => void>() };
let verUI = 0, verHud = 0;
export const emitUI = () => { verUI++; listeners.ui.forEach((l) => l()); };
export const emitHud = () => { verHud++; listeners.hud.forEach((l) => l()); };
const sub = (k: 'ui' | 'hud') => (l: () => void) => { listeners[k].add(l); return () => { listeners[k].delete(l); }; };
export const useUI = () => useSyncExternalStore(sub('ui'), () => verUI, () => verUI);
export const useHud = () => useSyncExternalStore(sub('hud'), () => verHud, () => verHud);
const handlers: Record<string, Function[]> = {};
export const bus = { on(e: string, f: Function) { (handlers[e] ||= []).push(f); return () => { handlers[e] = handlers[e].filter((x) => x !== f); }; }, emit(e: string, ...a: any[]) { (handlers[e] || []).forEach((f) => f(...a)); } };

export const defaultSettings = () => ({
  preset: 'Cinematic', custom: {} as Record<string, any>, uiScale: 1, contrast: false, subtitles: true, textSize: 1, sens: 1, invertY: false, deadzone: 0.15, vibration: true, glyphs: 'auto', keys: { ...DEFAULT_KEYS } as Record<string, string>, fovAdd: 0, autosave: true, tutorial: true, showFps: false, reduceMotion: false,
});
export const S: any = {
  screen: 'menu', creatorMode: 'new', p: null, rep: {}, quests: {}, flags: {}, comp: {}, houses: {}, farm: {}, world: { time: 9, day: 1, weather: 'clear', clock: 0 }, discovered: {}, lore: {}, settings: defaultSettings(),
  ui: { codex: null as string | null, dialogue: null as any, shop: null as any, stable: false, houseSale: false, houseEdit: false, storage: false, confirm: null as any, toasts: [] as any[], subtitle: null as any, pause: false, settings: false, mp: false, prompt: null as any, loading: null as any, chat: false, tutorialSeen: {} as any, fish: null as any, dead: false, ending: null as any, mapWaypoint: null as any },
  hud: { hp: 100, mana: 50, sta: 100, region: '', time: '', weather: '', boss: null as any, target: null as any, cd: [0, 0, 0, 0, 0], buffs: [] as any[], mounted: false, glide: false, compass: 0, inside: false, speaking: null, fps: 0, input: 'kb', pad: 'xbox', msg: '', nearHint: null as any, combat: false, tracking: false },
  chatLog: [] as any[],
};
export const resetWorldState = () => { S.rep = Object.fromEntries(Object.keys(FACTIONS).map((k) => [k, 0])); S.quests = {}; S.flags = {}; S.comp = {}; S.houses = {}; S.farm = {}; S.world = { time: 9, day: 1, weather: 'clear', clock: 0 }; S.discovered = {}; S.lore = {}; };
resetWorldState();

// ---------- player
export const defaultLook = () => ({ build: 1, height: 1, skin: '#e0b48c', hair: 'short', hairColor: '#4a2f1b', eyes: '#3a6ea5', beard: 'none', brow: 'neutral', outfit: '#7b6a50' });
export function newPlayer(name: string, clsId: string, look: any) {
  const c = CLASSES.find((x) => x.id === clsId)!;
  const equip: any = {}; Object.entries(c.equip).forEach(([s, id]) => (equip[s] = id));
  const p: any = { name, cls: clsId, look, level: 1, xp: 0, attrs: { ...c.attrs }, unspent: 3, sp: 1, skills: {}, abilities: [...c.abilities], hotbar: [c.abilities[0], c.abilities[1], null, null, null], hp: 1, mana: 1, sta: 1, gold: 120, inv: {}, equip, mastery: { melee: 0, ranged: 0, magic: 0 }, mounts: ['horse'], mount: 'horse', prof: {}, pos: { x: -140, y: 0, z: 100, ry: 0 }, kills: 0, playtime: 0 };
  Object.values(equip).forEach((id: any) => { p.inv[id] = 1; });
  p.inv.potion_health = 3; p.inv.bread = 3; p.inv.potion_mana = 1;
  Object.keys(PROFS).forEach((k) => (p.prof[k] = { lvl: 1, xp: 0 }));
  S.p = p; resetWorldState(); const d = derived(); p.hp = d.maxHp; p.mana = d.maxMana; p.sta = d.maxSta;
  return p;
}
export const getClass = () => CLASSES.find((c) => c.id === S.p?.cls) || CLASSES[0];
export function skillMods() {
  const m: any = { melee: 0, ranged: 0, magic: 0, hp: 0, mana: 0, sta: 0, def: 0, crit: 0, speed: 0, regen: 0, steal: 0, gather: 0 };
  if (!S.p) return m;
  SKILLS.forEach((s) => { if (S.p.skills[s.id] && s.mods) for (const k in s.mods) m[k] += s.mods[k]; });
  return m;
}
export function gear(key: string) { let t = 0; if (!S.p) return 0; Object.values(S.p.equip).forEach((id: any) => { const it = ITEMS[id]; if (it) t += (it as any)[key] || 0; }); return t; }
export function derived() {
  const p = S.p, a = p.attrs, m = skillMods(), L = p.level, w = ITEMS[p.equip.weapon];
  const masteryB = (k: string) => 1 + Math.floor(Math.sqrt(p.mastery[k] / 12)) * 0.02;
  const kind = w?.kind || 'fist'; const isRanged = kind === 'bow', isMagic = kind === 'staff';
  const meleeAtk = ((w?.atk || 4) + a.str * 1.3 + a.dex * 0.35) * (1 + m.melee) * masteryB('melee');
  const rangedAtk = ((w?.atk || 4) + a.dex * 1.5) * (1 + m.ranged) * masteryB('ranged');
  const magicAtk = ((w?.mag || 0) + 6 + a.int * 2.2 + a.wis * 0.6) * (1 + m.magic) * masteryB('magic');
  const cap = 70 + a.str * 6;
  let weight = 0; Object.entries(p.inv).forEach(([id, n]: any) => { weight += (ITEMS[id]?.weight || 0) * n; });
  return {
    maxHp: Math.round(60 + a.vit * 10 + L * 6 + gear('hp') + m.hp), maxMana: Math.round(30 + a.int * 5 + a.wis * 4 + L * 3 + gear('mana') + m.mana), maxSta: Math.round(80 + a.dex * 2 + a.vit * 2 + m.sta),
    def: Math.round(a.vit * 0.5 + gear('def') + m.def), meleeAtk, rangedAtk, magicAtk, crit: 0.05 + a.dex * 0.005 + m.crit, speed: 1 + m.speed + gear('speed'), regen: 1 + m.regen, steal: m.steal, cap, weight, over: weight > cap,
    isRanged, isMagic, kind, atkPower: isRanged ? rangedAtk : isMagic ? magicAtk : meleeAtk, gather: m.gather,
  };
}
export const xpFor = (l: number) => Math.round(90 * Math.pow(l, 1.55));
export function gainXp(n: number) {
  const p = S.p; if (!p || p.level >= 30) return; p.xp += n;
  while (p.level < 30 && p.xp >= xpFor(p.level)) { p.xp -= xpFor(p.level); p.level++; p.unspent += 2; p.sp += 1; const d = derived(); p.hp = d.maxHp; p.mana = d.maxMana; p.sta = d.maxSta; audio.sfx('levelup'); toast(`LEVEL UP! You are now level ${p.level}. +2 attribute points, +1 skill point.`, 'level'); bus.emit('levelup'); }
  emitUI();
}
export function profXp(id: string, n: number) { const pr = S.p.prof[id]; if (!pr) return; pr.xp += n; const need = 30 + pr.lvl * 40; if (pr.xp >= need && pr.lvl < 10) { pr.xp -= need; pr.lvl++; toast(`${PROFS[id].name} increased to ${pr.lvl}!`, 'unlock'); audio.sfx('unlock'); } }
export function masteryXp(k: string, n = 1) { const p = S.p; const before = Math.floor(Math.sqrt(p.mastery[k] / 12)); p.mastery[k] += n; if (Math.floor(Math.sqrt(p.mastery[k] / 12)) > before) toast(`${k[0].toUpperCase() + k.slice(1)} mastery increased!`, 'unlock'); }

// ---------- inventory
export const count = (id: string) => S.p?.inv[id] || 0;
export function addItem(id: string, n = 1, silent = false) {
  if (!ITEMS[id]) return; const inv = S.p.inv; inv[id] = (inv[id] || 0) + n; if (!silent) { toast(`+${n} ${ITEMS[id].name}`, 'item'); audio.sfx('pickup'); }
  checkHave(); emitUI();
}
export function removeItem(id: string, n = 1) { const inv = S.p.inv; if ((inv[id] || 0) < n) return false; inv[id] -= n; if (inv[id] <= 0) { delete inv[id]; for (const s in S.p.equip) if (S.p.equip[s] === id) delete S.p.equip[s]; } emitUI(); return true; }
export function canEquip(id: string) { const it = ITEMS[id]; if (!it?.req) return true; return !it.req.lvl || S.p.level >= it.req.lvl; }
export function equip(id: string) {
  const it = ITEMS[id]; if (!it?.slot) return; if (!canEquip(id)) { toast(`Requires level ${it.req.lvl}.`, 'error'); audio.sfx('error'); return; }
  let slot = it.slot; if (slot === 'ring' || slot === 'amulet') slot = it.slot;
  S.p.equip[slot] = id; if (it.two) delete S.p.equip.offhand; if (slot === 'offhand' && ITEMS[S.p.equip.weapon]?.two) { toast('Two-handed weapon unequipped.', 'info'); delete S.p.equip.weapon; }
  audio.sfx('equip'); clampVitals(); bus.emit('appearance'); emitUI();
}
export function unequip(slot: string) { delete S.p.equip[slot]; audio.sfx('unequip'); clampVitals(); bus.emit('appearance'); emitUI(); }
export function clampVitals() { const d = derived(), p = S.p; p.hp = Math.min(p.hp, d.maxHp); p.mana = Math.min(p.mana, d.maxMana); p.sta = Math.min(p.sta, d.maxSta); }
export function useItem(id: string) {
  const it = ITEMS[id]; if (!it?.use) return; const p = S.p, d = derived(), u = it.use;
  if (!removeItem(id, 1)) return;
  if (u.hp) p.hp = Math.min(d.maxHp, p.hp + u.hp); if (u.mana) p.mana = Math.min(d.maxMana, p.mana + u.mana); if (u.sta) p.sta = Math.min(d.maxSta, p.sta + u.sta);
  if (u.buff) bus.emit('buff', u.buff, u.dur);
  audio.sfx(it.id.startsWith('potion') || it.id.startsWith('elixir') ? 'drink' : 'eat'); toast(`Used ${it.name}.`, 'info'); emitUI(); emitHud();
}
export function sellPrice(id: string, fac?: string) { return Math.max(1, Math.floor(ITEMS[id].value * 0.45 * (fac ? 1 / priceMod(fac) : 1))); }
export function buyPrice(id: string, fac?: string) { return Math.max(1, Math.ceil(ITEMS[id].value * (fac ? priceMod(fac) : 1))); }
export const priceMod = (fac: string) => Math.max(0.75, Math.min(1.35, 1 - (S.rep[fac] || 0) / 400));
export const shopRefused = (fac: string) => (S.rep[fac] || 0) <= -60;

export function addGold(n: number) { S.p.gold += n; if (n > 0) audio.sfx('coin'); emitUI(); }
export function changeRep(fac: string, n: number) { if (!(fac in S.rep)) return; const before = repTier(S.rep[fac]); S.rep[fac] = Math.max(-100, Math.min(100, S.rep[fac] + n)); const after = repTier(S.rep[fac]); toast(`${FACTIONS[fac].name}: ${n > 0 ? '+' : ''}${n}${before !== after ? ' → ' + after : ''}`, n > 0 ? 'rep' : 'repbad'); // companions react
  Object.keys(S.comp).forEach((cid) => { const c = S.comp[cid]; if (!c?.recruited) return; const def = COMPANIONS[cid]; if (def.likes.includes(fac) && n > 0) c.loyalty = Math.min(100, c.loyalty + 1); if (def.dislikes.includes(fac) && n > 0) c.loyalty = Math.max(0, c.loyalty - 2); if (def.likes.includes(fac) && n < 0) c.loyalty = Math.max(0, c.loyalty - 1); });
  emitUI(); }

// ---------- toasts / subtitles
let toastId = 1;
export function toast(text: string, kind = 'info') { const t = { id: toastId++, text, kind }; S.ui.toasts = [...S.ui.toasts.slice(-4), t]; if (kind === 'level' || kind === 'quest') audio.sfx(kind === 'quest' ? 'quest' : 'notify'); else if (kind === 'error') audio.sfx('error'); else if (kind === 'unlock' || kind === 'rep' || kind === 'repbad' || kind === 'discover') audio.sfx('notify'); emitUI(); setTimeout(() => { S.ui.toasts = S.ui.toasts.filter((x: any) => x.id !== t.id); emitUI(); }, 4800); }
let subT: any = null;
export function bark(name: string, text: string, ms = 4000) { S.ui.subtitle = { name, text }; emitUI(); clearTimeout(subT); subT = setTimeout(() => { S.ui.subtitle = null; emitUI(); }, ms); }

// ---------- quests
export const qState = (id: string) => (S.quests[id]?.done ? 'done' : S.quests[id] ? 'active' : 'none');
export const qStage = (id: string) => S.quests[id]?.stage ?? -1;
export function startQuest(id: string) {
  const q = QUESTS[id]; if (!q || S.quests[id]) return; S.quests[id] = { stage: 0, prog: 0, done: false, t: Date.now() };
  toast(`New ${q.kind === 'main' ? 'Main ' : ''}Quest: ${q.name}`, 'quest'); S.ui.tracked ||= id; if (q.kind === 'main' || !S.ui.tracked) S.ui.tracked = id;
  const g = q.stages[0].goal; if (g.t === 'talk' && g.n === q.giver) advance(id); else checkHave();
  emitUI();
}
export function advance(id: string) {
  const rec = S.quests[id], q = QUESTS[id]; if (!rec || rec.done) return; const st = q.stages[rec.stage]; (st.done || []).forEach((a: any) => runAction(a));
  rec.stage++; rec.prog = 0; if (rec.stage >= q.stages.length) return completeQuest(id);
  toast(`Quest updated: ${q.name}`, 'quest'); emitUI(); checkHave();
}
export function completeQuest(id: string) {
  const rec = S.quests[id], q = QUESTS[id]; if (!rec || rec.done) return; rec.done = true; const r = q.reward || {};
  toast(`Quest complete: ${q.name}`, 'quest'); if (r.xp) gainXp(r.xp); if (r.gold) addGold(r.gold); (r.items || []).forEach(([i, n]: any) => addItem(i, n)); if (r.rep) Object.entries(r.rep).forEach(([f, n]: any) => changeRep(f, n));
  if (r.mount && !S.p.mounts.includes(r.mount)) { S.p.mounts.push(r.mount); toast(`New mount unlocked: ${MOUNTS[r.mount].name}`, 'unlock'); }
  if (r.loyalty) Object.entries(r.loyalty).forEach(([c, n]: any) => { if (S.comp[c]) S.comp[c].loyalty = Math.min(100, S.comp[c].loyalty + n); });
  if (S.ui.tracked === id) S.ui.tracked = Object.keys(S.quests).find((k) => !S.quests[k].done) || null;
  bus.emit('questdone', id); emitUI();
}
export function questEvent(type: string, key: string, key2?: string, n = 1) {
  Object.keys(S.quests).forEach((id) => {
    const rec = S.quests[id]; if (rec.done) return; const g = QUESTS[id].stages[rec.stage].goal;
    if (g.t !== type) return; if (g.n !== key && g.n !== key2) return;
    rec.prog += n; if (rec.prog >= (g.c || 1)) advance(id); else emitUI();
  });
}
export function checkHave() {
  if (!S.p) return; Object.keys(S.quests).forEach((id) => {
    const rec = S.quests[id]; if (rec.done) return; const g = QUESTS[id].stages[rec.stage].goal;
    if (g.t === 'have') { const c = g.c || 1; const ok = g.n.every((i: string) => count(i) >= c); rec.prog = Math.min(...g.n.map((i: string) => count(i))); if (ok) advance(id); }
    if (g.t === 'lorecount') { rec.prog = Object.keys(S.lore).length; if (rec.prog >= g.n) advance(id); }
  });
}
export function questProgressText(id: string) { const rec = S.quests[id]; if (!rec || rec.done) return ''; const g = QUESTS[id].stages[rec.stage].goal; if (g.c && g.t !== 'have') return `${Math.min(rec.prog, g.c)}/${g.c}`; if (g.t === 'have') { return g.n.map((i: string) => `${ITEMS[i].name.replace(' Shard', '')} ${Math.min(count(i), g.c || 1)}/${g.c || 1}`).join(' · '); } if (g.t === 'lorecount') return `${Object.keys(S.lore).length}/${g.n}`; return ''; }
export function foundLore(i: number) { if (S.lore[i]) return; S.lore[i] = true; toast(`Lore page found: ${ITEMS['lore_' + i].name.replace('Lore: ', '')}`, 'discover'); gainXp(40); questEvent('lore', 'x'); checkHave(); }

// ---------- dialogue runtime
export function condOK(c: any[]) {
  const t = c[0];
  switch (t) {
    case 'rep>=': return S.rep[c[1]] >= c[2]; case 'rep<': return S.rep[c[1]] < c[2]; case 'flag': return !!S.flags[c[1]]; case '!flag': return !S.flags[c[1]];
    case 'q': return qState(c[1]) === c[2]; case 'stage': return S.quests[c[1]] && !S.quests[c[1]].done && S.quests[c[1]].stage === c[2];
    case 'cls': return S.p.cls === c[1]; case 'night': return S.world.time < 6 || S.world.time > 20; case 'gold': return S.p.gold >= c[1]; case 'item': return count(c[1]) > 0; case '!item': return count(c[1]) === 0;
  } return true;
}
export function runAction(a: any[]) {
  switch (a[0]) {
    case 'quest': startQuest(a[1]); break; case 'adv': advance(a[1]); break; case 'rep': changeRep(a[1], a[2]); break; case 'gold': addGold(a[1]); break;
    case 'give': addItem(a[1], a[2] || 1); break; case 'take': removeItem(a[1], a[2] || 1); break; case 'flag': S.flags[a[1]] = true; break;
    case 'toast': toast(a[1], 'info'); break; case 'xp': gainXp(a[1]); break; case 'lore': foundLore(a[1]); break;
    case 'shop': openShop(a[1]); break; case 'stable': closeDialogue(); S.ui.stable = true; break; case 'house': closeDialogue(); S.ui.houseSale = true; break;
    case 'rest': closeDialogue(); bus.emit('rest'); break; case 'heal': { const d = derived(); S.p.hp = d.maxHp; S.p.mana = d.maxMana; audio.sfx('spell_heal'); toast('You feel restored.', 'info'); break; }
    case 'recruit': recruit(a[1]); break; case 'dismiss': { if (S.comp[a[1]]) S.comp[a[1]].active = false; bus.emit('companions'); toast(`${COMPANIONS[a[1]].name} will wait here.`, 'info'); break; }
    case 'ending': { closeDialogue(); const r = S.quests.main; if (r && !r.done) { r.stage = QUESTS.main.stages.length - 1; advance('main'); } S.flags['ending_' + a[1]] = true; S.ui.ending = a[1]; S.screen = 'ending'; audio.setMood('story'); break; }
  }
  emitUI();
}
export function recruit(id: string) {
  const c = (S.comp[id] ||= { recruited: false, active: false, loyalty: 40 }); c.recruited = true;
  const act = Object.values(S.comp).filter((x: any) => x.active).length; c.active = act < 2; S.flags['rec_' + id] = true;
  toast(`${COMPANIONS[id].name} joins you!${c.active ? '' : ' (Party full — activate in Companions tab)'}`, 'unlock'); bus.emit('companions'); emitUI();
}
export function openShop(id: string) {
  const sh = SHOPS[id]; if (shopRefused(sh.fac)) { toast(`${sh.name} refuses to deal with you. (${FACTIONS[sh.fac].name}: ${repTier(S.rep[sh.fac])})`, 'error'); return; }
  S.ui.dialogue = null; S.ui.shop = { id, tab: 'buy' }; audio.sfx('open'); emitUI();
}
export function resolveDialogue(npc: any) {
  let id = npc.id;
  if (id === 'maelis' && S.quests.main && !S.quests.main.done && S.quests.main.stage === 11) id = 'maelis_final';
  if (DIALOGUE[id]) return { id, ...DIALOGUE[id] };
  return genericDialogue(npc);
}
export function genericDialogue(npc: any) {
  const lines = GENERIC_LINES[npc.role] || GENERIC_LINES.villager; const w = S.world; const fac = npc.fac;
  let text = lines[Math.floor((npc.seed || 1) * 997 + w.day) % lines.length];
  if (w.weather === 'rain' || w.weather === 'storm') text = 'Dreadful weather. ' + text; else if (w.time < 6 || w.time > 21) text = '*yawns* Late for wandering. ' + text;
  if (fac && S.rep[fac] >= 50) text = `Ah, a friend of ${FACTIONS[fac].name}! ` + text; else if (fac && S.rep[fac] <= -30) text = '*eyes you warily* ' + text;
  const choices: any[] = []; if (npc.shop && !shopRefused(SHOPS[npc.shop].fac)) choices.push({ t: 'Let me see your wares.', go: null, do: [['shop', npc.shop]] });
  choices.push({ t: 'Any news?', go: 'news' }); choices.push({ t: 'Farewell.', go: null });
  const news = ['Kingdoms quarrel; the sky itself is broken. We just try to eat.', 'Whispers of a marked one wandering the roads.', 'The floating islands are drifting closer, they say.', S.flags.trust_maelis ? 'They say the Duchess has a new champion.' : 'Rumour says the Duchess is hiding something.'];
  return { id: npc.id, start: 'a', nodes: { a: { t: text, c: choices }, news: { t: news[Math.floor((npc.seed || 1) * 31 + w.day) % news.length], c: [{ t: 'Thanks.', go: null }] } } };
}
export function openDialogue(npc: any) { const d = resolveDialogue(npc); S.ui.dialogue = { npc, d, node: d.start }; audio.sfx('open'); emitUI(); }
export function closeDialogue() { S.ui.dialogue = null; bus.emit('dialogueEnd'); emitUI(); }
export function chooseDialogue(ch: any) {
  audio.sfx('click'); (ch.do || []).forEach((a: any) => runAction(a)); if (!S.ui.dialogue) return;
  if (ch.go) S.ui.dialogue.node = ch.go; else closeDialogue(); emitUI();
}

// ---------- skills
export function canLearn(s: any) { if (S.p.skills[s.id]) return 'owned'; if (S.p.level < s.lvl) return `Requires level ${s.lvl}`; if (S.p.sp < s.cost) return `Needs ${s.cost} skill point(s)`; if (s.req && !s.req.every((r: string) => S.p.skills[r])) return 'Requires: ' + s.req.map((r: string) => SKILLS.find((x) => x.id === r)!.name).join(', '); return ''; }
export function learnSkill(s: any) { if (canLearn(s)) { audio.sfx('error'); return; } S.p.skills[s.id] = 1; S.p.sp -= s.cost; if (s.ability && !S.p.abilities.includes(s.ability)) { S.p.abilities.push(s.ability); const i = S.p.hotbar.indexOf(null); if (i >= 0) S.p.hotbar[i] = s.ability; toast(`Ability unlocked: ${ABILITIES[s.ability].name}`, 'unlock'); } else toast(`Skill learned: ${s.name}`, 'unlock'); audio.sfx('unlock'); clampVitals(); emitUI(); }
export function spendAttr(k: string) { if (S.p.unspent <= 0) return; S.p.attrs[k]++; S.p.unspent--; audio.sfx('confirm'); emitUI(); }

// ---------- saves (versioned, validated)
const KEY = (slot: string) => 'aetherfall.save.' + slot;
export function snapshot() { bus.emit('presave'); return { rep: S.rep, quests: S.quests, flags: S.flags, comp: S.comp, houses: S.houses, farm: S.farm, world: S.world, discovered: S.discovered, lore: S.lore, tracked: S.ui.tracked, p: S.p }; }
export function saveGame(slot = 'auto', quiet = false) {
  if (!S.p) return false;
  try { const d = snapshot(); localStorage.setItem(KEY(slot), JSON.stringify({ v: SAVE_VERSION, ts: Date.now(), summary: { name: S.p.name, cls: S.p.cls, level: S.p.level, day: S.world.day, gold: S.p.gold }, d })); if (!quiet) { toast(`Game saved (${slot === 'auto' ? 'autosave' : 'slot ' + slot}).`, 'info'); audio.sfx('confirm'); } return true; }
  catch (e) { toast('Save failed: storage unavailable.', 'error'); return false; }
}
export function readSlot(slot: string): any { const raw = localStorage.getItem(KEY(slot)); if (!raw) return null; try { const j = JSON.parse(raw); if (!validSave(j)) throw new Error('invalid'); return j; } catch { localStorage.setItem(KEY(slot) + '.corrupt', raw); localStorage.removeItem(KEY(slot)); return null; } }
export const validSave = (j: any) => j && typeof j.v === 'number' && j.d && j.d.p && j.d.p.name && j.d.p.attrs && j.d.p.inv && j.d.p.equip && CLASSES.some((c) => c.id === j.d.p.cls);
export function slotInfo(slot: string) { const j = readSlot(slot); return j ? { ...j.summary, ts: j.ts } : null; }
export function loadGame(slot = 'auto') {
  const j = readSlot(slot); if (!j) { toast('No valid save in that slot.', 'error'); return false; }
  const d = j.d; resetWorldState(); // migration: merge with defaults
  S.p = d.p; S.p.look = { ...defaultLook(), ...S.p.look }; S.p.mounts ||= ['horse']; S.p.mount ||= 'horse'; S.p.hotbar ||= [S.p.abilities?.[0] || null, S.p.abilities?.[1] || null, null, null, null];
  while (S.p.hotbar.length < 5) S.p.hotbar.push(null);
  S.p.prof = { ...Object.fromEntries(Object.keys(PROFS).map((k) => [k, { lvl: 1, xp: 0 }])), ...(S.p.prof || {}) }; S.p.mastery ||= { melee: 0, ranged: 0, magic: 0 };
  S.rep = { ...S.rep, ...d.rep }; S.quests = d.quests || {}; S.flags = d.flags || {}; S.comp = d.comp || {}; S.houses = d.houses || {}; S.farm = d.farm || {}; S.world = { ...S.world, ...d.world }; S.discovered = d.discovered || {}; S.lore = d.lore || {}; S.ui.tracked = d.tracked || null;
  return true;
}
export function setCompanionStance(id: string, stance: 'follow' | 'defend' | 'attack' | 'wait') {
  if (!S.comp[id]) S.comp[id] = { recruited: false, loyalty: 50, stance: 'follow' };
  S.comp[id].stance = stance;
  emitUI();
}
export function exportSaveJSON(slot = 'auto'): string {
  return localStorage.getItem(KEY(slot)) || '';
}
export function importSaveJSON(raw: string, slot = 'auto'): boolean {
  try {
    const j = JSON.parse(raw);
    if (!validSave(j)) { toast('Invalid save format.', 'error'); return false; }
    localStorage.setItem(KEY(slot), raw);
    toast(`Save imported to ${slot === 'auto' ? 'Autosave' : 'Slot ' + slot}!`, 'unlock');
    emitUI();
    return true;
  } catch {
    toast('Corrupted or invalid JSON save file.', 'error');
    return false;
  }
}
export function saveSettings() { try { localStorage.setItem('aetherfall.settings', JSON.stringify({ ...S.settings, audio: audio.save() })); } catch { /* ignore */ } }
export function loadSettings() { try { const raw = localStorage.getItem('aetherfall.settings'); if (!raw) return; const j = JSON.parse(raw); const d = defaultSettings(); S.settings = { ...d, ...j, keys: { ...d.keys, ...(j.keys || {}) } }; audio.load(j.audio); } catch { localStorage.removeItem('aetherfall.settings'); } }
export const hasAnySave = () => ['auto', '1', '2', '3'].some((s) => !!localStorage.getItem(KEY(s)));
export const houseState = (id: string) => (S.houses[id] ||= { owned: false, level: 1, furn: [], storage: {}, nid: 1 });
export const houseSlots = (id: string) => 10 + HOUSES[id].tier * 6 + (houseState(id).level - 1) * 6;
export const getPrefsClass = (id: string) => CLASSES.find((c) => c.id === id)!;
