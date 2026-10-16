# Hosting a visual review

Read only when packaging or publishing a mockup. Use existing authorized hosting when it
fits the review; provider configuration is not a production design decision.

## Static publication directory

Prepare a separate directory containing only reviewed deliverables, for example:

```text
index.html              Review gallery
mockup.html             Interactive screen prototype
mark.svg                Exact approved asset
before-*.png            Actual baseline captures
proposal-*.png          Reviewed proposal captures
comparison-*.png        Optional paired captures
manifest.json           Revision, capture states, dimensions and file hashes
.nojekyll               GitHub Pages only
```

The proposal screenshot set is mandatory for every interactive revision. PNG and JPEG are both
acceptable. Publish real browser renders and full-resolution image links, with thumbnails or a
contact sheet for quick comparison; an iframe-only gallery is insufficient. Keep the screenshots
reachable at stable URLs alongside the prototype so a reviewer can inspect or download them
without operating the interactive page. An optional archive may help bulk download, but must
not be the only way to view the images.

For each image, the manifest records its relative path, hash, prototype revision, screen/state,
fixture, navigation option, theme, locale, viewport width/height and text scale. Gallery captions
show the relevant identifying values. Cover the assignment's screens and meaningful variants,
including the narrow/larger-text cases under review; do not invent a full Cartesian test matrix
or extra agent rounds. State any coverage gaps. Before/after captures identify their respective
revisions and matched states. Refresh affected images with a prototype update; label retained
historical images rather than presenting stale screenshots as the current proposal.

Use an explicit file allowlist and record hashes before publishing. Keep raw AGY prompts,
reports, credentials, logs, browser profiles, personal IndexedDB exports and capture scripts
outside that directory. Do not deploy the entire scratch folder.

Use relative links so a repository-path site works: `mockup.html?screen=recipe&theme=amoled`,
not `/mockup.html`. Resolve images and local fonts from the same publication directory.
Avoid analytics or third-party assets unless the assignment needs them. A noindex hint is
useful for a review site but does not make a public deployment private.

Check this exact directory locally before upload. On narrow displays, gallery gutters must
not force a fixed-width grid wider than the viewport. Distinguish the gallery's responsive
preview images from the prototype's requested 360 px screen viewport.

## GitHub Pages

Flourprint's initial visual review was published at
`https://aristotelesqc.github.io/Flourprint/`, from the independent `gh-pages` branch.
This is historical context, not permission to overwrite that branch or its configuration.

Before publishing, inspect the current Pages configuration and branch head:

```text
gh api repos/Aristotelesqc/Flourprint/pages
gh api repos/Aristotelesqc/Flourprint/git/ref/heads/gh-pages
```

Reuse an existing dedicated review location only if it belongs to this assignment. Preserve
other galleries when adding a review, preferably with a dated subdirectory. If a branch does
not exist, create it deliberately; if it exists, base updates on its observed current head.
Never force-reset it or route a prototype through `dev`/`main` to make hosting easier.
Publish the allowlisted directory with the normal Git/contents/tree API tooling, preserving
atomic file sets where practical and the repository's required pre-push checks.

When Pages is not configured and setup is authorized, select the dedicated branch and root
(or `/docs`) source through the [Pages API](https://docs.github.com/en/rest/pages/pages).
Keep `.nojekyll` for plain static files. Publishing a new `gh-pages` branch can configure
Pages automatically: on a creation conflict, re-read its source before deciding anything;
do not retry by overwriting settings. Do not create a custom domain or change the app's
Cloudflare/dev-channel addresses for this task.

Check the resulting `html_url`, branch/commit and Pages deployment run. Keep the review site
available for the owner's review. Temporary hosting does not imply a known expiration or
authorize deleting shared resources; agree on cleanup when needed.

## Cloudflare

Use an existing authenticated CLI or the repository's established CI deployment path.
Verify the selected account/project and deploy under a dedicated preview alias, preserving
`main`, `dev` and all existing PR aliases. Do not print tokens, extract GitHub secret values,
change authentication settings or install a production app dependency to obtain hosting.
If local credentials are absent, another authorized host is a valid fallback.

[Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
supports deploying a reviewed static output directory with a branch alias. Check current
CLI help/configuration rather than copying version-specific flags blindly. Anonymous or
temporary-account previews have a provider-specific lifetime; verify it and disclose it.
Do not present an hour-long link as an enduring review site or require the owner to claim
a new account when an existing stable host is available.

## Verify and share

Open the public URL in a fresh browser context at the phone and desktop widths in scope.
Check page errors and failed requests; decode the images; exercise theme controls,
before/after disclosure and direct prototype routes. Verify menus, tabs and the requested
interaction examples on the deployed copy. Check the published bytes against the reviewed
manifest when practical, accounting for a host's documented transformations.

Verify the gallery's direct screenshot links independently of the interactive page: images must
load, be readable at original size, and match their captions and manifest. Publish the screenshot
set with its prototype revision, not as a promised later supplement. Static inspection does not
replace testing buttons, animation, navigation or state transitions in a live browser.

Share the gallery, direct interactive and screenshot-set URLs, plus a brief statement of mockup
status and actual verification. Record the deployed commit/artifact version on the relevant issue within
existing publishing authorization. A successful upload is not visual approval.
