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
  ITEMS,
  POIS,
  VERSION_NAME,
} from '../game/data';
import { S, defaultLook, emitUI, exportSaveJSON, importSaveJSON, newPlayer, toast, useUI } from '../game/store';
import { audio } from '../game/audio';
import { net } from '../game/net';

// ============================================================================
// AETHERFALL 1.0.0 — OFFICIAL WEBSITE
// Multi-page professional game portal. Navigation: Home · Discover ·
// The World · Classes · Gameplay · Community · News · Support · Account · Play
// Design system informed by docs/WEBSITE_RESEARCH.md (10 publisher study).
// ============================================================================

type Page = 'home' | 'discover' | 'world' | 'classes' | 'gameplay' | 'community' | 'news' | 'support' | 'account';

const NAV: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'discover', label: 'Discover' },
  { id: 'world', label: 'The World' },
  { id: 'classes', label: 'Classes' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'community', label: 'Community' },
  { id: 'news', label: 'News' },
  { id: 'support', label: 'Support' },
  { id: 'account', label: 'Account' },
];

interface RealmHealth {
  status: string;
  realm?: string;
  version?: string;
  onlinePlayers?: number;
  uptime?: number;
}

function useRealmStatus(): { health: RealmHealth | null; reachable: boolean } {
  const [health, setHealth] = useState<RealmHealth | null>(null);
  const [reachable, setReachable] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch('health', { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error('bad status');
        const j = (await r.json()) as RealmHealth;
        if (alive) { setHealth(j); setReachable(j.status === 'online'); }
      } catch {
        if (alive) { setHealth(null); setReachable(false); }
      }
    };
    check();
    const id = setInterval(check, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { health, reachable };
}

function RealmStatusPill({ compact }: { compact?: boolean }) {
  const { health, reachable } = useRealmStatus();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${reachable ? 'border-emerald-600/50 bg-emerald-950/60 text-emerald-300' : 'border-red-700/50 bg-red-950/50 text-red-300'}`}
      title={reachable ? `Realm: ${health?.realm || 'Aetherfall Global'} · v${health?.version || GAME_VERSION}` : 'Global realm server is not reachable from this site right now'}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${reachable ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {reachable ? (compact ? 'Online' : `Realm Online · ${health?.onlinePlayers ?? 0} playing`) : (compact ? 'Offline' : 'Realm Offline')}
    </span>
  );
}

const POI_TYPE_META: Record<string, { icon: string; label: string }> = {
  city: { icon: '👑', label: 'Capital City' },
  village: { icon: '🌲', label: 'Village' },
  town: { icon: '🏘️', label: 'Town' },
  ruin: { icon: '🏚️', label: 'Ruin' },
  fort: { icon: '🏰', label: 'Fortress' },
  cave: { icon: '🕳️', label: 'Dungeon Cave' },
  magic: { icon: '✨', label: 'Magical Site' },
  camp: { icon: '⛺', label: 'Camp' },
  wonder: { icon: '🌊', label: 'Natural Wonder' },
  sky: { icon: '🏝️', label: 'Floating Isle' },
  dimension: { icon: '🌌', label: 'Otherworldly Rift' },
};

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
  const [page, setPage] = useState<Page>('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('warrior');
  const [selectedElement, setSelectedElement] = useState<'fire' | 'ice' | 'lightning' | 'earth' | 'wind'>('fire');
  const [scrolled, setScrolled] = useState(false);
  const realm = useRealmStatus();

  // Account page state
  const [accUser, setAccUser] = useState('');
  const [accPass, setAccPass] = useState('');
  const [accBusy, setAccBusy] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const go = (p: Page) => {
    setPage(p);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const playNow = () => {
    setPage('home');
    setMobileNav(false);
    setTimeout(() => {
      const el = document.getElementById('play');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      onLaunchGame();
    }, 60);
  };

  const enterRealmWithAccount = () => {
    const username = accUser.trim();
    if (username.length < 2) {
      toast('Choose an account name of at least 2 characters.', 'error');
      return;
    }
    setAccBusy(true);
    audio.init();
    // Accounts are created on first authenticated connection; the authoritative
    // server hashes passwords (scrypt) and issues a session token.
    newPlayer(username, 'warrior', defaultLook());
    net.connectRealm(undefined, username, accPass || undefined);
    S.screen = 'boot';
    emitUI();
    toast(`Connecting to the Global Realm as ${username}…`, 'info');
    setTimeout(() => {
      setAccBusy(false);
      playNow();
    }, 350);
  };

  const cls = CLASSES.find((c) => c.id === selectedClass) || CLASSES[0];

  const elements = [
    { id: 'fire', name: 'Flame Magic (Pyromancy)', icon: '🔥', color: '#ff6b35', ability: ABILITIES.flame_slash, desc: 'Harness primal heat to incinerate foes with sweeping slashes and lingering burn damage over time. Fire strikes excel against unarmored beasts and frozen adversaries.', tactics: 'Apply burn effects to continuously sap hostile health while dodging heavy boss strikes.' },
    { id: 'ice', name: 'Frost Magic (Cryomancy)', icon: '❄️', color: '#5bc0eb', ability: ABILITIES.frost_shield, desc: 'Summon crystalline barriers that absorb incoming physical and magical damage while chilling attackers with freezing reflections that impair movement and attack speed.', tactics: 'Activate Frost Shield prior to engaging aggressive enemy groups to reflect freezing counters.' },
    { id: 'lightning', name: 'Thunder Magic (Electromancy)', icon: '⚡', color: '#ffd166', ability: ABILITIES.thunder_slam, desc: 'Leap skyward and channel concentrated aether storm energy into a devastating ground slam shockwave. Deals heavy area damage and inflicts guaranteed stagger/stun.', tactics: 'Use Thunder Slam to instantly break hostile poise bars and trigger the vulnerable [VULN] critical strike window.' },
    { id: 'earth', name: 'Terra Magic (Geomancy)', icon: '🪨', color: '#8cb369', ability: ABILITIES.terra_wall, desc: 'Call upon the bedrock of the floating isles to fortify yourself with stone armor and send shockwaves through the soil, repelling enemy charges and granting stagger immunity.', tactics: 'Stand firm against crushing boss strikes without interruption while holding chokepoints.' },
    { id: 'wind', name: 'Zephyr Magic (Aeromancy)', icon: '🌪️', color: '#9bc1bc', ability: ABILITIES.wind_step, desc: 'Disperse your form into the slipstream of broken skies, dashing through hostile ranks with invulnerability frames and lingering sprint velocity.', tactics: 'Reposition behind blocking enemies to land devastating flanking backstabs that bypass defenses.' },
  ];

  const galleryItems = [
    { title: 'Highcrown Citadel at Dawn', tag: 'Kingdom Capital', desc: 'Walled fortress with grand castle halls, stone towers, market stalls, and the Royal Estate overlooking the southern plains.', icon: '👑', accent: '#d9a93c' },
    { title: 'Glider Flight Over Floating Isles', tag: 'Aerial Exploration', desc: 'Deploy your glider mid-jump and ride glowing aether updrafts to reach ancient floating archipelagos in the clouds.', icon: '🪂', accent: '#7fe0ff' },
    { title: 'Tactical Combat & Perfect Parries', tag: 'Action Combat', desc: 'Dynamic melee combat with frontal blocking, 0.22s timed parries, stagger reflection, poise breaks, and extended-reach polearms.', icon: '⚔️', accent: '#ff6b35' },
    { title: 'Thornwick Village & Sanctuary', tag: 'Moonwarden Realm', desc: 'Rustic timber houses, working crop fields, blacksmith forges, and the secluded plaza where Corvin Vale seeks redemption.', icon: '🌲', accent: '#6fd1a4' },
    { title: 'The Hollow Rift & Cosmic Bosses', tag: 'Otherworldly Dungeon', desc: 'Cross dimensional tears into non-Euclidean voids where the Rift Warden and ancient celestial automatons guard sky shards.', icon: '🌌', accent: '#b66bf0' },
    { title: 'Custom Player Housing & Interior Crafting', tag: 'Living World', desc: 'Acquire and decorate four houses with functional storage chests, enchanting altars, sleeping beds, and kitchen hearths.', icon: '🏡', accent: '#f2a93b' },
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
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // --------------------------------------------------------------------------
  // SECTION BUILDERS (each returns JSX; pages compose them)
  // --------------------------------------------------------------------------

  const heroSection = (
    <header id="hero" className="relative min-h-[94vh] flex items-center justify-center pt-24 pb-16 overflow-hidden menu-sky">
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

        <p className="max-w-2xl text-[#d4c7a8] text-base sm:text-lg leading-relaxed mb-3">
          One World. One Realm. One Living Universe.
        </p>
        <p className="max-w-2xl text-[#b7a888] text-sm sm:text-base leading-relaxed mb-8">
          The official persistent browser MMORPG from L3X STUD105. Unleash 5-element magic, master timed parries,
          command tactical companions, and forge your legend across floating archipelagos and four shattered realms —
          alongside every other player on the global server.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <button
            onClick={playNow}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#e3b94f] via-[#f6dc8a] to-[#d9a93c] text-[#14100c] font-bold text-base sm:text-lg tracking-wide shadow-xl shadow-[#e3b94f]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
          >
            <span>⚔️</span> Play Now — Free in Browser
          </button>
          <button
            onClick={() => go('account')}
            className="px-6 py-3.5 rounded-xl bg-[#1e3a8a]/60 border border-[#60a5fa]/50 hover:border-[#93c5fd] text-[#dbeafe] font-bold text-base sm:text-lg hover:bg-[#1e3a8a]/80 transition-all cursor-pointer flex items-center gap-2.5"
          >
            <span>🌐</span> Create Account
          </button>
          <button
            onClick={() => handleDownload('Aetherfall-v1.0.exe')}
            className="px-5 py-3.5 rounded-xl bg-black/40 border border-[#e3b94f]/30 hover:border-[#e3b94f]/70 text-[#d4c7a8] text-sm hover:bg-black/60 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>💻</span> Windows .EXE
          </button>
        </div>

        <div className="mb-8"><RealmStatusPill /></div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full text-xs text-[#b7a888]">
          <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
            <span>🌐</span> Persistent Global Realm
          </div>
          <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
            <span>☁️</span> Permanent Cloud Saves
          </div>
          <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
            <span>🔐</span> Secure scrypt Accounts
          </div>
          <div className="p-3 rounded-lg bg-[#14100c]/70 border border-[#e3b94f]/20 flex items-center justify-center gap-2">
            <span>💻</span> Web + Windows Cross-Play
          </div>
        </div>
      </div>
    </header>
  );

  // NOTE: the play section is ALWAYS mounted (even when hidden) so the live
  // WebGL canvas and network session are never torn down by navigation.
  const playSection = (
    <section id="play" className="py-12 px-4 max-w-7xl mx-auto">
      <div className="panel p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e3b94f]/25 mb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-[#e3b94f]/20 text-[#f6dc8a] text-xl">⚔️</span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#f6dc8a] tracking-wide flex items-center gap-2 flex-wrap">
                <span>PLAY AETHERFALL NOW</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40">LIVE GAME v{GAME_VERSION}</span>
                <RealmStatusPill compact />
              </h3>
              <p className="text-xs text-[#b7a888]">The genuine, full-featured Aetherfall MMORPG running directly in your browser. Complete 3D world, quests, combat, audio, and cloud saves.</p>
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
              title="Export offline save file as JSON"
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
            <span>Online progress saves to the cloud automatically · Offline campaign via </span>
            <button onClick={() => handleDownload('Aetherfall-v1.0.exe')} className="text-[#f6dc8a] underline hover:text-white cursor-pointer font-bold">Aetherfall.exe</button>
          </div>
        </div>
      </div>
    </section>
  );

  const featuresSection = (
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
            <div className="text-3xl mb-3">🌐☁️🔐</div>
            <h3 className="title text-lg mb-2">Global Realm & Cloud Saves</h3>
            <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
              One persistent universe for every player. Server-authoritative accounts with scrypt password hashing,
              session tokens, and automatic cloud persistence for characters, inventories, quests, guilds, and housing.
            </p>
          </div>
          <div className="text-xs text-[#f6dc8a] font-mono">ONE WORLD · ONE REALM</div>
        </div>

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
            <h3 className="title text-lg mb-2">Companions, Guilds & Parties</h3>
            <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
              Recruit Corvin Vale (Spellblade) alongside Lyra, Brann, Iselle, and Kestrel — or band with real players.
              Found guilds with shared treasuries, ranks, and MOTD; party up for dungeons and world bosses.
            </p>
          </div>
          <div className="text-xs text-[#f6dc8a] font-mono">SOCIAL SYSTEMS & GUILD BANKS</div>
        </div>

        <div className="card p-6 flex flex-col justify-between hover:border-[#e3b94f]/60 transition-all">
          <div>
            <div className="text-3xl mb-3">✨⚗️🔨</div>
            <h3 className="title text-lg mb-2">Enchanting, Professions & Economy</h3>
            <p className="text-sm text-[#b7a888] leading-relaxed mb-4">
              Imbue weapons at Enchanting Altars, craft legendary arms like the Sunshard Rapier and Void Cleaver, then trade them on the
              global marketplace with secure, transaction-safe listings and full trade history.
            </p>
          </div>
          <div className="text-xs text-[#f6dc8a] font-mono">PLAYER-DRIVEN MARKETPLACE</div>
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
      </div>
    </section>
  );

  const magicSection = (
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
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-2xl font-bold" style={{ color: curElement.color }}>{curElement.name}</h3>
              <span className="px-2 py-0.5 rounded text-xs uppercase font-mono bg-white/10">{curElement.ability.kind}</span>
            </div>

            <p className="text-[#efe4c8] text-base leading-relaxed mb-4">{curElement.desc}</p>

            <div className="card p-4 mb-4">
              <div className="font-bold text-[#f6dc8a] text-sm mb-1">Featured Ability: {curElement.ability.name} ({curElement.ability.icon})</div>
              <div className="text-xs text-[#b7a888] mb-2">{curElement.ability.desc}</div>
              <div className="flex gap-4 text-xs font-mono flex-wrap">
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
  );

  const gallerySection = (
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
  );

  const worldSection = (
    <section id="world" className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">The Shattered Continent</div>
        <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-3">
          Valdoria: Four Realms, One Broken Sky
        </h2>
        <p className="text-[#b7a888] text-sm sm:text-base max-w-xl mx-auto">
          Travel between walled keeps, misty villages, frozen fortresses, and pirate harbors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
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

      {/* World & Lore Encyclopedia — POI directory */}
      <div className="mb-14">
        <h3 className="text-xl sm:text-2xl font-serif text-[#f6dc8a] tracking-wide mb-2 text-center">World Atlas — Points of Interest</h3>
        <p className="text-[#b7a888] text-sm text-center mb-6 max-w-2xl mx-auto">
          Every discoverable location in the persistent world. Discovery grants experience and permanent map markers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {POIS.map((p: any) => {
            const meta = POI_TYPE_META[p.type] || { icon: '📍', label: p.type };
            return (
              <div key={p.id} className="card px-4 py-3 flex items-center gap-3 hover:border-[#e3b94f]/50 transition-all">
                <span className="text-2xl">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#efe4c8] truncate">{p.name}</div>
                  <div className="text-[11px] text-[#b7a888]">{meta.label} · Discovery +{p.xp} XP</div>
                </div>
                {p.hidden && <span className="text-[10px] px-2 py-0.5 rounded bg-[#b66bf0]/20 text-[#d3a6ff] border border-[#b66bf0]/40 uppercase font-mono">Hidden</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Factions */}
      <div>
        <h3 className="text-xl sm:text-2xl font-serif text-[#f6dc8a] tracking-wide mb-2 text-center">The Powers of Valdoria</h3>
        <p className="text-[#b7a888] text-sm text-center mb-6 max-w-2xl mx-auto">
          Six factions remember your deeds. Reputation changes prices, dialogue, and who will even speak to you.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(FACTIONS).map(([id, f]) => (
            <div key={id} className="card p-5 border-l-4" style={{ borderLeftColor: f.color }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: f.color }} />
                <h4 className="font-bold text-[#efe4c8]">{f.name}</h4>
              </div>
              <p className="text-xs text-[#b7a888] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const classesSection = (
    <section id="classes" className="py-16 px-4 max-w-7xl mx-auto">
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
  );

  const controlsSection = (
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
  );

  const downloadsSection = (
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

      <div className="panel p-6 max-w-4xl mx-auto">
        <h4 className="text-base font-bold text-[#f6dc8a] mb-4 uppercase tracking-wider text-center">System Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#b7a888]">
          <div className="card p-4">
            <div className="font-bold text-white mb-2">Minimum Specifications (Chromebook-Friendly / Low Presets)</div>
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
  );

  const changelogSection = (
    <section id="changelog" className="py-16 px-4 max-w-7xl mx-auto">
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
  );

  const communityPage = (
    <section className="py-16 px-4 max-w-7xl mx-auto min-h-[70vh]">
      <div className="text-center mb-12">
        <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">One World · One Realm</div>
        <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-4">The Aetherfall Community</h2>
        <p className="max-w-2xl mx-auto text-[#b7a888] text-sm sm:text-base">
          Every online player shares a single persistent global realm. Status below is reported live by the authoritative server — never simulated.
        </p>
      </div>

      {/* Live server status */}
      <div className="panel p-6 sm:p-8 max-w-4xl mx-auto mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛰️</span>
            <div>
              <h3 className="text-lg font-bold text-[#f6dc8a]">Global Realm Status</h3>
              <p className="text-xs text-[#b7a888]">Live from the authoritative server · refreshes every 20s</p>
            </div>
          </div>
          <RealmStatusPill />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="card p-4">
            <div className="text-2xl font-bold text-[#f6dc8a]">{realm.reachable ? (realm.health?.onlinePlayers ?? 0) : '—'}</div>
            <div className="text-[11px] uppercase tracking-wider text-[#b7a888]">Players Online</div>
          </div>
          <div className="card p-4">
            <div className="text-lg font-bold text-[#f6dc8a]">{realm.reachable ? (realm.health?.version || GAME_VERSION) : '—'}</div>
            <div className="text-[11px] uppercase tracking-wider text-[#b7a888]">Realm Version</div>
          </div>
          <div className="card p-4">
            <div className="text-lg font-bold text-[#f6dc8a]">
              {realm.reachable && typeof realm.health?.uptime === 'number'
                ? `${Math.floor(realm.health.uptime / 3600)}h ${Math.floor((realm.health.uptime % 3600) / 60)}m`
                : '—'}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-[#b7a888]">Realm Uptime</div>
          </div>
          <div className="card p-4">
            <div className={`text-lg font-bold ${realm.reachable ? 'text-emerald-400' : 'text-red-400'}`}>{realm.reachable ? 'STABLE' : 'UNREACHABLE'}</div>
            <div className="text-[11px] uppercase tracking-wider text-[#b7a888]">Service State</div>
          </div>
        </div>
        {!realm.reachable && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-700/40 text-xs text-red-200">
            The global realm server cannot be reached from this page. If you are viewing the static GitHub Pages mirror, online play requires the realm server to be running; the offline campaign remains fully playable via Play Now or the Windows build.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
        <div className="card p-6">
          <div className="text-3xl mb-3">🛡️</div>
          <h3 className="title text-lg mb-2">Guilds</h3>
          <p className="text-xs text-[#b7a888] leading-relaxed mb-3">
            Found a guild with a custom name and 2–5 letter tag. Recruit members, assign ranks, set a message of the day,
            and fund a shared guild treasury with transaction-safe deposits and withdrawals.
          </p>
          <div className="text-[11px] font-mono text-[#f6dc8a]">GUILD BANKS · RANKS · MOTD</div>
        </div>
        <div className="card p-6">
          <div className="text-3xl mb-3">🎉</div>
          <h3 className="title text-lg mb-2">Events Calendar</h3>
          <p className="text-xs text-[#b7a888] leading-relaxed mb-3">
            The living world runs on a 144-second full day/night cycle with dynamic weather, seasonal shifts, and roaming world bosses.
            Moonpetals bloom only at night; the Hollow Rift opens for seasoned adventurers.
          </p>
          <div className="text-[11px] font-mono text-[#f6dc8a]">DYNAMIC EVENTS · WORLD BOSSES</div>
        </div>
        <div className="card p-6">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="title text-lg mb-2">Social & Trading</h3>
          <p className="text-xs text-[#b7a888] leading-relaxed mb-3">
            Global chat, emotes, player inspection, direct trading, and a secure global marketplace with listing history.
            Every trade is validated server-side and written to the authoritative ledger.
          </p>
          <div className="text-[11px] font-mono text-[#f6dc8a]">CHAT · EMOTES · MARKETPLACE</div>
        </div>
      </div>

      <div className="panel p-6 max-w-4xl mx-auto text-center">
        <h3 className="text-lg font-bold text-[#f6dc8a] mb-2">Join the Realm</h3>
        <p className="text-xs text-[#b7a888] mb-4 max-w-xl mx-auto">
          Create a free account and your characters, progression, housing, and guild membership persist in the cloud — return anytime, from any device.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => go('account')} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#e3b94f] to-[#f6dc8a] text-[#14100c] font-bold text-sm hover:scale-105 transition-all cursor-pointer">Create Account</button>
          <button onClick={playNow} className="px-5 py-2.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-[#f6dc8a] font-bold text-sm transition-all cursor-pointer">Play Now</button>
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-[#f6dc8a] font-bold text-sm transition-all">GitHub Community</a>
        </div>
      </div>
    </section>
  );

  const supportPage = (
    <section className="py-16 px-4 max-w-5xl mx-auto min-h-[70vh]">
      <div className="text-center mb-12">
        <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Player Support</div>
        <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-4">Guides, FAQ & Assistance</h2>
        <p className="max-w-2xl mx-auto text-[#b7a888] text-sm sm:text-base">
          Everything you need to begin — and where to turn when the Broken Skies test you.
        </p>
      </div>

      <div className="panel p-6 sm:p-8 mb-8">
        <h3 className="text-xl font-bold text-[#f6dc8a] mb-4 flex items-center gap-2"><span>🧭</span> New Player Guide</h3>
        <ol className="space-y-3 text-sm text-[#efe4c8] list-none">
          <li className="flex gap-3"><span className="text-[#f6dc8a] font-bold">1.</span><span><b>Create an account</b> on the <button className="text-[#f6dc8a] underline cursor-pointer" onClick={() => go('account')}>Account page</button> — your characters persist in the cloud automatically.</span></li>
          <li className="flex gap-3"><span className="text-[#f6dc8a] font-bold">2.</span><span><b>Press Play Now</b> and choose the Global Realm. Your first character is created on first login; more can be added to the same account.</span></li>
          <li className="flex gap-3"><span className="text-[#f6dc8a] font-bold">3.</span><span><b>Learn the rhythm of combat:</b> block with Right Mouse, parry inside the 0.22s window, and dodge-roll with <kbd className="kbd">Q</kbd> through heavy strikes.</span></li>
          <li className="flex gap-3"><span className="text-[#f6dc8a] font-bold">4.</span><span><b>Follow the main quest</b> from your journal (<kbd className="kbd">J</kbd>) — it introduces Highcrown, your first companion, and the mystery of the Spire.</span></li>
          <li className="flex gap-3"><span className="text-[#f6dc8a] font-bold">5.</span><span><b>Discover points of interest</b> for bonus XP, gather resources for professions, and bank your earnings at any storage chest.</span></li>
          <li className="flex gap-3"><span className="text-[#f6dc8a] font-bold">6.</span><span><b>Join or found a guild</b>, list crafts on the marketplace, and take on world bosses with a party when you reach the mid-levels.</span></li>
        </ol>
      </div>

      <div className="panel p-6 sm:p-8 mb-8">
        <h3 className="text-xl font-bold text-[#f6dc8a] mb-4 flex items-center gap-2"><span>❓</span> Frequently Asked Questions</h3>
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-bold text-[#efe4c8] mb-1">Is Aetherfall free to play?</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">Yes. The full MMORPG runs free in your browser — no download, no subscription. A standalone Windows build is also free for offline play.</p>
          </div>
          <div>
            <div className="font-bold text-[#efe4c8] mb-1">Do I need to install anything?</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">No. The game runs on Chrome, Edge, Firefox, and supported Chromebooks using WebGL2. A Windows .EXE is optionally available on the Gameplay page.</p>
          </div>
          <div>
            <div className="font-bold text-[#efe4c8] mb-1">How is my progress saved?</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">Online characters save automatically to the authoritative server after important transactions and at regular intervals. Offline campaign saves live in your browser and can be exported/imported as JSON. The two are kept strictly separate.</p>
          </div>
          <div>
            <div className="font-bold text-[#efe4c8] mb-1">Is my password safe?</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">Passwords are hashed server-side with memory-hard scrypt and sessions use rotating tokens. Plaintext passwords are never stored or logged.</p>
          </div>
          <div>
            <div className="font-bold text-[#efe4c8] mb-1">The realm status shows Offline — can I still play?</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">Yes. The offline campaign (single-player) works without any server. Online features — the global realm, marketplace, and guilds — require the realm server to be reachable.</p>
          </div>
          <div>
            <div className="font-bold text-[#efe4c8] mb-1">How do I report a bug or a player?</div>
            <p className="text-xs text-[#b7a888] leading-relaxed">
              Open an issue on the <a className="text-[#f6dc8a] underline" href={`${GITHUB_REPO}/issues`} target="_blank" rel="noreferrer">GitHub issue tracker</a> with steps to reproduce.
              In-game, player reports can be filed through the social panel and are recorded in the server-side moderation log.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="font-bold text-[#f6dc8a] mb-2">⚙️ Performance Help</h4>
          <p className="text-xs text-[#b7a888] leading-relaxed mb-3">
            Running on a Chromebook or older hardware? Open Settings → Graphics and select the Low preset: it reduces draw distance,
            shadows, and particle density while preserving every gameplay system. Frame-rate friendly presets never lock content behind hardware.
          </p>
          <button onClick={() => { S.ui.settings = true; emitUI(); }} className="px-4 py-2 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-bold text-[#f6dc8a] cursor-pointer">Open Graphics Settings</button>
        </div>
        <div className="card p-6">
          <h4 className="font-bold text-[#f6dc8a] mb-2">🛟 Account & Recovery</h4>
          <p className="text-xs text-[#b7a888] leading-relaxed mb-3">
            Your account is identified by the name and password you registered. Sessions expire automatically; simply log in again.
            Keep your password safe — it is the only recovery credential by design (we collect no personal data).
          </p>
          <button onClick={() => go('account')} className="px-4 py-2 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-bold text-[#f6dc8a] cursor-pointer">Go to Account</button>
        </div>
      </div>
    </section>
  );

  const accountPage = (
    <section className="py-16 px-4 max-w-5xl mx-auto min-h-[70vh]">
      <div className="text-center mb-12">
        <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-2">Aetherfall Account</div>
        <h2 className="text-2xl sm:text-4xl font-serif text-[#f6dc8a] tracking-wide mb-4">One Account. Every Realm.</h2>
        <p className="max-w-2xl mx-auto text-[#b7a888] text-sm sm:text-base">
          Register or sign in below — you will be carried straight into the global realm. New account names are registered automatically on first sign-in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="panel p-6 sm:p-8">
          <h3 className="text-lg font-bold text-[#f6dc8a] mb-1 flex items-center gap-2"><span>🔐</span> Sign In / Register</h3>
          <p className="text-[11px] text-[#b7a888] mb-5">Secured with memory-hard scrypt hashing and expiring session tokens.</p>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => { e.preventDefault(); enterRealmWithAccount(); }}
          >
            <label className="text-xs text-[#b7a888] uppercase tracking-wider">
              Account Name
              <input
                className="input mt-1"
                value={accUser}
                onChange={(e) => setAccUser(e.target.value)}
                placeholder="e.g. SkybornKnight"
                minLength={2}
                maxLength={20}
                autoComplete="username"
                required
              />
            </label>
            <label className="text-xs text-[#b7a888] uppercase tracking-wider">
              Password {accPass.length === 0 && <span className="normal-case text-white/40">(optional for quick play)</span>}
              <input
                className="input mt-1"
                type="password"
                value={accPass}
                onChange={(e) => setAccPass(e.target.value)}
                placeholder="Set a password to protect your account"
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              disabled={accBusy}
              className="mt-2 py-3 rounded-lg bg-gradient-to-r from-[#e3b94f] to-[#f6dc8a] text-[#14100c] font-bold text-sm shadow-lg shadow-[#e3b94f]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {accBusy ? 'Connecting…' : '🌐 Enter the Global Realm'}
            </button>
          </form>
          <div className="mt-4 text-[11px] text-[#b7a888] leading-relaxed">
            By signing in you agree to fair play. We collect no email or personal data — your account name and hashed password are the entirety of your identity.
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h4 className="font-bold text-[#f6dc8a] mb-2 text-sm">☁️ What persists in the cloud</h4>
            <ul className="text-xs text-[#b7a888] space-y-1.5">
              <li>✔ Characters, class, level, attributes & skills</li>
              <li>✔ Equipment, inventory, gold & marketplace listings</li>
              <li>✔ Quests, reputation & achievement progression</li>
              <li>✔ Guild membership & treasury contributions</li>
              <li>✔ World location — resume exactly where you left off</li>
            </ul>
          </div>
          <div className="card p-5">
            <h4 className="font-bold text-[#f6dc8a] mb-2 text-sm">🛡️ Account security</h4>
            <ul className="text-xs text-[#b7a888] space-y-1.5">
              <li>✔ scrypt memory-hard password hashing</li>
              <li>✔ Rotating session tokens with expiration</li>
              <li>✔ Server-side validation of every transaction</li>
              <li>✔ Rate-limited authentication attempts</li>
            </ul>
          </div>
          <div className="card p-5">
            <h4 className="font-bold text-[#f6dc8a] mb-2 text-sm">👥 Multiple characters</h4>
            <p className="text-xs text-[#b7a888] leading-relaxed">
              One account can hold several characters across different classes. Select or create characters from the in-game realm lobby after signing in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const deploymentSection = (
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
            Aetherfall utilizes a single-codebase architecture where web and desktop versions share 100% identical game logic, Three.js rendering pipelines, WebAudio procedural synthesizers, and React user interfaces. Whenever commits are pushed to the <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-yellow-300">main</code> branch, GitHub Actions automatically executes the full test harness, compiles the production web bundle, builds the native 64-bit Windows executable, and deploys directly to GitHub Pages.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-black/50 border border-[#e3b94f]/20 font-mono text-[11px] text-[#b7a888] space-y-1">
          <div className="text-white font-bold mb-1"># Automated GitHub Actions Workflow (.github/workflows/deploy.yml)</div>
          <div>git push origin main</div>
          <div>├── 1. Checkout & Node 22 + Python 3.12 setup</div>
          <div>├── 2. Run Test Suites (logic + world smoke + UI + play tests)</div>
          <div>├── 3. Build Unified Production Bundle (dist/index.html + dist/404.html)</div>
          <div>├── 4. Generate Standalone Executables (dist/Aetherfall-v1.0.exe)</div>
          <div>└── 5. Deploy to GitHub Pages ({GITHUB_PAGES_URL})</div>
        </div>
      </div>
    </section>
  );

  const newsTeaser = (
    <section className="py-14 px-4 max-w-7xl mx-auto border-t border-[#e3b94f]/15">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-[#e3b94f] text-sm uppercase tracking-widest font-bold mb-1">Latest Announcements</div>
          <h2 className="text-xl sm:text-3xl font-serif text-[#f6dc8a] tracking-wide">From the Development Desk</h2>
        </div>
        <button onClick={() => go('news')} className="px-4 py-2 rounded-lg bg-[#241c14] border border-[#e3b94f]/40 hover:border-[#f6dc8a] text-xs font-bold text-[#f6dc8a] cursor-pointer">View All News →</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CHANGELOG.slice(0, 2).map((log) => (
          <div key={log.version} className="card p-5 hover:border-[#e3b94f]/60 transition-all cursor-pointer" onClick={() => go('news')}>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-[#e3b94f]/20 text-[#f6dc8a] text-[10px] font-mono font-bold">v{log.version}</span>
              <span className="text-[11px] text-[#b7a888] font-mono">{log.date}</span>
            </div>
            <h3 className="font-bold text-[#efe4c8] mb-1.5">{log.title}</h3>
            <p className="text-xs text-[#b7a888] leading-relaxed">{log.highlights[0]}</p>
          </div>
        ))}
      </div>
    </section>
  );

  // --------------------------------------------------------------------------
  // PAGE COMPOSITION
  // --------------------------------------------------------------------------
  const homePage = (
    <>
      {heroSection}
      {newsTeaser}
      {deploymentSection}
    </>
  );

  const discoverPage = (
    <div className="pt-16">
      {featuresSection}
      {magicSection}
      {gallerySection}
    </div>
  );

  const gameplayPage = (
    <div className="pt-16">
      {controlsSection}
      {downloadsSection}
    </div>
  );

  return (
    <div className="min-h-screen text-[#efe4c8] bg-[#07060a] selection:bg-[#e3b94f]/30">
      {/* ================= STICKY NAVIGATION BAR ================= */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || page !== 'home' ? 'bg-[#100c08]/95 backdrop-blur-md shadow-2xl border-b border-[#e3b94f]/25 py-2.5' : 'bg-gradient-to-b from-[#07060a]/95 to-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => go('home')}>
            <span className="text-2xl">✨</span>
            <div>
              <div className="font-bold tracking-widest text-lg sm:text-xl bg-gradient-to-r from-[#fff6d6] via-[#e3b94f] to-[#a8741f] bg-clip-text text-transparent flex items-center gap-2">
                <span>AETHERFALL</span>
                <span className="text-[11px] font-mono font-normal text-[#f6dc8a] px-1.5 py-0.5 rounded bg-[#e3b94f]/20 border border-[#e3b94f]/30">v{GAME_VERSION}</span>
              </div>
              <div className="text-[10px] text-[#b7a888] tracking-widest uppercase hidden sm:block">The Official Game Portal · L3X STUD105</div>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-5 text-sm font-medium">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`transition-colors cursor-pointer ${page === n.id ? 'text-[#f6dc8a] border-b-2 border-[#e3b94f] pb-0.5' : 'text-[#b7a888] hover:text-[#f6dc8a]'}`}
              >
                {n.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block"><RealmStatusPill compact /></div>
            <button
              onClick={playNow}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#e3b94f] to-[#f6dc8a] text-[#14100c] font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#e3b94f]/20 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚔️</span> Play Now
            </button>
            {/* Mobile hamburger */}
            <button
              className="xl:hidden px-3 py-2 rounded-lg bg-[#251e16] border border-[#e3b94f]/40 text-[#efe4c8] cursor-pointer"
              onClick={() => setMobileNav((m) => !m)}
              aria-label="Toggle navigation menu"
            >
              {mobileNav ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {mobileNav && (
          <div className="xl:hidden mt-2 mx-4 rounded-xl bg-[#100c08]/98 border border-[#e3b94f]/30 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-2 gap-1 p-3">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-all cursor-pointer ${page === n.id ? 'bg-[#e3b94f]/25 text-[#f6dc8a] border border-[#e3b94f]/50' : 'text-[#b7a888] hover:bg-white/5 border border-transparent'}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <div className="px-4 pb-3"><RealmStatusPill compact /></div>
          </div>
        )}
      </nav>

      {/* ================= PAGE ROUTER ================= */}
      {page === 'home' && homePage}
      {page === 'discover' && discoverPage}
      {page === 'world' && <div className="pt-16">{worldSection}</div>}
      {page === 'classes' && <div className="pt-16">{classesSection}</div>}
      {page === 'gameplay' && gameplayPage}
      {page === 'community' && <div className="pt-16">{communityPage}</div>}
      {page === 'news' && <div className="pt-16">{changelogSection}</div>}
      {page === 'support' && <div className="pt-16">{supportPage}</div>}
      {page === 'account' && <div className="pt-16">{accountPage}</div>}

      {/* Play viewport stays mounted across all pages (hidden when not Home) */}
      <div style={{ display: page === 'home' ? 'block' : 'none' }}>
        {playSection}
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="py-12 px-4 border-t border-[#e3b94f]/25 bg-[#050407] text-xs text-[#b7a888]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8 text-left">
          <div>
            <div className="text-[#f6dc8a] font-bold tracking-widest mb-3">AETHERFALL</div>
            <p className="leading-relaxed text-[11px]">
              A Tale of Broken Skies · v{GAME_VERSION} ({VERSION_NAME}). One World. One Realm. One Living Universe.
            </p>
            <div className="mt-3"><RealmStatusPill compact /></div>
          </div>
          <div>
            <div className="text-[#f6dc8a] font-bold tracking-widest mb-3">GAME</div>
            <div className="flex flex-col gap-2">
              <button onClick={() => go('discover')} className="text-left hover:text-[#f6dc8a] cursor-pointer">Discover</button>
              <button onClick={() => go('world')} className="text-left hover:text-[#f6dc8a] cursor-pointer">The World</button>
              <button onClick={() => go('classes')} className="text-left hover:text-[#f6dc8a] cursor-pointer">Classes</button>
              <button onClick={() => go('gameplay')} className="text-left hover:text-[#f6dc8a] cursor-pointer">Gameplay & Downloads</button>
            </div>
          </div>
          <div>
            <div className="text-[#f6dc8a] font-bold tracking-widest mb-3">PLAYERS</div>
            <div className="flex flex-col gap-2">
              <button onClick={() => go('community')} className="text-left hover:text-[#f6dc8a] cursor-pointer">Community & Realm Status</button>
              <button onClick={() => go('news')} className="text-left hover:text-[#f6dc8a] cursor-pointer">News & Patch Notes</button>
              <button onClick={() => go('support')} className="text-left hover:text-[#f6dc8a] cursor-pointer">Support & FAQ</button>
              <button onClick={() => go('account')} className="text-left hover:text-[#f6dc8a] cursor-pointer">Account</button>
            </div>
          </div>
          <div>
            <div className="text-[#f6dc8a] font-bold tracking-widest mb-3">DEVELOPER</div>
            <div className="flex flex-col gap-2">
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="hover:text-[#f6dc8a]">GitHub Repository</a>
              <a href={`${GITHUB_REPO}/issues`} target="_blank" rel="noreferrer" className="hover:text-[#f6dc8a]">Report an Issue</a>
              <a href={GITHUB_PAGES_URL} target="_blank" rel="noreferrer" className="hover:text-[#f6dc8a]">GitHub Pages Mirror</a>
              <button onClick={handleExportSave} className="text-left hover:text-[#f6dc8a] cursor-pointer">Export Offline Save</button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>© 2026 L3X STUD105. All rights reserved. Aetherfall and A Tale of Broken Skies are original works.</div>
          <div className="flex items-center gap-4">
            <button onClick={() => go('home')} className="hover:text-[#f6dc8a] cursor-pointer">Back to Top</button>
            <button onClick={playNow} className="hover:text-[#f6dc8a] cursor-pointer font-bold">⚔️ Play Now</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
