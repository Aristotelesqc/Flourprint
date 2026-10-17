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
}
function Gallery() {
  const [shots, setShots] = useState<Shot[]>([]),
    [error, setError] = useState(false);
  useEffect(() => {
    fetch('manifest.json')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => setShots(data.images))
      .catch(() => setError(true));
  }, []);
  return (
    <main>
      <h1>Flourprint · 0.3 UX review</h1>
      <p>
        Interactive proposal, not production UI. State is held in memory; reload resets it. Engine
        calculations use the current core. Navigation A/B, weighing lifetime and move presentation
        remain owner choices.
      </p>
      <p>
        <a href="mockup.html?screen=library&nav=A&lang=fr">Open interactive A</a> ·{' '}
        <a href="mockup.html?screen=library&nav=B&lang=fr">Open interactive B</a> ·{' '}
        <a href="mockup.html?screen=catalogue&lang=en">Live shared component catalogue</a> ·{' '}
        <a href="manifest.json">Screenshot manifest</a>
      </p>
      <p>
        Proposal source hash: <code>{__MOCKUP_SOURCE_HASH__}</code>
      </p>
      <p>
        Review list → recipe → edit → save/cancel → planning → preparation. The diagnostic selector
        contains explicitly separate reference scenarios. The photo action adds a simulated marker,
        without camera access. Reordering preserves the existing graph and refuses invalid orders;
        it does not implement future move/subject contracts.
      </p>
      {error && (
        <p role="alert">
          No screenshot manifest is available in this local build. Run the capture command before
          publication.
        </p>
      )}
      <div className="shots">
        {shots.map((s) => (
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
                {s.fixture} · {s.navigation} · {s.theme} · {s.locale} · {s.width}×{s.height} ·{' '}
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
