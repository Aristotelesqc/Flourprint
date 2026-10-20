import { createPortal } from 'react-dom';
import { curatedText } from './template-presentation';
import { useEffect, useState, useRef } from 'react';
import {
  resolveFormula,
  updateStep,
  intendedOutcome,
  outcomeProblem,
  OUTCOME_RESULTS,
  DOUGH_DISPOSITIONS,
  isCookingStep,
  type PreparationOutcome,
} from '@flourprint/core/domain';
import { PreparationTimer, StepRow, IngredientRow, ContextTiles } from './components';
import {
  Button,
  IconButton,
  Disclosure,
  Modal,
  NumberField,
  Menu,
  Tabs,
  Surface,
  CompactDialog,
} from './ui';
import { type Prototype, instant, project, syncSessions } from './model';
import { titleOf, instructionKey, stepDetails, modeLabel, operationIcon } from './ProcessView';
import { groupsOf } from './RecipeView';
import { t, duration, time, grams, num, vesselName, type Locale } from './messages';
import { prepCopy, locationLabel } from './preparation-copy';
import {
  prepActionsCopy,
  formatEarlyFinishPrompt,
  formatAbandonPrompt,
} from './preparation-actions-copy';
import { formatTemperature, formatTemperatureForStep } from './device-preferences';
import { stepCopy } from './steps-copy';
import { historyCopyT } from './history-copy';

