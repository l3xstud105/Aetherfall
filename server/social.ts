// AETHERFALL 1.0.0 — Social Systems, Chat, Parties, Guilds & Two-Phase Player Trading
import { ServerPlayer, WorldSimulation } from './world';
import { DB } from './db';

export interface Party {
  id: string;
  leaderId: string;
  members: string[]; // character IDs
}

export interface TradeSession {
  id: string;
  playerAId: string;
  playerBId: string;
  offerA: { items: Record<string, number>; gold: number; locked: boolean; confirmed: boolean };
  offerB: { items: Record<string, number>; gold: number; locked: boolean; confirmed: boolean };
  state: 'negotiating' | 'locked' | 'completed' | 'cancelled';
}

export interface LfgEntry {
  charId: string;
  charName: string;
  cls: string;
  level: number;
  dungeon: string;
  queuedAt: number;
}

const FILTERED_WORDS = ['hate', 'nazi', 'racist', 'slur'];

function sanitize(text: string, maxLen = 140): string {
  if (typeof text !== 'string') return '';
  let clean = text.replace(/[<>]/g, '').trim().slice(0, maxLen);
  FILTERED_WORDS.forEach((w) => {
    const reg = new RegExp('\\b' + w + '\\b', 'gi');
    clean = clean.replace(reg, '***');
  });
  return clean;
}

export class SocialManager {
  private world: WorldSimulation;
  private db: DB;

  parties = new Map<string, Party>(); // partyId -> Party
  playerParty = new Map<string, string>(); // charId -> partyId
  activeTrades = new Map<string, TradeSession>(); // tradeId -> TradeSession
  playerTrade = new Map<string, string>(); // charId -> tradeId

  lfgQueue = new Map<string, LfgEntry>(); // charId -> LfgEntry
  private chatRateLimit = new Map<string, number>(); // charId -> lastMsgTime

  constructor(world: WorldSimulation, db: DB) {
    this.world = world;
    this.db = db;
  }

