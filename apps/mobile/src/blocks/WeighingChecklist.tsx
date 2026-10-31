import { useEffect, useId, useState } from 'react';
import {
  sameWeighingRow,
  weighingGroups,
  type Formula,
  type FormulaEdit,
  type ResolvedFormula,
  type StageRef,
  type WeighingItem as CoreWeighingItem,
  type WeighingRow,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';
import { SectionTitle } from '../ui/Layout';
import { Ui } from '../ui/library';
import { NumberField } from '../ui/Field';
import { AddIngredient } from './FormulaEditors';

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
  readonly editable?: boolean;
  readonly fieldsMounted?: boolean;
  readonly onEdit?: (edit: FormulaEdit) => boolean;
  readonly onEditIngredient?: (id: string) => void;
  readonly failureMessage?: string | undefined;
  readonly onIngredientDetailsChange?: ((open: boolean) => void) | undefined;
}

export const WeighingChecklist = ({
  formula,
  resolved,
  weighed,
  onToggle,
  editable = false,
  fieldsMounted = false,
  onEdit,
  onEditIngredient,
  failureMessage,
  onIngredientDetailsChange,
}: Props) => {
  const { t, grams, pct, name, componentName } = useMessages();
  const detailErrorId = useId();
  const checklistId = useId();
  const [sheetIngredientId, setSheetIngredientId] = useState<string | null>(null);
  const isDetailSheetOpen = sheetIngredientId !== null;

  useEffect(() => {
    onIngredientDetailsChange?.(isDetailSheetOpen);
    return () => onIngredientDetailsChange?.(false);
  }, [isDetailSheetOpen, onIngredientDetailsChange]);

  const doughWaters = formula.ingredients.filter((i) => i.kind === 'water' && i.role === 'dough');
  const singleDoughWater = doughWaters.length === 1 ? doughWaters[0] : undefined;
  const lockedWaterId = formula.waterTarget?.absorbInto;
  const groups = weighingGroups(formula, resolved);

  const listedIngredientIds = new Set(
    groups.flatMap((g) => g.rows.flatMap((r) => (r.item.kind === 'ingredient' ? [r.item.id] : []))),
  );
  const unlistedStandardIngredients = formula.ingredients.filter(
    (i) => i.kind !== 'water' && !listedIngredientIds.has(i.id),
  );

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

  const activeSheetIngredient = sheetIngredientId
    ? formula.ingredients.find((i) => i.id === sheetIngredientId)
    : undefined;

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
                  <span className="text-[11px]">{t('recipe.document.stageBakerPct')}</span>
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
                {group.rows.map((row, rowIndex) => {
                  const done = isChecked(row);
                  const itemKey = row.item.kind === 'water' ? 'water' : `ingredient:${row.item.id}`;
                  const rowKey = `${groupKey}:${itemKey}`;
                  const label = getItemLabel(row.item);
                  const isWater = row.item.kind === 'water';
                  const resolvedIngredientId = isWater ? singleDoughWater?.id : row.item.id;
                  const isLockedWater =
                    resolvedIngredientId && resolvedIngredientId === lockedWaterId;

                  // Stage edits: component/final non-finishing only, not locked water, and pooled water is read-only if multiple waters
                  const canEditStageGrams =
                    Boolean(onEdit) &&
                    group.stage.kind !== 'finishing' &&
                    (!isWater || singleDoughWater !== undefined) &&
                    !isLockedWater &&
                    Boolean(resolvedIngredientId);

                  // Ingredient detail eligibility: dough waters or standard ingredients
                  const hasDetailAction = !isWater || doughWaters.length > 0;

                  const labelId = `${checklistId}-label-${groupKey}-${rowIndex}`;
                  const pctId = `${checklistId}-pct-${groupKey}-${rowIndex}`;
                  const gramsId = `${checklistId}-grams-${groupKey}-${rowIndex}`;
                  const labelledBy = !editable
                    ? `${labelId} ${gramsId} ${pctId}`
                    : `${labelId} ${pctId}`;

                  return (
                    <div
                      key={rowKey}
                      className={`flex min-h-[48px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 ${
                        done ? 'text-muted line-through bg-muted/5' : ''
                      }`}
                    >
                      {/* Separate accessible checkbox hit target; no nested input controls */}
                      <div className="flex min-h-[48px] min-w-0 flex-1 basis-32 items-center gap-3">
                        <input
                          id={`check-${rowKey}`}
                          type="checkbox"
                          className="size-[22px] shrink-0 accent-[var(--color-accent)]"
                          checked={done}
                          aria-labelledby={labelledBy}
                          onChange={() => onToggle({ stage: row.stage, item: row.item })}
                        />
                        <label
                          id={labelId}
                          htmlFor={`check-${rowKey}`}
                          className="flex-1 min-w-0 cursor-pointer break-words font-medium"
                        >
                          {label}
                        </label>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 ml-auto">
                        {/* Stage Baker % */}
                        <span id={pctId} className="text-xs text-muted tabular-nums">
                          {pct(row.bakerPct)}
                        </span>

                        {/* Plain read-only grams */}
                        {!editable && (
                          <span
                            id={gramsId}
                            className="min-w-[56px] text-right font-semibold tabular-nums"
                          >
                            {grams(row.grams)}
                          </span>
                        )}

                        {/* Editable controls kept mounted when fieldsMounted */}
                        {fieldsMounted && (
                          <div hidden={!editable} className="flex items-center gap-1.5">
                            {canEditStageGrams && resolvedIngredientId ? (
                              <NumberField
                                label={`${label}, ${stageTitle}`}
                                unit="g"
                                width="5.5rem"
                                value={row.grams}
                                describedBy={
                                  failureMessage !== undefined ? 'recipe-formula-error' : undefined
                                }
                                onCommit={(val) => {
                                  if (!onEdit || group.stage.kind === 'finishing') return false;
                                  return onEdit({
                                    type: 'SetStageIngredientGrams',
                                    ingredient: resolvedIngredientId,
                                    stage: group.stage,
                                    grams: val,
                                  });
                                }}
                              />
                            ) : (
                              <span
                                className="min-w-[5.5rem] text-right font-semibold tabular-nums text-muted"
                                title={
                                  isLockedWater
                                    ? t('recipe.document.lockedWaterNotice')
                                    : isWater && doughWaters.length > 1
                                      ? t('recipe.document.pooledWaterNotice')
                                      : undefined
                                }
                              >
                                {grams(row.grams)}
                              </span>
                            )}

                            {/* Detail button for whole-recipe editing: neutral pencil icon */}
                            {hasDetailAction && (
                              <button
                                type="button"
                                aria-label={t('recipe.document.editIngredient')}
                                className="fp-reset inline-flex min-h-[48px] min-w-[48px] items-center justify-center text-muted hover:text-ink"
                                onClick={() => {
                                  if (isWater) {
                                    if (singleDoughWater) {
                                      setSheetIngredientId(singleDoughWater.id);
                                    } else if (doughWaters.length > 0) {
                                      setSheetIngredientId(doughWaters[0]?.id ?? null);
                                    }
                                    return;
                                  }
                                  if (row.item.kind !== 'ingredient') return;
                                  if (onEditIngredient) {
                                    onEditIngredient(row.item.id);
                                  } else {
                                    setSheetIngredientId(row.item.id);
                                  }
                                }}
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
                                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Ui>
            </div>
          );
        })}
      </div>

      {fieldsMounted && unlistedStandardIngredients.length > 0 && (
        <div hidden={!editable} className="flex flex-col gap-1.5">
          <span className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {t('recipe.document.unlistedIngredients')}
          </span>
          <Ui
            component="fp.surface"
            variant="outlined"
            padding="none"
            className="overflow-hidden rounded-2xl divide-y divide-line"
          >
            {unlistedStandardIngredients.map((ingredient) => {
              const ingredientName = name(ingredient.id);
              return (
                <div
                  key={`unlisted:${ingredient.id}`}
                  className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2"
                >
                  <span className="font-medium">{ingredientName}</span>
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    onClick={() => {
                      if (onEditIngredient) {
                        onEditIngredient(ingredient.id);
                      } else {
                        setSheetIngredientId(ingredient.id);
                      }
                    }}
                  >
                    {t('recipe.document.setIngredient', { name: ingredientName })}
                  </Ui>
                </div>
              );
            })}
          </Ui>
        </div>
      )}

      {fieldsMounted && editable && onEdit && (
        <div className="pt-2">
          <AddIngredient formula={formula} onEdit={onEdit} />
        </div>
      )}

      {/* Detail sheet for entire-recipe ingredient edits */}
      {activeSheetIngredient && (
        <Ui
          component="fp.bottom-sheet"
          isOpen={isDetailSheetOpen}
          title={t('recipe.document.detailTitle', { name: name(activeSheetIngredient.id) })}
          closeLabel={t('recipe.document.closeDetail')}
          onDismiss={() => setSheetIngredientId(null)}
        >
          <div className="flex flex-col gap-4 p-4">
            {failureMessage && (
              <p id={detailErrorId} role="alert" className="m-0 text-sm text-alert">
                {failureMessage}
              </p>
            )}
            {/* Water selection picker when multiple waters exist */}
            {activeSheetIngredient.kind === 'water' && doughWaters.length > 1 && (
              <div className="flex flex-col gap-1">
                <Ui
                  component="fp.select"
                  label={t('recipe.document.selectWaterIngredient')}
                  value={activeSheetIngredient.id}
                  cancelText={t('formula.add.cancel')}
                  okText={t('recipe.document.closeDetail')}
                  options={doughWaters.map((w) => ({
                    id: w.id,
                    label: name(w.id),
                  }))}
                  onValueChange={(nextId: string) => setSheetIngredientId(nextId)}
                />
                <span className="text-xs text-muted">{t('recipe.document.pooledWaterNotice')}</span>
              </div>
            )}

            {/* Whole-recipe Baker % */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {t('recipe.document.wholeRecipeBakerPct')}
              </span>
              <NumberField
                label={t('recipe.document.wholeRecipeBakerPct')}
                unit="%"
                width="7rem"
                value={activeSheetIngredient.bakerPct}
                describedBy={failureMessage !== undefined ? detailErrorId : undefined}
                onCommit={(val) => {
                  if (!onEdit) return false;
                  return onEdit({
                    type: 'SetBakerPct',
                    ingredient: activeSheetIngredient.id,
                    pct: val,
                  });
                }}
              />
            </div>

            {/* Whole-recipe Grams */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{t('recipe.document.wholeRecipeGrams')}</span>
              <NumberField
                label={t('recipe.document.wholeRecipeGrams')}
                unit="g"
                width="7rem"
                value={resolved.grams[activeSheetIngredient.id] ?? 0}
                describedBy={failureMessage !== undefined ? detailErrorId : undefined}
                onCommit={(val) => {
                  if (!onEdit) return false;
                  return onEdit({
                    type: 'SetIngredientGrams',
                    ingredient: activeSheetIngredient.id,
                    grams: val,
                  });
                }}
              />
            </div>

            {/* Remove control for non-water ingredients or when multiple ingredients remain */}
            {activeSheetIngredient.kind !== 'water' && formula.ingredients.length > 1 && (
              <button
                type="button"
                className="fp-reset min-h-[48px] self-start font-semibold text-alert underline"
                onClick={() => {
                  if (onEdit) {
                    onEdit({
                      type: 'RemoveIngredient',
                      ingredient: activeSheetIngredient.id,
                    });
                  }
                  setSheetIngredientId(null);
                }}
              >
                {t('recipe.document.removeIngredient')}
              </button>
            )}
          </div>
        </Ui>
      )}
    </section>
  );
};
