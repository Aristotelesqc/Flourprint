import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from 'react';
import { library } from '../../index.ts';
import type { TabsControl, TabsProps } from './props.ts';
import type { SectionCarouselProgressDetail as TabGestureProgress } from '../section-carousel/props.ts';

export const Tabs = ({
  selected,
  onSelectedChange,
  label,
  items,
  renderPanels = true,
  gestureProgress,
  control,
  gestureSurfaceRef,
}: TabsProps): JSX.Element => {
  const baseId = useId();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const setStrip = useCallback(
    (element: HTMLDivElement | null) => {
      stripRef.current = element;
      if (typeof gestureSurfaceRef === 'function') gestureSurfaceRef(element);
      else if (gestureSurfaceRef) gestureSurfaceRef.current = element;
    },
    [gestureSurfaceRef],
  );
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tabGeometryRef = useRef<Map<string, { left: number; width: number }>>(new Map());
  const touchPress = useRef<{ id: string; pointerId: number; x: number; y: number } | null>(null);
  const touchClick = useRef<string | null>(null);
  const latestProgressRef = useRef<TabGestureProgress | null>(gestureProgress ?? null);

  const paintIndicator = useCallback(
    (fromId: string, toId: string, progress: number) => {
      const indicator = indicatorRef.current;
      if (!indicator) return;
      const geom = tabGeometryRef.current;
      const a = geom.get(fromId) ?? geom.get(selected);
      if (!a) return;
      const b = geom.get(toId) ?? a;
      const left = a.left + (b.left - a.left) * progress;
      const width = a.width + (b.width - a.width) * progress;
      indicator.style.transform = `translate3d(${left}px, 0, 0) scaleX(${width})`;
    },
    [selected],
  );

  const paintCurrent = useCallback(() => {
    const p = latestProgressRef.current;
    if (p) {
      paintIndicator(p.fromId, p.toId, p.progress);
    } else {
      paintIndicator(selected, selected, 0);
    }
  }, [paintIndicator, selected]);

  const measureGeometry = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const stripRect = strip.getBoundingClientRect();
    const map = new Map<string, { left: number; width: number }>();
    for (const [id, button] of tabRefs.current.entries()) {
      const r = button.getBoundingClientRect();
      map.set(id, {
        left: r.left - stripRect.left + strip.scrollLeft,
        width: r.width,
      });
    }
    tabGeometryRef.current = map;
  }, []);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    measureGeometry();
    paintCurrent();

    const handleResize = () => {
      measureGeometry();
      paintCurrent();
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(strip);
    for (const button of tabRefs.current.values()) {
      observer.observe(button);
    }

    strip.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      observer.disconnect();
      strip.removeEventListener('scroll', handleResize);
    };
  }, [items, measureGeometry, paintCurrent]);

  useLayoutEffect(() => {
    latestProgressRef.current = gestureProgress ?? null;
    paintCurrent();
  }, [gestureProgress, paintCurrent]);

  useImperativeHandle(
    control,
    (): TabsControl => ({
      setGestureProgress(detail: TabGestureProgress | null) {
        latestProgressRef.current = detail;
        paintCurrent();
      },
    }),
    [paintCurrent],
  );

  const enabledItems = items.filter((item) => item.disabled !== true);
  const selectedIndex = enabledItems.findIndex((item) => item.id === selected);
  const firstEnabledId = enabledItems[0]?.id;

  useEffect(() => {
    const scrollSelectedIntoView = () => {
      const strip = stripRef.current;
      const button = tabRefs.current.get(selected);
      if (!strip || !button) return;
      const stripRect = strip.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      if (buttonRect.left < stripRect.left) {
        strip.scrollLeft += buttonRect.left - stripRect.left;
      } else if (buttonRect.right > stripRect.right) {
        strip.scrollLeft += buttonRect.right - stripRect.right;
      }
    };
    scrollSelectedIntoView();
    const frameId = requestAnimationFrame(scrollSelectedIntoView);
    return () => cancelAnimationFrame(frameId);
  }, [selected]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentId: string) => {
    if (enabledItems.length === 0) return;

    const currentIndex = enabledItems.findIndex((item) => item.id === currentId);
    if (currentIndex === -1) return;

    let targetIndex: number;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        targetIndex = (currentIndex + 1) % enabledItems.length;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        targetIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
        break;
      case 'Home':
        event.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        targetIndex = enabledItems.length - 1;
        break;
      default:
        return;
    }

    if (targetIndex >= 0) {
      const targetItem = enabledItems[targetIndex];
      if (targetItem) {
        onSelectedChange(targetItem.id);
        const targetButton = tabRefs.current.get(targetItem.id);
        targetButton?.focus({ preventScroll: true });
      }
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div
        ref={setStrip}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className={`relative flex flex-row overflow-x-auto border-b border-outline gap-2 px-2 py-1 min-w-0 max-w-full ${gestureSurfaceRef ? 'touch-pan-y' : ''}`}
      >
        {items.map((item) => {
          const isSelected = item.id === selected && item.disabled !== true;
          const isFocusable =
            selectedIndex !== -1 ? item.id === selected : item.id === firstEnabledId;
          const tabId = `${baseId}-tab-${item.id}`;
          const panelId =
            renderPanels && item.panel !== undefined ? `${baseId}-panel-${item.id}` : undefined;

          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(item.id, el);
                } else {
                  tabRefs.current.delete(item.id);
                }
              }}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isFocusable ? 0 : -1}
              disabled={item.disabled === true}
              onPointerDown={(event) => {
                if (!event.isPrimary) return;
                touchClick.current = null;
                touchPress.current =
                  event.pointerType === 'touch'
                    ? {
                        id: item.id,
                        pointerId: event.pointerId,
                        x: event.clientX,
                        y: event.clientY,
                      }
                    : null;
              }}
              onPointerMove={(event) => {
                const press = touchPress.current;
                if (
                  press?.pointerId === event.pointerId &&
                  Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8
                )
                  touchPress.current = null;
              }}
              onPointerCancel={() => {
                touchPress.current = null;
                touchClick.current = item.id;
              }}
              onPointerUp={(event) => {
                if (event.pointerType !== 'touch' || !event.isPrimary) return;
                const press = touchPress.current;
                touchPress.current = null;
                touchClick.current = item.id;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (
                  press?.id === item.id &&
                  press.pointerId === event.pointerId &&
                  Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8 &&
                  event.clientX >= bounds.left &&
                  event.clientX <= bounds.right &&
                  event.clientY >= bounds.top &&
                  event.clientY <= bounds.bottom &&
                  item.disabled !== true
                )
                  onSelectedChange(item.id);
              }}
              onClick={(event) => {
                // WebView can omit the compatibility click after a swipe; touch already committed.
                if (event.detail > 0 && touchClick.current === item.id) {
                  touchClick.current = null;
                  return;
                }
                touchClick.current = null;
                if (item.disabled !== true) {
                  onSelectedChange(item.id);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`fp-control-reset min-h-touch min-w-touch px-4 py-2 text-supporting font-medium whitespace-nowrap grow shrink-0 fp-focus border-b-2 ${
                isSelected
                  ? 'border-transparent text-action-text font-semibold'
                  : 'border-transparent text-muted hover:text-on-surface'
              } ${item.disabled === true ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {typeof item.label === 'string' || typeof item.label === 'number' ? (
                <span className="inline-grid [grid-template-areas:'label']">
                  <span
                    aria-hidden="true"
                    data-label={item.label}
                    className="invisible font-semibold [grid-area:label] after:content-[attr(data-label)]"
                  />
                  <span className="[grid-area:label]">{item.label}</span>
                </span>
              ) : (
                item.label
              )}
            </button>
          );
        })}
        <span
          ref={indicatorRef}
          data-tab-indicator
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 border-b-2 border-primary origin-left"
          style={{ width: '1px' }}
        />
      </div>

      {renderPanels ? (
        <div className="mt-4">
          {items.map((item) => {
            if (item.panel === undefined) return null;
            const isSelected = item.id === selected && item.disabled !== true;
            const tabId = `${baseId}-tab-${item.id}`;
            const panelId = `${baseId}-panel-${item.id}`;

            return (
              <div
                key={item.id}
                role="tabpanel"
                id={panelId}
                aria-labelledby={tabId}
                tabIndex={0}
                hidden={!isSelected}
                inert={!isSelected ? true : undefined}
                className={`fp-focus text-body text-on-surface ${!isSelected ? 'hidden' : 'block'}`}
              >
                {item.panel}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

function TabsDemo(props: TabsProps): JSX.Element {
  const [selected, setSelected] = useState<string>(props.selected);

  const handleSelectedChange = (nextSelected: string): void => {
    setSelected(nextSelected);
    props.onSelectedChange(nextSelected);
  };

  return <Tabs {...props} selected={selected} onSelectedChange={handleSelectedChange} />;
}

export default library.version({
  id: 'fp.tabs',
  version: 'v1',
  component: Tabs,
  notes:
    'Initial v1 tabs component with horizontal roving tabindex, automatic arrow navigation, preserved panel DOM state, and responsive overflow.',
  examples: [
    {
      name: 'Standard recipe sections',
      render: TabsDemo,
      props: {
        selected: 'ingredients',
        onSelectedChange: () => {},
        label: 'Recipe view sections',
        items: [
          {
            id: 'ingredients',
            label: 'Ingredients (5)',
            panel: 'Bread flour: 500g, Water: 375g (75%), Leaven: 100g (20%), Salt: 10g (2%).',
          },
          {
            id: 'timeline',
            label: 'Timeline & Steps',
            panel:
              '08:00 Autolyse, 08:45 Mix, 09:30 Stretch and fold sets, 13:00 Shape, 15:00 Bake.',
          },
          {
            id: 'bakers-math',
            label: 'Baker Percentages',
            panel: 'Total flour basis 100%, Hydration 75%, Inoculation 20%, Salinity 2%.',
          },
        ],
      },
    },
    {
      name: 'Narrow mobile strip with long labels and disabled stage',
      render: TabsDemo,
      props: {
        selected: 'fermentation',
        onSelectedChange: () => {},
        label: 'Fermentation control stages',
        items: [
          {
            id: 'fermentation',
            label: 'Primary Bulk Fermentation & Folds',
            panel: 'Maintain dough at 26°C dough temperature with 4 hourly coil folds.',
          },
          {
            id: 'shaping',
            label: 'Pre-shaping & Final Bench Rest',
            panel:
              'Preshape into round boules and bench rest for 20 minutes before banneton transfer.',
          },
          {
            id: 'steam-injection',
            label: 'Automated Steam Injection (Unavailable)',
            panel: 'Steam injection system unavailable in domestic kitchen profile.',
            disabled: true,
          },
        ],
      },
    },
  ],
});

export type { TabItem, TabsControl, TabsProps } from './props.ts';
