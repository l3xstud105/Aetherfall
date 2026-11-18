# AETHERFALL 0.9 — A Tale of Broken Skies
**L3X STUD105** · browser-first 3D third-person open-world fantasy RPG (Three.js + React + WebAudio + PeerJS)

Play: `npm install && npm run build`, then open `dist/index.html` (single self-contained file). Dev: `npm run dev`.

---
## 🌟 What's New in Version 0.9

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
  - **Desktop Distribution Package (`Aetherfall-v0.9-Windows.zip`):** Complete archive containing `Aetherfall.exe`, standalone `index.html`, Windows batch launcher (`Aetherfall-Launcher.bat`), and offline instructions.

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

