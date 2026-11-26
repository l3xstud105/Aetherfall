# AETHERFALL 1.0.0 — One World. One Realm. Every Player.
**L3X STUD105** · Browser-first 3D third-person open-world persistent MMORPG (Three.js WebGL 2.0 + React 19 + Node.js Authoritative WebSocket Server + Native SQLite WAL).

Play in browser: `npm install && npm run build`, then open `dist/index.html` or run `npm run dev`.  
Dedicated Global Realm Server: `npm run server` (listens on `0.0.0.0:7777`).

---

## 🌐 Global MMORPG Transformation (Milestones 1–5)

AETHERFALL 1.0.0 transforms the game into a persistent, authoritative single-realm MMORPG where every player connects to the same persistent game universe.

### Key MMORPG Features:
1. **One Global Realm (`server/`):**
   - Authoritative dedicated Node.js WebSocket backend running on port 7777.
   - Native SQLite `DatabaseSync` persistence configured with Write-Ahead Logging (`WAL`), foreign keys, and atomic transactions.
   - Persistent player accounts, character creation/selection, inventory, gold, equipment, guilds, friendships, and audit trade logs.
   - 20Hz world simulation loop with 64m × 64m spatial grid partitioning for optimized bandwidth and anti-cheat protection.
2. **Server-Authoritative Gameplay:**
   - Authoritative movement validation, delta checking, and speedhack teleport rejection.
   - Server-validated reach, resource expenditure, and directional poise stagger.
   - Authoritative 5-Element Reaction Matrix: Conflagration, Superconductor, Vaporize 2×, Electro-Discharge, Magma Eruption.
   - Multi-phase boss mechanics with Phase II Enrage transitions at ≤50% HP.
   - Server-side loot, experience, and currency drops persisted directly to player DB profiles.
3. **Comprehensive Social & Economic Systems:**
   - Multi-channel chat (`world`, `local`, `party`, `guild`, `whisper`) with rate limits and profanity filtering.
   - Persistent Friends list with real-time online status and direct whisper/party shortcuts.
   - Full Party system (up to 4 players) with synchronized member vitals in the HUD.
   - Player Inspection modal viewing equipped gear, stats, and guild affiliation.
   - Guild system with hierarchy management (`leader`, `officer`, `member`).
   - Secure Two-Phase Player Trading (Negotiate → Lock → Confirm) with zero item duplication risk.
4. **Living Persistent World & World Events:**
   - Synchronized day/night clock, dynamic weather patterns, and NPC schedules.
   - Dynamic World Events: *Bandit Siege on Ashenvale Outpost*, *Royal Caravan Ambush*, *Void Incursion at Hollow Rift*, and *Ancient Storm Warden Kharun Awakens*.
   - World event contribution tracking awarding bonus gold, XP, and relics to defenders.
   - Persistent settlement rebuilding: server-wide resource donation advancing Ashenvale Outpost through rebuilding tiers.
5. **Player Marketplace & Persistent Housing:**
   - In-game Player Marketplace / Auction House: list items from bag, search listings by name, buy items with atomic gold/item escrow, and cancel listings.
   - Persistent housing saving furniture layouts, storage chests, and crafting stations to database.
6. **Cooperative LFG Matchmaking & Dungeon Instances:**
   - Dungeon queue tool pairing players for cooperative runs in Whispering Catacombs, Sunken Aether Temple, Bastion Undercroft, Luminescent Grotto, and Hollow Rift.
7. **100% Offline Single-Player Preserved:**
   - Complete offline single-player campaign remains fully playable without an internet connection or server dependency.

---

## 🚀 Quick Start Guide

### 1. Run Development Client
```bash
npm install
npm run dev
```
Client runs at `http://localhost:5173/`.

### 2. Launch Authoritative Global Realm Server
```bash
npm run server
```
Server starts on `0.0.0.0:7777` with native SQLite database (`aetherfall_realm.db`).

