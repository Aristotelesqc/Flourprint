import { useState, type ReactNode } from 'react';
import type {
  Anchor,
  Formula,
  FormulaEdit,
  Process,
  ResolvedFormula,
} from '@flourprint/core/domain';
import { editableNumber } from '../i18n/numbers';
import { useMessages } from '../i18n/use-messages';
import { NumberField } from '../ui/Field';
import { Card, Rows, SectionTitle } from '../ui/Layout';
import { Segmented } from '../ui/Segmented';
import { totalWaterKey } from './water-label';
import { WaterExplanation } from './WaterExplanation';
import {
  AddIngredient,
  AddPreparation,
  ChangesSummary,
  PreparationFields,
  TimeSummary,
  WaterLock,
  type StructureEdit,
} from './FormulaEditors';

interface Props {
  readonly formula: Formula;
  readonly resolved: ResolvedFormula;
  /** The saved revision's formula, to show what the draft changes. */
  readonly base: Formula;
  readonly process: Process;
  readonly now: string;
  /** Returns false when the engine refused the edit; the page shows the reason. */
  readonly onEdit: (edit: FormulaEdit) => boolean;
  /** A formula edit with the process change it needs (a preparation's step). */
  readonly onStructure: StructureEdit;
}

const ROW = 'grid grid-cols-[1fr_88px_104px] items-center gap-2';

/**
 * Formula tab of the #8 mockups: quantity and key figures first, then flours, ingredients,
 * preparations and the final mix to weigh. Every number comes from the engine (#19).
 */
