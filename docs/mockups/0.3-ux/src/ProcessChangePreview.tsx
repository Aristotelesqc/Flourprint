import {
  relativeTimeline,
  type Process,
  type ProcessStep,
  type Projection,
  type NotCarried,
  type RelativeTimeline,
} from '@flourprint/core/domain';
import { Disclosure } from './ui';
import { t, time, duration, type Locale, type MessageKey } from './messages';

export interface ProcessChangePreviewProps {
  locale: Locale;
  before: Process;
  after: Process;
  beforeProjection?: Projection;
  afterProjection?: Projection;
  beforeRelative?: RelativeTimeline;
  afterRelative?: RelativeTimeline;
  titleForStep: (step: ProcessStep) => string;
  notCarried?: readonly NotCarried[];
  copyId?: string;
  windows?: readonly { label: string; before: string; after: string }[];
}

const notCarriedKeys: Record<NotCarried, MessageKey> = {
  incorporations: 'changeDroppedIncorporations',
  accepted: 'changeDroppedEstimate',
  durationMode: 'changeDroppedDurationMode',
  plannedDurationS: 'changeDroppedDuration',
};

const formatMoment = (locale: Locale, value?: string): string =>
  value
    ? `${new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' }).format(new Date(value))} · ${time(locale, value)}`
    : t(locale, 'unknown');

const TimeRange = ({ locale, start, end }: { locale: Locale; start?: string; end?: string }) => (
  <span className="process-change-times">
    <span>{formatMoment(locale, start)}</span>
    <span aria-hidden="true">–</span>
    <span>{formatMoment(locale, end)}</span>
  </span>
);

