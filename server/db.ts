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

      CREATE INDEX IF NOT EXISTS idx_char_account ON characters(account_id);
      CREATE INDEX IF NOT EXISTS idx_char_name ON characters(name);
      CREATE INDEX IF NOT EXISTS idx_guild_name ON guilds(name);
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

  close() {
    this.db.close();
  }
}
