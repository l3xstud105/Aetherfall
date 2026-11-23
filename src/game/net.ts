// AETHERFALL 1.0.0 — Unified Networking Layer
// Supports One Global Authoritative Realm Server (WebSocket MMORPG) with Legacy PeerJS Co-op Fallback.
import Peer, { type DataConnection } from 'peerjs';
import { S, emitUI, toast } from './store';
import { G } from './fx';
import { ensureRemote, removeRemote, appearanceFor, applyRemoteFoeHit, applyBossSync, applyServerSnapshot } from './actors';

const PREFIX = 'aetherfall-l3x-';
const rcode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  }
};

function sanitizeText(str: any, maxLen = 140): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

export class Net {
  // Authoritative Realm State
  isRealm = false;
  realmWs: WebSocket | null = null;
  realmUrl = '';
  seq = 0;
  onlineCount = 1;

  // PeerJS Legacy State
  peer: Peer | null = null;
  conns = new Map<string, DataConnection>();
  isHost = false;
  code = '';
  status: 'offline' | 'connecting' | 'hosting' | 'joined' | 'realm' | 'error' = 'offline';
  error = '';
  myId = '';
  hostConn: DataConnection | null = null;
  roster = new Map<string, any>();
  lastSend = 0;

  private set(st: Net['status'], err = '') { this.status = st; this.error = err; emitUI(); }

  myInfo() {
    const p = S.p;
    return { name: sanitizeText(p?.name || 'Hero', 24), cls: p?.cls || 'warrior', look: p?.look, equip: p?.equip, level: p?.level || 1 };
  }

  // ==========================================
  // AUTHORITATIVE GLOBAL REALM (ONE WORLD)
  // ==========================================
  connectRealm(url?: string, username?: string, password?: string) {
    if (this.peer || this.realmWs) this.leave();
    this.set('connecting');

    const defaultHost = typeof window !== 'undefined' && window.location ? window.location.hostname : '127.0.0.1';
    const protocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const targetUrl = url || `${protocol}//${defaultHost}:7777`;
    this.realmUrl = targetUrl;

    try {
      const ws = new WebSocket(targetUrl);
      this.realmWs = ws;

      const user = username || S.p?.name || 'Hero_' + Math.floor(Math.random() * 1000);

      ws.onopen = () => {
        ws.send(JSON.stringify({ t: 'auth', username: user, password }));
      };

      ws.onmessage = (event) => {
        try {
          const m = JSON.parse(event.data.toString());
          this.handleRealmMessage(m);
        } catch (e) {
          console.error('[Realm Client] Message parse error:', e);
        }
      };

      ws.onerror = (e) => {
        this.set('error', 'Could not reach Aetherfall Realm server. Playing in offline mode.');
      };

      ws.onclose = () => {
        if (this.status === 'realm') {
          toast('Disconnected from Aetherfall Global Realm. Switched to offline play.', 'error');
        }
        this.isRealm = false;
        this.realmWs = null;
        this.set('offline');
      };
    } catch (e: any) {
      this.set('error', String(e));
    }
  }

