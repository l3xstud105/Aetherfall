// AETHERFALL multiplayer — WebRTC peer-to-peer via PeerJS (public PeerJS cloud used ONLY for signalling/matchmaking).
// Topology: star. The host creates a world code, friends join by code (or invite link ?join=CODE). Host relays state to everyone.
import Peer, { type DataConnection } from 'peerjs';
import { S, emitUI, toast } from './store';
import { G } from './fx';
import { ensureRemote, removeRemote, appearanceFor } from './actors';

const PREFIX = 'aetherfall-l3x-';
const rcode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

class Net {
  peer: Peer | null = null; conns = new Map<string, DataConnection>(); isHost = false; code = ''; status: 'offline' | 'connecting' | 'hosting' | 'joined' | 'error' = 'offline'; error = ''; myId = ''; hostConn: DataConnection | null = null; roster = new Map<string, any>(); lastSend = 0;
  private set(st: Net['status'], err = '') { this.status = st; this.error = err; emitUI(); }
  myInfo() { const p = S.p; return { name: p.name, cls: p.cls, look: p.look, equip: p.equip, level: p.level }; }
  host() {
    if (this.peer) this.leave(); this.set('connecting'); this.isHost = true; this.code = rcode();
    try { this.peer = new Peer(PREFIX + this.code); } catch (e: any) { this.set('error', String(e)); return; }
    this.peer.on('open', (id) => { this.myId = id; this.set('hosting'); toast(`Multiplayer world created. Code: ${this.code}`, 'unlock'); });
    this.peer.on('connection', (c) => this.accept(c)); this.peer.on('error', (e: any) => { this.set('error', e?.type === 'unavailable-id' ? 'Code collision — try again.' : `Network error (${e?.type || e}). Signalling server unreachable?`); });
  }
  join(code: string) {
    code = code.trim().toUpperCase(); if (!code) return; if (this.peer) this.leave(); this.set('connecting'); this.isHost = false; this.code = code;
    try { this.peer = new Peer(); } catch (e: any) { this.set('error', String(e)); return; }
    const to = setTimeout(() => { if (this.status === 'connecting') { this.set('error', 'Timed out. Check the code, or the host may be offline.'); } }, 15000);
    this.peer.on('open', (id) => { this.myId = id; const c = this.peer!.connect(PREFIX + code, { reliable: true }); this.hostConn = c; c.on('open', () => { clearTimeout(to); this.set('joined'); c.send({ t: 'hello', id, info: this.myInfo() }); toast('Joined multiplayer world.', 'unlock'); }); c.on('data', (m: any) => this.onMsg(m, c)); c.on('close', () => { this.leave(); toast('Disconnected from host.', 'error'); }); c.on('error', () => this.set('error', 'Connection failed.')); });
    this.peer.on('error', (e: any) => { this.set('error', e?.type === 'peer-unavailable' ? 'No world found with that code.' : `Network error (${e?.type || e}).`); });
  }
  private accept(c: DataConnection) {
    c.on('open', () => { this.conns.set(c.peer, c); }); c.on('data', (m: any) => this.onMsg(m, c)); c.on('close', () => { this.conns.delete(c.peer); this.roster.delete(c.peer); removeRemote(c.peer); this.relay({ t: 'bye', id: c.peer }, c.peer); emitUI(); });
  }
  leave() { try { this.peer?.destroy(); } catch { /* ignore */ } this.peer = null; this.conns.clear(); this.hostConn = null; this.roster.clear(); [...G.remotes.keys()].forEach((id: string) => removeRemote(id)); this.isHost = false; this.status = 'offline'; this.error = ''; this.code = ''; emitUI(); }
  private relay(m: any, except?: string) { this.conns.forEach((c, id) => { if (id !== except && c.open) c.send(m); }); }
  private onMsg(m: any, from: DataConnection) {
    if (!m || !m.t) return;
    switch (m.t) {
      case 'hello': { this.roster.set(m.id, m.info); ensureRemote(m.id, m.info); if (this.isHost) { // tell the newcomer who is here; tell others about newcomer
          const list = [{ id: this.myId, info: this.myInfo() }, ...[...this.roster.entries()].filter(([id]) => id !== m.id).map(([id, info]) => ({ id, info }))]; from.send({ t: 'roster', list }); from.send({ t: 'world', time: S.world.time, day: S.world.day, weather: G.weather.type }); this.relay(m, m.id); } emitUI(); break; }
      case 'roster': m.list.forEach((q: any) => { this.roster.set(q.id, q.info); ensureRemote(q.id, q.info); }); emitUI(); break;
      case 'st': { const r = G.remotes.get(m.id); if (r) { r.tp.set(m.x, m.y, m.z); if (r.pos.lengthSq() === 0) r.pos.copy(r.tp); r.ty = m.ry; r.speed = m.sp; r.act = m.act || 'none'; r.air = m.air; r.crouch = m.cr; r.inside = m.in || null; } if (this.isHost) this.relay(m, m.id); break; }
      case 'chat': S.chatLog = [...S.chatLog.slice(-30), { name: m.name, text: m.text, t: Date.now() }]; emitUI(); if (this.isHost) this.relay(m, from.peer); break;
      case 'world': if (!this.isHost) { S.world.time = m.time; S.world.day = m.day; G.weather.type = m.weather; } break;
      case 'bye': removeRemote(m.id); this.roster.delete(m.id); emitUI(); if (this.isHost) this.relay(m, from.peer); break;
    }
  }
  sendState(dt: number) {
    if (this.status !== 'hosting' && this.status !== 'joined') return; this.lastSend += dt; if (this.lastSend < 0.1) return; this.lastSend = 0; const P = G.player; if (!P) return;
    const m = { t: 'st', id: this.myId, x: P.pos.x, y: P.pos.y, z: P.pos.z, ry: P.visYaw ?? P.yaw, sp: P.speedNow || 0, act: P.netAct || 'none', air: P.airState, cr: P.crouch, in: P.insideKey || null };
    if (this.isHost) this.relay(m); else this.hostConn?.open && this.hostConn.send(m);
  }
  sendChat(text: string) { const m = { t: 'chat', name: S.p.name, text }; S.chatLog = [...S.chatLog.slice(-30), { name: S.p.name, text, t: Date.now(), me: true }]; emitUI(); if (this.isHost) this.relay(m); else this.hostConn?.open && this.hostConn.send(m); }
  broadcastWorld() { if (this.isHost) this.relay({ t: 'world', time: S.world.time, day: S.world.day, weather: G.weather.type }); }
  count() { return (this.isHost ? this.conns.size : this.roster.size) + (this.status === 'hosting' || this.status === 'joined' ? 1 : 0); }
  announce() { if (this.status === 'joined') this.hostConn?.send({ t: 'hello', id: this.myId, info: this.myInfo() }); }
}
export const net = new Net(); G.net = net; void appearanceFor;
export const playerCount = () => net.count();
