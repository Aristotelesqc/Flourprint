import { useEffect, useId, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { library } from '../../index.ts';
import type { TabsProps } from './props.ts';

export const Tabs = ({ selected, onSelectedChange, label, items }: TabsProps): JSX.Element => {
  const baseId = useId();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const enabledItems = items.filter((item) => item.disabled !== true);
  const selectedIndex = enabledItems.findIndex((item) => item.id === selected);
  const firstEnabledId = enabledItems[0]?.id;

  useEffect(() => {
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
        ref={stripRef}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className="flex flex-row overflow-x-auto border-b border-outline gap-2 px-2 py-1 min-w-0 max-w-full"
      >
        {items.map((item) => {
          const isSelected = item.id === selected && item.disabled !== true;
          const isFocusable =
            selectedIndex !== -1 ? item.id === selected : item.id === firstEnabledId;
          const tabId = `${baseId}-tab-${item.id}`;
          const panelId = `${baseId}-panel-${item.id}`;

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
              onClick={() => {
                if (item.disabled !== true) {
                  onSelectedChange(item.id);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`fp-control-reset min-h-touch min-w-touch px-4 py-2 text-supporting font-medium whitespace-nowrap shrink-0 fp-focus border-b-2 ${
                isSelected
                  ? 'border-primary text-action-text font-semibold'
                  : 'border-transparent text-muted hover:text-on-surface'
              } ${item.disabled === true ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {items.map((item) => {
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
