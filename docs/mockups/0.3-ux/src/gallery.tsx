import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './gallery.css';
declare const __MOCKUP_SOURCE_HASH__: string;
interface Shot {
  path: string;
  sha256: string;
  screen: string;
  state: string;
  fixture: string;
  navigation: string;
  theme: string;
  locale: string;
  width: number;
  height: number;
  textScale: number;
  sourceRevision: string;
  prototypeHash: string;
  interactive?: string;
  stepDesign?: string;
}
function Gallery() {
  const [shots, setShots] = useState<Shot[]>([]),
    [error, setError] = useState(false),
    [screenFilter, setScreenFilter] = useState('all'),
    [localeFilter, setLocaleFilter] = useState('all'),
    [stepDesignFilter, setStepDesignFilter] = useState('all');

  useEffect(() => {
    fetch('manifest.json')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => setShots(data.images))
      .catch(() => setError(true));
  }, []);

  const screenOptions = [
    'all',
    ...Array.from(new Set(shots.map((s) => s.screen)))
      .filter(Boolean)
      .sort(),
  ];
  const localeOptions = [
    'all',
    ...Array.from(new Set(shots.map((s) => s.locale)))
      .filter(Boolean)
      .sort(),
  ];
  const manifestHasStepDesign = shots.some((s) => Boolean(s.stepDesign));
  const stepDesignOptions = [
    'all',
    ...(manifestHasStepDesign
      ? Array.from(
          new Set(shots.map((s) => s.stepDesign).filter((d): d is string => Boolean(d))),
        ).sort()
      : ['compact', 'rail', 'outline']),
  ];

  const filteredShots = shots.filter((s) => {
    if (screenFilter !== 'all' && s.screen !== screenFilter) return false;
    if (localeFilter !== 'all' && s.locale !== localeFilter) return false;
    if (stepDesignFilter !== 'all' && s.stepDesign !== stepDesignFilter) return false;
    return true;
  });

  return (
    <main>
      <h1>Flourprint · 0.3 UX review</h1>
      <p className="gallery-banner">
        <strong>Incomplete step-editor review in #133</strong> — this is an isolated exploration of
        the recipe step editor, not production UI or a whole UI restoration. State is held in
        memory; reload resets it. Engine calculations use the current core. Navigation A/B, weighing
        lifetime and step-editor design remain owner choices; no proposal is accepted.
      </p>
      <p className="gallery-nav">
        <a href="mockup.html?screen=library&nav=A&lang=fr">Open interactive A</a> ·{' '}
        <a href="mockup.html?screen=library&nav=B&lang=fr">Open interactive B</a> ·{' '}
        <a href="mockup.html?screen=catalogue&lang=en">Live shared component catalogue</a> ·{' '}
        <a href="manifest.json">Screenshot manifest</a>
      </p>

      <section className="step-variants-section" aria-labelledby="step-variants-title">
        <h2 id="step-variants-title">Step editor variants (PR #133)</h2>
        <p className="step-variants-intro">
          Test each step-editor presentation in the interactive mockup. Inspector and review
          controls are active (capture mode omitted). Names and explanations are provided outside
          the product frame; the owner must choose and no proposal is accepted.
        </p>
        <div className="step-variants-grid">
          <div className="step-variant-card">
            <a
              className="variant-link"
              href="mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&stepDesign=compact&lang=fr&nav=A&theme=dark&width=393&scale=100"
            >
              Variant: compact
            </a>
            <p>
              High-density representation minimizing vertical height per step, inline action
              buttons, and condensed timing/ingredient chips.
            </p>
          </div>
          <div className="step-variant-card">
            <a
              className="variant-link"
              href="mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&stepDesign=rail&lang=fr&nav=A&theme=dark&width=393&scale=100"
            >
              Variant: rail
            </a>
            <p>
              Visual vertical track connecting sequential steps, emphasizing process flow and clear
              milestone states.
            </p>
          </div>
          <div className="step-variant-card">
            <a
              className="variant-link"
              href="mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&stepDesign=outline&lang=fr&nav=A&theme=dark&width=393&scale=100"
            >
              Variant: outline
            </a>
            <p>
              Framed outline cards with explicit section borders, structured hierarchy, and distinct
              grouping separation.
            </p>
          </div>
        </div>
      </section>

      <p>
        Proposal source hash: <code>{__MOCKUP_SOURCE_HASH__}</code>
      </p>
      <p>
        Review list → recipe → edit → save/cancel → planning → preparation. The diagnostic selector
        contains explicitly separate reference scenarios. The photo action adds a simulated marker,
        without camera access. Move and duplicate operations call the core domain directly; contract
        refusals and graph integrity constraints are preserved, while the phase grouping limitation
        remains explicit.
      </p>
      {error && (
        <p role="alert">
          No screenshot manifest is available in this local build. Run the capture command before
          publication.
        </p>
      )}

      <div className="filter-bar" aria-label="Screenshot filters">
        <div className="filter-group">
          <label htmlFor="filter-screen">Screen:</label>
          <select
            id="filter-screen"
            value={screenFilter}
            onChange={(e) => setScreenFilter(e.target.value)}
          >
            {screenOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All screens' : opt}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-locale">Locale:</label>
          <select
            id="filter-locale"
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
          >
            {localeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All locales' : opt}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-step-design">Step design:</label>
          <select
            id="filter-step-design"
            value={stepDesignFilter}
            onChange={(e) => setStepDesignFilter(e.target.value)}
          >
            {stepDesignOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All step designs' : opt}
              </option>
            ))}
          </select>
        </div>
        {(screenFilter !== 'all' || localeFilter !== 'all' || stepDesignFilter !== 'all') && (
          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              setScreenFilter('all');
              setLocaleFilter('all');
              setStepDesignFilter('all');
            }}
          >
            Reset filters
          </button>
        )}
        <span className="filter-count">
          Showing {filteredShots.length} of {shots.length} screenshots
        </span>
      </div>

      <div className="shots">
        {filteredShots.map((s) => (
          <figure key={s.path}>
            <a href={s.path}>
              <img
                loading="lazy"
                src={s.path}
                alt={`${s.screen}: ${s.state}, ${s.theme}, ${s.locale}, ${s.width}px, ${s.textScale}%`}
              />
            </a>
            <figcaption>
              <strong>
                {s.screen} · {s.state}
              </strong>
              <p>
                {s.fixture} · {s.navigation} · {s.theme} · {s.locale}
                {s.stepDesign ? ` · design: ${s.stepDesign}` : ''} · {s.width}×{s.height} ·{' '}
                {s.textScale}%
              </p>
              <p>
                {s.prototypeHash === __MOCKUP_SOURCE_HASH__
                  ? 'Current proposal'
                  : 'Historical baseline / retained evidence'}{' '}
                · {s.sourceRevision.slice(0, 7)}
              </p>
              {s.interactive && <a href={s.interactive}>Test this state interactively</a>} ·{' '}
              <a href={s.path}>Full-resolution image</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<Gallery />);
