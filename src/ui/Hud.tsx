import { useEffect, useRef, useState } from 'react';
import { ABILITIES, CLASSES, POIS, QUESTS } from '../game/data';
import { S, saveGame, slotInfo, loadGame, useHud, useUI, emitUI, count } from '../game/store';
import { api, stopGame } from '../game/game';
import { ST } from '../game/structures';
import { net } from '../game/net';
import { Bar, Btn, Key, Window, sfx } from './ui';

const KILL_LOC: Record<string, [number, number]> = { bandit: [-118, 40], bandit_archer: [40, 120], karreth: [-10, 205], smuggler: [222, 112], deserter: [95, -30], scout: [110, -150], bear_alpha: [-105, 95], white_wolf: [-30, -150], wraith: [-170, -150], gravewarden: [-92, -205] };
export function questTarget(qid: string): { x: number; z: number; name: string } | null {
  const rec = S.quests[qid]; if (!rec || rec.done) return null; const g = QUESTS[qid].stages[rec.stage].goal;
  if (g.t === 'reach') { const p = POIS.find((q) => q.id === g.n); if (p && !p.hidden) return { x: p.x, z: p.z, name: p.name }; if (g.n === 'hollow_rift') { const a = ST.anchors.portal; return { x: a.x, z: a.z, name: 'The Hollow Door' }; } }
  if (g.t === 'talk') { const n = api.getNpcs().find((q: any) => q.id === g.n); if (n) return { x: n.pos.x, z: n.pos.z, name: n.name }; const d = ST.doors.find((q) => q.npc === g.n) || (g.n === 'stranger' ? ST.doors.find((q) => q.interior === 'tavern' && q.settle === 'highcrown') : null) || (g.n === 'maelis' ? ST.doors.find((q) => q.interior === 'hall') : null); if (d) return { x: d.x, z: d.z, name: d.name }; if (g.n === 'aether_stag') return { x: -205, z: 18, name: 'Glimmer Grove' }; }
  if (g.t === 'kill' && KILL_LOC[g.n]) return { x: KILL_LOC[g.n][0], z: KILL_LOC[g.n][1], name: 'Hunting ground' };
  if (g.t === 'have' && g.n.includes('shard_sky')) { const a = ST.anchors.isle1; if (a) return { x: a.x, z: a.z, name: 'Shards (Skyreach Isle)' }; }
  if (qid === 'moonpetals') return { x: -170, z: 40, name: 'The Thornwood (night)' };
  return null;
}
const wrap = (a: number) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

