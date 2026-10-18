/**
 * The component catalogue (ADR 0020): every id, every version side by side with its examples,
 * in Light, Dark and AMOLED, at phone widths, with larger text and reduced motion. It is a
 * developer and review page generated from a catalogue registry, so its own labels are fixed
 * English; product text reaches components only through their props.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Guide } from '../guides.ts';
import type {
  Catalogue as CatalogueRegistry,
  ComponentMap,
  Manifest,
  Versioned,
} from '../library.ts';
import { MotionProvider } from '../motion-context.ts';
import { playMotion, transitionCss, type Motion } from '../motion.ts';
import type { MotionManifest } from '../motion.ts';
import type { FlourprintMotion } from '../motions.ts';

const THEMES = ['light', 'dark', 'amoled'] as const;
const WIDTHS = [393, 360] as const;
const TEXT_SCALES = [100, 130] as const;

type Theme = (typeof THEMES)[number];

export interface CatalogueProps<C extends ComponentMap> {
  readonly catalogue: CatalogueRegistry<C>;
  /** Marks the version each id uses in this manifest. */
  readonly manifest?: Manifest<C>;
  /** Component guides, shown above each id's versions (ADR 0021). */
  readonly guides?: Readonly<
    Record<string, Guide & { readonly props?: Readonly<Record<string, string>> }>
  >;
  /** Motion items, played in each theme frame in standard or reduced form. */
  readonly motions?: Readonly<Record<string, readonly Motion[]>>;
  readonly motionGuides?: Readonly<Record<string, Guide>>;
  /** Marks selected motion versions and is provided to components through `useMotion`. */
  readonly motionManifest?: MotionManifest<FlourprintMotion>;
}

const GuidePanel = ({
  guide,
}: {
  guide: (Guide & { readonly props?: Readonly<Record<string, string>> }) | undefined;
}) =>
  guide ? (
    <div data-testid="catalogue-guide" style={styles.guide}>
      <p style={styles.guidePurpose}>{guide.purpose}</p>
      <GuideList title="Use when" items={guide.useWhen} />
      <GuideList title="Avoid when" items={guide.avoidWhen} />
      <GuideList
        title="Props"
        items={Object.entries(guide.props ?? {}).map(([prop, text]) => `${prop}: ${text}`)}
      />
      <GuideList title="Accessibility" items={guide.accessibility} />
      <GuideList title="Related" items={guide.related} />
      {guide.decisions.length > 0 ? (
        <p style={styles.muted}>
          {guide.decisions.map((decision) => (
            <a key={decision.url} href={decision.url} style={styles.decision}>
              {decision.label}
            </a>
          ))}
        </p>
      ) : null}
    </div>
  ) : (
    <p data-testid="catalogue-no-guide" style={styles.missing}>
      No guide: every item needs one (ADR 0021).
    </p>
  );

const GuideList = ({ title, items }: { title: string; items: readonly string[] }) =>
  items.length === 0 ? null : (
    <div style={styles.guideList}>
      <strong>{title}</strong>
      <ul style={styles.ul}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );

const camel = (property: string): string =>
  property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const cssObject = (declarations: Readonly<Record<string, string>>): CSSProperties =>
  Object.fromEntries(
    Object.entries(declarations).map(([property, value]) => [camel(property), value]),
  ) as CSSProperties;

