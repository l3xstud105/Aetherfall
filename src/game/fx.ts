import * as THREE from 'three';
import { PRESETS } from './data';
import { S } from './store';
import { SEASON_MATS, WIND, clamp, lerp, smooth } from './world';
import { ST } from './structures';
import { audio } from './audio';

export const G: any = { dt: 0, t: 0, player: null, npcs: [], enemies: [], animals: [], projectiles: [], inter: [], remotes: new Map(), cam: { yaw: 0, pitch: 0.35, dist: 5 }, weather: { type: 'clear', t: 0, next: 90, k: 0 }, flash: 0 };
export const cfg = (): any => ({ ...PRESETS[S.settings.preset] || PRESETS.Cinematic, ...S.settings.custom });
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const season = () => Math.floor((S.world.day - 1) / 7) % 4;
const C = (h: string) => new THREE.Color(h);

export function initSky(scene: THREE.Scene) {
  const u = { top: { value: C('#3a7bd5') }, mid: { value: C('#87b9ea') }, bot: { value: C('#cfe3f2') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C('#fff2c0') }, sunAmt: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform vec3 top,mid,bot,sunDir,sunCol; uniform float sunAmt; varying vec3 vP; void main(){ float h=vP.y; vec3 c=mix(bot,mid,smoothstep(-0.05,0.2,h)); c=mix(c,top,smoothstep(0.1,0.8,h)); float sd=max(dot(normalize(vP),sunDir),0.); c+=sunCol*(pow(sd,400.)*2.0+pow(sd,10.)*0.3)*sunAmt; gl_FragColor=vec4(c,1.); }' }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const starG = new THREE.BufferGeometry(); const sp: number[] = []; for (let i = 0; i < 900; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.4 - 0.1, r = 850; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); } starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); stars.frustumCulled = false; scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 12), new THREE.MeshBasicMaterial({ color: '#e8eefc', fog: false })); scene.add(moon);
  const clouds = new THREE.Group(); const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false, emissive: 0x222222 });
  for (let i = 0; i < 22; i++) { const c = new THREE.Group(); const n = 4 + Math.floor(Math.random() * 4); for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), cm); m.scale.set(18 + Math.random() * 18, 6 + Math.random() * 5, 14 + Math.random() * 10); m.position.set((k - n / 2) * 20 + Math.random() * 10, Math.random() * 4, Math.random() * 14); c.add(m); } c.position.set((Math.random() - 0.5) * 900, 150 + Math.random() * 60, (Math.random() - 0.5) * 900); clouds.add(c); }
  scene.add(clouds);
  G.sky = { mesh: sky, u, stars, moon, clouds, cm }; return G.sky;
}