function Compass() {
  useHud(); useUI(); const h = S.hud, heading = -h.compass, W = 420; const items: any[] = [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]]; const marks: any[] = [];
  const wp = S.ui.mapWaypoint; const qt = S.ui.tracked ? questTarget(S.ui.tracked) : null;
  const bear = (t: any) => wrap(Math.atan2(t.x - h.px, -(t.z - h.pz)) - heading);
  if (wp) marks.push({ r: bear(wp), c: '#6fd1ff', s: '◆', d: Math.hypot(wp.x - h.px, wp.z - h.pz) }); if (qt) marks.push({ r: bear(qt), c: '#ffd24a', s: '◈', d: Math.hypot(qt.x - h.px, qt.z - h.pz) });
  return (
    <div className="compass anim-fade" aria-label="compass">
      {items.map(([l, a]) => { const r = wrap(a - heading); return Math.abs(r) < 1.5 ? <div key={l} style={{ position: 'absolute', left: W / 2 + r * (W / 3.1416), top: 3, transform: 'translateX(-50%)', color: l === 'N' ? '#ff8a7a' : '#efe4c8', fontWeight: 700, fontVariant: 'small-caps' }}>{l}</div> : null; })}
      {[...Array(24)].map((_, i) => { const a = (i / 24) * Math.PI * 2 - Math.PI; const r = wrap(a - heading); return Math.abs(r) < 1.5 && i % 3 ? <div key={i} style={{ position: 'absolute', left: W / 2 + r * (W / 3.1416), top: 12, width: 1, height: 6, background: 'rgba(239,228,200,0.35)' }} /> : null; })}
      {marks.map((m, i) => <div key={i} style={{ position: 'absolute', left: W / 2 + clampN(m.r, -1.5, 1.5) * (W / 3.1416), top: 2, transform: 'translateX(-50%)', color: m.c, fontSize: 14, textShadow: '0 0 6px #000' }}>{m.s}<span style={{ fontSize: 9, marginLeft: 2 }}>{Math.round(m.d)}m</span></div>)}
      <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid #ffe27a' }} />
    </div>
  );
}
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function Minimap() {
  useHud(); const ref = useRef<HTMLCanvasElement>(null); const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!S.ui.mapURL) return; const i = new Image(); i.onload = () => setImg(i); i.src = S.ui.mapURL; }, [S.ui.mapURL]);
  useEffect(() => {
    const c = ref.current; if (!c || !img) return; const x = c.getContext('2d')!; const n = 150; x.clearRect(0, 0, n, n); x.save(); x.beginPath(); x.arc(n / 2, n / 2, n / 2 - 2, 0, Math.PI * 2); x.clip(); x.fillStyle = '#0a1018'; x.fillRect(0, 0, n, n);
    const sc = 1.0, h = S.hud, yaw = G_yaw(); x.translate(n / 2, n / 2); x.rotate(-Math.PI / 2 - Math.atan2(-Math.cos(yaw), -Math.sin(yaw))); x.translate(-(h.px) * sc, -(h.pz) * sc); x.imageSmoothingEnabled = true; x.drawImage(img, -260 * sc, -260 * sc, 520 * sc, 520 * sc);
    POIS.forEach((p) => { if (!S.discovered[p.id] || p.hidden) return; x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(p.x * sc, p.z * sc, 3.5, 0, 7); x.fill(); });
    (h.tracked || []).forEach((t: any) => { x.fillStyle = t.hostile ? '#ff5a4a' : '#9ae8b0'; x.beginPath(); x.arc(t.x * sc, t.z * sc, 2.5, 0, 7); x.fill(); });
    const qt = S.ui.tracked ? questTarget(S.ui.tracked) : null; if (qt) { x.fillStyle = '#ffd24a'; x.strokeStyle = '#000'; x.beginPath(); x.moveTo(qt.x * sc, qt.z * sc - 7); x.lineTo(qt.x * sc + 5, qt.z * sc); x.lineTo(qt.x * sc, qt.z * sc + 7); x.lineTo(qt.x * sc - 5, qt.z * sc); x.closePath(); x.fill(); x.stroke(); }
    x.restore(); x.strokeStyle = 'rgba(227,185,79,0.7)'; x.lineWidth = 3; x.beginPath(); x.arc(n / 2, n / 2, n / 2 - 2, 0, Math.PI * 2); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(n / 2, n / 2 - 7); x.lineTo(n / 2 + 5, n / 2 + 6); x.lineTo(n / 2 - 5, n / 2 + 6); x.closePath(); x.fill(); x.fillStyle = '#ff8a7a'; x.font = '11px Georgia'; x.fillText('N', n / 2 + Math.sin(-yaw0()) * 62 - 3, n / 2 - Math.cos(-yaw0()) * 62 + 4);
  });
  return <canvas ref={ref} width={150} height={150} className="minimap-frame" style={{ width: 150, height: 150 }} />;
}
const yaw0 = () => G_yaw(); const G_yaw = () => S.hud.compass || 0;

const BUFF_ICONS: Record<string, string> = { rage: '🔥', wall: '🛡️', ward: '🔰', shadow: '🌑', track: '👣' };

