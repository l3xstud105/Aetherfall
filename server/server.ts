// AETHERFALL 1.0.0 — Authoritative Global Realm WebSocket Game Server
// One persistent world. Server-authoritative physics, combat, persistence, social, and trading.
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { DB, PersistentCharacter } from './db';
import { WorldSimulation, ServerPlayer } from './world';
import { AuthoritativeCombat } from './combat';
import { SocialManager } from './social';
import { DungeonManager } from './instances';
import { MarketplaceManager } from './marketplace';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.exe': 'application/octet-stream',
  '.zip': 'application/zip',
  '.bat': 'text/plain',
  '.txt': 'text/plain; charset=utf-8',
};

export class AetherfallServer {
  port: number;
  db: DB;
  world: WorldSimulation;
  combat: AuthoritativeCombat;
  social: SocialManager;
  dungeons: DungeonManager;
  market: MarketplaceManager;
  wss: WebSocketServer | null = null;
  server: http.Server | null = null;

  private tickInterval: NodeJS.Timeout | null = null;
  private netSyncInterval: NodeJS.Timeout | null = null;
  private dbAutosaveInterval: NodeJS.Timeout | null = null;

  constructor(port = 7777, dbPath?: string) {
    this.port = port;
    this.db = new DB(dbPath);
    this.world = new WorldSimulation();
    this.combat = new AuthoritativeCombat(this.world, this.db);
    this.social = new SocialManager(this.world, this.db);
    this.dungeons = new DungeonManager(this.world);
    this.market = new MarketplaceManager(this.db, this.world);
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        // Set CORS and preview headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = decodeURIComponent(parsedUrl.pathname);

        if (pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'online',
            realm: 'Aetherfall Global',
            version: '1.0.0',
            onlinePlayers: this.world.players.size,
            uptime: process.uptime(),
            tick: this.world.tick
          }));
          return;
        }

        // Serve static assets from dist/
        const distDir = path.resolve(process.cwd(), 'dist');
        const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
        const filePath = path.join(distDir, relativePath);

        // Security check: ensure filePath is inside distDir
        if (!filePath.startsWith(distDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mime = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        // SPA fallback: return index.html if file not found
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Aetherfall Realm Server: Not Found');
      });

      this.wss = new WebSocketServer({ server: this.server });
      this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));

      // 20Hz World Simulation Loop (50ms)
      this.tickInterval = setInterval(() => {
        try {
          this.world.update(0.05);
        } catch (e) {
          console.error('[Server] Error in world update tick:', e);
        }
      }, 50);

      // 10Hz Network Snapshot Broadcast (100ms)
      this.netSyncInterval = setInterval(() => {
        try {
          this.broadcastSnapshots();
        } catch (e) {
          console.error('[Server] Error in network sync:', e);
        }
      }, 100);

      // 60s Periodic Database Autosave
      this.dbAutosaveInterval = setInterval(() => {
        try {
          this.world.players.forEach((p) => this.db.saveCharacter(p.char));
        } catch (e) {
          console.error('[Server] Error in autosave:', e);
        }
      }, 60000);

      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`[AETHERFALL 1.0.0] Global Realm Server listening on 0.0.0.0:${this.port}`);
        resolve();
      });
    });
  }

  private handleConnection(ws: WebSocket) {
    let sessionPlayer: ServerPlayer | null = null;
    let currentAccountId: string | null = null;

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!msg || !msg.t) return;

        switch (msg.t) {
          // --- Authentication & Character Selection
          case 'auth': {
            const username = String(msg.username || 'Hero').trim();
            const password = msg.password ? String(msg.password) : undefined;
            try {
              const acc = this.db.authenticate(username, password);
              currentAccountId = acc.id;
              let chars = this.db.getCharactersByAccount(acc.id);
              if (chars.length === 0) {
                const defaultChar = this.db.createCharacter(acc.id, username, 'warrior', {});
                chars = [defaultChar];
              }
              ws.send(JSON.stringify({
                t: 'auth_ok',
                accountId: acc.id,
                username: acc.username,
                sessionToken: acc.session_token,
                characters: chars
              }));
            } catch (err: any) {
              ws.send(JSON.stringify({ t: 'auth_err', error: err.message }));
            }
            break;
          }

          case 'char_create': {
            if (!currentAccountId) {
              ws.send(JSON.stringify({ t: 'error', error: 'Not authenticated' }));
              return;
            }
            try {
              const ch = this.db.createCharacter(currentAccountId, msg.name, msg.cls, msg.look);
              ws.send(JSON.stringify({ t: 'char_created', character: ch }));
            } catch (err: any) {
              ws.send(JSON.stringify({ t: 'char_create_err', error: err.message }));
            }
            break;
          }

          case 'char_select': {
            if (!currentAccountId) return;
            const charId = String(msg.characterId);
            const ch = this.db.getCharacterById(charId);
            if (!ch || ch.account_id !== currentAccountId) {
              ws.send(JSON.stringify({ t: 'error', error: 'Invalid character' }));
              return;
            }

            // Remove existing session if reconnecting
            if (this.world.players.has(ch.id)) {
              const old = this.world.players.get(ch.id)!;
              old.ws.close();
              this.world.players.delete(ch.id);
            }

            const p: ServerPlayer = {
              ws,
              accountId: currentAccountId,
              char: ch,
              pos: { x: ch.pos_x, y: ch.pos_y, z: ch.pos_z },
              yaw: ch.yaw,
              speed: 0,
              act: 'none',
              air: 'ground',
              crouch: false,
              zone: ch.zone || 'world',
              insideKey: null,
              cellKey: '',
              lastPacketTime: Date.now(),
              seq: 0,
              partyId: null
            };

            this.world.players.set(ch.id, p);
            this.world.updatePlayerCell(p);
            sessionPlayer = p;

            ws.send(JSON.stringify({
              t: 'char_ok',
              character: ch,
              worldTime: this.world.time,
              day: this.world.day,
              weather: this.world.weather,
              onlineCount: this.world.players.size
            }));

            // Notify nearby players
            this.world.broadcastNearby(p.pos.x, p.pos.z, p.zone, {
              t: 'player_spawn',
              char: {
                id: ch.id,
                name: ch.name,
                cls: ch.cls,
                level: ch.level,
                look: ch.look,
                equip: ch.equip
              },
              pos: p.pos,
              yaw: p.yaw
            }, ch.id);

            break;
          }

          // --- Movement & Physics (Server-Validated)
          case 'ping': {
            ws.send(JSON.stringify({ t: 'pong', t0: msg.t0 }));
            break;
          }

          case 'move': {
            if (!sessionPlayer) return;
            const now = Date.now();
            const dt = Math.max(0.01, (now - sessionPlayer.lastPacketTime) / 1000);
            sessionPlayer.lastPacketTime = now;

            const targetX = Number(msg.x);
            const targetY = Number(msg.y);
            const targetZ = Number(msg.z);

            if (Number.isFinite(targetX) && Number.isFinite(targetY) && Number.isFinite(targetZ)) {
              // Speed validation (max player speed is ~9 m/s with sprint, allow tolerance)
              const maxAllowedDist = 18.0 * Math.max(0.1, dt) + 6.0;
              const moveDist = Math.hypot(targetX - sessionPlayer.pos.x, targetZ - sessionPlayer.pos.z);

              if (moveDist <= maxAllowedDist) {
                sessionPlayer.pos.x = targetX;
                sessionPlayer.pos.y = targetY;
                sessionPlayer.pos.z = targetZ;
              }
            }

            if (Number.isFinite(msg.yaw)) sessionPlayer.yaw = msg.yaw;
            if (Number.isFinite(msg.sp)) sessionPlayer.speed = msg.sp;
            if (typeof msg.act === 'string') sessionPlayer.act = msg.act.slice(0, 20);
            if (typeof msg.air === 'string') sessionPlayer.air = msg.air;
            sessionPlayer.crouch = !!msg.cr;
            sessionPlayer.seq = Number(msg.seq || 0);

            this.world.updatePlayerCell(sessionPlayer);
            break;
          }

          // --- Combat Actions
          case 'attack': {
            if (!sessionPlayer) return;
            const targetId = String(msg.targetId);
            this.combat.processPlayerAttack(sessionPlayer, targetId, 'attack');
            break;
          }

          case 'ability': {
            if (!sessionPlayer) return;
            const abilityId = String(msg.abilityId);
            const targetId = String(msg.targetId || '');
            this.combat.processPlayerAttack(sessionPlayer, targetId, 'ability', abilityId);
            break;
          }

          // --- Social & Chat
          case 'chat': {
            if (!sessionPlayer) return;
            this.social.handleChat(sessionPlayer, msg.channel || 'world', String(msg.text || ''), msg.target);
            break;
          }

          case 'party_invite': {
            if (!sessionPlayer) return;
            this.social.inviteToParty(sessionPlayer, String(msg.targetName));
            break;
          }

          case 'party_accept': {
            if (!sessionPlayer) return;
            this.social.joinParty(sessionPlayer, String(msg.partyId));
            break;
          }

          case 'party_leave': {
            if (!sessionPlayer) return;
            this.social.leaveParty(sessionPlayer);
            break;
          }

          // --- Guilds
          case 'guild_create': {
            if (!sessionPlayer) return;
            try {
              const guild = this.db.createGuild(String(msg.name), String(msg.tag), sessionPlayer.char.id);
              sessionPlayer.char.guild_id = guild.id;
              ws.send(JSON.stringify({ t: 'guild_created', guild }));
            } catch (err: any) {
              ws.send(JSON.stringify({ t: 'error', error: err.message }));
            }
            break;
          }

          case 'guild_invite': {
            if (!sessionPlayer || !sessionPlayer.char.guild_id) return;
            const target = [...this.world.players.values()].find((p) => p.char.name.toLowerCase() === String(msg.targetName).toLowerCase());
            if (target) {
              const guild = this.db.getGuild(sessionPlayer.char.guild_id);
              target.ws.send(JSON.stringify({
                t: 'guild_invitation',
                guildId: sessionPlayer.char.guild_id,
                guildName: guild?.name || 'Guild',
                fromName: sessionPlayer.char.name
              }));
            }
            break;
          }

          case 'guild_accept': {
            if (!sessionPlayer) return;
            const guildId = String(msg.guildId);
            this.db.addGuildMember(guildId, sessionPlayer.char.id, 'member');
            sessionPlayer.char.guild_id = guildId;
            const guild = this.db.getGuild(guildId);
            ws.send(JSON.stringify({ t: 'guild_joined', guild }));
            break;
          }

          case 'guild_deposit': {
            if (!sessionPlayer || !sessionPlayer.char.guild_id) return;
            const amt = Math.max(0, Math.floor(Number(msg.amount) || 0));
            if (this.db.depositGuildGold(sessionPlayer.char.guild_id, sessionPlayer.char.id, amt)) {
              const guild = this.db.getGuild(sessionPlayer.char.guild_id);
              ws.send(JSON.stringify({ t: 'guild_bank_updated', bank_gold: guild?.bank_gold || 0 }));
            }
            break;
          }

          case 'guild_withdraw': {
            if (!sessionPlayer || !sessionPlayer.char.guild_id) return;
            const amt = Math.max(0, Math.floor(Number(msg.amount) || 0));
            if (this.db.withdrawGuildGold(sessionPlayer.char.guild_id, sessionPlayer.char.id, amt)) {
              const guild = this.db.getGuild(sessionPlayer.char.guild_id);
              ws.send(JSON.stringify({ t: 'guild_bank_updated', bank_gold: guild?.bank_gold || 0 }));
            }
            break;
          }

          // --- Player Trading
          case 'trade_req': {
            if (!sessionPlayer) return;
            let target = msg.targetId ? this.world.players.get(String(msg.targetId)) : null;
            if (!target && msg.targetName) {
              target = [...this.world.players.values()].find((p) => p.char.name.toLowerCase() === String(msg.targetName).toLowerCase()) || null;
            }
            if (target) {
              this.social.startTrade(sessionPlayer, target);
            }
            break;
          }

          case 'trade_offer': {
            if (!sessionPlayer) return;
            this.social.updateOffer(sessionPlayer, msg.items || {}, Number(msg.gold || 0));
            break;
          }

          case 'trade_lock': {
            if (!sessionPlayer) return;
            this.social.lockOffer(sessionPlayer);
            break;
          }

          case 'trade_confirm': {
            if (!sessionPlayer) return;
            this.social.confirmTrade(sessionPlayer);
            break;
          }

          case 'trade_cancel': {
            if (!sessionPlayer) return;
            this.social.cancelTrade(sessionPlayer);
            break;
          }

          // --- Dungeon & Instance Transitions
          case 'dungeon_enter': {
            if (!sessionPlayer) return;
            const type = String(msg.dungeonType);
            const partyId = this.social.playerParty.get(sessionPlayer.char.id) || null;
            const inst = this.dungeons.getOrCreateInstance(type, partyId, sessionPlayer.char.id);

            sessionPlayer.zone = inst.id;
            sessionPlayer.pos.x = 0;
            sessionPlayer.pos.y = 0;
            sessionPlayer.pos.z = 0;
            this.world.updatePlayerCell(sessionPlayer);

            ws.send(JSON.stringify({
              t: 'dungeon_loaded',
              instanceId: inst.id,
              dungeonType: inst.type,
              dungeonName: inst.name,
              foes: [...inst.foes.values()].map((f) => ({
                id: f.id,
                name: f.name,
                type: f.type,
                hp: f.hp,
                max: f.max,
                pos: f.pos,
                boss: f.boss
              }))
            }));
            break;
          }

          case 'dungeon_leave': {
            if (!sessionPlayer) return;
            sessionPlayer.zone = 'world';
            sessionPlayer.pos.x = -140;
            sessionPlayer.pos.y = 0;
            sessionPlayer.pos.z = 100;
            this.world.updatePlayerCell(sessionPlayer);

            ws.send(JSON.stringify({
              t: 'dungeon_exited',
              zone: 'world',
              pos: sessionPlayer.pos
            }));
            break;
          }

          // --- Friends & Inspection
          case 'friends_get': {
            if (!sessionPlayer) return;
            this.social.sendFriendsList(sessionPlayer);
            break;
          }

          case 'friend_req': {
            if (!sessionPlayer) return;
            this.social.handleFriendReq(sessionPlayer, String(msg.targetName || ''));
            break;
          }

          case 'friend_remove': {
            if (!sessionPlayer) return;
            this.social.handleFriendRemove(sessionPlayer, String(msg.friendId || ''));
            break;
          }

          case 'inspect_req': {
            if (!sessionPlayer) return;
            this.social.handleInspect(sessionPlayer, String(msg.target || ''));
            break;
          }

          // --- LFG / Dungeon Matchmaking
          case 'lfg_join': {
            if (!sessionPlayer) return;
            this.social.handleLfgJoin(sessionPlayer, String(msg.dungeon || 'crypt'));
            break;
          }

          case 'lfg_leave': {
            if (!sessionPlayer) return;
            this.social.handleLfgLeave(sessionPlayer);
            break;
          }

          // --- Moderation & Reporting
          case 'report': {
            if (!sessionPlayer) return;
            this.social.handleReport(sessionPlayer, String(msg.targetName || ''), String(msg.reason || ''), msg.details);
            break;
          }

          // --- Marketplace / Auction House
          case 'market_browse': {
            if (!sessionPlayer) return;
            this.market.handleBrowse(sessionPlayer, msg.search);
            break;
          }

          case 'market_my_listings': {
            if (!sessionPlayer) return;
            this.market.handleMyListings(sessionPlayer);
            break;
          }

          case 'market_list': {
            if (!sessionPlayer) return;
            this.market.handleCreateListing(sessionPlayer, String(msg.itemId), Number(msg.qty), Number(msg.price));
            break;
          }

          case 'market_buy': {
            if (!sessionPlayer) return;
            this.market.handleBuyListing(sessionPlayer, String(msg.listingId));
            break;
          }

          case 'market_cancel': {
            if (!sessionPlayer) return;
            this.market.handleCancelListing(sessionPlayer, String(msg.listingId));
            break;
          }

          // --- World Events & Rebuilding
          case 'world_event_trigger': {
            const ev = this.world.triggerEvent(msg.eventType || 'bandit_siege');
            ws.send(JSON.stringify({ t: 'world_event_start', event: this.world.getEventSummary(ev) }));
            break;
          }

          case 'settlement_contribute': {
            if (!sessionPlayer) return;
            this.world.contributeToSettlement(String(msg.settlement), msg.material, Number(msg.qty || 1));
            break;
          }

          // --- Persistent Housing
          case 'house_get': {
            const house = this.db.getHouse(String(msg.houseId));
            ws.send(JSON.stringify({ t: 'house_data', house }));
            break;
          }

          case 'house_save': {
            if (!sessionPlayer) return;
            const saved = this.db.saveHouse(
              String(msg.houseId),
              sessionPlayer.char.id,
              sessionPlayer.char.name,
              Number(msg.level || 1),
              msg.furniture || [],
              msg.storage || {}
            );
            ws.send(JSON.stringify({ t: 'house_saved', house: saved }));
            break;
          }
        }
      } catch (err) {
        console.error('[Server] Packet parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (sessionPlayer) {
        const p = sessionPlayer;
        p.char.pos_x = p.pos.x;
        p.char.pos_y = p.pos.y;
        p.char.pos_z = p.pos.z;
        p.char.yaw = p.yaw;
        p.char.zone = p.zone;
        this.db.saveCharacter(p.char);

        this.social.leaveParty(p);
        this.social.cancelTrade(p);
        this.world.removePlayerFromGrid(p);
        this.world.players.delete(p.char.id);

        this.world.broadcastNearby(p.pos.x, p.pos.z, p.zone, {
          t: 'player_despawn',
          charId: p.char.id
        });
      }
    });
  }

  // --- Snapshot Broadcast (Interest Management: only nearby players/foes sent)
  private broadcastSnapshots() {
    this.world.players.forEach((p) => {
      if (p.ws.readyState !== 1) return;

      const nearbyPlayers = this.world.getNearbyPlayers(p.pos.x, p.pos.z, p.zone);
      const playerList = nearbyPlayers.map((other) => ({
        id: other.char.id,
        name: other.char.name,
        cls: other.char.cls,
        level: other.char.level,
        x: other.pos.x,
        y: other.pos.y,
        z: other.pos.z,
        yaw: other.yaw,
        sp: other.speed,
        act: other.act,
        air: other.air,
        cr: other.crouch,
        hp: other.char.hp
      }));

      // Nearby foes
      const nearbyFoes: any[] = [];
      this.world.foes.forEach((f) => {
        if (f.zone === p.zone && !f.dead) {
          const d = Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z);
          if (d < 75) {
            nearbyFoes.push({
              id: f.id,
              type: f.type,
              name: f.name,
              x: f.pos.x,
              y: f.pos.y,
              z: f.pos.z,
              yaw: f.yaw,
              hp: f.hp,
              max: f.max,
              phase: f.phase,
              boss: f.boss,
              staggered: f.staggered > 0
            });
          }
        }
      });

      const snapshot = {
        t: 'snapshot',
        tick: this.world.tick,
        time: this.world.time,
        day: this.world.day,
        weather: this.world.weather,
        players: playerList,
        foes: nearbyFoes
      };

      p.ws.send(JSON.stringify(snapshot));
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.tickInterval) clearInterval(this.tickInterval);
      if (this.netSyncInterval) clearInterval(this.netSyncInterval);
      if (this.dbAutosaveInterval) clearInterval(this.dbAutosaveInterval);

      // Save all players before exit
      this.world.players.forEach((p) => {
        p.char.pos_x = p.pos.x;
        p.char.pos_y = p.pos.y;
        p.char.pos_z = p.pos.z;
        this.db.saveCharacter(p.char);
        try { p.ws.close(); } catch {}
      });

      if (this.wss) this.wss.close();
      if (this.server) {
        this.server.close(() => {
          this.db.close();
          resolve();
        });
      } else {
        this.db.close();
        resolve();
      }
    });
  }
}

// Standalone runner if executed directly
if ((process.argv[1]?.endsWith('server.mjs') || process.argv[1]?.endsWith('server.ts')) && !process.env.TEST_MODE && !process.argv[1]?.includes('test')) {
  const port = Number(process.env.PORT) || 7777;
  const server = new AetherfallServer(port);
  server.start().catch(console.error);

  process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}
