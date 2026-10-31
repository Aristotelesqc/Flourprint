import { useState } from 'react';
import type {
  Anchor,
  Formula,
  FormulaEdit,
  Process,
  ResolvedFormula,
} from '@flourprint/core/domain';
import { weighingGroups } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { NumberField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { Ui } from '../ui/library';
import { flourSummary } from '../services/flour-summary';
import { useFlourCatalog } from '../services/flours';
import { totalWaterKey } from './water-label';
import { WaterExplanation } from './WaterExplanation';
import { WeighingChecklist, type WeighedRow } from './WeighingChecklist';
import {
  AddFlour,
  AddIngredient,
  AddPreparation,
  PreparationFields,
  Hydration,
  type StructureEdit,
} from './FormulaEditors';
import { FermentationCard } from './Fermentation';
import { FermentationSummary } from './FermentationSummary';

export interface RecipeDocumentDisclosures {
  readonly flours: boolean;
  readonly preparations: boolean;
  readonly fermentation: boolean;
}

export interface RecipeDocumentProps {
  formula: Formula;
  resolved?: ResolvedFormula;
  process: Process;
  now: string;
  editable: boolean;
  fieldsMounted: boolean;
  onEdit: (edit: FormulaEdit) => boolean;
  onStructure: StructureEdit;
  onProcess: (process: Process) => boolean;
  weighed: readonly WeighedRow[];
  onToggleWeighed: (row: WeighedRow) => void;
  fermentationRef?: React.RefObject<HTMLDivElement | null>;
  hydrationRef?: React.RefObject<HTMLDivElement | null>;
  failureMessage?: string | undefined;
  onIngredientDetailsChange?: ((open: boolean) => void) | undefined;
  disclosures: RecipeDocumentDisclosures;
  onDisclosuresChange: (next: RecipeDocumentDisclosures) => void;
}

export const FlourSummary = ({ id }: { id: string }) => {
  const { t, locale } = useMessages();
  const entry = useFlourCatalog().entry(id);
  const summary = entry ? flourSummary(entry, t, locale) : '';
  return summary === '' ? null : (
    <span className="m3-type-metadata text-muted">{summary.replace(/\s+%/g, '\u00a0%')}</span>
  );
};

export const Enrichment = ({ resolved }: { resolved: ResolvedFormula }) => {
  const { t, pct, name } = useMessages();
  const { totalFat, totalSugar, totalFatPct, totalSugarPct } = resolved;
  if (!totalFat || !totalSugar || totalFatPct === undefined || totalSugarPct === undefined) {
    return null;
  }
  const unknown = [
    ...new Set([...totalFat.unknownContributors, ...totalSugar.unknownContributors]),
  ];
  if (Math.max(totalFatPct, totalSugarPct) < 0.5 && unknown.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 border-t border-line/60 pt-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t('formula.stat.fat')}</span>
          <span className="font-bold">{t(totalWaterKey(totalFat), { pct: pct(totalFatPct) })}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t('formula.stat.sugar')}</span>
          <span className="font-bold">
            {t(totalWaterKey(totalSugar), { pct: pct(totalSugarPct) })}
          </span>
        </div>
      </div>
      {unknown.length > 0 && (
        <p className="m-0 text-xs text-muted">
          {t('formula.enrichment.incomplete', { ingredients: unknown.map(name).join(', ') })}
        </p>
      )}
    </div>
  );
};

