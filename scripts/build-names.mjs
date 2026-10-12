// Build names of ADR 0016, as a pure function of the root version and the CI context, so they can
// be tested. scripts/build-id.mjs prints them for the CI jobs.

// Code names tell dev builds apart at a glance (owner request of 2026-10-12). They are derived from
// the commit, never drawn at random, so the dev APK and the dev site built from one commit carry
// the same name. 64 × 64 words: two commits rarely share one, and the full build name keeps the
// commit hash anyway. Words have at most 7 letters so the label fits a phone's app bar.
const ADJECTIVES = [
  'amber',
  'ancient',
  'autumn',
  'blazing',
  'bold',
  'brave',
  'breezy',
  'bright',
  'buttery',
  'calm',
  'cheery',
  'clever',
  'cosy',
  'crimson',
  'crispy',
  'curious',
  'dancing',
  'dappled',
  'dawning',
  'dusty',
  'eager',
  'zesty',
  'fancy',
  'fluffy',
  'flying',
  'frosty',
  'gentle',
  'gilded',
  'golden',
  'grand',
  'happy',
  'hidden',
  'humble',
  'jolly',
  'lively',
  'lucky',
  'mellow',
  'merry',
  'misty',
  'nimble',
  'nutty',
  'patient',
  'plucky',
  'shiny',
  'proud',
  'quiet',
  'rapid',
  'rustic',
  'salty',
  'silver',
  'sleepy',
  'smoky',
  'snowy',
  'sparkly',
  'spicy',
  'starry',
  'sturdy',
  'sunny',
  'swift',
  'tender',
  'toasty',
  'velvet',
  'roaming',
  'weird',
];
const NOUNS = [
  'acorn',
  'almond',
  'bagel',
  'bun',
  'basket',
  'barley',
  'beehive',
  'biscuit',
  'berry',
  'boule',
  'brioche',
  'puffin',
  'canyon',
  'clove',
  'cedar',
  'challah',
  'quince',
  'pita',
  'ginger',
  'clover',
  'comet',
  'cracker',
  'cookie',
  'crumb',
  'crust',
  'danish',
  'falcon',
  'fern',
  'fig',
  'naan',
  'waffle',
  'glacier',
  'harvest',
  'pecan',
  'heron',
  'honey',
  'kettle',
  'lantern',
  'loaf',
  'maple',
  'meadow',
  'mill',
  'muffin',
  'nutmeg',
  'oat',
  'orchard',
  'otter',
  'pastry',
  'pebble',
  'pretzel',
  'raisin',
  'relic',
  'rye',
  'saffron',
  'scone',
  'sesame',
  'sparrow',
  'spelt',
  'starter',
  'strudel',
  'thistle',
  'walnut',
  'wheat',
  'willow',
];

/** The code name of a commit: an adjective and a noun picked from its hash. */
export const codeName = (sha) => {
  if (!/^[0-9a-f]{16,}$/i.test(sha)) throw new Error(`not a commit hash: ${sha}`);
  const adjective = ADJECTIVES[parseInt(sha.slice(0, 8), 16) % ADJECTIVES.length];
  const noun = NOUNS[parseInt(sha.slice(8, 16), 16) % NOUNS.length];
  return `${adjective}-${noun}`;
};

/**
 * `version` is the root package.json version; `env` the CI environment (GITHUB_ACTIONS,
 * GITHUB_RUN_NUMBER, GITHUB_REF_NAME, HEAD_SHA or GITHUB_SHA, PR_NUMBER).
 * - `build`: the full name, with the run and the short hash (Advanced, feedback export).
 * - `label`: the short name shown in the app bar.
 * - `channel`: `release` (main), `dev`, `preview` (pull requests, other branches) or `local`. Only
 *   non-release builds offer to load the latest dev build.
 */
export const buildNames = (version, env) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!match) throw new Error(`package.json version is not MAJOR.MINOR.PATCH: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (minor > 999 || patch > 999) throw new Error(`version ${version} does not fit a versionCode`);

  const run = env.GITHUB_RUN_NUMBER;
  const fullSha = env.HEAD_SHA || env.GITHUB_SHA || '';
  const sha = fullSha.slice(0, 7);
  const pr = env.PR_NUMBER;
  const branch = env.GITHUB_REF_NAME?.replace(/[^0-9A-Za-z-]/g, '-');

  let build;
  let label;
  let channel = 'preview';
  if (!env.GITHUB_ACTIONS) {
    build = `${version}-local`;
    label = `v${version}-local`;
    channel = 'local';
  } else if (pr) {
    build = `${version}-pr.${pr}.${run}+${sha}`;
    label = `v${version}-${codeName(fullSha)}`;
  } else if (env.GITHUB_REF_NAME === 'main') {
    build = version;
    label = `v${version}`;
    channel = 'release';
  } else if (env.GITHUB_REF_NAME === 'dev') {
    build = `${version}-dev.${run}+${sha}`;
    label = `v${version}-${codeName(fullSha)}`;
    channel = 'dev';
  } else {
    build = `${version}-${branch}.${run}+${sha}`;
    label = `v${version}-${branch}-${codeName(fullSha)}`;
  }
  return { version, build, label, channel, versionCode: major * 1_000_000 + minor * 1_000 + patch };
};