  private handleRealmMessage(m: any) {
    if (!m || !m.t) return;
    switch (m.t) {
      case 'auth_ok': {
        const chars = m.characters || [];
        if (chars.length > 0) {
          this.realmWs?.send(JSON.stringify({ t: 'char_select', characterId: chars[0].id }));
        } else {
          // Create character from existing store or default
          const p = S.p;
          this.realmWs?.send(JSON.stringify({
            t: 'char_create',
            name: p?.name || 'Hero',
            cls: p?.cls || 'warrior',
            look: p?.look || {}
          }));
        }
        break;
      }
      case 'char_created': {
        this.realmWs?.send(JSON.stringify({ t: 'char_select', characterId: m.character.id }));
        break;
      }
      case 'char_ok': {
        this.isRealm = true;
        this.myId = m.character.id;
        this.set('realm');
        this.onlineCount = m.onlineCount || 1;
        toast('Connected to Aetherfall Global Realm!', 'unlock');

        // Sync initial world state
        if (Number.isFinite(m.worldTime)) S.world.time = m.worldTime;
        if (Number.isFinite(m.day)) S.world.day = m.day;
        if (m.weather) G.weather.type = m.weather;
        emitUI();
        break;
      }
      case 'snapshot': {
        applyServerSnapshot(m);
        if (Number.isFinite(m.time)) S.world.time = m.time;
        if (Number.isFinite(m.day)) S.world.day = m.day;
        if (m.weather) G.weather.type = m.weather;
        break;
      }
      case 'foe_hit': {
        applyRemoteFoeHit(m);
        break;
      }
      case 'player_hurt': {
        if (m.charId === this.myId) {
          S.p.hp = m.hp;
          G.hurtPlayer(m.dmg, null, false);
        }
        break;
      }
      case 'player_respawn': {
        if (m.charId === this.myId) {
          S.p.hp = m.hp;
          G.player.pos.set(m.x, m.y, m.z);
          toast('You have awakened at Thornwick sanctuary.', 'info');
        }
        break;
      }
      case 'inv_update': {
        if (Number.isFinite(m.gold)) S.p.gold = m.gold;
        if (Number.isFinite(m.level)) S.p.level = m.level;
        if (Number.isFinite(m.xp)) S.p.xp = m.xp;
        if (m.inventory) S.p.inv = m.inventory;
        emitUI();
        break;
      }
      case 'chat_msg': {
        S.chatLog = [...S.chatLog.slice(-30), {
          channel: m.channel,
          name: m.from,
          text: m.text,
          t: m.timestamp || Date.now(),
          me: m.fromId === this.myId
        }];
        emitUI();
        break;
      }
      case 'party_invitation': {
        toast(`Party Invitation from ${m.fromName}! Press [P] or open Party panel to accept.`, 'info');
        S.ui.prompt = {
          title: 'Party Invitation',
          text: `${m.fromName} has invited you to form a party.`,
          yes: () => this.sendPartyAccept(m.partyId)
        };
        emitUI();
        break;
      }
      case 'party_update': {
        S.party = m;
        emitUI();
        break;
      }
      case 'trade_update': {
        S.trade = m;
        S.ui.trade = true;
        emitUI();
        break;
      }
      case 'trade_complete': {
        toast('Trade completed successfully!', 'unlock');
        S.ui.trade = false;
        S.trade = null;
        emitUI();
        break;
      }
      case 'trade_cancelled': {
        toast(`Trade cancelled: ${m.reason || 'aborted'}`, 'error');
        S.ui.trade = false;
        S.trade = null;
        emitUI();
        break;
      }
      case 'friends_list': {
        S.friends = m.friends || [];
        emitUI();
        break;
      }
      case 'inspect_data': {
        S.inspectTarget = m.profile;
        S.ui.inspect = true;
        emitUI();
        break;
      }
      case 'lfg_status': {
        S.lfg = { status: m.status, dungeon: m.dungeon, queueSize: m.queueSize || 0 };
        emitUI();
        break;
      }
      case 'lfg_matched': {
        toast(`Match Found for ${m.dungeon}! Entering dungeon group...`, 'unlock');
        S.lfg = { status: 'matched', dungeon: m.dungeon, queueSize: 0 };
        emitUI();
        break;
      }
      case 'market_listings': {
        S.market.listings = m.listings || [];
        emitUI();
        break;
      }
      case 'market_my_listings': {
        S.market.myListings = m.listings || [];
        emitUI();
        break;
      }
      case 'market_listed': {
        toast('Item listed on Marketplace!', 'unlock');
        emitUI();
        break;
      }
      case 'market_bought': {
        toast(`Purchased ${m.listing.item_id}!`, 'unlock');
        emitUI();
        break;
      }
      case 'market_cancelled': {
        toast('Listing cancelled. Item returned to inventory.', 'info');
        emitUI();
        break;
      }
      case 'market_err': {
        toast(m.error || 'Marketplace error', 'error');
        break;
      }
      case 'world_event_start': {
        S.worldEvent = m.event;
        toast(`⚔️ WORLD EVENT: ${m.event.title}!`, 'discover');
        emitUI();
        break;
      }
      case 'world_event_update': {
        S.worldEvent = m.event;
        emitUI();
        break;
      }
      case 'world_event_end': {
        toast(m.msg || 'World event ended.', m.result === 'victory' ? 'unlock' : 'info');
        S.worldEvent = null;
        emitUI();
        break;
      }
    }
  }