export function initLights(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.2); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a3a, 0.5); scene.add(hemi); const amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(amb);
  const pool: THREE.PointLight[] = []; for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xff9a40, 0, 16, 1.7); l.visible = false; scene.add(l); pool.push(l); }
  G.light = { sun, hemi, amb, pool }; void renderer; return G.light;
}
export function applyGraphics() {
  const c = cfg(), r: THREE.WebGLRenderer = G.renderer; if (!r) return;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * c.scale * (c.scale > 1 ? 1 : 1)); if (c.scale > 1) r.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * c.scale)); else r.setPixelRatio(Math.max(0.5, (window.devicePixelRatio || 1) * c.scale));
  r.setSize(window.innerWidth, window.innerHeight, false);
  r.shadowMap.enabled = c.shadows > 0; r.shadowMap.type = c.shadows >= 3 ? THREE.PCFSoftShadowMap : c.shadows >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; r.shadowMap.needsUpdate = true;
  r.toneMapping = c.tone ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping; r.toneMappingExposure = S.settings.preset === 'God' ? 1.15 : S.settings.preset === 'Cinematic' ? 1.05 : 1;
  const sun: THREE.DirectionalLight = G.light.sun; sun.castShadow = c.shadows > 0;
  if (c.shadows > 0) { sun.shadow.mapSize.set(c.shadowSize, c.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); (sun.shadow as any).map = null; } const e = c.shadows >= 3 ? 120 : c.shadows >= 2 ? 90 : 65; const cam = sun.shadow.camera as THREE.OrthographicCamera; cam.left = -e; cam.right = e; cam.top = e; cam.bottom = -e; cam.near = 1; cam.far = 400; cam.updateProjectionMatrix(); G.shadowExtent = e; }
  G.camera.fov = (c.fov || 70) + (S.settings.fovAdd || 0); G.camera.updateProjectionMatrix();
  G.light.pool.forEach((l: any, i: number) => { l.visible = i < Math.round(3 + c.particles * 3); });
  // vegetation density
  if (G.veg) { const V = G.veg; const set = (k: string, d: number) => V[k] && V[k].chunks.forEach((ch: any) => ch.ms.forEach((m: any) => (m.count = Math.floor(ch.total * Math.min(1, d))))); set('oakT', c.trees); set('pine', c.trees); set('glow', Math.min(1, c.trees + 0.3)); set('grass', c.grass); set('flowerS', c.flowers); set('flowerH', c.flowers); set('bush', c.trees); set('rock', c.rocks); set('log', c.trees); set('mush', c.flowers);
    for (const k of ['oakT', 'pine']) V[k]?.chunks.forEach((ch: any) => ch.ms.forEach((m: any) => (m.castShadow = c.treeShadows && c.shadows > 0))); }
  if (G.water) { const w = G.water; const m = w.material as THREE.MeshStandardMaterial; m.roughness = c.water >= 3 ? 0.05 : c.water >= 2 ? 0.12 : 0.3; m.metalness = c.water >= 2 ? 0.25 : 0.05; m.normalScale.set(c.water ? 0.8 : 0, c.water ? 0.8 : 0); m.envMapIntensity = c.env ? 1.4 : 0; m.needsUpdate = true; }
  G.scene.environment = c.env ? G.envMap : null; G.scene.traverse((o: any) => { if (o.material && o.isMesh) o.material.needsUpdate = false; });
  const bl = document.getElementById('af-grade'); if (bl) { bl.dataset.vignette = c.vignette ? '1' : '0'; bl.dataset.letterbox = c.letterbox ? '1' : '0'; bl.dataset.glow = String(c.bloomGlow || 0); }
  G.maxParticles = Math.round(900 * c.particles + 100);
}

