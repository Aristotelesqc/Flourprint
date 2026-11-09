#!/usr/bin/env node
/**
 * Fast-forwards every local branch of this repository to its upstream, and only that.
 *
 * `git fetch` moves `origin/*`, never the local branches, so a checkout that nobody pulls falls
 * behind. This script fetches, then for each local branch with an upstream:
 *  - behind only, not checked out: moves the ref (`update-ref` with the old value as a guard);
 *  - behind only, checked out in a clean worktree with no operation in progress:
 *    `git merge --ff-only` in that worktree;
 *  - anything else (ahead, diverged, upstream gone, dirty or busy worktree, a branch being rebased
 *    or bisected, another agent's worktree): reported, never touched.
 * It never resets, rebases, stashes, deletes or forces anything.
 *
 * Usage: node scripts/sync-branches.mjs [--dry-run] [--no-fetch] [--include-other-worktrees]
 *        [--quiet]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Worktrees under these directories belong to other agents (Codex, Gemini / Antigravity). */
const OTHER_AGENT_DIRS = ['/.codex/', '/.gemini/'];

/** Never wait on a credential prompt: the script may run unattended. */
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };

const git = (args, cwd) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: GIT_ENV,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

/** True when git exits 0 (for predicates such as `merge-base --is-ancestor`). */
const gitOk = (args, cwd) => {
  try {
    git(args, cwd);
    return true;
  } catch {
    return false;
  }
};

const normal = (p) => p.replaceAll('\\', '/');
const HEADS = 'refs/heads/';

/** True when a worktree path lies in another agent's worktree directory. */
export const isOtherAgentWorktree = (worktreePath) =>
  OTHER_AGENT_DIRS.some((dir) => normal(worktreePath).toLowerCase().includes(dir));

/**
 * Parses `git worktree list --porcelain` into worktree entries: `{ path, branch }`, `branch`
 * undefined for a detached HEAD (which includes a worktree in the middle of a rebase or bisect).
 */
export const parseWorktreeList = (porcelain) => {
  const worktrees = [];
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) worktrees.push({ path: line.slice('worktree '.length) });
    else if (line.startsWith(`branch ${HEADS}`) && worktrees.length > 0)
      worktrees.at(-1).branch = line.slice(`branch ${HEADS}`.length);
  }
  return worktrees;
};

/** Parses `git worktree list --porcelain` into a map from branch name to worktree path. */
export const parseWorktrees = (porcelain) =>
  new Map(
    parseWorktreeList(porcelain)
      .filter((w) => w.branch)
      .map((w) => [w.branch, w.path]),
  );

/**
 * Classifies one branch from `%(upstream:track,nobracket)`.
 * Returns one of: up-to-date, behind, ahead, diverged, gone, no-upstream.
 */
export const classify = ({ upstream, track }) => {
  if (!upstream) return 'no-upstream';
  if (track === 'gone') return 'gone';
  const ahead = /ahead (\d+)/.exec(track);
  const behind = /behind (\d+)/.exec(track);
  if (ahead && behind) return 'diverged';
  if (ahead) return 'ahead';
  if (behind) return 'behind';
  return 'up-to-date';
};

const IN_PROGRESS = [
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'BISECT_LOG',
  'BISECT_START',
  'sequencer',
  'rebase-merge',
  'rebase-apply',
  'index.lock',
];

const gitDirOf = (worktreePath) =>
  path.resolve(worktreePath, git(['rev-parse', '--git-dir'], worktreePath));

/**
 * Branches that a detached worktree is busy with: a rebase records the branch in
 * `rebase-*` `head-name`, a bisect in `BISECT_START`. Moving such a branch would break the
 * operation. Returns a map from branch name to worktree path.
 */
const busyDetachedBranches = (worktrees) => {
  const busy = new Map();
  for (const w of worktrees) {
    if (w.branch || !existsSync(w.path)) continue;
    let gitDir;
    try {
      gitDir = gitDirOf(w.path);
    } catch {
      continue;
    }
    for (const file of ['rebase-merge/head-name', 'rebase-apply/head-name', 'BISECT_START']) {
      const full = path.join(gitDir, file);
      if (!existsSync(full)) continue;
      const name = readFileSync(full, 'utf8').trim();
      busy.set(name.startsWith(HEADS) ? name.slice(HEADS.length) : name, w.path);
    }
  }
  return busy;
};

/** Why a worktree cannot be fast-forwarded, or undefined when it can. */
const worktreeBlocker = (worktreePath) => {
  if (!existsSync(worktreePath)) return 'worktree missing';
  const gitDir = gitDirOf(worktreePath);
  const busy = IN_PROGRESS.find((name) => existsSync(path.join(gitDir, name)));
  if (busy) return `operation in progress (${busy})`;
  if (git(['status', '--porcelain', '--untracked-files=no'], worktreePath) !== '')
    return 'uncommitted changes';
  return undefined;
};

const gitMessage = (error) =>
  String(error.stderr || error.message)
    .trim()
    .split('\n')[0];