  // ==========================================
  // PEER CO-OP FALLBACK
  // ==========================================
  host(customPeer?: any) {
    if (this.peer || this.realmWs) this.leave();
    this.set('connecting');
    this.isHost = true;
    this.isRealm = false;
    this.code = rcode();
    try {
      this.peer = customPeer || new Peer(PREFIX + this.code, PEER_CONFIG);
    } catch (e: any) {
      this.set('error', String(e));
      return;
    }
    this.peer.on('open', (id: string) => {
      this.myId = id;
      this.set('hosting');
      toast(`Multiplayer world created. Code: ${this.code}`, 'unlock');
    });
    this.peer.on('connection', (c: any) => this.accept(c));
    this.peer.on('error', (e: any) => {
      this.set('error', e?.type === 'unavailable-id' ? 'Code collision — try again.' : `Network error (${e?.type || e}). Signalling server unreachable?`);
    });
  }

  join(code: string, customPeer?: any) {
    code = code.trim().toUpperCase();
    if (!code) return;
    if (this.peer || this.realmWs) this.leave();
    this.set('connecting');
    this.isHost = false;
    this.isRealm = false;
    this.code = code;
    try {
      this.peer = customPeer || new Peer(PEER_CONFIG);
    } catch (e: any) {
      this.set('error', String(e));
      return;
    }
    const to = setTimeout(() => {
      if (this.status === 'connecting') {
        this.set('error', 'Timed out. Check the code, or the host may be offline.');
      }
    }, 15000);
    this.peer.on('open', (id: string) => {
      this.myId = id;
      const c = this.peer!.connect(PREFIX + code, { reliable: true });
      this.hostConn = c;
      c.on('open', () => {
        clearTimeout(to);
        this.set('joined');
        c.send({ t: 'hello', id, info: this.myInfo() });
        toast('Joined multiplayer world.', 'unlock');
      });
      c.on('data', (m: any) => this.onMsg(m, c));
      c.on('close', () => {
        this.leave();
        toast('Disconnected from host.', 'error');
      });
      c.on('error', () => this.set('error', 'Connection failed.'));
    });
    this.peer.on('error', (e: any) => {
      this.set('error', e?.type === 'peer-unavailable' ? 'No world found with that code.' : `Network error (${e?.type || e}).`);
    });
  }

  accept(c: DataConnection) {
    if ((c as any).open) { this.conns.set(c.peer, c); }
    c.on('open', () => { this.conns.set(c.peer, c); });
    c.on('data', (m: any) => this.onMsg(m, c));
    c.on('close', () => {
      this.conns.delete(c.peer);
      this.roster.delete(c.peer);
      removeRemote(c.peer);
      this.relay({ t: 'bye', id: c.peer }, c.peer);
      emitUI();
    });
  }

