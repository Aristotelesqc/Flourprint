import { useState, type ReactNode } from 'react';
import {
  sum,
  hydrationForRatio,
  liquidMassRatio,
  liquidRatioPct,
  hydrationForLiquidRatio,
  componentStyle,
  newComponent,
  type Formula,
  type ResolvedFormula,
  type Ingredient,
  type Component,
  type StageRef,
  INGREDIENT_PRESETS,
} from '@flourprint/core/domain';
import { Button, IconButton, NumberField, Surface, Disclosure, Modal, CompactDialog } from './ui';
import { IngredientRow, RecipeSummary } from './components';
import {
  grams,
  num,
  percent,
  colon,
  t,
  ingredientName,
  componentName,
  type Locale,
} from './messages';
import { recipeCopy } from './recipe-copy';
import { defaultsCopy, extractFormulaErrorReason, formatEngineReason } from './defaults-copy';
import { loadComponentDefaults } from './component-defaults';
import { type Prototype, type Content } from './model';

export interface WeighRow {
  key: string;
  id: string;
  grams: number;
  pct: number;
  name: string;
  note?: string;
}

export function componentDisplayName(
  locale: Locale,
  formula: Formula,
  component: Component,
  names: Record<string, string> = {},
): string {
  const style = componentStyle(formula, component);
  return componentName(locale, component.id, names, style);
}

export function groupsOf(
  content: Content,
  resolved: ResolvedFormula,
  normalized: ResolvedFormula,
  locale: Locale,
) {
  const groups: {
    id: string;
    title: string;
    mass: number;
    pct?: number;
    share?: number;
    rows: WeighRow[];
  }[] = [];
  for (const component of content.formula.components) {
    const r = resolved.components[component.id],
      n = normalized.components[component.id];
    if (!r || !n) continue;
    const rows: WeighRow[] = Object.entries(r.flourByFlour)
      .filter(([, v]) => v > 0)
      .map(([id, value]) => ({
        key: `${component.id}:${id}`,
        id,
        grams: value,
        pct: n.flourByFlour[id],
        name: ingredientName(locale, id, content.names),
      }));
    if (r.water > 0)
      rows.push({
        key: `${component.id}:water`,
        id: 'water',
        grams: r.water,
        pct: n.water,
        name: t(locale, 'water'),
      });
    for (const [id, value] of Object.entries(r.allocations))
      if (value > 0)
        rows.push({
          key: `${component.id}:${id}`,
          id,
          grams: value,
          pct: n.allocations[id],
          name: ingredientName(locale, id, content.names),
        });
    const compTitle = componentDisplayName(locale, content.formula, component, content.names);
    groups.push({
      id: component.id,
      title: compTitle,
      mass: r.mass,
      pct: n.mass,
      share: component.flourPct,
      rows,
    });
  }
  const rows: WeighRow[] = Object.entries(resolved.finalMix.flourByFlour)
    .filter(([, v]) => v > 0)
    .map(([id, value]) => ({
      key: `final:${id}`,
      id,
      grams: value,
      pct: normalized.finalMix.flourByFlour[id],
      name: ingredientName(locale, id, content.names),
    }));
  if (resolved.finalMix.water > 0)
    rows.push({
      key: 'final:water',
      id: 'water',
      grams: resolved.finalMix.water,
      pct: normalized.finalMix.water,
      name: t(locale, 'water'),
    });
  for (const ingredient of content.formula.ingredients)
    if (ingredient.kind !== 'water' && ingredient.role === 'dough') {
      const value = resolved.finalMix.grams[ingredient.id];
      if (value > 0)
        rows.push({
          key: `final:${ingredient.id}`,
          id: ingredient.id,
          grams: value,
          pct: normalized.finalMix.grams[ingredient.id],
          name: ingredientName(locale, ingredient.id, content.names),
          ...(ingredient.water?.status === 'unknown' || !ingredient.water
            ? { note: t(locale, 'incomplete') }
            : {}),
        });
    }
  // The domain computes the final additions; their displayed mass uses a resolved formula with
  // components removed and the domain's remaining quantities, never a second UI solver.
  groups.push({
    id: 'final',
    title: t(locale, 'additions'),
    mass: sum(rows.map((row) => row.grams)),
    rows,
  });
  return groups;
}

