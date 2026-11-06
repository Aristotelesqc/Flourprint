/**
 * The component catalogue (ADR 0020): every id, every version side by side with its examples,
 * in Light, Dark and AMOLED, at phone widths, with larger text and reduced motion. It is a
 * developer and review page generated from a catalogue registry, so its own labels are fixed
 * English; product text reaches components only through their props.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Guide } from '../guides.ts';
import type {
  Catalogue as CatalogueRegistry,
  ComponentMap,
  Manifest,
  Versioned,
} from '../library.ts';
import { MotionProvider } from '../motion-context.ts';
import {
  playMotion,
  transitionCss,
  type KeyframesMotion,
  type Motion,
  type MotionManifest,
  type TransitionMotion,
} from '../motion.ts';
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
    <div className="bg-surface-container border border-outline rounded-card p-card-padding mb-3 text-supporting max-w-3xl">
      <p className="font-semibold mb-2 text-on-surface">{guide.purpose}</p>
      <GuideList title="Use when" items={guide.useWhen} />
      <GuideList title="Avoid when" items={guide.avoidWhen} />
      <GuideList
        title="Props"
        items={Object.entries(guide.props ?? {}).map(([prop, text]) => `${prop}: ${text}`)}
      />
      <GuideList title="Accessibility" items={guide.accessibility} />
      <GuideList title="Related" items={guide.related} />
      {guide.decisions.length > 0 ? (
        <p className="text-muted text-supporting mt-2 flex flex-wrap gap-3">
          {guide.decisions.map((decision) => (
            <a
              key={decision.url}
              href={decision.url}
              className="text-action-text hover:underline fp-focus rounded-pill"
            >
              {decision.label}
            </a>
          ))}
        </p>
      ) : null}
    </div>
  ) : (
    <p className="text-error font-semibold text-supporting my-2">
      No guide: every item needs one (ADR 0021).
    </p>
  );

const GuideList = ({ title, items }: { title: string; items: readonly string[] }) =>
  items.length === 0 ? null : (
    <div className="my-1.5">
      <strong className="text-on-surface">{title}</strong>
      <ul className="list-disc pl-5 mt-0.5 text-supporting">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );

/** One keyframes motion in one frame: sample element and Play button. */
const MotionKeyframesDemo = ({
  motion,
  reduced,
}: {
  motion: KeyframesMotion;
  reduced: boolean;
}) => {
  const sample = useRef<HTMLDivElement>(null);
  return (
    <div className="flex items-center gap-3">
      <div
        ref={sample}
        role="region"
        aria-label={motion.id}
        className="flex-1 p-card-padding rounded-card bg-surface border border-outline font-mono text-metadata text-on-surface"
      >
        {motion.id}
      </div>
      <button
        type="button"
        className="min-h-touch px-4 py-2 rounded-card bg-surface border border-outline text-on-surface font-medium hover:bg-surface-container fp-focus cursor-pointer"
        onClick={() => {
          if (sample.current) playMotion(motion, sample.current, { reduced });
        }}
      >
        Play
      </button>
      {reduced ? <span className="text-metadata text-muted">reduced: no animation</span> : null}
    </div>
  );
};

/** One transition motion in one frame: state toggling with properties applied at runtime. */
const MotionTransitionDemo = ({
  motion,
  reduced,
}: {
  motion: TransitionMotion;
  reduced: boolean;
}) => {
  const sample = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef<readonly string[]>([]);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = sample.current;
    if (!el) return;

    for (const prop of prevPropsRef.current) {
      el.style.removeProperty(prop);
    }

    const state = on ? motion.demo.to : motion.demo.from;
    const applied: string[] = [];
    for (const [prop, value] of Object.entries(state)) {
      el.style.setProperty(prop, value);
      applied.push(prop);
    }
    el.style.transition = transitionCss(motion, reduced);
    prevPropsRef.current = applied;

    return () => {
      for (const prop of applied) {
        el.style.removeProperty(prop);
      }
      el.style.transition = '';
    };
  }, [motion, on, reduced]);

  return (
    <div className="flex items-center gap-3">
      <div
        ref={sample}
        role="region"
        aria-label={motion.id}
        className="grid flex-1 p-card-padding rounded-card bg-surface border border-outline font-mono text-metadata text-on-surface"
      >
        <div className="overflow-hidden min-h-0">{motion.id}</div>
      </div>
      <button
        type="button"
        aria-pressed={on}
        className="min-h-touch px-4 py-2 rounded-card bg-surface border border-outline text-on-surface font-medium hover:bg-surface-container fp-focus cursor-pointer"
        onClick={() => setOn((prev) => !prev)}
      >
        Toggle
      </button>
    </div>
  );
};