/** One motion in one frame: a sample element and a Play button. */
const MotionDemo = ({ motion, reduced }: { motion: Motion; reduced: boolean }) => {
  const sample = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  if (motion.kind === 'keyframes') {
    return (
      <div style={styles.demo}>
        <div ref={sample} data-testid="motion-sample" style={styles.sample}>
          {motion.id}
        </div>
        <button
          type="button"
          onClick={() => {
            if (sample.current) playMotion(motion, sample.current, { reduced });
          }}
        >
          Play
        </button>
        {reduced ? <span style={styles.hint}>reduced: no animation</span> : null}
      </div>
    );
  }
  const state = on ? motion.demo.to : motion.demo.from;
  return (
    <div style={styles.demo}>
      <div
        data-testid="motion-sample"
        style={{
          ...styles.sample,
          display: 'grid',
          ...cssObject(state),
          transition: transitionCss(motion, reduced),
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>{motion.id}</div>
      </div>
      <button type="button" aria-pressed={on} onClick={() => setOn(!on)}>
        Toggle
      </button>
    </div>
  );
};

const Choice = <T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) => (
  <fieldset style={styles.choice}>
    <legend style={styles.legend}>{label}</legend>
    {options.map((option) => (
      <label key={String(option)} style={styles.option}>
        <input
          type="radio"
          name={label}
          checked={option === value}
          onChange={() => onChange(option)}
        />{' '}
        {format(option)}
      </label>
    ))}
  </fieldset>
);

const Frame = ({
  theme,
  width,
  reduced,
  children,
}: {
  theme: Theme;
  width: number;
  reduced: boolean;
  children: ReactNode;
}) => (
  <div
    data-theme={theme}
    data-motion={reduced ? 'reduced' : 'standard'}
    data-testid={`catalogue-frame-${theme}`}
    style={{ ...styles.frame, width }}
  >
    {children}
  </div>
);

export const Catalogue = <C extends ComponentMap>({
  catalogue,
  manifest,
  guides,
  motions = {},
  motionGuides = {},
  motionManifest,
}: CatalogueProps<C>) => {
  const [theme, setTheme] = useState<Theme | 'all'>('all');
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(393);
  const [textScale, setTextScale] = useState<(typeof TEXT_SCALES)[number]>(100);
  const [reduced, setReduced] = useState(false);

  // Larger text scales rem, so it applies to the root, as the system setting does on a phone.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = `${textScale}%`;
    return () => {
      root.style.fontSize = previous;
    };
  }, [textScale]);

  const ids = Object.keys(catalogue).sort() as (keyof CatalogueRegistry<C> & string)[];
  const themes = theme === 'all' ? THEMES : [theme];

  const page = (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Flourprint component catalogue</h1>
        <p style={styles.muted}>
          Generated from the library registry (ADR 0020). Each version is shown with its examples;
          the selected one is the version the manifest uses.
        </p>
        <div style={styles.controls}>
          <Choice
            label="Theme"
            options={['all', ...THEMES] as const}
            value={theme}
            onChange={setTheme}
          />
          <Choice
            label="Width"
            options={WIDTHS}
            value={width}
            onChange={setWidth}
            format={(value) => `${value} px`}
          />
          <Choice
            label="Text"
            options={TEXT_SCALES}
            value={textScale}
            onChange={setTextScale}
            format={(value) => `${value} %`}
          />
          <Choice
            label="Motion"
            options={['standard', 'reduced'] as const}
            value={reduced ? 'reduced' : 'standard'}
            onChange={(value) => setReduced(value === 'reduced')}
          />
        </div>
      </header>
      {ids.length === 0 ? (
        <p data-testid="catalogue-empty" style={styles.muted}>
          No components yet. Components are added in packages/ui/src/components (ADR 0020).
        </p>
      ) : (
        <nav style={styles.nav}>
          {ids.map((id) => (
            <a key={id} href={`#${id}`} style={styles.navLink}>
              {id}
            </a>
          ))}
        </nav>
      )}
      {ids.map((id) => (
        <section key={id} id={id} data-testid={`catalogue-${id}`} style={styles.section}>
          <h2 style={styles.id}>{id}</h2>
          {guides ? <GuidePanel guide={guides[id]} /> : null}
          {catalogue[id].map((version) => {
            const Component = version.component;
            const selected = manifest?.[id] === version;
            return (
              <article
                key={version.version}
                data-testid={`catalogue-${id}-${version.version}`}
                style={styles.version}
              >
                <h3 style={styles.versionTitle}>
                  {version.version}
                  {selected ? <span style={styles.selected}>selected</span> : null}
                </h3>
                <p style={styles.muted}>{version.notes}</p>
                {version.examples.map((example) => (
                  <div key={example.name} style={styles.example}>
                    <h4 style={styles.exampleTitle}>{example.name}</h4>
                    <div style={styles.frames}>
                      {themes.map((frameTheme) => (
                        <Frame key={frameTheme} theme={frameTheme} width={width} reduced={reduced}>
                          <Component {...example.props} />
                        </Frame>
                      ))}
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </section>
      ))}
      <h2 style={styles.kindTitle}>Motions</h2>
      {Object.keys(motions).length === 0 ? (
        <p data-testid="catalogue-motions-empty" style={styles.muted}>
          No motion items in this catalogue.
        </p>
      ) : null}
      {Object.keys(motions)
        .sort()
        .map((id) => (
          <section key={id} id={id} data-testid={`catalogue-${id}`} style={styles.section}>
            <h2 style={styles.id}>{id}</h2>
            <GuidePanel guide={motionGuides[id]} />
            {(motions[id] ?? []).map((motion) => {
              const selected =
                (motionManifest as Readonly<Record<string, Versioned>> | undefined)?.[id] ===
                motion;
              return (
                <article
                  key={motion.version}
                  data-testid={`catalogue-${id}-${motion.version}`}
                  style={styles.version}
                >
                  <h3 style={styles.versionTitle}>
                    {motion.version}
                    {selected ? <span style={styles.selected}>selected</span> : null}
                  </h3>
                  <p style={styles.muted}>{motion.notes}</p>
                  <div style={styles.frames}>
                    {themes.map((frameTheme) => (
                      <Frame key={frameTheme} theme={frameTheme} width={width} reduced={reduced}>
                        <MotionDemo motion={motion} reduced={reduced} />
                      </Frame>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
    </main>
  );
  return motionManifest ? <MotionProvider value={motionManifest}>{page}</MotionProvider> : page;
};

const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    padding: '1rem',
    background: '#ece7df',
    color: '#211b16',
    minHeight: '100vh',
  },
  header: { maxWidth: '60rem' },
  title: { fontSize: '1.4rem', margin: '0 0 0.25rem' },
  muted: { color: '#6b5e54', margin: '0.25rem 0', fontSize: '0.875rem' },
  controls: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.75rem 0' },
  choice: { border: '1px solid #d5cabb', borderRadius: '0.5rem', padding: '0.25rem 0.5rem' },
  legend: { fontSize: '0.75rem', fontWeight: 600 },
  option: { marginRight: '0.5rem', fontSize: '0.85rem' },
  nav: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0 1rem' },
  navLink: { fontSize: '0.8rem', color: '#9c4221' },
  section: { borderTop: '1px solid #d5cabb', padding: '1rem 0' },
  id: { fontFamily: 'ui-monospace, monospace', fontSize: '1.05rem', margin: '0 0 0.5rem' },
  version: { margin: '0 0 1.25rem' },
  versionTitle: {
    fontSize: '0.95rem',
    margin: '0',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  selected: {
    fontSize: '0.7rem',
    background: '#9c4221',
    color: '#fff',
    borderRadius: '999px',
    padding: '0.1rem 0.5rem',
  },
  example: { margin: '0.5rem 0' },
  exampleTitle: { fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.25rem' },
  frames: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', overflowX: 'auto' },
  frame: {
    background: 'var(--fp-color-background)',
    color: 'var(--fp-color-on-surface)',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '1px solid #c9bba6',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  kindTitle: { fontSize: '1.2rem', margin: '1.5rem 0 0.25rem' },
  guide: {
    background: '#f7f2ea',
    border: '1px solid #d5cabb',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    margin: '0 0 0.75rem',
    fontSize: '0.85rem',
    maxWidth: '48rem',
  },
  guidePurpose: { margin: '0 0 0.4rem', fontWeight: 600 },
  guideList: { margin: '0.25rem 0' },
  ul: { margin: '0.15rem 0 0', paddingLeft: '1.2rem' },
  decision: { color: '#9c4221', marginRight: '0.75rem' },
  missing: { color: '#b3261e', fontWeight: 600, fontSize: '0.85rem' },
  demo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  hint: { fontSize: '0.7rem', opacity: 0.7 },
  sample: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '0.75rem',
    background: 'var(--fp-color-surface)',
    border: '1px solid var(--fp-color-outline)',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.75rem',
  },
} satisfies Record<string, CSSProperties>;