export function Summary({
  content,
  resolved,
  locale,
  editor,
  onHelp,
  onSizeHelp,
  onFatHelp,
  onSugarHelp,
  onNotice,
}: {
  editor?: ReactNode;
  content: Content;
  resolved: ResolvedFormula;
  locale: Locale;
  onHelp: () => void;
  onSizeHelp?: () => void;
  onFatHelp?: () => void;
  onSugarHelp?: () => void;
  onNotice?: () => void;
}) {
  const partial = resolved.totalWater.completeness === 'incomplete';
  const formula = content.formula;
  const piecesDetail =
    formula.anchor.kind === 'pieces'
      ? `${formula.anchor.count} ${recipeCopy(locale, formula.anchor.count > 1 ? 'pieces' : 'piece')} × ${grams(locale, formula.anchor.gramsEach)}`
      : `1 ${recipeCopy(locale, 'piece')} × ${grams(locale, resolved.doughWeight)}`;

  const metrics = [
    {
      label: t(locale, 'doughShort'),
      value: grams(locale, resolved.doughWeight),
      icon: 'scale' as const,
      detail: piecesDetail,
      onHelp: onSizeHelp,
      helpLabel: `${t(locale, 'help')} · ${t(locale, 'size')}`,
    },
    {
      label: t(locale, 'hydration'),
      value: `${partial ? '≥ ' : ''}${percent(locale, resolved.totalWaterPct, 0)}`,
      icon: 'water' as const,
      detail: `${grams(locale, resolved.totalWater.value)} ${t(locale, 'water').toLocaleLowerCase()} ${partial ? `(${t(locale, 'known').toLocaleLowerCase()})` : ''}`,
      onHelp: onHelp,
      helpLabel: t(locale, 'hydrationDetails'),
    },
    {
      label: t(locale, 'fat'),
      value:
        resolved.totalFatPct === undefined
          ? t(locale, 'unknown')
          : `${resolved.totalFat?.completeness === 'incomplete' ? '≥ ' : ''}${percent(locale, resolved.totalFatPct, 0)}`,
      icon: 'fat' as const,
      detail:
        resolved.totalFat?.completeness === 'incomplete'
          ? `${grams(locale, resolved.totalFat.value)} · ${t(locale, 'known')}`
          : resolved.totalFat
            ? `${grams(locale, resolved.totalFat.value)}`
            : t(locale, 'unknown'),
      onHelp: onFatHelp,
      helpLabel: t(locale, 'fat'),
    },
    {
      label: t(locale, 'sugar'),
      value:
        resolved.totalSugarPct === undefined
          ? t(locale, 'unknown')
          : `${resolved.totalSugar?.completeness === 'incomplete' ? '≥ ' : ''}${percent(locale, resolved.totalSugarPct, 0)}`,
      icon: 'sugar' as const,
      detail:
        resolved.totalSugar?.completeness === 'incomplete'
          ? `${grams(locale, resolved.totalSugar.value)} · ${t(locale, 'known')}`
          : resolved.totalSugar
            ? `${grams(locale, resolved.totalSugar.value)}`
            : t(locale, 'unknown'),
      onHelp: onSugarHelp,
      helpLabel: t(locale, 'sugar'),
    },
  ];

  const missingByIngredient = new Map<string, string[]>();
  const recordUnknown = (
    metric: { unknownContributors?: readonly string[] } | undefined,
    label: string,
  ) => {
    for (const id of metric?.unknownContributors ?? []) {
      const current = missingByIngredient.get(id) ?? [];
      current.push(label);
      missingByIngredient.set(id, current);
    }
  };
  recordUnknown(resolved.totalWater, t(locale, 'waterContent'));
  recordUnknown(resolved.totalFat, t(locale, 'fat'));
  recordUnknown(resolved.totalSugar, t(locale, 'sugar'));

  const incompleteNotice =
    missingByIngredient.size > 0
      ? `${recipeCopy(locale, 'incompleteProfile')}${colon(locale)} ${Array.from(
          missingByIngredient,
          ([id, missing]) => `${ingredientName(locale, id, content.names)} (${missing.join(', ')})`,
        ).join(', ')}`
      : undefined;

  return (
    <>
      <RecipeSummary
        editor={editor}
        metrics={metrics}
        notice={incompleteNotice}
        onNotice={onNotice}
        onHelp={onHelp}
        helpLabel={t(locale, 'hydrationDetails')}
        onSizeHelp={onSizeHelp}
        sizeHelpLabel={`${t(locale, 'help')} · ${t(locale, 'size')}`}
      />
      <output aria-hidden="true" className="sr-only" data-testid="formula-flour-total">
        {resolved.flourTotal}
      </output>
      <output aria-hidden="true" className="sr-only" data-testid="formula-dough-weight">
        {resolved.doughWeight}
      </output>
    </>
  );
}

