import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normaliseRun, parseViewport, renderReport, summarise, validateCapture, validateUrl } from '../agents/skills/page-load/scripts/page-load.mjs';

test('resolves named viewport presets and explicit CSS pixel dimensions', () => {
  assert.deepEqual(parseViewport('mobile'), { width: 390, height: 844 });
  assert.deepEqual(parseViewport('tablet'), { width: 768, height: 1024 });
  assert.deepEqual(parseViewport('desktop'), { width: 1440, height: 900 });
  assert.deepEqual(parseViewport('390x844'), { width: 390, height: 844 });
  for (const value of ['phone', 'Mobile', '390', '390X844', '390x0', '0x844', '10001x844', '390x10001', '390x844px', '1.5x844']) {
    assert.throws(() => parseViewport(value));
  }
});

test('accepts only complete web URLs without embedded credentials', () => {
  assert.equal(validateUrl('https://bluebaytravel.test/path#section'), 'https://bluebaytravel.test/path');
  for (const value of ['/local', 'file:///etc/passwd', 'https://user:secret@example.com/', 'invalid']) {
    assert.throws(() => validateUrl(value));
  }
});

test('normalises request and milestone times relative to first event', () => {
  const mainThread = { supported: true, frames: [{ startMs: 5, durationMs: 120, scripts: [] }] };
  const run = normaliseRun({
    capturedAt: '2026-11-04T00:00:00.000Z',
    timedOut: false,
    mainThread,
    finished: 102,
    markers: { domContent: 100.5, load: 101 },
    requests: [{
      url: 'https://example.com/app.js', method: 'GET', type: 'Script',
      started: 100, responded: 100.3, ended: 100.7, status: 200,
      sizeBytes: 1024, initiator: { type: 'parser', url: 'https://example.com/' },
    }],
  });
  assert.equal(run.markers.domContentMs, 500);
  assert.equal(run.markers.loadMs, 1000);
  assert.equal(run.durationMs, 2000);
  assert.deepEqual([run.requests[0].startMs, run.requests[0].responseMs, run.requests[0].endMs], [0, 300, 700]);
  assert.equal(run.requests[0].incomplete, false);
  assert.deepEqual(run.mainThread, mainThread);
});

test('normalises Chrome request phases and optional connection timings', () => {
  const run = normaliseRun({
    capturedAt: '2026-11-04T00:00:00.000Z', timedOut: false, finished: 106,
    markers: { domContent: 105, load: 105.5 },
    requests: [{
      url: 'https://example.com/image.jpg', method: 'GET', type: 'Image',
      started: 100, responded: 104.9, ended: 105, sizeBytes: 1024,
      timing: { requestTime: 100, proxyStart: -1, proxyEnd: -1,
        dnsStart: 100, dnsEnd: 120, connectStart: 120, connectEnd: 170,
        sslStart: 130, sslEnd: 165, sendStart: 4000, sendEnd: 4010,
        receiveHeadersStart: 4800, receiveHeadersEnd: 4900 },
    }],
  });
  assert.deepEqual(run.requests[0].timing, {
    sendStartMs: 4000, sendEndMs: 4010, headersStartMs: 4800, headersEndMs: 4900,
    proxyMs: null, dnsMs: 20, connectMs: 50, sslMs: 35,
  });
  assert.equal(run.requests[0].endMs - run.requests[0].timing.headersEndMs, 100);
});

test('omits unavailable, invalid and incomplete request phases', () => {
  const base = { url: 'https://example.com/', started: 100, responded: 100.2, ended: 100.3, sizeBytes: 10 };
  const run = normaliseRun({ capturedAt: '2026-11-04T00:00:00.000Z', timedOut: false,
    finished: 101, markers: { domContent: 100.5, load: 100.6 }, requests: [
      base,
      { ...base, timing: { requestTime: 100, sendStart: 150, sendEnd: 160, receiveHeadersEnd: 400 } },
      { ...base, ended: null, timing: { requestTime: 100, sendStart: 150, sendEnd: 160, receiveHeadersEnd: 200 } },
    ],
  });
  assert.deepEqual(run.requests.map((request) => request.timing), [null, null, null]);
});

test('summarises repeated runs with medians', () => {
  const capture = { runs: [
    { markers: { loadMs: 100 }, durationMs: 150, requests: [{ sizeBytes: 100, endMs: 120 }] },
    { markers: { loadMs: 900 }, durationMs: 950, requests: [{ sizeBytes: 300, endMs: 920 }] },
    { markers: { loadMs: 110 }, durationMs: 160, requests: [{ sizeBytes: 200, endMs: 130 }] },
  ] };
  assert.equal(summarise(capture).loadMs, 110);
  assert.equal(summarise(capture).transferBytes, 200);
  assert.equal(summarise(capture).lastRequestMs, 130);
});

test('rejects malformed capture data', () => {
  assert.throws(() => validateCapture({ schemaVersion: 1, url: 'https://example.com', runs: [] }));
  assert.throws(() => validateCapture({ schemaVersion: 2, url: 'https://example.com', runs: [{ markers: {}, requests: [], durationMs: 0 }] }));
  assert.throws(() => validateCapture({ schemaVersion: 1, url: 'https://example.com', runs: [{ markers: {}, requests: [{ url: 'x' }], durationMs: 0 }] }));
});

test('accepts captures created before main-thread measurements were added', () => {
  const capture = { schemaVersion: 1, url: 'https://example.com/', runs: [{
    markers: { loadMs: 20 }, durationMs: 2020,
    requests: [{ url: 'https://example.com/', startMs: 0, endMs: 20, sizeBytes: 100 }],
  }] };
  assert.equal(validateCapture(capture), capture);
});

test('escapes captured URLs before embedding JSON in HTML', async () => {
  const hostile = '</script><img src=x onerror=alert(1)>';
  const html = await renderReport({ mode: 'capture', captures: [{ url: hostile }] });
  assert.equal(html.includes(hostile), false);
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
});
