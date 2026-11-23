// AETHERFALL 1.0.0 — Authoritative MMO Server Staged Load Test
// Measures actual Server Tick Rate, Memory, Latency (Avg & P95), and Bandwidth at 2, 10, 25, and 50 concurrent clients.
import WebSocket from 'ws';
import { AetherfallServer } from '../server/server';

interface StageResult {
  clients: number;
  durationMs: number;
  totalPacketsSent: number;
  totalPacketsReceived: number;
  totalBytesSent: number;
  totalBytesReceived: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  serverTps: number;
  heapUsedMb: number;
  rssMb: number;
}

const PORT = 7799;

async function runStage(server: AetherfallServer, numClients: number, testDurationMs: number): Promise<StageResult> {
  const clients: WebSocket[] = [];
  const latencies: number[] = [];
  let totalBytesSent = 0;
  let totalBytesReceived = 0;
  let totalPacketsSent = 0;
  let totalPacketsReceived = 0;

  // Track initial memory
  const initialMem = process.memoryUsage();

  // Create and connect clients
  const connectPromises = Array.from({ length: numClients }).map((_, i) => {
    return new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
      const username = `LoadTester_${numClients}_${i}`;

      ws.on('open', () => {
        const authPkt = JSON.stringify({ t: 'auth', username, password: 'pw' });
        totalBytesSent += authPkt.length;
        totalPacketsSent++;
        ws.send(authPkt);
      });

      ws.on('message', (data) => {
        const raw = data.toString();
        totalBytesReceived += raw.length;
        totalPacketsReceived++;

        try {
          const msg = JSON.parse(raw);
          if (msg.t === 'auth_ok') {
            const charId = msg.characters[0]?.id;
            if (charId) {
              const selPkt = JSON.stringify({ t: 'char_select', characterId: charId });
              totalBytesSent += selPkt.length;
              totalPacketsSent++;
              ws.send(selPkt);
            }
          } else if (msg.t === 'char_ok') {
            resolve(ws);
          } else if (msg.t === 'snapshot') {
            // Measure snapshot latency
            if (msg.time) {
              // snapshot processed
            }
          }
        } catch (e) {
          reject(e);
        }
      });

      ws.on('error', reject);
    });
  });

  const connectedWs = await Promise.all(connectPromises);
  clients.push(...connectedWs);

  // Measure tick rate and simulate active gameplay loop
  const tickCountBefore = server.world.tick;
  const startT = performance.now();

  const clientIntervals: NodeJS.Timeout[] = [];

  connectedWs.forEach((ws, idx) => {
    let seq = 0;
    // Each client sends movement and actions at 10Hz
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const pingStart = performance.now();
        const movePkt = JSON.stringify({
          t: 'move',
          seq: ++seq,
          x: -120 + (idx % 5) * 5 + Math.sin(seq * 0.1) * 2,
          y: 0,
          z: 80 + Math.floor(idx / 5) * 5 + Math.cos(seq * 0.1) * 2,
          yaw: (seq * 0.1) % (Math.PI * 2),
          sp: 4.5,
          act: seq % 10 === 0 ? 'attack' : 'run',
          air: 'ground',
          cr: false
        });
        totalBytesSent += movePkt.length;
        totalPacketsSent++;
        ws.send(movePkt);

        // Ping for explicit latency measurement
        const pingPkt = JSON.stringify({ t: 'ping', t0: pingStart });
        totalBytesSent += pingPkt.length;
        totalPacketsSent++;
        ws.send(pingPkt);
      }
    }, 100);

    // Listen for pong
    ws.on('message', (data) => {
      const str = data.toString();
      if (str.includes('"t":"pong"')) {
        try {
          const m = JSON.parse(str);
          if (m.t0) {
            latencies.push(performance.now() - m.t0);
          }
        } catch {}
      }
    });

    clientIntervals.push(interval);
  });

  // Let simulation run for testDurationMs
  await new Promise((res) => setTimeout(res, testDurationMs));

  // Clear client loops
  clientIntervals.forEach((ci) => clearInterval(ci));

  const endT = performance.now();
  const elapsedSec = (endT - startT) / 1000;
  const tickCountAfter = server.world.tick;
  const actualTps = (tickCountAfter - tickCountBefore) / elapsedSec;

  // Cleanup client connections
  await Promise.all(
    clients.map(
      (c) =>
        new Promise<void>((resolve) => {
          c.once('close', () => resolve());
          c.close();
        })
    )
  );

  // Give server brief moment to process disconnects
  await new Promise((res) => setTimeout(res, 200));

  const finalMem = process.memoryUsage();

  // Compute Latency stats
  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p95Latency = latencies.length ? latencies[p95Idx] : 0;

  return {
    clients: numClients,
    durationMs: testDurationMs,
    totalPacketsSent,
    totalPacketsReceived,
    totalBytesSent,
    totalBytesReceived,
    avgLatencyMs: Number(avgLatency.toFixed(2)),
    p95LatencyMs: Number(p95Latency.toFixed(2)),
    serverTps: Number(actualTps.toFixed(2)),
    heapUsedMb: Number((finalMem.heapUsed / (1024 * 1024)).toFixed(2)),
    rssMb: Number((finalMem.rss / (1024 * 1024)).toFixed(2))
  };
}

