import { useEffect, useRef, useState } from 'react';
import { CLASSES, FACTIONS, FURNITURE, HOUSES, ITEMS, MOUNTS, SHOPS, repTier } from '../game/data';
import { S, addGold, addItem, buyPrice, chooseDialogue, closeDialogue, condOK, count, derived, emitUI, houseSlots, houseState, priceMod, removeItem, sellPrice, toast, useUI } from '../game/store';
import { api } from '../game/game';
import { audio } from '../game/audio';
import { net } from '../game/net';
import { Btn, Empty, ItemTip, Key, Window, hideTip, iconOf, showTip, sfx } from './ui';

export function Dialogue() {
  useUI(); const dl = S.ui.dialogue!; const node = dl.d.nodes[dl.node]; const clsName = CLASSES.find((c) => c.id === S.p.cls)!.name;
  const text = (node?.t || '').replace(/\{cls\}/g, clsName); const [n, setN] = useState(0); const key = dl.d.id + dl.node; const done = n >= text.length;
  useEffect(() => { setN(0); S.hud.speaking = dl.npc.id; const pitch = dl.npc.def?.pitch || 1; let i = 0; const t = setInterval(() => { i += 2; setN(i); if (i % 6 === 0) audio.blip(pitch, 1); if (i >= text.length) { clearInterval(t); S.hud.speaking = null; } }, 24); return () => { clearInterval(t); S.hud.speaking = null; }; }, [key]);
  const choices = (node?.c || []).filter((c: any) => !c.cond || c.cond.every(condOK));
  const pick = (c: any) => { if (!done) { setN(999); } chooseDialogue(c); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!done) setN(999); else if (choices.length === 1) pick(choices[0]); } const d = Number(e.key); if (d >= 1 && d <= choices.length) { e.preventDefault(); pick(choices[d - 1]); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [key, done, choices.length]);
  const npc = dl.npc; const fac = npc.fac ? FACTIONS[npc.fac] : null; const rep = npc.fac ? S.rep[npc.fac] : 0;
  return (
    <div className="fixed left-0 right-0 bottom-0 z-30 flex justify-center p-4 pointer-events-none anim-pop"><div data-modal="1" className="panel win pointer-events-auto w-full" style={{ maxWidth: 900, padding: '1rem 1.4rem', borderLeft: fac ? `3px solid ${fac.color}` : undefined }} onClick={() => !done && setN(999)}>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 12, background: 'radial-gradient(circle at 50% 30%, rgba(227,185,79,0.24), rgba(20,16,10,0.9))', border: '1px solid var(--line-strong)', fontSize: 22 }}>{npc.role === 'animal' ? '🦌' : npc.name?.[0]}</div>
        <div><div className="title text-lg">{npc.name}</div>{fac && <div style={{ fontSize: '0.75em', color: fac.color }}>{fac.name} · {repTier(rep)}</div>}</div>
      </div>
      <div className="divider-orn" style={{ margin: '0.2em 0 0.6em' }}><span>✦</span></div>
      <div style={{ minHeight: '3.4em', fontSize: `${1.05 * S.settings.textSize}em`, lineHeight: 1.5 }}>{text.slice(0, n)}{!done && <span className="dim">▌</span>}</div>
      <div className="flex flex-col gap-2 mt-3">{done && choices.map((c: any, i: number) => <Btn key={i} className="text-left anim-fade" onClick={() => pick(c)}><span style={{ color: 'var(--gold)' }}>{i + 1}.</span> {c.t.replace(/\{cls\}/g, clsName)}</Btn>)}{!done && <div className="dim" style={{ fontSize: '0.8em' }}>Click or press <Key a="jump" /> to skip…</div>}</div>
      <div className="faint mt-2" style={{ fontSize: '0.72em' }}>Press 1–9 to choose · Esc to leave</div>
    </div></div>
  );
}

