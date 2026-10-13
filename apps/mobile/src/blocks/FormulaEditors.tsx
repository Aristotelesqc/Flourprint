import { IonButton } from '@ionic/react';
import { forwardRef, useId, useState } from 'react';
import {
  OFFERED_BUILT_IN_FLOURS,
  INGREDIENT_PRESETS,
  hydrationForRatio,
  liquidMassRatio,
  removeStep,
  type FlourEntry,
  type Formula,
  type FormulaEdit,
  type Process,
  type ResolvedFormula,
} from '@flourprint/core/domain';
import { parseDecimal } from '../i18n/numbers';
import { useMessages } from '../i18n/use-messages';
import { useFlourCatalog } from '../services/flours';
import { formulaChanges } from '../services/formula-changes';
import {
  newPreparation,
  withPreparationStep,
  type PreparationKind,
} from '../services/preparations';
import { NumberField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { Card } from '../ui/Layout';
import { totalWaterKey } from './water-label';

/** Structure edits of the formula tab (formula.md, Structure edits and Locked total water). */

export type StructureEdit = (edit: FormulaEdit, process?: Process) => boolean;

/** The water absorbing a lock: the first water ingredient of the dough. */
export const absorbingWater = (formula: Formula) =>
  formula.ingredients.find((i) => i.kind === 'water' && i.role === 'dough')?.id;

/**
 * Hydration (formula.md): total water in % of the flour, every water-bearing ingredient counted.
 * Typing a value locks total water there (`LockTotalWater`, the added water absorbing changes);
 * the lock icon locks at the current value or unlocks. A formula without a dough water ingredient
 * has nothing to absorb a target, so its hydration is shown, not edited.
 */
export const Hydration = forwardRef<
  HTMLDivElement,
  {
    formula: Formula;
    resolved: ResolvedFormula;
    onEdit: (edit: FormulaEdit) => boolean;
    /** Opens the breakdown of where the water comes from. */
    onExplain: () => void;
  }
>(({ formula, resolved, onEdit, onExplain }, ref) => {
  const { t, wholePct } = useMessages();
  const target = formula.waterTarget;
  const water = target?.absorbInto ?? absorbingWater(formula);
  const label = t('formula.stat.hydration');
  const estimate = totalWaterKey(resolved.totalWater) === 'formula.stat.totalWaterEstimate';
  const shown = t(totalWaterKey(resolved.totalWater), { pct: wholePct(resolved.totalWaterPct) });
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={label}
      className="flex flex-col gap-1 rounded-lg border-t border-line pt-3 outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-semibold">
          {label}
          <InfoButton topic="hydration" term={label} />
        </span>
        {water ? (
          <span className="flex items-center gap-1.5">
            {estimate && (
              <span className="text-lg font-bold" aria-hidden="true">
                ≈
              </span>
            )}
            <NumberField
              label={label}
              unit="%"
              size="large"
              width="7.5rem"
              value={target?.totalWaterPct ?? resolved.totalWaterPct}
              maximumFractionDigits={0}
              onCommit={(value) => onEdit({ type: 'LockTotalWater', totalWaterPct: value, water })}
            />
            <button
              type="button"
              aria-pressed={target !== undefined}
              aria-label={
                target ? t('formula.hydration.unlock') : t('formula.hydration.lock', { pct: shown })
              }
              title={
                target ? t('formula.hydration.unlock') : t('formula.hydration.lock', { pct: shown })
              }
              className={`fp-reset inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors motion-reduce:transition-none ${
                target
                  ? 'bg-accent text-on-accent'
                  : 'border border-line bg-surface text-muted hover:border-field'
              }`}
              onClick={() =>
                void onEdit(
                  target
                    ? { type: 'UnlockTotalWater' }
                    : { type: 'LockTotalWater', totalWaterPct: resolved.totalWaterPct, water },
                )
              }
            >
              <LockIcon locked={target !== undefined} />
            </button>
          </span>
        ) : (
          <span className="text-xl font-bold">{shown}</span>
        )}
      </div>
      <button
        type="button"
        className="fp-reset self-start text-sm text-accent-text underline decoration-dotted underline-offset-4"
        onClick={onExplain}
      >
        {t('formula.hydration.breakdown')}
      </button>
    </div>
  );
});

