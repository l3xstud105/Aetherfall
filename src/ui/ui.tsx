import { useEffect, useState, type ReactNode } from 'react';
import { ITEMS, RARITY_COLOR, KEY_LABELS } from '../game/data';
import { S, useHud, emitUI, saveSettings } from '../game/store';
import { audio } from '../game/audio';

export const sfx = (n: string) => audio.sfx(n);
export function Btn({ children, onClick, className = '', disabled, sel, title, quiet, ...r }: any) {
  return (
    <button {...r} title={title} disabled={disabled} className={`btn ${sel ? 'sel' : ''} ${className}`} onMouseEnter={() => !disabled && sfx('hover')} onClick={(e) => { if (disabled) return; if (!quiet) sfx('click'); onClick?.(e); }}>
      {children}
    </button>
  );
}
export function Bar({ v, max, color, label }: { v: number; max: number; color: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return <div className="bar"><i style={{ width: pct + '%', background: color }} />{label !== undefined && <b>{label}</b>}</div>;
}
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) { return <button role="switch" aria-checked={on} className={`toggle ${on ? 'on' : ''}`} onClick={() => { sfx('tab'); onChange(!on); }} onMouseEnter={() => sfx('hover')} />; }
export function Slider({ v, min, max, step = 0.01, onChange, tick }: any) { return <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} onMouseUp={() => sfx(tick || 'tap')} onKeyUp={() => sfx('tap')} />; }
export function Window({ title, onClose, children, w = 'min(1100px, 96vw)', h = 'min(720px, 92vh)', icon }: any) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center anim-fade" style={{ background: 'rgba(0,0,0,0.55)' }} onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div data-modal="1" className="panel win flex flex-col overflow-hidden" style={{ width: w, height: h }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="title text-xl">{icon} {title}</div>
          {onClose && <Btn className="sm" onClick={() => { sfx('close'); onClose(); }}>✕ <span className="dim">Close</span></Btn>}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
