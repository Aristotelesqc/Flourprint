import { Ui } from './library';
import { catalogText, curatedText } from './template-presentation';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  duplicateStep,
  insertStepAfter,
  moveStep,
  removeStep,
  intendedOutcome,
  subjectOf,
  OVEN_MODES,
  COOKING_OPERATIONS,
  type ProcessStep,
  type Process,
  type OvenMode,
  type DomainError,
  type MoveResult,
  type DuplicateResult,
  type Projection,
  type StepId,
} from '@flourprint/core/domain';
import { ProcessChangePreview } from './ProcessChangePreview';
import { StepRow, StatusPanel } from './components';
import {
  Button,
  Tabs,
  Icon,
  IconButton,
  NumberField,
  Modal,
  Disclosure,
  Surface,
  Menu,
  CompactDialog,
} from './ui';
import {
  type Prototype,
  type Content,
  project,
  diagnosticFixture,
  diagnosticContent,
  clone,
} from './model';
import {
  t,
  duration,
  num,
  operationName,
  time,
  colon,
  type Locale,
  type MessageKey,
} from './messages';
import { componentDisplayName } from './RecipeView';
import { stepCopy } from './steps-copy';
import { editingCopyT } from './editing-copy';
import { DragHandle, useStepDrag } from './StepDrag';
import { DependencyEditor } from './DependencyEditor';
import {
  formatTemperatureForStep,
  getTemperatureUnit,
  celsiusTo,
  parseTemperature,
  useDevicePreferences,
  temperatureContext,
} from './device-preferences';
import './step-drag.css';

export const operationIcon = (operation: string): import('./ui').IconName =>
  ['bake', 'scald', 'boil', 'preheat'].includes(operation)
    ? 'oven'
    : ['bulk', 'proof', 'retard', 'preferment'].includes(operation)
      ? 'clock'
      : ['mix', 'knead', 'fold', 'shape'].includes(operation)
        ? 'ingredient'
        : 'temperature';

export const titleOf = (step: ProcessStep, locale: Locale) =>
  curatedText(locale, step.label) ?? step.label ?? operationName(locale, step.operation);

const refusalKey = (error: DomainError): MessageKey => {
  const reason =
    error.details && typeof error.details === 'object' && 'reason' in error.details
      ? String(error.details.reason)
      : '';
  if (error.code === 'MoveBreaksDependencies') return 'changeBreaksDependencies';
  if (error.code === 'UnknownReference') return 'changeStale';
  if (error.code === 'NotDuplicable')
    return reason === 'workpieceStep' ? 'changeCopyComponentRefused' : 'changeCopyScheduleRefused';
  const reasons: Readonly<Record<string, MessageKey>> = {
    incorporationStep: 'changeIncorporationRefused',
    crossesWorkpiece: 'changeSubjectRefused',
    stepDependencies: 'changeBranchRefused',
    stepDependents: 'changeBranchRefused',
    targetDependents: 'changeBranchRefused',
  };
  return reasons[reason] ?? 'invalidPlan';
};

const operations = [
  'scald',
  'preferment',
  'autolyse',
  'mix',
  'bulk',
  'fold',
  'divide',
  'shape',
  'proof',
  'retard',
  'preheat',
  ...COOKING_OPERATIONS,
  'cool',
  'rest',
];