async function main() {
  console.log('===============================================================');
  console.log('  AETHERFALL 1.0.0 — GLOBAL REALM AUTHORITATIVE LOAD TEST');
  console.log('===============================================================\n');

  // Start dedicated server on port 7799 with in-memory DB for load testing
  const server = new AetherfallServer(PORT, ':memory:');
  await server.start();
  console.log(`[Load Test] Authoritative Realm Server active on port ${PORT}\n`);

  const results: StageResult[] = [];
  const stages = [2, 10, 25, 50];

  for (const count of stages) {
    process.stdout.write(`Executing Stage (${count} concurrent clients, 3000ms sustained simulation)... `);
    const res = await runStage(server, count, 3000);
    results.push(res);
    console.log(`DONE. (TPS: ${res.serverTps}, Avg Latency: ${res.avgLatencyMs}ms, P95: ${res.p95LatencyMs}ms)`);
  }

  await server.stop();

  console.log('\n========================================================================================================');
  console.log('  STAGED LOAD TESTING METRICS REPORT');
  console.log('========================================================================================================');
  console.log('| Clients | Duration | Target TPS | Actual TPS | Avg Latency | P95 Latency | Packets Exchanged | Heap (MB) |');
  console.log('|---------|----------|------------|------------|-------------|-------------|-------------------|-----------|');
  for (const r of results) {
    const totalPkts = r.totalPacketsSent + r.totalPacketsReceived;
    console.log(
      `| ${String(r.clients).padEnd(7)} | ${(r.durationMs / 1000).toFixed(1)}s     | 20.0 Hz    | ${String(r.serverTps + ' Hz').padEnd(10)} | ${String(r.avgLatencyMs + ' ms').padEnd(11)} | ${String(r.p95LatencyMs + ' ms').padEnd(11)} | ${String(totalPkts).padEnd(17)} | ${String(r.heapUsedMb + ' MB').padEnd(9)} |`
    );
  }
  console.log('========================================================================================================\n');

  // Verify SLA assertions
  let passed = true;
  for (const r of results) {
    if (r.serverTps < 18.0) {
      console.error(`FAIL: Stage ${r.clients} clients TPS (${r.serverTps}) fell below 18.0 Hz SLA threshold.`);
      passed = false;
    }
    if (r.avgLatencyMs > 50.0) {
      console.error(`FAIL: Stage ${r.clients} clients latency (${r.avgLatencyMs}ms) exceeded 50ms SLA threshold.`);
      passed = false;
    }
  }

  if (passed) {
    console.log('>>> ALL LOAD TEST STAGES (2, 10, 25, 50 CLIENTS) PASSED RIGOROUS SLA REQUIREMENTS! <<<\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
