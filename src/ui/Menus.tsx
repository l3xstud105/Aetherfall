import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ABILITIES, ATTR_INFO, CLASSES, DEFAULT_KEYS, ITEMS, KEY_LABELS, PRESETS, PRESET_DESC } from '../game/data';
import { S, bus, defaultLook, emitUI, exportSaveJSON, hasAnySave, importSaveJSON, loadGame, loadSettings, newPlayer, saveSettings, slotInfo, toast, useUI } from '../game/store';
import { appearanceFor } from '../game/actors';
import { buildHumanoid } from '../game/rigs';
import { api } from '../game/game';
import { audio } from '../game/audio';
import { net } from '../game/net';
import { Bar, Btn, Orn, Slider, Toggle, Window, iconOf, keyLabel, sfx } from './ui';

// ============ MAIN MENU
export function MainMenu() {
  useUI(); const [sub, setSub] = useState(''); const stars = useMemo(() => [...Array(70)].map(() => ({ x: Math.random() * 100, y: Math.random() * 60, d: Math.random() * 3 })), []);
  const [realmUser, setRealmUser] = useState('Hero');
  const [realmPass, setRealmPass] = useState('');
  const [realmHost, setRealmHost] = useState(typeof window !== 'undefined' && window.location ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:7777` : 'ws://127.0.0.1:7777');

  useEffect(() => { audio.setMood('menu'); }, []);
  const mpJoin = new URLSearchParams(location.search).get('join');
  const start = (slot: string) => { audio.init(); if (loadGame(slot)) { S.screen = 'boot'; emitUI(); } };
  const enterRealm = () => {
    audio.init();
    newPlayer(realmUser, 'warrior', defaultLook());
    net.connectRealm(realmHost, realmUser, realmPass || undefined);
    S.screen = 'boot';
    emitUI();
  };

  const MenuBtn = ({ icon, label, sub: hint, onClick, disabled, primary, realm }: any) => (
    <button className={`menu-btn ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={disabled} onMouseEnter={() => !disabled && sfx('hover')} onClick={(e) => { if (disabled) return; sfx('click'); onClick?.(e); }}
      style={primary ? { background: 'linear-gradient(90deg, rgba(227,185,79,0.28), rgba(227,185,79,0.06))', border: '1px solid var(--line-strong)', color: 'var(--gold2)', fontWeight: 700 } : realm ? { background: 'linear-gradient(90deg, rgba(80,125,210,0.28), rgba(40,60,115,0.08))', border: '1px solid rgba(127,184,255,0.5)', color: '#cfe2ff', fontWeight: 700 } : undefined}>
      <span className="mi">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="dim" style={{ fontSize: '0.75em' }}>{hint}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 menu-sky overflow-hidden anim-fade" style={{ zIndex: 20 }} onMouseDown={() => audio.init()}>
      {stars.map((s, i) => <div key={i} className="star" style={{ left: s.x + '%', top: s.y + '%', animationDelay: s.d + 's' }} />)}
      <div className="isle" style={{ left: '8%', top: '22%', width: 220, height: 120, animationDelay: '0s' }} /><div className="isle" style={{ right: '10%', top: '30%', width: 280, height: 150, animationDelay: '2s' }} /><div className="isle" style={{ left: '30%', top: '58%', width: 150, height: 90, animationDelay: '4s' }} /><div className="isle" style={{ right: '28%', top: '10%', width: 90, height: 60, animationDelay: '1s' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(232,148,106,0.5), transparent 60%)' }} />
      <div className="relative h-full flex flex-col items-center justify-center gap-2 text-center px-4">
        <div className="eyebrow" style={{ fontSize: '0.9em' }}>L3X STUD105 PRESENTS</div>
        <div className="logo">AETHERFALL</div>
        <div className="title" style={{ fontSize: '1.5em', letterSpacing: '0.3em' }}>A Tale of Broken Skies</div>
        <Orn />
        <div className="menu-panel p-4 flex flex-col gap-1 anim-pop" style={{ width: 340 }}>
          <MenuBtn realm icon="🌐" label="Enter Global Realm" hint="MMO" onClick={() => setSub('realm')} />
          {hasAnySave() && <MenuBtn primary icon="▶" label="Continue" hint="Offline Campaign" onClick={() => start(slotInfo('auto') ? 'auto' : ['1', '2', '3'].find((s) => slotInfo(s))!)} />}
          <MenuBtn icon="⚔️" label="New Game" hint="Offline" onClick={() => { audio.init(); S.creatorMode = 'new'; S.screen = 'creator'; emitUI(); }} />
          <MenuBtn icon="📂" label="Load Local Game" disabled={!hasAnySave()} onClick={() => setSub('load')} />
          <MenuBtn icon="⚙️" label="Settings" onClick={() => { S.ui.settings = true; emitUI(); }} />
          <MenuBtn icon="🔗" label="Peer Co-op" hint="Legacy" onClick={() => setSub('mp')} />
          <MenuBtn icon="📖" label="About & Notes" onClick={() => setSub('about')} />
        </div>
        <div className="dim mt-3" style={{ fontSize: '0.85em', color: 'var(--gold)' }}>Version 1.0.0 · Global MMORPG Edition</div>
        {mpJoin && <div className="panel px-4 py-2 mt-1 anim-pop">Invite link detected: world <b>{mpJoin.toUpperCase()}</b>. Start or load a character — you'll join automatically.</div>}
      </div>
      {sub === 'realm' && (
        <Window title="Aetherfall Global Realm" sub="One World · One Realm · Every Player" icon="🌐" onClose={() => setSub('')} w="min(600px,96vw)" h="auto">
          <div className="p-5 flex flex-col gap-4 text-left">
            <div className="card p-3" style={{ borderColor: 'rgba(127,184,255,0.4)', background: 'linear-gradient(90deg, rgba(60,100,180,0.18), rgba(24,19,13,0.4))' }}>
              <div className="title" style={{ color: '#9cc6ff' }}>The Persistent Shared Universe</div>
              <div className="dim mt-1" style={{ fontSize: '0.9em', lineHeight: 1.5 }}>
                Connect to the authoritative realm server. Encounter other real players in Valdoria, form parties and guilds, trade on the global marketplace, and grow a character that persists in the cloud.
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="h-sec">Account / Character Name</label>
              <input className="input" value={realmUser} maxLength={20} placeholder="Enter your account name..." onChange={(e) => setRealmUser(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="h-sec">Password <span className="dim" style={{ fontSize: '0.85em' }}>— optional for guest play; set one to protect your account</span></label>
              <input className="input" type="password" value={realmPass} placeholder="Account password..." onChange={(e) => setRealmPass(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="h-sec">Realm Server Address</label>
              <input className="input" value={realmHost} placeholder="ws://localhost:7777" onChange={(e) => setRealmHost(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <Btn onClick={() => setSub('')}>Cancel</Btn>
              <Btn className="big realm" disabled={!realmUser.trim()} onClick={enterRealm}>Connect & Enter Realm</Btn>
            </div>
          </div>
        </Window>
      )}
      {sub === 'load' && <Window title="Load Game" sub="Offline campaign saves" icon="📂" onClose={() => setSub('')} w="min(640px,96vw)" h="auto"><div className="p-4 flex flex-col gap-2">{['auto', '1', '2', '3'].map((s) => { const i = slotInfo(s); return <Btn key={s} disabled={!i} className="text-left" onClick={() => start(s)}><b>{s === 'auto' ? 'Autosave' : 'Slot ' + s}</b> — {i ? `${i.name} · Lv ${i.level} ${CLASSES.find((c) => c.id === i.cls)?.name} · Day ${i.day} · ${new Date(i.ts).toLocaleString()}` : 'Empty'}</Btn>; })}<div className="flex gap-2 pt-2 mt-2" style={{ borderTop: '1px solid var(--line-faint)' }}><Btn className="sm flex-1" onClick={() => { const data = exportSaveJSON('auto') || exportSaveJSON('1'); if (!data) { toast('No save data to export.', 'error'); return; } const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'aetherfall_save.json'; a.click(); URL.revokeObjectURL(url); }}>💾 Export Save</Btn><label className="btn sm flex-1 text-center cursor-pointer">📥 Import Save<input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { const text = ev.target?.result as string; if (importSaveJSON(text, 'auto')) setSub('load'); }; reader.readAsText(file); }} /></label></div></div></Window>}
      {sub === 'mp' && <Window title="Peer Co-op (Legacy)" icon="🔗" onClose={() => setSub('')} w="min(560px,96vw)" h="auto"><div className="p-5 flex flex-col gap-3"><div>Legacy peer-to-peer co-op allows hosting a private session via room code. For the persistent shared world, use the <b style={{ color: '#9cc6ff' }}>Global Realm</b>.</div><div className="dim" style={{ fontSize: '0.85em' }}>Single-player campaign is unaffected.</div></div></Window>}
      {sub === 'about' && <Window title="About Aetherfall 1.0" icon="📖" onClose={() => setSub('')} w="min(720px,96vw)" h="min(620px,90vh)"><div className="p-5 flex flex-col gap-3" style={{ lineHeight: 1.5 }}><div><b>Aetherfall 1.0.0 — A Tale of Broken Skies</b> (L3X STUD105) is a persistent 3D third-person open-world MMORPG for modern browsers, Chromebooks, desktop, and laptops.</div><div className="card p-3"><div className="title">Major Features in 1.0.0</div><div className="dim" style={{ fontSize: '0.9em' }}>• Persistent Global Realm with Authoritative Simulation, spatial interest management & SQLite/Postgres persistence<br />• 4 Complete Underground Dungeons: Whispering Catacombs, Sunken Aether Temple, Bastion Undercroft, Luminescent Grotto<br />• 5-Element Magic & Reactions: Conflagration, Superconductor, Vaporize (2×), Electro-Discharge, Magma Eruption<br />• Multi-Phase Boss Battles with Enraged Phase II mechanics, shockwaves, and projectile barrages<br />• Advanced Combat: Poise & Stagger, Directional Defense, Timed 0.22s Perfect Parry & Counterattack<br />• 5 Companions with loyalty perks, customizable orders (Follow, Defend, Attack, Hold), and companion questlines<br />• Two-Phase Secure Player-to-Player Trading, Parties, Guilds, and Global/Local/Whisper Chat channels<br />• Rebuilding of Ashenvale Outpost, Professions, Enchanting, and offline single-player mode</div></div><div className="dim">Studio: L3X STUD105 · Engine: Three.js 0.187 · UI: React 19 · Backend: Authoritative Node.js WS + SQLite</div></div></Window>}
    </div>
  );
}

// ============ CHARACTER CREATOR
const SKINS = ['#f4d4b8', '#f0c8a0', '#e0b48c', '#c99a72', '#a87a54', '#7a5238', '#5a3a26'], HAIRC = ['#1a1a1a', '#2a1a10', '#4a2f1b', '#7a4a24', '#b8864a', '#d8c070', '#c9c9c9', '#8a2a1a', '#2a4a8a', '#6a2a8a'], EYEC = ['#3a6ea5', '#4a7a3a', '#6a4a2a', '#5a5a5a', '#8a3a8a', '#c0a030', '#3aa8a0'], ACC = ['#7b6a50', '#8a2a2a', '#2a4a8a', '#2a6a3a', '#6a2a8a', '#c8a030', '#1a1a1a', '#e8e0d0'];
const NAMES = ['Ayla', 'Torren', 'Mirelle', 'Kael', 'Soren', 'Isolde', 'Brannoch', 'Elowen', 'Dara', 'Varek', 'Lysandra', 'Orin', 'Thessaly', 'Garrick'];
const HAIR_STYLES = ['short', 'long', 'ponytail', 'braids', 'bun', 'mohawk', 'bald'], BEARDS = ['none', 'stubble', 'goatee', 'full'], EXPR = ['neutral', 'happy', 'angry', 'sad', 'surprised'];
export function Creator() {
  useUI(); const edit = S.creatorMode === 'edit'; const [name, setName] = useState(edit ? S.p.name : NAMES[Math.floor(Math.random() * NAMES.length)]); const [clsId, setCls] = useState(edit ? S.p.cls : 'warrior'); const [look, setLook] = useState<any>(edit ? { ...S.p.look } : defaultLook());
  const cls = CLASSES.find((c) => c.id === clsId)!; const set = (k: string, v: any) => { sfx('tab'); setLook((l: any) => ({ ...l, [k]: v })); };
  const ref = useRef<HTMLCanvasElement>(null); const state = useRef<any>({});
  useEffect(() => { audio.setMood('story'); }, []);
  useEffect(() => {
    const c = ref.current!; const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.shadowMap.enabled = true; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const sc = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.35, 5.2); cam.lookAt(0, 1.0, 0); sc.add(new THREE.HemisphereLight(0xcfe0ff, 0x4a3a2a, 1.0)); const key = new THREE.DirectionalLight(0xfff0d0, 2.4); key.position.set(3, 5, 4); key.castShadow = true; sc.add(key); const rim = new THREE.DirectionalLight(0x8aa8ff, 1.2); rim.position.set(-4, 2, -3); sc.add(rim);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#3a3328', roughness: 0.9 })); floor.position.y = -0.06; floor.receiveShadow = true; sc.add(floor); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: '#e3b94f' })); ring.rotation.x = Math.PI / 2; sc.add(ring);
    const st = state.current; st.rot = 0.4; st.target = 0.4; st.drag = false; st.sc = sc; st.rig = null; st.t = 0; let raf = 0, last = performance.now();
    const resize = () => { const w = c.clientWidth, h = c.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }; resize(); window.addEventListener('resize', resize);
    const loop = (n: number) => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (n - last) / 1000); last = n; st.t += dt; if (!st.drag) st.target += dt * 0.25; st.rot += (st.target - st.rot) * Math.min(1, dt * 8); if (st.rig) { st.rig.group.rotation.y = st.rot; st.rig.update(dt, { speed: 0, act: st.act || 'none', at: (st.t * 0.8) % 1, emotion: st.expr, lookYaw: Math.sin(st.t * 0.5) * 0.4, talkAmp: 0.6 }); } r.render(sc, cam); };
    raf = requestAnimationFrame(loop);
    const down = (e: PointerEvent) => { st.drag = true; st.lx = e.clientX; c.setPointerCapture(e.pointerId); }; const move = (e: PointerEvent) => { if (st.drag) { st.target += (e.clientX - st.lx) * 0.01; st.lx = e.clientX; } }; const up = () => { st.drag = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); r.dispose(); };
  }, []);
  useEffect(() => { const st = state.current; if (!st.sc) return; if (st.rig) st.sc.remove(st.rig.group); const eq = edit ? S.p.equip : cls.equip; const ap = appearanceFor(look, eq, clsId); st.rig = buildHumanoid(ap); st.rig.group.rotation.y = st.rot; st.sc.add(st.rig.group); st.expr = look.brow === 'neutral' ? 'neutral' : look.brow; }, [look, clsId]);
  const confirm = () => { const nm = name.trim(); if (nm.length < 2) { sfx('error'); return; } sfx('confirm'); if (edit) { S.p.look = look; bus.emit('appearance'); S.screen = 'game'; emitUI(); return; } newPlayer(nm.slice(0, 18), clsId, look); S.screen = 'intro'; emitUI(); };
  const randomize = () => { sfx('click'); const p = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]; setLook({ build: 0.9 + Math.random() * 0.3, height: 0.93 + Math.random() * 0.15, skin: p(SKINS), hair: p(HAIR_STYLES), hairColor: p(HAIRC), eyes: p(EYEC), beard: p(BEARDS), brow: 'neutral', outfit: p(ACC) }); if (!edit) setName(p(NAMES)); };
  const Sw = ({ k, list }: any) => <div className="flex gap-2 flex-wrap">{list.map((c: string) => <button key={c} className={`swatch ${look[k] === c ? 'sel' : ''}`} style={{ background: c }} aria-label={c} onClick={() => set(k, c)} />)}</div>;
  const Chips = ({ k, list }: any) => <div className="flex gap-1.5 flex-wrap">{list.map((c: string) => <button key={c} className={`chip ${look[k] === c ? 'sel' : ''}`} onClick={() => set(k, c)}>{c}</button>)}</div>;
  const Lbl = ({ t }: any) => <div className="h-sec mt-3 mb-1">{t}</div>;
  return (
    <div className="fixed inset-0 menu-sky overflow-auto anim-fade" style={{ zIndex: 20 }}>
      <div className="min-h-full p-3 md:p-5 flex flex-col gap-3" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(232,148,106,0.25), transparent 60%)' }}>
        <div className="menu-panel px-4 py-3 flex items-center justify-between">
          <div>
            <div className="title" style={{ fontSize: '1.5em' }}>{edit ? 'Mirror — Change Appearance' : 'Forge Your Skyborn'}</div>
            <div className="dim" style={{ fontSize: '0.85em' }}>{edit ? 'Class is fixed; appearance can be changed freely.' : 'Choose a class, shape your hero and name them. Any class can learn any skill later.'}</div>
          </div>
          <Btn onClick={() => { sfx('cancel'); S.screen = edit ? 'game' : 'menu'; emitUI(); }}>← Back</Btn>
        </div>
        <div className="grid gap-3 flex-1" style={{ gridTemplateColumns: 'minmax(260px,1fr) minmax(300px,1.2fr) minmax(280px,1fr)' }}>
          <div className="panel p-4 overflow-auto" style={{ maxHeight: '78vh' }}>
            <div className="h-sec">Name</div><div className="flex gap-2"><input className="input" value={name} maxLength={18} disabled={edit} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /><Btn title="Randomize everything" onClick={randomize}>🎲</Btn></div>
            <Lbl t="Body build" /><Slider v={look.build} min={0.85} max={1.25} onChange={(v: number) => setLook((l: any) => ({ ...l, build: v }))} /><Lbl t="Height" /><Slider v={look.height} min={0.88} max={1.12} onChange={(v: number) => setLook((l: any) => ({ ...l, height: v }))} />
            <Lbl t="Skin tone" /><Sw k="skin" list={SKINS} /><Lbl t="Hair style" /><Chips k="hair" list={HAIR_STYLES} /><Lbl t="Hair colour" /><Sw k="hairColor" list={HAIRC} /><Lbl t="Eyes" /><Sw k="eyes" list={EYEC} /><Lbl t="Facial hair" /><Chips k="beard" list={BEARDS} /><Lbl t="Expression" /><Chips k="brow" list={EXPR} /><Lbl t="Accent / cape colour" /><Sw k="outfit" list={ACC} />
          </div>
          <div className="panel relative overflow-hidden" style={{ minHeight: 420 }}><canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'none' }} /><div className="absolute bottom-3 left-0 right-0 text-center dim" style={{ fontSize: '0.8em' }}>Drag to rotate · live 3D preview with your class equipment</div><div className="absolute top-3 left-0 right-0 text-center title" style={{ fontSize: '1.4em' }}>{name || '…'} <span className="dim" style={{ fontSize: '0.6em' }}>the {cls.name}</span></div></div>
          <div className="panel p-4 overflow-auto flex flex-col gap-3" style={{ maxHeight: '78vh' }}>
            {!edit && <div className="grid grid-cols-2 gap-1.5">{CLASSES.map((c) => <button key={c.id} className={`btn text-left ${c.id === clsId ? 'sel' : ''}`} style={{ padding: '0.4em 0.6em' }} onMouseEnter={() => sfx('hover')} onClick={() => { sfx('click'); setCls(c.id); }}><div style={{ fontSize: '1em' }}>{c.icon} {c.name}</div></button>)}</div>}
            <div className="card p-3"><div className="title text-lg">{cls.icon} {cls.name}</div><div className="italic dim" style={{ fontSize: '0.85em' }}>{cls.tag}</div><div className="my-1" style={{ fontSize: '0.88em' }}>{cls.desc}</div>
              {Object.entries(cls.attrs).map(([k, v]: any) => <div key={k} className="flex items-center gap-2" title={ATTR_INFO[k].desc}><div style={{ width: 80, fontSize: '0.8em' }} className="dim">{ATTR_INFO[k].name}</div><div className="flex-1"><Bar v={v} max={10} color="linear-gradient(90deg,var(--xp1),var(--xp2))" label={String(v)} /></div></div>)}
              <div className="h-sec mt-2">Starting equipment</div><div className="flex gap-1.5 flex-wrap">{Object.values(cls.equip).map((id: any) => <div key={id} className={`slot r-${ITEMS[id].rarity}`} style={{ width: 44, height: 44, fontSize: 20 }} title={ITEMS[id].name}>{iconOf(id)}</div>)}</div><div className="dim" style={{ fontSize: '0.75em' }}>{Object.values(cls.equip).map((id: any) => ITEMS[id].name).join(' · ')}</div>
              <div className="h-sec mt-2">Abilities</div>{cls.abilities.map((a: string) => <div key={a} style={{ fontSize: '0.85em' }}>{ABILITIES[a].icon} <b>{ABILITIES[a].name}</b> <span className="dim">— {ABILITIES[a].desc}</span></div>)}</div>
            <Btn className="big primary" disabled={name.trim().length < 2} onClick={confirm}>{edit ? '✔ Apply' : '✔ Begin the Journey'}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ INTRO / ENDING
