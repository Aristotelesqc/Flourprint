import { IonNote } from '@ionic/react';
import { useState, type ReactNode } from 'react';
import type { Formula, FormulaEdit, ResolvedFormula } from '@flourprint/core/domain';
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
  const { t, grams, pct } = useMessages();
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
          <Row key={id} label={id} pct={pct((100 * flourGrams) / resolved.flourTotal)}>
            <NumberField
              label={id}
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
            label={ingredient.id}
            pct={
              <NumberField
                label={`${ingredient.id} %`}
                unit="%"
                value={ingredient.bakerPct}
                onCommit={(value) =>
                  onEdit({ type: 'SetBakerPct', ingredient: ingredient.id, pct: value })
                }
              />
            }
          >
            <NumberField
              label={ingredient.id}
              unit="g"
              value={resolved.grams[ingredient.id] ?? 0}
              onCommit={(value) =>
                onEdit({ type: 'SetIngredientGrams', ingredient: ingredient.id, grams: value })
              }
            />
          </Row>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1">
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
            className="min-h-[var(--spacing-touch)] text-[var(--color-crust)] underline decoration-dotted"
            onClick={() => setExplaining(true)}
          >
            {grams(resolved.totalWater.value)} · {pct(resolved.totalWaterPct)}
          </button>
        </dd>
      </dl>
      {resolved.totalWater.completeness === 'incomplete' && (
        <IonNote>
          {t('formula.water.incomplete', {
            ingredients: resolved.totalWater.unknownContributors.join(', '),
          })}
        </IonNote>
      )}

      {Object.keys(resolved.components).length > 0 && (
        <section className="mt-4">
          <h2 className="font-semibold">{t('formula.components')}</h2>
          {Object.entries(resolved.components).map(([id, c]) => (
            <p key={id}>
              {id}: {grams(c.flour)} + {grams(c.water)} → {grams(c.mass)}
            </p>
          ))}
          <h2 className="mt-2 font-semibold">{t('formula.finalMix')}</h2>
          <p>
            {[
              ...Object.entries(resolved.finalMix.flourByFlour),
              ['water', resolved.finalMix.water] as const,
              ...Object.entries(resolved.finalMix.grams),
              ...Object.entries(resolved.finalMix.componentMasses),
            ]
              .map(([id, g]) => `${id} ${grams(g)}`)
              .join(' · ')}
          </p>
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

const Row = ({ label, pct, children }: { label: string; pct: ReactNode; children: ReactNode }) => (
  <>
    <span>{label}</span>
    <span className="text-right">{pct}</span>
    <span>{children}</span>
  </>
);
