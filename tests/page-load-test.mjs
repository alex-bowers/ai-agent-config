import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normaliseRun, renderReport, summarise, validateCapture, validateUrl } from '../agents/skills/page-load/scripts/page-load.mjs';

test('accepts only complete web URLs without embedded credentials', () => {
  assert.equal(validateUrl('https://bluebaytravel.test/path#section'), 'https://bluebaytravel.test/path');
  for (const value of ['/local', 'file:///etc/passwd', 'https://user:secret@example.com/', 'invalid']) {
    assert.throws(() => validateUrl(value));
  }
});

test('normalises request and milestone times relative to first event', () => {
  const run = normaliseRun({
    capturedAt: '2026-11-04T00:00:00.000Z',
    timedOut: false,
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

test('escapes captured URLs before embedding JSON in HTML', async () => {
  const hostile = '</script><img src=x onerror=alert(1)>';
  const html = await renderReport({ mode: 'capture', captures: [{ url: hostile }] });
  assert.equal(html.includes(hostile), false);
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
});
