import { useEffect, useRef, useState } from 'react';
import { CLASSES, FACTIONS, FURNITURE, HOUSES, ITEMS, MOUNTS, SHOPS, repTier } from '../game/data';
import { S, addGold, addItem, buyPrice, chooseDialogue, closeDialogue, condOK, count, derived, emitUI, houseSlots, houseState, priceMod, removeItem, sellPrice, toast, useUI } from '../game/store';
import { api } from '../game/game';
import { audio } from '../game/audio';
import { net } from '../game/net';
import { Btn, ItemTip, Key, Window, hideTip, iconOf, showTip, sfx } from './ui';

export function Dialogue() {
  useUI(); const dl = S.ui.dialogue!; const node = dl.d.nodes[dl.node]; const clsName = CLASSES.find((c) => c.id === S.p.cls)!.name;
  const text = (node?.t || '').replace(/\{cls\}/g, clsName); const [n, setN] = useState(0); const key = dl.d.id + dl.node; const done = n >= text.length;
  useEffect(() => { setN(0); S.hud.speaking = dl.npc.id; const pitch = dl.npc.def?.pitch || 1; let i = 0; const t = setInterval(() => { i += 2; setN(i); if (i % 6 === 0) audio.blip(pitch, 1); if (i >= text.length) { clearInterval(t); S.hud.speaking = null; } }, 24); return () => { clearInterval(t); S.hud.speaking = null; }; }, [key]);
  const choices = (node?.c || []).filter((c: any) => !c.cond || c.cond.every(condOK));
  const pick = (c: any) => { if (!done) { setN(999); } chooseDialogue(c); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!done) setN(999); else if (choices.length === 1) pick(choices[0]); } const d = Number(e.key); if (d >= 1 && d <= choices.length) { e.preventDefault(); pick(choices[d - 1]); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [key, done, choices.length]);
  const npc = dl.npc; const fac = npc.fac ? FACTIONS[npc.fac] : null; const rep = npc.fac ? S.rep[npc.fac] : 0;
  return (
    <div className="fixed left-0 right-0 bottom-0 z-30 flex justify-center p-4 pointer-events-none anim-pop"><div data-modal="1" className="panel pointer-events-auto w-full" style={{ maxWidth: 900, padding: '1rem 1.4rem' }} onClick={() => !done && setN(999)}>
      <div className="flex items-center gap-3 mb-2"><div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(227,185,79,0.18)', border: '1px solid var(--line)', fontSize: 22 }}>{npc.role === 'animal' ? '🦌' : npc.name?.[0]}</div><div><div className="title text-lg">{npc.name}</div>{fac && <div className="dim" style={{ fontSize: '0.75em', color: fac.color }}>{fac.name} · {repTier(rep)}</div>}</div></div>
      <div style={{ minHeight: '3.4em', fontSize: `${1.05 * S.settings.textSize}em`, lineHeight: 1.5 }}>{text.slice(0, n)}{!done && <span className="dim">▌</span>}</div>
      <div className="flex flex-col gap-2 mt-3">{done && choices.map((c: any, i: number) => <Btn key={i} className="text-left anim-fade" onClick={() => pick(c)}><span className="dim">{i + 1}.</span> {c.t.replace(/\{cls\}/g, clsName)}</Btn>)}{!done && <div className="dim" style={{ fontSize: '0.8em' }}>Click or press <Key a="jump" /> to skip…</div>}</div>
      <div className="dim mt-2" style={{ fontSize: '0.72em' }}>Press 1–9 to choose · Esc to leave</div>
    </div></div>
  );
}