/** Syncs the repository at `cwd`; returns one result per local branch with an upstream. */
export const syncBranches = ({
  cwd = process.cwd(),
  dryRun = false,
  fetch = true,
  includeOtherWorktrees = false,
} = {}) => {
  if (fetch) git(['fetch', '--prune', '--quiet', 'origin'], cwd);
  const worktreeList = parseWorktreeList(git(['worktree', 'list', '--porcelain'], cwd));
  const worktrees = new Map(worktreeList.filter((w) => w.branch).map((w) => [w.branch, w.path]));
  const busyDetached = busyDetachedBranches(worktreeList);
  // Full ref names: `:short` forms are ambiguous when a tag shares a branch's or a remote's name.
  const refs = git(
    [
      'for-each-ref',
      '--format=%(refname)%09%(upstream)%09%(upstream:short)%09%(upstream:track,nobracket)%09%(objectname)',
      'refs/heads',
    ],
    cwd,
  );
  const results = [];
  for (const line of refs.split('\n').filter(Boolean)) {
    const [ref, upstreamRef, upstream, track, sha] = line.split('\t');
    const branch = ref.slice(HEADS.length);
    const state = classify({ upstream: upstreamRef, track });
    if (state === 'no-upstream') continue;
    const worktree = worktrees.get(branch) ?? busyDetached.get(branch);
    const result = { branch, upstream, state, worktree };
    results.push(result);
    if (state !== 'behind') continue;
    const skip = (why) => {
      result.state = 'skipped';
      result.why = why;
    };
    try {
      const target = git(['rev-parse', '--verify', '--quiet', `${upstreamRef}^{commit}`], cwd);
      result.from = sha.slice(0, 7);
      result.to = target.slice(0, 7);
      result.count = Number(git(['rev-list', '--count', `${sha}..${target}`], cwd));
      if (busyDetached.has(branch)) {
        skip('being rebased or bisected');
        continue;
      }
      if (worktree && isOtherAgentWorktree(worktree) && !includeOtherWorktrees) {
        skip("another agent's worktree");
        continue;
      }
      const blocker = worktree ? worktreeBlocker(worktree) : undefined;
      if (blocker) {
        skip(blocker);
        continue;
      }
      // Re-check just before moving: only a strict fast-forward is allowed.
      if (!gitOk(['merge-base', '--is-ancestor', sha, target], cwd)) {
        skip('upstream is no longer a fast-forward');
        continue;
      }
      if (dryRun) {
        result.state = 'would-update';
        continue;
      }
      if (worktree) git(['merge', '--ff-only', '--quiet', target], worktree);
      else git(['update-ref', ref, target, sha], cwd);
      result.state = 'updated';
    } catch (error) {
      // For example an untracked file the fast-forward would overwrite: git refuses, nothing moves.
      skip(`git refused: ${gitMessage(error)}`);
    }
  }
  return results;
};

const describe = (r) => {
  const where = r.worktree ? ` [${normal(r.worktree)}]` : '';
  const by = r.count === undefined ? '' : ` by ${r.count}`;
  switch (r.state) {
    case 'updated':
    case 'would-update':
      return `${r.state.padEnd(12)} ${r.branch}  ${r.from}..${r.to} (${r.count} commits)${where}`;
    case 'skipped':
      return `${'skipped'.padEnd(12)} ${r.branch}  behind${by}: ${r.why}${where}`;
    case 'ahead':
      return `${'ahead'.padEnd(12)} ${r.branch}  has commits not on ${r.upstream}; not touched`;
    case 'diverged':
      return `${'diverged'.padEnd(12)} ${r.branch}  and ${r.upstream} have both moved; not touched`;
    case 'gone':
      return `${'gone'.padEnd(12)} ${r.branch}  its upstream ${r.upstream} no longer exists`;
    default:
      return `${r.state.padEnd(12)} ${r.branch}`;
  }
};

const isMain = () => {
  if (!process.argv[1]) return false;
  const a = path.resolve(process.argv[1]);
  const b = fileURLToPath(import.meta.url);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
};

if (isMain()) {
  const args = new Set(process.argv.slice(2));
  const known = ['--dry-run', '--no-fetch', '--include-other-worktrees', '--quiet'];
  const unknown = [...args].filter((a) => !known.includes(a));
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(' ')}\nOptions: ${known.join(' ')}`);
    process.exit(2);
  }
  let results;
  try {
    results = syncBranches({
      dryRun: args.has('--dry-run'),
      fetch: !args.has('--no-fetch'),
      includeOtherWorktrees: args.has('--include-other-worktrees'),
    });
  } catch (error) {
    console.error(`sync-branches: ${gitMessage(error)}`);
    process.exit(1);
  }
  const shown = args.has('--quiet') ? results.filter((r) => r.state !== 'up-to-date') : results;
  for (const r of shown) console.log(describe(r));
  const count = (s) => results.filter((r) => r.state === s).length;
  console.log(
    `${count(args.has('--dry-run') ? 'would-update' : 'updated')} ${args.has('--dry-run') ? 'would be updated' : 'updated'}, ` +
      `${count('up-to-date')} up to date, ${count('skipped')} skipped, ` +
      `${count('ahead') + count('diverged') + count('gone')} left for a person to decide.`,
  );
}