export function Shop() {
  useUI(); const sh = S.ui.shop!; const def = SHOPS[sh.id]; const [sel, setSel] = useState<string | null>(null); const tab = sh.tab; const fac = def.fac; const m = Math.round((priceMod(fac) - 1) * 100);
  const sell = Object.keys(S.p.inv).filter((i) => ITEMS[i] && ITEMS[i].type !== 'quest' && !Object.values(S.p.equip).includes(i) && ITEMS[i].value > 0);
  const list = tab === 'buy' ? def.stock : sell; const it = sel ? ITEMS[sel] : null;
  const act = () => { if (!it) return; if (tab === 'buy') { const pr = buyPrice(it.id, fac); if (S.p.gold < pr) { toast('Not enough gold.', 'error'); sfx('error'); return; } addGold(-pr); addItem(it.id, 1, true); audio.sfx('coin'); } else { if (count(it.id) <= 0) return; removeItem(it.id, 1); addGold(sellPrice(it.id, fac)); } emitUI(); };
  return (
    <Window title={def.name} sub={`${FACTIONS[fac].name} · ${repTier(S.rep[fac])}`} icon="🏪" onClose={() => { S.ui.shop = null; emitUI(); }} w="min(900px,96vw)" h="min(640px,90vh)">
      <div className="p-4 flex flex-col gap-3 h-full"><div className="flex gap-2 items-center flex-wrap"><Btn sel={tab === 'buy'} onClick={() => { sh.tab = 'buy'; setSel(null); emitUI(); }}>Buy</Btn><Btn sel={tab === 'sell'} onClick={() => { sh.tab = 'sell'; setSel(null); emitUI(); }}>Sell</Btn><div className="ml-auto" style={{ color: 'var(--gold2)', fontWeight: 700 }}>🪙 {S.p.gold}</div></div>
        <div className="dim" style={{ fontSize: '0.82em' }}>{FACTIONS[fac].name}: <b>{repTier(S.rep[fac])}</b> → prices {m > 0 ? '+' : ''}{m}%{m > 0 ? ' (your reputation costs you)' : m < 0 ? ' (friends get a discount)' : ''}</div>
        <div className="flex gap-4 flex-1 min-h-0 flex-wrap md:flex-nowrap"><div className="flex-1 overflow-auto"><div className="flex flex-wrap gap-2">{list.length === 0 && <Empty icon="🎒" title={`Nothing to ${tab}`}>{tab === 'sell' ? 'Your pack holds no sellable goods right now.' : 'This merchant is out of stock.'}</Empty>}{list.map((id: string) => <div key={id} tabIndex={0} data-nav className={`slot r-${ITEMS[id].rarity} ${sel === id ? 'sel' : ''}`} onMouseEnter={(e) => { sfx('hover'); showTip(e, <ItemTip id={id} />); }} onMouseLeave={hideTip} onClick={() => { sfx('tap'); setSel(id); }} onKeyDown={(e) => e.key === 'Enter' && setSel(id)}>{iconOf(id)}{tab === 'sell' && S.p.inv[id] > 1 && <span className="n">{S.p.inv[id]}</span>}</div>)}</div></div>
          <div className="card p-3 w-full md:w-[290px]">{it ? <><div className={`title r-${it.rarity}`} style={{ border: 'none', boxShadow: 'none', animation: 'none' }}>{it.name}</div><div className="dim mb-2" style={{ fontSize: '0.8em' }}>{it.rarity} {it.kind || it.slot || it.type}</div><div className="mb-2">{it.desc}</div>{it.atk ? <div>Attack {it.atk}</div> : null}{it.def ? <div>Defence {it.def}</div> : null}{it.mag ? <div>Magic {it.mag}</div> : null}<div className="my-2">Price: <b style={{ color: 'var(--gold2)' }}>🪙 {tab === 'buy' ? buyPrice(it.id, fac) : sellPrice(it.id, fac)}g</b></div><Btn className="primary" disabled={tab === 'buy' && S.p.gold < buyPrice(it.id, fac)} onClick={act}>{tab === 'buy' ? 'Buy' : 'Sell 1'}</Btn></> : <div className="dim">Select an item. Merchants buy at roughly 45% of value (adjusted by reputation).</div>}</div></div></div>
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
  const grid = (ids: string[], src: any, toHouse: boolean) => <div className="flex flex-wrap gap-2">{ids.length === 0 && <Empty icon="📦" title="Empty">{toHouse ? 'Your pack has nothing storable.' : 'This chest holds nothing yet.'}</Empty>}{ids.map((id) => <div key={id} tabIndex={0} data-nav className={`slot r-${ITEMS[id].rarity}`} onMouseEnter={(e) => { sfx('hover'); showTip(e, <ItemTip id={id} />); }} onMouseLeave={hideTip} onClick={(e) => api.storeItem(hid, id, e.shiftKey ? src[id] : 1, toHouse)} onKeyDown={(e) => e.key === 'Enter' && api.storeItem(hid, id, 1, toHouse)}>{iconOf(id)}<span className="n">{src[id]}</span></div>)}</div>;
  return (
    <Window title="Home Storage" icon="📦" onClose={close} w="min(900px,96vw)" h="min(560px,88vh)"><div className="p-4 grid gap-4 md:grid-cols-2 h-full"><div><div className="title mb-2">Your pack <span className="dim" style={{ fontSize: '0.7em' }}>(click: store 1 · shift-click: all)</span></div>{grid(inv, S.p.inv, true)}</div><div><div className="title mb-2">Storage chest <span className="dim" style={{ fontSize: '0.7em' }}>(click: take 1)</span></div>{grid(Object.keys(hs.storage), hs.storage, false)}</div></div></Window>
  );
}

export function Multiplayer() {
  useUI();
  const [tab, setTab] = useState<'realm' | 'friends' | 'party' | 'market' | 'peer'>('realm');
  const [code, setCode] = useState((new URLSearchParams(location.search).get('join') || '').toUpperCase());
  const [partyTarget, setPartyTarget] = useState('');
  const [tradeTarget, setTradeTarget] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [marketSearch, setMarketSearch] = useState('');
  const [marketSellItem, setMarketSellItem] = useState('');
  const [marketSellQty, setMarketSellQty] = useState(1);
  const [marketSellPrice, setMarketSellPrice] = useState(10);
  const [marketSubTab, setMarketSubTab] = useState<'browse' | 'sell' | 'my'>('browse');
  const [lfgDungeon, setLfgDungeon] = useState('crypt');

  const close = () => { S.ui.mp = false; emitUI(); };

  useEffect(() => {
    if (tab === 'friends') net.requestFriendsList();
    if (tab === 'market') {
      net.requestMarketBrowse(marketSearch);
      net.requestMyMarketListings();
    }
  }, [tab]);

  const onPeer = net.status === 'hosting' || net.status === 'joined';
  const link = `${location.origin}${location.pathname}?join=${net.code}`;
  const roster = [...net.roster.values()];

  const dungeons = [
    { id: 'crypt', name: 'Whispering Catacombs (Lv 1–10)' },
    { id: 'sunken_temple', name: 'Sunken Aether Temple (Lv 8–18)' },
    { id: 'fortress_undercroft', name: 'Bastion Undercroft (Lv 12–22)' },
    { id: 'grotto', name: 'Luminescent Grotto (Lv 15–25)' },
    { id: 'hollow_rift', name: 'The Hollow Rift (Lv 20+ End-Game)' }
  ];

  return (
    <Window title="Aetherfall MMORPG Realm & Social" icon="🌐" onClose={close} w="min(760px,96vw)" h="min(580px,90vh)">
      <div className="p-4 flex flex-col gap-3 h-full overflow-hidden">
        <div className="flex gap-1 pb-1 flex-wrap" style={{ borderBottom: '1px solid var(--line-faint)' }}>
          {[['realm', '🌐 Realm Status'], ['friends', `👥 Friends (${S.friends?.length || 0})`], ['party', '🛡️ Party & LFG'], ['market', '⚖️ Marketplace'], ['peer', '🔗 Peer Co-op']].map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? 'sel' : ''}`} onClick={() => { sfx('tab'); setTab(k as any); }}>{l}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {tab === 'realm' && (
            <div className="flex flex-col gap-3">
              <div className="card p-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-base" style={{ color: '#9cc6ff' }}>Aetherfall Global Realm</div>
                  <div className="dim text-xs">Authoritative Dedicated Server · Port 7777 · 20Hz Tick</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="chip" style={net.status === 'realm' ? { borderColor: 'rgba(127,211,138,0.6)', color: '#9ae8b0', background: 'rgba(127,211,138,0.12)' } : {}}>
                    {net.status === 'realm' ? '● CONNECTED' : net.status.toUpperCase()}
                  </span>
                  {net.status === 'realm' && <span className="text-sm font-semibold" style={{ color: '#9ae8b0' }}>Online: {net.onlineCount}</span>}
                </div>
              </div>

              {net.status !== 'realm' ? (
                <div className="flex flex-col gap-2">
                  <div className="dim text-sm">You are currently playing in Offline Campaign mode. Connect to join the living shared realm.</div>
                  <Btn className="big realm" onClick={() => net.connectRealm()}>
                    🌐 Connect to Global Realm
                  </Btn>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="card p-3 flex flex-col gap-2">
                    <div className="h-sec">Initiate Player Trade</div>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Enter player name to trade with..."
                        value={tradeTarget}
                        onChange={(e) => setTradeTarget(e.target.value)}
                      />
                      <Btn disabled={!tradeTarget.trim()} onClick={() => {
                        if (net.realmWs?.readyState === 1) {
                          net.realmWs.send(JSON.stringify({ t: 'trade_req', targetName: tradeTarget.trim() }));
                          toast(`Trade request sent to ${tradeTarget.trim()}`, 'info');
                          setTradeTarget('');
                        }
                      }}>
                        🤝 Send Trade Request
                      </Btn>
                    </div>
                  </div>

                  <div className="card p-3 flex flex-col gap-2">
                    <div className="h-sec">Inspect Player Profile</div>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        placeholder="Enter player name to inspect..."
                        value={partyTarget}
                        onChange={(e) => setPartyTarget(e.target.value)}
                      />
                      <Btn disabled={!partyTarget.trim()} onClick={() => {
                        net.requestInspect(partyTarget.trim());
                        setPartyTarget('');
                      }}>
                        🔍 Inspect
                      </Btn>
                    </div>
                  </div>

                  <Btn className="danger self-start" onClick={() => { net.leave(); toast('Disconnected from realm.', 'info'); }}>
                    Disconnect from Realm
                  </Btn>
                </div>
              )}
            </div>
          )}

          {tab === 'friends' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Enter character name to add as friend..."
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                />
                <Btn disabled={!friendInput.trim()} onClick={() => {
                  net.sendFriendReq(friendInput.trim());
                  setFriendInput('');
                }}>
                  + Add Friend
                </Btn>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                {(!S.friends || S.friends.length === 0) && (
                  <Empty icon="🕊️" title="No friends yet">Add fellow travelers by character name — they appear here with live online status, and you can whisper or invite them to a party.</Empty>
                )}
                {(S.friends || []).map((f: any) => (
                  <div key={f.id} className="card p-2.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${f.online ? 'on' : 'off'}`} />
                      <div>
                        <span className="font-bold">{f.name}</span>
                        <span className="dim text-xs ml-2">Lv {f.level} {f.cls} {f.online ? `· ${f.zone}` : '· Offline'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {f.online && (
                        <>
                          <Btn className="sm" onClick={() => { net.sendChat(`/w ${f.name} `); S.ui.chat = true; close(); }}>Whisper</Btn>
                          <Btn className="sm" onClick={() => net.sendPartyInvite(f.name)}>Party</Btn>
                        </>
                      )}
                      <Btn className="sm danger" onClick={() => net.sendFriendRemove(f.id)}>Remove</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'party' && (
            <div className="flex flex-col gap-3">
              <div className="card p-3 flex flex-col gap-2">
                <div className="h-sec">Party Management</div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Enter player name to invite..."
                    value={partyTarget}
                    onChange={(e) => setPartyTarget(e.target.value)}
                  />
                  <Btn disabled={!partyTarget.trim()} onClick={() => { net.sendPartyInvite(partyTarget.trim()); setPartyTarget(''); }}>
                    Invite to Party
                  </Btn>
                </div>

                {S.party && S.party.members && (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="dim text-xs">Party Members:</div>
                    {S.party.members.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center text-xs py-1 px-2 rounded" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line-faint)' }}>
                        <span>{m.name} (Lv {m.level} {m.cls})</span>
                        <span style={{ color: '#9ae8b0' }}>{Math.ceil(m.hp)}/{m.maxHp || 100} HP</span>
                      </div>
                    ))}
                    <Btn className="sm danger self-start mt-1" onClick={() => net.sendPartyLeave()}>Leave Party</Btn>
                  </div>
                )}
              </div>

              {/* LFG Dungeon Matchmaking */}
              <div className="card p-3 flex flex-col gap-2">
                <div className="h-sec">Cooperative Dungeon Matchmaking (LFG)</div>
                <div className="dim text-xs">Queue for group dungeon instances across the realm:</div>
                <div className="flex gap-2">
                  <select
                    className="input flex-1"
                    value={lfgDungeon}
                    onChange={(e) => setLfgDungeon(e.target.value)}
                  >
                    {dungeons.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {S.lfg?.status === 'queued' ? (
                    <Btn className="danger" onClick={() => net.sendLfgLeave()}>Leave Queue</Btn>
                  ) : (
                    <Btn className="realm" onClick={() => net.sendLfgJoin(lfgDungeon)}>
                      🔍 Find Group
                    </Btn>
                  )}
                </div>
                {S.lfg?.status === 'queued' && (
                  <div className="dim text-xs anim-fade" style={{ color: '#9cc6ff' }}>
                    ⏳ Searching for realm adventurers... ({S.lfg.queueSize} in queue)
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'market' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1 pb-1 text-xs" style={{ borderBottom: '1px solid var(--line-faint)' }}>
                {[['browse', 'Browse Market'], ['sell', 'Sell from Pack'], ['my', `My Listings (${S.market?.myListings?.length || 0})`]].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={`tab ${marketSubTab === k ? 'sel' : ''}`}
                    onClick={() => { sfx('tab'); setMarketSubTab(k as any); if (k === 'my') net.requestMyMarketListings(); }}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {marketSubTab === 'browse' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Search items by name..."
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && net.requestMarketBrowse(marketSearch)}
                    />
                    <Btn onClick={() => net.requestMarketBrowse(marketSearch)}>Search</Btn>
                  </div>
                  <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                    {(!S.market?.listings || S.market.listings.length === 0) && (
                      <Empty icon="⚖️" title="No listings found">No active listings match your search. Be the first to list an item for the realm.</Empty>
                    )}
                    {(S.market?.listings || []).map((l: any) => {
                      const def = ITEMS[l.item_id];
                      return (
                        <div key={l.id} className="card p-2 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{iconOf(l.item_id)}</span>
                            <div>
                              <div className="font-bold">{def?.name || l.item_id} <span style={{ color: 'var(--gold2)' }}>x{l.qty}</span></div>
                              <div className="dim">Seller: {l.seller_name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm" style={{ color: 'var(--gold2)' }}>🪙 {l.price}g</span>
                            <Btn
                              className="sm primary"
                              disabled={S.p?.gold < l.price || l.seller_id === S.p?.id}
                              onClick={() => net.sendMarketBuy(l.id)}
                            >
                              Buy
                            </Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {marketSubTab === 'sell' && (
                <div className="card p-3 flex flex-col gap-3">
                  <div className="h-sec">List Item on Realm Marketplace</div>
                  <div className="flex flex-col gap-1">
                    <label className="dim text-xs">Select Item from Your Bag:</label>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-faint)' }}>
                      {Object.entries(S.p?.inv || {}).filter(([id, qty]) => (qty as number) > 0 && ITEMS[id]?.type !== 'quest').map(([id, qty]) => {
                        const def = ITEMS[id];
                        const sel = marketSellItem === id;
                        return (
                          <button
                            key={id}
                            className={`chip cursor-pointer ${sel ? 'sel' : ''}`}
                            onClick={() => { setMarketSellItem(id); setMarketSellQty(1); }}
                          >
                            <span>{iconOf(id)} {def?.name || id}</span>
                            <span className="dim">({qty as number})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {marketSellItem && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="dim text-xs">Quantity to Sell (Max: {S.p?.inv?.[marketSellItem] || 1}):</label>
                        <input
                          type="number"
                          min={1}
                          max={S.p?.inv?.[marketSellItem] || 1}
                          value={marketSellQty}
                          className="input w-full"
                          onChange={(e) => setMarketSellQty(Math.max(1, Math.min(S.p?.inv?.[marketSellItem] || 1, Number(e.target.value) || 1)))}
                        />
                      </div>
                      <div>
                        <label className="dim text-xs">Listing Price (Gold):</label>
                        <input
                          type="number"
                          min={1}
                          value={marketSellPrice}
                          className="input w-full"
                          onChange={(e) => setMarketSellPrice(Math.max(1, Number(e.target.value) || 1))}
                        />
                      </div>
                    </div>
                  )}

                  <Btn
                    className="big primary self-end"
                    disabled={!marketSellItem}
                    onClick={() => {
                      net.sendMarketList(marketSellItem, marketSellQty, marketSellPrice);
                      setMarketSellItem('');
                    }}
                  >
                    List on Marketplace
                  </Btn>
                </div>
              )}

              {marketSubTab === 'my' && (
                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                  {(!S.market?.myListings || S.market.myListings.length === 0) && (
                    <Empty icon="📜" title="No listings">You have no active or historical listings. Sell items from your pack to reach every player on the realm.</Empty>
                  )}
                  {(S.market?.myListings || []).map((l: any) => {
                    const def = ITEMS[l.item_id];
                    return (
                      <div key={l.id} className="card p-2 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{iconOf(l.item_id)}</span>
                          <div>
                            <div className="font-bold">{def?.name || l.item_id} <span style={{ color: 'var(--gold2)' }}>x{l.qty}</span></div>
                            <div className="dim text-xs capitalize">Status: <span style={l.status === 'sold' ? { color: 'var(--good)', fontWeight: 700 } : l.status === 'active' ? { color: '#9cc6ff' } : {}}>{l.status}</span></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm" style={{ color: 'var(--gold2)' }}>🪙 {l.price}g</span>
                          {l.status === 'active' && (
                            <Btn className="sm danger" onClick={() => net.sendMarketCancel(l.id)}>Cancel</Btn>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'peer' && (
            <div className="flex flex-col gap-3">
              <div className="card p-3 flex items-center gap-2">
                <span className="chip sel">{net.status}</span>
                {net.error && <span style={{ color: 'var(--bad)', fontSize: '0.85em' }}>{net.error}</span>}
                {onPeer && <span className="ml-auto">Players online: <b>{net.count()}</b></span>}
              </div>
              {!onPeer && (
                <>
                  <div className="flex gap-2">
                    <Btn className="flex-1" disabled={net.status === 'connecting'} onClick={() => net.host()}>🏰 Host a new world</Btn>
                  </div>
                  <div className="flex gap-2">
                    <input className="input" placeholder="Enter 6-letter world code" value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') net.join(code); }} />
                    <Btn disabled={code.length < 4 || net.status === 'connecting'} onClick={() => net.join(code)}>Join</Btn>
                  </div>
                </>
              )}
              {onPeer && (
                <>
                  <div className="card p-3 text-center">
                    <div className="dim" style={{ fontSize: '0.8em' }}>World code</div>
                    <div className="title" style={{ fontSize: '2.2em', letterSpacing: '0.3em' }}>{net.code}</div>
                    <div className="flex gap-2 justify-center mt-2">
                      <Btn className="sm" onClick={() => { navigator.clipboard?.writeText(net.code); toast('Code copied.', 'info'); }}>Copy code</Btn>
                      <Btn className="sm" onClick={() => { navigator.clipboard?.writeText(link); toast('Invite link copied.', 'info'); }}>Copy invite link</Btn>
                    </div>
                  </div>
                  <div className="card p-3">
                    <div className="title mb-1">Players</div>
                    <div>🧙 {S.p.name} (you)</div>
                    {roster.map((r: any, i) => (
                      <div key={i}>🧑 {r.name} <span className="dim">· Lv {r.level} {CLASSES.find((c) => c.id === r.cls)?.name}</span></div>
                    ))}
                    {roster.length === 0 && <div className="dim">Waiting for friends…</div>}
                  </div>
                  <Btn className="danger" onClick={() => { net.leave(); toast('Left multiplayer.', 'info'); }}>Leave world</Btn>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}

export function InspectModal() {
  useUI();
  const p = S.inspectTarget;
  if (!p || !S.ui.inspect) return null;
  const cls = CLASSES.find((c) => c.id === p.cls);

  return (
    <Window title={`Inspect: ${p.name}`} icon="🔍" onClose={() => { S.ui.inspect = false; S.inspectTarget = null; emitUI(); }} w="min(520px,96vw)" h="auto">
      <div className="p-4 flex flex-col gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="flex items-center justify-center text-3xl" style={{ width: 52, height: 52, borderRadius: 12, background: 'radial-gradient(circle at 50% 30%, rgba(227,185,79,0.22), rgba(20,16,10,0.9))', border: '1px solid var(--line-strong)' }}>
            {cls?.icon || '🧙'}
          </div>
          <div className="flex flex-col">
            <div className="title text-lg">{p.name}</div>
            <div className="dim text-xs">Level {p.level} {cls?.name || p.cls} {p.guild_name && <span className="text-amber-300 font-semibold">[{p.guild_tag}] &lt;{p.guild_name}&gt;</span>}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="card p-2">
            <div style={{ color: '#ff9a8a', fontWeight: 700 }}>Health</div>
            <div className="font-bold text-sm">{Math.ceil(p.hp)} / {p.max_hp}</div>
          </div>
          <div className="card p-2">
            <div style={{ color: '#8ab4ff', fontWeight: 700 }}>Mana</div>
            <div className="font-bold text-sm">{Math.ceil(p.mana)} / {p.max_mana}</div>
          </div>
          <div className="card p-2">
            <div style={{ color: '#a5e88a', fontWeight: 700 }}>Stamina</div>
            <div className="font-bold text-sm">{Math.ceil(p.stamina)} / {p.max_stamina}</div>
          </div>
        </div>

        <div className="card p-3 flex flex-col gap-1">
          <div className="h-sec mb-1">Equipped Gear</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(p.equip || {}).map(([slot, itemId]) => {
              const def = ITEMS[itemId as string];
              return (
                <div key={slot} className="flex items-center gap-1.5 p-1 rounded" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line-faint)' }}>
                  <span className="dim capitalize w-14">{slot}:</span>
                  <span className="font-semibold">{iconOf(itemId as string)} {def?.name || itemId}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2" style={{ borderTop: '1px solid var(--line-faint)' }}>
          <Btn onClick={() => { net.sendChat(`/w ${p.name} `); S.ui.chat = true; S.ui.inspect = false; emitUI(); }}>💬 Whisper</Btn>
          <Btn onClick={() => { net.sendPartyInvite(p.name); toast(`Invited ${p.name} to party`, 'info'); }}>🛡️ Invite to Party</Btn>
          <Btn onClick={() => { net.sendFriendReq(p.name); }}>🤝 Add Friend</Btn>
        </div>
      </div>
    </Window>
  );
}

export function TradeWindow() {
  useUI();
  const trade = S.trade;
  const [goldOffer, setGoldOffer] = useState(0);
  const [itemsOffer, setItemsOffer] = useState<{ id: string; qty: number }[]>([]);

  if (!trade) return null;

  const isP1 = trade.p1.id === S.p.id;
  const myData = isP1 ? trade.p1 : trade.p2;
  const theirData = isP1 ? trade.p2 : trade.p1;

  const updateOffer = (newGold: number, newItems: { id: string; qty: number }[]) => {
    setGoldOffer(newGold);
    setItemsOffer(newItems);
    if (net.isRealm && net.realmWs?.readyState === 1) {
      net.realmWs.send(JSON.stringify({
        t: 'trade_offer',
        gold: newGold,
        items: newItems
      }));
    }
  };

  const lockOffer = () => {
    if (net.isRealm && net.realmWs?.readyState === 1) {
      net.realmWs.send(JSON.stringify({ t: 'trade_lock' }));
    }
  };

  const confirmTrade = () => {
    if (net.isRealm && net.realmWs?.readyState === 1) {
      net.realmWs.send(JSON.stringify({ t: 'trade_confirm' }));
    }
  };

  const cancelTrade = () => {
    if (net.isRealm && net.realmWs?.readyState === 1) {
      net.realmWs.send(JSON.stringify({ t: 'trade_cancel' }));
    }
    S.ui.trade = false;
    S.trade = null;
    emitUI();
  };

  const addItemToTrade = (itemId: string) => {
    if (myData.locked) return;
    const invCount = S.p.inv[itemId] || 0;
    const existing = itemsOffer.find((i) => i.id === itemId);
    const currQty = existing ? existing.qty : 0;
    if (currQty < invCount) {
      const next = existing
        ? itemsOffer.map((i) => (i.id === itemId ? { ...i, qty: i.qty + 1 } : i))
        : [...itemsOffer, { id: itemId, qty: 1 }];
      updateOffer(goldOffer, next);
    }
  };

  const removeItemFromTrade = (itemId: string) => {
    if (myData.locked) return;
    const existing = itemsOffer.find((i) => i.id === itemId);
    if (!existing) return;
    const next = existing.qty > 1
      ? itemsOffer.map((i) => (i.id === itemId ? { ...i, qty: i.qty - 1 } : i))
      : itemsOffer.filter((i) => i.id !== itemId);
    updateOffer(goldOffer, next);
  };

  const bothLocked = myData.locked && theirData.locked;

  return (
    <Window title="Player Trade" icon="🤝" onClose={cancelTrade} w="min(720px,96vw)" h="auto">
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Your Side */}
          <div className="card p-3 flex flex-col gap-2" style={{ borderColor: myData.locked ? 'rgba(127,211,138,0.6)' : 'var(--line-faint)' }}>
            <div className="flex justify-between items-center">
              <span className="font-bold">{myData.name} (You)</span>
              <span className="chip sm" style={myData.locked ? { borderColor: 'rgba(127,211,138,0.6)', color: '#9ae8b0', background: 'rgba(127,211,138,0.12)' } : {}}>
                {myData.locked ? (myData.confirmed ? '✅ Confirmed' : '🔒 Locked') : 'Negotiating'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>🪙 Gold:</span>
              <input
                type="number"
                min={0}
                max={S.p.gold}
                disabled={myData.locked}
                className="input py-0.5 px-2 w-28 text-right"
                value={goldOffer}
                onChange={(e) => updateOffer(Math.max(0, Math.min(S.p.gold, Number(e.target.value) || 0)), itemsOffer)}
              />
              <span className="dim text-xs">/ {S.p.gold}</span>
            </div>
            <div className="h-sec">Offered Items</div>
            <div className="min-h-24 max-h-36 overflow-y-auto flex flex-wrap gap-1 p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-faint)' }}>
              {myData.items.length === 0 && <span className="dim text-xs p-2">No items offered</span>}
              {myData.items.map((it: any) => {
                const def = ITEMS[it.id];
                return (
                  <button
                    key={it.id}
                    disabled={myData.locked}
                    onClick={() => removeItemFromTrade(it.id)}
                    className="chip flex items-center gap-1 cursor-pointer"
                    style={{ borderColor: undefined }}
                  >
                    <span>{iconOf(it.id)} {def?.name || it.id}</span>
                    <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>x{it.qty}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Their Side */}
          <div className="card p-3 flex flex-col gap-2" style={{ borderColor: theirData.locked ? 'rgba(127,211,138,0.6)' : 'var(--line-faint)' }}>
            <div className="flex justify-between items-center">
              <span className="font-bold">{theirData.name}</span>
              <span className="chip sm" style={theirData.locked ? { borderColor: 'rgba(127,211,138,0.6)', color: '#9ae8b0', background: 'rgba(127,211,138,0.12)' } : {}}>
                {theirData.locked ? (theirData.confirmed ? '✅ Confirmed' : '🔒 Locked') : 'Negotiating'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>🪙 Gold:</span>
              <span className="font-bold text-lg">{theirData.gold || 0}</span>
            </div>
            <div className="h-sec">Their Items</div>
            <div className="min-h-24 max-h-36 overflow-y-auto flex flex-wrap gap-1 p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-faint)' }}>
              {theirData.items.length === 0 && <span className="dim text-xs p-2">No items offered</span>}
              {theirData.items.map((it: any) => {
                const def = ITEMS[it.id];
                return (
                  <div key={it.id} className="chip flex items-center gap-1">
                    <span>{iconOf(it.id)} {def?.name || it.id}</span>
                    <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>x{it.qty}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Your Inventory to pick from */}
        {!myData.locked && (
          <div className="card p-2 flex flex-col gap-1">
            <div className="h-sec">Click items in your bag to offer</div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {Object.entries(S.p.inv).filter(([id, qty]) => qty > 0 && ITEMS[id]?.type !== 'quest').map(([id, qty]) => {
                const def = ITEMS[id];
                return (
                  <button
                    key={id}
                    className="chip cursor-pointer"
                    onClick={() => addItemToTrade(id)}
                  >
                    <span>{iconOf(id)} {def?.name || id}</span>
                    <span className="dim">({qty})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--line-faint)' }}>
          <Btn className="danger" onClick={cancelTrade}>Cancel Trade</Btn>
          <div className="flex gap-2">
            {!myData.locked ? (
              <Btn className="big realm" onClick={lockOffer}>🔒 Lock In Offer</Btn>
            ) : bothLocked ? (
              <Btn className="big primary" disabled={myData.confirmed} onClick={confirmTrade}>
                {myData.confirmed ? 'Waiting for confirmation…' : '✅ Final Confirm'}
              </Btn>
            ) : (
              <div className="dim self-center text-sm">Waiting for {theirData.name} to lock…</div>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}
void CLASSES; void closeDialogue; void derived;
