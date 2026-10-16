import { curatedText } from './template-presentation';
import { useEffect, useState } from 'react';
import { resolveFormula, updateStep } from '@flourprint/core/domain';
import { PreparationTimer, StepRow, IngredientRow } from './components';
import { Button, Disclosure, Modal, NumberField } from './ui';
import { type Prototype, instant, project } from './model';
import { titleOf, instructionKey, stepDetails } from './ProcessView';
import { groupsOf } from './RecipeView';
import { t, duration, time, grams, num, type Locale } from './messages';

export function PreparationView({ store, locale }: { store: Prototype; locale: Locale }) {
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState<'duration' | 'note' | 'photo' | null>(null);
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const session = store.state.session;
  if (!session) return <p>{t(locale, 'noSession')}</p>;
  const current =
    session.effective.steps.find((s) => s.id === session.activeId) ?? session.effective.steps[0];
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
  const upcoming = session.effective.steps.filter(
    (s) => !session.facts[s.id]?.endedAt && s.id !== session.activeId,
  );
  const completed = session.effective.steps.filter((s) => session.facts[s.id]?.endedAt);
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
      const next = s.effective.steps.find(
        (step) => !facts[step.id]?.endedAt && step.dependsOn.every((id) => facts[id]?.endedAt),
      );
      if (next) facts[next.id] = { startedAt: instant(Date.now()) };
      return {
        ...s,
        facts,
        activeId: next?.id ?? s.activeId,
        finished: !next,
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
  return (
    <div className="stack">
      <Disclosure
        title={session.recipeName}
        subtitle={`${t(locale, 'frozen')} · ${t(locale, 'version')} ${session.recipeVersion}`}
      >
        <p>{t(locale, 'snapshotHelp')}</p>
      </Disclosure>
      {session.finished ? (
        <h2>{t(locale, 'completeSession')}</h2>
      ) : (
        <>
          <h2>{titleOf(current, locale)}</h2>
          <PreparationTimer
            title={t(locale, 'remaining')}
            remaining={duration(locale, remaining)}
            start={time(locale, fact?.startedAt)}
            end={time(locale, projection.ok ? projection.value.steps[current.id]?.end : undefined)}
            progress={current.plannedDurationS ? elapsed / current.plannedDurationS : 0}
            labels={{
              start: t(locale, 'started'),
              end: t(locale, 'finish'),
              progress: t(locale, 'progress'),
            }}
          />
          <div className="actions quick-actions">
            <Button onClick={() => addTime(900)}>{t(locale, 'add15')}</Button>
            <Button
              onClick={() => {
                setMinutes((current.plannedDurationS ?? 900) / 60);
                setSheet('duration');
              }}
            >
              {t(locale, 'duration')}
            </Button>
            <Button icon="note" onClick={() => setSheet('note')}>
              {t(locale, 'note')}
            </Button>
            <Button icon="photo" onClick={() => setSheet('photo')}>
              {t(locale, 'photo')}
            </Button>
          </div>
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
          <Button variant="primary" icon="check" onClick={complete}>
            {t(locale, 'stageComplete')}
          </Button>
          <Disclosure title={t(locale, 'instructions')} defaultOpen>
            <p>
              {curatedText(locale, current.label, true) ??
                t(locale, instructionKey(current.operation))}
            </p>
            {stepDetails(current, locale).map((d) => (
              <p key={d}>{d}</p>
            ))}
          </Disclosure>
        </>
      )}
      <Disclosure title={t(locale, 'quantities')}>
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
      <Disclosure title={t(locale, 'upcoming')} defaultOpen>
        {upcoming.map((step) => (
          <StepRow
            key={step.id}
            number={session.effective.steps.indexOf(step) + 1}
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
            number={session.effective.steps.indexOf(step) + 1}
            title={titleOf(step, locale)}
            details={[time(locale, session.facts[step.id]?.endedAt)]}
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