export function Shop() {
  useUI(); const sh = S.ui.shop!; const def = SHOPS[sh.id]; const [sel, setSel] = useState<string | null>(null); const tab = sh.tab; const fac = def.fac; const m = Math.round((priceMod(fac) - 1) * 100);
  const sell = Object.keys(S.p.inv).filter((i) => ITEMS[i] && ITEMS[i].type !== 'quest' && !Object.values(S.p.equip).includes(i) && ITEMS[i].value > 0);
  const list = tab === 'buy' ? def.stock : sell; const it = sel ? ITEMS[sel] : null;
  const act = () => { if (!it) return; if (tab === 'buy') { const pr = buyPrice(it.id, fac); if (S.p.gold < pr) { toast('Not enough gold.', 'error'); sfx('error'); return; } addGold(-pr); addItem(it.id, 1, true); audio.sfx('coin'); } else { if (count(it.id) <= 0) return; removeItem(it.id, 1); addGold(sellPrice(it.id, fac)); } emitUI(); };
  return (
    <Window title={def.name} icon="🏪" onClose={() => { S.ui.shop = null; emitUI(); }} w="min(900px,96vw)" h="min(640px,90vh)">
      <div className="p-4 flex flex-col gap-3 h-full"><div className="flex gap-2 items-center flex-wrap"><Btn sel={tab === 'buy'} onClick={() => { sh.tab = 'buy'; setSel(null); emitUI(); }}>Buy</Btn><Btn sel={tab === 'sell'} onClick={() => { sh.tab = 'sell'; setSel(null); emitUI(); }}>Sell</Btn><div className="ml-auto">🪙 <b>{S.p.gold}</b></div></div>
        <div className="dim" style={{ fontSize: '0.82em' }}>{FACTIONS[fac].name}: <b>{repTier(S.rep[fac])}</b> → prices {m > 0 ? '+' : ''}{m}%{m > 0 ? ' (your reputation costs you)' : m < 0 ? ' (friends get a discount)' : ''}</div>
        <div className="flex gap-4 flex-1 min-h-0 flex-wrap md:flex-nowrap"><div className="flex-1 overflow-auto"><div className="flex flex-wrap gap-2">{list.length === 0 && <div className="dim">Nothing to {tab}.</div>}{list.map((id: string) => <div key={id} tabIndex={0} data-nav className={`slot r-${ITEMS[id].rarity} ${sel === id ? 'sel' : ''}`} onMouseEnter={(e) => { sfx('hover'); showTip(e, <ItemTip id={id} />); }} onMouseLeave={hideTip} onClick={() => { sfx('tap'); setSel(id); }} onKeyDown={(e) => e.key === 'Enter' && setSel(id)}>{iconOf(id)}{tab === 'sell' && S.p.inv[id] > 1 && <span className="n">{S.p.inv[id]}</span>}</div>)}</div></div>
          <div className="card p-3 w-full md:w-[290px]">{it ? <><div className={`title r-${it.rarity}`} style={{ border: 'none', boxShadow: 'none', animation: 'none' }}>{it.name}</div><div className="dim mb-2" style={{ fontSize: '0.8em' }}>{it.rarity} {it.kind || it.slot || it.type}</div><div className="mb-2">{it.desc}</div>{it.atk ? <div>Attack {it.atk}</div> : null}{it.def ? <div>Defence {it.def}</div> : null}{it.mag ? <div>Magic {it.mag}</div> : null}<div className="my-2">Price: <b style={{ color: 'var(--gold2)' }}>{tab === 'buy' ? buyPrice(it.id, fac) : sellPrice(it.id, fac)}g</b></div><Btn disabled={tab === 'buy' && S.p.gold < buyPrice(it.id, fac)} onClick={act}>{tab === 'buy' ? 'Buy' : 'Sell 1'}</Btn></> : <div className="dim">Select an item. Merchants buy at roughly 45% of value (adjusted by reputation).</div>}</div></div></div>
    </Window>
  );
}

export function Stable() {
  useUI(); const buy = (k: string) => { const m = MOUNTS[k]; if (S.p.gold < m.price) { toast('Not enough gold.', 'error'); sfx('error'); return; } if (m.req?.moon && S.rep.moon < m.req.moon) { toast('The Moonwardens do not yet trust you with their wolves.', 'error'); sfx('error'); return; } S.p.gold -= m.price; S.p.mounts.push(k); S.p.mount = k; audio.sfx('whinny'); toast(`You bought a ${m.name}.`, 'unlock'); emitUI(); };
  return (
    <Window title="Hob's Stables" icon="🐎" onClose={() => { S.ui.stable = false; emitUI(); }} w="min(720px,95vw)" h="auto">
      <div className="p-4 grid gap-3 md:grid-cols-2">{Object.entries(MOUNTS).map(([k, m]: any) => { const own = S.p.mounts.includes(k); return <div key={k} className="card p-3"><div className="title">{m.name}</div><div className="dim" style={{ fontSize: '0.85em' }}>{m.desc} ×{m.speed.toFixed(1)} speed</div><div className="mt-2">{own ? <span style={{ color: 'var(--good)' }}>✔ Owned</span> : m.price ? <Btn disabled={S.p.gold < m.price || (m.req?.moon && S.rep.moon < m.req.moon)} onClick={() => buy(k)}>Buy — {m.price}g</Btn> : <span className="dim">Not for sale</span>}{!own && m.req?.moon && <span className="dim" style={{ fontSize: '0.8em' }}> · needs Moonwardens Friendly</span>}</div></div>; })}</div>
    </Window>
  );
}