/** Adds an ingredient: a common one with its composition, or any name with its water content. */
export const AddIngredient = ({
  formula,
  onEdit,
}: {
  formula: Formula;
  onEdit: (edit: FormulaEdit) => boolean;
}) => {
  const { t, name } = useMessages();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [custom, setCustom] = useState('');
  const [water, setWater] = useState('');
  const taken = new Set([
    ...formula.flours.map((f) => f.id),
    ...formula.ingredients.map((i) => i.id),
    ...formula.components.map((c) => c.id),
  ]);
  const presets = INGREDIENT_PRESETS.filter((p) => !taken.has(p.id));

  if (!open) {
    return (
      <button
        type="button"
        className="fp-reset min-h-12 w-full px-4 text-left font-semibold text-accent-text"
        onClick={() => setOpen(true)}
      >
        {t('formula.add.ingredient')}
      </button>
    );
  }

  const add = () => {
    const preset = presets.find((p) => p.id === choice);
    const customName = custom.trim();
    const waterPct = water.trim() === '' ? undefined : parseDecimal(water);
    const ingredient = preset
      ? { id: preset.id, bakerPct: 0, ...preset.ingredient }
      : {
          id: customName,
          kind: 'other' as const,
          bakerPct: 0,
          role: 'dough' as const,
          ...(waterPct === undefined
            ? {}
            : { water: { status: 'known' as const, valuePct: waterPct, source: 'user' } }),
        };
    if (!ingredient.id || taken.has(ingredient.id)) return;
    if (onEdit({ type: 'AddIngredient', ingredient })) {
      setOpen(false);
      setChoice('');
      setCustom('');
      setWater('');
    }
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <label htmlFor={`${id}-choice`} className="text-sm font-semibold">
        {t('formula.add.ingredient')}
      </label>
      <select
        id={`${id}-choice`}
        className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2"
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="">{t('formula.add.other')}</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {name(p.id)}
          </option>
        ))}
      </select>
      {choice === '' && (
        <>
          <input
            aria-label={t('formula.add.name')}
            placeholder={t('formula.add.name')}
            className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2.5"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
          />
          <input
            aria-label={t('formula.add.water')}
            placeholder={t('formula.add.water')}
            inputMode="decimal"
            className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2.5"
            value={water}
            onChange={(event) => setWater(event.target.value)}
          />
        </>
      )}
      <span className="text-sm text-muted">{t('formula.add.hint')}</span>
      <span className="flex gap-2">
        <IonButton onClick={add} disabled={choice === '' && custom.trim() === ''}>
          {t('formula.add.confirm')}
        </IonButton>
        <IonButton fill="outline" onClick={() => setOpen(false)}>
          {t('formula.add.cancel')}
        </IonButton>
      </span>
    </div>
  );
};

/**
 * Adds a flour to the blend at 0 %, picked from the registry (personal entries not archived, then
 * built-in ones; flours.md) or typed as a free name. The blend no longer adds up to 100 % until the shares are
 * set, which a draft allows and the recipe check reports (drafts.md).
 */