export function Hud() {
  useHud(); useUI(); const h = S.hud, p = S.p, u = S.ui; const cls = CLASSES.find((c) => c.id === p.cls)!; const tr = u.tracked && S.quests[u.tracked] && !S.quests[u.tracked].done ? u.tracked : null;
  const stg = tr ? QUESTS[tr].stages[S.quests[tr].stage] : null; const prog = tr ? (require_q().questProgressText(tr)) : '';
  const showBanner = h.banner && Date.now() - h.banner.t < 4200; const [, setT] = useState(0); useEffect(() => { const i = setInterval(() => setT((t) => t + 1), 1000); return () => clearInterval(i); }, []);
  const inHome = h.inside && api.currentHouse();
  const xpMax = Math.round(90 * Math.pow(p.level, 1.55));
  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* ---- Player vitals frame ---- */}
      <div className="absolute left-4 top-4 flex flex-col gap-1.5 anim-fade">
        <div className="player-frame px-3 py-2.5 flex items-center gap-3">
          <div className="flex items-center justify-center relative" style={{ width: 48, height: 48, borderRadius: 12, background: 'radial-gradient(circle at 50% 30%, rgba(227,185,79,0.28), rgba(20,16,10,0.9))', border: '1px solid var(--line-strong)', fontSize: 24, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}>{cls.icon}
            <span style={{ position: 'absolute', bottom: -5, right: -5, background: 'linear-gradient(180deg,#f0cd72,#a8791f)', color: '#241a08', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', border: '1px solid #f6dc8a' }}>{p.level}</span>
          </div>
          <div>
            <div className="title" style={{ fontSize: '1.02em', letterSpacing: '0.06em' }}>{p.name} <span className="dim" style={{ fontSize: '0.78em' }}>· {cls.name}</span></div>
            <div className="hud-bar flex flex-col gap-1 mt-1">
              <Bar v={h.hp} max={h.maxHp} icon={<span style={{ color: '#ff9a8a' }}>❤</span>} color={h.hp / h.maxHp < 0.3 ? 'linear-gradient(90deg,#7a1818,#c03428)' : 'linear-gradient(90deg,var(--hp1),var(--hp2))'} label={`${Math.ceil(h.hp)} / ${h.maxHp}`} />
              <Bar v={h.mana} max={h.maxMana} icon={<span style={{ color: '#8ab4ff' }}>✦</span>} color="linear-gradient(90deg,var(--mp1),var(--mp2))" label={`${Math.floor(h.mana)}`} />
              <Bar v={h.sta} max={h.maxSta} icon={<span style={{ color: '#a5e88a' }}>⚡</span>} color="linear-gradient(90deg,var(--sp1),var(--sp2))" label={`${Math.floor(h.sta)}`} />
            </div>
            <div style={{ marginTop: 4 }}><Bar v={p.xp} max={xpMax} xp color="linear-gradient(90deg,var(--xp1),var(--xp2))" /></div>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap" style={{ maxWidth: 300 }}>
          {(h.buffs || []).map((b: any) => <div key={b.k} className="buff-chip">{BUFF_ICONS[b.k]} {b.v}s</div>)}
          {h.glide && <div className="buff-chip">🪂 Gliding</div>}
          {h.mounted && <div className="buff-chip">🐎 Mounted</div>}
          {h.over && <div className="buff-chip" style={{ borderColor: 'var(--bad)', color: '#ffb0a5' }}>⚖️ Overburdened</div>}
        </div>
        {S.party && S.party.members && S.party.members.length > 1 && (
          <div className="party-frame px-3 py-2 flex flex-col gap-1.5 anim-fade pointer-events-auto" style={{ minWidth: 210 }}>
            <div className="flex justify-between items-center text-xs font-bold" style={{ color: '#9cc6ff', fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
              <span>🛡️ Party · {S.party.members.length}/4</span>
              <button className="dim hover:text-red-300 cursor-pointer" style={{ fontSize: '0.9em' }} onClick={() => net.sendPartyLeave()}>Leave</button>
            </div>
            {S.party.members.filter((m: any) => m.id !== S.p?.id).map((m: any) => (
              <div key={m.id} className="flex flex-col gap-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold">{m.name}</span>
                  <span className="dim">Lv {m.level} {m.cls}</span>
                </div>
                <Bar v={m.hp} max={m.maxHp || 100} color="linear-gradient(90deg,#1e3a6e,#4a7ad0)" label={`${Math.ceil(m.hp)} / ${m.maxHp || 100}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Compass / region / events / boss ---- */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 flex flex-col items-center gap-1">
        <Compass />
        <div className="dim" style={{ fontSize: '0.8em', textShadow: '0 1px 3px #000', fontVariant: 'small-caps', letterSpacing: '0.08em' }}>{h.region} · {h.time} · {h.weather}{S.settings.showFps ? ` · ${h.fps} fps` : ''}</div>
        {S.worldEvent && (
          <div className="world-event anim-pop px-4 py-2 mt-2 flex flex-col items-center gap-1 pointer-events-auto" style={{ width: 440 }}>
            <div className="flex justify-between items-center w-full">
              <span className="font-bold text-xs tracking-wider" style={{ color: '#d3a6ff', fontVariant: 'small-caps', letterSpacing: '0.1em' }}>⚔️ World Event · {S.worldEvent.title}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--gold2)' }}>{S.worldEvent.remainingSec}s</span>
            </div>
            <div className="dim text-xs text-center">{S.worldEvent.desc}</div>
            <div className="w-full mt-1">
              <Bar v={S.worldEvent.currentCount} max={S.worldEvent.targetCount} color="linear-gradient(90deg, #7a33c0, #b08ef5)" label={`${S.worldEvent.currentCount} / ${S.worldEvent.targetCount}`} />
            </div>
          </div>
        )}
        {h.boss && (
          <div className="boss-frame anim-pop px-4 py-2.5 mt-3" style={{ width: 520 }}>
            <div className="title text-center" style={{ fontSize: '1.1em', color: '#ffb0a0', letterSpacing: '0.12em' }}>{h.boss.name}</div>
            <div className="dim text-center" style={{ fontSize: '0.75em', marginBottom: 4, fontStyle: 'italic' }}>{h.boss.title}</div>
            <Bar v={h.boss.hp} max={h.boss.max} color="linear-gradient(90deg,#6e1414,#c03428)" />
          </div>
        )}
        {h.target && !h.boss && (
          <div className="panel anim-pop px-3 py-1.5 mt-3" style={{ width: 260, borderRadius: 12 }}>
            <div className="text-center" style={{ fontSize: '0.85em', fontVariant: 'small-caps', letterSpacing: '0.06em' }}>{h.target.name}</div>
            <Bar v={h.target.hp} max={h.target.max} color="linear-gradient(90deg,#6e2420,#d05545)" />
          </div>
        )}
      </div>

      {/* ---- Minimap & toasts ---- */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <Minimap />
        <div className="flex flex-col gap-1.5 items-end pointer-events-none" style={{ maxWidth: 340 }}>{u.toasts.map((t: any) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div>
      </div>

      {/* ---- Quest tracker ---- */}
      {tr && (
        <div className="absolute left-4 bottom-28 quest-tracker px-4 py-3 anim-fade" style={{ maxWidth: 330 }}>
          <div className="title" style={{ fontSize: '0.95em' }}>{QUESTS[tr].name}</div>
          <div style={{ fontSize: '0.88em' }}>{stg.text}</div>
          {prog && <div style={{ color: 'var(--gold2)', fontSize: '0.85em' }}>{prog}</div>}
        </div>
      )}

      {/* ---- Ability hotbar ---- */}
      <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex items-end gap-3">
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => {
            const id = p.hotbar[i]; const ab = id ? ABILITIES[id] : null;
            const ready = ab && h.cd[i] === 0;
            return (
              <div key={i} className={`hotslot ${ready ? 'ready' : ''}`} title={ab ? `${ab.name} — ${ab.desc}` : 'Empty slot'} style={{ opacity: ab ? 1 : 0.45 }}>
                {ab ? ab.icon : ''}
                <span className="k"><Key a={'ability' + (i + 1)} /></span>
                {ab && <div className="cd" style={{ height: (h.cd[i] || 0) * 100 + '%' }} />}
                {ab && <span className="cost dim">{ab.res === 'mana' ? '✦' : '⚡'}{ab.cost}</span>}
              </div>
            );
          })}
        </div>
        <div className="hotslot ready" title="Quick heal potion"><span>🧪</span><span className="k"><Key a="potion" /></span><span style={{ position: 'absolute', bottom: 1, right: 4, fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px #000' }}>{count('potion_health') + count('potion_health_big')}</span></div>
      </div>

      {/* ---- Gold / weight / realm + window shortcuts ---- */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 items-end">
        <div className="player-frame px-3 py-1.5" style={{ fontSize: '0.9em' }}>
          <span style={{ color: 'var(--gold2)' }}>🪙 {p.gold}</span>
          <span className="dim"> · ⚖️ {h.weight}/{h.cap}</span>
          {net.status !== 'offline' && <span style={{ color: '#8ae0ff' }}> · 🌐 {h.players}</span>}
        </div>
        <div className="flex gap-1.5 pointer-events-auto">
          {[['inventory', '🎒', 'Inventory'], ['skills', '🌟', 'Skills'], ['quests', '📜', 'Journal'], ['map', '🗺️', 'World Map']].map(([a, i, label]) => <Btn key={a} className="sm" title={`${label}`} onClick={() => { S.ui.codex = a; document.pointerLockElement && document.exitPointerLock(); emitUI(); }}>{i} <Key a={a} /></Btn>)}
          <Btn className="sm" title="Menu" onClick={() => { S.ui.pause = true; emitUI(); }}>☰</Btn>
        </div>
        {inHome && <Btn className="sm pointer-events-auto" onClick={() => { S.ui.houseEdit = true; document.pointerLockElement && document.exitPointerLock(); emitUI(); }}>🪑 Furnish home</Btn>}
      </div>

      {/* ---- Interact hint / crosshair / banners / subtitles / fishing ---- */}
      {h.nearHint && <div className="absolute left-1/2 top-[62%] -translate-x-1/2 panel px-4 py-2 anim-pop flex items-center gap-2" style={{ borderRadius: 999, borderColor: 'var(--line-strong)' }}><Key a="interact" /> <span>{h.nearHint.label}</span></div>}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 4px #000' }} />
      {showBanner && <div key={h.banner.t} className="absolute left-1/2 top-[22%] -translate-x-1/2 title text-center" style={{ fontSize: '2.2em', animation: 'banner 4.2s ease-in-out forwards', textShadow: '0 4px 20px #000' }}>{h.banner.name}</div>}
      {S.settings.subtitles && u.subtitle && <div className="absolute left-1/2 bottom-24 -translate-x-1/2 panel px-5 py-2 anim-pop text-center" style={{ maxWidth: 720, borderRadius: 16, fontSize: `${S.settings.textSize}em` }}><b className="title">{u.subtitle.name}</b> <span>{u.subtitle.text}</span></div>}
      {u.fish && (
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 panel px-8 py-5 text-center anim-pop" style={{ borderRadius: 24 }}>
          <div style={{ fontSize: 40 }}>{u.fish.state === 'bite' ? '❗🎣' : '🎣'}</div>
          <div className="title">{u.fish.state === 'bite' ? 'A bite! Press now!' : 'Waiting for a bite…'}</div>
          <div className="dim" style={{ fontSize: '0.8em' }}>{u.fish.msg}</div>
          <div className="mt-2 pointer-events-auto flex gap-2 justify-center items-center"><Key a="interact" /> <span className="dim">reel in ·</span><Btn className="sm" onClick={() => { S.ui.fish = null; if (G_player()) G_player().act = 'none'; emitUI(); }}>Stop fishing</Btn></div>
        </div>
      )}
      <Chat />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200,20,20,0.85))', opacity: Math.max(h.hurt || 0, h.hp / h.maxHp < 0.25 ? 0.35 : 0), transition: 'opacity 0.2s' }} />
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: h.fade || 0, transition: 'opacity 0.5s' }} />
      {h.input === 'kb' && !u.codex && <div className="absolute left-4 bottom-4 dim" style={{ fontSize: '0.72em' }}>LMB strike · RMB block/parry · <Key a="dodge" /> dodge · <Key a="companion_cmd" /> order · <Key a="mount" /> mount · <Key a="emote" /> emote</div>}
    </div>
  );
}
import * as storeMod from '../game/store';
const require_q = () => storeMod;
import { G } from '../game/fx';
const G_player = () => G.player;

function Chat() {
  useUI();
  const [txt, setTxt] = useState('');
  const [channel, setChannel] = useState<'world' | 'local' | 'party' | 'guild' | 'whisper'>('world');
  const [whisperTarget, setWhisperTarget] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const open = S.ui.chat;

  useEffect(() => { if (open) ref.current?.focus(); }, [open]);

  const log = S.chatLog.filter((m: any) => Date.now() - m.t < 25000 || open).slice(-8);
  if (net.status === 'offline' && !log.length) return null;

  const channelColors: Record<string, string> = {
    world: '#ffe27a',
    local: '#9ae8b0',
    party: '#9cc6ff',
    guild: '#fdba74',
    whisper: '#f0a0d8'
  };

  const submit = () => {
    let raw = txt.trim();
    if (!raw) {
      S.ui.chat = false;
      emitUI();
      return;
    }

    let ch = channel;
    let target = whisperTarget;

    if (raw.startsWith('/p ')) {
      ch = 'party';
      raw = raw.slice(3).trim();
    } else if (raw.startsWith('/g ')) {
      ch = 'guild';
      raw = raw.slice(3).trim();
    } else if (raw.startsWith('/l ')) {
      ch = 'local';
      raw = raw.slice(3).trim();
    } else if (raw.startsWith('/w ')) {
      ch = 'whisper';
      const parts = raw.slice(3).trim().split(' ');
      target = parts[0] || '';
      raw = parts.slice(1).join(' ');
    }

    if (raw) {
      net.sendChat(raw, ch, target);
    }
    setTxt('');
    S.ui.chat = false;
    emitUI();
  };

  return (
    <div className="absolute left-4 bottom-44 flex flex-col gap-1 pointer-events-auto" style={{ width: 380, zIndex: 10 }}>
      {net.status === 'realm' && (
        <div className="chat-frame flex items-center gap-2 px-2.5 py-1 text-xs">
          <span className="status-dot on" />
          <span style={{ color: '#9cc6ff', fontVariant: 'small-caps', letterSpacing: '0.08em' }}>Global Realm</span>
          <span className="dim">·</span>
          <span style={{ color: '#9ae8b0' }}>{net.onlineCount} online</span>
        </div>
      )}
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {log.map((m: any, i: number) => {
          const col = channelColors[m.channel || 'world'] || '#ffe27a';
          return (
            <div key={i} className="chat-msg">
              <span className="chat-tag" style={{ color: col }}>[{((m.channel || 'world') as string).toUpperCase()}]</span>
              <b style={{ color: m.me ? 'var(--gold2)' : '#8ae0ff' }}>{m.name}:</b> {m.text}
            </div>
          );
        })}
      </div>
      {open && (
        <div className="chat-frame flex flex-col gap-1.5 p-2">
          <div className="flex gap-1 text-xs">
            {(['world', 'local', 'party', 'guild', 'whisper'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`px-2 py-0.5 rounded text-xs transition cursor-pointer`}
                style={channel === c ? { background: 'rgba(227,185,79,0.25)', border: '1px solid var(--line-strong)', color: 'var(--gold2)', fontWeight: 700 } : { color: 'var(--dim)', border: '1px solid transparent' }}
                onClick={() => setChannel(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          {channel === 'whisper' && (
            <input
              className="input text-xs"
              placeholder="Target character name..."
              value={whisperTarget}
              onChange={(e) => setWhisperTarget(e.target.value)}
              style={{ padding: '2px 6px', fontSize: '0.8em' }}
            />
          )}
          <input
            ref={ref}
            className="input"
            value={txt}
            maxLength={140}
            placeholder={`Say in ${channel}... (/p, /g, /l, /w target)`}
            onChange={(e) => setTxt(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                submit();
                (e.target as HTMLElement).blur();
              }
              if (e.key === 'Escape') {
                S.ui.chat = false;
                emitUI();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export function DeadScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade" style={{ background: 'radial-gradient(ellipse at center, rgba(60,0,0,0.6), rgba(0,0,0,0.92))' }}>
      <div data-modal="1" className="panel win text-center px-12 py-10">
        <div style={{ fontSize: 54 }}>💀</div>
        <div className="title" style={{ fontSize: '2.2em' }}>You Have Fallen</div>
        <div className="divider-orn" style={{ margin: '0.6em 0' }}><span>✦ ✦ ✦</span></div>
        <div className="dim mb-6">The broken sky is not yet done with you. You will wake in Thornwick, shaken. <span style={{ color: 'var(--bad)' }}>(Lose 10% gold)</span></div>
        <Btn className="big primary" onClick={() => { sfx('confirm'); api.respawn(); }}>Recover</Btn>
      </div>
    </div>
  );
}

export function PauseMenu() {
  useUI(); const [sub, setSub] = useState<string>(''); const close = () => { S.ui.pause = false; emitUI(); };
  const slots = ['1', '2', '3'];
  return (
    <Window title="Paused" sub={net.status !== 'offline' ? `Global Realm · ${net.status}` : 'Offline Campaign'} icon="☰" onClose={close} w="min(560px, 94vw)" h="auto">
      <div className="p-5 flex flex-col gap-2">
        {!sub && <>
          <Btn className="big primary" onClick={close}>▶ Resume</Btn>
          <Btn onClick={() => { S.ui.settings = true; emitUI(); }}>⚙️ Settings & Controls</Btn>
          <Btn onClick={() => setSub('save')}>💾 Save Game</Btn><Btn onClick={() => setSub('load')}>📂 Load Game</Btn>
          <Btn onClick={() => { S.ui.mp = true; emitUI(); }}>🌐 Realm & Social {net.status !== 'offline' && <span className="dim">({net.status})</span>}</Btn>
          <Btn className="danger" onClick={() => { S.ui.confirm = { text: 'Quit to main menu? Unsaved progress since your last save will be lost.', yes: () => { saveGame('auto', true); net.leave(); stopGame(); S.ui.pause = false; S.screen = 'menu'; S.ui.confirm = null; emitUI(); } }; emitUI(); }}>🚪 Quit to Menu <span className="dim">(autosaves)</span></Btn>
        </>}
        {(sub === 'save' || sub === 'load') && <>
          <div className="h-sec">{sub === 'save' ? 'Save to slot' : 'Load from slot'}</div>
          {(sub === 'load' ? ['auto', ...slots] : slots).map((s) => { const i = slotInfo(s); return <Btn key={s} disabled={sub === 'load' && !i} className="text-left" onClick={() => { if (sub === 'save') { saveGame(s); setSub(''); } else { S.ui.confirm = { text: 'Load this save? Current progress will be replaced.', yes: () => { net.leave(); stopGame(); loadGame(s); S.ui.pause = false; S.ui.confirm = null; S.screen = 'boot'; emitUI(); } }; emitUI(); } }}><b>{s === 'auto' ? 'Autosave' : `Slot ${s}`}</b> — {i ? `${i.name} · Lv ${i.level} ${CLASSES.find((c) => c.id === i.cls)?.name} · Day ${i.day} · ${i.gold}g · ${new Date(i.ts).toLocaleString()}` : 'Empty'}</Btn>; })}
          <Btn onClick={() => setSub('')}>← Back</Btn></>}
      </div>
    </Window>
  );
}
export function Confirm() {
  useUI(); const c = S.ui.confirm; if (!c) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center anim-fade" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div data-modal="1" className="panel win p-6 text-center" style={{ maxWidth: 440 }} role="alertdialog">
        <div className="mb-1 title" style={{ fontSize: '1.1em' }}>Confirm</div>
        <div className="divider-orn" style={{ margin: '0.4em 0 0.8em' }}><span>✦</span></div>
        <div className="mb-5">{c.text}</div>
        <div className="flex gap-3 justify-center"><Btn className="primary" onClick={() => { c.yes(); }}>Confirm</Btn><Btn onClick={() => { sfx('cancel'); S.ui.confirm = null; emitUI(); }}>Cancel</Btn></div>
      </div>
    </div>
  );
}