export function HouseSale() {
  useUI(); const sel = S.ui.saleId;
  return (
    <Window title="Property Office — Homes of Valdoria" icon="🏠" onClose={() => { S.ui.houseSale = false; S.ui.saleId = null; emitUI(); }} w="min(820px,96vw)" h="auto">
      <div className="p-4 grid gap-3 md:grid-cols-2">{Object.entries(HOUSES).map(([k, h]: any) => { const hs = houseState(k); return <div key={k} className="card p-4" style={{ borderColor: sel === k ? 'var(--gold2)' : undefined }}><div className="title text-lg">{h.name}</div><div className="dim" style={{ fontSize: '0.85em' }}>{h.town} · {h.w}×{h.d}m · up to {houseSlots(k)} furniture{h.stairs ? ' · split-level great hall with stairs' : ''}</div><div className="my-2">{h.desc}</div>
        {hs.owned ? <div style={{ color: 'var(--good)' }}>✔ Owned (level {hs.level}) — find the door in {h.town}</div> : <Btn disabled={S.p.gold < h.price} onClick={() => api.buyHouse(k)}>Purchase — {h.price}g</Btn>}</div>; })}<div className="md:col-span-2 dim" style={{ fontSize: '0.85em' }}>Owned homes keep your furniture, storage and upgrades across saves. Walk to the property's door and press E. Inside, use "Furnish home" to decorate, upgrade and store items.</div></div>
    </Window>
  );
}