### 3. Connect Multiple Players
- Open two browser tabs at `http://localhost:5173/`.
- In each tab, click **🌐 Enter Global Realm (MMO)**.
- Enter distinct character names (e.g., `Thorin` and `Aria`).
- Both players will spawn into the shared world, see each other move in real-time, chat across channels, form parties, trade, and tackle dungeons together.

### 4. Run Automated Test Suite
```bash
bash tests/run.sh
```
Executes all 8 headless test suites (900+ assertions) covering logic, world physics, UI, gameplay loop, P2P fallback, authoritative server, milestones 1–5, and staged load testing.

---

## 🛠️ Production Deployment

For Docker, systemd, Nginx reverse proxy with WSS, SSL/TLS, and automated database backups, refer to **`docs/DEPLOYMENT.md`**.

```bash
# Launch with Docker Compose
docker compose up -d --build
```

---
## 🌟 What's New in Version 1.0

* **4 Complete Underground Dungeons:**
  - **Whispering Catacombs (`crypt`):** Subterranean tomb complex beneath the Ruined Chapel (`95, -30`) filled with sarcophagi, soul torches, silver ore veins, crypt specters, and the legendary **Voidheart Talisman** (`relic_voidheart`).
  - **Sunken Aether Temple (`sunken_temple`):** Flooded coastal sanctuary beneath the Sunken Veil (`210, 10`) featuring ancient pillars, bioluminescent water reflections, void reavers, and the legendary **Sunken Dawn Relic** (`relic_sunken`).
  - **Bastion Undercroft (`fortress_undercroft`):** Underground garrison and armory beneath Fort Cinderwatch (`-10, 205`) with iron-barred dungeons, active forge, deserter knights, and the legendary **Heart of the Mountain** (`relic_mountain`).
  - **Luminescent Grotto (`grotto`):** Cavernous fungal sanctuary behind Veilfall Cascade (`60, -150`) with glowing bioluminescent mushrooms, sapphire and emerald crystal clusters, and the legendary **Tempest Conduit** (`relic_tempest`).

* **Elemental Reaction Matrix:**
  - Dynamic elemental status interactions with procedural audio synthesis and unique VFX:
    - **Conflagration (Fire + Wind):** Combustive AoE fire explosion dealing +60% bonus damage and staggering surrounding foes.
    - **Superconductor (Ice + Lightning):** Cryo-electric shattering blast dealing +50% damage and instantly breaking enemy guard for 2.5s.
    - **Vaporize (Fire + Water/Ice):** High-temperature steam blast delivering a massive **2.0×** damage multiplier.
    - **Electro-Discharge (Lightning + Water):** High-voltage surge chaining lightning arcs to all nearby enemies within 7 meters.
    - **Magma Eruption (Fire + Earth):** Volcanic molten slag eruption breaking armor poise (+50) and dealing +65% bonus damage.
  - Dynamic wet state: foes swimming, standing in water, or caught in rainstorms naturally trigger water-element reactions.

* **Multi-Phase Boss Battles:**
  - Bosses (**Karreth the Hollow**, **The Gravewarden**, **The Rift Warden**, **The Aether Colossus**) enter **Phase II: Enraged** at `< 50% HP`.
  - Phase II features immediate stagger recovery, enraged battle barks, crimson aura bursts, 35% faster attack cadence, and expanded multi-directional shockwaves.

* **Living World Simulation & Ashenvale Outpost Rebuilding:**
  - Dynamic survivor structures at the Ashenvale ruins plaza with timber stacks, carpenter workbenches, lanterns, and survivor tents.
  - New merchants & quest givers:
    - **Kaelen the Quartermaster:** Provisions, enchanted timber, and smithing stock at the Ashenvale rebuild outpost.
    - **Rodrik the Caravaner:** Wandering merchant selling precious gemstones (Sapphire, Topaz, Emerald), treasure maps, and rare draughts.
  - **Companion Loyalty Perks:** Active companions grant escalating stat benefits based on loyalty tier (Lyra: ranged & speed; Brann: health & defense; Iselle: mana & healing regen; Kestrel: stamina & crit; Corvin: spellblade attack & life steal).
  - **Consumable Food & Potion Buffs:** Consuming apple cider, rejuvenation draughts, and hearty meals activates lingering vitality, warmth, rage, and stoneskin buffs.

