#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT_TEMPLATE = path.resolve(SCRIPT_DIR, '../assets/report.html');
const RUN_COUNT = 3;
const POST_LOAD_MS = 2000;
const TIMEOUT_MS = 45000;

export function validateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Provide a complete http:// or https:// URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('Only http:// or https:// URLs without embedded credentials are supported.');
  }
  url.hash = '';
  return url.href;
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarise(capture) {
  return {
    loadMs: median(capture.runs.map((run) => run.markers.loadMs)),
    domContentMs: median(capture.runs.map((run) => run.markers.domContentMs)),
    requestCount: median(capture.runs.map((run) => run.requests.length)),
    transferBytes: median(capture.runs.map((run) => run.requests.reduce((sum, request) => sum + (request.sizeBytes || 0), 0))),
    lastRequestMs: median(capture.runs.map((run) => Math.max(0, ...run.requests.map((request) => request.endMs)))),
  };
}

export function validateCapture(value) {
  if (!value || value.schemaVersion !== 1 || typeof value.url !== 'string' ||
      !Array.isArray(value.runs) || !value.runs.length ||
      value.runs.some((run) => !Array.isArray(run.requests) || !run.markers || !Number.isFinite(run.durationMs) ||
        run.requests.some((request) => typeof request.url !== 'string' || !Number.isFinite(request.startMs) ||
          !Number.isFinite(request.endMs) || !Number.isFinite(request.sizeBytes)))) {
    throw new Error('This is not a supported page-load capture.');
  }
  return value;
}

export async function renderReport(payload) {
  const template = await readFile(REPORT_TEMPLATE, 'utf8');
  // The JSON is embedded in an HTML script element; escaping '<' prevents a
  // captured URL from closing that element and injecting markup.
  const json = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return template.replace('/*__PAGE_LOAD_DATA__*/', json);
}

function chromePath() {
  if (process.env.PAGE_LOAD_CHROME) {
    if (!existsSync(process.env.PAGE_LOAD_CHROME)) throw new Error(`Chrome was not found at PAGE_LOAD_CHROME=${process.env.PAGE_LOAD_CHROME}`);
    return process.env.PAGE_LOAD_CHROME;
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error('Chrome was not found. Set PAGE_LOAD_CHROME to its executable path.');
  return found;
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        message.error ? pending.reject(new Error(`${pending.method}: ${message.error.message}`)) : pending.resolve(message.result || {});
      } else if (message.method) {
        for (const listener of this.listeners) listener(message);
      }
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Chrome debugging connection closed.'));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out.`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  listen(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.socket.close();
  }
}