export function WaterDetails({
  content,
  resolved,
  locale,
}: {
  content: Content;
  resolved: ResolvedFormula;
  locale: Locale;
}) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const totalWater = resolved.totalWater;
  const isPartial = totalWater.completeness === 'incomplete';

  const positiveContributions = totalWater.contributions.filter((c) => c.grams > 0);
  const lossContributions = totalWater.contributions.filter((c) => c.kind === 'loss');
  const positiveSum = sum(positiveContributions.map((c) => c.grams));

  const colors = [
    'var(--color-primary, #a84e20)',
    'var(--color-tertiary, #2e6b56)',
    'var(--color-secondary, #675e47)',
    'var(--color-primary-container, #ffdcc2)',
    'var(--color-tertiary-container, #b3f1d7)',
  ];

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div className="water-detail-summary">
        <Surface>
          <span>{t(locale, 'hydration')}</span>
          <strong>
            {isPartial ? '≥ ' : ''}
            {percent(locale, resolved.totalWaterPct, 0)}
          </strong>
          <small>
            {t(
              locale,
              isPartial
                ? 'known'
                : totalWater.contributions.some((c) => c.status === 'estimated')
                  ? 'estimated'
                  : 'completeValue',
            )}
          </small>
        </Surface>
        <Surface>
          <span>{t(locale, 'knownWater')}</span>
          <strong>{grams(locale, totalWater.value)}</strong>
          <small>
            {grams(locale, resolved.flourTotal)} {t(locale, 'flour')}
          </small>
        </Surface>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '0.25rem',
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
            {recipeCopy(locale, 'waterSourcesTitle')}
          </h3>
          <small className="muted">{grams(locale, positiveSum)}</small>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '4px',
            width: '100%',
          }}
        >
          <div
            role="img"
            aria-label={recipeCopy(locale, 'waterSourcesTitle')}
            style={{
              display: 'flex',
              height: '24px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid var(--color-outline-subtle, #e0d6cb)',
              flex: 1,
            }}
          >
            {positiveContributions.map((c, i) => {
              const share = positiveSum > 0 ? (c.grams / positiveSum) * 100 : 0;
              return (
                <div
                  key={c.source}
                  title={`${ingredientName(locale, c.source, content.names)}: ${grams(locale, c.grams)} (${percent(locale, share, 1)})`}
                  style={{
                    width: `${share}%`,
                    backgroundColor: colors[i % colors.length],
                    minWidth: '4px',
                  }}
                />
              );
            })}
          </div>

          {isPartial && (
            <div
              title={recipeCopy(locale, 'unknownWaterLabel')}
              style={{
                width: '32px',
                height: '24px',
                borderRadius: '6px',
                border: '1px solid var(--color-outline-subtle, #e0d6cb)',
                background:
                  'repeating-linear-gradient(45deg, var(--color-surface-container, #f3ece4), var(--color-surface-container, #f3ece4) 4px, var(--color-outline, #c8bcaf) 4px, var(--color-outline, #c8bcaf) 8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-ink-muted, #6c635b)',
                flexShrink: 0,
              }}
            >
              ≥
            </div>
          )}
        </div>
      </div>

      <Surface>
        <div className="stack" style={{ gap: '0.5rem' }}>
          {positiveContributions.map((c, i) => {
            const share = positiveSum > 0 ? (c.grams / positiveSum) * 100 : 0;
            const isSelected = selectedSource === c.source;
            const name = ingredientName(locale, c.source, content.names);
            return (
              <Button
                variant="quiet"
                key={c.source}
                aria-pressed={isSelected}
                onClick={() => setSelectedSource(isSelected ? null : c.source)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.375rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: isSelected
                    ? 'var(--color-surface-container-high, #ede5dc)'
                    : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: colors[i % colors.length],
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {name}
                    {c.status === 'estimated' && (
                      <small style={{ marginLeft: '4px', color: 'var(--color-ink-muted)' }}>
                        ({t(locale, 'estimated')})
                      </small>
                    )}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{grams(locale, c.grams)}</strong>
                  <small style={{ marginLeft: '6px', color: 'var(--color-ink-muted)' }}>
                    {percent(locale, share, 1)}
                  </small>
                </div>
              </Button>
            );
          })}

          {lossContributions.map((c) => {
            const comp = content.formula.components.find((comp) => comp.id === c.source);
            const compName = comp
              ? componentDisplayName(locale, content.formula, comp, content.names)
              : c.source;
            return (
              <div
                key={c.source}
                className="detail-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--color-error, #b00020)',
                  padding: '0.375rem 0.5rem',
                }}
              >
                <span>
                  {recipeCopy(locale, 'waterLossLabel')} ({compName})
                </span>
                <strong>– {grams(locale, Math.abs(c.grams))}</strong>
              </div>
            );
          })}

          {totalWater.unknownContributors.length > 0 && (
            <div
              className="detail-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.375rem',
                borderTop: '1px dashed var(--color-outline-subtle, #e0d6cb)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    background:
                      'repeating-linear-gradient(45deg, #f3ece4, #f3ece4 3px, #c8bcaf 3px, #c8bcaf 6px)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontStyle: 'italic' }}>
                  {totalWater.unknownContributors
                    .map((id) => ingredientName(locale, id, content.names))
                    .join(', ')}
                </span>
              </div>
              <small style={{ color: 'var(--color-ink-muted)' }}>
                {recipeCopy(locale, 'unknownWaterLabel')}
              </small>
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}

export function RecipeIngredients({
  store,
  locale,
  onHelp,
  onSizeHelp,
}: {
  store: Prototype;
  locale: Locale;
  onHelp: () => void;
  onSizeHelp: () => void;
}) {
  const { content, resolved, normalized, state } = store;
  const [addName, setAddName] = useState('');
  const [addPreset, setAddPreset] = useState('water');
  const [blendOpen, setBlendOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [componentErrors, setComponentErrors] = useState<Record<string, string | null>>({});
  const [stageErrors, setStageErrors] = useState<Record<string, string | null>>({});
  const [detailSheet, setDetailSheet] = useState<'fat' | 'sugar' | 'incomplete' | 'size' | null>(
    null,
  );
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  if (!resolved.ok || !normalized.ok)
    return (
      <p role="alert" className="warning">
        {t(locale, 'refused')} {t(locale, 'helpLock')}
      </p>
    );
  const r = resolved.value,
    n = normalized.value,
    groups = groupsOf(content, r, n, locale),
    checks = state.checks[state.selected] ?? [];
  const finalGroup = groups.find((g) => g.id === 'final');
  const finalChecks = finalGroup
    ? finalGroup.rows.filter((row) => checks.includes(row.key)).length
    : 0;
  const field = (
    id: string,
    value: number,
    label: string,
    unit: string,
    commit: (value: number) => boolean,
    disabled = false,
    compact = false,
    hint?: string,
  ): ReactNode => (
    <NumberField
      key={id}
      compact={compact}
      hint={
        hint ??
        (id === 'hydration-target' && formula.waterTarget
          ? recipeCopy(locale, 'lockedHint')
          : undefined)
      }
      value={value}
      resetKey={state.resetEpoch}
      displayDigits={id === 'hydration-target' ? 0 : id.startsWith('ingredient-pct-') ? 1 : 2}
      label={label}
      unit={unit}
      unitPosition={unit === '1:' ? 'prefix' : 'suffix'}
      locale={locale}
      onCommit={commit}
      disabled={disabled}
      errorMessage={t(locale, 'invalid')}
      onValidityChange={(invalid) => store.validity(id, invalid)}
      onDirtyChange={(dirty) => store.pendingInput?.(id, dirty)}
      dataTestId={id}
    />
  );
  const formula = content.formula;
  const selectedIngredient = formula.ingredients.find((i) => i.id === selectedIngredientId);
  const pureWaterAbsorber = formula.ingredients.find(
    (i) => i.kind === 'water' && (i.role === undefined || i.role === 'dough'),
  );
  const isLocked = Boolean(formula.waterTarget);
  const canLockHydration = isLocked || Boolean(pureWaterAbsorber);
  const componentControls = (component: Formula['components'][number]) => {
    const hasAllocations = Boolean(component.allocations && component.allocations.length > 0);
    const reading = liquidRatioPct(formula, component);
    const isEstimated = component.allocations?.some((a) => {
      const ing = formula.ingredients.find((i) => i.id === a.ingredient);
      return ing?.water?.status === 'estimated';
    });
    const baseHint = defaultsCopy(locale, 'adjustRatioHint');
    const hintText = isEstimated ? `${t(locale, 'estimated')} · ${baseHint}` : baseHint;

    return (
      <div className="component-controls stack">
        {field(
          `component-share-${component.id}`,
          component.flourPct,
          t(locale, 'flourShare'),
          '%',
          (value) =>
            store.apply({
              type: 'UpdateComponent',
              component: component.id,
              changes: { flourPct: value },
            }),
        )}
        <div
          className="detail-row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            alignItems: 'start',
          }}
        >
          {field(
            `component-ratio-${component.id}`,
            liquidMassRatio(component) ?? 1,
            t(locale, 'ratio'),
            '1:',
            (value) => {
              const ratio = hydrationForRatio(component, value);
              if (!ratio.ok) {
                setComponentErrors((prev) => ({
                  ...prev,
                  [component.id]: formatEngineReason(
                    locale,
                    extractFormulaErrorReason(ratio.error),
                    componentStyle(formula, component),
                  ),
                }));
                return false;
              }
              setComponentErrors((prev) => ({ ...prev, [component.id]: null }));
              return store.apply({
                type: 'UpdateComponent',
                component: component.id,
                changes: { hydrationPct: ratio.value },
              });
            },
          )}
          {hasAllocations ? (
            reading !== undefined ? (
              field(
                `component-hydration-${component.id}`,
                reading,
                t(locale, 'hydration'),
                '%',
                (value) => {
                  const inv = hydrationForLiquidRatio(formula, component, value);
                  if (!inv.ok) {
                    setComponentErrors((prev) => ({
                      ...prev,
                      [component.id]: formatEngineReason(
                        locale,
                        extractFormulaErrorReason(inv.error),
                        componentStyle(formula, component),
                      ),
                    }));
                    return false;
                  }
                  setComponentErrors((prev) => ({ ...prev, [component.id]: null }));
                  return store.apply({
                    type: 'UpdateComponent',
                    component: component.id,
                    changes: { hydrationPct: inv.value },
                  });
                },
                false,
                false,
                hintText,
              )
            ) : (
              <div className="field">
                <label className="field-label">
                  <span>{t(locale, 'hydration')}</span>
                </label>
                <div className="field-input-wrap">
                  <input
                    type="text"
                    disabled
                    value={t(locale, 'unknown')}
                    data-testid={`component-hydration-${component.id}`}
                    className="field-input tabular"
                  />
                </div>
                <p className="field-hint">{hintText}</p>
              </div>
            )
          ) : (
            field(
              `component-hydration-${component.id}`,
              component.hydrationPct,
              t(locale, 'hydration'),
              '%',
              (value) =>
                store.apply({
                  type: 'UpdateComponent',
                  component: component.id,
                  changes: { hydrationPct: value },
                }),
            )
          )}
        </div>
        {componentErrors[component.id] && (
          <p
            role="alert"
            className="field-error-msg"
            style={{ color: 'var(--color-error, #b00020)', margin: '0.25rem 0' }}
          >
            {componentErrors[component.id]}
          </p>
        )}
        <p className="muted">{t(locale, 'ratioHelp')}</p>
      </div>
    );
  };
  return (
    <div className="stack">
      <Summary
        content={content}
        resolved={r}
        locale={locale}
        onHelp={onHelp}
        onSizeHelp={onSizeHelp}
        onFatHelp={() => setDetailSheet('fat')}
        onSugarHelp={() => setDetailSheet('sugar')}
        onNotice={() => setDetailSheet('incomplete')}
        editor={
          state.draft && canLockHydration ? (
            <>
              {field(
                'hydration-target',
                formula.waterTarget?.totalWaterPct ?? r.totalWaterPct,
                t(locale, 'target'),
                '%',
                (value) => store.setHydrationTarget(value),
                isLocked,
                true,
                isLocked ? recipeCopy(locale, 'lockedHint') : undefined,
              )}
              <IconButton
                icon={isLocked ? 'unlock' : 'lock'}
                label={t(locale, isLocked ? 'unlock' : 'lock')}
                onClick={() =>
                  isLocked
                    ? store.apply({ type: 'UnlockTotalWater' })
                    : pureWaterAbsorber &&
                      store.apply({
                        type: 'LockTotalWater',
                        totalWaterPct: r.totalWaterPct,
                        water: pureWaterAbsorber.id,
                      })
                }
              />
            </>
          ) : undefined
        }
      />
      <div className="detail-row">
        <span>
          {t(locale, 'ingredientsWeighing')}
          <small className="baker-scope">{t(locale, 'bakerPct')}</small>
        </span>
        <span className="weigh-count" data-testid="weigh-count">
          {checks.length} / {groups.flatMap((g) => g.rows).length}
        </span>
      </div>

      {state.draft && (
        <Disclosure title={t(locale, 'size')}>
          <div className="detail-row">
            <h2>{t(locale, 'size')}</h2>
            <IconButton
              icon="info"
              label={`${t(locale, 'help')} · ${t(locale, 'size')}`}
              onClick={onSizeHelp}
            />
          </div>
          {formula.anchor.kind === 'flourTotal' && (
            <p className="muted" style={{ margin: '0.25rem 0' }}>
              {t(locale, 'flourAnchor')} · {grams(locale, formula.anchor.grams)}
            </p>
          )}
          <label className="field-label">
            {t(locale, 'type')}
            <select
              aria-label={t(locale, 'size')}
              disabled={Object.values(state.invalid).some(Boolean)}
              value={formula.anchor.kind === 'flourTotal' ? '' : formula.anchor.kind}
              onChange={(e) => {
                const targetKind = e.target.value as 'doughWeight' | 'pieces';
                if (!targetKind) return;
                store.apply({
                  type: 'SetAnchor',
                  mode: 'reinterpret',
                  kind: targetKind,
                  ...(targetKind === 'pieces'
                    ? { count: 2, gramsEach: Math.round(r.doughWeight / 2) }
                    : { grams: Math.round(r.doughWeight) }),
                });
              }}
            >
              {formula.anchor.kind === 'flourTotal' && (
                <option value="" disabled>
                  {t(locale, 'flourAnchor')}
                </option>
              )}
              <option value="doughWeight">{t(locale, 'doughAnchor')}</option>
              <option value="pieces">{t(locale, 'piecesAnchor')}</option>
            </select>
          </label>
          {formula.anchor.kind === 'pieces' ? (
            <div className="field-grid">
              {field('anchor-count', formula.anchor.count, t(locale, 'count'), '', (value) =>
                store.apply({
                  type: 'SetAnchor',
                  mode: 'rescale',
                  anchor: {
                    kind: 'pieces',
                    count: value,
                    gramsEach: formula.anchor.kind === 'pieces' ? formula.anchor.gramsEach : 100,
                  },
                }),
              )}
              {field('anchor-each', formula.anchor.gramsEach, t(locale, 'each'), 'g', (value) =>
                store.apply({
                  type: 'SetAnchor',
                  mode: 'rescale',
                  anchor: {
                    kind: 'pieces',
                    count: formula.anchor.kind === 'pieces' ? formula.anchor.count : 2,
                    gramsEach: value,
                  },
                }),
              )}
            </div>
          ) : (
            field(
              'anchor-grams',
              formula.anchor.grams,
              t(locale, formula.anchor.kind === 'flourTotal' ? 'flourAnchor' : 'doughAnchor'),
              'g',
              (value) =>
                store.apply({
                  type: 'SetAnchor',
                  mode: 'rescale',
                  anchor: {
                    kind: formula.anchor.kind === 'flourTotal' ? 'flourTotal' : 'doughWeight',
                    grams: value,
                  },
                }),
            )
          )}
        </Disclosure>
      )}

      <Disclosure
        title={recipeCopy(locale, 'flourDisclosureTitle')}
        badge={grams(locale, r.flourTotal)}
        subtitle={`${formula.flours.length} ${t(locale, 'flour')}`}
        defaultOpen
      >
        <div className="stack" style={{ gap: '0.75rem' }}>
          {formula.flours.map((flour) => {
            const flourName = ingredientName(locale, flour.id, content.names);
            return (
              <div key={flour.id} className="detail-row" style={{ alignItems: 'center' }}>
                <span>
                  <strong>{flourName}</strong>
                  <small style={{ marginLeft: '0.5rem' }}>
                    {num(locale, flour.sharePct, 1)} {t(locale, 'flourShare')}
                  </small>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>{grams(locale, r.flourByFlour[flour.id] ?? 0)}</strong>
                  {state.draft && (
                    <>
                      {field(
                        `flour-share-${flour.id}`,
                        flour.sharePct,
                        `${flourName} · ${t(locale, 'flourShare')}`,
                        '%',
                        (value) =>
                          store.apply({
                            type: 'SetFlourBlend',
                            flours: formula.flours.map((f) =>
                              f.id === flour.id ? { ...f, sharePct: value } : f,
                            ),
                          }),
                        false,
                        true,
                      )}
                      {formula.flours.length > 1 && (
                        <IconButton
                          icon="trash"
                          label={`${recipeCopy(locale, 'removeAction')} · ${flourName}`}
                          onClick={() =>
                            store.apply({
                              type: 'SetFlourBlend',
                              flours: formula.flours.filter((f) => f.id !== flour.id),
                            })
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {state.draft && (
            <div style={{ marginTop: '0.5rem' }}>
              <Button icon="plus" onClick={() => setBlendOpen(true)}>
                {recipeCopy(locale, 'addFlour')}
              </Button>
            </div>
          )}
        </div>
      </Disclosure>

      {(formula.components.length > 0 || state.draft) && (
        <Disclosure
          title={recipeCopy(locale, 'preDoughsTitle')}
          subtitle={
            formula.components.length === 0
              ? recipeCopy(locale, 'noPreDough')
              : `${formula.components.length} ${recipeCopy(locale, 'preDoughsTitle')}`
          }
          defaultOpen={formula.components.length > 0}
        >
          {formula.components.length === 0 ? (
            <p className="muted" style={{ margin: '0.5rem 0' }}>
              {recipeCopy(locale, 'noPreDough')}
            </p>
          ) : (
            formula.components.map((c) => {
              const compGroup = groups.find((g) => g.id === c.id);
              if (!compGroup) return null;
              const compChecks = compGroup.rows.filter((row) => checks.includes(row.key)).length;
              const compTitle = componentDisplayName(locale, formula, c, content.names);

              return (
                <div key={c.id} className="stack" style={{ marginBottom: '1.25rem' }}>
                  <div
                    className="detail-row"
                    style={{
                      alignItems: 'baseline',
                      borderBottom: '1px solid var(--color-outline-subtle, #e0d6cb)',
                      paddingBottom: '0.25rem',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{compTitle}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span data-testid={`weigh-count-${c.id}`}>
                        {compChecks} / {compGroup.rows.length}
                      </span>
                      <strong>{grams(locale, r.components[c.id]?.mass ?? compGroup.mass)}</strong>
                      {state.draft && (
                        <IconButton
                          icon="trash"
                          label={`${recipeCopy(locale, 'removeAction')} · ${compTitle}`}
                          onClick={() => setConfirm(`component:${c.id}`)}
                        />
                      )}
                    </div>
                  </div>

                  {state.draft && componentControls(c)}

                  {compGroup.rows.map((row) => {
                    const stage: StageRef = { kind: 'component', id: c.id };
                    const isAbsorbing = formula.waterTarget?.absorbInto === row.id;
                    const fieldId = `ingredient-grams-${c.id}-${row.id}`;
                    const stageLabel = `${row.name} (${compTitle})`;

                    return (
                      <IngredientRow
                        key={row.key}
                        id={row.key}
                        name={row.name}
                        gramsText={grams(locale, row.grams)}
                        pctText={percent(locale, row.pct)}
                        note={row.note}
                        checked={checks.includes(row.key)}
                        onToggle={() => store.weigh(row.key)}
                        checkLabel={`${t(locale, 'weighed')}${colon(locale)}${row.name}`}
                        editing={Boolean(state.draft)}
                      >
                        {state.draft && (
                          <div className="field-grid">
                            {field(
                              fieldId,
                              row.grams,
                              stageLabel,
                              'g',
                              (value) => {
                                const ok = store.apply({
                                  type: 'SetStageIngredientGrams',
                                  ingredient: row.id,
                                  stage,
                                  grams: value,
                                });
                                if (!ok) {
                                  setStageErrors((prev) => ({
                                    ...prev,
                                    [c.id]: store.state.error || t(locale, 'invalid'),
                                  }));
                                  return false;
                                }
                                setStageErrors((prev) => ({ ...prev, [c.id]: null }));
                                return true;
                              },
                              isAbsorbing,
                              false,
                              isAbsorbing ? recipeCopy(locale, 'absorbingWaterLocked') : undefined,
                            )}
                          </div>
                        )}
                      </IngredientRow>
                    );
                  })}

                  {stageErrors[c.id] && (
                    <p
                      role="alert"
                      className="field-error-msg"
                      style={{ color: 'var(--color-error, #b00020)', margin: '0.25rem 0' }}
                    >
                      {stageErrors[c.id]}
                    </p>
                  )}
                </div>
              );
            })
          )}

          {state.draft && (
            <div className="stack" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <Button
                  icon="plus"
                  onClick={() => {
                    const uuid = crypto.randomUUID().slice(0, 6);
                    const id = `poolish-${uuid}`;
                    const stored = loadComponentDefaults();
                    const created = newComponent(formula, 'poolish', id, stored);
                    if (!created.ok) {
                      setComponentErrors((prev) => ({
                        ...prev,
                        new: formatEngineReason(
                          locale,
                          extractFormulaErrorReason(created.error),
                          'poolish',
                        ),
                      }));
                      return;
                    }
                    setComponentErrors((prev) => ({ ...prev, new: null }));
                    store.apply({ type: 'AddComponent', component: created.value });
                  }}
                >
                  {defaultsCopy(locale, 'addPoolish')}
                </Button>
                <Button
                  icon="plus"
                  onClick={() => {
                    const uuid = crypto.randomUUID().slice(0, 6);
                    const id = `tangzhong-${uuid}`;
                    const stored = loadComponentDefaults();
                    const created = newComponent(formula, 'tangzhong', id, stored);
                    if (!created.ok) {
                      setComponentErrors((prev) => ({
                        ...prev,
                        new: formatEngineReason(
                          locale,
                          extractFormulaErrorReason(created.error),
                          'tangzhong',
                        ),
                      }));
                      return;
                    }
                    setComponentErrors((prev) => ({ ...prev, new: null }));
                    store.apply({ type: 'AddComponent', component: created.value });
                  }}
                >
                  {defaultsCopy(locale, 'addTangzhong')}
                </Button>
                <Button
                  icon="plus"
                  onClick={() => {
                    const uuid = crypto.randomUUID().slice(0, 6);
                    const id = `yudane-${uuid}`;
                    const stored = loadComponentDefaults();
                    const created = newComponent(formula, 'yudane', id, stored);
                    if (!created.ok) {
                      setComponentErrors((prev) => ({
                        ...prev,
                        new: formatEngineReason(
                          locale,
                          extractFormulaErrorReason(created.error),
                          'yudane',
                        ),
                      }));
                      return;
                    }
                    setComponentErrors((prev) => ({ ...prev, new: null }));
                    store.apply({ type: 'AddComponent', component: created.value });
                  }}
                >
                  {defaultsCopy(locale, 'addYudane')}
                </Button>
              </div>
              {componentErrors['new'] && (
                <p role="alert" className="field-error-msg" style={{ color: 'var(--color-error)' }}>
                  {componentErrors['new']}
                </p>
              )}
            </div>
          )}
        </Disclosure>
      )}

      {finalGroup && (
        <Disclosure
          title={finalGroup.title}
          badge={grams(locale, finalGroup.mass)}
          subtitle={`${finalChecks} / ${finalGroup.rows.length}`}
          defaultOpen
        >
          {content.formula.components.map((c) => (
            <p className="incorporation" key={c.id}>
              {t(locale, 'incorporate')}
              {colon(locale)}
              {componentDisplayName(locale, content.formula, c, content.names)} ·{' '}
              {grams(locale, r.components[c.id]?.mass ?? 0)}
            </p>
          ))}

          {finalGroup.rows.map((row) => {
            const stage: StageRef = { kind: 'final' };
            const isAbsorbing = formula.waterTarget?.absorbInto === row.id;
            const fieldId = `ingredient-grams-${row.id}`;
            const stageLabel = `${row.name} (${finalGroup.title})`;
            const ingredient = formula.ingredients.find((i) => i.id === row.id);

            return (
              <IngredientRow
                key={row.key}
                id={row.key}
                name={row.name}
                gramsText={grams(locale, row.grams)}
                pctText={state.draft && ingredient ? '' : percent(locale, row.pct)}
                note={row.note}
                checked={checks.includes(row.key)}
                onToggle={() => store.weigh(row.key)}
                checkLabel={`${t(locale, 'weighed')}${colon(locale)}${row.name}`}
                editing={Boolean(state.draft)}
              >
                {state.draft && (
                  <div
                    className="field-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.5rem',
                      alignItems: 'end',
                    }}
                  >
                    {field(
                      fieldId,
                      row.grams,
                      stageLabel,
                      'g',
                      (value) => {
                        const ok = store.apply({
                          type: 'SetStageIngredientGrams',
                          ingredient: row.id,
                          stage,
                          grams: value,
                        });
                        if (!ok) {
                          setStageErrors((prev) => ({
                            ...prev,
                            final: store.state.error || t(locale, 'invalid'),
                          }));
                          return false;
                        }
                        setStageErrors((prev) => ({ ...prev, final: null }));
                        return true;
                      },
                      isAbsorbing,
                      false,
                      isAbsorbing ? recipeCopy(locale, 'absorbingWaterLocked') : undefined,
                    )}

                    {ingredient &&
                      field(
                        `ingredient-pct-${row.id}`,
                        ingredient.bakerPct,
                        `${row.name} · ${t(locale, 'bakerPct')}`,
                        '%',
                        (value) =>
                          store.apply({
                            type: 'SetBakerPct',
                            ingredient: row.id,
                            pct: value,
                          }),
                        false,
                        false,
                      )}

                    {ingredient && (
                      <IconButton
                        icon="info"
                        label={`${t(locale, 'help')} · ${row.name}`}
                        onClick={() => setSelectedIngredientId(row.id)}
                      />
                    )}
                    {ingredient && (
                      <IconButton
                        icon="trash"
                        label={`${recipeCopy(locale, 'removeAction')} · ${row.name}`}
                        onClick={() => setConfirm(`ingredient:${row.id}`)}
                      />
                    )}
                  </div>
                )}
              </IngredientRow>
            );
          })}

          {stageErrors['final'] && (
            <p
              role="alert"
              className="field-error-msg"
              style={{ color: 'var(--color-error, #b00020)', margin: '0.25rem 0' }}
            >
              {stageErrors['final']}
            </p>
          )}

          {state.draft && (
            <div style={{ marginTop: '0.75rem' }}>
              {!showAddIngredient ? (
                <Button icon="plus" onClick={() => setShowAddIngredient(true)}>
                  {t(locale, 'addIngredient')}
                </Button>
              ) : (
                <Surface variant="container" className="stack">
                  <div className="stack" style={{ gap: '0.5rem' }}>
                    <label className="field-label">
                      {t(locale, 'ingredientName')}
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        aria-label={t(locale, 'ingredientName')}
                      />
                    </label>
                    <label className="field-label">
                      {t(locale, 'type')}
                      <select value={addPreset} onChange={(e) => setAddPreset(e.target.value)}>
                        {INGREDIENT_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {ingredientName(locale, p.id)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="primary"
                        icon="plus"
                        disabled={!addName.trim()}
                        onClick={() => {
                          const preset =
                            INGREDIENT_PRESETS.find((p) => p.id === addPreset) ??
                            INGREDIENT_PRESETS[0];
                          const id = `ingredient-${crypto.randomUUID().slice(0, 6)}`;
                          const ingredient: Ingredient = { ...preset.ingredient, id, bakerPct: 1 };
                          if (
                            store.apply(
                              { type: 'AddIngredient', ingredient },
                              { [id]: addName.trim() },
                            )
                          ) {
                            setAddName('');
                            setShowAddIngredient(false);
                          }
                        }}
                      >
                        {t(locale, 'addIngredient')}
                      </Button>
                      <Button variant="quiet" onClick={() => setShowAddIngredient(false)}>
                        {t(locale, 'cancel')}
                      </Button>
                    </div>
                  </div>
                </Surface>
              )}
            </div>
          )}
        </Disclosure>
      )}

      {blendOpen && (
        <FlourBlendEditor store={store} locale={locale} onClose={() => setBlendOpen(false)} />
      )}

      {state.draft && selectedIngredient && (
        <Modal
          open={true}
          title={ingredientName(locale, selectedIngredient.id, content.names)}
          closeLabel={t(locale, 'close')}
          onClose={() => setSelectedIngredientId(null)}
        >
          <p>
            {t(locale, 'waterContent')} ·{' '}
            {t(
              locale,
              selectedIngredient.water?.status === 'known'
                ? 'known'
                : selectedIngredient.water?.status === 'estimated'
                  ? 'estimated'
                  : 'unknown',
            )}
          </p>
          {field(
            `ingredient-water-${selectedIngredient.id}`,
            selectedIngredient.water && selectedIngredient.water.status !== 'unknown'
              ? selectedIngredient.water.valuePct
              : NaN,
            t(locale, 'waterContent'),
            '%',
            (value) =>
              store.apply({
                type: 'UpdateIngredient',
                ingredient: selectedIngredient.id,
                changes: {
                  water: { status: 'known', valuePct: value, source: t(locale, 'manual') },
                },
              }),
          )}
          <Button
            onClick={() =>
              store.apply({
                type: 'UpdateIngredient',
                ingredient: selectedIngredient.id,
                changes: { water: { status: 'unknown' } },
              })
            }
          >
            {t(locale, 'unknownComposition')}
          </Button>
        </Modal>
      )}

      {confirm && (
        <CompactDialog
          open
          onClose={() => setConfirm(null)}
          title={
            confirm.startsWith('component:')
              ? (() => {
                  const compId = confirm.split(':')[1];
                  const comp = formula.components.find((c) => c.id === compId);
                  return comp
                    ? componentDisplayName(locale, formula, comp, content.names)
                    : componentName(locale, compId, content.names);
                })()
              : ingredientName(locale, confirm.split(':')[1], content.names)
          }
          closeLabel={t(locale, 'close')}
          footer={
            <div className="actions">
              <Button onClick={() => setConfirm(null)}>{t(locale, 'cancel')}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  const [kind, id] = confirm.split(':');
                  store.apply(
                    kind === 'component'
                      ? { type: 'RemoveComponent', component: id }
                      : { type: 'RemoveIngredient', ingredient: id },
                  );
                  setConfirm(null);
                }}
              >
                {recipeCopy(locale, 'removeAction')}
              </Button>
            </div>
          }
        >
          <p>
            {confirm.startsWith('component:')
              ? recipeCopy(locale, 'removeComponentConsequence')
              : recipeCopy(locale, 'removeIngredientConsequence')}
          </p>
        </CompactDialog>
      )}

      {detailSheet === 'incomplete' && (
        <Modal
          open
          onClose={() => setDetailSheet(null)}
          title={recipeCopy(locale, 'incompleteProfileTitle')}
          closeLabel={t(locale, 'close')}
        >
          <div className="stack" style={{ gap: '0.75rem' }}>
            <p>{recipeCopy(locale, 'incompleteProfileExplanation')}</p>
            {r.totalWater.completeness === 'incomplete' && (
              <div>
                <strong>{t(locale, 'hydration')} :</strong>{' '}
                {r.totalWater.unknownContributors
                  .map((id) => ingredientName(locale, id, content.names))
                  .join(', ')}
              </div>
            )}
            {r.totalFat?.completeness === 'incomplete' && (
              <div>
                <strong>{t(locale, 'fat')} :</strong>{' '}
                {r.totalFat.unknownContributors
                  .map((id) => ingredientName(locale, id, content.names))
                  .join(', ')}
              </div>
            )}
            {r.totalSugar?.completeness === 'incomplete' && (
              <div>
                <strong>{t(locale, 'sugar')} :</strong>{' '}
                {r.totalSugar.unknownContributors
                  .map((id) => ingredientName(locale, id, content.names))
                  .join(', ')}
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailSheet === 'fat' && (
        <Modal
          open
          onClose={() => setDetailSheet(null)}
          title={recipeCopy(locale, 'fatContributions')}
          closeLabel={t(locale, 'close')}
        >
          <div className="stack" style={{ gap: '0.75rem' }}>
            <div className="detail-row">
              <span>{t(locale, 'fat')}</span>
              <strong>
                {r.totalFat?.completeness === 'incomplete' ? '≥ ' : ''}
                {r.totalFatPct !== undefined
                  ? percent(locale, r.totalFatPct, 0)
                  : t(locale, 'unknown')}
                {r.totalFat ? ` · ${grams(locale, r.totalFat.value)}` : ''}
              </strong>
            </div>
            {r.totalFat?.contributions && r.totalFat.contributions.length > 0 && (
              <div className="stack" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                {r.totalFat.contributions.map((c) => (
                  <div key={c.source} className="detail-row">
                    <span>{ingredientName(locale, c.source, content.names)}</span>
                    <strong>{grams(locale, c.grams)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailSheet === 'sugar' && (
        <Modal
          open
          onClose={() => setDetailSheet(null)}
          title={recipeCopy(locale, 'sugarContributions')}
          closeLabel={t(locale, 'close')}
        >
          <div className="stack" style={{ gap: '0.75rem' }}>
            <div className="detail-row">
              <span>{t(locale, 'sugar')}</span>
              <strong>
                {r.totalSugar?.completeness === 'incomplete' ? '≥ ' : ''}
                {r.totalSugarPct !== undefined
                  ? percent(locale, r.totalSugarPct, 0)
                  : t(locale, 'unknown')}
                {r.totalSugar ? ` · ${grams(locale, r.totalSugar.value)}` : ''}
              </strong>
            </div>
            {r.totalSugar?.contributions && r.totalSugar.contributions.length > 0 && (
              <div className="stack" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                {r.totalSugar.contributions.map((c) => (
                  <div key={c.source} className="detail-row">
                    <span>{ingredientName(locale, c.source, content.names)}</span>
                    <strong>{grams(locale, c.grams)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      <p className="muted">
        {t(locale, 'ingredientsWeighing')}
        <small className="baker-scope">{t(locale, 'bakerPct')}</small> · {t(locale, 'totalRecipe')}
      </p>
    </div>
  );
}

function FlourBlendEditor({
  store,
  locale,
  onClose,
}: {
  store: Prototype;
  locale: Locale;
  onClose: () => void;
}) {
  const [flours, setFlours] = useState(() => [...store.content.formula.flours]);
  const defaultName = ingredientName(locale, 'whole-wheat', store.content.names);
  const [inputName, setInputName] = useState(defaultName);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={t(locale, 'flourBlend')}
      closeLabel={t(locale, 'close')}
      footer={
        <Button
          variant="primary"
          disabled={Object.values(invalid).some(Boolean)}
          onClick={() => {
            if (store.apply({ type: 'SetFlourBlend', flours })) onClose();
            else setError(true);
          }}
        >
          {t(locale, 'apply')}
        </Button>
      }
    >
      <div className="stack">
        {flours.map((flour) => (
          <Surface key={flour.id}>
            <NumberField
              value={flour.sharePct}
              label={`${ingredientName(locale, flour.id, store.content.names)} · ${t(locale, 'flourShare')}`}
              unit="%"
              locale={locale}
              errorMessage={t(locale, 'invalid')}
              onValidityChange={(bad) =>
                setInvalid((s) => (s[flour.id] === bad ? s : { ...s, [flour.id]: bad }))
              }
              onDirtyChange={(dirty) => store.pendingInput?.(`flour-blend-${flour.id}`, dirty)}
              onCommit={(value) => {
                setFlours((rows) =>
                  rows.map((row) => (row.id === flour.id ? { ...row, sharePct: value } : row)),
                );
                return true;
              }}
            />
            <Button
              onClick={() => {
                setFlours((rows) => rows.filter((row) => row.id !== flour.id));
                setInvalid((flags) =>
                  Object.fromEntries(Object.entries(flags).filter(([key]) => key !== flour.id)),
                );
                store.pendingInput?.(`flour-blend-${flour.id}`, false);
              }}
            >
              {recipeCopy(locale, 'removeAction')}
            </Button>
          </Surface>
        ))}
        <label className="field-label">
          {t(locale, 'ingredientName')}
          <input value={inputName} onChange={(e) => setInputName(e.target.value)} />
        </label>
        <Button
          disabled={
            !inputName.trim() ||
            flours.some(
              (f) => f.id === (inputName.trim() === defaultName ? 'whole-wheat' : inputName.trim()),
            )
          }
          onClick={() => {
            const trimmed = inputName.trim();
            const addId = trimmed === defaultName ? 'whole-wheat' : trimmed;
            setFlours((rows) => [...rows, { id: addId, sharePct: 0 }]);
          }}
        >
          {t(locale, 'addIngredient')}
        </Button>
        <p>{t(locale, 'blendHelp')}</p>
        {error && <p role="alert">{t(locale, 'refused')}</p>}
      </div>
    </Modal>
  );
}
