import { IonButton } from '@ionic/react';
import { useId, useState } from 'react';
import {
  INGREDIENT_PRESETS,
  removeStep,
  type Formula,
  type FormulaEdit,
  type Process,
  type ResolvedFormula,
} from '@flourprint/core/domain';
import { parseDecimal } from '../i18n/numbers';
import { formatDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { formulaChanges } from '../services/formula-changes';
import {
  newPreparation,
  withPreparationStep,
  type PreparationKind,
} from '../services/preparations';
import { recipeDuration } from '../services/recipe-duration';
import { NumberField } from '../ui/Field';
import { Card } from '../ui/Layout';
import { totalWaterKey } from './water-label';

/** Structure edits of the formula tab (formula.md, Structure edits and Locked total water). */

export type StructureEdit = (edit: FormulaEdit, process?: Process) => boolean;

/** The water absorbing a lock: the first water ingredient of the dough. */
const absorbingWater = (formula: Formula) =>
  formula.ingredients.find((i) => i.kind === 'water' && i.role === 'dough')?.id;

/**
 * Total water, with a lock: unlocked, it follows the ingredients; locked, the target holds and the
 * added water follows (eggs or milk lower it).
 */
export const WaterLock = ({
  formula,
  resolved,
  onEdit,
}: {
  formula: Formula;
  resolved: ResolvedFormula;
  onEdit: (edit: FormulaEdit) => boolean;
}) => {
  const { t, pct } = useMessages();
  const water = absorbingWater(formula);
  if (!water) return null;
  const target = formula.waterTarget;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
      <span className="flex flex-col">
        <span className="font-semibold">
          {target ? t('formula.lock.locked') : t('formula.lock.unlocked')}
        </span>
        <span className="text-sm text-muted">
          {target ? t('formula.lock.lockedHint') : t('formula.lock.unlockedHint')}
        </span>
      </span>
      {target ? (
        <span className="flex items-center gap-2">
          <NumberField
            label={t('formula.lock.target')}
            unit="%"
            width="6.5rem"
            value={target.totalWaterPct}
            onCommit={(value) =>
              onEdit({ type: 'LockTotalWater', totalWaterPct: value, water: target.absorbInto })
            }
          />
          <IonButton fill="clear" onClick={() => onEdit({ type: 'UnlockTotalWater' })}>
            <LockIcon locked={false} />
            <span className="ml-1">{t('formula.lock.unlockShort')}</span>
          </IonButton>
        </span>
      ) : (
        <IonButton
          fill="outline"
          className="shrink-0"
          onClick={() =>
            onEdit({ type: 'LockTotalWater', totalWaterPct: resolved.totalWaterPct, water })
          }
        >
          <LockIcon locked />
          <span className="ml-1">
            {t('formula.lock.lock', {
              pct: t(totalWaterKey(resolved.totalWater), { pct: pct(resolved.totalWaterPct) }),
            })}
          </span>
        </IonButton>
      )}
    </div>
  );
};

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
      <button
        type="button"
        className="fp-reset min-h-11 self-start text-sm font-semibold text-alert"
        onClick={() =>
          onStructure(
            { type: 'RemoveComponent', component: component.id },
            removeStep(process, component.id),
          )
        }
      >
        {t('formula.prep.remove', { name: label })}
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

const FERMENTATION_OPERATIONS = new Set(['preferment', 'bulk', 'retard', 'proof']);

/** The recipe's times at a glance: total and each fermentation step, unknown ones named. */
export const TimeSummary = ({ process, now }: { process: Process; now: string }) => {
  const { t, stepName } = useMessages();
  const length = recipeDuration(process, now as Parameters<typeof recipeDuration>[1]);
  const total =
    length.kind === 'complete'
      ? formatDuration(length.seconds)
      : length.kind === 'atLeast'
        ? t('recipes.card.durationAtLeast', { duration: formatDuration(length.seconds) })
        : t('formula.time.unknown');
  const steps = process.steps.filter((s) => FERMENTATION_OPERATIONS.has(s.operation));
  return (
    <Card gap="gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{t('formula.time.title')}</span>
        <span className="text-lg font-bold">{total}</span>
      </span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px]">
        {steps.map((step) => (
          <li key={step.id} className="flex justify-between gap-3">
            <span>{stepName(step)}</span>
            <span className={step.plannedDurationS === undefined ? 'text-muted' : 'font-semibold'}>
              {step.plannedDurationS === undefined
                ? t('formula.time.stepUnknown')
                : formatDuration(step.plannedDurationS)}
              {step.conditions?.temperatureC === undefined
                ? ''
                : ` · ${step.conditions.temperatureC} °C`}
            </span>
          </li>
        ))}
      </ul>
      <span className="text-sm text-muted">{t('formula.time.notPredicted')}</span>
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