export function Intro({ onDone }: { onDone: () => void }) {
  const slides = [`A hundred years ago, the Spire shattered the sky.`, `Islands of stone rose. Rain fell upward. The kingdoms of Valdoria and the Kharun Dominion went to war over what was left.`, `Two nights ago, the Ashen Banner burned Ashenvale to the ground.`, `${S.p.name}, you alone walked out of the ash — with a mark on your palm that no one can explain, and a prophecy that remembers your name.`]; const [i, setI] = useState(0);
  useEffect(() => { audio.setMood('story'); }, []); const next = () => { sfx('click'); if (i >= slides.length - 1) onDone(); else setI(i + 1); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); next(); } if (e.code === 'Escape') onDone(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); });
  return <div className="fixed inset-0 flex items-center justify-center text-center p-8" style={{ zIndex: 30, background: 'radial-gradient(ellipse at center, #1a1030, #04030a)' }} onClick={next}><div key={i} className="anim-fade" style={{ maxWidth: 760, fontSize: '1.7em', lineHeight: 1.6, color: '#efe4c8', textShadow: '0 0 30px rgba(227,185,79,0.4)' }}>{slides[i]}</div><div className="absolute bottom-8 dim">Click or press Space to continue · Esc to skip</div></div>;
}
const ENDINGS: any = {
  dawn: { t: 'Crown of Dawn', e: 'You lay the Duchess\'s letter before the dying King. Maelis is dragged from the hall; the Banner scatters. With the three shards you mend the Spire, and the islands drift gently down to rest. Valdoria will heal — slowly, honestly, and under your watch.' },
  ash: { t: 'Crown of Ash', e: 'Maelis smiles and presses the crown into your hands. Together you rule Valdoria with an iron grip. The war with Kharun ends — in fire. Ashenvale is avenged, and Highcrown learns to fear the Skyborn.' },
  dominion: { t: "The Dominion's Dawn", e: 'You carry the letter north. Lord Vorn Kharun marches on Highcrown not as a conqueror but as a judge. The war ends in a single night; the sky mends under Kharun banners, and an uneasy peace begins.' },
  shatter: { t: 'The Sky Set Free', e: 'You crush the shards in your fist. The Spire sings once and falls. The islands rise, the old kingdoms crack, and for the first time in a hundred years, no one rules the sky. Whatever comes next belongs to everyone.' },
};
export function Ending() {
  useUI(); const e = ENDINGS[S.ui.ending] || ENDINGS.dawn; useEffect(() => { audio.sfx('levelup'); }, []);
  return <div className="fixed inset-0 flex items-center justify-center p-6 anim-fade" style={{ zIndex: 60, background: 'radial-gradient(ellipse at center, #2a1a40, #04030a)' }}><div className="panel win text-center p-10" style={{ maxWidth: 720 }}><div className="eyebrow">THE TALE ENDS… AND BEGINS</div><div className="logo" style={{ fontSize: '3em' }}>{e.t}</div><div style={{ lineHeight: 1.7, fontSize: '1.1em' }} className="my-5">{e.e}</div><div className="flex gap-3 justify-center"><Btn className="big primary" onClick={() => { S.screen = 'game'; S.ui.ending = null; sfx('confirm'); emitUI(); }}>Keep exploring Valdoria</Btn></div><div className="dim mt-4" style={{ fontSize: '0.8em' }}>Your choice has been recorded in your save. Thank you for playing Aetherfall 1.0 — L3X STUD105</div></div></div>;
}

