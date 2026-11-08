#!/usr/bin/env node
/**
 * Fast-forwards every local branch of this repository to its upstream, and only that.
 *
 * `git fetch` moves `origin/*`, never the local branches, so a checkout that nobody pulls falls
 * behind. This script fetches, then for each local branch with an upstream:
 *  - behind only, not checked out: moves the ref (`update-ref` with the old value as a guard);
 *  - behind only, checked out in a clean worktree with no operation in progress:
 *    `git merge --ff-only` in that worktree;
 *  - anything else (ahead, diverged, upstream gone, dirty or busy worktree, another agent's
 *    worktree): reported, never touched.
 * It never resets, rebases, stashes, deletes or forces anything.
 *
 * Usage: node scripts/sync-branches.mjs [--dry-run] [--no-fetch] [--include-other-worktrees]
 *        [--quiet]
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Worktrees under these directories belong to other agents (Codex, Gemini / Antigravity). */
const OTHER_AGENT_DIRS = ['/.codex/', '/.gemini/'];

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const normal = (p) => p.replaceAll('\\', '/');

/** True when a worktree path lies in another agent's worktree directory. */
export const isOtherAgentWorktree = (worktreePath) =>
  OTHER_AGENT_DIRS.some((dir) => normal(worktreePath).toLowerCase().includes(dir));

/** Parses `git worktree list --porcelain` into a map from branch name to worktree path. */
export const parseWorktrees = (porcelain) => {
  const byBranch = new Map();
  let current;
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) current = line.slice('worktree '.length);
    else if (line.startsWith('branch refs/heads/') && current)
      byBranch.set(line.slice('branch refs/heads/'.length), current);
  }
  return byBranch;
};

/**
 * Classifies one branch from `%(upstream:track,nobracket)` and its worktree facts.
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
  'rebase-merge',
  'rebase-apply',
];

/** Why a worktree cannot be fast-forwarded, or undefined when it can. */
const worktreeBlocker = (worktreePath) => {
  if (!existsSync(worktreePath)) return 'worktree missing';
  const gitDir = path.resolve(worktreePath, git(['rev-parse', '--git-dir'], worktreePath));
  const busy = IN_PROGRESS.find((name) => existsSync(path.join(gitDir, name)));
  if (busy) return `operation in progress (${busy})`;
  if (git(['status', '--porcelain', '--untracked-files=no'], worktreePath) !== '')
    return 'uncommitted changes';
  return undefined;
};

/** Syncs the repository at `cwd`; returns one result per local branch with an upstream. */
export const syncBranches = ({
  cwd = process.cwd(),
  dryRun = false,
  fetch = true,
  includeOtherWorktrees = false,
} = {}) => {
  if (fetch) git(['fetch', '--prune', '--quiet', 'origin'], cwd);
  const worktrees = parseWorktrees(git(['worktree', 'list', '--porcelain'], cwd));
  const refs = git(
    [
      'for-each-ref',
      '--format=%(refname:short)%09%(upstream:short)%09%(upstream:track,nobracket)%09%(objectname)',
      'refs/heads',
    ],
    cwd,
  );
  const results = [];
  for (const line of refs.split('\n').filter(Boolean)) {
    const [branch, upstream, track, sha] = line.split('\t');
    const state = classify({ upstream, track });
    if (state === 'no-upstream') continue;
    const worktree = worktrees.get(branch);
    const result = { branch, upstream, state, worktree };
    results.push(result);
    if (state !== 'behind') continue;
    const target = git(['rev-parse', `refs/remotes/${upstream}`], cwd);
    result.from = sha.slice(0, 7);
    result.to = target.slice(0, 7);
    result.count = Number(git(['rev-list', '--count', `${sha}..${target}`], cwd));
    if (worktree && isOtherAgentWorktree(worktree) && !includeOtherWorktrees) {
      result.state = 'skipped';
      result.why = "another agent's worktree";
      continue;
    }
    const blocker = worktree ? worktreeBlocker(worktree) : undefined;
    if (blocker) {
      result.state = 'skipped';
      result.why = blocker;
      continue;
    }
    if (dryRun) {
      result.state = 'would-update';
      continue;
    }
    try {
      if (worktree) git(['merge', '--ff-only', '--quiet', target], worktree);
      else git(['update-ref', `refs/heads/${branch}`, target, sha], cwd);
      result.state = 'updated';
    } catch (error) {
      // For example an untracked file the fast-forward would overwrite: git refuses, nothing moves.
      result.state = 'skipped';
      result.why = `git refused: ${
        String(error.stderr ?? error.message)
          .trim()
          .split('\n')[0]
      }`;
    }
  }
  return results;
};

const describe = (r) => {
  const where = r.worktree ? ` [${normal(r.worktree)}]` : '';
  switch (r.state) {
    case 'updated':
    case 'would-update':
      return `${r.state.padEnd(12)} ${r.branch}  ${r.from}..${r.to} (${r.count} commits)${where}`;
    case 'skipped':
      return `${'skipped'.padEnd(12)} ${r.branch}  behind by ${r.count}: ${r.why}${where}`;
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const known = ['--dry-run', '--no-fetch', '--include-other-worktrees', '--quiet'];
  const unknown = [...args].filter((a) => !known.includes(a));
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(' ')}\nOptions: ${known.join(' ')}`);
    process.exit(2);
  }
  const results = syncBranches({
    dryRun: args.has('--dry-run'),
    fetch: !args.has('--no-fetch'),
    includeOtherWorktrees: args.has('--include-other-worktrees'),
  });
  const shown = args.has('--quiet') ? results.filter((r) => r.state !== 'up-to-date') : results;
  for (const r of shown) console.log(describe(r));
  const count = (s) => results.filter((r) => r.state === s).length;
  console.log(
    `${count(args.has('--dry-run') ? 'would-update' : 'updated')} ${args.has('--dry-run') ? 'would be updated' : 'updated'}, ` +
      `${count('up-to-date')} up to date, ${count('skipped')} skipped, ` +
      `${count('ahead') + count('diverged') + count('gone')} left for a person to decide.`,
  );
}