export function HouseEdit() {
  useUI(); const hid = api.currentHouse(); const [tab, setTab] = useState('catalog'); const close = () => { S.ui.houseEdit = false; emitUI(); };
  if (!hid) return <Window title="Furnish" onClose={close} w="420px" h="auto"><div className="p-5">Enter one of your homes to furnish it.</div></Window>;
  const hs = houseState(hid), H = HOUSES[hid]; const slots = houseSlots(hid); const up = Math.round(H.price * 0.5 * hs.level);
  return (
    <div className="fixed right-3 top-3 bottom-3 z-40 w-[360px] max-w-[94vw] anim-fade pointer-events-auto"><div data-modal="1" className="panel win h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}><div><div className="title">{H.name}</div><div className="dim" style={{ fontSize: '0.78em' }}>Level {hs.level} · {hs.furn.length}/{slots} furniture · 🪙 {S.p.gold}</div></div><Btn className="sm" onClick={close}>✕</Btn></div>
      <div className="flex gap-1 px-3 pt-2">{[['catalog', 'Catalog'], ['placed', 'Placed'], ['prop', 'Property']].map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'sel' : ''}`} onClick={() => { sfx('tab'); setTab(k); }}>{l}</button>)}</div>
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
        <div className="dim" style={{ fontSize: '0.78em' }}>Items appear in front of you. Walk around (WASD) while this panel is open, then use Move / Rotate to arrange.</div>
        {tab === 'catalog' && Object.entries(FURNITURE).map(([k, f]: any) => { const st = hs.stash?.[k] || 0; return <div key={k} className="card p-2 flex items-center gap-2"><span style={{ fontSize: 24 }}>{f.icon}</span><div className="flex-1"><div>{f.name}</div><div className="dim" style={{ fontSize: '0.75em' }}>{f.use ? `Interactive: ${f.use}` : 'Decoration'}{st ? ` · ${st} in storage` : ''}</div></div><Btn className="sm" disabled={hs.furn.length >= slots || (!st && S.p.gold < f.price)} onClick={() => api.placeFurniture(hid, k)}>{st ? 'Place' : f.price + 'g'}</Btn></div>; })}
        {tab === 'placed' && (hs.furn.length === 0 ? <div className="dim">Nothing placed yet.</div> : hs.furn.map((f: any) => <div key={f.id} className="card p-2 flex items-center gap-2"><span style={{ fontSize: 22 }}>{FURNITURE[f.k].icon}</span><div className="flex-1">{FURNITURE[f.k].name}</div><Btn className="sm" title="Move to in front of you" onClick={() => api.moveFurniture(hid, f.id)}>Move</Btn><Btn className="sm" onClick={() => api.rotateFurniture(hid, f.id)}>⟳</Btn><Btn className="sm danger" onClick={() => api.removeFurniture(hid, f.id)}>Store</Btn></div>))}
        {tab === 'prop' && <><div className="card p-3"><div className="title">Upgrade</div><div className="dim mb-2" style={{ fontSize: '0.85em' }}>Each level enlarges rooms by 20% and adds 6 furniture slots. Max level 3.</div><Btn disabled={hs.level >= 3 || S.p.gold < up} onClick={() => api.upgradeHouse(hid)}>{hs.level >= 3 ? 'Max level' : `Upgrade to level ${hs.level + 1} — ${up}g`}</Btn></div><div className="card p-3"><div className="title">Storage</div><div className="dim mb-2" style={{ fontSize: '0.85em' }}>Place a Storage Chest, then interact with it to move items in and out. {Object.keys(hs.storage).length} stacks stored.</div><div className="dim" style={{ fontSize: '0.85em' }}>Stations: a Hearth, Anvil & Forge, or Alchemy Table in your home works as a real crafting station. A Bed saves the game and restores health. A Mirror reopens the character creator.</div></div></>}
      </div></div></div>
  );
}

export function Storage() {
  useUI(); const hid = api.currentHouse(); const close = () => { S.ui.storage = false; emitUI(); }; if (!hid) { return null; } const hs = houseState(hid);
  const inv = Object.keys(S.p.inv).filter((i) => !Object.values(S.p.equip).includes(i) && ITEMS[i].type !== 'quest');
  const grid = (ids: string[], src: any, toHouse: boolean) => <div className="flex flex-wrap gap-2">{ids.length === 0 && <div className="dim">Empty</div>}{ids.map((id) => <div key={id} tabIndex={0} data-nav className={`slot r-${ITEMS[id].rarity}`} onMouseEnter={(e) => { sfx('hover'); showTip(e, <ItemTip id={id} />); }} onMouseLeave={hideTip} onClick={(e) => api.storeItem(hid, id, e.shiftKey ? src[id] : 1, toHouse)} onKeyDown={(e) => e.key === 'Enter' && api.storeItem(hid, id, 1, toHouse)}>{iconOf(id)}<span className="n">{src[id]}</span></div>)}</div>;
  return (
    <Window title="Home Storage" icon="📦" onClose={close} w="min(900px,96vw)" h="min(560px,88vh)"><div className="p-4 grid gap-4 md:grid-cols-2 h-full"><div><div className="title mb-2">Your pack <span className="dim" style={{ fontSize: '0.7em' }}>(click: store 1 · shift-click: all)</span></div>{grid(inv, S.p.inv, true)}</div><div><div className="title mb-2">Storage chest <span className="dim" style={{ fontSize: '0.7em' }}>(click: take 1)</span></div>{grid(Object.keys(hs.storage), hs.storage, false)}</div></div></Window>
  );
}

export function Multiplayer() {
  useUI(); const [code, setCode] = useState((new URLSearchParams(location.search).get('join') || '').toUpperCase()); const close = () => { S.ui.mp = false; emitUI(); }; const on = net.status === 'hosting' || net.status === 'joined'; const link = `${location.origin}${location.pathname}?join=${net.code}`;
  const roster = [...net.roster.values()]; const ref = useRef<HTMLInputElement>(null); void ref;
  return (
    <Window title="Multiplayer" icon="🌐" onClose={close} w="min(640px,96vw)" h="auto">
      <div className="p-5 flex flex-col gap-3"><div className="dim" style={{ fontSize: '0.85em' }}>Real peer-to-peer multiplayer (WebRTC). Host a world, then share the code or link with friends. Players see each other move, emote, chat and share the same time of day & weather. Your character, quests and housing stay your own.</div>
        <div className="card p-3 flex items-center gap-2"><span className="chip sel">{net.status}</span>{net.error && <span style={{ color: 'var(--bad)', fontSize: '0.85em' }}>{net.error}</span>}{on && <span className="ml-auto">Players online: <b>{net.count()}</b></span>}</div>
        {!on && <><div className="flex gap-2"><Btn className="flex-1" disabled={net.status === 'connecting'} onClick={() => net.host()}>🏰 Host a new world</Btn></div><div className="flex gap-2"><input className="input" placeholder="Enter 6-letter world code" value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') net.join(code); }} /><Btn disabled={code.length < 4 || net.status === 'connecting'} onClick={() => net.join(code)}>Join</Btn></div></>}
        {on && <><div className="card p-3 text-center"><div className="dim" style={{ fontSize: '0.8em' }}>World code</div><div className="title" style={{ fontSize: '2.2em', letterSpacing: '0.3em' }}>{net.code}</div><div className="flex gap-2 justify-center mt-2"><Btn className="sm" onClick={() => { navigator.clipboard?.writeText(net.code); toast('Code copied.', 'info'); }}>Copy code</Btn><Btn className="sm" onClick={() => { navigator.clipboard?.writeText(link); toast('Invite link copied.', 'info'); }}>Copy invite link</Btn></div></div>
          <div className="card p-3"><div className="title mb-1">Players</div><div>🧙 {S.p.name} (you)</div>{roster.map((r: any, i) => <div key={i}>🧑 {r.name} <span className="dim">· Lv {r.level} {CLASSES.find((c) => c.id === r.cls)?.name}</span></div>)}{roster.length === 0 && <div className="dim">Waiting for friends…</div>}</div><div className="dim" style={{ fontSize: '0.8em' }}>Press <Key a="chat" /> in-game to chat. Press <Key a="emote" /> to emote.</div><Btn className="danger" onClick={() => { net.leave(); toast('Left multiplayer.', 'info'); }}>Leave world</Btn></>}
        <div className="dim" style={{ fontSize: '0.75em' }}>Requires internet access to the public PeerJS signalling service (only used to introduce players). If a strict firewall blocks WebRTC, direct connections may fail.</div></div>
    </Window>
  );
}
void CLASSES; void closeDialogue; void derived;
