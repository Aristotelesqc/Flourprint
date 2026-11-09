import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { classify, isOtherAgentWorktree, parseWorktrees, syncBranches } from './sync-branches.mjs';

const git = (cwd, ...args) =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();

const commit = (cwd, file, text) => {
  writeFileSync(path.join(cwd, file), text);
  git(cwd, 'add', file);
  git(cwd, 'commit', '-q', '-m', `${file}: ${text}`);
};

const BRANCHES = ['behind', 'ahead', 'diverged', 'gone', 'dirty', 'busy', 'other', 'current'];

/** An origin with branches, a clone that tracks them, and a pusher that moves origin. */
const setup = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'sync-branches-'));
  const origin = path.join(root, 'origin.git');
  const pusher = path.join(root, 'pusher');
  const clone = path.join(root, 'clone');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  git(root, 'clone', '-q', origin, pusher);
  commit(pusher, 'a.txt', '1');
  git(pusher, 'push', '-q', 'origin', 'HEAD:main');
  git(pusher, 'push', '-q', 'origin', ...BRANCHES.map((b) => `HEAD:${b}`));
  git(root, 'clone', '-q', origin, clone);
  for (const b of BRANCHES) git(clone, 'branch', '-q', '--track', b, `origin/${b}`);
  return { root, origin, pusher, clone };
};

test('classify reads the upstream track', () => {
  assert.equal(classify({ upstream: '', track: '' }), 'no-upstream');
  assert.equal(classify({ upstream: 'origin/x', track: '' }), 'up-to-date');
  assert.equal(classify({ upstream: 'origin/x', track: 'behind 3' }), 'behind');
  assert.equal(classify({ upstream: 'origin/x', track: 'ahead 1' }), 'ahead');
  assert.equal(classify({ upstream: 'origin/x', track: 'ahead 1, behind 2' }), 'diverged');
  assert.equal(classify({ upstream: 'origin/x', track: 'gone' }), 'gone');
});

test('other agents are recognised by their worktree directory', () => {
  assert.equal(isOtherAgentWorktree('C:\\Users\\me\\.codex\\worktrees\\x\\Flourprint'), true);
  assert.equal(isOtherAgentWorktree('/home/me/.gemini/antigravity/worktrees/y'), true);
  assert.equal(isOtherAgentWorktree('C:/GitHub/Flourprint/.claude/worktrees/agent-1'), false);
  assert.equal(isOtherAgentWorktree('C:/GitHub/Flourprint-sources'), false);
});

test('parseWorktrees maps branches to paths and ignores detached heads', () => {
  const map = parseWorktrees(
    'worktree /r\nHEAD 1\nbranch refs/heads/dev\n\nworktree /w\nHEAD 2\ndetached\n\nworktree /v\nHEAD 3\nbranch refs/heads/a/b\n',
  );
  assert.deepEqual(
    [...map],
    [
      ['dev', '/r'],
      ['a/b', '/v'],
    ],
  );
});