export const AddFlour = ({
  formula,
  onEdit,
}: {
  formula: Formula;
  onEdit: (edit: FormulaEdit) => boolean;
}) => {
  const { t, flourName } = useMessages();
  const catalog = useFlourCatalog();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [custom, setCustom] = useState('');
  const taken = new Set([
    ...formula.flours.map((f) => f.id),
    ...formula.ingredients.map((i) => i.id),
    ...formula.components.map((c) => c.id),
  ]);
  const byName = (a: FlourEntry, b: FlourEntry) => flourName(a).localeCompare(flourName(b));
  const personal = catalog.personal.filter((f) => !f.archived && !taken.has(f.id)).sort(byName);
  const builtIn = OFFERED_BUILT_IN_FLOURS.filter((f) => !taken.has(f.id));
  if (!open) {
    return (
      <button
        type="button"
        className="fp-reset min-h-12 w-full px-4 text-left font-semibold text-accent-text"
        onClick={() => setOpen(true)}
      >
        {t('formula.add.flour')}
      </button>
    );
  }
  const flourId = choice || custom.trim();
  const add = () => {
    if (!flourId || taken.has(flourId)) return;
    if (
      onEdit({ type: 'SetFlourBlend', flours: [...formula.flours, { id: flourId, sharePct: 0 }] })
    ) {
      setOpen(false);
      setChoice('');
      setCustom('');
    }
  };
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <label htmlFor={`${id}-flour`} className="text-sm font-semibold">
        {t('formula.add.flour')}
      </label>
      <select
        id={`${id}-flour`}
        className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2"
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="">{t('formula.add.other')}</option>
        {personal.length > 0 && (
          <optgroup label={t('flours.personal')}>
            {personal.map((f) => (
              <option key={f.id} value={f.id}>
                {flourName(f)}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={t('flours.builtIn')}>
          {builtIn.map((f) => (
            <option key={f.id} value={f.id}>
              {flourName(f)}
            </option>
          ))}
        </optgroup>
      </select>
      {choice === '' && (
        <input
          aria-label={t('formula.add.name')}
          placeholder={t('formula.add.name')}
          className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2.5"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
      )}
      <span className="text-sm text-muted">{t('formula.add.flourHint')}</span>
      <span className="flex gap-2">
        <IonButton onClick={add} disabled={!flourId}>
          {t('formula.add.confirm')}
        </IonButton>
        <IonButton fill="outline" onClick={() => setOpen(false)}>
          {t('formula.add.cancel')}
        </IonButton>
      </span>
    </div>
  );
};

/** Buttons that add a preparation and the step that makes it. */
export const AddPreparation = ({
  formula,
  process,
  onStructure,
}: {
  formula: Formula;
  process: Process;
  onStructure: StructureEdit;
}) => {
  const { t } = useMessages();
  const add = (kind: PreparationKind) => {
    const component = newPreparation(formula, process, kind);
    onStructure({ type: 'AddComponent', component }, withPreparationStep(process, component));
  };
  return (
    <span className="flex flex-wrap gap-2">
      <IonButton fill="outline" size="small" onClick={() => add('poolish')}>
        {t('formula.add.poolish')}
      </IonButton>
      <IonButton fill="outline" size="small" onClick={() => add('tangzhong')}>
        {t('formula.add.tangzhong')}
      </IonButton>
    </span>
  );
};

/** Flour share and hydration of a preparation, and its removal with its step. */
export const PreparationFields = ({
  formula,
  process,
  componentId,
  onEdit,
  onStructure,
}: {
  formula: Formula;
  process: Process;
  componentId: string;
  onEdit: (edit: FormulaEdit) => boolean;
  onStructure: StructureEdit;
}) => {
  const { t, componentName } = useMessages();
  const component = formula.components.find((c) => c.id === componentId);
  if (!component) return null;
  const label = componentName(formula, component);
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-2">
      <span className="flex items-center justify-between gap-3">
        <span>{t('formula.prep.flourField')}</span>
        <NumberField
          label={`${label}, ${t('formula.prep.flourField')}`}
          unit="%"
          width="7rem"
          value={component.flourPct}
          onCommit={(flourPct) =>
            onEdit({ type: 'UpdateComponent', component: component.id, changes: { flourPct } })
          }
        />
      </span>
      <span className="flex items-center justify-between gap-3">
        <span>{t('formula.prep.hydrationField')}</span>
        <NumberField
          label={`${label}, ${t('formula.prep.hydrationField')}`}
          unit="%"
          width="7rem"
          value={component.hydrationPct}
          onCommit={(hydrationPct) =>
            onEdit({ type: 'UpdateComponent', component: component.id, changes: { hydrationPct } })
          }
        />
      </span>
      {(() => {
        const ratioParts = liquidMassRatio(component);
        return ratioParts !== undefined ? (
          <div className="flex flex-col gap-1">
            <span className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span>{t('component.ratioLabel')}</span>
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true">1:</span>
                <NumberField
                  label={`${label}, ${t('component.ratioLabel')}`}
                  width="7rem"
                  value={ratioParts}
                  invalidText={t('component.ratioRejected')}
                  onCommit={(parts) => {
                    const res = hydrationForRatio(component, parts);
                    if (res.ok) {
                      return onEdit({
                        type: 'UpdateComponent',
                        component: component.id,
                        changes: { hydrationPct: res.value },
                      });
                    }
                    return false;
                  }}
                />
              </span>
            </span>
            <span className="text-[11px] text-muted">{t('component.ratioBasisDesc')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted">{t('component.ratioLabel')}</span>
            <span className="text-xs text-muted">{t('component.ratioUnknown')}</span>
          </div>
        );
      })()}
      <button
        type="button"
        aria-label={t('formula.removeNamed', { name: label })}
        className="fp-reset min-h-11 self-start text-[13px] text-muted underline"
        onClick={() =>
          onStructure(
            { type: 'RemoveComponent', component: component.id },
            removeStep(process, component.id),
          )
        }
      >
        {t('formula.remove')}
      </button>
    </div>
  );
};

/** What the draft changes against the saved version, before saving it. */
export const ChangesSummary = ({ base, formula }: { base: Formula; formula: Formula }) => {
  const { t, name, pct, componentName } = useMessages();
  const changes = formulaChanges(base, formula);
  if (changes.length === 0) return null;
  const label = (item: string, id: string) => {
    if (item !== 'component') return name(id);
    const inDraft = formula.components.find((c) => c.id === id);
    if (inDraft) return componentName(formula, inDraft);
    const inBase = base.components.find((c) => c.id === id);
    return inBase ? componentName(base, inBase) : id;
  };
  return (
    <Card gap="gap-1.5">
      <span className="font-semibold">{t('formula.changes.title')}</span>
      <ul className="m-0 flex flex-col gap-1 pl-5 text-[15px]">
        {changes.map((change, index) => (
          <li key={index}>
            {change.kind === 'added'
              ? t('formula.changes.added', { name: label(change.item, change.id) })
              : change.kind === 'removed'
                ? t('formula.changes.removed', { name: label(change.item, change.id) })
                : change.kind === 'changed'
                  ? t('formula.changes.changed', {
                      name: label(change.item, change.id),
                      field: t(
                        `formula.changes.field.${change.field}` as 'formula.changes.field.bakerPct',
                      ),
                      before: pct(change.before),
                      after: pct(change.after),
                    })
                  : change.kind === 'lock'
                    ? change.after === undefined
                      ? t('formula.changes.unlocked')
                      : t('formula.changes.locked', { pct: pct(change.after) })
                    : t('formula.changes.anchor')}
          </li>
        ))}
      </ul>
    </Card>
  );
};

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d={locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} />
  </svg>
);
