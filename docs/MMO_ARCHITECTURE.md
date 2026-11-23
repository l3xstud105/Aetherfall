# AETHERFALL 1.0.0 — Global Realm MMORPG Architecture Design

**Project:** One World. One Realm. Every Player.  
**Version:** 1.0.0  
**Authors:** L3X STUD105 Core Engineering Team  
**Status:** Approved for Implementation  

---

## 1. Architectural Vision & Objective

The objective is to evolve Aetherfall from a client-hosted peer-to-peer co-op RPG into an **authoritative, persistent, shared-world MMORPG**. All players across the globe connect to **one unified persistent universe**. There are no player-hosted sessions, no fragmented server lobbies, and no disjointed saves. The world of Valdoria persists continuously on dedicated server infrastructure regardless of whether individual players are online.

---

## 2. Backend Selection & Technology Evaluation

### Evaluation Matrix:

| Criteria | PeerJS P2P (Old) | Colyseus Framework | High-Performance WebSocket + Node.js (Selected Architecture) |
|---|---|---|---|
| **Authority** | Host client (vulnerable to host exit/lag) | Server authoritative | Server authoritative |
| **Persistence** | None (ephemeral session) | Requires DB integration | Native SQLite/PostgreSQL WAL integration |
| **Self-Hosting Complexity** | External signaling cloud | Multi-dependency setup | Zero-dependency, single binary or node run |
| **Room / Region Model** | 1 room per host | Room-based matchmaking | Continuous seamless world regions + instanced dungeons |
| **Bandwidth & Latency** | Star topology bottleneck on host | Schema delta binary | Packed binary/JSON with spatial interest management |
| **Cost & Infrastructure** | Free signaling, fragile | Server resources | Extremely low memory overhead (~50MB base) |

### Selected Architecture:
We implement a **Colyseus-compatible authoritative Node.js game server** leveraging native WebSockets (`ws`), a fixed-timestep server loop (20Hz simulation), spatial interest management (spatial grid partitioning), and a relational database layer (SQLite with WAL mode for out-of-the-box self-hosting, with SQL schema compatible with PostgreSQL for enterprise scale).

---

## 3. System Architecture & Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AETHERFALL 1.0 CLIENT                           │
│  React 19 UI  │  Three.js 3D Engine  │  Synthetic Audio  │  Prediction │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ WebSockets (JSON/Binary Frames)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AUTHORITATIVE REALM SERVER (Port 7777)                │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   Connection & Auth   │  │           World Simulation             │ │
│  │  - Session tokens     │  │  - 20Hz Tick Loop (50ms)               │ │
│  │  - Rate limiting      │  │  - Day/Night Clock & Dynamic Weather   │ │
│  │  - Packet validation  │  │  - AI, Pathing & Aggro State Machine   │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │    Combat & Physics   │  │        Spatial Interest Manager        │ │
│  │  - Hit raycasting     │  │  - 64m x 64m World Cells               │ │
│  │  - Elemental Reaction │  │  - Delta State Compression             │ │
│  │  - Boss Phase Enrage  │  │  - Dynamic Area-of-Interest (AOI)      │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │    Social & Economy   │  │          Dungeon Instances             │ │
│  │  - Channels & Chat    │  │  - Whispering Catacombs                │ │
│  │  - Party Management   │  │  - Sunken Aether Temple                │ │
│  │  - Guild System       │  │  - Bastion Undercroft                  │ │
│  │  - 2-Phase Trade Lock │  │  - Luminescent Grotto / Hollow Rift    │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ SQL Queries (Transactions)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 PERSISTENT STORAGE (SQLite / PostgreSQL)               │
│  - accounts        - characters      - inventories     - equipment     │
│  - quests          - housing         - guilds          - trade_logs    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Design

The persistence layer guarantees ACID compliance, character safety, transaction logs, and anti-duplication protection.

### Core Tables:
1. `accounts`: `id`, `username`, `password_hash`, `created_at`, `last_login`, `role` (player, gm, admin).
2. `characters`: `id`, `account_id`, `name`, `class`, `level`, `xp`, `hp`, `mana`, `stamina`, `pos_x`, `pos_y`, `pos_z`, `yaw`, `zone`, `gold`, `look_json`, `attrs_json`, `skills_json`, `hotbar_json`, `reputation_json`, `created_at`, `updated_at`.
3. `inventory_items`: `id`, `character_id`, `item_id`, `quantity`, `slot_index`.
4. `equipped_items`: `character_id`, `slot` (`weapon`, `offhand`, `helm`, `chest`, `boots`, `amulet`, `ring`), `item_id`.
5. `character_quests`: `character_id`, `quest_id`, `stage`, `state` (`active`, `completed`), `data_json`.
6. `guilds`: `id`, `name`, `tag`, `leader_id`, `motd`, `level`, `created_at`.
7. `guild_members`: `guild_id`, `character_id`, `rank` (`leader`, `officer`, `veteran`, `member`, `initiate`), `joined_at`.
8. `character_friends`: `character_id`, `friend_character_id`, `status` (`pending`, `accepted`), `created_at`.
9. `player_houses`: `house_id`, `owner_character_id`, `level`, `furniture_json`, `storage_json`, `purchased_at`.
10. `trade_logs`: `id`, `from_character_id`, `to_character_id`, `from_items_json`, `to_items_json`, `from_gold`, `to_gold`, `timestamp`.

