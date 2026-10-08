import { useState, type ReactNode } from 'react';
import type { Anchor, Formula, FormulaEdit, ResolvedFormula } from '@flourprint/core/domain';
import { editableNumber } from '../i18n/numbers';
import { useMessages } from '../i18n/use-messages';
import { NumberField } from '../ui/Field';
import { Card, Rows, SectionTitle } from '../ui/Layout';
import { Segmented } from '../ui/Segmented';
import { WaterExplanation } from './WaterExplanation';

interface Props {
  readonly formula: Formula;
  readonly resolved: ResolvedFormula;
  readonly onEdit: (edit: FormulaEdit) => void;
}

const ROW = 'grid grid-cols-[1fr_88px_104px] items-center gap-2';

/**
 * Formula tab of the #8 mockups: quantity and key figures first, then flours, ingredients,
 * preparations and the final mix to weigh. Every number comes from the engine (#19).
 */
export const FormulaSection = ({ formula, resolved, onEdit }: Props) => {
  const { t, grams, pct, name, locale } = useMessages();
  const [explaining, setExplaining] = useState(false);
  const [weighed, setWeighed] = useState<ReadonlySet<string>>(new Set());
  const anchor = formula.anchor;

  const rescale = (next: Anchor) => onEdit({ type: 'SetAnchor', mode: 'rescale', anchor: next });

  const finalMix: [string, number][] = [
    ...Object.entries(resolved.finalMix.componentMasses),
    ...Object.entries(resolved.finalMix.flourByFlour),
    ['water', resolved.finalMix.water],
    ...Object.entries(resolved.finalMix.grams),
  ];

  return (
    <div className="flex flex-col gap-5 pb-6">
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
                onEdit({
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
          <Stat label={t('formula.stat.hydration')} value={pct(resolved.pureWaterPct)} />
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
              {grams(resolved.totalWater.value)}
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
                <span>{editableNumber((100 * flourGrams) / resolved.flourTotal, locale)}</span>
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
          {formula.ingredients.map((ingredient) => (
            <div key={ingredient.id} className={`${ROW} min-h-[60px] px-3`}>
              <span className="font-semibold">{name(ingredient.id)}</span>
              <NumberField
                label={`${name(ingredient.id)} %`}
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
          ))}
        </Rows>
      </section>

      {formula.components.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>{t('formula.preparations')}</SectionTitle>
          {formula.components.map((component) => {
            const c = resolved.components[component.id];
            if (!c) return null;
            const others = c.mass - c.flour - c.water;
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
                  <span className="text-[19px] font-semibold">{name(component.id)}</span>
                  <span className="text-lg font-bold">{grams(c.mass)}</span>
                </div>
                <span className="text-[15px]">{params.join(' · ')}</span>
                <span className="text-sm text-muted">
                  {t('formula.component.detail', {
                    flour: grams(c.flour),
                    water: grams(c.water),
                    others: others > 0.05 ? grams(others) : 'none',
                  })}
                </span>
              </Card>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <SectionTitle>{t('formula.finalMix')}</SectionTitle>
          <span className="px-1 text-[13px] text-muted">
            {t('formula.finalMix.progress', {
              done: finalMix.filter(([id]) => weighed.has(id)).length,
              total: finalMix.length,
            })}
          </span>
        </div>
        <Rows>
          {finalMix.map(([id, g]) => {
            const done = weighed.has(id);
            return (
              <label
                key={id}
                className={`flex min-h-[52px] items-center gap-3 px-4 ${done ? 'text-muted line-through' : ''}`}
              >
                <input
                  type="checkbox"
                  className="size-[22px] accent-[var(--color-accent)]"
                  checked={done}
                  onChange={() => {
                    const next = new Set(weighed);
                    if (done) next.delete(id);
                    else next.add(id);
                    setWeighed(next);
                  }}
                />
                <span className="flex-1">{name(id)}</span>
                <span className="font-bold">{grams(g)}</span>
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