export const ProcessChangePreview = ({
  locale,
  before,
  after,
  beforeProjection,
  afterProjection,
  beforeRelative,
  afterRelative,
  titleForStep,
  notCarried = [],
  copyId,
  windows = [],
}: ProcessChangePreviewProps) => {
  const stepName = (id: string, proc: Process) => {
    const s = proc.steps.find((item) => item.id === id);
    return s
      ? `${titleForStep(s)}${id === copyId ? ` · ${t(locale, 'changeNewStep')}` : ''}`
      : t(locale, 'unknown');
  };

  const copyStep = copyId ? after.steps.find((s) => s.id === copyId) : undefined;
  const durationRequired = copyStep && copyStep.plannedDurationS === undefined;

  const bRelResult = !beforeProjection ? relativeTimeline(before) : undefined;
  const bRel: RelativeTimeline | undefined =
    beforeRelative ?? (bRelResult && bRelResult.ok ? bRelResult.value : undefined);

  const aRelResult = !afterProjection ? relativeTimeline(after) : undefined;
  const aRel: RelativeTimeline | undefined =
    afterRelative ?? (aRelResult && aRelResult.ok ? aRelResult.value : undefined);

  const affectedSteps = after.steps.flatMap((afterStep) => {
    const beforeStep = before.steps.find((s) => s.id === afterStep.id);
    const bProj = beforeProjection?.steps[afterStep.id];
    const aProj = afterProjection?.steps[afterStep.id];
    const bTiming = bRel?.steps.find((s) => s.stepId === afterStep.id)?.timing;
    const aTiming = aRel?.steps.find((s) => s.stepId === afterStep.id)?.timing;
    const isNew = !beforeStep;
    const depsChanged =
      !isNew &&
      (beforeStep.dependsOn.length !== afterStep.dependsOn.length ||
        beforeStep.dependsOn.some((d, i) => d !== afterStep.dependsOn[i]));
    const timesChanged =
      beforeProjection && afterProjection
        ? bProj?.start !== aProj?.start ||
          bProj?.end !== aProj?.end ||
          bProj?.status !== aProj?.status ||
          (bProj?.unknownAfter ?? []).length !== (aProj?.unknownAfter ?? []).length ||
          (bProj?.unknownAfter ?? []).some((id, index) => id !== aProj?.unknownAfter[index])
        : bTiming?.status !== aTiming?.status ||
          (bTiming?.status === 'known' &&
            aTiming?.status === 'known' &&
            (bTiming.startS !== aTiming.startS || bTiming.endS !== aTiming.endS));

    if (isNew || depsChanged || timesChanged) {
      return [{ afterStep, beforeStep, bProj, aProj, bTiming, aTiming, isNew }];
    }
    return [];
  });

  const renderTiming = (
    proj?: { start?: string; end?: string },
    rel?: { status: 'known'; startS: number; endS: number } | { status: 'unknown' },
  ) => {
    if (proj?.start && proj.end) {
      return <TimeRange locale={locale} start={proj.start} end={proj.end} />;
    }
    if (rel && rel.status === 'known') {
      return (
        <span className="process-change-times">
          <span>+{duration(locale, rel.startS)}</span>
          <span aria-hidden="true">–</span>
          <span>+{duration(locale, rel.endS)}</span>
        </span>
      );
    }
    return <p>{t(locale, 'changeNoProjection')}</p>;
  };

  const renderDeps = (deps: readonly string[], proc: Process) =>
    deps.length > 0
      ? deps.map((id) => stepName(id, proc)).join(', ')
      : t(locale, 'changeNoDependencies');

  return (
    <section className="process-change-preview stack" data-testid="process-change-preview">
      {durationRequired && (
        <p className="warning" role="alert">
          {t(locale, 'changeDurationRequired')}
        </p>
      )}

      {notCarried.length > 0 && (
        <div className="stack muted">
          <strong>{t(locale, 'changeNotCarried')}</strong>
          <ul>
            {notCarried.map((key) => (
              <li key={key}>{t(locale, notCarriedKeys[key])}</li>
            ))}
          </ul>
        </div>
      )}

      {affectedSteps.length === 0 ? (
        <p className="muted">
          {t(
            locale,
            (beforeProjection && afterProjection) || (bRel && aRel)
              ? 'changeDependenciesUnchanged'
              : 'changeNoProjection',
          )}
        </p>
      ) : (
        <Disclosure title={`${t(locale, 'changeAffectedSteps')} (${affectedSteps.length})`}>
          <ul className="process-change-list stack">
            {affectedSteps.map(
              ({ afterStep, beforeStep, bProj, aProj, bTiming, aTiming, isNew }) => (
                <li
                  key={afterStep.id}
                  className="stack"
                  data-testid={`affected-step-${afterStep.id}`}
                >
                  <strong>{stepName(afterStep.id, after)}</strong>
                  <dl className="stack">
                    <dt className="muted">{t(locale, 'changeBefore')}</dt>
                    <dd>
                      {beforeStep ? (
                        <>
                          {t(locale, 'changeDependencies')} :{' '}
                          {renderDeps(beforeStep.dependsOn, before)}
                        </>
                      ) : (
                        t(locale, 'changeNewStep')
                      )}
                      {!isNew && renderTiming(bProj, bTiming)}
                    </dd>
                    <dt className="muted">{t(locale, 'changeAfter')}</dt>
                    <dd>
                      {t(locale, 'changeDependencies')} : {renderDeps(afterStep.dependsOn, after)}
                      {renderTiming(aProj, aTiming)}
                    </dd>
                  </dl>
                </li>
              ),
            )}
          </ul>
        </Disclosure>
      )}

      {windows.length > 0 && (
        <Disclosure title={t(locale, 'changeWindows')}>
          <ul className="process-change-list stack" data-testid="process-change-windows">
            {windows.map((window, index) => (
              <li className="stack" key={index}>
                <strong>{window.label}</strong>
                <dl className="stack">
                  <dt className="muted">{t(locale, 'changeBefore')}</dt>
                  <dd>{window.before}</dd>
                  <dt className="muted">{t(locale, 'changeAfter')}</dt>
                  <dd>{window.after}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
      <Disclosure title={t(locale, 'changeCandidateOrder')}>
        <ol>
          {after.steps.map((step) => (
            <li key={step.id}>{stepName(step.id, after)}</li>
          ))}
        </ol>
      </Disclosure>
    </section>
  );
};