// ---------- time of day / palettes
const PAL = { night: { top: C('#050a1c'), mid: C('#0c1738'), bot: C('#141c3a') }, dusk: { top: C('#3c4a82'), mid: C('#e8946a'), bot: C('#f2b27a') }, day: { top: C('#3877d0'), mid: C('#86b8ea'), bot: C('#d0e4f4') }, grey: { top: C('#5a626e'), mid: C('#79818c'), bot: C('#9aa2ac') } };
const _a = new THREE.Color(), _b = new THREE.Color();
export function updateSky(dt: number) {
  const W = S.world; const c = cfg(); const ang = ((W.time - 6) / 12) * Math.PI; const e = Math.sin(ang); const sunDir = new THREE.Vector3(Math.cos(ang) * 0.9, e, 0.35).normalize(); const sk = G.sky, L = G.light;
  const nightW = smooth(0.02, -0.22, e), dayW = smooth(0.08, 0.45, e), duskW = clamp(1 - nightW - dayW, 0, 1); const wk = G.weather, cl = wk.k * (wk.type === 'clear' ? 0 : 1);
  const mixc = (k: 'top' | 'mid' | 'bot', out: THREE.Color) => { out.set(0, 0, 0); out.add(_a.copy(PAL.night[k]).multiplyScalar(nightW)); out.add(_a.copy(PAL.dusk[k]).multiplyScalar(duskW)); out.add(_a.copy(PAL.day[k]).multiplyScalar(dayW)); const grey = _b.copy(PAL.grey[k]).multiplyScalar(0.25 + (dayW + duskW * 0.6) * 0.75); out.lerp(grey, cl * (wk.type === 'storm' ? 0.85 : wk.type === 'fog' ? 0.8 : 0.6)); };
  mixc('top', sk.u.top.value); mixc('mid', sk.u.mid.value); mixc('bot', sk.u.bot.value);
  const inInt = G.player?.inside; const rift = inInt?.rift, cave = inInt?.dark;
  sk.u.sunDir.value.copy(sunDir); sk.u.sunAmt.value = (1 - cl) * clamp(e * 4 + 0.5, 0, 1); sk.u.sunCol.value.set(e < 0.25 ? '#ff9a50' : '#fff2c0');
  if (G.camera) { sk.mesh.position.copy(G.camera.position); sk.stars.position.copy(G.camera.position); sk.moon.position.copy(G.camera.position).addScaledVector(sunDir, -700); }
  (sk.stars.material as any).opacity = nightW * (1 - cl * 0.8); sk.moon.visible = nightW > 0.05;
  sk.clouds.children.forEach((c2: THREE.Object3D, i: number) => { c2.position.x += dt * (2 + (i % 3)) * (1 + wk.k * 3); if (c2.position.x > 450) c2.position.x = -450; }); sk.clouds.position.set(G.camera.position.x, 0, G.camera.position.z);
  sk.cm.color.copy(_a.set('#ffffff').multiplyScalar(0.25 + dayW * 0.75 + duskW * 0.5)).lerp(_b.set('#5a5e66'), cl * 0.7); sk.cm.color.lerp(_b.set('#ff9a6a'), duskW * 0.5);
  sk.clouds.visible = c.shadows >= 0 && !inInt;
  // lights
  const useMoon = e < 0.03; const dir = useMoon ? sunDir.clone().negate() : sunDir; const day = clamp(e * 3, 0, 1);
  L.sun.color.set(useMoon ? '#9db4ff' : e < 0.3 ? '#ffb070' : '#fff3da'); L.sun.intensity = (useMoon ? 0.35 * nightW : 2.3 * day * (1 - cl * 0.7)) * (inInt ? (rift ? 0.3 : cave ? 0.02 : 0.9) : 1); if (!useMoon && e < 0.08) L.sun.intensity *= smooth(0, 0.08, e) + 0.1;
  L.hemi.color.copy(sk.u.top.value).lerp(_a.set('#ffffff'), 0.3); L.hemi.groundColor.set('#5a4a30').lerp(_a.set('#101018'), nightW); L.hemi.intensity = (0.16 + dayW * 0.55 + duskW * 0.28) * (1 - cl * 0.25) * (cave ? 0.35 : 1) + (rift ? 0.35 : 0) + G.flash * 3; L.amb.intensity = 0.06 + nightW * 0.05 + (cave ? 0.18 : 0); L.amb.color.set(rift ? '#6a40c0' : '#ffffff');
  const pp = G.player?.pos; if (pp) { const ex = G.shadowExtent || 65; const q = (2 * ex) / (cfg().shadowSize || 2048); const px = Math.round(pp.x / q) * q, py = Math.round(pp.y / q) * q, pz = Math.round(pp.z / q) * q; L.sun.target.position.set(px, py, pz); L.sun.position.set(px + dir.x * 140, py + dir.y * 140 + 10, pz + dir.z * 140); L.sun.target.updateMatrixWorld(); }
  // fog
  const fogFar = c.fogFar * (wk.type === 'fog' ? 0.28 : wk.type === 'storm' ? 0.5 : wk.type === 'rain' ? 0.65 : wk.type === 'snow' ? 0.55 : 1);
  const fogC = cave ? C('#050505') : rift ? C('#2a1a5a') : sk.u.bot.value.clone().lerp(_a.set('#8a8a90'), cl * 0.3);
  if (!G.scene.fog) G.scene.fog = new THREE.Fog(fogC, 40, fogFar); const f = G.scene.fog as THREE.Fog; f.color.copy(fogC); f.near = cave ? 4 : wk.type === 'fog' ? 3 : 35; f.far = cave ? 60 : rift ? 160 : fogFar; G.scene.background = fogC;
  // windows at night
  const glow = clamp(nightW * 1.4 + duskW * 0.6 + cl * 0.2, 0, 1); ST.windows.forEach((m) => ((m.material as any).emissiveIntensity = 0.12 + glow * 1.6));
  // season
  const se = season(); const oak = SEASON_MATS.oak, pine = SEASON_MATS.pine, gr = SEASON_MATS.grass, bu = SEASON_MATS.bush, tr: any = (SEASON_MATS as any).terrain;
  const sc = [['#5fb04a', '#2f6a3a', '#7ac058', '#58a040', '#ffffff'], ['#4f8a3a', '#2f5f3a', '#6ab04a', '#4a7a30', '#ffffff'], ['#d0782a', '#3a5a34', '#b8a040', '#b86a22', '#ecd8b0'], ['#9aa4a0', '#2c4a3c', '#dce6ee', '#8a9490', '#e4eef6']][se];
  if (oak) { (oak as any).color.lerp(_a.set(sc[0]), clamp(dt * 0.8, 0, 1)); (pine as any).color.lerp(_a.set(sc[1]), clamp(dt * 0.8, 0, 1)); (gr as any).color.lerp(_a.set(sc[2]), clamp(dt * 0.8, 0, 1)); (bu as any).color.lerp(_a.set(sc[3]), clamp(dt * 0.8, 0, 1)); if (tr) tr.color.lerp(_a.set(sc[4]), clamp(dt * 0.8, 0, 1)); }
  void lerp;
}