test('fast-forwards only what can be fast-forwarded, and reports the rest', () => {
  const { root, pusher, clone } = setup();
  try {
    const wt = (name) => path.join(root, name);
    const others = path.join(root, '.codex', 'worktrees', 'other');
    git(clone, 'worktree', 'add', '-q', wt('dirty'), 'dirty');
    git(clone, 'worktree', 'add', '-q', wt('busy'), 'busy');
    git(clone, 'worktree', 'add', '-q', others, 'other');
    git(clone, 'worktree', 'add', '-q', wt('current'), 'current');

    // Origin moves every branch but `gone`, which it deletes.
    // Every moved branch gets the same new origin commit, pushed in one go.
    commit(pusher, 'moved.txt', 'origin');
    const moved = ['behind', 'ahead', 'diverged', 'dirty', 'busy', 'other', 'current', 'main'];
    git(pusher, 'push', '-q', 'origin', ...moved.map((b) => `HEAD:${b}`), ':gone');
    // Local state: `diverged` gets a local commit while origin moves it too; `dirty` has an
    // uncommitted edit; `busy` has a merge in progress.
    git(clone, 'checkout', '-q', 'diverged');
    commit(clone, 'local.txt', 'local');
    git(clone, 'checkout', '-q', 'main');
    writeFileSync(path.join(wt('dirty'), 'a.txt'), 'edited');
    writeFileSync(path.join(git(wt('busy'), 'rev-parse', '--absolute-git-dir'), 'MERGE_HEAD'), '0');

    const before = (b) => git(clone, 'rev-parse', b);
    const aheadBefore = before('ahead');
    git(clone, 'fetch', '-q', 'origin');
    // Make `ahead` truly ahead: a local commit on top of its new upstream.
    git(clone, 'branch', '-q', '-f', 'ahead', 'origin/ahead');
    git(clone, 'checkout', '-q', 'ahead');
    commit(clone, 'mine.txt', 'mine');
    git(clone, 'checkout', '-q', 'main');
    assert.notEqual(before('ahead'), aheadBefore);

    const dry = syncBranches({ cwd: clone, dryRun: true });
    const state = (rs) => Object.fromEntries(rs.map((r) => [r.branch, r.state]));
    assert.deepEqual(state(dry), {
      ahead: 'ahead',
      behind: 'would-update',
      busy: 'skipped',
      current: 'would-update',
      dirty: 'skipped',
      diverged: 'diverged',
      gone: 'gone',
      main: 'would-update',
      other: 'skipped',
    });
    assert.notEqual(git(clone, 'rev-parse', 'behind'), git(clone, 'rev-parse', 'origin/behind'));

    const run = syncBranches({ cwd: clone });
    assert.equal(state(run).behind, 'updated');
    assert.equal(state(run).current, 'updated');
    assert.equal(state(run).main, 'updated');
    for (const b of ['behind', 'current', 'main']) {
      assert.equal(git(clone, 'rev-parse', b), git(clone, 'rev-parse', `origin/${b}`));
    }
    // The checked-out worktree's files moved with its branch.
    assert.equal(git(wt('current'), 'status', '--porcelain'), '');
    assert.equal(git(wt('current'), 'show', 'HEAD:moved.txt'), 'origin');
    // Nothing else moved.
    for (const b of ['dirty', 'busy', 'other', 'diverged', 'ahead']) {
      assert.notEqual(git(clone, 'rev-parse', b), git(clone, 'rev-parse', `origin/${b}`));
    }
    assert.equal(git(clone, 'rev-parse', '--verify', 'gone').length, 40);
    assert.equal(run.find((r) => r.branch === 'other').why, "another agent's worktree");
    assert.equal(run.find((r) => r.branch === 'dirty').why, 'uncommitted changes');
    assert.match(run.find((r) => r.branch === 'busy').why, /operation in progress/);

    const forced = syncBranches({ cwd: clone, includeOtherWorktrees: true });
    assert.equal(state(forced).other, 'updated');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('never moves a branch being rebased, and survives odd upstreams and names', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'sync-branches-'));
  try {
    const origin = path.join(root, 'origin.git');
    const pusher = path.join(root, 'pusher');
    const clone = path.join(root, 'clone');
    git(root, 'init', '-q', '--bare', '-b', 'main', origin);
    git(root, 'clone', '-q', origin, pusher);
    commit(pusher, 'a.txt', '1');
    commit(pusher, 'a.txt', '2');
    git(pusher, 'push', '-q', 'origin', 'HEAD:main', 'HEAD:rb', 'HEAD:feat');
    commit(pusher, 'c.txt', 'origin');
    git(pusher, 'push', '-q', 'origin', 'HEAD:rb', 'HEAD:feat');
    git(root, 'clone', '-q', origin, clone);
    for (const b of ['rb', 'feat']) git(clone, 'branch', '-q', '-f', b, `origin/${b}~1`);
    for (const b of ['rb', 'feat'])
      git(clone, 'branch', '-q', '--set-upstream-to', `origin/${b}`, b);
    // `tracklocal` follows the local branch `main` (branch.<name>.remote = .).
    git(clone, 'branch', '-q', '--track', 'tracklocal', 'main');
    // A tag with the same name as a branch makes `%(refname:short)` read `heads/feat`.
    git(clone, 'tag', 'feat', 'main');

    // In its own worktree, rebase rb's last commit onto a conflicting base: the worktree is
    // left detached with the rebase stopped, and rb itself is still strictly behind origin/rb.
    const wt = path.join(root, 'rbwt');
    git(clone, 'worktree', 'add', '-q', '-b', 'base', wt, 'rb~1');
    commit(wt, 'a.txt', 'conflict');
    assert.throws(() => git(wt, 'rebase', '-q', '--onto', 'base', 'rb~1', 'rb'));
    const rbBefore = git(clone, 'rev-parse', 'rb');

    const run = syncBranches({ cwd: clone, fetch: false });
    const byName = Object.fromEntries(run.map((r) => [r.branch, r]));
    assert.equal(byName.rb.state, 'skipped');
    assert.equal(byName.rb.why, 'being rebased or bisected');
    assert.equal(git(clone, 'rev-parse', 'rb'), rbBefore);
    assert.equal(byName.feat.state, 'updated');
    assert.equal(
      git(clone, 'rev-parse', 'refs/heads/feat'),
      git(clone, 'rev-parse', 'refs/remotes/origin/feat'),
    );
    assert.equal(byName.tracklocal.state, 'up-to-date');
    git(wt, 'rebase', '--abort');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