export function PreparationView({
  store,
  locale,
  footerHost,
}: {
  store: Prototype;
  locale: Locale;
  footerHost?: HTMLElement | null;
}) {
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState<'duration' | 'note' | 'photo' | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [outcomeInvalid, setOutcomeInvalid] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [confirmEarlyFinishOpen, setConfirmEarlyFinishOpen] = useState(false);
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false);
  const [chosenOutcome, setChosenOutcome] = useState<PreparationOutcome | undefined>();
  const [outcomeDraft, setOutcomeDraft] = useState<PreparationOutcome>({ result: 'cooked' });
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [invalid, setInvalid] = useState(false);
  const [weighingOpenCount, setWeighingOpenCount] = useState(0);
  const weighingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (weighingOpenCount > 0) {
      weighingRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [weighingOpenCount]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const session = store.state.session;

  useEffect(() => {
    setChosenOutcome(undefined);
    setOutcomeDraft({ result: 'cooked' });
    setOutcomeInvalid(false);
    setOutcomeOpen(false);
    setSheet(null);
    setMoreOpen(false);
    setConfirmEarlyFinishOpen(false);
    setConfirmAbandonOpen(false);
    setNote('');
    setMinutes(15);
    setInvalid(false);
    setWeighingOpenCount(0);
  }, [session?.id]);

  if (!session) return <p>{t(locale, 'noSession')}</p>;
  const allSessions = syncSessions(store.state.sessions, store.state.session);
  const sequentialSteps = session.effective.steps.filter((s) => s.operation !== 'preheat');
  const preheatSteps = session.effective.steps.filter((s) => s.operation === 'preheat');
  const current = sequentialSteps.find((s) => s.id === session.activeId) ?? sequentialSteps[0];
  const readyToFinish =
    sequentialSteps.length > 0 && sequentialSteps.every((step) => session.facts[step.id]?.endedAt);
  const outcome = chosenOutcome ?? intendedOutcome(session.effective);
  const resultLabel = (value: PreparationOutcome) =>
    t(
      locale,
      value.result === 'cooked'
        ? 'resultCooked'
        : value.result === 'dough'
          ? 'resultDough'
          : 'resultMixed',
    );
  const fact = session.facts[current.id];
  const elapsed = Math.max(
    0,
    (now - Date.parse(fact?.startedAt ?? session.startedAt)) / 1000 + session.elapsedOffsetS,
  );
  const remaining =
    current.plannedDurationS === undefined
      ? undefined
      : Math.max(0, current.plannedDurationS - elapsed);
  const projection = project(session.effective, session.startedAt, session.facts);
  const upcoming = sequentialSteps.filter(
    (s) => !session.facts[s.id]?.endedAt && s.id !== current.id,
  );
  const completed = sequentialSteps.filter((s) => session.facts[s.id]?.endedAt);
  const isCoolDirectlyAfterCooking =
    current.operation === 'cool' &&
    !current.label &&
    (current.dependsOn.some((depId) => {
      const s = session.effective.steps.find((step) => step.id === depId);
      return s && isCookingStep(s);
    }) ||
      (() => {
        const idx = session.effective.steps.findIndex((s) => s.id === current.id);
        return idx > 0 && isCookingStep(session.effective.steps[idx - 1]);
      })());
  const r = resolveFormula(session.snapshot.formula),
    n = resolveFormula({ ...session.snapshot.formula, anchor: { kind: 'flourTotal', grams: 100 } });
  const groups = r.ok && n.ok ? groupsOf(session.snapshot, r.value, n.value, locale) : [];
  const addTime = (seconds: number) =>
    store.updateSession((s) => ({
      ...s,
      effective: updateStep(s.effective, current.id, {
        plannedDurationS: (current.plannedDurationS ?? elapsed) + seconds,
      }),
      journal: [
        {
          at: instant(Date.now()),
          text: `${t(locale, 'timeChanged')} · ${titleOf(current, locale)} · ${duration(locale, (current.plannedDurationS ?? elapsed) + seconds)}`,
        },
        ...s.journal,
      ],
    }));
  const complete = () =>
    store.updateSession((s) => {
      const facts = {
        ...s.facts,
        [current.id]: { ...s.facts[current.id], endedAt: instant(Date.now()) },
      };
      const seqSteps = s.effective.steps.filter((step) => step.operation !== 'preheat');
      const next = seqSteps.find(
        (step) =>
          !facts[step.id]?.endedAt &&
          step.dependsOn
            .filter(
              (depId) => s.effective.steps.find((dep) => dep.id === depId)?.operation !== 'preheat',
            )
            .every((id) => facts[id]?.endedAt),
      );
      if (next) facts[next.id] = { startedAt: instant(Date.now()) };
      return {
        ...s,
        facts,
        activeId: next?.id ?? s.activeId,
        finished: false,
        elapsedOffsetS: 0,
        journal: [
          {
            at: instant(Date.now()),
            text: `${t(locale, 'stepRecorded')} · ${titleOf(current, locale)}`,
          },
          ...s.journal,
        ],
      };
    });
  const contextTilesItems = [
    ...(current.equipment?.mode
      ? [{ id: 'mode', label: t(locale, 'mode'), value: modeLabel(locale, current.equipment.mode) }]
      : []),
    ...(current.equipment?.setpointC !== undefined
      ? [
          {
            id: 'temperature',
            label: t(locale, 'temperature'),
            value: formatTemperature(
              current.equipment.setpointC,
              current.equipment.appliance === 'proofer' ? 'ambient' : 'oven',
              locale,
            ),
          },
        ]
      : current.conditions?.temperatureC !== undefined
        ? [
            {
              id: 'temperature',
              label: t(locale, 'temperature'),
              value: formatTemperatureForStep(current, current.conditions.temperatureC, locale),
              detail: current.conditions.location
                ? locationLabel(current.conditions.location, locale)
                : undefined,
            },
          ]
        : []),
    ...(current.equipment?.steam
      ? [
          {
            id: 'steam',
            label: t(locale, 'steam'),
            value: t(
              locale,
              current.equipment.steam.source === 'none'
                ? 'steamNone'
                : current.equipment.steam.source === 'manual'
                  ? 'steamManual'
                  : 'steamFunction',
            ),
          },
        ]
      : []),
    ...(current.equipment?.vessel
      ? [
          {
            id: 'vessel',
            label: t(locale, 'vessel'),
            value: vesselName(locale, current.equipment.vessel.item.id),
          },
        ]
      : []),
    ...(r.ok && r.value.doughWeight > 0
      ? [
          {
            id: 'dough-mass',
            label: prepCopy(locale, 'targetDoughMass'),
            value: grams(locale, r.value.doughWeight),
            actionLabel: prepCopy(locale, 'openWeighing'),
            onAction: () => setWeighingOpenCount((c) => c + 1),
          },
        ]
      : []),
  ];
  return (
    <div className="stack">
      {allSessions.length > 1 && (
        <Tabs
          variant="chips"
          label={prepCopy(locale, 'selectPreparation')}
          tabs={allSessions.map((s, index) => ({
            id: s.id,
            label: `${index + 1}. ${s.recipeName} · ${historyCopyT(locale, 'revisionItem', { version: s.recipeVersion })}${
              s.abandoned
                ? ` · ${prepActionsCopy(locale, 'sessionAbandoned')}`
                : s.finished
                  ? ` · ${prepCopy(locale, 'sessionFinished')}`
                  : ''
            }`,
          }))}
          activeId={session.id}
          onChange={(id) => store.selectSession?.(id)}
        />
      )}
      <h2>
        {session.recipeName}{' '}
        <small className="muted">
          · {historyCopyT(locale, 'revisionItem', { version: session.recipeVersion })}
        </small>
      </h2>
      {session.abandoned ? (
        <h2>{prepActionsCopy(locale, 'sessionAbandonedTitle')}</h2>
      ) : session.finished ? (
        <h2>{t(locale, 'completeSession')}</h2>
      ) : readyToFinish ? (
        <h2>{t(locale, 'finishReady')}</h2>
      ) : (
        <>
          <div key={current.id} className="current-step-hero stack" data-step={current.id}>
            <PreparationTimer
              title={`${sequentialSteps.indexOf(current) + 1} / ${sequentialSteps.length} · ${titleOf(current, locale)}`}
              remaining={duration(locale, remaining)}
              remainingLabel={t(locale, 'remainingTime')}
              start={time(locale, fact?.startedAt)}
              end={time(
                locale,
                projection.ok ? projection.value.steps[current.id]?.end : undefined,
              )}
              progress={current.plannedDurationS ? elapsed / current.plannedDurationS : 0}
              instruction={
                curatedText(locale, current.label, true) ??
                (isCoolDirectlyAfterCooking
                  ? stepCopy(locale, 'instructionCoolFinal')
                  : undefined) ??
                current.label ??
                t(locale, instructionKey(current.operation))
              }
              conditions={[]}
              labels={{
                start: `${t(locale, 'started')}${locale === 'fr' ? ' :' : ':'}`,
                end: `${t(locale, 'finish')}${locale === 'fr' ? ' :' : ':'}`,
                progress: t(locale, 'progress'),
              }}
            />
            {contextTilesItems.length > 0 && (
              <ContextTiles
                label={prepCopy(locale, 'contextualDetails')}
                items={contextTilesItems}
              />
            )}
          </div>
          <div
            className={`actions quick-actions ${['bulk', 'proof', 'retard'].includes(current.operation) ? '' : 'quick-actions-three'}`}
          >
            <Button onClick={() => addTime(900)}>{t(locale, 'add15')}</Button>
            <Button
              onClick={() => {
                setMinutes((current.plannedDurationS ?? 900) / 60);
                setSheet('duration');
              }}
            >
              {t(locale, 'duration')}
            </Button>
            <Button dataTestId="prep-note-btn" icon="note" onClick={() => setSheet('note')}>
              {t(locale, 'note')}
            </Button>
            {['bulk', 'proof', 'retard'].includes(current.operation) && (
              <Button
                onClick={() =>
                  store.log(
                    `${t(locale, 'observed')} · ${t(locale, current.operation === 'bulk' ? 'readyShape' : 'readyCook')}`,
                  )
                }
              >
                {t(locale, current.operation === 'bulk' ? 'readyShape' : 'readyCook')}
              </Button>
            )}
          </div>
          {preheatSteps.map((preheat) => {
            const preheatProj = projection.ok ? projection.value.steps[preheat.id] : undefined;
            const preheatFact = session.facts[preheat.id];
            const isStarted = Boolean(preheatFact?.startedAt);
            const isReady = Boolean(preheatFact?.endedAt);
            return (
              <Surface
                key={preheat.id}
                variant="container"
                componentId="preheat-branch"
                className="stack"
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <strong>{titleOf(preheat, locale)}</strong>
                  <span className="muted">
                    {isReady
                      ? prepCopy(locale, 'preheatReady')
                      : isStarted
                        ? prepCopy(locale, 'preheatHeating')
                        : prepCopy(locale, 'preheatProjected')}
                  </span>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  {prepCopy(locale, 'preheatProjected')}: {time(locale, preheatProj?.start)} →{' '}
                  {time(locale, preheatProj?.end)}
                  {preheatFact?.startedAt &&
                    ` · ${prepCopy(locale, 'heatingStartedAt')} ${time(locale, preheatFact.startedAt)}`}
                  {preheatFact?.endedAt &&
                    ` · ${prepCopy(locale, 'preheatObservedAt')} ${time(locale, preheatFact.endedAt)}`}
                </p>
                <div className="actions">
                  {!isStarted && (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        store.updateSession((s) => ({
                          ...s,
                          facts: {
                            ...s.facts,
                            [preheat.id]: {
                              ...s.facts[preheat.id],
                              startedAt: instant(Date.now()),
                            },
                          },
                          journal: [
                            {
                              at: instant(Date.now()),
                              text: `${prepCopy(locale, 'heatingStartedAt')} · ${titleOf(preheat, locale)}`,
                            },
                            ...s.journal,
                          ],
                        }))
                      }
                    >
                      {prepCopy(locale, 'startHeating')}
                    </Button>
                  )}
                  {isStarted && !isReady && (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        store.updateSession((s) => ({
                          ...s,
                          facts: {
                            ...s.facts,
                            [preheat.id]: {
                              ...s.facts[preheat.id],
                              endedAt: instant(Date.now()),
                            },
                          },
                          journal: [
                            {
                              at: instant(Date.now()),
                              text: `${prepCopy(locale, 'preheatObservedAt')} · ${titleOf(preheat, locale)}`,
                            },
                            ...s.journal,
                          ],
                        }))
                      }
                    >
                      {prepCopy(locale, 'markPreheatReady')}
                    </Button>
                  )}
                </div>
              </Surface>
            );
          })}
          {footerHost &&
            createPortal(
              <>
                <IconButton
                  icon="more"
                  label={t(locale, 'preparationActions')}
                  onClick={() => setMoreOpen(true)}
                />
                <Button
                  dataTestId="prep-complete-btn"
                  variant="primary"
                  icon="check"
                  onClick={complete}
                >
                  {t(locale, 'stageComplete')}
                </Button>
              </>,
              footerHost,
            )}
        </>
      )}
      {!session.finished && readyToFinish && (
        <div className="outcome-toolbar">
          <Button
            variant={readyToFinish ? 'primary' : 'quiet'}
            dataTestId="finish-preparation"
            onClick={() => store.finishSession(chosenOutcome)}
          >
            {t(locale, 'finishSession')}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setOutcomeInvalid(false);
              setOutcomeDraft(outcome);
              setOutcomeOpen(true);
            }}
          >
            {resultLabel(outcome)} · {t(locale, 'outcomeChoice')}
          </Button>
        </div>
      )}
      {session.abandoned ? (
        <p data-testid="recorded-outcome" className="muted">
          {prepActionsCopy(locale, 'noUsableOutcome')}
        </p>
      ) : (
        session.finished &&
        session.outcome && (
          <p data-testid="recorded-outcome">
            {resultLabel(session.outcome)}
            {session.outcome.dough ? ` · ${t(locale, session.outcome.dough)}` : ''}
          </p>
        )
      )}
      <Menu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t(locale, 'preparationActions')}
        closeLabel={t(locale, 'close')}
        anchor="top"
      >
        <Button
          icon="photo"
          variant="quiet"
          onClick={() => {
            setMoreOpen(false);
            setSheet('photo');
          }}
        >
          {t(locale, 'photo')}
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            setMoreOpen(false);
            setOutcomeInvalid(false);
            setOutcomeDraft(outcome);
            setOutcomeOpen(true);
          }}
        >
          {resultLabel(outcome)} · {t(locale, 'outcomeChoice')}
        </Button>
        <Button
          variant="quiet"
          dataTestId="finish-preparation-early"
          onClick={() => {
            setMoreOpen(false);
            setConfirmEarlyFinishOpen(true);
          }}
        >
          {t(locale, 'finishSession')}
        </Button>
        <Button
          variant="danger"
          dataTestId="abandon-preparation-btn"
          onClick={() => {
            setMoreOpen(false);
            setConfirmAbandonOpen(true);
          }}
        >
          {prepActionsCopy(locale, 'abandonPreparation')}
        </Button>
      </Menu>
      <CompactDialog
        open={confirmEarlyFinishOpen}
        onClose={() => setConfirmEarlyFinishOpen(false)}
        title={prepActionsCopy(locale, 'confirmEarlyFinishTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setConfirmEarlyFinishOpen(false)}>
              {t(locale, 'cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmEarlyFinishOpen(false);
                store.finishSession(chosenOutcome);
              }}
            >
              {prepActionsCopy(locale, 'confirmEarlyFinishAction')}
            </Button>
          </div>
        }
      >
        <p>{formatEarlyFinishPrompt(locale, session.recipeName, resultLabel(outcome))}</p>
      </CompactDialog>
      <CompactDialog
        open={confirmAbandonOpen}
        onClose={() => setConfirmAbandonOpen(false)}
        title={prepActionsCopy(locale, 'confirmAbandonTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setConfirmAbandonOpen(false)}>
              {t(locale, 'cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmAbandonOpen(false);
                store.abandonSession();
              }}
            >
              {prepActionsCopy(locale, 'abandonPreparation')}
            </Button>
          </div>
        }
      >
        <p>{formatAbandonPrompt(locale, session.recipeName)}</p>
      </CompactDialog>
      <Modal
        open={outcomeOpen}
        onClose={() => setOutcomeOpen(false)}
        title={t(locale, 'outcomeChoice')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            disabled={outcomeInvalid || Boolean(outcomeProblem(outcomeDraft))}
            onClick={() => {
              setChosenOutcome(outcomeDraft);
              setOutcomeOpen(false);
            }}
          >
            {t(locale, 'apply')}
          </Button>
        }
      >
        <p>{t(locale, 'defaultOutcome')}</p>
        <label className="field-label">
          {t(locale, 'outcome')}
          <select
            value={outcomeDraft.result}
            disabled={outcomeInvalid}
            onChange={(e) =>
              setOutcomeDraft({ result: e.target.value as PreparationOutcome['result'] })
            }
          >
            {OUTCOME_RESULTS.map((result) => (
              <option key={result} value={result}>
                {resultLabel({ result })}
              </option>
            ))}
          </select>
        </label>
        {outcomeDraft.result !== 'cooked' && (
          <>
            <label className="field-label">
              {t(locale, 'disposition')}
              <select
                value={outcomeDraft.dough ?? ''}
                onChange={(e) =>
                  setOutcomeDraft({
                    ...outcomeDraft,
                    dough: e.target.value
                      ? (e.target.value as PreparationOutcome['dough'])
                      : undefined,
                  })
                }
              >
                <option value="">{t(locale, 'optional')}</option>
                {DOUGH_DISPOSITIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(locale, value)}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              value={outcomeDraft.pieces ?? NaN}
              label={t(locale, 'count')}
              onValidityChange={setOutcomeInvalid}
              locale={locale}
              errorMessage={t(locale, 'invalid')}
              onCommit={(pieces) => {
                if (!Number.isInteger(pieces) || pieces < 1) return false;
                setOutcomeDraft({ ...outcomeDraft, pieces });
                return true;
              }}
            />
          </>
        )}
      </Modal>
      <div ref={weighingRef} key={`weighing-${weighingOpenCount}`}>
        <Disclosure
          title={t(locale, 'quantities')}
          subtitle={`${session.recipeName} · ${historyCopyT(locale, 'revisionItem', { version: session.recipeVersion })}`}
          defaultOpen={weighingOpenCount > 0 ? true : undefined}
        >
          <p className="muted">{t(locale, 'snapshotHelp')}</p>
          <p className="muted">{t(locale, 'sessionScope')}</p>
          {groups.map((group) => (
            <Disclosure
              key={group.id}
              title={group.title}
              badge={grams(locale, group.mass)}
              defaultOpen
            >
              {group.rows.map((row) => (
                <IngredientRow
                  key={row.key}
                  id={`prep:${row.key}`}
                  name={row.name}
                  gramsText={grams(locale, row.grams)}
                  pctText={`${num(locale, row.pct)} ${t(locale, 'bakerPct')}`}
                  checked={session.checks.includes(row.key)}
                  checkLabel={`${t(locale, 'weighed')} : ${row.name}`}
                  onToggle={() =>
                    store.updateSession((s) => ({
                      ...s,
                      checks: s.checks.includes(row.key)
                        ? s.checks.filter((id) => id !== row.key)
                        : [...s.checks, row.key],
                    }))
                  }
                />
              ))}
            </Disclosure>
          ))}
        </Disclosure>
      </div>
      <Disclosure title={t(locale, 'upcoming')} defaultOpen>
        {upcoming.map((step) => (
          <StepRow
            key={step.id}
            icon={operationIcon(step.operation)}
            number={sequentialSteps.indexOf(step) + 1}
            title={titleOf(step, locale)}
            details={[
              time(locale, projection.ok ? projection.value.steps[step.id]?.start : undefined),
              ...stepDetails(step, locale),
            ]}
          />
        ))}
      </Disclosure>
      <Disclosure title={t(locale, 'journal')} defaultOpen>
        <ol className="journal">
          {session.journal.map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              <time>{time(locale, entry.at)}</time> {entry.text}
            </li>
          ))}
        </ol>
      </Disclosure>
      <Disclosure title={t(locale, 'completed')}>
        {completed.map((step) => (
          <StepRow
            key={step.id}
            state="done"
            icon={operationIcon(step.operation)}
            number={sequentialSteps.indexOf(step) + 1}
            title={titleOf(step, locale)}
            details={[
              time(locale, session.facts[step.id]?.endedAt),
              duration(locale, step.plannedDurationS),
            ]}
          />
        ))}
      </Disclosure>
      <Modal
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={t(
          locale,
          sheet === 'duration' ? 'duration' : sheet === 'photo' ? 'photoDemo' : 'note',
        )}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            variant="primary"
            disabled={invalid || (sheet === 'note' && !note.trim())}
            onClick={() => {
              if (sheet === 'duration') addTime(minutes * 60 - (current.plannedDurationS ?? 0));
              if (sheet === 'note') {
                store.log(note.trim());
                setNote('');
              }
              if (sheet === 'photo') store.log(t(locale, 'photoAdded'));
              setSheet(null);
            }}
          >
            {t(locale, sheet === 'photo' ? 'attachPhoto' : 'apply')}
          </Button>
        }
      >
        {sheet === 'duration' && (
          <NumberField
            value={minutes}
            label={t(locale, 'duration')}
            unit="min"
            locale={locale}
            errorMessage={t(locale, 'invalid')}
            onCommit={(v) => {
              if (v <= 0) return false;
              setMinutes(v);
              return true;
            }}
            onValidityChange={setInvalid}
          />
        )}
        {sheet === 'note' && (
          <label className="field-label">
            {t(locale, 'notePrompt')}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        {sheet === 'photo' && <p>{t(locale, 'photoHelp')}</p>}
      </Modal>
    </div>
  );
}