const MotionDemo = ({ motion, reduced }: { motion: Motion; reduced: boolean }) =>
  motion.kind === 'keyframes' ? (
    <MotionKeyframesDemo motion={motion} reduced={reduced} />
  ) : (
    <MotionTransitionDemo motion={motion} reduced={reduced} />
  );

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
}) => {
  const id = useId();
  return (
    <fieldset className="border border-outline rounded-card p-2 flex flex-wrap gap-2 items-center">
      <legend className="text-metadata font-semibold px-1 text-on-surface">{label}</legend>
      {options.map((option) => (
        <label
          key={String(option)}
          className="flex items-center gap-1.5 text-supporting cursor-pointer min-h-touch px-2 rounded-segmented-option hover:bg-surface-container"
        >
          <input
            type="radio"
            name={id}
            value={String(option)}
            checked={option === value}
            onChange={() => onChange(option)}
            className="fp-focus accent-primary"
          />
          <span>{format(option)}</span>
        </label>
      ))}
    </fieldset>
  );
};

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
    className={`bg-background text-on-surface p-card-padding rounded-card border border-field-outline max-w-full fp-ionic ${width === 360 ? 'w-[360px]' : 'w-[393px]'}`}
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
    <main className="h-dvh overflow-y-auto bg-background text-on-surface p-page-gutter font-sans">
      <header className="max-w-4xl">
        <h1 className="text-page font-bold mb-1">Flourprint component catalogue</h1>
        <p className="text-muted text-supporting my-1">
          Generated from the library registry (ADR 0020). Each version is shown with its examples;
          the selected one is the version the manifest uses.
        </p>
        <div className="flex flex-wrap gap-3 my-3 items-center">
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
        <p className="text-muted text-supporting my-2">
          No components yet. Components are added in packages/ui/src/components (ADR 0020).
        </p>
      ) : (
        <nav aria-label="Component index" className="flex flex-wrap gap-2 my-3">
          {ids.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-supporting text-action-text hover:underline fp-focus rounded-pill px-2 py-1 min-h-touch inline-flex items-center"
            >
              {id}
            </a>
          ))}
        </nav>
      )}
      {ids.map((id) => (
        <section key={id} id={id} className="border-t border-outline py-card-padding">
          <h2 className="font-mono text-title font-semibold mb-2">{id}</h2>
          {guides ? <GuidePanel guide={guides[id]} /> : null}
          {catalogue[id].map((version) => {
            const selected = manifest?.[id] === version;
            return (
              <article key={version.version} className="mb-6">
                <h3 className="text-body font-semibold flex items-center gap-2 mb-1">
                  <span>{version.version}</span>
                  {selected ? (
                    <span className="text-metadata bg-primary text-on-primary rounded-pill px-2 py-0.5 font-medium">
                      selected
                    </span>
                  ) : null}
                </h3>
                <p className="text-muted text-supporting mb-3">{version.notes}</p>
                {version.examples.map((example) => {
                  const ExampleComponent = example.render ?? version.component;
                  return (
                    <div key={example.name} className="my-3">
                      <h4 className="text-supporting font-semibold mb-1 text-on-surface">
                        {example.name}
                      </h4>
                      <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
                        {themes.map((frameTheme) => (
                          <Frame
                            key={frameTheme}
                            theme={frameTheme}
                            width={width}
                            reduced={reduced}
                          >
                            <ExampleComponent {...example.props} />
                          </Frame>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </section>
      ))}
      <h2 className="text-title font-bold mt-8 mb-2">Motions</h2>
      {Object.keys(motions).length === 0 ? (
        <p className="text-muted text-supporting my-2">No motion items in this catalogue.</p>
      ) : null}
      {Object.keys(motions)
        .sort()
        .map((id) => (
          <section key={id} id={id} className="border-t border-outline py-card-padding">
            <h2 className="font-mono text-title font-semibold mb-2">{id}</h2>
            <GuidePanel guide={motionGuides[id]} />
            {(motions[id] ?? []).map((motion) => {
              const selected =
                (motionManifest as Readonly<Record<string, Versioned>> | undefined)?.[id] ===
                motion;
              return (
                <article key={motion.version} className="mb-6">
                  <h3 className="text-body font-semibold flex items-center gap-2 mb-1">
                    <span>{motion.version}</span>
                    {selected ? (
                      <span className="text-metadata bg-primary text-on-primary rounded-pill px-2 py-0.5 font-medium">
                        selected
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-muted text-supporting mb-3">{motion.notes}</p>
                  <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
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