export const FormulaSection = ({
  formula,
  resolved,
  base,
  process,
  now,
  onEdit,
  onStructure,
}: Props) => {
  const { t, grams, pct, name, componentName, locale } = useMessages();
  const componentLabel = (id: string) => {
    const component = formula.components.find((c) => c.id === id);
    return component ? componentName(formula, component) : name(id);
  };
  const [explaining, setExplaining] = useState(false);
  // Weighed items remember the grams they were weighed at: a quantity change unchecks them.
  const [weighed, setWeighed] = useState<ReadonlyMap<string, number>>(new Map());
  const anchor = formula.anchor;

  const rescale = (next: Anchor) => onEdit({ type: 'SetAnchor', mode: 'rescale', anchor: next });

  const finalMix: { key: string; label: string; grams: number }[] = [
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
  const isWeighed = (item: { key: string; grams: number }) => weighed.get(item.key) === item.grams;

  const lockedWater = formula.waterTarget?.absorbInto;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <ChangesSummary base={base} formula={formula} />
      <TimeSummary process={process} now={now} />
      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold">{t('formula.quantity')}</span>
          <div className="w-56">
            <Segmented
              size="small"
              value={anchor.kind}
              options={(['flourTotal', 'doughWeight', 'pieces'] as const).map((kind) => ({
                value: kind,
                label: t(`formula.anchor.${kind}`),
              }))}
              onChange={(kind) =>
                void onEdit({
                  type: 'SetAnchor',
                  mode: 'reinterpret',
                  kind,
                  ...(kind === 'pieces' ? { count: 1 } : {}),
                })
              }
            />
          </div>
        </div>
        {anchor.kind === 'pieces' ? (
          <>
            <LabeledField label={t('formula.anchorField.count')}>
              <NumberField
                label={t('formula.anchorField.count')}
                size="large"
                width="8rem"
                value={anchor.count}
                onCommit={(count) => rescale({ ...anchor, count })}
              />
            </LabeledField>
            <LabeledField label={t('formula.anchorField.gramsEach')}>
              <NumberField
                label={t('formula.anchorField.gramsEach')}
                unit="g"
                size="large"
                width="8rem"
                value={anchor.gramsEach}
                onCommit={(gramsEach) => rescale({ ...anchor, gramsEach })}
              />
            </LabeledField>
          </>
        ) : (
          <LabeledField label={t(`formula.anchorField.${anchor.kind}`)}>
            <NumberField
              label={t(`formula.anchorField.${anchor.kind}`)}
              unit="g"
              size="large"
              width="8rem"
              value={anchor.grams}
              onCommit={(value) => rescale({ kind: anchor.kind, grams: value })}
            />
          </LabeledField>
        )}
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3">
          <Stat label={t('formula.stat.dough')} value={grams(resolved.doughWeight)} />
          <Stat label={t('formula.stat.pureWater')} value={pct(resolved.pureWaterPct)} />
          <button
            type="button"
            className="fp-reset flex flex-col items-start"
            onClick={() => setExplaining(true)}
          >
            <span className="flex items-center gap-1 text-xs text-muted">
              {t('formula.stat.totalWater')}
              <InfoIcon />
            </span>
            <span className="text-lg font-bold text-accent-text underline decoration-dotted underline-offset-4">
              {t(totalWaterKey(resolved.totalWater), { pct: pct(resolved.totalWaterPct) })}
            </span>
          </button>
        </div>
        {resolved.totalWater.completeness === 'incomplete' && (
          <p className="m-0 text-sm text-muted">
            {t('formula.water.incomplete', {
              ingredients: resolved.totalWater.unknownContributors.map(name).join(', '),
            })}
          </p>
        )}
        <Enrichment resolved={resolved} />
        <WaterLock formula={formula} resolved={resolved} onEdit={onEdit} />
      </Card>

      <section>
        <GroupHeader
          title={t('formula.group.flours')}
          pctLabel={t('formula.column.flourPct')}
          gramsLabel={t('formula.column.grams')}
        />
        <Rows>
          {Object.entries(resolved.flourByFlour).map(([id, flourGrams]) => (
            <div key={id} className={`${ROW} min-h-[60px] px-3`}>
              <span className="font-semibold">{name(id)}</span>
              <span className="flex items-center justify-end gap-1 pr-2.5">
                <span>
                  {editableNumber(formula.flours.find((f) => f.id === id)?.sharePct ?? 0, locale)}
                </span>
                <span className="text-muted">%</span>
              </span>
              <NumberField
                label={name(id)}
                unit="g"
                value={flourGrams}
                onCommit={(value) =>
                  onEdit({ type: 'SetIngredientGrams', ingredient: id, grams: value })
                }
              />
            </div>
          ))}
        </Rows>
      </section>

      <section>
        <GroupHeader
          title={t('formula.group.ingredients')}
          pctLabel={t('formula.column.bakerPct')}
          gramsLabel={t('formula.column.grams')}
        />
        <Rows>
          <p className="m-0 px-3 py-2 text-[13px] text-muted">{t('formula.editRule')}</p>
          {formula.ingredients.map((ingredient) =>
            ingredient.id === lockedWater ? (
              <div key={ingredient.id} className={`${ROW} min-h-[60px] px-3`}>
                <span className="flex flex-col">
                  <span className="font-semibold">{name(ingredient.id)}</span>
                  <span className="text-[13px] text-muted">{t('formula.lock.follows')}</span>
                </span>
                <span className="pr-2.5 text-right">{pct(ingredient.bakerPct)}</span>
                <span className="pr-2.5 text-right font-semibold">
                  {grams(resolved.grams[ingredient.id] ?? 0)}
                </span>
              </div>
            ) : (
              <div key={ingredient.id} className={`${ROW} min-h-[60px] px-3`}>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="font-semibold">{name(ingredient.id)}</span>
                  <button
                    type="button"
                    className="fp-reset text-[13px] text-muted underline"
                    onClick={() =>
                      void onEdit({ type: 'RemoveIngredient', ingredient: ingredient.id })
                    }
                  >
                    {t('formula.remove')}
                  </button>
                </span>
                <NumberField
                  label={`${name(ingredient.id)}, ${t('formula.column.bakerPct')}`}
                  unit="%"
                  value={ingredient.bakerPct}
                  onCommit={(value) =>
                    onEdit({ type: 'SetBakerPct', ingredient: ingredient.id, pct: value })
                  }
                />
                <NumberField
                  label={name(ingredient.id)}
                  unit="g"
                  value={resolved.grams[ingredient.id] ?? 0}
                  onCommit={(value) =>
                    onEdit({ type: 'SetIngredientGrams', ingredient: ingredient.id, grams: value })
                  }
                />
              </div>
            ),
          )}
          <AddIngredient formula={formula} onEdit={onEdit} />
        </Rows>
      </section>

      {
        <section className="flex flex-col gap-2">
          <SectionTitle>{t('formula.preparations')}</SectionTitle>
          {formula.components.map((component) => {
            const c = resolved.components[component.id];
            if (!c) return null;
            const breakdown = [
              t('formula.component.flour', { grams: grams(c.flour) }),
              t('formula.component.water', { grams: grams(c.water) }),
              ...Object.entries(c.allocations).map(([id, g]) =>
                t('formula.component.allocation', { grams: grams(g), name: name(id) }),
              ),
              ...(c.waterLoss > 0
                ? [t('formula.component.loss', { grams: grams(c.waterLoss) })]
                : []),
            ];
            const params = [
              t('formula.prep.flourPct', { pct: pct(component.flourPct) }),
              t('formula.prep.hydration', { pct: pct(component.hydrationPct) }),
              ...(component.allocations ?? []).map((a) =>
                t('formula.prep.allocation', { name: name(a.ingredient), pct: pct(a.bakerPct) }),
              ),
            ];
            return (
              <Card key={component.id} gap="gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[19px] font-semibold">
                    {componentName(formula, component)}
                  </span>
                  <span className="text-lg font-bold">{grams(c.mass)}</span>
                </div>
                <span className="text-[15px]">{params.join(' · ')}</span>
                <span className="text-sm text-muted">{breakdown.join(' · ')}</span>
                <PreparationFields
                  formula={formula}
                  process={process}
                  componentId={component.id}
                  onEdit={onEdit}
                  onStructure={onStructure}
                />
              </Card>
            );
          })}
          <AddPreparation formula={formula} process={process} onStructure={onStructure} />
        </section>
      }

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <SectionTitle>{t('formula.finalMix')}</SectionTitle>
          <span className="px-1 text-[13px] text-muted">
            {t('formula.finalMix.progress', {
              done: finalMix.filter(isWeighed).length,
              total: finalMix.length,
            })}
          </span>
        </div>
        <Rows>
          {finalMix.map((item) => {
            const done = isWeighed(item);
            return (
              <label
                key={item.key}
                className={`flex min-h-[52px] items-center gap-3 px-4 ${done ? 'text-muted line-through' : ''}`}
              >
                <input
                  type="checkbox"
                  className="size-[22px] accent-[var(--color-accent)]"
                  checked={done}
                  onChange={() => {
                    const next = new Map(weighed);
                    if (done) next.delete(item.key);
                    else next.set(item.key, item.grams);
                    setWeighed(next);
                  }}
                />
                <span className="flex-1">{item.label}</span>
                <span className="font-bold">{grams(item.grams)}</span>
              </label>
            );
          })}
        </Rows>
      </section>

      <WaterExplanation
        resolved={resolved}
        open={explaining}
        onClose={() => setExplaining(false)}
      />
    </div>
  );
};