  // --- Friends System
  sendFriendsList(player: ServerPlayer) {
    const rawFriends = this.db.getFriends(player.char.id);
    const friends = rawFriends.map((f: any) => {
      const isOnline = this.world.players.has(f.id);
      const onlineP = isOnline ? this.world.players.get(f.id) : null;
      return {
        id: f.id,
        name: f.name,
        cls: f.cls,
        level: f.level,
        online: isOnline,
        zone: onlineP?.zone || 'offline',
        hp: onlineP ? onlineP.char.hp : f.hp,
        maxHp: onlineP ? onlineP.char.max_hp : f.max_hp
      };
    });

    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ t: 'friends_list', friends }));
    }
  }

  handleFriendReq(sender: ServerPlayer, targetName: string) {
    targetName = targetName.trim();
    if (!targetName || targetName.toLowerCase() === sender.char.name.toLowerCase()) {
      sender.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: 'Invalid friend target.' }));
      return;
    }

    const targetChar = this.db.getCharacterByName(targetName);
    if (!targetChar) {
      sender.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: `Player "${targetName}" not found.` }));
      return;
    }

    this.db.addFriend(sender.char.id, targetChar.id);
    this.sendFriendsList(sender);

    const onlineTarget = this.world.players.get(targetChar.id);
    if (onlineTarget) {
      this.sendFriendsList(onlineTarget);
      onlineTarget.ws.send(JSON.stringify({
        t: 'chat_msg',
        channel: 'system',
        from: 'System',
        text: `You and ${sender.char.name} are now friends!`
      }));
    }

    sender.ws.send(JSON.stringify({
      t: 'chat_msg',
      channel: 'system',
      from: 'System',
      text: `Added ${targetChar.name} to your friends list.`
    }));
  }

  handleFriendRemove(player: ServerPlayer, friendId: string) {
    this.db.removeFriend(player.char.id, friendId);
    this.sendFriendsList(player);
    const onlineFriend = this.world.players.get(friendId);
    if (onlineFriend) this.sendFriendsList(onlineFriend);
  }

  // --- Player Inspection
  handleInspect(player: ServerPlayer, targetNameOrId: string) {
    const profile = this.db.getPublicProfile(targetNameOrId);
    if (!profile) {
      player.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: 'Could not inspect player profile.' }));
      return;
    }
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ t: 'inspect_data', profile }));
    }
  }

  // --- LFG / Matchmaking System
  handleLfgJoin(player: ServerPlayer, dungeon: string) {
    this.lfgQueue.set(player.char.id, {
      charId: player.char.id,
      charName: player.char.name,
      cls: player.char.cls,
      level: player.char.level,
      dungeon,
      queuedAt: Date.now()
    });

    player.ws.send(JSON.stringify({
      t: 'lfg_status',
      status: 'queued',
      dungeon,
      queueSize: [...this.lfgQueue.values()].filter((q) => q.dungeon === dungeon).length
    }));

    // Check for match: 2+ players queued for same dungeon
    const matched = [...this.lfgQueue.values()].filter((q) => q.dungeon === dungeon);
    if (matched.length >= 2) {
      const matchPair = matched.slice(0, 2);
      matchPair.forEach((m) => this.lfgQueue.delete(m.charId));

      const p1 = this.world.players.get(matchPair[0].charId);
      const p2 = this.world.players.get(matchPair[1].charId);

      if (p1 && p2) {
        // Form a party
        const party = this.createParty(p1);
        this.joinParty(p2, party.id);

        const matchMsg = {
          t: 'lfg_matched',
          dungeon,
          partyId: party.id,
          members: matchPair.map((m) => m.charName)
        };
        if (p1.ws.readyState === 1) p1.ws.send(JSON.stringify(matchMsg));
        if (p2.ws.readyState === 1) p2.ws.send(JSON.stringify(matchMsg));
      }
    }
  }

  handleLfgLeave(player: ServerPlayer) {
    this.lfgQueue.delete(player.char.id);
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ t: 'lfg_status', status: 'idle' }));
    }
  }

  // --- Moderation & Reporting
  handleReport(reporter: ServerPlayer, targetName: string, reason: string, details?: string) {
    const target = this.db.getCharacterByName(targetName.trim());
    if (!target) {
      reporter.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: `Player "${targetName}" not found.` }));
      return;
    }

    this.db.createReport(reporter.char.id, reporter.char.name, target.id, target.name, sanitize(reason, 100), sanitize(details || '', 300));
    reporter.ws.send(JSON.stringify({
      t: 'chat_msg',
      channel: 'system',
      from: 'System',
      text: `Report for player "${target.name}" has been logged for moderator review.`
    }));
  }

  // --- Chat Channels
  handleChat(player: ServerPlayer, channel: string, text: string, targetName?: string) {
    text = sanitize(text, 140);
    if (!text) return;

    const now = Date.now();
    const last = this.chatRateLimit.get(player.char.id) || 0;
    if (now - last < 600) {
      player.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: 'You are typing too fast.' }));
      return;
    }
    this.chatRateLimit.set(player.char.id, now);

    const senderName = player.char.name;
    const packet = {
      t: 'chat_msg',
      channel,
      from: senderName,
      fromId: player.char.id,
      text,
      timestamp: now
    };

    switch (channel) {
      case 'world': {
        this.world.broadcastGlobal(packet);
        break;
      }
      case 'local': {
        this.world.broadcastNearby(player.pos.x, player.pos.z, player.zone, packet);
        break;
      }
      case 'emote': {
        const emotePkt = { ...packet, text: text.startsWith(senderName) ? text : `${senderName} ${text}` };
        this.world.broadcastNearby(player.pos.x, player.pos.z, player.zone, emotePkt);
        break;
      }
      case 'party': {
        const partyId = this.playerParty.get(player.char.id);
        if (partyId && this.parties.has(partyId)) {
          const party = this.parties.get(partyId)!;
          party.members.forEach((mid) => {
            const p = this.world.players.get(mid);
            if (p && p.ws.readyState === 1) p.ws.send(JSON.stringify(packet));
          });
        } else {
          player.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: 'You are not in a party.' }));
        }
        break;
      }
      case 'guild': {
        if (player.char.guild_id) {
          this.world.players.forEach((p) => {
            if (p.char.guild_id === player.char.guild_id && p.ws.readyState === 1) {
              p.ws.send(JSON.stringify(packet));
            }
          });
        } else {
          player.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: 'You are not in a guild.' }));
        }
        break;
      }
      case 'whisper': {
        if (!targetName) return;
        const target = [...this.world.players.values()].find((p) => p.char.name.toLowerCase() === targetName.toLowerCase());
        if (target) {
          target.ws.send(JSON.stringify({ ...packet, channel: 'whisper' }));
          player.ws.send(JSON.stringify({ ...packet, channel: 'whisper', to: target.char.name }));
        } else {
          player.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: `Player "${targetName}" is not online.` }));
        }
        break;
      }
    }
  }

  // --- Parties
  createParty(leader: ServerPlayer): Party {
    this.leaveParty(leader);
    const id = 'party_' + Math.random().toString(36).slice(2, 8);
    const party: Party = { id, leaderId: leader.char.id, members: [leader.char.id] };
    this.parties.set(id, party);
    this.playerParty.set(leader.char.id, id);
    this.broadcastPartyUpdate(party);
    return party;
  }

  inviteToParty(leader: ServerPlayer, targetName: string) {
    let partyId = this.playerParty.get(leader.char.id);
    if (!partyId) {
      const p = this.createParty(leader);
      partyId = p.id;
    }
    const party = this.parties.get(partyId)!;
    if (party.leaderId !== leader.char.id) {
      leader.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: 'Only the party leader can invite.' }));
      return;
    }
    const target = [...this.world.players.values()].find((p) => p.char.name.toLowerCase() === targetName.toLowerCase());
    if (!target) {
      leader.ws.send(JSON.stringify({ t: 'chat_msg', channel: 'system', from: 'System', text: `Player "${targetName}" not found.` }));
      return;
    }
    target.ws.send(JSON.stringify({
      t: 'party_invitation',
      partyId,
      fromName: leader.char.name
    }));
  }

  joinParty(player: ServerPlayer, partyId: string) {
    const party = this.parties.get(partyId);
    if (!party || party.members.length >= 4) return;
    this.leaveParty(player);
    party.members.push(player.char.id);
    this.playerParty.set(player.char.id, partyId);
    this.broadcastPartyUpdate(party);
  }

  leaveParty(player: ServerPlayer) {
    const partyId = this.playerParty.get(player.char.id);
    if (!partyId) return;
    this.playerParty.delete(player.char.id);
    const party = this.parties.get(partyId);
    if (!party) return;

    party.members = party.members.filter((id) => id !== player.char.id);
    if (party.members.length === 0) {
      this.parties.delete(partyId);
    } else {
      if (party.leaderId === player.char.id) {
        party.leaderId = party.members[0]; // Transfer leadership
      }
      this.broadcastPartyUpdate(party);
    }
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ t: 'party_left' }));
    }
  }

  private broadcastPartyUpdate(party: Party) {
    const memberData = party.members.map((mid) => {
      const p = this.world.players.get(mid);
      return {
        id: mid,
        name: p?.char.name || 'Member',
        level: p?.char.level || 1,
        cls: p?.char.cls || 'warrior',
        hp: p?.char.hp || 100,
        zone: p?.zone || 'world'
      };
    });

    const packet = {
      t: 'party_update',
      partyId: party.id,
      leaderId: party.leaderId,
      members: memberData
    };

    party.members.forEach((mid) => {
      const p = this.world.players.get(mid);
      if (p && p.ws.readyState === 1) p.ws.send(JSON.stringify(packet));
    });
  }

  // --- Two-Phase Secure Player-to-Player Trading
  startTrade(playerA: ServerPlayer, playerB: ServerPlayer): TradeSession {
    this.cancelTrade(playerA);
    this.cancelTrade(playerB);

    const id = 'trade_' + Math.random().toString(36).slice(2, 8);
    const session: TradeSession = {
      id,
      playerAId: playerA.char.id,
      playerBId: playerB.char.id,
      offerA: { items: {}, gold: 0, locked: false, confirmed: false },
      offerB: { items: {}, gold: 0, locked: false, confirmed: false },
      state: 'negotiating'
    };

    this.activeTrades.set(id, session);
    this.playerTrade.set(playerA.char.id, id);
    this.playerTrade.set(playerB.char.id, id);

    this.syncTrade(session);
    return session;
  }

  updateOffer(player: ServerPlayer, items: Record<string, number>, gold: number) {
    const tradeId = this.playerTrade.get(player.char.id);
    if (!tradeId) return;
    const session = this.activeTrades.get(tradeId);
    if (!session || session.state === 'locked' || session.state === 'completed') return;

    const isA = session.playerAId === player.char.id;
    const offer = isA ? session.offerA : session.offerB;

    // Validate player actually has these items and gold
    let validGold = Math.min(Math.max(0, gold || 0), player.char.gold);
    const validItems: Record<string, number> = {};
    for (const item in items) {
      const have = player.char.inventory[item] || 0;
      const count = Math.min(Math.max(0, items[item]), have);
      if (count > 0) validItems[item] = count;
    }

    offer.items = validItems;
    offer.gold = validGold;
    offer.locked = false;
    offer.confirmed = false;

    // Reset partner's confirmation on offer change to prevent bait-and-switch
    if (isA) session.offerB.confirmed = false;
    else session.offerA.confirmed = false;

    this.syncTrade(session);
  }

  lockOffer(player: ServerPlayer) {
    const tradeId = this.playerTrade.get(player.char.id);
    if (!tradeId) return;
    const session = this.activeTrades.get(tradeId);
    if (!session || session.state === 'completed') return;

    if (session.playerAId === player.char.id) session.offerA.locked = true;
    else session.offerB.locked = true;

    if (session.offerA.locked && session.offerB.locked) {
      session.state = 'locked';
    }

    this.syncTrade(session);
  }

  confirmTrade(player: ServerPlayer) {
    const tradeId = this.playerTrade.get(player.char.id);
    if (!tradeId) return;
    const session = this.activeTrades.get(tradeId);
    if (!session || session.state !== 'locked') return;

    if (session.playerAId === player.char.id) session.offerA.confirmed = true;
    else session.offerB.confirmed = true;

    if (session.offerA.confirmed && session.offerB.confirmed) {
      // Execute Atomic Trade Transaction
      this.executeTradeTransaction(session);
    } else {
      this.syncTrade(session);
    }
  }

  private executeTradeTransaction(session: TradeSession) {
    const playerA = this.world.players.get(session.playerAId);
    const playerB = this.world.players.get(session.playerBId);

    if (!playerA || !playerB) {
      this.abortTrade(session, 'One of the players disconnected.');
      return;
    }

    const charA = playerA.char;
    const charB = playerB.char;

    // Final inventory & gold verification
    if (charA.gold < session.offerA.gold || charB.gold < session.offerB.gold) {
      this.abortTrade(session, 'Insufficient gold.');
      return;
    }

    for (const item in session.offerA.items) {
      if ((charA.inventory[item] || 0) < session.offerA.items[item]) {
        this.abortTrade(session, 'Item verification failed.');
        return;
      }
    }
    for (const item in session.offerB.items) {
      if ((charB.inventory[item] || 0) < session.offerB.items[item]) {
        this.abortTrade(session, 'Item verification failed.');
        return;
      }
    }

    // Atomic Transfer
    charA.gold -= session.offerA.gold;
    charA.gold += session.offerB.gold;
    charB.gold -= session.offerB.gold;
    charB.gold += session.offerA.gold;

    for (const item in session.offerA.items) {
      const count = session.offerA.items[item];
      charA.inventory[item] -= count;
      if (charA.inventory[item] <= 0) delete charA.inventory[item];
      charB.inventory[item] = (charB.inventory[item] || 0) + count;
    }

    for (const item in session.offerB.items) {
      const count = session.offerB.items[item];
      charB.inventory[item] -= count;
      if (charB.inventory[item] <= 0) delete charB.inventory[item];
      charA.inventory[item] = (charA.inventory[item] || 0) + count;
    }

    // Persist to Database
    this.db.saveCharacter(charA);
    this.db.saveCharacter(charB);
    this.db.logTrade(charA.id, charB.id, session.offerA.items, session.offerB.items, session.offerA.gold, session.offerB.gold);

    // Complete session
    session.state = 'completed';
    const completePacket = { t: 'trade_complete' };
    if (playerA.ws.readyState === 1) playerA.ws.send(JSON.stringify(completePacket));
    if (playerB.ws.readyState === 1) playerB.ws.send(JSON.stringify(completePacket));

    // Send inventory updates
    if (playerA.ws.readyState === 1) playerA.ws.send(JSON.stringify({ t: 'inv_update', gold: charA.gold, inventory: charA.inventory }));
    if (playerB.ws.readyState === 1) playerB.ws.send(JSON.stringify({ t: 'inv_update', gold: charB.gold, inventory: charB.inventory }));

    this.playerTrade.delete(charA.id);
    this.playerTrade.delete(charB.id);
    this.activeTrades.delete(session.id);
  }

  cancelTrade(player: ServerPlayer) {
    const tradeId = this.playerTrade.get(player.char.id);
    if (!tradeId) return;
    const session = this.activeTrades.get(tradeId);
    if (session) this.abortTrade(session, 'Trade was cancelled.');
  }

  private abortTrade(session: TradeSession, reason: string) {
    session.state = 'cancelled';
    const packet = { t: 'trade_cancelled', reason };
    const pA = this.world.players.get(session.playerAId);
    const pB = this.world.players.get(session.playerBId);
    if (pA && pA.ws.readyState === 1) pA.ws.send(JSON.stringify(packet));
    if (pB && pB.ws.readyState === 1) pB.ws.send(JSON.stringify(packet));
    this.playerTrade.delete(session.playerAId);
    this.playerTrade.delete(session.playerBId);
    this.activeTrades.delete(session.id);
  }

  private syncTrade(session: TradeSession) {
    const pA = this.world.players.get(session.playerAId);
    const pB = this.world.players.get(session.playerBId);
    if (pA && pA.ws.readyState === 1) {
      pA.ws.send(JSON.stringify({
        t: 'trade_update',
        state: session.state,
        partnerName: pB?.char.name || 'Partner',
        myOffer: session.offerA,
        theirOffer: session.offerB
      }));
    }
    if (pB && pB.ws.readyState === 1) {
      pB.ws.send(JSON.stringify({
        t: 'trade_update',
        state: session.state,
        partnerName: pA?.char.name || 'Partner',
        myOffer: session.offerB,
        theirOffer: session.offerA
      }));
    }
  }
}