* **Timed Perfect Parry:**
  - Timed 0.22s block reflects 100% incoming damage, inflicts full stagger break on the attacker, triggers procedural metallic parry chime audio (`audio.sfx('parry')`), and grants a +60% counterattack buff.

---
## 🌟 Features Established in Version 0.9

* **5-Element Magic & Expanded Ability System:**
  - Fire (*Flame Slash* - sweeping fire arc + burn damage over time)
  - Ice (*Frost Shield* - damage absorption barrier + chilling freeze reflection)
  - Lightning (*Thunder Slam* - leaping shockwave slam with AoE stagger/stun)
  - Earth (*Terra Wall* - defensive bulwark with massive stagger resistance and knockback)
  - Wind (*Wind Step* - high-velocity dash granting temporary invulnerability and evasive speed)
  - 5-slot ability hotbar with keybinds (`1`, `2`, `3`, `4`, `5`).

* **Advanced Combat Overhaul:**
  - **Poise & Stagger System:** Enemies and player possess poise meters. Heavy hits and abilities deplete poise; breaking poise triggers a vulnerable stagger state (`[VULN]`) where hits deal bonus critical damage.
  - **Directional Blocking & Flanking:** Shields and weapon guards block incoming attacks from the front arc; flanking attacks from the rear bypass guard.
  - **Timed Perfect Parry & Stagger Reflection:** Blocking within 0.22s of an incoming strike reflects 100% of damage back at the attacker, applies full stagger break, and grants the player a +60% counterattack damage buff.
  - **Polearms:** Iron Spear, Royal Halberd, and Aetherlance feature extended 3.5m reach with dedicated thrusting geometries.

* **5 Companions & Tactical Orders:**
  - **Corvin Vale (Spellblade):** 5th companion stationed in Thornwick plaza with full backstory, recruitment quest (*The Lost Blade of Corvin*), and hybrid melee/ranged aether spellblade combat.
  - **Companion Stances & Orders:** Issue real-time tactical commands (`T` key or Companion Codex):
    - *Follow:* Stay close to the player.
    - *Defend:* Guard the player, retaliating only when enemies attack.
    - *Attack:* Aggressively charge and engage targets within range.
    - *Hold:* Wait and stand ground at current position.

* **Professions & Enchanting:**
  - New **Enchanting** profession with Enchanting Altar crafting stations placed in alchemy shops and craftable for player homes.
  - Imbue epic and legendary weapons and gear: *Ring of Five Winds*, *Sunshard Rapier*, *Void Cleaver*, and *Arcane Robes*.
  - New crafting materials: *Void Essence*, *Warded Timber*, *Quicksilver*, *Aether Dust*.

* **New Foes, Bosses & Wildlife:**
  - **Aether Golem:** Colossal animated celestial construct world boss outside the Spire ruins with ground slam shockwaves and high poise.
  - **Void Cultists:** Shadow-casting hostile magic wielders stationed at occult camps.
  - **Mountain Ram:** Wild horned rams populating mountain and snow ridges with curled horns and flight reactions.

* **Save Export & Import:**
  - Full JSON save export and file upload import in the Load Game menu, allowing seamless cross-browser and cross-device save migration.

