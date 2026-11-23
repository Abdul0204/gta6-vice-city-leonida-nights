// Leonida Nights — CDP play-test. Headless Chromium + raw CDP over
// Node's built-in WebSocket. No npm deps. Run: node scripts/cdp-test.mjs
// Exits 0 when: game reaches ready, frames advance, 0 console errors,
// 0 page exceptions, 0 failed requests, 0 external requests, and the
// debug hooks (mission / wanted / fire / carjack) all respond.
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8901;
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = 'http://127.0.0.1:' + PORT;
const errors = [];
const externalRequests = [];
const failedRequests = [];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(fn, timeout, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await fn()) return true; } catch (e) { /* retry */ }
    await sleep(300);
  }
  throw new Error('timeout waiting for ' + label);
}

async function main() {
  // 1. Static server.
  const server = spawn('node', ['--experimental-strip-types', 'serve.ts'], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write('[serve] ' + d));
  server.stderr.on('data', (d) => process.stdout.write('[serve:err] ' + d));
  await waitFor(async () => {
    try { const r = await fetch(BASE + '/game/index.html'); return r.status === 200; } catch (e) { return false; }
  }, 15000, 'server');
  console.log('server up on ' + PORT);

  // 2. Headless Chromium with SwiftShader WebGL.
  const chrome = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--window-size=1280,720', '--remote-debugging-port=9222', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stderr.on('data', () => { /* chrome logs are noisy; ignore */ });
  const version = await waitFor(async () => {
    try { const r = await fetch('http://127.0.0.1:9222/json/version'); return await r.json(); } catch (e) { return null; }
  }, 20000, 'chrome devtools').catch(() => null);
  if (!version) throw new Error('chrome did not expose devtools');
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');

  // 3. CDP over WebSocket.
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nextId = 1;
  const pending = new Map();
  const navEvents = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      const p = msg.params || {};
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push('exception: ' + JSON.stringify(p.exceptionDetails.exception?.description || p.exceptionDetails.text || p));
      }
      if (msg.method === 'Runtime.consoleAPICalled' && p.type === 'error') {
        errors.push('console.error: ' + (p.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
      }
      if (msg.method === 'Network.loadingFailed') {
        failedRequests.push(p.errorText + ' ' + (p.canceled ? '(canceled)' : ''));
      }
      if (msg.method === 'Network.requestWillBeSent') {
        const url = p.request?.url || '';
        if (url && !url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:')) {
          externalRequests.push(url);
        }
      }
      if (msg.method === 'Page.frameNavigated') navEvents.push(p.frame?.url);
    }
  };
  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('cdp timeout ' + method)); } }, 20000);
    });
  }
  async function evaljs(expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + '/game/index.html' });
  await waitFor(async () => {
    try { return await evaljs('window.Leonida && window.Leonida.ready === true'); } catch (e) { return false; }
  }, 30000, 'Leonida.ready');
  console.log('game ready');

  const counts = await evaljs('window.Leonida.debug.counts()');
  console.log('counts:', JSON.stringify(counts));
  await sleep(1500);
  const state0 = await evaljs('window.Leonida.debug.state()');
  console.log('state after 1.5s:', JSON.stringify(state0));
  const frames0 = state0.frames;

  const shotLens = {};
  async function shot(name) {
    // This headless Chromium does not composite WebGL into
    // Page.captureScreenshot (verified with a trivial WebGL control page),
    // so read the frame inside a rAF callback via readPixels and encode
    // it through a 2D canvas. preserveDrawingBuffer is on in the renderer
    // for the in-game photo mode; the rAF sync is what makes the read valid.
    const url = await evaljs(`(async () => {
      const grab = () => new Promise((resolve) => {
        requestAnimationFrame(() => {
          const c = document.querySelector('#game-canvas');
          const gl = c.getContext('webgl2');
          const w = c.width, h = c.height;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
          const tctx = tmp.getContext('2d');
          const img = tctx.createImageData(w, h);
          for (let y = 0; y < h; y++) {
            const srcY = h - 1 - y;
            img.data.set(px.subarray(srcY * w * 4, (srcY + 1) * w * 4), y * w * 4);
          }
          tctx.putImageData(img, 0, 0);
          resolve(tmp.toDataURL('image/jpeg', 0.82));
        });
      });
      return await grab();
    })()`);
    if (url && url.length > 20000) {
      writeFileSync(join(ROOT, 'screenshots', name), Buffer.from(url.split(',')[1], 'base64'));
      shotLens[name] = url.length;
      console.log('shot saved (raf):', name, url.length + ' chars');
      return;
    }
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
    writeFileSync(join(ROOT, 'screenshots', name), Buffer.from(r.data, 'base64'));
    shotLens[name] = 0;
    console.log('shot saved (page fallback):', name);
  }

  // 4-vista: Ocean Beach.
  await evaljs('window.Leonida.debug.teleport(150,-40)');
  await sleep(1200);
  await shot('4-vista.jpg');

  // 1-chase: wanted 3 (heli + units), drive forward.
  await evaljs('window.Leonida.debug.setWanted(3)');
  await evaljs('window.Leonida.debug.teleport(0,0)');
  await evaljs('window.Leonida.debug.setInput({forward:true})');
  await sleep(2500);
  await evaljs('window.Leonida.debug.setInput({forward:false})');
  const chase = await evaljs('window.Leonida.debug.state()');
  console.log('chase state:', JSON.stringify(chase));
  await shot('1-chase.jpg');

  // 2-heist: clear wanted first (a chase would bust the player mid-test),
  // then start mission 2 and go to its target.
  await evaljs('window.Leonida.debug.setWanted(0)');
  await evaljs('window.Leonida.debug.startMission(2)');
  await evaljs('window.Leonida.debug.teleport(-28,-152)');
  await evaljs('window.Leonida.debug.fire()');
  await sleep(1200);
  const heist = await evaljs('window.Leonida.debug.state()');
  console.log('heist state:', JSON.stringify(heist));
  await shot('2-heist.jpg');

  // 3-race: teleport onto the nearest traffic car, then carjack it.
  const nc = await evaljs('window.Leonida.debug.nearestCar()');
  console.log('nearest car:', JSON.stringify(nc));
  let jacked = null;
  if (nc) {
    await evaljs(`window.Leonida.debug.teleport(${nc.x},${nc.z})`);
    await sleep(300);
    jacked = await evaljs('window.Leonida.debug.carjack()');
  }
  console.log('carjack:', jacked ? 'ok' : 'FAILED (no car in range)');
  if (jacked) {
    await evaljs('window.Leonida.debug.setInput({forward:true, sprint:true})');
    await sleep(2500);
    await evaljs('window.Leonida.debug.setInput({forward:false, sprint:false})');
  }
  await shot('3-race.jpg');

  const state1 = await evaljs('window.Leonida.debug.state()');
  console.log('final state:', JSON.stringify(state1));
  console.log('frames advanced:', state1.frames - frames0);
  console.log('console errors:', errors.length, errors.slice(0, 5));
  console.log('failed requests:', failedRequests.length, failedRequests.slice(0, 5));
  console.log('external requests:', externalRequests.length, externalRequests.slice(0, 5));

  ws.close();
  chrome.kill('SIGKILL');
  server.kill('SIGKILL');

  const shotsOk = ['1-chase.jpg', '2-heist.jpg', '3-race.jpg', '4-vista.jpg']
    .every((f) => existsSync(join(ROOT, 'screenshots', f)) && (shotLens[f] || 0) > 20000);
  console.log('shot data lengths:', JSON.stringify(shotLens));
  const ok = errors.length === 0 && failedRequests.length === 0 &&
    externalRequests.length === 0 && shotsOk &&
    state1.frames > frames0 && state0.frames > 10 &&
    counts.buildings > 50 && counts.cars === 40 && counts.peds === 70 &&
    chase.wanted >= 3 && heist.mission === 2 && !!jacked;
  console.log('\nCDP PLAY-TEST: ' + (ok ? 'PASS' : 'FAIL'));
  if (!ok) {
    console.log('detail: shotsOk=' + shotsOk + ' frames0=' + frames0 + ' frames1=' + state1.frames +
      ' wanted=' + chase.wanted + ' mission=' + heist.mission + ' carjack=' + !!jacked);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('CDP TEST ERROR:', e.message); process.exit(2); });
