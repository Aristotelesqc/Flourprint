import { IonNote } from '@ionic/react';
import { useState, type ReactNode } from 'react';
import type { Formula, FormulaEdit, ResolvedFormula } from '@flourprint/core/domain';
import { editableNumber } from '../i18n/numbers';
import { useMessages } from '../i18n/use-messages';
import { NumberField } from './NumberField';
import { WaterExplanation } from './WaterExplanation';

interface Props {
  readonly formula: Formula;
  readonly resolved: ResolvedFormula;
  readonly onEdit: (edit: FormulaEdit) => void;
}

/** Formula table, totals and explanations; every number comes from the engine (#8, #19). */
export const FormulaSection = ({ formula, resolved, onEdit }: Props) => {
  const { t, grams, pct, name, locale } = useMessages();
  const [explaining, setExplaining] = useState(false);
  const anchor = formula.anchor;
  const anchorText =
    anchor.kind === 'pieces'
      ? t('formula.anchor.pieces', { count: anchor.count, grams: grams(anchor.gramsEach) })
      : t(`formula.anchor.${anchor.kind}`, { grams: grams(anchor.grams) });

  return (
    <>
      <p className="mb-3 text-[var(--color-muted)]">{anchorText}</p>
      <div className="grid grid-cols-[1fr_7rem_7rem] items-center gap-x-2">
        <span className="font-semibold">{t('formula.column.ingredient')}</span>
        <span className="text-right font-semibold">{t('formula.column.bakerPct')}</span>
        <span className="text-right font-semibold">{t('formula.column.grams')}</span>
        {Object.entries(resolved.flourByFlour).map(([id, flourGrams]) => (
          <Row
            key={id}
            label={name(id)}
            pct={
              <Calculated
                value={editableNumber((100 * flourGrams) / resolved.flourTotal, locale)}
                unit="%"
              />
            }
          >
            <NumberField
              label={name(id)}
              unit="g"
              value={flourGrams}
              onCommit={(value) =>
                onEdit({ type: 'SetIngredientGrams', ingredient: id, grams: value })
              }
            />
          </Row>
        ))}
        {formula.ingredients.map((ingredient) => (
          <Row
            key={ingredient.id}
            label={name(ingredient.id)}
            pct={
              <NumberField
                label={`${name(ingredient.id)} %`}
                unit="%"
                value={ingredient.bakerPct}
                onCommit={(value) =>
                  onEdit({ type: 'SetBakerPct', ingredient: ingredient.id, pct: value })
                }
              />
            }
          >
            <NumberField
              label={name(ingredient.id)}
              unit="g"
              value={resolved.grams[ingredient.id] ?? 0}
              onCommit={(value) =>
                onEdit({ type: 'SetIngredientGrams', ingredient: ingredient.id, grams: value })
              }
            />
          </Row>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-[1fr_auto] items-center gap-y-1">
        <dt>{t('formula.total.flour')}</dt>
        <dd className="text-right">{grams(resolved.flourTotal)}</dd>
        <dt>{t('formula.total.dough')}</dt>
        <dd className="text-right">{grams(resolved.doughWeight)}</dd>
        <dt>{t('formula.total.pureWater')}</dt>
        <dd className="text-right">
          {grams(resolved.pureWaterTotal)} · {pct(resolved.pureWaterPct)}
        </dd>
        <dt>{t('formula.total.water')}</dt>
        <dd className="text-right">
          <button
            type="button"
            className="min-h-[var(--spacing-touch)] border-0 bg-transparent p-0 text-[var(--color-crust)] underline decoration-dotted underline-offset-4"
            onClick={() => setExplaining(true)}
          >
            {grams(resolved.totalWater.value)} · {pct(resolved.totalWaterPct)}
          </button>
        </dd>
      </dl>
      {resolved.totalWater.completeness === 'incomplete' && (
        <IonNote>
          {t('formula.water.incomplete', {
            ingredients: resolved.totalWater.unknownContributors.map(name).join(', '),
          })}
        </IonNote>
      )}

      {Object.keys(resolved.components).length > 0 && (
        <section className="mt-4">
          <h2 className="font-semibold">{t('formula.components')}</h2>
          <ul className="mt-1 list-none pl-0">
            {Object.entries(resolved.components).map(([id, c]) => {
              const others = c.mass - c.flour - c.water;
              return (
                <li key={id} className="flex items-baseline justify-between gap-4 py-1">
                  <span>
                    {name(id)}
                    <span className="block text-sm text-[var(--color-muted)]">
                      {t('formula.component.detail', {
                        flour: grams(c.flour),
                        water: grams(c.water),
                        others: others > 0.05 ? grams(others) : 'none',
                      })}
                    </span>
                  </span>
                  <span>{grams(c.mass)}</span>
                </li>
              );
            })}
          </ul>
          <h2 className="mt-4 font-semibold">{t('formula.finalMix')}</h2>
          <ul className="mt-1 list-none pl-0">
            {[
              ...Object.entries(resolved.finalMix.flourByFlour),
              ['water', resolved.finalMix.water] as const,
              ...Object.entries(resolved.finalMix.grams),
              ...Object.entries(resolved.finalMix.componentMasses),
            ].map(([id, g]) => (
              <li key={id} className="flex justify-between gap-4 py-1">
                <span>{name(id)}</span>
                <span>{grams(g)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <WaterExplanation
        resolved={resolved}
        open={explaining}
        onClose={() => setExplaining(false)}
      />
    </>
  );
};

/** A calculated value laid out like a NumberField, without the underline of editable values. */
const Calculated = ({ value, unit }: { value: string; unit: string }) => (
  <span className="flex min-h-[var(--spacing-touch)] items-center justify-end gap-2">
    <span>{value}</span>
    <span className="text-[var(--color-muted)]">{unit}</span>
  </span>
);

const Row = ({ label, pct, children }: { label: string; pct: ReactNode; children: ReactNode }) => (
  <>
    <span>{label}</span>
    <span className="text-right">{pct}</span>
    <span>{children}</span>
  </>
);
