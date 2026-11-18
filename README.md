# AETHERFALL — A Tale of Broken Skies
### A L3X STUD10'5 PRODUCTION

Browser-based 2.5D/3D fantasy action-adventure RPG (Three.js + React + Vite + Tailwind).

## What this project is
The recovered original game (React + Three.js, ~320 KB of minified game code) has been **preserved, not rewritten**:

| Path | Purpose |
|---|---|
| `legacy-backup/aetherfall-original.html` | Byte-for-byte copy of the recovered original build (safety backup) |
| `src/legacy/aetherfall.legacy.js` | The original engine, prettified into readable form + a small number of marked `AFX.` integration hooks |
| `src/legacy/aetherfall.legacy.css` | Original stylesheet |
| `scripts/patch-legacy.py` | The audit trail of every edit made to the engine (each anchor asserted exactly-once) |
| `src/aetherfall/` | **New maintainable TypeScript systems**: `catalog.ts` (data), `runtime.ts` (classes, mounts, glider, gamepad, voice, audio), `tutorial.ts`, `bridge.ts` |
| `src/ui/` | New React UI shell: Character Creator, Weapon Hall, Hub, Tutorial, HUD extras, splash |
| `docs/` | Feature tracker, testing report, screenshots |

The engine mounts into `#root`; the new shell renders into `#shell` on top. Existing gameplay (combat, quests, factions, bosses, 5 zones, weather, gliding, saves) is untouched except where noted.

## Run
```
npm install
npm run dev        # development
npm run build      # single-file dist/index.html
npx vite preview --port 4173 && node scripts/e2e.mjs   # browser smoke test (needs Playwright Chromium)
```

## New in this pass
* **Character creator** — body, height/mass, 5 face shapes, 4 eye shapes + 8 eye colours, brows, 5 facial-hair styles, 5 scars, 5 markings, accessories (scarf, amulet, circlet, eyepatch), hair, 8 outfits, cloak colour/length, gloves, boots, helm, 6 voices, 8 presets, randomise, name, 6 camera angles + drag-rotate. **Every option is built into the real 3D model** (`BA()` in the legacy model builder) and saved.
* **Weapon Hall** — five classes (Vanguard, Berserker, Ranger, Spellblade, Shadow). The *actual in-game character* holds each weapon and performs a class combat demonstration; cinematic camera push-ins, orbit/inspect, rotating weapon displays, class confirmation sequence. Selection sets starter weapon, class bonuses, spells, supplies.
* **Class system & hybrids** — class perks scale with level; secondary class (level 5+) grants half-strength bonuses plus its starter weapon; respec; Hub → Class.
* **Interactive tutorial (7 chapters)** — steps complete by detecting real play (movement, camera, attacks, glide, mount…), adapted to your class, skippable (per-step or whole), replayable, journal (F1), assistance levels, controller glyphs, one-time reminders for unlearned mechanics. Only starts automatically for new characters.
* **Mounts** — 9 mounts (palfrey, courser, armoured warhorse, heavy destrier, dire wolf, moonstag, ember strider, legendary flying Skystrider, dimensional Veilstrider) with procedural animated rigs, walk/trot/canter/gallop gaits, weighty acceleration, slope-dependent speed, stamina/winded state, health & damage sharing, trample, bonding, upgrades, saddlebags, dye, hoof/call audio.
* **Glider** — original physics preserved; added visible deploying/folding glider, banking, wind gusts (stronger in storms), 3 upgrade tracks, 3 styles + colours.
* **Gamepad** (Xbox/PlayStation standard mapping) with glyph prompts; **graphics presets** Chromebook / Low / Medium / High / Ultra / Cinematic, auto-detects ChromeOS.
* Synthesised player **voice** (grunts/yells/pain), studio branding on splash and title.

See `docs/FEATURE_TRACKER.md` for exact status and `docs/TESTING.md` for what was and was not tested.