export const RecipeDocument = ({
  formula,
  resolved,
  process,
  now,
  editable,
  fieldsMounted,
  onEdit,
  onStructure,
  onProcess,
  weighed,
  onToggleWeighed,
  fermentationRef,
  hydrationRef,
  failureMessage,
  onIngredientDetailsChange,
  disclosures,
  onDisclosuresChange,
}: RecipeDocumentProps) => {
  const { t, grams, pct, wholePct, name, componentName } = useMessages();
  const [explaining, setExplaining] = useState(false);

  const anchor = formula.anchor;
  const rescale = (next: Anchor) => onEdit({ type: 'SetAnchor', mode: 'rescale', anchor: next });

  // A flour anchor is not a dough mass when the formula cannot be resolved.
  const displayDoughWeight =
    resolved?.doughWeight ?? (anchor.kind === 'doughWeight' ? anchor.grams : undefined);

  // Derive component group stats directly from core weighingGroups
  const groups = resolved ? weighingGroups(formula, resolved) : [];
  const componentStats = new Map<string, { flourPct: number | undefined; massPct: number }>();
  for (const group of groups) {
    if (group.stage.kind === 'component') {
      componentStats.set(group.stage.id, {
        flourPct: group.flourPct,
        massPct: group.massPct,
      });
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Compact Dough-First Summary Surface */}
      <Ui
        component="fp.surface"
        variant="surface"
        padding="normal"
        className="flex flex-col gap-3 rounded-2xl border border-line"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-ink">
            {t('recipe.document.summary')}
            <InfoButton topic="anchor" term={t('formula.quantity')} />
          </span>

          {/* Sizing choices in edit mode: doughWeight or pieces */}
          {fieldsMounted && (
            <div hidden={!editable} className="flex items-center gap-2">
              <button
                type="button"
                className={`fp-reset min-h-[48px] px-3 text-sm font-semibold rounded-lg ${
                  anchor.kind === 'doughWeight'
                    ? 'bg-accent text-on-accent'
                    : 'bg-muted/10 text-muted'
                }`}
                onClick={() =>
                  onEdit({ type: 'SetAnchor', mode: 'reinterpret', kind: 'doughWeight' })
                }
              >
                {t('formula.anchor.doughWeight')}
              </button>
              <button
                type="button"
                className={`fp-reset min-h-[48px] px-3 text-sm font-semibold rounded-lg ${
                  anchor.kind === 'pieces' ? 'bg-accent text-on-accent' : 'bg-muted/10 text-muted'
                }`}
                onClick={() =>
                  onEdit({ type: 'SetAnchor', mode: 'reinterpret', kind: 'pieces', count: 1 })
                }
              >
                {t('formula.anchor.pieces')}
              </button>
            </div>
          )}
        </div>

        {/* Key Metrics: Compact dough-first layout */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Dough & Pieces */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t('formula.stat.dough')}
            </span>
            <span className="text-2xl font-extrabold tabular-nums text-ink">
              {displayDoughWeight !== undefined
                ? grams(displayDoughWeight)
                : t('recipe.document.unresolvedGrams')}
            </span>

            {/* Pieces convention: pieces anchor uses actual count/gramsEach; non-pieces shows 1 piece */}
            {anchor.kind === 'pieces' ? (
              <span className="text-sm font-medium text-muted tabular-nums">
                {t('recipe.document.piecesSummary', {
                  count: anchor.count,
                  grams: grams(anchor.gramsEach),
                })}
              </span>
            ) : (
              displayDoughWeight !== undefined && (
                <span className="text-sm font-medium text-muted tabular-nums">
                  {t('recipe.document.piecesDisplayConvention', {
                    grams: grams(displayDoughWeight),
                  })}
                </span>
              )
            )}

            {/* Sizing inputs when editable */}
            {fieldsMounted && (
              <div hidden={!editable} className="flex flex-col gap-2 pt-1">
                {anchor.kind === 'pieces' ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">{t('formula.anchorField.count')}</span>
                      <NumberField
                        label={t('formula.anchorField.count')}
                        size="regular"
                        width="6.5rem"
                        value={anchor.count}
                        onCommit={(count) => rescale({ ...anchor, count })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">{t('formula.anchorField.gramsEach')}</span>
                      <NumberField
                        label={t('formula.anchorField.gramsEach')}
                        unit="g"
                        size="regular"
                        width="6.5rem"
                        value={anchor.gramsEach}
                        onCommit={(gramsEach) => rescale({ ...anchor, gramsEach })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs">{t('formula.anchorField.doughWeight')}</span>
                    <NumberField
                      label={t('formula.anchorField.doughWeight')}
                      unit="g"
                      width="6.5rem"
                      value={displayDoughWeight}
                      onCommit={(val) => rescale({ kind: 'doughWeight', grams: val })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hydration: single unified section */}
          <div className="flex flex-col gap-1">
            {/* Read view: plain text and small info button */}
            {!editable && resolved && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    {t('formula.stat.hydration')}
                    <button
                      type="button"
                      aria-label={t('formula.hydration.breakdown')}
                      className="fp-reset inline-flex min-h-[48px] min-w-[48px] items-center justify-center text-muted hover:text-ink"
                      onClick={() => setExplaining(true)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  </span>
                </div>
                <span className="text-2xl font-extrabold tabular-nums text-ink">
                  {t(totalWaterKey(resolved.totalWater), {
                    pct: wholePct(resolved.totalWaterPct),
                  })}
                </span>
              </div>
            )}

            {/* Edit view: Hydration control kept mounted once fieldsMounted */}
            {fieldsMounted && resolved && (
              <div hidden={!editable}>
                <Hydration
                  ref={hydrationRef}
                  formula={formula}
                  resolved={resolved}
                  onEdit={onEdit}
                  onExplain={() => setExplaining(true)}
                />
              </div>
            )}
          </div>
        </div>

        {resolved && <Enrichment resolved={resolved} />}
      </Ui>

      {/* Flours Accordion */}
      <Ui
        component="fp.disclosure"
        expanded={disclosures.flours}
        onExpandedChange={(expanded) => onDisclosuresChange({ ...disclosures, flours: expanded })}
        label={
          <span className="font-bold text-ink">
            {t('recipe.document.flours')}
            {resolved && (
              <span className="ml-2 font-normal text-muted tabular-nums">
                ({grams(resolved.flourTotal)})
              </span>
            )}
          </span>
        }
      >
        <div className="flex flex-col gap-2 pt-2">
          {formula.flours.map((flour) => (
            <div
              key={flour.id}
              className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line/50 py-2"
            >
              <div className="flex min-w-0 flex-1 basis-32 flex-col">
                <span className="break-words font-semibold text-ink">{name(flour.id)}</span>
                <FlourSummary id={flour.id} />
                {fieldsMounted && editable && formula.flours.length > 1 && (
                  <button
                    type="button"
                    className="fp-reset min-h-[48px] self-start text-xs text-alert underline"
                    onClick={() =>
                      onEdit({
                        type: 'SetFlourBlend',
                        flours: formula.flours.filter((f) => f.id !== flour.id),
                      })
                    }
                  >
                    {t('formula.remove')}
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 ml-auto">
                {fieldsMounted && (
                  <div hidden={!editable} className="flex items-center gap-1.5">
                    <NumberField
                      label={`${name(flour.id)}, %`}
                      unit="%"
                      width="4.5rem"
                      value={flour.sharePct}
                      onCommit={(sharePct) =>
                        onEdit({
                          type: 'SetFlourBlend',
                          flours: formula.flours.map((f) =>
                            f.id === flour.id ? { ...f, sharePct } : f,
                          ),
                        })
                      }
                    />
                    {resolved && (
                      <NumberField
                        label={`${name(flour.id)}, g`}
                        unit="g"
                        width="5.5rem"
                        value={resolved.flourByFlour[flour.id] ?? 0}
                        onCommit={(val) =>
                          onEdit({
                            type: 'SetIngredientGrams',
                            ingredient: flour.id,
                            grams: val,
                          })
                        }
                      />
                    )}
                  </div>
                )}

                {!editable && (
                  <>
                    <span className="text-right text-xs text-muted tabular-nums">
                      {pct(flour.sharePct)}
                    </span>
                    <span className="min-w-[64px] text-right font-bold tabular-nums">
                      {resolved ? grams(resolved.flourByFlour[flour.id] ?? 0) : '—'}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}

          {fieldsMounted && (
            <div hidden={!editable} className="pt-2">
              <AddFlour formula={formula} onEdit={onEdit} />
            </div>
          )}
        </div>
      </Ui>

      {/* Pre-doughs Accordion */}
      {(editable || formula.components.length > 0) && (
        <Ui
          component="fp.disclosure"
          expanded={disclosures.preparations}
          onExpandedChange={(expanded) =>
            onDisclosuresChange({ ...disclosures, preparations: expanded })
          }
          label={<span className="font-bold text-ink">{t('recipe.document.preparations')}</span>}
        >
          <div className="flex flex-col gap-3 pt-2">
            {formula.components.map((component) => {
              const c = resolved?.components[component.id];
              const stats = componentStats.get(component.id);
              return (
                <div
                  key={component.id}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">
                      {componentName(formula, component)}
                    </span>
                    <div className="flex items-baseline gap-2 tabular-nums">
                      {stats?.flourPct !== undefined && (
                        <span className="text-xs text-muted">
                          {t('recipe.document.componentFlourShare', {
                            pct: pct(stats.flourPct),
                          })}
                        </span>
                      )}
                      {stats?.massPct !== undefined && (
                        <span className="text-xs text-muted">
                          {t('recipe.document.componentMassShare', {
                            pct: pct(stats.massPct),
                          })}
                        </span>
                      )}
                      <span className="font-bold">{c ? grams(c.mass) : '—'}</span>
                    </div>
                  </div>

                  {fieldsMounted && (
                    <div hidden={!editable}>
                      <PreparationFields
                        formula={formula}
                        process={process}
                        componentId={component.id}
                        onEdit={onEdit}
                        onStructure={onStructure}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {fieldsMounted && (
              <div hidden={!editable}>
                <AddPreparation formula={formula} process={process} onStructure={onStructure} />
              </div>
            )}
          </div>
        </Ui>
      )}

      {/* Ingredients: Weighing checklist or unresolvable whole-recipe fallback */}
      {resolved ? (
        <WeighingChecklist
          formula={formula}
          resolved={resolved}
          weighed={weighed}
          onToggle={onToggleWeighed}
          editable={editable}
          fieldsMounted={fieldsMounted}
          onEdit={onEdit}
          failureMessage={failureMessage}
          onIngredientDetailsChange={onIngredientDetailsChange}
        />
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-line p-3">
          <p role="status" className="m-0 text-sm text-muted">
            {t('formula.unresolved')}
          </p>
          <span className="font-bold text-ink">{t('formula.group.ingredients')}</span>
          <div className="flex flex-col gap-2">
            {formula.ingredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line/50 py-2"
              >
                <div className="flex min-w-0 flex-1 basis-32 flex-col">
                  <span className="break-words font-semibold text-ink">{name(ingredient.id)}</span>
                  {fieldsMounted && editable && (
                    <button
                      type="button"
                      className="fp-reset min-h-[48px] self-start text-xs text-alert underline"
                      onClick={() =>
                        onEdit({
                          type: 'RemoveIngredient',
                          ingredient: ingredient.id,
                        })
                      }
                    >
                      {t('formula.remove')}
                    </button>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2 ml-auto">
                  {fieldsMounted && (
                    <div hidden={!editable} className="flex items-center gap-1.5">
                      <NumberField
                        label={`${name(ingredient.id)}, %`}
                        unit="%"
                        width="4.5rem"
                        value={ingredient.bakerPct}
                        onCommit={(bakerPct) =>
                          onEdit({
                            type: 'SetBakerPct',
                            ingredient: ingredient.id,
                            pct: bakerPct,
                          })
                        }
                      />
                    </div>
                  )}

                  {!editable && (
                    <span className="text-right text-xs text-muted tabular-nums">
                      {pct(ingredient.bakerPct)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fieldsMounted && !resolved && (
        <div hidden={!editable}>
          <AddIngredient formula={formula} onEdit={onEdit} />
        </div>
      )}

      {/* Fermentation Section */}
      <div
        ref={fermentationRef}
        role="region"
        aria-label={t('fermentation.title')}
        tabIndex={-1}
        onFocusCapture={(event) => {
          if (event.target === event.currentTarget && !disclosures.fermentation) {
            onDisclosuresChange({ ...disclosures, fermentation: true });
          }
        }}
        className="outline-none"
      >
        <Ui
          component="fp.disclosure"
          expanded={disclosures.fermentation}
          onExpandedChange={(expanded) =>
            onDisclosuresChange({ ...disclosures, fermentation: expanded })
          }
          label={<span className="font-bold text-ink">{t('recipe.document.fermentation')}</span>}
        >
          <div className="pt-2">
            {!editable && <FermentationSummary formula={formula} process={process} />}
            {fieldsMounted && (
              <div hidden={!editable}>
                <FermentationCard
                  formula={formula}
                  process={process}
                  now={now}
                  onEdit={onEdit}
                  onProcess={onProcess}
                />
              </div>
            )}
          </div>
        </Ui>
      </div>

      {/* Water Explanation Dialog/Sheet */}
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
