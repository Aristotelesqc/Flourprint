import type { Formula, ResolvedFormula } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';
import { Rows, SectionTitle } from '../ui/Layout';

export interface WeighingItem {
  readonly key: string;
  readonly label: string;
  readonly grams: number;
}

export const buildFinalMixItems = (
  formula: Formula,
  resolved: ResolvedFormula,
  name: (id: string) => string,
  componentName: (formula: Formula, component: Formula['components'][number]) => string,
): WeighingItem[] => {
  const componentLabel = (id: string) => {
    const component = formula.components.find((c) => c.id === id);
    return component ? componentName(formula, component) : name(id);
  };
  return [
    ...Object.entries(resolved.finalMix.componentMasses).map(([id, g]) => ({
      key: `component:${id}`,
      label: componentLabel(id),
      grams: g,
    })),
    ...Object.entries(resolved.finalMix.flourByFlour).map(([id, g]) => ({
      key: `flour:${id}`,
      label: name(id),
      grams: g,
    })),
    { key: 'water', label: name('water'), grams: resolved.finalMix.water },
    ...Object.entries(resolved.finalMix.grams).map(([id, g]) => ({
      key: `ingredient:${id}`,
      label: name(id),
      grams: g,
    })),
  ];
};

interface Props {
  readonly formula: Formula;
  readonly resolved: ResolvedFormula;
  readonly weighed: ReadonlyMap<string, number>;
  readonly onToggle: (key: string, grams: number) => void;
}

export const WeighingChecklist = ({ formula, resolved, weighed, onToggle }: Props) => {
  const { t, grams, name, componentName } = useMessages();
  const items = buildFinalMixItems(formula, resolved, name, componentName);
  const isWeighed = (item: WeighingItem) => weighed.get(item.key) === item.grams;
  const doneCount = items.filter(isWeighed).length;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5">
          <SectionTitle>{t('formula.finalMix')}</SectionTitle>
          <InfoButton topic="finalMix" term={t('formula.finalMix')} />
        </span>
        <span className="px-1 text-[13px] text-muted">
          {t('formula.finalMix.progress', {
            done: doneCount,
            total: items.length,
          })}
        </span>
      </div>
      <p className="m-0 px-1 text-xs text-muted">{t('formula.finalMix.temporaryScope')}</p>
      <Rows>
        {items.map((item) => {
          const done = isWeighed(item);
          return (
            <label
              key={item.key}
              className={`flex min-h-[52px] items-center gap-3 px-4 ${
                done ? 'text-muted line-through' : ''
              }`}
            >
              <input
                type="checkbox"
                className="size-[22px] accent-[var(--color-accent)]"
                checked={done}
                onChange={() => onToggle(item.key, item.grams)}
              />
              <span className="flex-1">{item.label}</span>
              <span className="font-bold">{grams(item.grams)}</span>
            </label>
          );
        })}
      </Rows>
    </section>
  );
};