// ---------- weather
export function updateWeather(dt: number) {
  const w = G.weather; w.t += dt; const se = season();
  if (w.t > w.next) { w.t = 0; w.next = 70 + Math.random() * 140; const r = Math.random(); const opts = se === 3 ? ['clear', 'snow', 'snow', 'fog', 'cloud'] : se === 0 ? ['clear', 'rain', 'cloud', 'rain', 'fog', 'clear'] : se === 2 ? ['clear', 'rain', 'fog', 'cloud', 'storm', 'clear'] : ['clear', 'clear', 'cloud', 'rain', 'storm', 'clear']; const nxt = opts[Math.floor(r * opts.length)]; if (nxt !== w.type) { w.type = nxt; S.world.weather = nxt; if (G.net?.isHost) G.net.broadcastWorld(); } }
  const target = w.type === 'clear' ? 0 : w.type === 'cloud' ? 0.4 : 1; w.k += (target - w.k) * clamp(dt * 0.25, 0, 1);
  const cold = se === 3 || (G.player?.pos.z < -120) || (G.player?.pos.y > 52);
  w.precip = (w.type === 'rain' || w.type === 'storm') ? (cold ? 'snow' : 'rain') : w.type === 'snow' ? 'snow' : null;
  const inside = !!G.player?.inside; const rainAmt = w.precip === 'rain' ? w.k * (w.type === 'storm' ? 1 : 0.7) : 0;
  G.rainAmt = inside ? 0 : rainAmt;
  if (w.type === 'storm' && !inside && Math.random() < dt * 0.1) { G.flash = 0.25; setTimeout(() => audio.sfx('thunder'), 300 + Math.random() * 1200); }
  G.flash = Math.max(0, G.flash - dt * 0.8);
  S.hud.weather = w.type === 'cloud' ? 'Overcast' : w.precip === 'snow' && w.type !== 'snow' ? 'Snowfall' : w.type[0].toUpperCase() + w.type.slice(1);
}
export function initPrecip(scene: THREE.Scene) {
  const n = 3000; const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 6); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60; pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x; pos[i * 6 + 4] = y + 0.6; pos[i * 6 + 5] = z; }
  const rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xa8c0e0, transparent: true, opacity: 0.45, fog: true })); rain.frustumCulled = false; scene.add(rain);
  const sg = new THREE.BufferGeometry(); const sp = new Float32Array(2200 * 3); for (let i = 0; i < 2200; i++) { sp[i * 3] = (Math.random() - 0.5) * 60; sp[i * 3 + 1] = Math.random() * 30; sp[i * 3 + 2] = (Math.random() - 0.5) * 60; } sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9 })); snow.frustumCulled = false; scene.add(snow);
  G.precip = { rain, snow, n };
}
export function updatePrecip(dt: number) {
  const P = G.precip, w = G.weather, cp = G.camera.position; const c = cfg(); const share = clamp(c.particles, 0.15, 1.6);
  const rainOn = w.precip === 'rain' && !G.player.inside, snowOn = w.precip === 'snow' && !G.player.inside;
  P.rain.visible = rainOn; P.snow.visible = snowOn; (P.rain.material as any).opacity = 0.2 + 0.3 * w.k;
  if (rainOn) { const a = P.rain.geometry.attributes.position, arr = a.array as Float32Array; const n = Math.min(P.n, Math.floor(1200 * share * (w.type === 'storm' ? 2.2 : 1.2))); P.rain.geometry.setDrawRange(0, n * 2); for (let i = 0; i < n; i++) { let y = arr[i * 6 + 1] - dt * 32; if (y < 0) y += 30; const x = arr[i * 6], z = arr[i * 6 + 2]; arr[i * 6 + 1] = y; arr[i * 6 + 4] = y + 0.7; arr[i * 6 + 3] = x - 0.08; arr[i * 6 + 5] = z; } a.needsUpdate = true; P.rain.position.set(Math.round(cp.x / 4) * 4, cp.y - 8, Math.round(cp.z / 4) * 4); }
  if (snowOn) { const a = P.snow.geometry.attributes.position, arr = a.array as Float32Array; const n = Math.min(2200, Math.floor(1200 * share)); P.snow.geometry.setDrawRange(0, n); for (let i = 0; i < n; i++) { arr[i * 3 + 1] -= dt * (1.5 + (i % 5) * 0.2); arr[i * 3] += Math.sin(G.t + i) * dt * 0.5; if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += 30; } a.needsUpdate = true; P.snow.position.set(Math.round(cp.x / 4) * 4, cp.y - 8, Math.round(cp.z / 4) * 4); }
}

