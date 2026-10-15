import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REPOSITORY, VIEW_MARKER, renderView, syncView } from './backlog-view.mjs';

const issue = (number, overrides = {}) => ({
  number,
  title: `Work ${number}`,
  state: 'open',
  labels: ['status:ready', 'area:ui', 'milestone:alpha'],
  ...overrides,
});
const root = `/repos/${REPOSITORY}/issues`;
const botComment = (body, id = 42) => ({
  id,
  body,
  user: { login: 'github-actions[bot]' },
  html_url: `https://github.com/${REPOSITORY}/issues/30#issuecomment-${id}`,
});
const fakeApi = (issues, comments = []) => {
  const calls = [];
  const api = async (method, path, data) => {
    calls.push({ method, path, data });
    if (method !== 'GET') return botComment(data.body);
    const parsed = new URL(`https://api.github.com${path}`);
    const page = Number(parsed.searchParams.get('page'));
    const all = parsed.pathname.endsWith('/comments') ? comments : issues;
    return all.slice((page - 1) * 100, page * 100);
  };
  return { api, calls };
};

test('every open issue appears once; PRs and closed issues are omitted', () => {
  const rendered = renderView([
    issue(30),
    issue(9),
    issue(77, { pull_request: {} }),
    issue(8, { state: 'closed' }),
  ]);
  assert.match(rendered, /2 open issues/);
  assert.equal(rendered.match(/\[#9 Work 9\]/g).length, 1);
  assert.match(rendered, /\[#30 Work 30\]/);
  assert.doesNotMatch(rendered, /Work 77|Work 8/);
  assert.match(rendered, /\| ready \| 2 \|/);
});

test('rendering is deterministic and does not mutate source issues or labels', () => {
  const input = [
    issue(20),
    issue(2, {
      labels: [
        { name: 'status:review' },
        { name: 'milestone:later' },
        { name: 'area:data' },
        { name: 'priority:p1' },
      ],
    }),
  ];
  const before = structuredClone(input);
  const first = renderView(input);
  assert.equal(first, renderView([...input].reverse()));
  assert.deepEqual(input, before);
  assert.match(first, /\| data \| later \| p1 \|/);
  assert.match(first, /None\. Priority may be unspecified/);
});

test('missing, duplicate and unknown classification stays visible', () => {
  const rendered = renderView([
    issue(1, { labels: [] }),
    issue(2, {
      labels: [
        'status:ready',
        'status:review',
        'area:unknown',
        'milestone:alpha',
        'milestone:later',
        'priority:p9',
        'priority:p1',
      ],
    }),
    issue(3, { labels: ['status:done', 'area:ui', 'milestone:alpha'] }),
  ]);
  assert.match(rendered, /### unclassified/);
  assert.match(rendered, /\| unclassified \| 3 \|/);
  for (const message of [
    'missing status',
    'missing area',
    'missing milestone',
    'multiple status labels',
    'unknown area:unknown',
    'multiple milestone labels',
    'multiple priority labels',
    'unknown priority:p9',
    'unknown status:done',
  ])
    assert.ok(rendered.includes(message), message);
  assert.doesNotMatch(rendered, /missing priority/);
  assert.match(rendered, /ready, review/);
});

test('titles cannot inject table cells, HTML or Markdown links', () => {
  const rendered = renderView([
    issue(1, { title: 'A | <img> [click](evil)\n`code` **bold** \\ end' }),
  ]);
  assert.match(rendered, /&#124; &lt;img&gt;/);
  assert.ok(rendered.includes('\\[click\\]'));
  assert.ok(rendered.includes('\\`code\\`'));
  assert.doesNotMatch(rendered, /<img>|\n`code`/);
});

test('preview reads paginated issues without reading comments or writing', async () => {
  const { api, calls } = fakeApi(Array.from({ length: 201 }, (_, index) => issue(index + 1)));
  const result = await syncView(api, { preview: true });
  assert.equal(result.action, 'preview');
  assert.match(result.view, /201 open issues/);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.method === 'GET' && !call.path.includes('/comments')));
});

test('publish creates only a comment on #30, without issue mutations', async () => {
  const { api, calls } = fakeApi([issue(1)]);
  assert.equal((await syncView(api, { now: () => '2026-10-12T14:00:00Z' })).action, 'created');
  const writes = calls.filter((call) => call.method !== 'GET');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, `${root}/30/comments`);
  assert.deepEqual(Object.keys(writes[0].data), ['body']);
  assert.match(writes[0].data.body, /Snapshot updated \(UTC\): 2026-10-12T14:00:00Z/);
});

test('unchanged content does not rewrite its timestamp; changed title updates the existing comment', async () => {
  const initial = fakeApi([issue(1)]);
  await syncView(initial.api, { now: () => 'first' });
  const saved = botComment(initial.calls.at(-1).data.body);
  const unchanged = fakeApi([issue(1)], [saved]);
  assert.equal((await syncView(unchanged.api, { now: () => 'later' })).action, 'unchanged');
  assert.ok(unchanged.calls.every((call) => call.method === 'GET'));
  const changed = fakeApi([issue(1, { title: 'Renamed' })], [saved]);
  assert.equal((await syncView(changed.api)).action, 'updated');
  assert.equal(changed.calls.at(-1).path, `${root}/comments/42`);
  assert.match(changed.calls.at(-1).data.body, /Renamed/);
});

test('comment pagination finds the owned view and ignores human marker imitations', async () => {
  const human = { ...botComment(VIEW_MARKER), user: { login: 'human' } };
  const comments = [...Array.from({ length: 100 }, () => human), botComment(VIEW_MARKER)];
  const { api, calls } = fakeApi([issue(1)], comments);
  assert.equal((await syncView(api)).action, 'updated');
  assert.equal(calls.filter((call) => call.path.includes('/30/comments?')).length, 2);
  assert.equal(calls.at(-1).path, `${root}/comments/42`);
});

test('duplicate owned views and API failures fail before any write', async () => {
  const duplicates = fakeApi([issue(1)], [botComment(VIEW_MARKER), botComment(VIEW_MARKER, 43)]);
  await assert.rejects(syncView(duplicates.api), /Multiple Actions-owned/);
  assert.ok(duplicates.calls.every((call) => call.method === 'GET'));
  let requests = 0;
  await assert.rejects(
    syncView(async () => {
      requests++;
      throw new Error('API unavailable');
    }),
    /API unavailable/,
  );
  assert.equal(requests, 1);
});

test('oversized output and invalid metadata fail rather than truncate or publish', async () => {
  const huge = fakeApi(
    Array.from({ length: 30 }, (_, index) => issue(index + 1, { title: 'x'.repeat(3_000) })),
  );
  await assert.rejects(syncView(huge.api), /size budget/);
  assert.ok(huge.calls.every((call) => call.method === 'GET'));
  assert.throws(() => renderView([issue('bad')]), /Invalid issue metadata/);
});

test('tampering with generated text causes reconstruction even if the old fingerprint remains', async () => {
  const initial = fakeApi([issue(1)]);
  await syncView(initial.api);
  const body = initial.calls.at(-1).data.body.replace('Work 1', 'Incorrect title');
  const changed = fakeApi([issue(1)], [botComment(body)]);
  assert.equal((await syncView(changed.api)).action, 'updated');
  assert.doesNotMatch(changed.calls.at(-1).data.body, /Incorrect title/);
});