async function startChrome() {
  if (typeof WebSocket !== 'function') throw new Error('Node 22 or newer is required.');
  const profile = await mkdtemp(path.join(tmpdir(), 'page-load-chrome-'));
  const browser = spawn(chromePath(), [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  let spawnError;
  browser.on('error', (error) => { spawnError = error; });
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (spawnError) throw new Error(`Chrome could not start: ${spawnError.message}`);
      if (browser.exitCode !== null) throw new Error(`Chrome exited with code ${browser.exitCode}.`);
      try {
        const active = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8');
        port = Number(active.split('\n')[0]);
        if (port) break;
      } catch { /* Chrome is still starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!port) throw new Error('Chrome did not start its debugging endpoint.');
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!response.ok) throw new Error('Chrome debugging endpoint is unavailable.');
    const { webSocketDebuggerUrl } = await response.json();
    const socket = new WebSocket(webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return { cdp: new DevTools(socket), browser, profile };
  } catch (error) {
    await stopChrome({ browser, profile }).catch(() => {});
    throw error;
  }
}

async function stopChrome({ browser, profile }) {
  if (browser.exitCode === null && browser.signalCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 3000);
      browser.once('exit', () => { clearTimeout(timer); resolve(); });
      browser.kill();
    });
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

function initiatorLabel(initiator) {
  const frame = initiator?.stack?.callFrames?.[0];
  return {
    type: initiator?.type || 'unknown',
    url: initiator?.url || frame?.url || null,
    line: Number.isFinite(initiator?.lineNumber) ? initiator.lineNumber + 1 :
      Number.isFinite(frame?.lineNumber) ? frame.lineNumber + 1 : null,
    requestId: initiator?.requestId || null,
  };
}

export function normaliseRun(raw) {
  const first = Math.min(...raw.requests.map((request) => request.started), ...Object.values(raw.markers).filter(Number.isFinite));
  const origin = Number.isFinite(first) ? first : raw.finished;
  const ms = (value) => Number.isFinite(value) ? Math.max(0, Math.round((value - origin) * 1000)) : null;
  return {
    capturedAt: raw.capturedAt,
    timedOut: raw.timedOut,
    durationMs: ms(raw.finished),
    markers: { domContentMs: ms(raw.markers.domContent), loadMs: ms(raw.markers.load) },
    requests: raw.requests.map((request, index) => ({
      id: index + 1,
      url: request.url,
      method: request.method,
      type: request.type || 'Other',
      status: request.status,
      protocol: request.protocol,
      startMs: ms(request.started),
      responseMs: ms(request.responded),
      endMs: ms(request.ended ?? raw.finished),
      sizeBytes: request.sizeBytes || 0,
      initiator: request.initiator,
      failure: request.failure || null,
      blockedReason: request.blockedReason || null,
      incomplete: !Number.isFinite(request.ended),
      fromCache: Boolean(request.fromCache),
    })),
  };
}

async function captureRun(cdp, url) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext');
  let removeListener = () => {};
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);

    const requests = [];
    const current = new Map();
    const markers = { domContent: null, load: null };
    let finish;
    let observationTimer;
    let timedOut = false;
    const done = new Promise((resolve) => { finish = resolve; });
    const timeoutTimer = setTimeout(() => { timedOut = true; finish(); }, TIMEOUT_MS);

    removeListener = cdp.listen(({ method, params, sessionId: eventSession }) => {
      if (eventSession !== sessionId) return;
      if (method === 'Network.requestWillBeSent') {
        const previous = current.get(params.requestId);
        if (previous && params.redirectResponse) {
          previous.status = params.redirectResponse.status;
          previous.protocol = params.redirectResponse.protocol || null;
          previous.ended = params.timestamp;
          current.delete(params.requestId);
        }
        const request = {
          url: params.request.url,
          method: params.request.method,
          type: params.type,
          started: params.timestamp,
          responded: null,
          ended: null,
          status: null,
          protocol: null,
          sizeBytes: 0,
          initiator: initiatorLabel(params.initiator),
        };
        requests.push(request);
        current.set(params.requestId, request);
      } else if (method === 'Network.responseReceived') {
        const request = current.get(params.requestId);
        if (!request) return;
        request.type = params.type || request.type;
        request.status = params.response.status;
        request.protocol = params.response.protocol || null;
        request.responded = params.timestamp;
        request.fromCache = params.response.fromDiskCache || params.response.fromServiceWorker;
      } else if (method === 'Network.loadingFinished') {
        const request = current.get(params.requestId);
        if (!request) return;
        request.ended = params.timestamp;
        request.sizeBytes = params.encodedDataLength || 0;
        current.delete(params.requestId);
      } else if (method === 'Network.loadingFailed') {
        const request = current.get(params.requestId);
        if (!request) return;
        request.ended = params.timestamp;
        request.failure = params.errorText || 'Request failed';
        request.blockedReason = params.blockedReason || null;
        current.delete(params.requestId);
      } else if (method === 'Page.domContentEventFired') {
        markers.domContent = params.timestamp;
      } else if (method === 'Page.loadEventFired') {
        markers.load = params.timestamp;
        observationTimer = setTimeout(finish, POST_LOAD_MS);
      }
    });

    try {
      const navigation = await cdp.send('Page.navigate', { url }, sessionId);
      if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
      await done;
    } finally {
      clearTimeout(timeoutTimer);
      clearTimeout(observationTimer);
      removeListener();
    }
    const finished = markers.load ? markers.load + POST_LOAD_MS / 1000 :
      Math.max(...requests.map((request) => request.ended || request.started), 0);
    return normaliseRun({ capturedAt: new Date().toISOString(), timedOut, requests, markers, finished });
  } finally {
    removeListener();
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  }
}

async function ensureResultsRoot(cwd) {
  const root = path.join(cwd, '.page-load');
  await mkdir(root, { recursive: true });
  const ignore = path.join(root, '.gitignore');
  if (!existsSync(ignore)) await writeFile(ignore, '*\n', { flag: 'wx' }).catch((error) => {
    if (error.code !== 'EEXIST') throw error;
  });
  return root;
}

async function saveReport(root, name, payload, capture) {
  const directory = path.join(root, `${new Date().toISOString().replace(/[:.]/g, '-')}-${name}-${randomUUID().slice(0, 8)}`);
  await mkdir(directory);
  if (capture) await writeFile(path.join(directory, 'capture.json'), `${JSON.stringify(capture, null, 2)}\n`);
  await writeFile(path.join(directory, 'report.html'), await renderReport(payload));
  return directory;
}

async function readCapture(input) {
  const file = input.endsWith('.json') ? input : path.join(input, 'capture.json');
  return validateCapture(JSON.parse(await readFile(file, 'utf8')));
}

async function commandCapture(urlInput) {
  const url = validateUrl(urlInput);
  const chrome = await startChrome();
  const runs = [];
  try {
    for (let index = 0; index < RUN_COUNT; index++) {
      process.stderr.write(`Capture ${index + 1}/${RUN_COUNT}: ${url}\n`);
      runs.push(await captureRun(chrome.cdp, url));
    }
  } finally {
    chrome.cdp.close();
    await stopChrome(chrome);
  }
  const capture = {
    schemaVersion: 1,
    url,
    capturedAt: new Date().toISOString(),
    settings: { runs: RUN_COUNT, postLoadMs: POST_LOAD_MS, timeoutMs: TIMEOUT_MS, cache: 'empty' },
    runs,
  };
  const root = await ensureResultsRoot(process.cwd());
  const directory = await saveReport(root, 'capture', { mode: 'capture', captures: [capture] }, capture);
  const summary = summarise(capture);
  process.stdout.write(`${directory}\n${path.join(directory, 'report.html')}\nMedian load event: ${summary.loadMs ?? 'unavailable'} ms; requests: ${summary.requestCount}; transferred: ${Math.round(summary.transferBytes / 1024)} KiB\n`);
}

async function commandCompare(beforePath, afterPath) {
  const before = await readCapture(beforePath);
  const after = await readCapture(afterPath);
  const root = await ensureResultsRoot(process.cwd());
  const directory = await saveReport(root, 'comparison', { mode: 'compare', captures: [before, after] });
  const first = summarise(before);
  const second = summarise(after);
  const delta = Number.isFinite(first.loadMs) && Number.isFinite(second.loadMs) ? `${second.loadMs - first.loadMs} ms` : 'unavailable';
  process.stdout.write(`${directory}\n${path.join(directory, 'report.html')}\nMedian load-event change: ${delta}\n`);
}

function usage() {
  return 'Usage:\n  page-load capture <http(s)://url>\n  page-load compare <before-capture-directory-or-json> <after-capture-directory-or-json>\n';
}

async function main(args) {
  if (args[0] === 'capture' && args.length === 2) return commandCapture(args[1]);
  if (args[0] === 'compare' && args.length === 3) return commandCompare(args[1], args[2]);
  process.stdout.write(usage());
  if (args[0] && !['--help', '-h', 'help'].includes(args[0])) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`page-load: ${error.message}\n`);
    process.exitCode = 1;
  });
}