// ---------- particle pool (additive sparks + soft smoke)
export function initParticles(scene: THREE.Scene) {
  const mk = (n: number, size: number, additive: boolean) => { const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: additive ? 1 : 0.35, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, sizeAttenuation: true })); p.frustumCulled = false; scene.add(p); return { p, n, pos, col, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), grav: new Float32Array(n), head: 0, base: new Float32Array(n * 3) }; };
  G.parts = { spark: mk(1400, 0.32, true), smoke: mk(260, 1.4, false), amb: mk(260, 0.14, true) };
}
export function emit(kind: 'spark' | 'smoke', x: number, y: number, z: number, color: string, n = 8, speed = 3, life = 0.6, grav = 6, spread = 1) {
  const P = G.parts?.[kind]; if (!P) return; const c = new THREE.Color(color); const lim = Math.min(P.n, G.maxParticles || 600); n = Math.max(1, Math.round(n * (cfg().particles > 0.5 ? 1 : 0.5)));
  for (let k = 0; k < n; k++) { const i = P.head++ % lim; P.pos[i * 3] = x + (Math.random() - 0.5) * 0.2 * spread; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.2 * spread; const a = Math.random() * 6.283, e = Math.random() * 1.2 - 0.2; P.vel[i * 3] = Math.cos(a) * Math.cos(e) * speed * Math.random(); P.vel[i * 3 + 1] = Math.sin(e) * speed * Math.random() + (kind === 'smoke' ? 1 : 1.5); P.vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * speed * Math.random(); P.life[i] = P.max[i] = life * (0.5 + Math.random() * 0.8); P.grav[i] = kind === 'smoke' ? -0.4 : grav; P.col[i * 3] = c.r; P.col[i * 3 + 1] = c.g; P.col[i * 3 + 2] = c.b; }
}
export function updateParticles(dt: number) {
  for (const k of ['spark', 'smoke'] as const) { const P = G.parts[k]; let any = false; for (let i = 0; i < P.n; i++) { if (P.life[i] > 0) { any = true; P.life[i] -= dt; P.vel[i * 3 + 1] -= P.grav[i] * dt; P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt; const f = Math.max(0, P.life[i] / P.max[i]); if (P.life[i] <= 0) P.pos[i * 3 + 1] = -999; if (k === 'smoke') { P.col[i * 3] *= 0.999; } else { P.col[i * 3] *= 0.97 + f * 0.03; P.col[i * 3 + 1] *= 0.97 + f * 0.03; P.col[i * 3 + 2] *= 0.97 + f * 0.03; } } else if (P.pos[i * 3 + 1] > -900) P.pos[i * 3 + 1] = -999; } if (any) { P.p.geometry.attributes.position.needsUpdate = true; P.p.geometry.attributes.color.needsUpdate = true; } }
  // ambient pollen / fireflies / leaves
  const A = G.parts.amb, cp = G.camera.position, n = Math.min(A.n, Math.round(260 * cfg().particles)); const night = S.world.time < 5.5 || S.world.time > 19.5; const se = season();
  A.p.visible = !G.player.inside && G.weather.precip === null; A.p.geometry.setDrawRange(0, n);
  const col = night ? new THREE.Color('#d8ff6a') : se === 2 ? new THREE.Color('#e0902a') : se === 3 ? new THREE.Color('#ffffff') : new THREE.Color('#fff4b0');
  for (let i = 0; i < n; i++) { if (A.base[i * 3 + 1] === 0) { A.base[i * 3] = (Math.random() - 0.5) * 50; A.base[i * 3 + 1] = Math.random() * 6 + 0.3; A.base[i * 3 + 2] = (Math.random() - 0.5) * 50; } const t = G.t + i * 1.7; let bx = A.base[i * 3], by = A.base[i * 3 + 1], bz = A.base[i * 3 + 2]; if (se === 2 && !night) { A.base[i * 3 + 1] -= dt * 0.7; if (A.base[i * 3 + 1] < 0) A.base[i * 3 + 1] = 7; by = A.base[i * 3 + 1]; } bx += dt * 0.3 * (1 + WIND.value * 0); A.base[i * 3] = ((bx + 25) % 50 + 50) % 50 - 25;
    A.pos[i * 3] = cp.x + A.base[i * 3] + Math.sin(t * 0.7) * 0.8; A.pos[i * 3 + 1] = (G.player.pos.y - 1) + by + Math.sin(t * 1.3) * 0.3; A.pos[i * 3 + 2] = cp.z + bz + Math.cos(t * 0.6) * 0.8; const fl = night ? 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5)) : 0.5; A.col[i * 3] = col.r * fl; A.col[i * 3 + 1] = col.g * fl; A.col[i * 3 + 2] = col.b * fl; }
  A.p.geometry.attributes.position.needsUpdate = true; A.p.geometry.attributes.color.needsUpdate = true;
  // chimney smoke (nearby only)
  if (!G.player.inside) { const pp = G.player.pos; G.smokeT = (G.smokeT || 0) - dt; if (G.smokeT < 0) { G.smokeT = 0.35; const cold = S.world.time < 8 || S.world.time > 17 || G.weather.k > 0.5; if (cold) for (const s of ST.smoke) { if (Math.abs(s.x - pp.x) < 60 && Math.abs(s.z - pp.z) < 60 && Math.random() < 0.35) emit('smoke', s.x, s.y, s.z, '#9a9a9a', 1, 0.3, 3, 0, 0.5); } for (const f of ST.fires) if (Math.abs(f.x - pp.x) < 50 && Math.abs(f.z - pp.z) < 50) { emit('spark', f.x, f.y + 0.4, f.z, '#ff8a30', 2, 0.6, 0.8, -1); emit('smoke', f.x, f.y + 1, f.z, '#6a6a6a', 1, 0.2, 2.2, 0, 0.3); } } }
}