---

## 5. Network Protocol & Packet Specification

The client and server communicate via structured binary or typed JSON packets:

### Client -> Server Packets:
- `auth`: `{ t: 'auth', username, token }`
- `char_select`: `{ t: 'char_select', characterId }`
- `char_create`: `{ t: 'char_create', name, cls, look }`
- `move`: `{ t: 'move', seq, x, y, z, yaw, sp, act, air, crouch }`
- `attack`: `{ t: 'attack', combo, targetId }`
- `ability`: `{ t: 'ability', slot, abilityId, targetId, x, z }`
- `block`: `{ t: 'block', active }`
- `parry`: `{ t: 'parry', seq }`
- `interact`: `{ t: 'interact', type, targetId }`
- `chat`: `{ t: 'chat', channel: 'world'|'local'|'party'|'guild'|'whisper', target, text }`
- `party_invite`: `{ t: 'party_invite', targetName }`
- `party_accept`: `{ t: 'party_accept', partyId }`
- `party_leave`: `{ t: 'party_leave' }`
- `guild_create`: `{ t: 'guild_create', name, tag }`
- `guild_invite`: `{ t: 'guild_invite', targetName }`
- `trade_req`: `{ t: 'trade_req', targetId }`
- `trade_offer`: `{ t: 'trade_offer', items, gold }`
- `trade_confirm`: `{ t: 'trade_confirm' }`
- `trade_cancel`: `{ t: 'trade_cancel' }`

### Server -> Client Broadcast & Sync Packets:
- `auth_ok`: `{ t: 'auth_ok', accountId, characters }`
- `char_ok`: `{ t: 'char_ok', character, worldTime, weather }`
- `world_snapshot`: `{ t: 'snapshot', tick, time, weather, players, foes, events }`
- `foe_hit`: `{ t: 'foe_hit', id, dmg, el, crit, reaction, hp, phase, dead }`
- `player_hurt`: `{ t: 'player_hurt', hp, mana, sta, attackerId }`
- `loot_drop`: `{ t: 'loot_drop', id, x, z, item, gold, ownerId }`
- `inv_update`: `{ t: 'inv_update', inventory, gold }`
- `chat_msg`: `{ t: 'chat_msg', channel, from, text, timestamp }`
- `party_update`: `{ t: 'party_update', partyId, leaderId, members }`
- `guild_update`: `{ t: 'guild_update', guild }`
- `trade_update`: `{ t: 'trade_update', state, partnerName, myOffer, theirOffer }`
- `dungeon_enter`: `{ t: 'dungeon_enter', dungeonId, instanceId }`

---

## 6. Server-Authoritative Logic & Security Guarantee

1. **Movement Verification:** The server tracks maximum possible speed (`base_speed * sprint_mult + margin`). If `pos.distanceTo(last_pos) > max_dist`, the client is snapped back (`server reconciliation`).
2. **Combat Validation:** Client attacks only indicate intent. The server checks weapon reach (2.6m for swords, 3.5m for polearms, 22m for bows/magic), validates attack cooldowns and resource costs (stamina/mana), computes defense formulas and elemental reactions, and decrements health authoritatively.
3. **Anti-Duplication Two-Phase Trade Lock:**
   - State 1: Both parties place offers. Offers can be modified.
   - State 2: Both parties click "Lock Offer". No further modifications permitted.
   - State 3: Both parties click "Confirm Trade".
   - State 4: Server executes a single atomic database transaction verifying item ownership. If any item is missing or inventory full, transaction rolls back cleanly.
4. **Data Isolation:** Client cannot submit arbitrary state. Inventory and gold additions only occur upon server-validated monster kills, quest completions, or shop transactions.

---

## 7. Deployment & Infrastructure Operations

- **Production Mode:** Run as a Node.js daemon (or PM2 / Docker container).
- **Default Ports:** HTTP/HTTPS Web Client: `5173`/`443`; MMO WebSocket Server: `7777`.
- **Operating Cost:** Under $10/month on any standard 2 vCPU / 4GB RAM VPS supporting hundreds of concurrent players. Zero proprietary external platform fees.
