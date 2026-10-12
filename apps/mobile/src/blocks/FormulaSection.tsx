import { useState, type ReactNode } from 'react';
import type {
  Anchor,
  Formula,
  FormulaEdit,
  Process,
  ResolvedFormula,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { NumberField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { Card, Rows, SectionTitle } from '../ui/Layout';
import { Segmented } from '../ui/Segmented';
import { flourSummary } from '../services/flour-summary';
import { useFlourCatalog } from '../services/flours';
import { totalWaterKey } from './water-label';
import { WaterExplanation } from './WaterExplanation';
import { FermentationCard } from './Fermentation';
import { WeighingChecklist } from './WeighingChecklist';
import {
  AddFlour,
  AddIngredient,
  AddPreparation,
  PreparationFields,
  Hydration,
  type StructureEdit,
} from './FormulaEditors';

interface Props {
  readonly formula: Formula;
  /** Absent when the draft's formula cannot be resolved yet (drafts.md): grams show as "—". */
  readonly resolved?: ResolvedFormula;
  readonly process: Process;
  readonly now: string;
  /** Returns false when the engine refused the edit; the page shows the reason. */
  readonly onEdit: (edit: FormulaEdit) => boolean;
  /** A formula edit with the process change it needs (a preparation's step). */
  readonly onStructure: StructureEdit;
  /** A process change (temperatures, an applied duration); false when refused. */
  readonly onProcess: (process: Process) => boolean;
  /** Shared weighing checklist state lifted to page (#67). */
  readonly weighed: ReadonlyMap<string, number>;
  readonly onToggleWeighed: (key: string, grams: number) => void;
  readonly fermentationRef?: React.RefObject<HTMLDivElement | null>;
  readonly hydrationRef?: React.RefObject<HTMLDivElement | null>;
}

export const ROW = 'grid grid-cols-[1fr_88px_104px] items-center gap-2';

/**
 * Formula tab of the #8 mockups: quantity and key figures first, then flours, ingredients,
 * preparations and the final mix to weigh. Every number comes from the engine (#19).
 */
export const FormulaSection = ({
  formula,
  resolved,
  process,
  now,
  onEdit,
  onStructure,
  onProcess,
  weighed,
  onToggleWeighed,
  fermentationRef,
  hydrationRef,
}: Props) => {
  const { t, grams, pct, name, componentName } = useMessages();
  const [explaining, setExplaining] = useState(false);
  const anchor = formula.anchor;

  const rescale = (next: Anchor) => onEdit({ type: 'SetAnchor', mode: 'rescale', anchor: next });

  const lockedWater = formula.waterTarget?.absorbInto;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 font-bold">
            {t('formula.quantity')}
            <InfoButton topic="anchor" term={t('formula.quantity')} />
          </span>
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
        {!resolved ? (
          <p className="m-0 border-t border-line pt-3 text-sm text-muted">
            {t('formula.unresolved')}
          </p>
        ) : (
          <>
            <Hydration
              ref={hydrationRef}
              formula={formula}
              resolved={resolved}
              onEdit={onEdit}
              onExplain={() => setExplaining(true)}
            />
            {resolved.totalWater.completeness === 'incomplete' && (
              <p className="m-0 text-sm text-muted">
                {t('formula.water.incomplete', {
                  ingredients: resolved.totalWater.unknownContributors.map(name).join(', '),
                })}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t('formula.stat.dough')} value={grams(resolved.doughWeight)} />
              <Stat label={t('formula.stat.pureWater')} value={pct(resolved.pureWaterPct)} />
            </div>
            <Enrichment resolved={resolved} />
          </>
        )}
      </Card>

      <section>
        <GroupHeader
          title={t('formula.group.flours')}
          pctLabel={t('formula.column.flourPct')}
          gramsLabel={t('formula.column.grams')}
        />
        <Rows>
          {formula.flours.map((flour) => (
            <div key={flour.id} className={`${ROW} min-h-[60px] px-3`}>
              <span className="flex min-w-0 flex-col items-start">
                <span className="font-semibold">{name(flour.id)}</span>
                <FlourSummary id={flour.id} />
                {formula.flours.length > 1 && (
                  <button
                    type="button"
                    aria-label={t('formula.removeNamed', { name: name(flour.id) })}
                    className="fp-reset text-[13px] text-muted underline"
                    onClick={() =>
                      void onEdit({
                        type: 'SetFlourBlend',
                        flours: formula.flours.filter((f) => f.id !== flour.id),
                      })
                    }
                  >
                    {t('formula.remove')}
                  </button>
                )}
              </span>
              <NumberField
                label={`${name(flour.id)}, ${t('formula.column.flourPct')}`}
                unit="%"
                value={flour.sharePct}
                onCommit={(value) =>
                  onEdit({
                    type: 'SetFlourBlend',
                    flours: formula.flours.map((f) =>
                      f.id === flour.id ? { ...f, sharePct: value } : f,
                    ),
                  })
                }
              />
              {resolved ? (
                <NumberField
                  label={name(flour.id)}
                  unit="g"
                  value={resolved.flourByFlour[flour.id] ?? 0}
                  onCommit={(value) =>
                    onEdit({ type: 'SetIngredientGrams', ingredient: flour.id, grams: value })
                  }
                />
              ) : (
                <span className="pr-2.5 text-right text-muted">—</span>
              )}
            </div>
          ))}
          <AddFlour formula={formula} onEdit={onEdit} />
        </Rows>
      </section>

      <section>
        <GroupHeader
          title={t('formula.group.ingredients')}
          pctLabel={t('formula.column.bakerPct')}
          gramsLabel={t('formula.column.grams')}
          help={<InfoButton topic="bakerPct" term={t('formula.column.bakerPct')} />}
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
                  {resolved ? grams(resolved.grams[ingredient.id] ?? 0) : '—'}
                </span>
              </div>
            ) : (
              <div key={ingredient.id} className={`${ROW} min-h-[60px] px-3`}>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="font-semibold">{name(ingredient.id)}</span>
                  <button
                    type="button"
                    aria-label={t('formula.removeNamed', { name: name(ingredient.id) })}
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
                {resolved ? (
                  <NumberField
                    label={name(ingredient.id)}
                    unit="g"
                    value={resolved.grams[ingredient.id] ?? 0}
                    onCommit={(value) =>
                      onEdit({
                        type: 'SetIngredientGrams',
                        ingredient: ingredient.id,
                        grams: value,
                      })
                    }
                  />
                ) : (
                  <span className="pr-2.5 text-right text-muted">—</span>
                )}
              </div>
            ),
          )}
          <AddIngredient formula={formula} onEdit={onEdit} />
        </Rows>
      </section>

      <section className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5">
          <SectionTitle>{t('formula.preparations')}</SectionTitle>
          <InfoButton topic="preparations" term={t('formula.preparations')} />
        </span>
        {formula.components.length === 0 && (
          <p className="m-0 px-1 text-sm text-muted">{t('formula.prep.empty')}</p>
        )}
        {formula.components.map((component) => {
          const c = resolved?.components[component.id];
          const breakdown = !c
            ? []
            : [
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
                <span className="text-lg font-bold">{c ? grams(c.mass) : '—'}</span>
              </div>
              <span className="text-[15px]">{params.join(' · ')}</span>
              {breakdown.length > 0 && (
                <span className="text-sm text-muted">{breakdown.join(' · ')}</span>
              )}
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

      <div
        ref={fermentationRef}
        id="fermentation-settings"
        data-testid="fermentation-card"
        tabIndex={-1}
        className="outline-none"
      >
        <FermentationCard
          formula={formula}
          process={process}
          now={now}
          onEdit={onEdit}
          onProcess={onProcess}
        />
      </div>

      {resolved && (
        <WeighingChecklist
          formula={formula}
          resolved={resolved}
          weighed={weighed}
          onToggle={onToggleWeighed}
        />
      )}

      {resolved && (
        <WaterExplanation
          resolved={resolved}
          open={explaining}
          onClose={() => setExplaining(false)}
        />
      )}
    </div>
  );
};

const ENRICHED_PCT = 0.5;

/**
 * Added fat and sugar next to the water (formula.md, Fat and sugar), for enriched doughs; an
 * unknown content keeps the total marked as an estimate.
 */
export const Enrichment = ({ resolved }: { resolved: ResolvedFormula }) => {
  const { t, pct, name } = useMessages();
  const { totalFat, totalSugar, totalFatPct, totalSugarPct } = resolved;
  if (!totalFat || !totalSugar || totalFatPct === undefined || totalSugarPct === undefined) {
    return null;
  }
  const unknown = [
    ...new Set([...totalFat.unknownContributors, ...totalSugar.unknownContributors]),
  ];
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

export const GroupHeader = ({
  title,
  pctLabel,
  gramsLabel,
  help,
}: {
  title: string;
  pctLabel: string;
  gramsLabel: string;
  help?: ReactNode;
}) => (
  <div className={`${ROW} px-4 pb-1.5 text-[13px] font-semibold text-muted`}>
    <span className="flex items-center gap-1.5">
      <span className="tracking-wide uppercase">{title}</span>
      {help}
    </span>
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

export const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted">{label}</span>
    <span className="text-lg font-bold">{value}</span>
  </div>
);

/** What the registry knows about a flour, in one line; nothing without an entry (flours.md). */
export const FlourSummary = ({ id }: { id: string }) => {
  const { t, locale } = useMessages();
  const entry = useFlourCatalog().entry(id);
  const summary = entry ? flourSummary(entry, t, locale) : '';
  return summary === '' ? null : <span className="text-[13px] text-muted">{summary}</span>;
};
