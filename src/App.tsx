import { useEffect, useRef, useState } from 'react';
import { S, emitUI, loadSettings, useUI } from './game/store';
import { startGame, api } from './game/game';
import { net } from './game/net';
import { audio } from './game/audio';
import { Codex } from './ui/Codex';
import { Confirm, DeadScreen, Hud, PauseMenu } from './ui/Hud';
import { Creator, Ending, Intro, MainMenu, Settings } from './ui/Menus';
import { Dialogue, HouseEdit, HouseSale, InspectModal, Multiplayer, Shop, Stable, Storage, TradeWindow } from './ui/Panels';
import { TipHost } from './ui/ui';
import { Website } from './ui/Website';

const TIPS = ['Press Space again in mid-air to glide. Aether updrafts carry you to the floating isles.', 'Crouch to sneak. Rogues are nearly invisible in shadow.', 'Reputation changes prices, dialogue and who will even speak to you.', 'Beds save your game. Own a home to craft at your own forge.', 'Companions never die — they retreat. Treat them well and they grow loyal.', 'The sky changes with the seasons. Moonpetals only bloom at night.'];

export default function App() {
  useUI(); const canvasRef = useRef<HTMLCanvasElement>(null); const booting = useRef(false); const joined = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { loadSettings(); emitUI(); const unlock = () => audio.init(); window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true }); }, []);
  useEffect(() => {
    if (S.screen === 'boot' && !booting.current && canvasRef.current) { booting.current = true; startGame(canvasRef.current).catch((e) => { console.error(e); S.ui.loading = { pct: 0, text: 'Failed to start: ' + (e?.message || e) }; emitUI(); }).finally(() => { booting.current = false; }); }
    if (S.screen === 'game' && !joined.current) { joined.current = true; const code = new URLSearchParams(location.search).get('join'); if (code && net.status === 'offline') setTimeout(() => net.join(code), 800); }
  });

  const toggleFullscreen = () => {
    setIsFullscreen((f) => {
      const next = !f;
      setTimeout(() => api.resize?.(), 50);
      return next;
    });
  };

  const launchGame = () => {
    const el = document.getElementById('play');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const sc = S.screen; const ui = S.ui; const inGame = sc === 'game' || sc === 'ending';
  return (
    <Website
      onLaunchGame={launchGame}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    >
      <div id="af-root" className={`${S.settings.contrast ? 'hc' : ''} ${S.settings.reduceMotion ? 'reduce' : ''}`} style={{ ['--scale' as any]: S.settings.uiScale }}>
        <canvas id="af-canvas" ref={canvasRef} tabIndex={-1} style={{ visibility: sc === 'game' || sc === 'boot' || sc === 'ending' ? 'visible' : 'hidden' }} />
        {inGame && <div id="af-grade" />}
        {sc === 'menu' && <MainMenu />}
        {sc === 'creator' && <Creator />}
        {sc === 'intro' && <Intro onDone={() => { S.screen = 'boot'; emitUI(); }} />}
        {sc === 'game' && <Hud />}
        {sc === 'game' && ui.codex && <Codex />}
        {sc === 'game' && ui.dialogue && <Dialogue />}
        {sc === 'game' && ui.shop && <Shop />}
        {sc === 'game' && ui.stable && <Stable />}
        {sc === 'game' && ui.houseSale && <HouseSale />}
        {sc === 'game' && ui.houseEdit && <HouseEdit />}
        {sc === 'game' && ui.storage && <Storage />}
        {sc === 'game' && ui.pause && <PauseMenu />}
        {sc === 'game' && ui.dead && <DeadScreen />}
        {ui.mp && <Multiplayer />}
        {sc === 'game' && ui.trade && <TradeWindow />}
        {sc === 'game' && ui.inspect && <InspectModal />}
        {sc === 'ending' && <Ending />}
        {ui.settings && <Settings />}
        <Confirm />
        {ui.loading && <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 anim-fade" style={{ zIndex: 80, background: 'radial-gradient(ellipse at center, #1a1030, #04030a)' }}><div className="logo" style={{ fontSize: '3em' }}>AETHERFALL</div><div className="eyebrow" style={{ fontSize: '0.8em' }}>{ui.loading.text}</div><div className="bar" style={{ width: 380, height: 10, borderRadius: 999 }}><i style={{ width: ui.loading.pct + '%', background: 'linear-gradient(90deg,#b8902a,#ffe27a)' }} /></div><div className="divider-orn" style={{ width: 380 }}><span>✦ ✦ ✦</span></div><div className="dim" style={{ maxWidth: 480, textAlign: 'center', fontSize: '0.9em', fontStyle: 'italic' }}>{TIPS[Math.floor(ui.loading.pct / 17) % TIPS.length]}</div></div>}
        <TipHost />
      </div>
    </Website>
  );
}
