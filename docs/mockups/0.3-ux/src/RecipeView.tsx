import { useState, type ReactNode } from 'react';
import {
  sum,
  hydrationForRatio,
  liquidMassRatio,
  type Formula,
  type ResolvedFormula,
  type Ingredient,
} from '@flourprint/core/domain';
import { INGREDIENT_PRESETS } from '@flourprint/core/domain';
import { Button, IconButton, NumberField, Surface, Disclosure, Modal } from './ui';
import { IngredientRow, RecipeSummary } from './components';
import { grams, num, t, ingredientName, componentName, type Locale } from './messages';
import { type Prototype, type Content } from './model';

export interface WeighRow {
  key: string;
  id: string;
  grams: number;
  pct: number;
  name: string;
  note?: string;
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
    const compTitle = componentName(locale, component.id, content.names);
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
}: {
  editor?: ReactNode;
  content: Content;
  resolved: ResolvedFormula;
  locale: Locale;
  onHelp: () => void;
}) {
  const partial = resolved.totalWater.completeness === 'incomplete';
  const metrics = [
    {
      label: t(locale, 'flour'),
      value: grams(locale, resolved.flourTotal),
      icon: 'flour' as const,
      detail: t(locale, 'bakerBase'),
    },
    {
      label: t(locale, 'dough'),
      value: grams(locale, resolved.doughWeight),
      icon: 'scale' as const,
      detail: `${grams(locale, sum(Object.values(resolved.components).map((c) => c.mass)))} ${t(locale, 'component')} · ${grams(
        locale,
        sum(
          groupsOf(content, resolved, resolved, locale)
            .find((g) => g.id === 'final')
            ?.rows.map((r) => r.grams) ?? [],
        ),
      )} ${t(locale, 'additions')}`,
    },
    {
      label: t(locale, 'hydration'),
      value: `${partial ? '≈ ' : ''}${num(locale, resolved.totalWaterPct, 0)} %`,
      icon: 'water' as const,
      detail: `${grams(locale, resolved.totalWater.value)} ${t(locale, 'water').toLocaleLowerCase()} ${partial ? `(${t(locale, 'known').toLocaleLowerCase()})` : ''}`,
    },
    {
      label: t(locale, 'fat'),
      value:
        resolved.totalFatPct === undefined
          ? t(locale, 'unknown')
          : `${resolved.totalFat?.completeness === 'incomplete' ? '≈ ' : ''}${num(locale, resolved.totalFatPct, 0)} %`,
      detail:
        resolved.totalFat?.completeness === 'incomplete'
          ? `${grams(locale, resolved.totalFat.value)} · ${t(locale, 'known')}`
          : resolved.totalFat
            ? `${grams(locale, resolved.totalFat.value)} · ${t(locale, 'estimated')}`
            : t(locale, 'unknown'),
    },
    {
      label: t(locale, 'sugar'),
      value:
        resolved.totalSugarPct === undefined
          ? t(locale, 'unknown')
          : `${resolved.totalSugar?.completeness === 'incomplete' ? '≈ ' : ''}${num(locale, resolved.totalSugarPct, 0)} %`,
      detail:
        resolved.totalSugar?.completeness === 'incomplete'
          ? `${grams(locale, resolved.totalSugar.value)} · ${t(locale, 'known')}`
          : resolved.totalSugar
            ? `${grams(locale, resolved.totalSugar.value)} · ${t(locale, 'estimated')}`
            : t(locale, 'unknown'),
    },
  ];
  return (
    <>
      <RecipeSummary
        editor={editor}
        metrics={metrics}
        notice={
          partial
            ? `${t(locale, 'unknownFor')} ${resolved.totalWater.unknownContributors.map((id) => ingredientName(locale, id, content.names)).join(', ')}`
            : undefined
        }
        onHelp={onHelp}
        helpLabel={t(locale, 'hydrationDetails')}
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
  return (
    <div className="stack">
      <div className="water-detail-summary">
        <Surface>
          <span>{t(locale, 'hydration')}</span>
          <strong>
            {resolved.totalWater.completeness === 'incomplete' ? '≈ ' : ''}
            {num(locale, resolved.totalWaterPct, 0)} %
          </strong>
          <small>
            {t(locale, resolved.totalWater.completeness === 'incomplete' ? 'known' : 'estimated')}
          </small>
        </Surface>
        <Surface>
          <span>{t(locale, 'knownWater')}</span>
          <strong>{grams(locale, resolved.totalWater.value)}</strong>
          <small>
            {grams(locale, resolved.flourTotal)} {t(locale, 'flour')}
          </small>
        </Surface>
      </div>
      <p className="muted">{t(locale, 'helpHydration')}</p>
      {content.formula.waterTarget && <p>{t(locale, 'locked')}</p>}
      <strong>
        {t(locale, 'hydration')} : {num(locale, resolved.totalWaterPct, 0)} % ·{' '}
        {t(locale, resolved.totalWater.completeness === 'incomplete' ? 'known' : 'estimated')}
      </strong>
      <p>
        {grams(locale, resolved.totalWater.value)} / {grams(locale, resolved.flourTotal)}{' '}
        {t(locale, 'flour').toLocaleLowerCase()}
      </p>
      <Surface>
        {resolved.totalWater.contributions
          .filter((c) => c.grams !== 0)
          .map((c, i) => (
            <div className="detail-row" key={`${c.source}-${i}`}>
              <span>
                {ingredientName(locale, c.source, content.names)} ·{' '}
                {t(locale, c.status === 'estimated' ? 'estimated' : 'known')}
              </span>
              <strong>{grams(locale, c.grams)}</strong>
            </div>
          ))}
      </Surface>
      {resolved.totalWater.unknownContributors.length > 0 && (
        <p className="warning">
          {t(locale, 'unknownFor')} :{' '}
          {resolved.totalWater.unknownContributors
            .map((id) => ingredientName(locale, id, content.names))
            .join(', ')}
        </p>
      )}
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
  const field = (
    id: string,
    value: number,
    label: string,
    unit: string,
    commit: (value: number) => boolean,
    disabled = false,
    compact = false,
  ): ReactNode => (
    <NumberField
      key={id}
      compact={compact}
      hint={id === 'hydration-target' && formula.waterTarget ? t(locale, 'locked') : undefined}
      value={value}
      resetKey={state.resetEpoch}
      displayDigits={id === 'hydration-target' ? 0 : 2}
      label={label}
      unit={unit}
      locale={locale}
      onCommit={commit}
      disabled={disabled}
      errorMessage={t(locale, 'invalid')}
      onValidityChange={(invalid) => store.validity(id, invalid)}
      dataTestId={id}
    />
  );
  const formula = content.formula;
  return (
    <div className="stack">
      <Summary
        content={content}
        resolved={r}
        locale={locale}
        onHelp={onHelp}
        editor={
          state.draft ? (
            <>
              {field(
                'hydration-target',
                formula.waterTarget?.totalWaterPct ?? r.totalWaterPct,
                t(locale, 'target'),
                '%',
                (value) => store.setHydrationTarget(value),
                Boolean(formula.waterTarget),
                true,
              )}
              <IconButton
                icon={formula.waterTarget ? 'unlock' : 'lock'}
                label={t(locale, formula.waterTarget ? 'unlock' : 'lock')}
                onClick={() =>
                  formula.waterTarget
                    ? store.apply({ type: 'UnlockTotalWater' })
                    : store.apply({
                        type: 'LockTotalWater',
                        totalWaterPct: r.totalWaterPct,
                        water: formula.ingredients.find((i) => i.kind === 'water')?.id ?? 'water',
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
        <span data-testid="weigh-count">
          {checks.length} / {groups.flatMap((g) => g.rows).length}
        </span>
      </div>
      {groups.map((group) => (
        <Disclosure
          key={group.id}
          title={`${groups.indexOf(group) + 1}. ${group.title}`}
          badge={grams(locale, group.mass)}
          subtitle={
            group.share !== undefined
              ? `${num(locale, group.share)} ${t(locale, 'flourShare')} · ${num(locale, group.pct ?? 0)} ${t(locale, 'massPct')}`
              : t(locale, 'additions')
          }
          defaultOpen
        >
          {group.id === 'final' &&
            content.formula.components.map((c) => (
              <p className="incorporation" key={c.id}>
                {t(locale, 'incorporate')} : {componentName(locale, c.id, content.names)} ·{' '}
                {grams(locale, r.components[c.id].mass)}
              </p>
            ))}
          {group.rows.map((row) => (
            <IngredientRow
              key={row.key}
              id={row.key}
              name={row.name}
              gramsText={grams(locale, row.grams)}
              pctText={`${num(locale, row.pct)} %`}
              note={row.note}
              checked={checks.includes(row.key)}
              onToggle={() => store.weigh(row.key)}
              checkLabel={`${t(locale, 'weighed')} : ${row.name}`}
              editing={Boolean(state.draft)}
            >
              {state.draft && group.id === 'final' && (
                <div className="field-grid">
                  {field(
                    `ingredient-grams-${row.id}`,
                    r.grams[row.id] ?? r.flourByFlour[row.id],
                    `${row.name} · ${t(locale, 'totalRecipe')}`,
                    'g',
                    (value) =>
                      store.apply({
                        type: 'SetIngredientGrams',
                        ingredient: row.id,
                        grams: value,
                        hold: 'otherGrams',
                      }),
                    formula.waterTarget?.absorbInto === row.id,
                  )}
                  {formula.ingredients.some((i) => i.id === row.id) &&
                    field(
                      `ingredient-pct-${row.id}`,
                      r.bakerPct[row.id],
                      `${row.name} · ${t(locale, 'bakerPct')}`,
                      '%',
                      (value) =>
                        store.apply({ type: 'SetBakerPct', ingredient: row.id, pct: value }),
                      formula.waterTarget?.absorbInto === row.id,
                    )}
                  {formula.flours.some((f) => f.id === row.id) &&
                    field(
                      `flour-share-${row.id}`,
                      formula.flours.find((f) => f.id === row.id)?.sharePct ?? 0,
                      `${row.name} · ${t(locale, 'flourShare')}`,
                      '%',
                      (value) =>
                        store.apply({
                          type: 'SetFlourBlend',
                          flours: formula.flours.map((f) =>
                            f.id === row.id ? { ...f, sharePct: value } : f,
                          ),
                        }),
                    )}
                </div>
              )}
            </IngredientRow>
          ))}
        </Disclosure>
      ))}
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
          <label className="field-label">
            {t(locale, 'type')}
            <select
              aria-label={t(locale, 'size')}
              value={formula.anchor.kind}
              onChange={(e) =>
                store.apply({
                  type: 'SetAnchor',
                  mode: 'reinterpret',
                  kind: e.target.value as Formula['anchor']['kind'],
                  ...(e.target.value === 'pieces' ? { count: 2 } : {}),
                })
              }
            >
              <option value="flourTotal">{t(locale, 'flourAnchor')}</option>
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
          <Button onClick={() => setBlendOpen(true)}>{t(locale, 'flourBlend')}</Button>
        </Disclosure>
      )}
      <Disclosure title={t(locale, 'totals')}>
        {[
          ...formula.flours.map((f) => ({
            id: f.id,
            value: r.flourByFlour[f.id],
            pct: f.sharePct,
          })),
          ...formula.ingredients.map((i) => ({ id: i.id, value: r.grams[i.id], pct: i.bakerPct })),
        ].map((row) => (
          <div className="detail-row" key={row.id}>
            <span>
              {ingredientName(locale, row.id, content.names)}
              <small>
                {num(locale, row.pct)}{' '}
                {t(locale, formula.flours.some((f) => f.id === row.id) ? 'flourShare' : 'bakerPct')}
              </small>
            </span>
            <div>
              <strong>{grams(locale, row.value)}</strong>
              {state.draft &&
                field(
                  `total-grams-${row.id}`,
                  row.value,
                  `${ingredientName(locale, row.id, content.names)} · ${t(locale, 'totalRecipe')}`,
                  'g',
                  (value) =>
                    store.apply({
                      type: 'SetIngredientGrams',
                      ingredient: row.id,
                      grams: value,
                      hold: 'otherGrams',
                    }),
                  formula.waterTarget?.absorbInto === row.id,
                )}
            </div>
          </div>
        ))}
      </Disclosure>
      {state.draft && (
        <>
          <Disclosure title={t(locale, 'components')} defaultOpen>
            {formula.components.map((component) => (
              <Surface key={component.id}>
                <h3>{componentName(locale, component.id, content.names)}</h3>
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
                {field(
                  `component-ratio-${component.id}`,
                  liquidMassRatio(component) ?? 1,
                  t(locale, 'ratio'),
                  '1:',
                  (value) => {
                    const ratio = hydrationForRatio(component, value);
                    return ratio.ok
                      ? store.apply({
                          type: 'UpdateComponent',
                          component: component.id,
                          changes: { hydrationPct: ratio.value },
                        })
                      : false;
                  },
                )}
                <p className="muted">{t(locale, 'ratioHelp')}</p>
                <Button variant="danger" onClick={() => setConfirm(`component:${component.id}`)}>
                  {t(locale, 'remove')}
                </Button>
              </Surface>
            ))}
            <Button
              icon="plus"
              onClick={() =>
                store.apply({
                  type: 'AddComponent',
                  component: {
                    id: `component-${crypto.randomUUID().slice(0, 6)}`,
                    kind: 'scald',
                    flourPct: 1,
                    flourBlend: formula.flours.map((f) => ({ flour: f.id, sharePct: f.sharePct })),
                    hydrationPct: 0,
                  },
                })
              }
            >
              {t(locale, 'addComponent')}
            </Button>
          </Disclosure>
          <Disclosure title={t(locale, 'addIngredient')}>
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
            <Button
              icon="plus"
              disabled={!addName.trim()}
              onClick={() => {
                const preset =
                  INGREDIENT_PRESETS.find((p) => p.id === addPreset) ?? INGREDIENT_PRESETS[0];
                const id = `ingredient-${crypto.randomUUID().slice(0, 6)}`;
                const ingredient: Ingredient = { ...preset.ingredient, id, bakerPct: 1 };
                if (store.apply({ type: 'AddIngredient', ingredient }, { [id]: addName.trim() }))
                  setAddName('');
              }}
            >
              {t(locale, 'addIngredient')}
            </Button>
          </Disclosure>
          <Disclosure title={t(locale, 'compose')}>
            {formula.ingredients
              .filter((i) => i.kind !== 'water')
              .map((i) => (
                <Surface key={i.id}>
                  <h3>{ingredientName(locale, i.id, content.names)}</h3>
                  <p>
                    {t(locale, 'waterContent')} ·{' '}
                    {t(
                      locale,
                      i.water?.status === 'known'
                        ? 'known'
                        : i.water?.status === 'estimated'
                          ? 'estimated'
                          : 'unknown',
                    )}
                  </p>
                  {field(
                    `water-content-${i.id}`,
                    i.water && i.water.status !== 'unknown' ? i.water.valuePct : NaN,
                    t(locale, 'waterContent'),
                    '%',
                    (value) =>
                      store.apply({
                        type: 'UpdateIngredient',
                        ingredient: i.id,
                        changes: {
                          water: { status: 'known', valuePct: value, source: t(locale, 'manual') },
                        },
                      }),
                  )}
                  <Button
                    onClick={() =>
                      store.apply({
                        type: 'UpdateIngredient',
                        ingredient: i.id,
                        changes: { water: { status: 'unknown' } },
                      })
                    }
                  >
                    {t(locale, 'unknownComposition')}
                  </Button>
                </Surface>
              ))}
          </Disclosure>
          <Disclosure title={t(locale, 'ingredients')}>
            {formula.ingredients.map((i) => (
              <div className="detail-row" key={i.id}>
                <span>{ingredientName(locale, i.id, content.names)}</span>
                <Button variant="quiet" onClick={() => setConfirm(`ingredient:${i.id}`)}>
                  {t(locale, 'remove')}
                </Button>
              </div>
            ))}
          </Disclosure>
          {blendOpen && (
            <FlourBlendEditor store={store} locale={locale} onClose={() => setBlendOpen(false)} />
          )}
          {confirm && (
            <Surface>
              <p>
                {t(locale, 'confirmRemove')} : {confirm.split(':')[1]}
              </p>
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
                  {t(locale, 'remove')}
                </Button>
              </div>
            </Surface>
          )}
        </>
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
  const [id, setId] = useState('whole-wheat');
  const [invalid, setInvalid] = useState<Record<number, boolean>>({});
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
        {flours.map((flour, index) => (
          <Surface key={flour.id}>
            <NumberField
              value={flour.sharePct}
              label={`${ingredientName(locale, flour.id)} · ${t(locale, 'flourShare')}`}
              unit="%"
              locale={locale}
              errorMessage={t(locale, 'invalid')}
              onValidityChange={(bad) =>
                setInvalid((s) => (s[index] === bad ? s : { ...s, [index]: bad }))
              }
              onCommit={(value) => {
                setFlours((rows) =>
                  rows.map((row, i) => (i === index ? { ...row, sharePct: value } : row)),
                );
                return true;
              }}
            />
            <Button onClick={() => setFlours((rows) => rows.filter((_, i) => i !== index))}>
              {t(locale, 'remove')}
            </Button>
          </Surface>
        ))}
        <label className="field-label">
          {t(locale, 'ingredientName')}
          <input value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <Button
          disabled={!id.trim() || flours.some((f) => f.id === id.trim())}
          onClick={() => setFlours((rows) => [...rows, { id: id.trim(), sharePct: 0 }])}
        >
          {t(locale, 'addIngredient')}
        </Button>
        <p>{t(locale, 'blendHelp')}</p>
        {error && <p role="alert">{t(locale, 'refused')}</p>}
      </div>
    </Modal>
  );
}