// ============ SETTINGS
export function Settings() {
  useUI(); const [tab, setTab] = useState('graphics'); const st = S.settings; const close = () => { S.ui.settings = false; saveSettings(); emitUI(); }; const cu = st.custom as any;
  const apply = () => { saveSettings(); api.applyGraphics(); emitUI(); }; const cur = { ...PRESETS[st.preset], ...cu };
  const setCustom = (k: string, v: any) => { cu[k] = v; apply(); };
  const Row = ({ l, children, d }: any) => <div className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><div className="flex-1"><div>{l}</div>{d && <div className="dim" style={{ fontSize: '0.75em' }}>{d}</div>}</div><div style={{ width: 240 }} className="flex justify-end">{children}</div></div>;
  const aud = (k: string, l: string) => <Row l={l}><div className="flex items-center gap-2 w-full"><Slider v={audio.vols[k]} min={0} max={1} onChange={(v: number) => { audio.setVol(k, v); saveSettings(); emitUI(); }} tick={k === 'sfx' ? 'click' : k === 'dlg' ? 'tap' : 'tap'} /><span className="dim" style={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(audio.vols[k] * 100)}</span></div></Row>;
  const rebind = (a: string) => { S.ui.rebind = a; emitUI(); const done = (code: string) => { if (code !== 'Escape') { const other = Object.entries(st.keys).find(([k, v]) => v === code && k !== a); if (other) st.keys[other[0]] = st.keys[a]; st.keys[a] = code; sfx('confirm'); } else sfx('cancel'); S.ui.rebind = null; saveSettings(); emitUI(); cleanup(); }; const kd = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); done(e.code); }; const md = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('[data-rebind]')) return; e.preventDefault(); e.stopPropagation(); done('Mouse' + e.button); }; const cleanup = () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('mousedown', md, true); }; window.addEventListener('keydown', kd, true); setTimeout(() => window.addEventListener('mousedown', md, true), 50); };
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center anim-fade" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div data-modal="1" className="panel win flex flex-col" style={{ width: 'min(900px,96vw)', height: 'min(700px,92vh)' }} role="dialog" aria-label="Settings">
        <div className="win-head flex items-center justify-between px-5 py-3"><div className="title text-xl">⚙️ Settings</div><Btn className="sm" onClick={close}>✕ Close</Btn></div>
        <div className="flex gap-1 px-3" style={{ borderBottom: '1px solid var(--line-faint)' }}>{[['graphics', '🖥️ Graphics'], ['audio', '🔊 Audio'], ['controls', '🎮 Controls'], ['access', '♿ Accessibility']].map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'sel' : ''}`} onClick={() => { sfx('tab'); setTab(k); }}>{l}</button>)}</div>
        <div className="flex-1 overflow-auto p-5" key={tab}>
          {tab === 'graphics' && <><div className="h-sec mb-2">Graphics preset</div><div className="grid gap-2 md:grid-cols-3">{Object.keys(PRESETS).map((k) => <button key={k} className={`btn text-left ${st.preset === k ? 'sel' : ''}`} onClick={() => { st.preset = k; st.custom = {}; apply(); }}><div className="title" style={{ fontSize: '1.1em' }}>{k}{k === 'Cinematic' ? ' ★ default' : ''}</div><div className="dim" style={{ fontSize: '0.78em', whiteSpace: 'normal' }}>{PRESET_DESC[k]}</div></button>)}</div>
            <div className="h-sec mt-5 mb-1">Custom overrides <span className="dim" style={{ fontSize: '0.75em' }}>(on top of {st.preset})</span></div>
            <Row l="Shadows" d="Directional sun shadows"><Toggle on={cur.shadows > 0} onChange={(v) => setCustom('shadows', v ? Math.max(1, PRESETS[st.preset].shadows) : 0)} /></Row>
            <Row l="Render scale" d="Internal resolution"><div className="flex gap-2 w-full items-center"><Slider v={cur.scale} min={0.5} max={1.5} onChange={(v: number) => setCustom('scale', v)} /><span className="dim" style={{ width: 40, fontVariantNumeric: 'tabular-nums' }}>{cur.scale.toFixed(2)}</span></div></Row>
            <Row l="Vegetation density" d="Trees, bushes, logs"><Slider v={cur.trees} min={0.1} max={1} onChange={(v: number) => setCustom('trees', v)} /></Row><Row l="Grass & flowers"><Slider v={cur.grass} min={0.05} max={1} onChange={(v: number) => { setCustom('grass', v); cu.flowers = v; }} /></Row>
            <Row l="View distance" d="Vegetation & fog"><Slider v={cur.vegDist} min={80} max={400} step={5} onChange={(v: number) => { cu.vegDist = v; setCustom('fogFar', v * 1.2); }} /></Row><Row l="Character draw distance"><Slider v={cur.npcDist} min={30} max={160} step={5} onChange={(v: number) => { cu.animalDist = v + 10; setCustom('npcDist', v); }} /></Row>
            <Row l="Particles & weather"><Slider v={cur.particles} min={0.1} max={1.6} onChange={(v: number) => setCustom('particles', v)} /></Row><Row l="Field of view"><Slider v={cur.fov} min={55} max={95} step={1} onChange={(v: number) => setCustom('fov', v)} /></Row><Row l="Show FPS"><Toggle on={st.showFps} onChange={(v) => { st.showFps = v; apply(); }} /></Row>
            <Btn className="sm mt-3" onClick={() => { st.custom = {}; apply(); sfx('confirm'); }}>Reset overrides</Btn></>}
          {tab === 'audio' && <>{aud('master', 'Master volume')}{aud('music', 'Music')}{aud('sfx', 'Sound effects')}{aud('amb', 'Ambient audio')}{aud('dlg', 'Dialogue voices')}<Row l="Mute all"><Toggle on={audio.muted} onChange={(v) => { audio.setMuted(v); saveSettings(); emitUI(); }} /></Row><div className="dim mt-3" style={{ fontSize: '0.85em' }}>Music and ambience are generated live and crossfade by region, time and weather — opening menus never restarts them.</div></>}
          {tab === 'controls' && <><Row l="Mouse / stick sensitivity"><Slider v={st.sens} min={0.3} max={2.5} onChange={(v: number) => { st.sens = v; saveSettings(); emitUI(); }} /></Row><Row l="Invert Y"><Toggle on={st.invertY} onChange={(v) => { st.invertY = v; saveSettings(); emitUI(); }} /></Row><Row l="Controller dead-zone"><Slider v={st.deadzone} min={0.02} max={0.4} onChange={(v: number) => { st.deadzone = v; saveSettings(); emitUI(); }} /></Row><Row l="Vibration"><Toggle on={st.vibration} onChange={(v) => { st.vibration = v; saveSettings(); emitUI(); }} /></Row>
            <Row l="Controller glyphs" d="Auto detects Xbox / PlayStation pads"><select className="select" value={st.glyphs} onChange={(e) => { st.glyphs = e.target.value; saveSettings(); emitUI(); }}><option value="auto">Auto</option><option value="xbox">Xbox</option><option value="ps">PlayStation</option></select></Row>
            <div className="h-sec mt-4 mb-1">Keyboard & mouse bindings <span className="dim" style={{ fontSize: '0.75em' }}>(click, then press a key/mouse button · Esc cancels)</span></div><div className="grid md:grid-cols-2 gap-x-6">{Object.keys(DEFAULT_KEYS).map((a) => <div key={a} className="flex items-center justify-between py-1"><span>{KEY_LABELS[a]}</span><Btn data-rebind="1" className="sm" sel={S.ui.rebind === a} onClick={() => rebind(a)}>{S.ui.rebind === a ? 'Press a key…' : keyLabel(st.keys[a])}</Btn></div>)}</div><Btn className="sm mt-3" onClick={() => { st.keys = { ...DEFAULT_KEYS }; saveSettings(); emitUI(); sfx('confirm'); }}>Restore defaults</Btn>
            <div className="dim mt-3" style={{ fontSize: '0.8em' }}>Controller: Left stick move · Right stick camera · A jump/glide · B dodge · X/RT attack · LT block · Y interact · RB sprint · LB quick heal · D-pad abilities · R3 mount · View map · Menu pause. Menus: D-pad/stick navigate, A confirm, B back, LB/RB switch tabs. Arrow keys also rotate the camera.</div></>}
          {tab === 'access' && <><Row l="UI scale"><Slider v={st.uiScale} min={0.8} max={1.4} onChange={(v: number) => { st.uiScale = v; saveSettings(); emitUI(); }} /></Row><Row l="Subtitles & barks" d="Show spoken lines as text"><Toggle on={st.subtitles} onChange={(v) => { st.subtitles = v; saveSettings(); emitUI(); }} /></Row><Row l="Dialogue text size"><Slider v={st.textSize} min={0.9} max={1.5} onChange={(v: number) => { st.textSize = v; saveSettings(); emitUI(); }} /></Row><Row l="High contrast UI"><Toggle on={st.contrast} onChange={(v) => { st.contrast = v; saveSettings(); emitUI(); }} /></Row><Row l="Reduce motion" d="Shorter UI animations"><Toggle on={st.reduceMotion} onChange={(v) => { st.reduceMotion = v; saveSettings(); emitUI(); }} /></Row><Row l="Tutorial hints"><Toggle on={st.tutorial} onChange={(v) => { st.tutorial = v; saveSettings(); emitUI(); }} /></Row><Row l="Autosave (every 90s)"><Toggle on={st.autosave} onChange={(v) => { st.autosave = v; saveSettings(); emitUI(); }} /></Row><Row l="Camera FOV offset"><Slider v={st.fovAdd} min={-10} max={20} step={1} onChange={(v: number) => { st.fovAdd = v; apply(); }} /></Row></>}
        </div>
      </div>
    </div>
  );
}
void loadSettings;