const ENRICHED_PCT = 0.5;

/**
 * Added fat and sugar next to the water (formula.md, Fat and sugar), for enriched doughs; an
 * unknown content keeps the total marked as an estimate.
 */
const Enrichment = ({ resolved }: { resolved: ResolvedFormula }) => {
  const { t, pct, name } = useMessages();
  const { totalFat, totalSugar, totalFatPct, totalSugarPct } = resolved;
  if (!totalFat || !totalSugar || totalFatPct === undefined || totalSugarPct === undefined) {
    return null;
  }
  const unknown = [
    ...new Set([...totalFat.unknownContributors, ...totalSugar.unknownContributors]),
  ];
  // Yeast alone brings traces of fat: below half a point the dough is not enriched, unless an
  // ingredient's content is unknown, which may hide any amount.
  if (Math.max(totalFatPct, totalSugarPct) < ENRICHED_PCT && unknown.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label={t('formula.stat.fat')}
          value={t(totalWaterKey(totalFat), { pct: pct(totalFatPct) })}
        />
        <Stat
          label={t('formula.stat.sugar')}
          value={t(totalWaterKey(totalSugar), { pct: pct(totalSugarPct) })}
        />
      </div>
      {unknown.length > 0 && (
        <p className="m-0 text-sm text-muted">
          {t('formula.enrichment.incomplete', { ingredients: unknown.map(name).join(', ') })}
        </p>
      )}
    </>
  );
};

const GroupHeader = ({
  title,
  pctLabel,
  gramsLabel,
}: {
  title: string;
  pctLabel: string;
  gramsLabel: string;
}) => (
  <div className={`${ROW} px-4 pb-1.5 text-[13px] font-semibold text-muted`}>
    <span className="tracking-wide uppercase">{title}</span>
    <span className="text-right">{pctLabel}</span>
    <span className="text-right">{gramsLabel}</span>
  </div>
);

const LabeledField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    {children}
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted">{label}</span>
    <span className="text-lg font-bold">{value}</span>
  </div>
);

const InfoIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