export function StepEditor({
  step,
  process,
  locale,
  onClose,
  onApply,
  title,
  blocked = false,
  review,
}: {
  step: ProcessStep;
  process: Process;
  locale: Locale;
  onClose: () => void;
  onApply: (step: ProcessStep) => boolean;
  title?: string;
  blocked?: boolean;
  review?: (candidate: ProcessStep) => ReactNode;
}) {
  useDevicePreferences();
  const [draft, setDraft] = useState(() => clone(step));
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(false);

  const condContext = temperatureContext(draft);
  const condUnit = getTemperatureUnit(condContext);
  const condDisplay =
    draft.conditions?.temperatureC !== undefined
      ? celsiusTo(draft.conditions.temperatureC, condUnit)
      : NaN;

  const equipContext = draft.equipment?.appliance === 'proofer' ? 'ambient' : 'oven';
  const equipUnit = getTemperatureUnit(equipContext);
  const equipDisplay =
    draft.equipment?.setpointC !== undefined
      ? celsiusTo(draft.equipment.setpointC, equipUnit)
      : NaN;

  const field = (
    id: string,
    value: number,
    label: string,
    unit: string,
    change: (v: number) => void,
    onClear?: () => boolean,
  ) => (
    <NumberField
      key={id}
      value={value}
      label={label}
      unit={unit}
      locale={locale}
      errorMessage={t(locale, 'invalid')}
      onCommit={(v) => {
        change(v);
        return true;
      }}
      onClear={onClear}
      onValidityChange={(bad) => setInvalid((s) => (s[id] === bad ? s : { ...s, [id]: bad }))}
    />
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={title ?? t(locale, 'editStep')}
      closeLabel={t(locale, 'close')}
      footer={
        <Button
          variant="primary"
          disabled={blocked || Object.values(invalid).some(Boolean)}
          onClick={() => {
            if (onApply(draft)) onClose();
            else setError(true);
          }}
        >
          {t(locale, 'apply')}
        </Button>
      }
    >
      <div className="stack">
        {review?.(draft)}
        <label className="field-label">
          {t(locale, 'type')}
          <select
            value={draft.operation}
            onChange={(e) => setDraft({ ...draft, operation: e.target.value })}
          >
            {operations.map((op) => (
              <option value={op} key={op}>
                {operationName(locale, op)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          {t(locale, 'name')}
          <input
            value={curatedText(locale, draft.label) ?? draft.label ?? ''}
            onChange={(e) => setDraft({ ...draft, label: e.target.value || undefined })}
          />
        </label>
        <label className="field-label">
          {t(locale, 'durationMode')}
          <select
            value={draft.plannedDurationS === undefined ? 'unknown' : 'manual'}
            disabled={Boolean(invalid.duration)}
            onChange={(e) =>
              setDraft({
                ...draft,
                plannedDurationS: e.target.value === 'unknown' ? undefined : 600,
                durationMode: 'manual',
                accepted: undefined,
              })
            }
          >
            <option value="manual">{t(locale, 'manual')}</option>
            <option value="unknown">{t(locale, 'unknownDuration')}</option>
          </select>
        </label>
        {draft.plannedDurationS !== undefined &&
          field('duration', draft.plannedDurationS / 60, t(locale, 'duration'), 'min', (v) =>
            setDraft({
              ...draft,
              plannedDurationS: v * 60,
              durationMode: 'manual',
              accepted: undefined,
            }),
          )}
        {field(
          'ambient-temperature',
          condDisplay,
          t(locale, 'temperature'),
          `°${condUnit}`,
          (value) => {
            const c = parseTemperature(value, condContext);
            setDraft({ ...draft, conditions: { ...draft.conditions, temperatureC: c } });
          },
          () => {
            const nextCond = { ...draft.conditions };
            delete nextCond.temperatureC;
            setDraft({
              ...draft,
              conditions: Object.keys(nextCond).length ? nextCond : undefined,
            });
            return true;
          },
        )}
        <label className="field-label">
          {t(locale, 'location')}
          <input
            value={draft.conditions?.location ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                conditions: { ...draft.conditions, location: e.target.value || undefined },
              })
            }
          />
        </label>
        <label className="field-label">
          {t(locale, 'technique')}
          <input
            value={draft.technique?.method ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                technique: { ...draft.technique, method: e.target.value || undefined },
              })
            }
          />
        </label>
        <fieldset>
          <legend>{t(locale, 'dependencies')}</legend>
          <label className="field-label">
            {t(locale, 'schedule')}
            <select
              value={draft.schedule}
              onChange={(e) =>
                setDraft({ ...draft, schedule: e.target.value as ProcessStep['schedule'] })
              }
            >
              <option value="asap">{t(locale, 'asap')}</option>
              <option value="alap">{t(locale, 'alap')}</option>
            </select>
          </label>
          {draft.dependsOn.length > 0 && (
            <p className="muted" style={{ margin: 0 }}>
              {t(locale, 'dependencies')}
              {colon(locale)}
              {draft.dependsOn
                .map((id) => {
                  const s = process.steps.find((st) => st.id === id);
                  return s ? titleOf(s, locale) : id;
                })
                .join(', ')}
            </p>
          )}
        </fieldset>
        <Disclosure title={t(locale, 'equipment')} defaultOpen={step.operation === 'bake'}>
          <label className="field-label">
            {t(locale, 'mode')}
            <select
              value={draft.equipment?.mode ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  equipment: {
                    ...draft.equipment,
                    appliance: 'oven',
                    mode: e.target.value ? (e.target.value as OvenMode) : undefined,
                  },
                })
              }
            >
              <option value="">{t(locale, 'optional')}</option>
              {OVEN_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {modeLabel(locale, mode)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {t(locale, 'steam')}
            <select
              value={draft.equipment?.steam?.source ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  equipment: {
                    ...draft.equipment,
                    steam: e.target.value
                      ? { source: e.target.value as 'none' | 'manual' | 'function' }
                      : undefined,
                  },
                })
              }
            >
              <option value="">{t(locale, 'optional')}</option>
              {(['none', 'manual', 'function'] as const).map((source) => (
                <option value={source} key={source}>
                  {t(
                    locale,
                    source === 'none'
                      ? 'steamNone'
                      : source === 'manual'
                        ? 'steamManual'
                        : 'steamFunction',
                  )}
                </option>
              ))}
            </select>
          </label>
          {field(
            'setpoint',
            equipDisplay,
            t(locale, 'setpoint'),
            `°${equipUnit}`,
            (v) => {
              const c = parseTemperature(v, equipContext);
              setDraft({ ...draft, equipment: { ...draft.equipment, setpointC: c } });
            },
            () => {
              if (!draft.equipment) return true;
              const nextEquip = { ...draft.equipment };
              delete nextEquip.setpointC;
              setDraft({ ...draft, equipment: nextEquip });
              return true;
            },
          )}
        </Disclosure>
        {error && (
          <p role="alert" className="warning">
            {t(locale, 'invalidPlan')}
          </p>
        )}
      </div>
    </Modal>
  );
}

export const modeLabel = (locale: Locale, mode: string) =>
  catalogText(locale, `mode.${mode}.name`) ?? catalogText(locale, `equipment.mode.${mode}`) ?? mode;

export function stepDetails(step: ProcessStep, locale: Locale): string[] {
  const tempLabel = stepCopy(locale, 'temperature');
  const colonSep = colon(locale);
  return [
    duration(locale, step.plannedDurationS),
    ...(step.conditions?.temperatureC !== undefined
      ? [
          `${tempLabel}${colonSep}${formatTemperatureForStep(step, step.conditions.temperatureC, locale)}`,
        ]
      : []),
    ...(step.equipment?.mode ? [modeLabel(locale, step.equipment.mode)] : []),
    ...(step.equipment?.steam
      ? [
          t(
            locale,
            step.equipment.steam.source === 'none'
              ? 'steamNone'
              : step.equipment.steam.source === 'manual'
                ? 'steamManual'
                : 'steamFunction',
          ),
        ]
      : []),
  ];
}