  leave() {
    try { this.conns.forEach((c) => { try { c.close(); } catch {} }); } catch {}
    try { this.hostConn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
    try { this.realmWs?.close(); } catch {}
    this.realmWs = null;
    this.peer = null;
    this.conns.clear();
    this.hostConn = null;
    this.roster.clear();
    [...G.remotes.keys()].forEach((id: string) => removeRemote(id));
    this.isHost = false;
    this.isRealm = false;
    this.status = 'offline';
    this.error = '';
    this.code = '';
    emitUI();
  }

  relay(m: any, except?: string) {
    this.conns.forEach((c, id) => {
      if (id !== except && c.open) c.send(m);
    });
  }

  onMsg(m: any, from: DataConnection) {
    if (!m || typeof m !== 'object' || !m.t) return;
    switch (m.t) {
      case 'hello': {
        if (!m.id || !m.info) return;
        const info = { ...m.info, name: sanitizeText(m.info.name, 24) };
        this.roster.set(m.id, info);
        ensureRemote(m.id, info);
        if (this.isHost) {
          const list = [
            { id: this.myId, info: this.myInfo() },
            ...[...this.roster.entries()].filter(([id]) => id !== m.id).map(([id, inf]) => ({ id, info: inf }))
          ];
          from.send({ t: 'roster', list });
          from.send({ t: 'world', time: S.world.time, day: S.world.day, weather: G.weather.type });
          const bosses = G.enemies.filter((f: any) => f.boss).map((f: any) => ({
            id: f.id, hp: f.hp, max: f.max, phase: f.phase || 1, dead: f.dead
          }));
          from.send({ t: 'boss_sync', bosses });
          this.relay(m, m.id);
        }
        emitUI();
        break;
      }
      case 'roster': {
        if (Array.isArray(m.list)) {
          m.list.forEach((q: any) => {
            if (q.id && q.info) {
              const info = { ...q.info, name: sanitizeText(q.info.name, 24) };
              this.roster.set(q.id, info);
              ensureRemote(q.id, info);
            }
          });
        }
        emitUI();
        break;
      }
      case 'st': {
        if (!m.id || !Number.isFinite(m.x) || !Number.isFinite(m.y) || !Number.isFinite(m.z)) return;
        const r = G.remotes.get(m.id);
        if (r) {
          r.tp.set(m.x, m.y, m.z);
          if (r.pos.lengthSq() === 0) r.pos.copy(r.tp);
          r.ty = Number.isFinite(m.ry) ? m.ry : 0;
          r.speed = Number.isFinite(m.sp) ? m.sp : 0;
          r.act = sanitizeText(m.act, 20) || 'none';
          r.air = m.air;
          r.crouch = !!m.cr;
          r.inside = m.in || null;
        }
        if (this.isHost) this.relay(m, m.id);
        break;
      }
      case 'foe_hit': {
        applyRemoteFoeHit(m);
        if (this.isHost) this.relay(m, from.peer);
        break;
      }
      case 'boss_sync': {
        applyBossSync(m.bosses);
        break;
      }
      case 'dungeon': {
        if (m.name && m.label) {
          toast(`${sanitizeText(m.name, 24)} entered ${sanitizeText(m.label, 30)}.`, 'info');
        }
        if (this.isHost) this.relay(m, from.peer);
        break;
      }
      case 'chat': {
        const text = sanitizeText(m.text, 140);
        const name = sanitizeText(m.name, 24);
        if (text) {
          S.chatLog = [...S.chatLog.slice(-30), { name, text, t: Date.now() }];
          emitUI();
        }
        if (this.isHost) this.relay(m, from.peer);
        break;
      }
      case 'world': {
        if (!this.isHost) {
          if (Number.isFinite(m.time)) S.world.time = m.time;
          if (Number.isFinite(m.day)) S.world.day = m.day;
          if (typeof m.weather === 'string') G.weather.type = m.weather;
        }
        break;
      }
      case 'bye': {
        if (m.id) {
          removeRemote(m.id);
          this.roster.delete(m.id);
          emitUI();
        }
        if (this.isHost) this.relay(m, from.peer);
        break;
      }
    }
  }

  // ==========================================
  // DISPATCHING & TICK TRANSMISSION
  // ==========================================
  sendState(dt: number) {
    if (this.status !== 'hosting' && this.status !== 'joined' && this.status !== 'realm') return;
    this.lastSend += dt;
    if (this.lastSend < 0.1) return;
    this.lastSend = 0;
    const P = G.player;
    if (!P) return;

    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({
        t: 'move',
        seq: ++this.seq,
        x: P.pos.x,
        y: P.pos.y,
        z: P.pos.z,
        yaw: P.visYaw ?? P.yaw,
        sp: P.speedNow || 0,
        act: P.netAct || 'none',
        air: P.airState,
        cr: P.crouch
      }));
      return;
    }