// ---------- torch light pool
export function updateTorches(dt: number) {
  const pool: THREE.PointLight[] = G.light.pool, pp = G.player.pos; const night = S.world.time < 6.5 || S.world.time > 17.5 || G.weather.k > 0.7; const list: { d: number; t: any }[] = [];
  if (G.player.inside) { pool.forEach((l) => (l.intensity = 0)); G.player.inside.flick.forEach((l: THREE.PointLight) => { l.intensity = l.userData.base * (0.8 + Math.sin(G.t * 11 + l.position.x) * 0.1 + Math.sin(G.t * 23 + l.position.z * 3) * 0.1); }); return; }
  for (const t of ST.torches) { const d = (t.x - pp.x) ** 2 + (t.z - pp.z) ** 2; if (d < 2500) list.push({ d, t }); } list.sort((a, b) => a.d - b.d);
  pool.forEach((l, i) => { const it = list[i]; if (it && l.visible && (night || it.t.big)) { l.position.set(it.t.x, it.t.y, it.t.z); const base = it.t.big ? 3 : 1.6; l.intensity = base * (0.75 + Math.sin(G.t * 9 + i) * 0.12 + Math.sin(G.t * 21 + i * 3) * 0.1); l.distance = it.t.big ? 22 : 14; } else l.intensity = 0; });
  dt;
}

// ---------- floating damage numbers
const numCache = new Map<string, THREE.CanvasTexture>();
export function floatText(text: string, pos: THREE.Vector3, color = '#ffffff', big = false) {
  const key = text + color; let tex = numCache.get(key); if (!tex) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d')!; x.font = 'bold 40px Georgia,serif'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,0.85)'; x.strokeText(text, 64, 44); x.fillStyle = color; x.fillText(text, 64, 44); tex = new THREE.CanvasTexture(c); numCache.set(key, tex); if (numCache.size > 200) numCache.clear(); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); sp.scale.set(big ? 2.6 : 1.8, big ? 1.3 : 0.9, 1); sp.position.copy(pos); sp.renderOrder = 20; G.scene.add(sp); (G.floats ||= []).push({ sp, t: 0, vy: 2 });
}
export function updateFloats(dt: number) { const f = G.floats; if (!f) return; for (let i = f.length - 1; i >= 0; i--) { const o = f[i]; o.t += dt; o.sp.position.y += o.vy * dt; o.vy *= 0.96; (o.sp.material as any).opacity = Math.max(0, 1 - o.t / 1.1); if (o.t > 1.1) { G.scene.remove(o.sp); o.sp.material.dispose(); f.splice(i, 1); } } }
export function setWind(t: number) { WIND.value = t; }
