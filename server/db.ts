// AETHERFALL 1.0.0 — Authoritative Database & Persistence Layer
// SQLite with Write-Ahead Logging (WAL) for persistent accounts, characters, guilds, and trades.
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface Account {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
  last_login: number;
}

export interface PersistentCharacter {
  id: string;
  account_id: string;
  name: string;
  cls: string;
  level: number;
  xp: number;
  hp: number;
  mana: number;
  sta: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  yaw: number;
  zone: string;
  gold: number;
  look: any;
  attrs: any;
  skills: any;
  hotbar: (string | null)[];
  equip: Record<string, string>;
  inventory: Record<string, number>;
  quests: Record<string, any>;
  reputation: Record<string, number>;
  guild_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  leader_id: string;
  motd: string;
  level: number;
  created_at: number;
}

export interface GuildMember {
  guild_id: string;
  character_id: string;
  character_name?: string;
  rank: 'leader' | 'officer' | 'veteran' | 'member' | 'initiate';
  joined_at: number;
}

export interface MarketListing {
  id: string;
  seller_id: string;
  seller_name: string;
  item_id: string;
  qty: number;
  price: number;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  buyer_id?: string;
  buyer_name?: string;
  created_at: number;
  sold_at?: number;
}

export interface PersistentHouse {
  house_id: string;
  owner_id: string;
  owner_name: string;
  level: number;
  furniture: any[];
  storage: Record<string, number>;
  updated_at: number;
}

export interface PublicProfile {
  id: string;
  name: string;
  cls: string;
  level: number;
  hp: number;
  max_hp: number;
  mana: number;
  max_mana: number;
  stamina: number;
  max_stamina: number;
  gold: number;
  look: any;
  equip: any;
  guild_id: string | null;
  guild_name?: string;
  guild_tag?: string;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_aetherfall_salt').digest('hex');
}

