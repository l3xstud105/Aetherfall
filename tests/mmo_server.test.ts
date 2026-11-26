// AETHERFALL 1.0.0 — Authoritative MMORPG Server Integration Test
// Tests 2 independent clients connecting to the live authoritative server.
import { AetherfallServer } from '../server/server';
import { WebSocket } from 'ws';

let pass = 0, fail = 0;
const ok = (c: any, m: string) => {
  if (c) { pass++; } else { fail++; console.log('FAIL:', m); }
};

const waitPacket = (ws: WebSocket, type: string, timeout = 3000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`Timed out waiting for packet: ${type}`)), timeout);
    const handler = (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.t === type) {
          clearTimeout(to);
          ws.off('message', handler);
          resolve(msg);
        }
      } catch {}
    };
    ws.on('message', handler);
  });
};

(async () => {
  console.log('=== Step 3 & 4: Starting Authoritative Aetherfall MMORPG Server on Port 7788');
  const server = new AetherfallServer(7788, ':memory:');
  await server.start();
  ok(server.server !== null, 'Server listening on port 7788');

  // Connect Client 1 (Thorin - Warrior)
  console.log('Connecting Client 1 (Thorin)...');
  const ws1 = new WebSocket('ws://127.0.0.1:7788');
  await new Promise((res) => ws1.on('open', res));
  ok(ws1.readyState === 1, 'Client 1 WebSocket connected');

  ws1.send(JSON.stringify({ t: 'auth', username: 'thorin_player', password: 'password123' }));
  const auth1 = await waitPacket(ws1, 'auth_ok');
  ok(auth1.username === 'thorin_player', 'Client 1 authenticated');

  ws1.send(JSON.stringify({ t: 'char_create', name: 'Thorin', cls: 'warrior', look: { hair: '#4a2a1a' } }));
  const create1 = await waitPacket(ws1, 'char_created');
  ok(create1.character.name === 'Thorin', 'Client 1 character created');

  ws1.send(JSON.stringify({ t: 'char_select', characterId: create1.character.id }));
  const select1 = await waitPacket(ws1, 'char_ok');
  ok(select1.character.name === 'Thorin' && select1.onlineCount === 1, 'Client 1 entered global realm');

  // Connect Client 2 (Aria - Mage)
  console.log('Connecting Client 2 (Aria)...');
  const ws2 = new WebSocket('ws://127.0.0.1:7788');
  await new Promise((res) => ws2.on('open', res));
  ok(ws2.readyState === 1, 'Client 2 WebSocket connected');

  // Set up listener for spawn notice on client 1
  const spawnPromise = waitPacket(ws1, 'player_spawn');

  ws2.send(JSON.stringify({ t: 'auth', username: 'aria_player', password: 'password123' }));
  await waitPacket(ws2, 'auth_ok');

  ws2.send(JSON.stringify({ t: 'char_create', name: 'Aria', cls: 'mage', look: { hair: '#d4b060' } }));
  const create2 = await waitPacket(ws2, 'char_created');

  ws2.send(JSON.stringify({ t: 'char_select', characterId: create2.character.id }));
  const select2 = await waitPacket(ws2, 'char_ok');
  ok(select2.character.name === 'Aria' && select2.onlineCount === 2, 'Client 2 entered global realm');

  const spawnMsg = await spawnPromise;
  ok(spawnMsg.char.name === 'Aria', 'Client 1 received real-time player_spawn notice for Client 2');

  // Test 4: Authoritative Movement & Speedhack Protection
  console.log('Testing Authoritative Movement Validation...');
  ws1.send(JSON.stringify({ t: 'move', x: -138, y: 0, z: 98, yaw: 1.5, sp: 5.0, act: 'run' }));
  await new Promise((r) => setTimeout(r, 60));
  const p1 = server.world.players.get(create1.character.id)!;
  ok(p1.pos.x === -138 && p1.pos.z === 98, 'Legitimate movement validated and accepted by server');

  // Attempt speedhack teleport 5000 meters away
  ws1.send(JSON.stringify({ t: 'move', x: 5000, y: 0, z: 5000 }));
  await new Promise((r) => setTimeout(r, 60));
  ok(p1.pos.x === -138, 'Speedhack teleport rejected by server authority');

  // Test 5: Authoritative Combat, Elemental Reaction & Boss Phase II Enrage
  console.log('Testing Authoritative Combat & Elemental Reactions...');
  p1.pos.x = -10; p1.pos.z = 195; // Near Karreth
  server.world.updatePlayerCell(p1);
  const p2 = server.world.players.get(create2.character.id)!;
  p2.pos.x = -11; p2.pos.z = 194;
  server.world.updatePlayerCell(p2);

  const karreth = server.world.foes.get('karreth')!;
  karreth.hp = 850;
  karreth.max = 850;
  karreth.phase = 1;

  // Client 1 attacks Karreth with flame slash (Fire)
  const hitPromise1 = waitPacket(ws1, 'foe_hit');
  ws1.send(JSON.stringify({ t: 'ability', abilityId: 'flame_slash', targetId: 'karreth' }));
  const hitRes1 = await hitPromise1;
  ok(hitRes1.el === 'fire' && hitRes1.foeHp < 850, 'Server processed Fire attack on Karreth');

  // Client 2 attacks Karreth with wind step (Wind) -> CONFLAGRATION!
  const hitPromise2 = waitPacket(ws1, 'foe_hit');
  ws2.send(JSON.stringify({ t: 'ability', abilityId: 'wind_step', targetId: 'karreth' }));
  const hitRes2 = await hitPromise2;
  ok(hitRes2.reaction === 'CONFLAGRATION!', 'Server authoritatively triggered CONFLAGRATION reaction');

  // Bring Karreth below 50% HP to test Phase II Enrage
  karreth.hp = 430;
  const enragePromise = waitPacket(ws1, 'boss_enrage');
  ws1.send(JSON.stringify({ t: 'attack', targetId: 'karreth' }));
  const enrageRes = await enragePromise;
  ok(enrageRes.phase === 2 && karreth.phase === 2, 'Server authoritatively triggered Boss Phase II Enrage');

  // Kill Karreth authoritatively
  karreth.hp = 10;
  const invPromise = waitPacket(ws1, 'inv_update');
  ws1.send(JSON.stringify({ t: 'attack', targetId: 'karreth' }));
  const invRes = await invPromise;
  ok(karreth.dead === true, 'Karreth authoritatively defeated');
  ok(invRes.gold > 120, 'Server authoritatively distributed gold to killer');
  ok(invRes.inventory.aether_core >= 1, 'Server authoritatively deposited legendary loot into inventory');

  // Test 6: Social Chat
  console.log('Testing MMORPG Social Chat Channels...');
  const chatPromise = waitPacket(ws2, 'chat_msg');
  ws1.send(JSON.stringify({ t: 'chat', channel: 'world', text: 'Hail, warriors of Valdoria!' }));
  const chatRes = await chatPromise;
  ok(chatRes.from === 'Thorin' && chatRes.text === 'Hail, warriors of Valdoria!', 'World chat broadcast received');

  // Whisper
  const whisperPromise = waitPacket(ws1, 'chat_msg');
  ws2.send(JSON.stringify({ t: 'chat', channel: 'whisper', target: 'Thorin', text: 'Meet me at the Spire.' }));
  const whisperRes = await whisperPromise;
  ok(whisperRes.channel === 'whisper' && whisperRes.text === 'Meet me at the Spire.', 'Private whisper delivered');

  // Test 7: Party System
  console.log('Testing Party System...');
  const partyInvitePromise = waitPacket(ws2, 'party_invitation');
  ws1.send(JSON.stringify({ t: 'party_invite', targetName: 'Aria' }));
  const inviteRes = await partyInvitePromise;
  ok(inviteRes.fromName === 'Thorin', 'Party invitation received by Aria');

  const partyUpdatePromise = waitPacket(ws1, 'party_update');
  ws2.send(JSON.stringify({ t: 'party_accept', partyId: inviteRes.partyId }));
  const partyRes = await partyUpdatePromise;
  ok(partyRes.members.length === 2, 'Party successfully formed with 2 players');

  // Test 8: Two-Phase Secure Player Trading
  console.log('Testing Two-Phase Player Trading...');
  const tradePromise = waitPacket(ws2, 'trade_update');
  ws1.send(JSON.stringify({ t: 'trade_req', targetId: create2.character.id }));
  const tradeInit = await tradePromise;
  ok(tradeInit.state === 'negotiating', 'Trade session initialized');

  // Thorin offers 20 gold and 1 potion_health
  ws1.send(JSON.stringify({ t: 'trade_offer', items: { potion_health: 1 }, gold: 20 }));
  await new Promise((r) => setTimeout(r, 60));

  // Aria offers 1 bread
  ws2.send(JSON.stringify({ t: 'trade_offer', items: { bread: 1 }, gold: 0 }));
  await new Promise((r) => setTimeout(r, 60));

  // Both lock
  ws1.send(JSON.stringify({ t: 'trade_lock' }));
  ws2.send(JSON.stringify({ t: 'trade_lock' }));
  await new Promise((r) => setTimeout(r, 60));

  // Both confirm
  const tradeDonePromise1 = waitPacket(ws1, 'trade_complete');
  const tradeDonePromise2 = waitPacket(ws2, 'trade_complete');
  ws1.send(JSON.stringify({ t: 'trade_confirm' }));
  ws2.send(JSON.stringify({ t: 'trade_confirm' }));
  await Promise.all([tradeDonePromise1, tradeDonePromise2]);
  ok(true, 'Two-phase trade completed atomically');

  // Check persistent DB characters after trade
  const char1After = server.db.getCharacterById(create1.character.id)!;
  const char2After = server.db.getCharacterById(create2.character.id)!;
  ok(char1After.inventory.bread >= 1, 'Thorin received bread from trade');
  ok(char2After.gold === 140, 'Aria received 20 gold from trade');

  // Test 9: Dungeon Instancing
  console.log('Testing Dungeon Instancing...');
  const dungeonPromise1 = waitPacket(ws1, 'dungeon_loaded');
  ws1.send(JSON.stringify({ t: 'dungeon_enter', dungeonType: 'crypt' }));
  const dungeonRes1 = await dungeonPromise1;
  ok(dungeonRes1.dungeonName === 'Whispering Catacombs', 'Entered Whispering Catacombs dungeon instance');
  ok(dungeonRes1.foes.some((f: any) => f.name === 'Gravewarden Malakar'), 'Dungeon boss Gravewarden Malakar present');

  ws1.send(JSON.stringify({ t: 'dungeon_leave' }));
  await waitPacket(ws1, 'dungeon_exited');
  ok(p1.zone === 'world', 'Exited dungeon back to overworld');

  // Test 10: Disconnection & Persistent Character Recovery
  console.log('Testing Disconnection & Reconnection...');
  ws1.close();
  await new Promise((r) => setTimeout(r, 100));
  ok(!server.world.players.has(create1.character.id), 'Disconnected player removed from live world');

  // Reconnect Client 1
  const ws1Reconn = new WebSocket('ws://127.0.0.1:7788');
  await new Promise((res) => ws1Reconn.on('open', res));
  ws1Reconn.send(JSON.stringify({ t: 'auth', username: 'thorin_player', password: 'password123' }));
  const authReconn = await waitPacket(ws1Reconn, 'auth_ok');
  ok(authReconn.characters[0].name === 'Thorin', 'Character list recovered from persistent database');
  ok(authReconn.characters[0].gold === char1After.gold, 'Gold preserved across disconnect');
  ok(authReconn.characters[0].inventory.bread >= 1, 'Traded items preserved across disconnect');

  ws1Reconn.close();
  ws2.close();
  await server.stop();
  console.log(`\nAuthoritative MMORPG Server Tests: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('MMO Server test error:', err);
  process.exit(2);
});