export function Diagnostics({ store, locale }: { store: Prototype; locale: Locale }) {
  const scenario = new URLSearchParams(location.search).get('scenario') ?? 'recipe';
  const diagnosticInput = diagnosticContent(scenario, store.content);
  const estimate = diagnosticFixture(scenario, store.content).dough;
  const direct = estimate.duration;
  const candidate = Object.entries(estimate.yeastPct).find(([, v]) => v.status === 'ok');
  const validity = t(
    locale,
    direct.status === 'ok'
      ? direct.extrapolations?.length
        ? 'extrapolated'
        : 'valid'
      : direct.status === 'out_of_domain'
        ? 'outOfDomain'
        : 'noResult',
  );
  return (
    <Disclosure
      title={t(locale, 'diagnostics')}
      subtitle={validity}
      status={direct.status === 'ok' && !direct.extrapolations?.length ? 'success' : 'warning'}
      defaultOpen={new URLSearchParams(location.search).get('diagnostics') === '1'}
    >
      <div className="stack">
        <StatusPanel
          embedded
          title={t(locale, 'diagnostics')}
          status={
            direct.status === 'ok'
              ? direct.extrapolations?.length
                ? 'warning'
                : 'ok'
              : direct.status === 'out_of_domain'
                ? 'warning'
                : 'unavailable'
          }
          message={validity}
        >
          {direct.status === 'ok' && (
            <div className="stack">
              <strong>
                {t(locale, 'estimate')} : {duration(locale, direct.value)}
              </strong>
              {direct.range && (
                <p>
                  {t(locale, 'modelRange')} :{' '}
                  {direct.range
                    .map((bound) =>
                      bound.kind === 'finite'
                        ? duration(locale, bound.value)
                        : `> ${duration(locale, bound.horizonS)}`,
                    )
                    .join(' – ')}
                </p>
              )}
              {direct.extrapolations && direct.extrapolations.length > 0 && (
                <ul className="muted">
                  {direct.extrapolations.map((extra) => (
                    <li key={extra}>
                      {catalogText(locale, `fermentation.extra.${extra}`) ?? extra}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {direct.status !== 'ok' && (
            <p>
              {catalogText(locale, `fermentation.reason.${direct.reason}`) ??
                (direct.status === 'out_of_domain'
                  ? t(locale, 'outOfDomain')
                  : t(locale, 'noResult'))}
            </p>
          )}
          <p>{t(locale, 'readyTarget')}</p>
          <p>{t(locale, 'modelLimits')}</p>
          {diagnosticInput.formula.ingredients
            .filter((i) => i.yeast)
            .map((i) => (
              <p key={i.id}>
                {t(locale, 'currentDose')} ·{' '}
                {catalogText(locale, `fermentation.form.${i.yeast?.form}`) ?? i.yeast?.form}
                {colon(locale)}
                {num(locale, i.bakerPct, 3)} {t(locale, 'bakerPct')}
              </p>
            ))}
          <p className="muted">{t(locale, 'freshBasis')}</p>
          {candidate && candidate[1].status === 'ok' && (
            <Surface>
              <strong>
                {t(locale, 'candidate')}
                {colon(locale)}
                {num(locale, candidate[1].value, 3)} {t(locale, 'bakerPct')}
              </strong>
              {scenario === 'recipe' && (
                <p>
                  {t(locale, 'currentRecipe')}
                  {colon(locale)}
                  {num(
                    locale,
                    store.content.formula.ingredients.find((i) => i.id === candidate[0])
                      ?.bakerPct ?? 0,
                    3,
                  )}{' '}
                  {t(locale, 'bakerPct')}
                </p>
              )}
              {store.state.draft && scenario === 'recipe' && (
                <Button
                  onClick={() => {
                    const suggestion = candidate[1];
                    if (suggestion.status !== 'ok') return;
                    store.apply({
                      type: 'SetBakerPct',
                      ingredient: candidate[0],
                      pct: suggestion.value,
                      accepted: {
                        estimate: suggestion,
                        appliedValue: suggestion.value,
                        model: suggestion.model,
                      },
                    });
                  }}
                >
                  {t(locale, 'applyCandidate')}
                </Button>
              )}
            </Surface>
          )}
          <Disclosure title={t(locale, 'assumptions')}>
            <code>
              {direct.model?.id} {direct.model?.version}
            </code>
            <p>{t(locale, 'modelLimits')}</p>
            {direct.status === 'ok' && (
              <ul>
                {[
                  ...new Set(
                    direct.assumptions.map((code) =>
                      code.startsWith('ready_target_progress:')
                        ? t(locale, 'assumptionReadiness')
                        : code.startsWith('step_without_duration:')
                          ? t(locale, 'assumptionUnplanned')
                          : (catalogText(locale, `fermentation.note.${code}`) ??
                            t(
                              locale,
                              (
                                {
                                  dough_temperature_from_ambient: 'assumptionAmbient',
                                  dough_temperature_target: 'assumptionTarget',
                                  readiness_default: 'assumptionDefault',
                                  band_unbounded: 'assumptionUnbounded',
                                  band_outside_domain: 'assumptionBand',
                                  end_point_before_last_step: 'assumptionEarly',
                                } as Record<string, MessageKey>
                              )[code] ?? 'modelLimits',
                            )),
                    ),
                  ),
                ].map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
            {scenario !== 'recipe' && (
              <p>
                {t(locale, 'preview')} · {t(locale, 'blank')}
              </p>
            )}
          </Disclosure>
        </StatusPanel>
      </div>
    </Disclosure>
  );
}

export function ProcessView({
  store,
  locale,
  planning = false,
  editingStepId,
  onClearEditingStepId,
  onModifyStep,
  returnToPlanning,
  collapsedGroups = {},
  onToggleGroup,
}: {
  store: Prototype;
  locale: Locale;
  planning?: boolean;
  editingStepId?: string | null;
  onClearEditingStepId?: () => void;
  onModifyStep?: (stepId: string) => void;
  returnToPlanning?: () => void;
  collapsedGroups?: Record<string, boolean>;
  onToggleGroup?: (groupId: string, open: boolean) => void;
}) {
  useDevicePreferences();
  const [view, setView] = useState(
    new URLSearchParams(typeof location !== 'undefined' ? location.search : '').get('view') ===
      'timeline'
      ? 'timeline'
      : 'grouped',
  );

  const stepDesign = (new URLSearchParams(
    typeof location !== 'undefined' ? location.search : '',
  ).get('stepDesign') || 'compact') as 'compact' | 'rail' | 'outline';

  const [editing, setEditing] = useState<ProcessStep | null>(() =>
    store.state.draft &&
    (new URLSearchParams(typeof location !== 'undefined' ? location.search : '').get('section') ??
      'steps') === (planning ? 'planning' : 'steps')
      ? (store.content.process.steps.find(
          (s) =>
            s.id ===
            new URLSearchParams(typeof location !== 'undefined' ? location.search : '').get('step'),
        ) ?? null)
      : null,
  );

  useEffect(() => {
    if (editingStepId && !planning) {
      const stepToEdit = store.content.process.steps.find((s) => s.id === editingStepId);
      if (stepToEdit) {
        setEditing(stepToEdit);
        onClearEditingStepId?.();
        requestAnimationFrame(() => {
          const el = rootRef.current?.querySelector<HTMLElement>(
            `[data-step-id="${editingStepId}"]`,
          );
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      }
    }
  }, [editingStepId, planning, onClearEditingStepId]);

  const [removing, setRemoving] = useState<string | null>(null);
  const [menuOpenStepId, setMenuOpenStepId] = useState<string | null>(null);
  const [dependencyEditingStep, setDependencyEditingStep] = useState<ProcessStep | null>(null);

  // Explicit component association mapping for display (L72)
  const [stepComponentMap, setStepComponentMap] = useState<Record<string, string>>({});

  const [proposal, setProposal] = useState<{
    source: Process;
    result: MoveResult;
    stepId: string;
  } | null>(null);

  const [duplication, setDuplication] = useState<{
    source: Process;
    result: DuplicateResult;
    originalComponentId?: string;
  } | null>(null);

  const [refusal, setRefusal] = useState<{ stepId: string; error: DomainError } | null>(null);
  const { process } = store.content;
  const rootRef = useRef<HTMLDivElement>(null);
  const focusTargetRef = useRef<{ id: string; type: 'menu' | 'drag' } | null>(null);
  useEffect(() => {
    if (removing) focusTargetRef.current = { id: removing, type: 'menu' };
    else if (refusal) focusTargetRef.current = { id: refusal.stepId, type: 'drag' };
    else if (focusTargetRef.current) {
      const { id, type } = focusTargetRef.current;
      focusTargetRef.current = null;
      const sel =
        type === 'menu'
          ? `[data-testid="step-menu-${id}"]`
          : `[data-step-id="${id}"] .fp-drag-handle`;
      rootRef.current?.querySelector<HTMLElement>(sel)?.focus();
    }
  }, [removing, refusal, proposal, process]);
  const [announcement, setAnnouncement] = useState('');
  const [at, setAt] = useState('2026-10-16T08:00');

  const [planDirection, setPlanDirection] = useState<'startAt' | 'readyBy'>('startAt');
  const [targetStep, setTargetStep] = useState(process.steps.at(-1)?.id ?? '');
  const effectiveTarget = process.steps.some((step) => step.id === targetStep)
    ? targetStep
    : (process.steps.at(-1)?.id ?? '');

  const projection = project(
    process,
    at,
    undefined,
    planning && planDirection === 'readyBy' ? effectiveTarget : undefined,
  );
  const times = projection.ok ? Object.values(projection.value.steps) : [];
  const starts = times.flatMap((s) => (s.start ? [Date.parse(s.start)] : [])),
    ends = times.flatMap((s) => (s.end ? [Date.parse(s.end)] : []));
  const full = times.length > 0 && times.every((s) => s.start && s.end);

  const formatWindow = (steps: ProcessStep[], plan: Projection | undefined, dated = false) => {
    const values = plan ? steps.flatMap((s) => (plan.steps[s.id] ? [plan.steps[s.id]] : [])) : [];
    if (!values.length || values.length !== steps.length || values.some((v) => !v.start || !v.end))
      return t(locale, 'unknownDuration');
    const start = Math.min(...values.map((v) => Date.parse(v.start ?? ''))),
      end = Math.max(...values.map((v) => Date.parse(v.end ?? '')));
    const moment = (value: number) =>
      (dated ? dateTime : time)(locale, new Date(value).toISOString());
    return `${duration(locale, (end - start) / 1000)} · ${moment(start)} → ${moment(end)} · ${steps.length} ${t(locale, 'stepsTab')}`;
  };

  const windowLabel = (steps: ProcessStep[]) =>
    formatWindow(steps, projection.ok ? projection.value : undefined);

  // Group classification using core subjectOf + explicit display association (L72)
  const getStepComponentId = (step: ProcessStep): string | null => {
    const subj = subjectOf(process, step);
    if (subj.kind === 'component') return subj.id;
    if (stepComponentMap[step.id]) return stepComponentMap[step.id];
    // Legacy id-prefix fallback for recipes with component prefix
    const comp = store.content.formula.components.find(
      (c) => step.id === c.id || step.id.startsWith(`${c.id}-`),
    );
    return comp ? comp.id : null;
  };

  const propose = (index: number, delta: number) => {
    const step = process.steps[index];
    const after = delta < 0 ? (process.steps[index - 2]?.id ?? null) : process.steps[index + 1]?.id;
    if (!step || after === undefined) return;
    const result = moveStep(process, step.id, after);
    if (!result.ok) {
      setRefusal({ stepId: step.id, error: result.error });
      setAnnouncement(stepCopy(locale, 'refusalNextSteps'));
    } else if (result.value.kind === 'orderOnly') {
      if (store.applyProcess(result.value.process)) {
        focusTargetRef.current = { id: step.id, type: 'drag' };
        setAnnouncement(t(locale, 'changeOrderOnly'));
      }
    } else if (result.value.kind === 'chain') {
      setProposal({ source: process, result: result.value, stepId: step.id });
    }
  };

  const proposeDuplicate = (step: ProcessStep) => {
    const copyId = `${step.operation}-${crypto.randomUUID()}`;
    const result = duplicateStep(process, step.id, copyId);
    if (!result.ok) {
      setRefusal({ stepId: step.id, error: result.error });
      setAnnouncement(stepCopy(locale, 'refusalNextSteps'));
    } else {
      const origComp = getStepComponentId(step);
      setDuplication({
        source: process,
        result: result.value,
        originalComponentId: origComp ?? undefined,
      });
    }
  };

  // Drag and drop implementation via useStepDrag (L96)
  const {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  } = useStepDrag({
    process,
    locale,
    onMove: (stepId: StepId, after: StepId | null) => {
      const result = moveStep(process, stepId, after);
      if (!result.ok) {
        setRefusal({ stepId, error: result.error });
        setAnnouncement(stepCopy(locale, 'refusalNextSteps'));
      } else if (result.value.kind === 'unchanged') {
        // No mutation on unchanged move
      } else if (result.value.kind === 'orderOnly') {
        if (store.applyProcess(result.value.process)) {
          focusTargetRef.current = { id: stepId, type: 'drag' };
          setAnnouncement(t(locale, 'changeOrderOnly'));
        }
      } else if (result.value.kind === 'chain') {
        setProposal({ source: process, result: result.value, stepId });
      }
    },
    onAnnounce: (msg: string) => setAnnouncement(msg),
  });

  const previewOf = (candidate: Process) => {
    const result = project(
      candidate,
      at,
      undefined,
      planning && planDirection === 'readyBy' ? effectiveTarget : undefined,
    );
    return result.ok ? result.value : undefined;
  };

  const previewWindows = (before: Process, after: Process) => {
    const beforePlan = previewOf(before),
      afterPlan = previewOf(after);
    const components = store.content.formula.components;
    const groups = [
      { label: t(locale, 'totalDuration'), select: () => true },
      ...components.map((component) => ({
        label: componentDisplayName(locale, store.content.formula, component, store.content.names),
        select: (step: ProcessStep) => getStepComponentId(step) === component.id,
      })),
      {
        label: t(locale, 'dough'),
        select: (step: ProcessStep) => getStepComponentId(step) === null,
      },
    ];
    return groups.map(({ label, select }) => ({
      label,
      before: formatWindow(before.steps.filter(select), beforePlan, true),
      after: formatWindow(after.steps.filter(select), afterPlan, true),
    }));
  };

  const stepNumbers = (() => {
    const map = new Map<string, number>();
    let count = 0;
    for (const s of process.steps) {
      if (s.operation !== 'preheat') {
        count += 1;
        map.set(s.id, count);
      }
    }
    return map;
  })();

  const renderStep = (step: ProcessStep, index: number) => {
    const timing = projection.ok ? projection.value.steps[step.id] : undefined;
    const previous = process.steps[index - 1]?.id;
    const isDragging = dragState.activeStepId === step.id;
    const isPreheat = step.operation === 'preheat';
    const displayNumber = isPreheat ? undefined : stepNumbers.get(step.id);
    const showPlaceholderAbove =
      dragState.isDragging &&
      dragState.targetAfterId !== undefined &&
      ((index === 0 && dragState.targetAfterId === null) ||
        (index > 0 && dragState.targetAfterId === process.steps[index - 1]?.id));

    const dragStyle =
      isDragging && dragState.offsetY !== 0
        ? ({
            transform: `translateY(${dragState.offsetY}px)`,
            zIndex: 50,
          } as const)
        : undefined;

    return (
      <div
        key={step.id}
        data-step-id={step.id}
        style={dragStyle}
        className={`fp-step-draggable ${isDragging ? 'is-dragging' : ''} ${isPreheat ? 'fp-step-branch-preheat' : ''}`}
      >
        {showPlaceholderAbove && <div className="fp-drag-placeholder" aria-hidden="true" />}
        <StepRow
          number={displayNumber}
          icon={operationIcon(step.operation)}
          title={titleOf(step, locale)}
          details={[
            ...(timing ? [`${time(locale, timing.start)} → ${time(locale, timing.end)}`] : []),
            ...(!planning && view === 'timeline' && timing?.start && starts.length
              ? [`+${duration(locale, (Date.parse(timing.start) - Math.min(...starts)) / 1000)}`]
              : []),
            ...stepDetails(step, locale),
          ]}
          onEdit={planning ? () => onModifyStep?.(step.id) : undefined}
          editLabel={
            planning
              ? `${editingCopyT(locale, 'editInStepsAria')} : ${titleOf(step, locale)}`
              : `${t(locale, 'editStep')} : ${titleOf(step, locale)}`
          }
          actions={
            planning ? undefined : store.state.draft ? (
              <div className="step-cluster">
                <DragHandle
                  step={step}
                  index={index}
                  totalSteps={process.steps.length}
                  locale={locale}
                  title={titleOf(step, locale)}
                  isDragging={isDragging}
                  onPointerDown={(e) => handlePointerDown(step.id, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onLostPointerCapture={handleLostPointerCapture}
                  onKeyboardMove={(idx, delta) => propose(idx, delta)}
                />
                <div style={{ position: 'relative' }}>
                  <IconButton
                    icon="more"
                    label={`${stepCopy(locale, 'stepActions')} : ${titleOf(step, locale)}`}
                    onClick={() => setMenuOpenStepId(menuOpenStepId === step.id ? null : step.id)}
                    dataTestId={`step-menu-${step.id}`}
                  />
                  {menuOpenStepId === step.id && (
                    <Menu
                      open
                      onClose={() => setMenuOpenStepId(null)}
                      title={titleOf(step, locale)}
                      closeLabel={t(locale, 'close')}
                      anchor="bottom"
                    >
                      <div
                        className="stack"
                        style={{ gap: '0.25rem', minWidth: '11rem', padding: '0.25rem' }}
                      >
                        <Button
                          variant="quiet"
                          onClick={() => {
                            setEditing(step);
                            setMenuOpenStepId(null);
                          }}
                        >
                          {stepCopy(locale, 'editStep')}
                        </Button>
                        <Button
                          variant="quiet"
                          disabled={index === 0}
                          onClick={() => {
                            propose(index, -1);
                            setMenuOpenStepId(null);
                          }}
                        >
                          {stepCopy(locale, 'moveUp')}
                        </Button>
                        <Button
                          variant="quiet"
                          disabled={index === process.steps.length - 1}
                          onClick={() => {
                            propose(index, 1);
                            setMenuOpenStepId(null);
                          }}
                        >
                          {stepCopy(locale, 'moveDown')}
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={() => {
                            setDependencyEditingStep(step);
                            setMenuOpenStepId(null);
                          }}
                        >
                          {stepCopy(locale, 'editDependencies')}
                        </Button>
                        <Button
                          variant="quiet"
                          icon="copy"
                          onClick={() => {
                            proposeDuplicate(step);
                            setMenuOpenStepId(null);
                          }}
                        >
                          {t(locale, 'duplicate')}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setRemoving(step.id);
                            setMenuOpenStepId(null);
                          }}
                        >
                          {t(locale, 'remove')}
                        </Button>
                      </div>
                    </Menu>
                  )}
                </div>
              </div>
            ) : undefined
          }
        >
          {step.dependsOn.some((id) => id !== previous) && (
            <small>
              {t(locale, 'dependencies')} :{' '}
              {step.dependsOn
                .map((id) => titleOf(process.steps.find((s) => s.id === id) ?? step, locale))
                .join(', ')}
            </small>
          )}
          {view === 'grouped' &&
            step.incorporations?.map((item, i) => (
              <small key={i}>
                {t(locale, 'incorporate')} : {item.item === 'water' ? t(locale, 'water') : item.id}
              </small>
            ))}
        </StepRow>
      </div>
    );
  };

  return (
    <div ref={rootRef} className="stack" data-step-design={stepDesign}>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {returnToPlanning && (
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--fp-space-2) var(--fp-space-3)',
            backgroundColor: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-card)',
            marginBottom: 'var(--fp-space-2)',
          }}
        >
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--color-ink-muted)' }}>
            {editingCopyT(locale, 'editingFromPlanningNotice')}
          </span>
          <Button variant="secondary" icon="calendar" onClick={returnToPlanning}>
            {editingCopyT(locale, 'returnToPlanning')}
          </Button>
        </div>
      )}
      {planning && (
        <Surface>
          <p>{t(locale, 'generated')}</p>
          <label className="field-label">
            {t(locale, 'planDirection')}
            <select
              value={planDirection}
              onChange={(e) => setPlanDirection(e.target.value as 'startAt' | 'readyBy')}
            >
              <option value="startAt">{t(locale, 'startAt')}</option>
              <option value="readyBy">{t(locale, 'readyBy')}</option>
            </select>
          </label>
          {planDirection === 'readyBy' && (
            <label className="field-label">
              {t(locale, 'targetStep')}
              <select value={effectiveTarget} onChange={(e) => setTargetStep(e.target.value)}>
                {process.steps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {titleOf(step, locale)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field-label">
            {t(locale, planDirection === 'startAt' ? 'startAt' : 'finish')}
            <input
              type="datetime-local"
              value={at}
              onChange={(e) => {
                if (e.target.value) setAt(e.target.value);
              }}
            />
          </label>
          {planDirection === 'readyBy' && (
            <p>
              {t(locale, 'startAt')} :{' '}
              {full
                ? dateTime(locale, new Date(Math.min(...starts)).toISOString())
                : t(locale, 'unknown')}
            </p>
          )}
          <strong>
            {t(locale, 'finish')} :{' '}
            {full
              ? dateTime(locale, new Date(Math.max(...ends)).toISOString())
              : t(locale, 'unknown')}
          </strong>
          <p>
            {t(locale, 'total')} :{' '}
            {full
              ? duration(locale, (Math.max(...ends) - Math.min(...starts)) / 1000)
              : t(locale, 'unknownDuration')}
          </p>
        </Surface>
      )}

      <div className="process-view-toolbar row">
        <Tabs
          variant="pills"
          label={t(locale, 'steps')}
          tabs={[
            { id: 'grouped', label: t(locale, 'grouped') },
            { id: 'timeline', label: t(locale, 'timeline') },
          ]}
          activeId={view}
          onChange={(id) => setView(id)}
        />
      </div>

      {view === 'timeline' ? (
        <div className="timeline-lanes stack">
          {full && (
            <Ui
              component="fp.timeline"
              startLabel={time(locale, new Date(Math.min(...starts)).toISOString())}
              endLabel={time(locale, new Date(Math.max(...ends)).toISOString())}
              lanes={[
                ...store.content.formula.components.map((c) => ({
                  id: c.id,
                  label: componentDisplayName(
                    locale,
                    store.content.formula,
                    c,
                    store.content.names,
                  ),
                  steps: process.steps.filter((s) => getStepComponentId(s) === c.id),
                })),
                {
                  id: 'preheat',
                  label: operationName(locale, 'preheat'),
                  steps: process.steps.filter((s) => s.operation === 'preheat'),
                },
                {
                  id: 'dough',
                  label: t(locale, 'dough'),
                  steps: process.steps.filter(
                    (s) => s.operation !== 'preheat' && getStepComponentId(s) === null,
                  ),
                },
              ].map((lane) => ({
                id: lane.id,
                label: lane.label,
                events: lane.steps.flatMap((step) => {
                  const timing = projection.ok ? projection.value.steps[step.id] : undefined;
                  if (!timing?.start || !timing.end) return [];
                  const span = Math.max(1, Math.max(...ends) - Math.min(...starts));
                  return [
                    {
                      id: step.id,
                      label: titleOf(step, locale),
                      range: `${time(locale, timing.start)} – ${time(locale, timing.end)}`,
                      startPct: ((Date.parse(timing.start) - Math.min(...starts)) / span) * 100,
                      endPct: ((Date.parse(timing.end) - Math.min(...starts)) / span) * 100,
                    },
                  ];
                }),
              }))}
            />
          )}
          {process.steps.map(renderStep)}
        </div>
      ) : (
        <>
          {store.content.formula.components.map((component) => (
            <Disclosure
              key={component.id}
              title={`${store.content.formula.components.indexOf(component) + 1}. ${componentDisplayName(locale, store.content.formula, component, store.content.names)}`}
              subtitle={windowLabel(
                process.steps.filter((s) => getStepComponentId(s) === component.id),
              )}
              open={!collapsedGroups[component.id]}
              onOpenChange={(open) => onToggleGroup?.(component.id, open)}
            >
              {process.steps
                .filter((step) => getStepComponentId(step) === component.id)
                .map((step) => renderStep(step, process.steps.indexOf(step)))}
            </Disclosure>
          ))}
          <Disclosure
            title={`${store.content.formula.components.length + 1}. ${t(locale, 'dough')}`}
            subtitle={windowLabel(process.steps.filter((s) => getStepComponentId(s) === null))}
            open={!collapsedGroups['dough']}
            onOpenChange={(open) => onToggleGroup?.('dough', open)}
          >
            {process.steps
              .filter((step) => getStepComponentId(step) === null)
              .map((step) => renderStep(step, process.steps.indexOf(step)))}
          </Disclosure>
        </>
      )}

      {!planning && store.state.draft && (
        <Button
          icon="plus"
          onClick={() =>
            store.applyProcess(
              insertStepAfter(process, process.steps[process.steps.length - 1].id, {
                id: crypto.randomUUID(),
                operation: 'rest',
                schedule: 'asap',
                plannedDurationS: 600,
              }),
            )
          }
        >
          {t(locale, 'addStep')}
        </Button>
      )}

      <p className="process-result">
        <Icon name="check" /> {stepCopy(locale, 'plannedResult')} :{' '}
        {t(
          locale,
          intendedOutcome(process).result === 'cooked'
            ? 'resultCooked'
            : intendedOutcome(process).result === 'dough'
              ? 'resultDough'
              : 'resultMixed',
        )}
      </p>

      {!projection.ok && <p role="alert">{t(locale, 'invalidPlan')}</p>}

      <Diagnostics store={store} locale={locale} />

      {editing && (
        <StepEditor
          step={editing}
          process={process}
          locale={locale}
          onClose={() => setEditing(null)}
          onApply={(next) =>
            store.applyProcess({
              ...process,
              steps: process.steps.map((s) => (s.id === next.id ? next : s)),
            })
          }
        />
      )}

      {dependencyEditingStep && (
        <DependencyEditor
          step={dependencyEditingStep}
          process={process}
          locale={locale}
          titleOf={titleOf}
          onClose={() => setDependencyEditingStep(null)}
          onApply={(nextDeps) => {
            const ok = store.applyProcess({
              ...process,
              steps: process.steps.map((s) =>
                s.id === dependencyEditingStep.id ? { ...s, dependsOn: nextDeps } : s,
              ),
            });
            if (ok) setAnnouncement(stepCopy(locale, 'orderChanged'));
            return ok;
          }}
        />
      )}

      {duplication && (
        <StepEditor
          step={duplication.result.copy}
          process={duplication.result.process}
          locale={locale}
          title={`${t(locale, 'duplicate')} : ${titleOf(duplication.result.copy, locale)}`}
          blocked={process !== duplication.source}
          onClose={() => setDuplication(null)}
          review={(candidate) => {
            const next = {
              ...duplication.result.process,
              steps: duplication.result.process.steps.map((step) =>
                step.id === candidate.id ? candidate : step,
              ),
            };
            return (
              <>
                {process !== duplication.source && <p role="alert">{t(locale, 'changeStale')}</p>}
                <ProcessChangePreview
                  locale={locale}
                  before={duplication.source}
                  after={next}
                  beforeProjection={previewOf(duplication.source)}
                  afterProjection={previewOf(next)}
                  windows={previewWindows(duplication.source, next)}
                  titleForStep={(step) => titleOf(step, locale)}
                  notCarried={duplication.result.notCarried}
                  copyId={candidate.id}
                />
              </>
            );
          }}
          onApply={(candidate) => {
            if (process !== duplication.source) return false;
            const accepted = store.applyProcess({
              ...duplication.result.process,
              steps: duplication.result.process.steps.map((step) =>
                step.id === candidate.id ? candidate : step,
              ),
            });
            if (accepted) {
              const originalComponentId = duplication.originalComponentId;
              if (originalComponentId) {
                setStepComponentMap((prev) => ({
                  ...prev,
                  [candidate.id]: originalComponentId,
                }));
              }
              setAnnouncement(t(locale, 'changeApplied'));
            }
            return accepted;
          }}
        />
      )}

      {removing &&
        (() => {
          const stepToRemove = process.steps.find((s) => s.id === removing);
          if (!stepToRemove) return null;
          const stepTitle = titleOf(stepToRemove, locale);
          return (
            <CompactDialog
              open
              onClose={() => setRemoving(null)}
              title={stepTitle}
              closeLabel={t(locale, 'close')}
              footer={
                <div
                  className="row"
                  style={{ gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}
                >
                  <Button variant="quiet" onClick={() => setRemoving(null)}>
                    {t(locale, 'cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      store.applyProcess(removeStep(process, removing));
                      setRemoving(null);
                      setAnnouncement(t(locale, 'changeApplied'));
                    }}
                  >
                    {t(locale, 'remove')}
                  </Button>
                </div>
              }
            >
              <p style={{ margin: 0 }}>{stepCopy(locale, 'removeConsequence')}</p>
            </CompactDialog>
          );
        })()}

      <Modal
        open={Boolean(proposal)}
        onClose={() => {
          if (proposal) {
            focusTargetRef.current = { id: proposal.stepId, type: 'drag' };
          }
          setProposal(null);
        }}
        title={t(locale, 'preview')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            disabled={!proposal || process !== proposal.source}
            onClick={() => {
              if (
                proposal &&
                process === proposal.source &&
                store.applyProcess(proposal.result.process)
              ) {
                focusTargetRef.current = { id: proposal.stepId, type: 'drag' };
                setAnnouncement(t(locale, 'changeApplied'));
                setProposal(null);
              }
            }}
          >
            {t(locale, 'apply')}
          </Button>
        }
      >
        {proposal && (
          <>
            {process !== proposal.source && <p role="alert">{t(locale, 'changeStale')}</p>}
            <p>{t(locale, 'changeChain')}</p>
            <ProcessChangePreview
              locale={locale}
              before={proposal.source}
              after={proposal.result.process}
              beforeProjection={previewOf(proposal.source)}
              afterProjection={previewOf(proposal.result.process)}
              windows={previewWindows(proposal.source, proposal.result.process)}
              titleForStep={(step) => titleOf(step, locale)}
            />
          </>
        )}
      </Modal>

      {refusal && (
        <CompactDialog
          open
          onClose={() => setRefusal(null)}
          title={t(locale, 'changeRefused')}
          closeLabel={t(locale, 'close')}
          footer={
            <div
              className="row"
              style={{ gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}
            >
              <Button variant="primary" onClick={() => setRefusal(null)}>
                {stepCopy(locale, 'closeToInspect')}
              </Button>
            </div>
          }
        >
          <div role="alert" data-process-refusal={refusal.error.code} className="stack">
            <p style={{ fontWeight: 600, margin: 0 }}>
              {t(
                locale,
                refusal.error.code === 'NotDuplicable' ? 'changeCopyRefused' : 'refusedMove',
              )}
            </p>
            <p style={{ margin: 0 }}>{t(locale, refusalKey(refusal.error))}</p>
            <p className="muted" style={{ margin: 0 }}>
              {stepCopy(locale, 'refusalNextSteps')}
            </p>
          </div>
        </CompactDialog>
      )}
    </div>
  );
}

const dateTime = (locale: Locale, value: string) =>
  new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export function processDuration(content: Content): number | undefined {
  const p = project(content.process, '2026-10-16T08:00:00Z');
  if (!p.ok) return undefined;
  const values = Object.values(p.value.steps);
  if (!values.every((v) => v.start && v.end) || !values.length) return undefined;
  return (
    (Math.max(...values.map((v) => Date.parse(v.end ?? ''))) -
      Math.min(...values.map((v) => Date.parse(v.start ?? '')))) /
    1000
  );
}

export const instructionKey = (operation: string): MessageKey =>
  (({
    scald: 'instructionScald',
    cool: 'instructionCool',
    mix: 'instructionMix',
    bulk: 'instructionBulk',
    shape: 'instructionShape',
    proof: 'instructionProof',
    bake: 'instructionBake',
    boil: 'instructionBoil',
    steam: 'instructionSteam',
    fry: 'instructionFry',
    panCook: 'instructionPanCook',
    grill: 'instructionGrill',
    divide: 'instructionDivide',
    fold: 'instructionFold',
  })[operation] as MessageKey) ?? 'instructionRest';