export class DB {
  private db: DatabaseSync;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.resolve(process.cwd(), 'aetherfall_realm.db');
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(finalPath);
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
    } catch {
      // Memory or fallback mode
    }
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE COLLATE NOCASE,
        password_hash TEXT,
        created_at INTEGER,
        last_login INTEGER
      );

      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT UNIQUE COLLATE NOCASE,
        cls TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        hp REAL DEFAULT 100,
        mana REAL DEFAULT 50,
        sta REAL DEFAULT 100,
        pos_x REAL DEFAULT -140,
        pos_y REAL DEFAULT 0,
        pos_z REAL DEFAULT 100,
        yaw REAL DEFAULT 0,
        zone TEXT DEFAULT 'world',
        gold INTEGER DEFAULT 120,
        look TEXT,
        attrs TEXT,
        skills TEXT,
        hotbar TEXT,
        equip TEXT,
        inventory TEXT,
        quests TEXT,
        reputation TEXT,
        guild_id TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS guilds (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE COLLATE NOCASE,
        tag TEXT UNIQUE COLLATE NOCASE,
        leader_id TEXT,
        motd TEXT DEFAULT 'Honor the Broken Skies.',
        level INTEGER DEFAULT 1,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS guild_members (
        guild_id TEXT,
        character_id TEXT PRIMARY KEY,
        rank TEXT DEFAULT 'member',
        joined_at INTEGER,
        FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS friends (
        character_id TEXT,
        friend_character_id TEXT,
        status TEXT DEFAULT 'accepted',
        created_at INTEGER,
        PRIMARY KEY (character_id, friend_character_id)
      );

      CREATE TABLE IF NOT EXISTS trade_logs (
        id TEXT PRIMARY KEY,
        from_char TEXT,
        to_char TEXT,
        from_items TEXT,
        to_items TEXT,
        from_gold INTEGER,
        to_gold INTEGER,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        seller_name TEXT NOT NULL,
        item_id TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        price INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        buyer_id TEXT,
        buyer_name TEXT,
        created_at INTEGER NOT NULL,
        sold_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS houses (
        house_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        furniture_json TEXT NOT NULL DEFAULT '[]',
        storage_json TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS world_state (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        reporter_name TEXT NOT NULL,
        reported_id TEXT NOT NULL,
        reported_name TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_char_account ON characters(account_id);
      CREATE INDEX IF NOT EXISTS idx_char_name ON characters(name);
      CREATE INDEX IF NOT EXISTS idx_guild_name ON guilds(name);
      CREATE INDEX IF NOT EXISTS idx_market_status ON marketplace_listings(status);
      CREATE INDEX IF NOT EXISTS idx_market_seller ON marketplace_listings(seller_id);
    `);
  }

  // --- Account methods
  createAccount(username: string, password?: string): Account {
    username = username.trim();
    if (!username || username.length < 3 || username.length > 24) {
      throw new Error('Username must be 3-24 characters');
    }
    const id = 'acc_' + crypto.randomUUID().slice(0, 8);
    const hash = password ? hashPassword(password) : '';
    const now = Date.now();
    const stmt = this.db.prepare('INSERT INTO accounts (id, username, password_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, username, hash, now, now);
    return { id, username, password_hash: hash, created_at: now, last_login: now };
  }

  getAccountByUsername(username: string): Account | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE username = ?');
    const row = stmt.get(username.trim()) as any;
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      password_hash: row.password_hash,
      created_at: Number(row.created_at),
      last_login: Number(row.last_login)
    };
  }

  authenticate(username: string, password?: string): Account {
    username = username.trim();
    let acc = this.getAccountByUsername(username);
    if (!acc) {
      // Auto-register guest account if password not provided or first login
      acc = this.createAccount(username, password);
    } else if (password && acc.password_hash && acc.password_hash !== hashPassword(password)) {
      throw new Error('Invalid credentials');
    }
    this.db.prepare('UPDATE accounts SET last_login = ? WHERE id = ?').run(Date.now(), acc.id);
    return acc;
  }

  // --- Character methods
  createCharacter(accountId: string, name: string, cls: string, look: any): PersistentCharacter {
    name = name.trim();
    if (!name || name.length < 2 || name.length > 20) {
      throw new Error('Character name must be 2-20 characters');
    }
    const existing = this.getCharacterByName(name);
    if (existing) {
      throw new Error(`Character name "${name}" is already taken.`);
    }

    const id = 'char_' + crypto.randomUUID().slice(0, 10);
    const now = Date.now();
    const defaultAttrs = { str: 10, agi: 10, int: 10, vit: 10, wis: 10 };
    const defaultHotbar = ['power_strike', 'cleave', null, null, null];
    const defaultEquip = { weapon: 'sword_iron' };
    const defaultInv = { sword_iron: 1, bread: 3, potion_health: 2 };
    const defaultQuests = { main: { s: 1, obj: 'talk' } };
    const defaultRep = { crown: 0, league: 0, ashen: 0, kharun: 0, moon: 0, spire: 0 };

    const stmt = this.db.prepare(`
      INSERT INTO characters (
        id, account_id, name, cls, level, xp, hp, mana, sta,
        pos_x, pos_y, pos_z, yaw, zone, gold, look, attrs, skills,
        hotbar, equip, inventory, quests, reputation, guild_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, accountId, name, cls, 1, 0, 100, 50, 100,
      -140, 0, 100, 0, 'world', 120,
      JSON.stringify(look || {}),
      JSON.stringify(defaultAttrs),
      JSON.stringify({}),
      JSON.stringify(defaultHotbar),
      JSON.stringify(defaultEquip),
      JSON.stringify(defaultInv),
      JSON.stringify(defaultQuests),
      JSON.stringify(defaultRep),
      null, now, now
    );

    return this.getCharacterById(id)!;
  }

  getCharactersByAccount(accountId: string): PersistentCharacter[] {
    const stmt = this.db.prepare('SELECT * FROM characters WHERE account_id = ? ORDER BY level DESC, updated_at DESC');
    const rows = stmt.all(accountId) as any[];
    return rows.map((r) => this.mapChar(r));
  }

  getCharacterById(id: string): PersistentCharacter | null {
    const stmt = this.db.prepare('SELECT * FROM characters WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapChar(row) : null;
  }

  getCharacterByName(name: string): PersistentCharacter | null {
    const stmt = this.db.prepare('SELECT * FROM characters WHERE name = ?');
    const row = stmt.get(name.trim()) as any;
    return row ? this.mapChar(row) : null;
  }

  saveCharacter(c: PersistentCharacter) {
    const stmt = this.db.prepare(`
      UPDATE characters SET
        level = ?, xp = ?, hp = ?, mana = ?, sta = ?,
        pos_x = ?, pos_y = ?, pos_z = ?, yaw = ?, zone = ?, gold = ?,
        look = ?, attrs = ?, skills = ?, hotbar = ?, equip = ?,
        inventory = ?, quests = ?, reputation = ?, guild_id = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      c.level, c.xp, c.hp, c.mana, c.sta,
      c.pos_x, c.pos_y, c.pos_z, c.yaw, c.zone || 'world', c.gold,
      JSON.stringify(c.look || {}),
      JSON.stringify(c.attrs || {}),
      JSON.stringify(c.skills || {}),
      JSON.stringify(c.hotbar || []),
      JSON.stringify(c.equip || {}),
      JSON.stringify(c.inventory || {}),
      JSON.stringify(c.quests || {}),
      JSON.stringify(c.reputation || {}),
      c.guild_id || null,
      Date.now(),
      c.id
    );
  }

  private mapChar(r: any): PersistentCharacter {
    return {
      id: r.id,
      account_id: r.account_id,
      name: r.name,
      cls: r.cls,
      level: Number(r.level),
      xp: Number(r.xp),
      hp: Number(r.hp),
      mana: Number(r.mana),
      sta: Number(r.sta),
      pos_x: Number(r.pos_x),
      pos_y: Number(r.pos_y),
      pos_z: Number(r.pos_z),
      yaw: Number(r.yaw),
      zone: r.zone,
      gold: Number(r.gold),
      look: JSON.parse(r.look || '{}'),
      attrs: JSON.parse(r.attrs || '{}'),
      skills: JSON.parse(r.skills || '{}'),
      hotbar: JSON.parse(r.hotbar || '[]'),
      equip: JSON.parse(r.equip || '{}'),
      inventory: JSON.parse(r.inventory || '{}'),
      quests: JSON.parse(r.quests || '{}'),
      reputation: JSON.parse(r.reputation || '{}'),
      guild_id: r.guild_id || null,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at)
    };
  }

  getInventory(characterId: string): Record<string, number> {
    const ch = this.getCharacterById(characterId);
    return ch ? { ...ch.inventory } : {};
  }

  saveInventory(characterId: string, inv: Record<string, number>) {
    this.db.prepare('UPDATE characters SET inventory = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(inv), Date.now(), characterId);
  }

  updateGold(characterId: string, gold: number) {
    this.db.prepare('UPDATE characters SET gold = ?, updated_at = ? WHERE id = ?')
      .run(gold, Date.now(), characterId);
  }

  // --- Guild methods
  createGuild(name: string, tag: string, leaderId: string): Guild {
    name = name.trim();
    tag = tag.trim().toUpperCase();
    if (name.length < 3 || name.length > 24) throw new Error('Guild name must be 3-24 characters');
    if (tag.length < 2 || tag.length > 5) throw new Error('Guild tag must be 2-5 characters');

    const id = 'guild_' + crypto.randomUUID().slice(0, 8);
    const now = Date.now();
    this.db.prepare('INSERT INTO guilds (id, name, tag, leader_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, tag, leaderId, now);

    this.addGuildMember(id, leaderId, 'leader');
    this.db.prepare('UPDATE characters SET guild_id = ? WHERE id = ?').run(id, leaderId);

    return { id, name, tag, leader_id: leaderId, motd: 'Honor the Broken Skies.', level: 1, created_at: now };
  }

  getGuild(guildId: string): Guild | null {
    const stmt = this.db.prepare('SELECT * FROM guilds WHERE id = ?');
    const row = stmt.get(guildId) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      tag: row.tag,
      leader_id: row.leader_id,
      motd: row.motd,
      level: Number(row.level),
      created_at: Number(row.created_at)
    };
  }

  addGuildMember(guildId: string, characterId: string, rank: GuildMember['rank'] = 'member') {
    const now = Date.now();
    this.db.prepare('INSERT OR REPLACE INTO guild_members (guild_id, character_id, rank, joined_at) VALUES (?, ?, ?, ?)')
      .run(guildId, characterId, rank, now);
    this.db.prepare('UPDATE characters SET guild_id = ? WHERE id = ?').run(guildId, characterId);
  }

  removeGuildMember(guildId: string, characterId: string) {
    this.db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND character_id = ?').run(guildId, characterId);
    this.db.prepare('UPDATE characters SET guild_id = NULL WHERE id = ?').run(characterId);
  }

  getGuildMembers(guildId: string): GuildMember[] {
    const stmt = this.db.prepare(`
      SELECT m.guild_id, m.character_id, m.rank, m.joined_at, c.name as character_name
      FROM guild_members m
      JOIN characters c ON m.character_id = c.id
      WHERE m.guild_id = ?
      ORDER BY m.joined_at ASC
    `);
    const rows = stmt.all(guildId) as any[];
    return rows.map((r) => ({
      guild_id: r.guild_id,
      character_id: r.character_id,
      character_name: r.character_name,
      rank: r.rank,
      joined_at: Number(r.joined_at)
    }));
  }

  // --- Trade logs
  logTrade(fromChar: string, toChar: string, fromItems: any, toItems: any, fromGold: number, toGold: number) {
    const id = 'trade_' + crypto.randomUUID().slice(0, 10);
    this.db.prepare(`
      INSERT INTO trade_logs (id, from_char, to_char, from_items, to_items, from_gold, to_gold, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, fromChar, toChar, JSON.stringify(fromItems), JSON.stringify(toItems), fromGold, toGold, Date.now());
  }

  // --- Marketplace / Auction House
  createMarketListing(sellerId: string, sellerName: string, itemId: string, qty: number, price: number): MarketListing {
    qty = Math.max(1, Math.floor(qty));
    price = Math.max(1, Math.floor(price));
    const inv = this.getInventory(sellerId);
    if (!inv[itemId] || inv[itemId] < qty) {
      throw new Error(`Insufficient inventory: you do not have ${qty}x ${itemId}`);
    }

    inv[itemId] -= qty;
    if (inv[itemId] <= 0) delete inv[itemId];
    this.saveInventory(sellerId, inv);

    const id = 'mkt_' + crypto.randomUUID().slice(0, 10);
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO marketplace_listings (id, seller_id, seller_name, item_id, qty, price, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(id, sellerId, sellerName, itemId, qty, price, now);

    return { id, seller_id: sellerId, seller_name: sellerName, item_id: itemId, qty, price, status: 'active', created_at: now };
  }

  buyMarketListing(buyerId: string, buyerName: string, listingId: string): { listing: MarketListing; buyerGold: number; sellerGold: number } {
    const stmt = this.db.prepare('SELECT * FROM marketplace_listings WHERE id = ? AND status = ?');
    const row = stmt.get(listingId, 'active') as any;
    if (!row) {
      throw new Error('Listing is no longer active or does not exist');
    }
    if (row.seller_id === buyerId) {
      throw new Error('You cannot buy your own listing');
    }

    const buyer = this.getCharacterById(buyerId);
    if (!buyer) throw new Error('Buyer character not found');
    if (buyer.gold < row.price) {
      throw new Error(`Insufficient gold: listing costs ${row.price}g, but you have ${buyer.gold}g`);
    }

    const seller = this.getCharacterById(row.seller_id);
    if (!seller) throw new Error('Seller character not found');

    const buyerGold = buyer.gold - row.price;
    const sellerGold = seller.gold + row.price;
    this.updateGold(buyerId, buyerGold);
    this.updateGold(row.seller_id, sellerGold);

    const buyerInv = this.getInventory(buyerId);
    buyerInv[row.item_id] = (buyerInv[row.item_id] || 0) + row.qty;
    this.saveInventory(buyerId, buyerInv);

    const now = Date.now();
    this.db.prepare(`
      UPDATE marketplace_listings
      SET status = 'sold', buyer_id = ?, buyer_name = ?, sold_at = ?
      WHERE id = ?
    `).run(buyerId, buyerName, now, listingId);

    this.logTrade(row.seller_id, buyerId, { [row.item_id]: row.qty }, {}, 0, row.price);

    const listing: MarketListing = {
      id: row.id,
      seller_id: row.seller_id,
      seller_name: row.seller_name,
      item_id: row.item_id,
      qty: Number(row.qty),
      price: Number(row.price),
      status: 'sold',
      buyer_id: buyerId,
      buyer_name: buyerName,
      created_at: Number(row.created_at),
      sold_at: now
    };

    return { listing, buyerGold, sellerGold };
  }

  cancelMarketListing(sellerId: string, listingId: string): MarketListing {
    const stmt = this.db.prepare('SELECT * FROM marketplace_listings WHERE id = ? AND status = ? AND seller_id = ?');
    const row = stmt.get(listingId, 'active', sellerId) as any;
    if (!row) {
      throw new Error('Listing not found or cannot be cancelled');
    }

    this.db.prepare("UPDATE marketplace_listings SET status = 'cancelled' WHERE id = ?").run(listingId);

    const inv = this.getInventory(sellerId);
    inv[row.item_id] = (inv[row.item_id] || 0) + Number(row.qty);
    this.saveInventory(sellerId, inv);

    return {
      id: row.id,
      seller_id: row.seller_id,
      seller_name: row.seller_name,
      item_id: row.item_id,
      qty: Number(row.qty),
      price: Number(row.price),
      status: 'cancelled',
      created_at: Number(row.created_at)
    };
  }

  getActiveMarketListings(search?: string, limit = 50): MarketListing[] {
    let query = "SELECT * FROM marketplace_listings WHERE status = 'active'";
    const params: any[] = [];
    if (search && search.trim()) {
      query += ' AND item_id LIKE ?';
      params.push(`%${search.trim().toLowerCase()}%`);
    }
    query += ' ORDER BY price ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      seller_id: r.seller_id,
      seller_name: r.seller_name,
      item_id: r.item_id,
      qty: Number(r.qty),
      price: Number(r.price),
      status: r.status,
      created_at: Number(r.created_at)
    }));
  }

  getMyMarketListings(sellerId: string): MarketListing[] {
    const stmt = this.db.prepare('SELECT * FROM marketplace_listings WHERE seller_id = ? ORDER BY created_at DESC LIMIT 50');
    const rows = stmt.all(sellerId) as any[];
    return rows.map((r) => ({
      id: r.id,
      seller_id: r.seller_id,
      seller_name: r.seller_name,
      item_id: r.item_id,
      qty: Number(r.qty),
      price: Number(r.price),
      status: r.status,
      buyer_id: r.buyer_id,
      buyer_name: r.buyer_name,
      created_at: Number(r.created_at),
      sold_at: r.sold_at ? Number(r.sold_at) : undefined
    }));
  }

  // --- Persistent Housing
  getHouse(houseId: string): PersistentHouse | null {
    const stmt = this.db.prepare('SELECT * FROM houses WHERE house_id = ?');
    const row = stmt.get(houseId) as any;
    if (!row) return null;
    return {
      house_id: row.house_id,
      owner_id: row.owner_id,
      owner_name: row.owner_name,
      level: Number(row.level),
      furniture: JSON.parse(row.furniture_json || '[]'),
      storage: JSON.parse(row.storage_json || '{}'),
      updated_at: Number(row.updated_at)
    };
  }

  saveHouse(houseId: string, ownerId: string, ownerName: string, level: number, furniture: any[], storage: Record<string, number>): PersistentHouse {
    const now = Date.now();
    const furnJson = JSON.stringify(furniture || []);
    const storJson = JSON.stringify(storage || {});
    this.db.prepare(`
      INSERT INTO houses (house_id, owner_id, owner_name, level, furniture_json, storage_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(house_id) DO UPDATE SET
        owner_id = excluded.owner_id,
        owner_name = excluded.owner_name,
        level = excluded.level,
        furniture_json = excluded.furniture_json,
        storage_json = excluded.storage_json,
        updated_at = excluded.updated_at
    `).run(houseId, ownerId, ownerName, level, furnJson, storJson, now);

    return { house_id: houseId, owner_id: ownerId, owner_name: ownerName, level, furniture, storage, updated_at: now };
  }

  getAllHouses(): PersistentHouse[] {
    const stmt = this.db.prepare('SELECT * FROM houses');
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      house_id: row.house_id,
      owner_id: row.owner_id,
      owner_name: row.owner_name,
      level: Number(row.level),
      furniture: JSON.parse(row.furniture_json || '[]'),
      storage: JSON.parse(row.storage_json || '{}'),
      updated_at: Number(row.updated_at)
    }));
  }

  // --- World State Persistence
  getWorldState(key: string): any | null {
    const stmt = this.db.prepare('SELECT value_json FROM world_state WHERE key = ?');
    const row = stmt.get(key) as any;
    if (!row) return null;
    try {
      return JSON.parse(row.value_json);
    } catch {
      return null;
    }
  }

  setWorldState(key: string, value: any) {
    const json = JSON.stringify(value);
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO world_state (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `).run(key, json, now);
  }

  // --- Friends System
  addFriend(charId: string, friendId: string) {
    if (charId === friendId) throw new Error('Cannot add yourself as a friend');
    const now = Date.now();
    this.db.prepare('INSERT OR REPLACE INTO friends (character_id, friend_character_id, status, created_at) VALUES (?, ?, ?, ?)')
      .run(charId, friendId, 'accepted', now);
    this.db.prepare('INSERT OR REPLACE INTO friends (character_id, friend_character_id, status, created_at) VALUES (?, ?, ?, ?)')
      .run(friendId, charId, 'accepted', now);
  }

  removeFriend(charId: string, friendId: string) {
    this.db.prepare('DELETE FROM friends WHERE (character_id = ? AND friend_character_id = ?) OR (character_id = ? AND friend_character_id = ?)')
      .run(charId, friendId, friendId, charId);
  }

  getFriends(charId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT f.friend_character_id as id, c.name, c.cls, c.level, c.hp, f.created_at
      FROM friends f
      JOIN characters c ON f.friend_character_id = c.id
      WHERE f.character_id = ?
    `);
    const rows = stmt.all(charId) as any[];
    return rows.map((r) => ({
      ...r,
      max_hp: 100 + (Number(r.level) - 1) * 15
    }));
  }

  // --- Player Inspection
  getPublicProfile(charIdOrName: string): PublicProfile | null {
    let ch = this.getCharacterById(charIdOrName);
    if (!ch) ch = this.getCharacterByName(charIdOrName);
    if (!ch) return null;

    let guildName: string | undefined;
    let guildTag: string | undefined;
    if (ch.guild_id) {
      const g = this.getGuild(ch.guild_id);
      if (g) {
        guildName = g.name;
        guildTag = g.tag;
      }
    }

    return {
      id: ch.id,
      name: ch.name,
      cls: ch.cls,
      level: ch.level,
      hp: ch.hp,
      max_hp: 100 + (ch.level - 1) * 15,
      mana: ch.mana,
      max_mana: 50 + (ch.level - 1) * 10,
      stamina: ch.sta,
      max_stamina: 100 + (ch.level - 1) * 10,
      gold: ch.gold,
      look: JSON.parse(ch.look_json || '{}'),
      equip: JSON.parse(ch.equip_json || '{}'),
      guild_id: ch.guild_id,
      guild_name: guildName,
      guild_tag: guildTag
    };
  }

  // --- Moderation & Reports
  createReport(reporterId: string, reporterName: string, reportedId: string, reportedName: string, reason: string, details?: string) {
    const id = 'rep_' + crypto.randomUUID().slice(0, 10);
    this.db.prepare(`
      INSERT INTO reports (id, reporter_id, reporter_name, reported_id, reported_name, reason, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, reporterId, reporterName, reportedId, reportedName, reason, details || '', Date.now());
  }

  close() {
    this.db.close();
  }
}