* **Dedicated Game Website & Desktop Distribution:**
  - **Full Game Website Portal:** Includes Hero showcase, live in-browser playable viewport with fullscreen immersion, 5-element magic deep-dive, interactive 10-class codex, Valdoria world lore, controls guide, and release notes.
  - **Standalone Windows Executable (`Aetherfall.exe`):** Genuine 64-bit Windows PE GUI executable with embedded self-extracting game payload. Runs 100% offline with zero dependencies in a borderless app window.
  - **Desktop Distribution Package (`Aetherfall-v1.0-Windows.zip`):** Complete archive containing `Aetherfall.exe`, standalone `index.html`, Windows batch launcher (`Aetherfall-Launcher.bat`), and offline instructions.

---
## Controls (all remappable in Settings → Controls)
| Action | Keyboard / mouse | Controller (Xbox/PS glyphs auto-detected) |
|---|---|---|
| Move / camera | WASD / mouse (click to capture), arrow keys also rotate | Left stick / Right stick |
| Jump, **Glide** (press again mid-air) | Space | A |
| Sprint / Crouch | Shift / C | RB / R3 |
| Attack / Block / Dodge | LMB / RMB or F / Q | X or RT / LT / B |
| Abilities 1-5 | 1 2 3 4 5 | D-pad / bumpers |
| Tactical Companion Command | T | D-pad / custom |
| Interact | E | Y |
| Mount / dismount | R | R3 |
| Quick-heal | H | LB |
| Inventory / Skills / Journal / Map | I / K / J / M | View = map; menus: D-pad+A/B, LB/RB tabs |
| Emote / Chat | G / Enter | |

If pointer-lock is unavailable (embedded iframe) hold RMB and move the mouse, or use the arrow keys, to rotate the camera.

## Architecture
```
src/game/data.ts        static content (classes, items, skills, quests, dialogue, presets, companions…)
src/game/store.ts       reactive state, saves (versioned, validated, import/export), quests, dialogue VM, inventory
src/game/audio.ts       WebAudio synthesis + procedural SFX/music/ambience buses
src/game/world.ts       noise terrain, rivers, textures, instanced vegetation (chunked, culled, wind shader)
src/game/structures.ts  buildings/walls/castle/landmarks baked into merged meshes + colliders
src/game/interiors.ts   furniture + interior builders + enchanting altars
src/game/rigs.ts        humanoid / creature / bird / polearm rigs + animation
src/game/fx.ts          sky, lights, seasons, weather, particles, torch pool, floating combat text
src/game/actors.ts      NPC schedules, wildlife, poise/stagger, enemies, bosses, companions, remote players
src/game/game.ts        engine: input, player controller, parry/combat, interactions, housing, mounts, loop
src/game/net.ts         PeerJS multiplayer
src/ui/*.tsx            React UI (menus, creator, HUD, codex, panels, settings)
tests/*.ts(x)           headless test suites
```

## Tests & Results (run `bash tests/run.sh`)
| Suite | What it checks | Result |
|---|---|---|
| `logic.test.ts` | 643 data-integrity & logic checks: all 10 classes, 5 companions, elemental abilities, hotbar slots, enchanting recipes, save export/import, quests, reputation/prices, equip/use/level/skills, save corruption recovery | **643 / 643 pass** |
| `world.test.ts` | headless world gen (terrain, settlements, 97k plants, every interior, rigs, 95 NPCs, 244 foes/creatures, 120 frames of weather/sky/AI, enemy aggro/death) | **PASS** |
| `ui.test.tsx` | server-renders 36 screens/tabs (HUD with 5 hotbars, codex tabs, companion tactical controls, menus, creator, dialogues, shops, housing, MP, settings) | **36 / 36 render** |
| `play.test.ts` | runs the **real game loop** (stubbed GL): boot, WASD/sprint, jump, **glide**, melee/ability/dodge/damage/kill, NPC dialogue→quest, enter/leave tavern, buy/furnish/upgrade/store in a home, mount/dismount, cave & Hollow Rift with enemies, hotkeys, pause, death/respawn, 4 000 frames of day/weather, save → reload → restart | **53 / 53 pass** |

