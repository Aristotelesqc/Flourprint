import { catalogText, curatedText } from './template-presentation';
import { useState } from 'react';
import {
  insertStepAfter,
  removeStep,
  validateProcess,
  OVEN_MODES,
  type ProcessStep,
  type Process,
  type OvenMode,
} from '@flourprint/core/domain';
import { StepRow, StatusPanel } from './components';
import { Button, IconButton, NumberField, Modal, Disclosure, Surface } from './ui';
import { type Prototype, type Content, project, diagnosticFixture, clone } from './model';
import { t, duration, num, operationName, time, type Locale, type MessageKey } from './messages';

export const titleOf = (step: ProcessStep, locale: Locale) =>
  curatedText(locale, step.label) ?? step.label ?? operationName(locale, step.operation);
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
  'boil',
  'fry',
  'bake',
  'cool',
  'rest',
];
export function StepEditor({
  step,
  process,
  locale,
  onClose,
  onApply,
}: {
  step: ProcessStep;
  process: Process;
  locale: Locale;
  onClose: () => void;
  onApply: (step: ProcessStep) => boolean;
}) {
  const [draft, setDraft] = useState(() => clone(step));
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(false);
  const field = (
    id: string,
    value: number,
    label: string,
    unit: string,
    change: (v: number) => void,
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
      onValidityChange={(bad) => setInvalid((s) => (s[id] === bad ? s : { ...s, [id]: bad }))}
    />
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={t(locale, 'editStep')}
      closeLabel={t(locale, 'close')}
      footer={
        <Button
          variant="primary"
          disabled={Object.values(invalid).some(Boolean)}
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
        <label className="field-label">
          {t(locale, 'temperature')}
          <input
            inputMode="decimal"
            value={draft.conditions?.temperatureC ?? ''}
            placeholder={t(locale, 'optional')}
            onChange={(e) => {
              const raw = e.target.value;
              const value = Number(raw.replace(',', '.'));
              setInvalid((s) => ({ ...s, temperature: raw !== '' && !Number.isFinite(value) }));
              if (raw === '' || Number.isFinite(value))
                setDraft({
                  ...draft,
                  conditions: { ...draft.conditions, temperatureC: raw === '' ? undefined : value },
                });
            }}
          />
        </label>
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
          {process.steps
            .filter((s) => s.id !== draft.id)
            .map((s) => (
              <label className="check-option" key={s.id}>
                <input
                  type="checkbox"
                  checked={draft.dependsOn.includes(s.id)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      dependsOn: draft.dependsOn.includes(s.id)
                        ? draft.dependsOn.filter((id) => id !== s.id)
                        : [...draft.dependsOn, s.id],
                    })
                  }
                />
                {titleOf(s, locale)}
              </label>
            ))}
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
            draft.equipment?.setpointC ?? draft.conditions?.temperatureC ?? NaN,
            t(locale, 'temperature'),
            '°C',
            (v) => setDraft({ ...draft, equipment: { ...draft.equipment, setpointC: v } }),
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
  return [
    duration(locale, step.plannedDurationS),
    ...(step.conditions?.temperatureC !== undefined
      ? [`${t(locale, 'temperature')} : ${num(locale, step.conditions.temperatureC)} °C`]
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
  const [scenario, setScenario] = useState(
    new URLSearchParams(location.search).get('scenario') ?? 'recipe',
  );
  const estimate = diagnosticFixture(scenario, store.content).dough;
  const direct = estimate.duration;
  const candidate = Object.entries(estimate.yeastPct).find(([, v]) => v.status === 'ok');
  return (
    <Disclosure
      title={t(locale, 'diagnostics')}
      defaultOpen={new URLSearchParams(location.search).get('diagnostics') === '1'}
    >
      <div className="stack">
        <label className="field-label">
          {t(locale, 'preview')}
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
            <option value="recipe">{t(locale, 'currentRecipe')}</option>
            <option value="valid">
              {t(locale, 'valid')} · {t(locale, 'preview')}
            </option>
            <option value="out">
              {t(locale, 'outOfDomain')} · {t(locale, 'preview')}
            </option>
            <option value="noResult">
              {t(locale, 'noResult')} · {t(locale, 'preview')}
            </option>
          </select>
        </label>
        <StatusPanel
          title={t(locale, 'diagnostics')}
          status={
            direct.status === 'ok'
              ? 'ok'
              : direct.status === 'out_of_domain'
                ? 'warning'
                : 'unavailable'
          }
          message={t(
            locale,
            direct.status === 'ok'
              ? 'valid'
              : direct.status === 'out_of_domain'
                ? 'outOfDomain'
                : 'noResult',
          )}
        >
          {direct.status === 'ok' && (
            <strong>
              {t(locale, 'estimate')} : {duration(locale, direct.value)}
            </strong>
          )}
          {direct.status !== 'ok' && (
            <p>
              {catalogText(locale, `fermentation.reason.${direct.reason}`) ?? t(locale, 'noResult')}
            </p>
          )}
          <p>{t(locale, 'readyTarget')}</p>
          <p>{t(locale, 'modelLimits')}</p>
          {candidate && candidate[1].status === 'ok' && (
            <Surface>
              <strong>
                {t(locale, 'candidate')} : {num(locale, candidate[1].value, 3)}{' '}
                {t(locale, 'bakerPct')}
              </strong>
              {scenario === 'recipe' && (
                <p>
                  {t(locale, 'currentRecipe')} :{' '}
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
                  onClick={() =>
                    store.apply({
                      type: 'SetBakerPct',
                      ingredient: candidate[0],
                      pct: candidate[1].status === 'ok' ? candidate[1].value : 0,
                    })
                  }
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
}: {
  store: Prototype;
  locale: Locale;
  planning?: boolean;
}) {
  const [view, setView] = useState(
    new URLSearchParams(location.search).get('view') === 'grouped' ? 'grouped' : 'timeline',
  );
  const [editing, setEditing] = useState<ProcessStep | null>(() =>
    store.state.draft &&
    (new URLSearchParams(location.search).get('section') ?? 'steps') ===
      (planning ? 'planning' : 'steps')
      ? (store.content.process.steps.find(
          (s) => s.id === new URLSearchParams(location.search).get('step'),
        ) ?? null)
      : null,
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [proposal, setProposal] = useState<Process | null>(null);
  const [at, setAt] = useState('2026-10-16T08:00');
  const { process } = store.content;
  const projection = project(process, at);
  const times = projection.ok ? Object.values(projection.value.steps) : [];
  const starts = times.flatMap((s) => (s.start ? [Date.parse(s.start)] : [])),
    ends = times.flatMap((s) => (s.end ? [Date.parse(s.end)] : []));
  const full = times.length > 0 && times.every((s) => s.start && s.end);
  const propose = (index: number, delta: number) => {
    const steps = [...process.steps];
    [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
    setProposal({ ...process, steps });
  };
  const renderStep = (step: ProcessStep, index: number) => {
    const timing = projection.ok ? projection.value.steps[step.id] : undefined;
    const previous = process.steps[index - 1]?.id;
    return (
      <StepRow
        key={step.id}
        number={index + 1}
        title={titleOf(step, locale)}
        details={[
          ...(planning ? [`${time(locale, timing?.start)} → ${time(locale, timing?.end)}`] : []),
          ...(!planning && view === 'timeline' && timing?.start && starts.length
            ? [`+${duration(locale, (Date.parse(timing.start) - Math.min(...starts)) / 1000)}`]
            : []),
          ...stepDetails(step, locale),
        ]}
        onEdit={store.state.draft ? () => setEditing(step) : undefined}
        editLabel={`${t(locale, 'editStep')} : ${titleOf(step, locale)}`}
        actions={
          ordering ? (
            <>
              <IconButton
                icon="arrowUp"
                label={`${t(locale, 'up')} : ${titleOf(step, locale)}`}
                disabled={index === 0}
                onClick={() => propose(index, -1)}
              />
              <IconButton
                icon="arrowDown"
                label={`${t(locale, 'down')} : ${titleOf(step, locale)}`}
                disabled={index === process.steps.length - 1}
                onClick={() => propose(index, 1)}
              />
            </>
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
        {store.state.draft && (
          <div className="actions">
            <Button
              variant="quiet"
              icon="copy"
              onClick={() =>
                store.applyProcess(
                  insertStepAfter(process, step.id, {
                    ...step,
                    id: crypto.randomUUID(),
                    schedule: 'asap',
                  }),
                )
              }
            >
              {t(locale, 'duplicate')}
            </Button>
            <Button variant="quiet" onClick={() => setRemoving(step.id)}>
              {t(locale, 'remove')}
            </Button>
          </div>
        )}
      </StepRow>
    );
  };
  return (
    <div className="stack">
      {planning && (
        <Surface>
          <p>{t(locale, 'generated')}</p>
          <label className="field-label">
            {t(locale, 'startAt')}
            <input
              type="datetime-local"
              value={at}
              onChange={(e) => {
                if (e.target.value) setAt(e.target.value);
              }}
            />
          </label>
          <strong>
            {t(locale, 'finish')} :{' '}
            {full ? time(locale, new Date(Math.max(...ends)).toISOString()) : t(locale, 'unknown')}
          </strong>
          <p>
            {t(locale, 'total')} :{' '}
            {full
              ? duration(locale, (Math.max(...ends) - Math.min(...starts)) / 1000)
              : t(locale, 'unknownDuration')}
          </p>
        </Surface>
      )}
      <div className="actions">
        <Button onClick={() => setView(view === 'timeline' ? 'grouped' : 'timeline')}>
          {t(locale, view === 'timeline' ? 'grouped' : 'timeline')}
        </Button>
        {store.state.draft && (
          <Button onClick={() => setOrdering(!ordering)}>
            {t(locale, ordering ? 'done' : 'order')}
          </Button>
        )}
      </div>
      {view === 'grouped' && <p className="muted">{t(locale, 'groupHelp')}</p>}
      {ordering && <p className="muted">{t(locale, 'reorderHelp')}</p>}
      {view === 'timeline' ? (
        process.steps.map(renderStep)
      ) : (
        <>
          {store.content.formula.components.map((component) => (
            <Disclosure key={component.id} title={component.id} defaultOpen>
              {process.steps
                .filter(
                  (step) => step.id === component.id || step.id.startsWith(`${component.id}-`),
                )
                .map((step) => renderStep(step, process.steps.indexOf(step)))}
            </Disclosure>
          ))}
          <Disclosure title={t(locale, 'dough')} defaultOpen>
            {process.steps
              .filter(
                (step) =>
                  !store.content.formula.components.some(
                    (component) =>
                      step.id === component.id || step.id.startsWith(`${component.id}-`),
                  ),
              )
              .map((step) => renderStep(step, process.steps.indexOf(step)))}
          </Disclosure>
        </>
      )}
      {store.state.draft && (
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
      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={t(locale, 'confirmRemove')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              if (removing) store.applyProcess(removeStep(process, removing));
              setRemoving(null);
            }}
          >
            {t(locale, 'remove')}
          </Button>
        }
      >
        <p>{t(locale, 'remove')}</p>
      </Modal>
      <Modal
        open={Boolean(proposal)}
        onClose={() => setProposal(null)}
        title={t(locale, 'preview')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            disabled={!proposal || !validateProcess(proposal).ok}
            onClick={() => {
              if (proposal && store.applyProcess(proposal)) setProposal(null);
            }}
          >
            {t(locale, 'apply')}
          </Button>
        }
      >
        {proposal && (
          <>
            <p>{t(locale, validateProcess(proposal).ok ? 'reorderHelp' : 'refusedMove')}</p>
            <ol>
              {proposal.steps.map((s) => (
                <li key={s.id}>{titleOf(s, locale)}</li>
              ))}
            </ol>
          </>
        )}
      </Modal>
    </div>
  );
}
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
  })[operation] as MessageKey) ?? 'instructionRest';