    const m = {
      t: 'st',
      id: this.myId,
      x: P.pos.x,
      y: P.pos.y,
      z: P.pos.z,
      ry: P.visYaw ?? P.yaw,
      sp: P.speedNow || 0,
      act: P.netAct || 'none',
      air: P.airState,
      cr: P.crouch,
      in: P.insideKey || null
    };
    if (this.isHost) this.relay(m);
    else this.hostConn?.open && this.hostConn.send(m);
  }

  sendFoeHit(f: any, dmg: number, el: string, kb: number, crit: boolean, reactionText?: string, reactionColor?: string) {
    if (this.status !== 'hosting' && this.status !== 'joined' && this.status !== 'realm') return;

    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({
        t: 'attack',
        targetId: f.id
      }));
      return;
    }

    const m = {
      t: 'foe_hit',
      id: f.id,
      type: f.type,
      dmg,
      el,
      kb,
      crit,
      hp: f.hp,
      phase: f.phase || 1,
      reactionText: reactionText || '',
      reactionColor: reactionColor || '',
      x: f.pos?.x,
      z: f.pos?.z
    };
    if (this.isHost) this.relay(m);
    else this.hostConn?.open && this.hostConn.send(m);
  }

  sendDungeon(key: string, label: string) {
    if (this.status !== 'hosting' && this.status !== 'joined' && this.status !== 'realm') return;
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({
        t: key === 'world' ? 'dungeon_leave' : 'dungeon_enter',
        dungeonType: key
      }));
      return;
    }
    const m = { t: 'dungeon', id: this.myId, name: S.p?.name || 'Player', key, label };
    if (this.isHost) this.relay(m);
    else this.hostConn?.open && this.hostConn.send(m);
  }

  broadcastBossSync() {
    if (!this.isHost) return;
    const bosses = G.enemies.filter((f: any) => f.boss).map((f: any) => ({
      id: f.id, hp: f.hp, max: f.max, phase: f.phase || 1, dead: f.dead
    }));
    this.relay({ t: 'boss_sync', bosses });
  }

  sendChat(text: string, channel = 'world', target?: string) {
    text = sanitizeText(text, 140);
    if (!text) return;

    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({
        t: 'chat',
        channel,
        text,
        target
      }));
      return;
    }

    const m = { t: 'chat', name: S.p?.name || 'Hero', text };
    S.chatLog = [...S.chatLog.slice(-30), { name: S.p?.name || 'Hero', text, t: Date.now(), me: true }];
    emitUI();
    if (this.isHost) this.relay(m);
    else this.hostConn?.open && this.hostConn.send(m);
  }

  sendPartyInvite(targetName: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'party_invite', targetName }));
    }
  }

  sendPartyAccept(partyId: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'party_accept', partyId }));
    }
  }

  sendPartyLeave() {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'party_leave' }));
    }
  }

  // --- Friends System
  requestFriendsList() {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'friends_get' }));
    }
  }

  sendFriendReq(targetName: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'friend_req', targetName }));
    }
  }

  sendFriendRemove(friendId: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'friend_remove', friendId }));
    }
  }

  // --- Player Inspection
  requestInspect(target: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'inspect_req', target }));
    }
  }

  // --- LFG / Matchmaking
  sendLfgJoin(dungeon: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'lfg_join', dungeon }));
    }
  }

  sendLfgLeave() {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'lfg_leave' }));
    }
  }

  // --- Moderation & Reporting
  sendReport(targetName: string, reason: string, details?: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'report', targetName, reason, details }));
    }
  }

  // --- Marketplace / Auction House
  requestMarketBrowse(search?: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'market_browse', search }));
    }
  }

  requestMyMarketListings() {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'market_my_listings' }));
    }
  }

  sendMarketList(itemId: string, qty: number, price: number) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'market_list', itemId, qty, price }));
    }
  }

  sendMarketBuy(listingId: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'market_buy', listingId }));
    }
  }

  sendMarketCancel(listingId: string) {
    if (this.isRealm && this.realmWs?.readyState === 1) {
      this.realmWs.send(JSON.stringify({ t: 'market_cancel', listingId }));
    }
  }

  broadcastWorld() {
    if (this.isHost) this.relay({ t: 'world', time: S.world.time, day: S.world.day, weather: G.weather.type });
  }

  count() {
    if (this.isRealm) return this.onlineCount;
    return (this.isHost ? this.conns.size : this.roster.size) + (this.status === 'hosting' || this.status === 'joined' ? 1 : 0);
  }

  announce() {
    if (this.status === 'joined') this.hostConn?.send({ t: 'hello', id: this.myId, info: this.myInfo() });
  }
}

export const net = new Net();
G.net = net;
void appearanceFor;
export const playerCount = () => net.count();
