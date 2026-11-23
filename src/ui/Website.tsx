import { useState, useEffect } from 'react';
import {
  ABILITIES,
  BUILD_DATE,
  CHANGELOG,
  CLASSES,
  FACTIONS,
  GAME_VERSION,
  GITHUB_PAGES_URL,
  GITHUB_REPO,
  HOUSES,
  ITEMS,
  POIS,
  VERSION_NAME,
} from '../game/data';
import { S, emitUI, exportSaveJSON, importSaveJSON, toast, useUI } from '../game/store';
import { audio } from '../game/audio';
import { Btn, iconOf } from './ui';

export function Website({
  children,
  onLaunchGame,
  isFullscreen,
  onToggleFullscreen,
}: {
  children?: React.ReactNode;
  onLaunchGame: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  useUI();
  const [activeTab, setActiveTab] = useState<'home' | 'features' | 'classes' | 'world' | 'downloads' | 'controls' | 'gallery' | 'changelog'>('home');
  const [selectedClass, setSelectedClass] = useState<string>('warrior');
  const [selectedElement, setSelectedElement] = useState<'fire' | 'ice' | 'lightning' | 'earth' | 'wind'>('fire');
  const [selectedPoi, setSelectedPoi] = useState<string>('highcrown');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cls = CLASSES.find((c) => c.id === selectedClass) || CLASSES[0];

  const elements = [
    {
      id: 'fire',
      name: 'Flame Magic (Pyromancy)',
      icon: '🔥',
      color: '#ff6b35',
      ability: ABILITIES.flame_slash,
      desc: 'Harness primal heat to incinerate foes with sweeping slashes and lingering burn damage over time. Fire strikes excel against unarmored beasts and frozen adversaries.',
      tactics: 'Apply burn effects to continuously sap hostile health while dodging heavy boss strikes.',
    },
    {
      id: 'ice',
      name: 'Frost Magic (Cryomancy)',
      icon: '❄️',
      color: '#5bc0eb',
      ability: ABILITIES.frost_shield,
      desc: 'Summon crystalline barriers that absorb incoming physical and magical damage while chilling attackers with freezing reflections that impair movement and attack speed.',
      tactics: 'Activate Frost Shield prior to engaging aggressive enemy groups to reflect freezing counters.',
    },
    {
      id: 'lightning',
      name: 'Thunder Magic (Electromancy)',
      icon: '⚡',
      color: '#ffd166',
      ability: ABILITIES.thunder_slam,
      desc: 'Leap skyward and channel concentrated aether storm energy into a devastating ground slam shockwave. Deals heavy area damage and inflicts guaranteed stagger/stun.',
      tactics: 'Use Thunder Slam to instantly break hostile poise bars and trigger the vulnerable [VULN] critical strike window.',
    },
    {
      id: 'earth',
      name: 'Terra Magic (Geomancy)',
      icon: '🪨',
      color: '#8cb369',
      ability: ABILITIES.terra_wall,
      desc: 'Call upon the bedrock of the floating isles to fortify yourself with stone armor and send shockwaves through the soil, repelling enemy charges and granting stagger immunity.',
      tactics: 'Stand firm against crushing boss strikes without interruption while holding chokepoints.',
    },
    {
      id: 'wind',
      name: 'Zephyr Magic (Aeromancy)',
      icon: '🌪️',
      color: '#9bc1bc',
      ability: ABILITIES.wind_step,
      desc: 'Disperse your form into the slipstream of broken skies, dashing through hostile ranks with invulnerability frames and lingering sprint velocity.',
      tactics: 'Reposition behind blocking enemies to land devastating flanking backstabs that bypass defenses.',
    },
  ];

  const galleryItems = [
    {
      title: 'Highcrown Citadel at Dawn',
      tag: 'Kingdom Capital',
      desc: 'Walled fortress with grand castle halls, stone towers, market stalls, and the Royal Estate overlooking the southern plains.',
      icon: '👑',
      accent: '#d9a93c',
    },
    {
      title: 'Glider Flight Over Floating Isles',
      tag: 'Aerial Exploration',
      desc: 'Deploy your glider mid-jump and ride glowing aether updrafts to reach ancient floating archipelagos in the clouds.',
      icon: '🪂',
      accent: '#7fe0ff',
    },
    {
      title: 'Tactical Combat & Perfect Parries',
      tag: 'Action Combat',
      desc: 'Dynamic melee combat with frontal blocking, 0.22s timed parries, stagger reflection, poise breaks, and extended-reach polearms.',
      icon: '⚔️',
      accent: '#ff6b35',
    },
    {
      title: 'Thornwick Village & Sanctuary',
      tag: 'Moonwarden Realm',
      desc: 'Rustic timber houses, working crop fields, blacksmith forges, and the secluded plaza where Corvin Vale seeks redemption.',
      icon: '🌲',
      accent: '#6fd1a4',
    },
    {
      title: 'The Hollow Rift & Cosmic Bosses',
      tag: 'Otherworldly Dungeon',
      desc: 'Cross dimensional tears into non-Euclidean voids where the Rift Warden and ancient celestial automatons guard sky shards.',
      icon: '🌌',
      accent: '#b66bf0',
    },
    {
      title: 'Custom Player Housing & Interior Crafting',
      tag: 'Living World',
      desc: 'Acquire and decorate four houses with functional storage chests, enchanting altars, sleeping beds, and kitchen hearths.',
      icon: '🏡',
      accent: '#f2a93b',
    },
  ];

  const curElement = elements.find((e) => e.id === selectedElement) || elements[0];

  const handleDownload = (filename: string) => {
    toast(`Downloading ${filename}...`, 'unlock');
    const a = document.createElement('a');
    a.href = `./${filename}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportSave = () => {
    const data = exportSaveJSON('auto') || exportSaveJSON('1');
    if (!data) {
      toast('No save file found. Start or save a character first!', 'error');
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aetherfall_save.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Save exported to aetherfall_save.json!', 'unlock');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen text-[#efe4c8] bg-[#07060a] selection:bg-[#e3b94f]/30">
      {/* ================= STICKY NAVIGATION BAR ================= */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#100c08]/95 backdrop-blur-md shadow-2xl border-b border-[#e3b94f]/25 py-2.5' : 'bg-gradient-to-b from-[#07060a]/95 to-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <span className="text-2xl">✨</span>
            <div>
              <div className="font-bold tracking-widest text-lg sm:text-xl bg-gradient-to-r from-[#fff6d6] via-[#e3b94f] to-[#a8741f] bg-clip-text text-transparent flex items-center gap-2">
                <span>AETHERFALL</span>
                <span className="text-[11px] font-mono font-normal text-[#f6dc8a] px-1.5 py-0.5 rounded bg-[#e3b94f]/20 border border-[#e3b94f]/30">v{GAME_VERSION}</span>
              </div>
              <div className="text-[10px] text-[#b7a888] tracking-widest uppercase">The Official Game Portal · L3X STUD105</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#b7a888]">
            <button onClick={() => scrollToSection('play')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">Play Online</button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">1.0 Features</button>
            <button onClick={() => scrollToSection('classes')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">10 Classes</button>
            <button onClick={() => scrollToSection('magic')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">5 Elements</button>
            <button onClick={() => scrollToSection('world')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">World & Lore</button>
            <button onClick={() => scrollToSection('gallery')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">Gallery</button>
            <button onClick={() => scrollToSection('download')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">Download .EXE</button>
            <button onClick={() => scrollToSection('controls')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">Controls</button>
            <button onClick={() => scrollToSection('changelog')} className="hover:text-[#f6dc8a] transition-colors cursor-pointer">Updates</button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => { scrollToSection('play'); onLaunchGame(); }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#e3b94f] to-[#f6dc8a] text-[#14100c] font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#e3b94f]/20 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚔️</span> Play in Browser
            </button>
            <button
              onClick={() => handleDownload('Aetherfall-v1.0.exe')}
              className="px-3 sm:px-4 py-2 rounded-lg bg-[#251e16] border border-[#e3b94f]/40 hover:border-[#e3b94f] text-[#efe4c8] text-xs sm:text-sm font-medium hover:bg-[#33291e] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>💻</span> <span className="hidden sm:inline">Download</span> .EXE
            </button>
          </div>
        </div>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <header id="hero" className="relative min-h-[94vh] flex items-center justify-center pt-24 pb-16 overflow-hidden menu-sky">
        {/* Animated Sky Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_90%,rgba(232,148,106,0.35),transparent_65%)]" />
        <div className="isle" style={{ left: '6%', top: '22%', width: 220, height: 110, animationDelay: '0s' }} />
        <div className="isle" style={{ right: '8%', top: '28%', width: 260, height: 130, animationDelay: '2.5s' }} />
        <div className="isle" style={{ left: '26%', top: '64%', width: 140, height: 80, animationDelay: '4s' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1b140d]/85 border border-[#e3b94f]/40 text-[#f6dc8a] text-xs uppercase tracking-widest mb-6 anim-pop">
            <span>✨</span> Official Release: Version {GAME_VERSION} ({VERSION_NAME}) · {BUILD_DATE}
          </div>

          <h1 className="logo mb-2">AETHERFALL</h1>
          <h2 className="text-xl sm:text-3xl font-serif text-[#f6dc8a] tracking-widest uppercase mb-4">
            A Tale of Broken Skies
          </h2>

          <p className="max-w-2xl text-[#d4c7a8] text-base sm:text-lg leading-relaxed mb-8">
            The official open-world fantasy action RPG for web and Windows desktop.
            Unleash 5-element magic, master timed parries and poise-stagger combat, command 5 tactical companions,
            and forge your destiny across floating archipelagos and four shattered realms.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <button
              onClick={() => { scrollToSection('play'); onLaunchGame(); }}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#e3b94f] via-[#f6dc8a] to-[#d9a93c] text-[#14100c] font-bold text-base sm:text-lg tracking-wide shadow-xl shadow-[#e3b94f]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
            >
              <span>⚔️</span> Play Aetherfall in Browser
            </button>
            <button
              onClick={() => handleDownload('Aetherfall-v1.0.exe')}
              className="px-6 py-3.5 rounded-xl bg-[#1e1810]/90 border border-[#e3b94f]/50 hover:border-[#f6dc8a] text-[#efe4c8] font-bold text-base sm:text-lg hover:bg-[#2c2216] transition-all cursor-pointer flex items-center gap-2.5"
            >
              <span>💻</span> Download Standalone .EXE
            </button>
            <button
              onClick={() => handleDownload('Aetherfall-v1.0-Windows.zip')}
              className="px-5 py-3.5 rounded-xl bg-black/40 border border-[#e3b94f]/30 hover:border-[#e3b94f]/70 text-[#d4c7a8] text-sm hover:bg-black/60 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>📦</span> Windows ZIP Bundle
            </button>
          </div>

          {/* Quick Architecture Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full text-xs text-[#b7a888]">
            <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
              <span>🚀</span> 100% Unified Engine Code
            </div>
            <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
              <span>🌐</span> GitHub Pages Synchronized
            </div>
            <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
              <span>💻</span> Desktop & Web Cross-Save
            </div>
            <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
              <span>🛡️</span> Zero Dependencies Offline
            </div>
          </div>
        </div>
      </header>

      {/* ================= INTERACTIVE GAME VIEWPORT (#play) ================= */}
      <section id="play" className="py-12 px-4 max-w-7xl mx-auto">
        <div className="panel p-4 sm:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e3b94f]/25 mb-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-[#e3b94f]/20 text-[#f6dc8a] text-xl">⚔️</span>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#f6dc8a] tracking-wide flex items-center gap-2">
                  <span>PLAY AETHERFALL NOW</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40">LIVE GAME v{GAME_VERSION}</span>
                </h3>
                <p className="text-xs text-[#b7a888]">The genuine, full-featured Aetherfall game running directly in your browser. Complete 3D world, quests, combat, audio, and saves.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onToggleFullscreen}
                className="px-3.5 py-1.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-medium text-[#f6dc8a] transition-all cursor-pointer flex items-center gap-1.5"
                title="Toggle Fullscreen Canvas"
              >
                <span>{isFullscreen ? '🗗' : '⛶'}</span> {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
              </button>
              <button
                onClick={() => {
                  const muted = !audio.muted;
                  audio.setMuted(muted);
                  toast(muted ? 'Audio Muted' : 'Audio Enabled', 'info');
                  emitUI();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{audio.muted ? '🔇' : '🔊'}</span> {audio.muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={handleExportSave}
                className="px-3 py-1.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                title="Export Save File as JSON"
              >
                <span>💾</span> Export Save
              </button>
              <label className="px-3 py-1.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5">
                <span>📥</span> Import Save
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      if (importSaveJSON(text, 'auto')) {
                        toast('Save imported successfully!', 'unlock');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
              <button
                onClick={() => { S.ui.settings = true; emitUI(); }}
                className="px-3 py-1.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>⚙️</span> Settings
              </button>
            </div>
          </div>

          {/* Game Stage Container */}
          <div
            id="web-game-stage"
            className={`relative rounded-xl overflow-hidden border border-[#e3b94f]/30 bg-black ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none w-screen h-screen' : 'w-full h-[640px] max-h-[80vh]'}`}
          >
            {children}
            {isFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="absolute top-4 right-4 z-40 px-3.5 py-2 rounded-lg bg-[#14100c]/90 border border-[#e3b94f]/50 hover:border-[#f6dc8a] text-xs font-bold text-[#f6dc8a] shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🗗</span> Exit Fullscreen
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[#b7a888] gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#7fd38a] animate-pulse" />
              <span>Click into the window to lock controls (WASD move, Left Click attack, Right Click block, Space jump/glide). Press <kbd className="kbd text-[10px]">Esc</kbd> to unlock cursor or open Pause menu.</span>
            </div>
            <div>
              <span>Offline ready · Switch to standalone with </span>
              <button onClick={() => handleDownload('Aetherfall-v1.0.exe')} className="text-[#f6dc8a] underline hover:text-white cursor-pointer font-bold">Aetherfall.exe</button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 1.0 FEATURES SECTION (#features) ================= */}
      <section id="features" className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Version {GAME_VERSION} Evolution</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-4">
            Unified Game Systems & Features
          </h2>
          <p className="max-w-2xl mx-auto text-[#b7a888] text-sm sm:text-base">
            Both the web browser edition and desktop executable run the identical core engine, game logic, and asset pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
            <div>
              <div className="text-3xl mb-3">🔥❄️⚡</div>
              <h3 className="title text-lg mb-2">5-Element Magic Mastery</h3>
              <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
                Command Fire, Ice, Lightning, Earth, and Wind abilities. Burn enemies with DoTs, freeze aggressive foes with Frost Shield,
                shatter crowds with Thunder Slam, fortify with Terra Wall, or flank at blinding speed with Wind Step.
              </p>
            </div>
            <div className="text-xs text-[#f6dc8a] font-mono">5 HOTBAR SLOTS (KEYS 1-5)</div>
          </div>

          <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
            <div>
              <div className="text-3xl mb-3">🛡️⚔️💥</div>
              <h3 className="title text-lg mb-2">Tactical Stagger & Parry</h3>
              <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
                Engage in combat where timing dictates survival. Timed 0.22s perfect parries reflect 100% damage, instantly shatter enemy poise,
                and trigger a +60% counterattack bonus. Deplete poise meters for huge critical strike vulnerability.
              </p>
            </div>
            <div className="text-xs text-[#f6dc8a] font-mono">DIRECTIONAL BLOCKING & STAGGER</div>
          </div>

          <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
            <div>
              <div className="text-3xl mb-3">🧑‍🤝‍🧑🏹✨</div>
              <h3 className="title text-lg mb-2">5 Companions & Party Orders</h3>
              <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
                Recruit Corvin Vale (Spellblade) alongside Lyra, Brann, Iselle, and Kestrel. Issue real-time tactical commands:
                FOLLOW, DEFEND, ATTACK, or HOLD. Companions adapt their positioning and spellcraft to your playstyle.
              </p>
            </div>
            <div className="text-xs text-[#f6dc8a] font-mono">CYCLE ORDERS WITH KEY 'T'</div>
          </div>

          <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
            <div>
              <div className="text-3xl mb-3">✨⚗️🔨</div>
              <h3 className="title text-lg mb-2">Enchanting & Professions</h3>
              <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
                Imbue weapons at Enchanting Altars in alchemy shops or your personal home. Craft legendary arms like the Sunshard Rapier,
                Void Cleaver, and Ring of Five Winds alongside smithing, mining, herbalism, cooking, and fishing.
              </p>
            </div>
            <div className="text-xs text-[#f6dc8a] font-mono">ENCHANTING & GEAR PROGRESSION</div>
          </div>

          <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
            <div>
              <div className="text-3xl mb-3">🏰🏡🪑</div>
              <h3 className="title text-lg mb-2">Real Estate & Housing</h3>
              <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
                Purchase four distinct properties ranging from Thornwick Cottage to Saltmere Manor. Furnish with 19 interactive pieces:
                beds save and heal, chests store items, crafting stations function, and standing mirrors reopen character customization.
              </p>
            </div>
            <div className="text-xs text-[#f6dc8a] font-mono">PERSISTENT HOME CUSTOMIZATION</div>
          </div>

          <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
            <div>
              <div className="text-3xl mb-3">🌐🤝📜</div>
              <h3 className="title text-lg mb-2">Peer-to-Peer WebRTC Co-op</h3>
              <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
                Host a world with a 6-letter room code or instant URL invite. Friends join directly without servers, seeing each other move,
                emote, and chat with synced day/night and weather cycles while retaining personal quests and characters.
              </p>
            </div>
            <div className="text-xs text-[#f6dc8a] font-mono">INSTANT INVITE LINKS</div>
          </div>
        </div>
      </section>

      {/* ================= 5-ELEMENT MAGIC SHOWCASE (#magic) ================= */}
      <section id="magic" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Elemental Sorcery</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            The Five Primal Elements
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
            Channel the broken currents of the Spire into specialized combat arts.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {elements.map((el) => (
            <button
              key={el.id}
              onClick={() => setSelectedElement(el.id as any)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${selectedElement === el.id ? 'bg-[#e3b94f]/25 border-[#f6dc8a] text-[#f6dc8a] scale-105' : 'bg-[#18130d] border-[#e3b94f]/20 text-[#b7a888] hover:border-[#e3b94f]/50'}`}
            >
              <span>{el.icon}</span> {el.name.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="panel p-6 sm:p-8 max-w-4xl mx-auto border" style={{ borderColor: curElement.color + '60' }}>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="p-5 rounded-2xl flex items-center justify-center text-5xl shadow-inner" style={{ background: curElement.color + '20', border: `1px solid ${curElement.color}50` }}>
              {curElement.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold" style={{ color: curElement.color }}>{curElement.name}</h3>
                <span className="px-2 py-0.5 rounded text-xs uppercase font-mono bg-white/10">{curElement.ability.kind}</span>
              </div>

              <p className="text-[#efe4c8] text-base leading-relaxed mb-4">{curElement.desc}</p>

              <div className="card p-4 mb-4">
                <div className="font-bold text-[#f6dc8a] text-sm mb-1">Featured Ability: {curElement.ability.name} ({curElement.ability.icon})</div>
                <div className="text-xs text-[#b7a888] mb-2">{curElement.ability.desc}</div>
                <div className="flex gap-4 text-xs font-mono">
                  <span>Mana: <b className="text-blue-300">{curElement.ability.mana}</b></span>
                  <span>Cooldown: <b className="text-yellow-300">{curElement.ability.cd}s</b></span>
                  <span>Element: <b className="capitalize" style={{ color: curElement.color }}>{curElement.ability.el}</b></span>
                </div>
              </div>

              <div className="text-xs text-[#d4c7a8]">
                <b className="text-[#f6dc8a]">Combat Application:</b> {curElement.tactics}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 10 CLASSES CODEX (#classes) ================= */}
      <section id="classes" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Heroic Archetypes</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            Ten Distinct Playable Classes
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
            Choose your specialization or combine disciplines through the open skill tree.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClass(c.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all cursor-pointer ${selectedClass === c.id ? 'bg-[#e3b94f]/30 border-[#f6dc8a] text-white shadow-lg shadow-[#e3b94f]/20 scale-105' : 'bg-[#18130d] border-[#e3b94f]/20 text-[#b7a888] hover:border-[#e3b94f]/50'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="panel p-6 sm:p-8 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center text-center p-5 rounded-xl bg-black/40 border border-[#e3b94f]/20">
              <div className="text-5xl mb-3">🧙‍♂️</div>
              <h3 className="text-2xl font-bold text-[#f6dc8a] mb-1">{cls.name}</h3>
              <div className="text-xs text-[#b7a888] uppercase tracking-wider mb-4">Starting Loadout</div>

              <div className="w-full text-left space-y-2 text-xs">
                {Object.entries(cls.attrs).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="capitalize text-[#b7a888]">{k}</span>
                    <div className="w-24 bg-white/10 rounded-full h-2">
                      <div className="bg-[#e3b94f] h-2 rounded-full" style={{ width: `${Math.min(100, (Number(v) / 18) * 100)}%` }} />
                    </div>
                    <span className="font-mono font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-bold text-[#f6dc8a] mb-2">Class Overview & Role</h4>
              <p className="text-sm text-[#efe4c8] leading-relaxed mb-6">{cls.desc}</p>

              <h4 className="text-sm font-bold text-[#f6dc8a] uppercase tracking-wider mb-3">Starting Abilities</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {cls.abilities.map((abId: string) => {
                  const ab = ABILITIES[abId];
                  if (!ab) return null;
                  return (
                    <div key={abId} className="card p-3">
                      <div className="font-bold text-sm text-[#f6dc8a] flex items-center gap-1.5 mb-1">
                        <span>{ab.icon}</span> {ab.name}
                      </div>
                      <div className="text-xs text-[#b7a888] mb-1.5">{ab.desc}</div>
                      <div className="text-[10px] font-mono text-white/60">
                        Cost: {ab.mana ? `${ab.mana} MP` : `${ab.sta} SP`} · CD: {ab.cd}s
                      </div>
                    </div>
                  );
                })}
              </div>

              <h4 className="text-sm font-bold text-[#f6dc8a] uppercase tracking-wider mb-2">Starting Armament</h4>
              <div className="text-xs text-[#b7a888]">
                {Object.values(cls.equip).map((eqId: any) => ITEMS[eqId]?.name || eqId).join(' · ')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WORLD OF VALDORIA (#world) ================= */}
      <section id="world" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">The Shattered Continent</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            Valdoria: Four Realms, One Broken Sky
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
            Travel between walled keeps, misty villages, frozen fortresses, and pirate harbors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="card p-5 hover:border-[#e3b94f]/60 transition-all">
            <div className="text-3xl mb-2">👑</div>
            <h3 className="title text-lg mb-1">Highcrown Citadel</h3>
            <div className="text-xs text-[#f6dc8a] mb-2">Seat of King Aldric</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">
              Grand walled metropolis built upon the last unbroken rock of the continent. Features high ramparts, palace gates,
              bustling market stalls, royal guards, and prime real estate.
            </p>
          </div>

          <div className="card p-5 hover:border-[#e3b94f]/60 transition-all">
            <div className="text-3xl mb-2">🌲</div>
            <h3 className="title text-lg mb-1">Thornwick Village</h3>
            <div className="text-xs text-[#f6dc8a] mb-2">Home of the Moonwardens</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">
              Quiet timber village bordering the ancient Thornwood. Here, Elder Maren guides weary travelers, Corvin Vale plots
              redemption, and farmers cultivate crops under the windmill.
            </p>
          </div>

          <div className="card p-5 hover:border-[#e3b94f]/60 transition-all">
            <div className="text-3xl mb-2">❄️</div>
            <h3 className="title text-lg mb-1">Frostgate Keep</h3>
            <div className="text-xs text-[#f6dc8a] mb-2">The Kharun Dominion</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">
              Towering stone fortress carved into glacial mountain ridges. Renowned for black steel forges, mountain rams,
              and hardened warriors loyal to Lord Vorn Kharun.
            </p>
          </div>

          <div className="card p-5 hover:border-[#e3b94f]/60 transition-all">
            <div className="text-3xl mb-2">⚓</div>
            <h3 className="title text-lg mb-1">Saltmere Haven</h3>
            <div className="text-xs text-[#f6dc8a] mb-2">The Free League Ports</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">
              Bustling maritime trade post where merchants, fishermen, and smugglers convene. Explore coastal cliffs, sunken sea ruins,
              and ocean-view manors with split-level great halls.
            </p>
          </div>
        </div>
      </section>

      {/* ================= VISUAL GALLERY (#gallery) ================= */}
      <section id="gallery" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Visual Showcase</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            A World Forged in Real-Time 3D
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
            Everything in Valdoria—from waving grass blades and flowing rivers to stone castles—is procedurally rendered in Three.js.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((g, idx) => (
            <div key={idx} className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/70 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl group-hover:scale-110 transition-transform">{g.icon}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-[#f6dc8a]">{g.tag}</span>
                </div>
                <h3 className="text-lg font-bold text-[#f6dc8a] mb-2">{g.title}</h3>
                <p className="text-xs text-[#b7a888] leading-relaxed mb-4">{g.desc}</p>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[11px] text-white/50">
                <span>Procedural 3D Asset</span>
                <span style={{ color: g.accent }}>In-Game Verified</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= DESKTOP DOWNLOADS SECTION (#download) ================= */}
      <section id="download" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Standalone Windows Builds</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            Play 100% Offline with Native Executables
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-2xl mx-auto">
            Take Aetherfall with you anywhere. No web connection or browser installation required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          <div className="panel p-6 border-2 border-[#e3b94f]/40 hover:border-[#f6dc8a] flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">⚡</span>
                <span className="px-2.5 py-1 rounded bg-[#e3b94f]/20 text-[#f6dc8a] text-xs font-bold uppercase tracking-wider">Recommended</span>
              </div>
              <h3 className="text-xl font-bold text-[#f6dc8a] mb-2">Aetherfall.exe (Standalone Executable)</h3>
              <p className="text-xs text-[#b7a888] leading-relaxed mb-4">
                Single, self-extracting 64-bit Windows PE GUI executable. Double-click to play instantly in a dedicated, borderless app window.
                Includes the complete procedural audio engine, 3D world, and save file management.
              </p>
              <div className="space-y-1.5 text-xs text-[#efe4c8] mb-6">
                <div>✔ <b>Format:</b> Native Windows 64-bit PE (.exe)</div>
                <div>✔ <b>Size:</b> ~1.3 MB</div>
                <div>✔ <b>Dependencies:</b> Zero (100% Self-Contained)</div>
                <div>✔ <b>Network:</b> 100% Offline Capable</div>
              </div>
            </div>
            <button
              onClick={() => handleDownload('Aetherfall-v1.0.exe')}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#e3b94f] to-[#f6dc8a] text-[#14100c] font-bold text-sm shadow-lg shadow-[#e3b94f]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>💻</span> Download Aetherfall.exe
            </button>
          </div>

          <div className="panel p-6 border border-[#e3b94f]/30 hover:border-[#e3b94f]/70 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">📦</span>
                <span className="px-2.5 py-1 rounded bg-white/10 text-white text-xs font-bold uppercase tracking-wider">Complete Bundle</span>
              </div>
              <h3 className="text-xl font-bold text-[#f6dc8a] mb-2">Aetherfall-v1.0-Windows.zip</h3>
              <p className="text-xs text-[#b7a888] leading-relaxed mb-4">
                Full distribution archive including the standalone .exe launcher, raw self-contained index.html,
                Windows batch launcher (.bat), and offline quickstart readme.
              </p>
              <div className="space-y-1.5 text-xs text-[#efe4c8] mb-6">
                <div>✔ <b>Contents:</b> Aetherfall.exe + index.html + Launcher.bat + Readme</div>
                <div>✔ <b>Size:</b> ~758 KB</div>
                <div>✔ <b>Extraction:</b> Standard ZIP (No installer required)</div>
                <div>✔ <b>Portability:</b> Runs from USB flash drives & offline PCs</div>
              </div>
            </div>
            <button
              onClick={() => handleDownload('Aetherfall-v1.0-Windows.zip')}
              className="w-full py-3 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-[#f6dc8a] font-bold text-sm hover:bg-[#33291e] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>📦</span> Download Windows ZIP
            </button>
          </div>
        </div>

        {/* System Requirements */}
        <div className="panel p-6 max-w-4xl mx-auto">
          <h4 className="text-base font-bold text-[#f6dc8a] mb-4 uppercase tracking-wider text-center">System Requirements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#b7a888]">
            <div className="card p-4">
              <div className="font-bold text-white mb-2">Minimum Specifications (Low/Medium Presets)</div>
              <div className="space-y-1.5">
                <div><b>OS:</b> Windows 10/11 64-bit or ChromeOS / Linux / macOS</div>
                <div><b>Processor:</b> Intel Core 2 Duo 2.0 GHz / AMD Athlon 64</div>
                <div><b>Memory:</b> 4 GB RAM</div>
                <div><b>Graphics:</b> Intel HD Graphics 4000 (WebGL 2.0 capable)</div>
                <div><b>Storage:</b> 10 MB free space</div>
              </div>
            </div>

            <div className="card p-4">
              <div className="font-bold text-[#f6dc8a] mb-2">Recommended Specifications (Cinematic/God Presets)</div>
              <div className="space-y-1.5">
                <div><b>OS:</b> Windows 10/11 64-bit</div>
                <div><b>Processor:</b> Intel Core i5 / AMD Ryzen 5 or better</div>
                <div><b>Memory:</b> 8 GB RAM</div>
                <div><b>Graphics:</b> NVIDIA GTX 1050 / AMD Radeon RX 560 or better</div>
                <div><b>Storage:</b> 50 MB free space</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CONTROLS GUIDE (#controls) ================= */}
      <section id="controls" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Input Schemes</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            Full Keyboard, Mouse & Gamepad Support
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
            Remap any key in Settings → Controls. Standard Xbox and PlayStation controllers are auto-detected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="panel p-5">
            <h3 className="title text-base mb-3">Keyboard & Mouse Bindings</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5"><span>Movement</span><span><kbd className="kbd">W</kbd> <kbd className="kbd">A</kbd> <kbd className="kbd">S</kbd> <kbd className="kbd">D</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Jump / Glide (press in mid-air)</span><span><kbd className="kbd">Space</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Sprint / Crouch</span><span><kbd className="kbd">Shift</kbd> / <kbd className="kbd">C</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Light Attack Combo</span><span><kbd className="kbd">Left Mouse</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Directional Block & Perfect Parry</span><span><kbd className="kbd">Right Mouse</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Dodge Roll (Invulnerability frames)</span><span><kbd className="kbd">Q</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Abilities 1 through 5</span><span><kbd className="kbd">1</kbd> <kbd className="kbd">2</kbd> <kbd className="kbd">3</kbd> <kbd className="kbd">4</kbd> <kbd className="kbd">5</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Companion Tactical Order</span><span><kbd className="kbd">T</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Interact / Talk / Gather</span><span><kbd className="kbd">E</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Summon / Dismiss Mount</span><span><kbd className="kbd">R</kbd></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Inventory / Map / Journal</span><span><kbd className="kbd">I</kbd> / <kbd className="kbd">M</kbd> / <kbd className="kbd">J</kbd></span></div>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="title text-base mb-3">Gamepad Controller Layout</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5"><span>Movement</span><span>Left Stick</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Camera Orbit</span><span>Right Stick</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Jump & Glide</span><span><span className="glyph bg-green-700">A</span> / <span className="glyph bg-blue-700">✕</span></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Attack Combo</span><span><span className="glyph bg-blue-700">X</span> / <span className="glyph bg-pink-700">□</span> or RT</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Block & Parry</span><span>LT / L2</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Dodge Roll</span><span><span className="glyph bg-red-700">B</span> / <span className="glyph bg-red-700">○</span></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Interact</span><span><span className="glyph bg-yellow-700">Y</span> / <span className="glyph bg-green-700">△</span></span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Sprint / Mount</span><span>RB / R3</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Abilities</span><span>D-Pad</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>World Map / Codex</span><span>View / Touchpad</span></div>
              <div className="flex justify-between py-1 border-b border-white/5"><span>Pause Menu</span><span>Menu / Options</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= VERSION & CHANGELOG SECTION (#changelog) ================= */}
      <section id="changelog" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="text-center mb-10">
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Development History</div>
          <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
            Patch Notes & Release Updates
          </h2>
          <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
            Review the latest game improvements and feature releases.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {CHANGELOG.map((log) => (
            <div key={log.version} className="panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-[#e3b94f]/20 text-[#f6dc8a] text-xs font-mono font-bold">v{log.version}</span>
                  <h3 className="text-lg font-bold text-white">{log.title}</h3>
                </div>
                <span className="text-xs text-[#b7a888] font-mono">{log.date}</span>
              </div>
              <ul className="space-y-2 text-xs text-[#efe4c8]">
                {log.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#f6dc8a] mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GITHUB PAGES DEPLOYMENT & ARCHITECTURE ================= */}
      <section id="deployment" className="py-16 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
        <div className="panel p-6 sm:p-8 max-w-4xl mx-auto bg-[#100c08]/90">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🚀</span>
            <div>
              <h3 className="text-xl font-bold text-[#f6dc8a]">GitHub Pages Unified Deployment Architecture</h3>
              <p className="text-xs text-[#b7a888]">Automated continuous integration and synchronized web publishing</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#efe4c8] leading-relaxed mb-6">
            <p>
              <b>Repository:</b> <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="text-[#f6dc8a] underline">{GITHUB_REPO}</a><br />
              <b>GitHub Pages Official Domain:</b> <a href={GITHUB_PAGES_URL} target="_blank" rel="noreferrer" className="text-[#f6dc8a] underline">{GITHUB_PAGES_URL}</a>
            </p>
            <p>
              Aetherfall utilizes a single-codebase architecture where web and desktop versions share 100% identical game logic, Three.js rendering pipelines, WebAudio procedural synthesizers, and React user interfaces. Whenever commits are pushed to the <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-yellow-300">main</code> branch, GitHub Actions automatically executes the full 4-suite test harness (<code className="font-mono bg-black/40 px-1 py-0.5 rounded text-yellow-300">bash tests/run.sh</code>: 643 logic checks, world simulation, 36 UI screens, 53 gameplay loop checks), compiles the production singlefile web bundle, builds the native 64-bit Windows executable, and deploys directly to GitHub Pages.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-black/50 border border-[#e3b94f]/20 font-mono text-[11px] text-[#b7a888] space-y-1">
            <div className="text-white font-bold mb-1"># Automated GitHub Actions Workflow (.github/workflows/deploy.yml)</div>
            <div>git push origin main</div>
            <div>├── 1. Checkout & Node 22 + Python 3.12 setup</div>
            <div>├── 2. Run Test Suites (730 logic + world smoke + 36 UI + 55 play tests)</div>
            <div>├── 3. Build Unified Production Bundle (dist/index.html + dist/404.html)</div>
            <div>├── 4. Generate Standalone Executables (dist/Aetherfall-v1.0.exe)</div>
            <div>└── 5. Deploy to GitHub Pages (https://l3xstud105.github.io/Aetherfall/)</div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-12 px-4 border-t border-[#e3b94f]/25 bg-[#050407] text-center text-xs text-[#b7a888]">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <div className="text-xl font-bold tracking-widest text-[#f6dc8a]">AETHERFALL {GAME_VERSION}</div>
          <p className="max-w-lg leading-relaxed">
            A Tale of Broken Skies · Created by L3X STUD105. Powered by Three.js 0.187, React 19, Procedural WebAudio, and PeerJS.
            All procedural geometry, soundscapes, textures, and combat mechanics generated natively.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-[#f6dc8a] font-medium pt-2">
            <button onClick={() => scrollToSection('hero')} className="hover:underline cursor-pointer">Back to Top</button>
            <button onClick={() => { scrollToSection('play'); onLaunchGame(); }} className="hover:underline cursor-pointer">Play in Browser</button>
            <button onClick={() => handleDownload('Aetherfall-v1.0.exe')} className="hover:underline cursor-pointer">Download .EXE</button>
            <button onClick={() => handleDownload('Aetherfall-v1.0-Windows.zip')} className="hover:underline cursor-pointer">Download .ZIP</button>
            <button onClick={handleExportSave} className="hover:underline cursor-pointer">Export Save File</button>
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="hover:underline">GitHub Repository</a>
            <a href={GITHUB_PAGES_URL} target="_blank" rel="noreferrer" className="hover:underline">GitHub Pages</a>
          </div>
          <div className="dim text-[11px] pt-4">© 2026 L3X STUD105. All rights reserved. Official deployment: {GITHUB_PAGES_URL}</div>
        </div>
      </footer>
    </div>
  );
}
