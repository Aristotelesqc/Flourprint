import {
  sameWeighingRow,
  weighingGroups,
  type Formula,
  type ResolvedFormula,
  type StageRef,
  type WeighingItem as CoreWeighingItem,
  type WeighingRow,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';
import { SectionTitle } from '../ui/Layout';
import { Ui } from '../ui/library';

export type WeighedRow = {
  readonly stage: StageRef;
  readonly item: CoreWeighingItem;
};

export { sameWeighingRow };

interface Props {
  readonly formula: Formula;
  readonly resolved: ResolvedFormula;
  readonly weighed: readonly WeighedRow[];
  readonly onToggle: (row: WeighedRow) => void;
}

export const WeighingChecklist = ({ formula, resolved, weighed, onToggle }: Props) => {
  const { t, grams, pct, name, componentName } = useMessages();
  const groups = weighingGroups(formula, resolved);

  const isChecked = (row: WeighingRow) => weighed.some((w) => sameWeighingRow(w, row));

  const totalCount = groups.reduce((acc, g) => acc + g.rows.length, 0);
  const doneCount = groups.reduce((acc, g) => acc + g.rows.filter(isChecked).length, 0);

  const getStageTitle = (stage: StageRef): string => {
    if (stage.kind === 'component') {
      const comp = formula.components.find((c) => c.id === stage.id);
      return comp ? componentName(formula, comp) : name(stage.id);
    }
    if (stage.kind === 'final') {
      return t('formula.stage.final');
    }
    return t('formula.stage.finishing');
  };

  const getItemLabel = (item: CoreWeighingItem): string => {
    if (item.kind === 'water') {
      return name('water');
    }
    return name(item.id);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5">
          <SectionTitle>{t('formula.finalMix')}</SectionTitle>
          <InfoButton topic="finalMix" term={t('formula.finalMix')} />
        </span>
        <span className="px-1 text-[13px] text-muted">
          {t('formula.finalMix.progress', {
            done: doneCount,
            total: totalCount,
          })}
        </span>
      </div>
      <p className="m-0 px-1 text-xs text-muted">{t('formula.weighing.scopeNotice')}</p>

      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const groupKey =
            group.stage.kind === 'component' ? `component:${group.stage.id}` : group.stage.kind;
          const stageTitle = getStageTitle(group.stage);
          const groupDoneCount = group.rows.filter(isChecked).length;

          return (
            <div
              key={groupKey}
              role="group"
              aria-label={stageTitle}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {stageTitle}
                </span>
                <div className="flex items-baseline gap-2 text-xs text-muted">
                  <span className="text-[11px]">{t('formula.column.basisBaker')}</span>
                  <span>•</span>
                  <span>
                    {t('formula.finalMix.progress', {
                      done: groupDoneCount,
                      total: group.rows.length,
                    })}
                  </span>
                </div>
              </div>
              <Ui
                component="fp.surface"
                variant="outlined"
                padding="none"
                className="overflow-hidden rounded-2xl divide-y divide-line"
              >
                {group.rows.map((row) => {
                  const done = isChecked(row);
                  const itemKey = row.item.kind === 'water' ? 'water' : `ingredient:${row.item.id}`;
                  const rowKey = `${groupKey}:${itemKey}`;
                  const label = getItemLabel(row.item);

                  return (
                    <label
                      key={rowKey}
                      className={`flex min-h-touch items-center gap-3 px-4 py-2 cursor-pointer ${
                        done ? 'text-muted line-through bg-muted/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-[22px] shrink-0 accent-[var(--color-accent)]"
                        checked={done}
                        onChange={() => onToggle({ stage: row.stage, item: row.item })}
                      />
                      <span className="flex-1 min-w-0 break-words">{label}</span>
                      <div className="flex flex-col items-end shrink-0 text-right">
                        <span className="font-semibold tabular-nums">{grams(row.grams)}</span>
                        <span className="text-xs text-muted tabular-nums">{pct(row.bakerPct)}</span>
                      </div>
                    </label>
                  );
                })}
              </Ui>
            </div>
          );
        })}
      </div>
    </section>
  );
};