export const ICON_BY_KIND: Record<string, string> = { sword: '🗡️', greatsword: '⚔️', axe: '🪓', hammer: '🔨', dagger: '🔪', bow: '🏹', staff: '🪄', shield: '🛡️' };
export function iconOf(id: string) {
  const it = ITEMS[id]; if (!it) return '❔';
  if (it.type === 'weapon') return ICON_BY_KIND[it.kind!] || '🗡️';
  if (it.type === 'armor') return ({ offhand: '🛡️', head: it.style === 'hood' ? '🧢' : '🪖', chest: it.style === 'robe' ? '🥻' : '🦺', hands: '🧤', feet: '🥾', ring: '💍', amulet: '📿' } as any)[it.slot!] || '🛡️';
  if (it.type === 'consumable') return /potion|elixir/.test(id) ? '🧪' : /fish/.test(id) ? '🐟' : /meat/.test(id) ? '🍖' : /bread|tart/.test(id) ? '🍞' : id === 'apple' ? '🍎' : '🍲';
  if (it.type === 'quest') return /shard/.test(id) ? '💎' : id === 'locket' ? '📿' : '📜';
  if (it.type === 'collectible') return /lore/.test(id) ? '📄' : id === 'golden_carp' ? '🐠' : '🏺';
  if (/ore|coal/.test(id)) return '⛏️'; if (/ingot/.test(id)) return '🧱'; if (/herb|moon/.test(id)) return '🌿'; if (/mushroom/.test(id)) return '🍄'; if (/seed/.test(id)) return '🌱'; if (/leather|hide|pelt/.test(id)) return '🟫'; if (/gem|dust/.test(id)) return '✨'; if (/meat/.test(id)) return '🥩'; if (/fish/.test(id)) return '🐟'; if (/wheat|flour/.test(id)) return '🌾'; if (/turnip/.test(id)) return '🥕'; if (/berry/.test(id)) return '🫐'; if (/feather/.test(id)) return '🪶'; if (/bone|fang/.test(id)) return '🦴';
  return '📦';
}
export const rcol = (r: string) => RARITY_COLOR[r];
export function ItemTip({ id }: { id: string }) {
  const it = ITEMS[id]; if (!it) return null; const stats: string[] = []; if (it.atk) stats.push(`Attack ${it.atk}`); if (it.mag) stats.push(`Magic ${it.mag}`); if (it.def) stats.push(`Defence ${it.def}`); if (it.hp) stats.push(`+${it.hp} Health`); if (it.mana) stats.push(`+${it.mana} Mana`); if (it.speed) stats.push(`+${Math.round(it.speed * 100)}% Speed`); if (it.bound) stats.push(`Bound magic: ${it.bound}`);
  return <div><div className={`r-${it.rarity}`} style={{ fontWeight: 700, border: 'none', boxShadow: 'none', animation: 'none' }}>{it.name}</div><div className="dim" style={{ fontSize: '0.8em' }}>{it.rarity} {it.kind || it.slot || it.type}</div>{stats.map((s) => <div key={s}>{s}</div>)}<div className="dim" style={{ marginTop: 4 }}>{it.desc}</div>{it.req?.lvl && <div style={{ color: S.p.level >= it.req.lvl ? 'var(--good)' : 'var(--bad)' }}>Requires level {it.req.lvl}</div>}<div className="dim" style={{ marginTop: 4 }}>Value {it.value}g · Weight {it.weight}</div></div>;
}
// global tooltip host
let setTipFn: ((t: any) => void) | null = null;
export const showTip = (e: React.MouseEvent, content: ReactNode) => setTipFn?.({ x: e.clientX, y: e.clientY, content });
export const hideTip = () => setTipFn?.(null);
export function TipHost() {
  const [t, setT] = useState<any>(null); useEffect(() => { setTipFn = setT; return () => { setTipFn = null; }; }, []);
  if (!t) return null; const x = Math.min(t.x + 16, window.innerWidth - 300), y = Math.min(t.y + 16, window.innerHeight - 200);
  return <div className="tt" style={{ left: x, top: y }}>{t.content}</div>;
}
// ----- input glyphs
export const keyLabel = (code: string) => (!code ? '?' : code === 'Mouse0' ? 'LMB' : code === 'Mouse2' ? 'RMB' : code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code.replace('Left', '').replace('Right', '').replace('Arrow', '↔').replace('Space', 'Space').replace('Shift', 'Shift').replace('Control', 'Ctrl').replace('Enter', '⏎'));
const PADMAP: Record<string, string> = { jump: 'A', dodge: 'B', attack: 'X', interact: 'Y', potion: 'LB', mount: 'R3', map: 'View', ability1: '◀', ability2: '▲', ability3: '▶', ability4: '▼', sprint: 'RB', block: 'LT', crouch: 'R3', confirm: 'A', back: 'B', pause: 'Menu' };
const XB: Record<string, string> = { A: '#3fa34d', B: '#d0453a', X: '#3a74d0', Y: '#d8b232' }, PS: Record<string, [string, string]> = { A: ['✕', '#7a9aea'], B: ['○', '#e8685a'], X: ['□', '#e87ac8'], Y: ['△', '#4ad8b0'] };
export function Key({ a }: { a: string }) {
  useHud(); const h = S.hud; if (h.input === 'pad') { const b = PADMAP[a] || '•'; if (h.pad === 'ps' && PS[b]) return <span className="glyph" style={{ background: PS[b][1] + '33', borderColor: PS[b][1], color: PS[b][1] }}>{PS[b][0]}</span>; if (XB[b]) return <span className="glyph" style={{ background: XB[b] }}>{b}</span>; const lab = h.pad === 'ps' ? ({ LB: 'L1', RB: 'R1', LT: 'L2', R3: 'R3', View: 'Share', Menu: 'Opt' } as any)[b] || b : b; return <span className="glyph" style={{ background: '#444' }}>{lab}</span>; }
  return <span className="kbd">{keyLabel(S.settings.keys[a] || (a === 'confirm' ? 'Enter' : a === 'back' ? 'Esc' : ''))}</span>;
}
export const actionLabel = (a: string) => KEY_LABELS[a] || a;
export function update(fn: () => void) { fn(); emitUI(); saveSettings(); }
