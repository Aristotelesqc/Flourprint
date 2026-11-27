import { useEffect, useId, useRef, useState, type JSX } from 'react';
import { library, useMotion, transitionCss, isReduced } from '../../index.ts';
import type { DisclosureProps } from './props.ts';

function useReducedMotion(elementRef: React.RefObject<HTMLElement | null>): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isReduced() : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      setReduced(isReduced(elementRef.current));
    };

    update();

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    mediaQuery?.addEventListener('change', update);

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined' && elementRef.current) {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-motion') {
            update();
            break;
          }
        }
      });

      let current: HTMLElement | null = elementRef.current;
      while (current) {
        observer.observe(current, { attributes: true, attributeFilter: ['data-motion'] });
        current = current.parentElement;
      }
    }

    return () => {
      mediaQuery?.removeEventListener('change', update);
      observer?.disconnect();
    };
  }, [elementRef]);

  return reduced;
}

export const Disclosure = ({
  expanded,
  onExpandedChange,
  label,
  children,
  summary,
  id,
  disabled = false,
}: DisclosureProps): JSX.Element => {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const disclosureMotion = useMotion('fp.motion.disclosure');
  const chevronMotion = useMotion('fp.motion.chevron');

  const reduced = useReducedMotion(rootRef);

  const contentTransition =
    disclosureMotion.kind === 'transition' ? transitionCss(disclosureMotion, reduced) : 'none';

  const chevronTransition =
    chevronMotion.kind === 'transition' ? transitionCss(chevronMotion, reduced) : 'none';

  const wasExpandedRef = useRef(expanded);
  useEffect(() => {
    const wasExpanded = wasExpandedRef.current;
    wasExpandedRef.current = expanded;

    if (wasExpanded && !expanded) {
      if (
        contentRef.current &&
        document.activeElement &&
        contentRef.current.contains(document.activeElement)
      ) {
        buttonRef.current?.focus({ preventScroll: true });
      }
    }
  }, [expanded]);

  const handleToggle = () => {
    if (disabled) return;
    onExpandedChange(!expanded);
  };

  return (
    <div ref={rootRef} className="flex flex-col w-full">
      <button
        ref={buttonRef}
        type="button"
        id={triggerId}
        aria-expanded={expanded}
        aria-controls={contentId}
        disabled={disabled}
        onClick={handleToggle}
        className="fp-control-reset flex w-full min-h-touch items-center justify-between gap-3 px-4 py-3 text-left bg-surface hover:bg-surface-container text-on-surface rounded-card border border-outline fp-focus disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex flex-col gap-1 min-w-0">
          <span className="text-body font-medium">{label}</span>
          {summary !== undefined && <span className="text-supporting text-muted">{summary}</span>}
        </span>
        <span
          aria-hidden="true"
          className={`inline-block w-2 h-2 border-r-2 border-b-2 border-current mb-0.5 shrink-0 ${
            expanded ? 'rotate-[225deg]' : 'rotate-45'
          }`}
          style={{
            transition: chevronTransition !== 'none' ? chevronTransition : undefined,
          }}
        />
      </button>

      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        className={`grid ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        style={{
          transition: contentTransition !== 'none' ? contentTransition : undefined,
        }}
      >
        <div
          ref={contentRef}
          className="min-h-0 overflow-hidden"
          inert={!expanded ? true : undefined}
          aria-hidden={!expanded}
        >
          <div className="px-4 py-3 text-body text-on-surface">{children}</div>
        </div>
      </div>
    </div>
  );
};

function DisclosureDemo(props: DisclosureProps): JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(props.expanded);

  const handleExpandedChange = (nextExpanded: boolean): void => {
    setExpanded(nextExpanded);
    props.onExpandedChange(nextExpanded);
  };

  return <Disclosure {...props} expanded={expanded} onExpandedChange={handleExpandedChange} />;
}

export default library.version({
  id: 'fp.disclosure',
  version: 'v1',
  component: Disclosure,
  notes:
    'Initial v1 disclosure component with grid 0fr/1fr animation, preserved children mounting, chevron rotation, and reactive reduced-motion support.',
  examples: [
    {
      name: 'Default expanded baking schedule',
      render: DisclosureDemo,
      props: {
        expanded: true,
        onExpandedChange: () => {},
        label: 'Baking Schedule & Fermentation',
        summary: 'Bulk fermentation (4h) and final proof (2h)',
        children:
          'Autolyse 45 min at 24°C, add levain and salt, perform 4 stretch-and-folds every 30 minutes, then cold retard at 4°C overnight.',
        disabled: false,
      },
    },
    {
      name: 'Collapsed with long label (narrow mobile viewport)',
      render: DisclosureDemo,
      props: {
        expanded: false,
        onExpandedChange: () => {},
        label:
          'Advanced Hydration Adjustment & Whole Grain Sourdough Blend Ratios (80% Wheat, 20% Rye)',
        summary: 'Tap to view tailored water absorption corrections',
        children: 'Detailed notes remain available when this section is reopened.',
        disabled: false,
      },
    },
    {
      name: 'Disabled locked configuration',
      render: DisclosureDemo,
      props: {
        expanded: false,
        onExpandedChange: () => {},
        label: 'Oven Steam Profile & Deck Temperatures',
        summary: 'Parameters locked while bake cycle is in progress',
        children: 'Bake at 245°C deck temperature with 20 seconds initial steam injection.',
        disabled: true,
      },
    },
  ],
});
