import { useId, useMemo } from 'react';
import type {
  AnchoredTimeline,
  AnchoredWindow,
  Formula,
  Process,
  RelativeTimeline,
  Window,
} from '@flourprint/core/domain';
import { formatDayTime, formatDuration, formatTime, localDayKey } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { Rows } from '../ui/Layout';

interface Props {
  readonly formula: Formula;
  readonly process: Process;
  readonly timeline: RelativeTimeline;
  readonly anchored?: AnchoredTimeline;
}

type CompleteWindow = Extract<Window | AnchoredWindow, { readonly status: 'complete' }>;

const formatRelativeOffset = (seconds: number): string => {
  const formatted = formatDuration(seconds);
  return seconds < 0 && formatted !== '0 min' ? `−${formatted}` : `+${formatted}`;
};

const formatCompleteRange = (
  win: CompleteWindow,
  isTotal: boolean,
  locale: string,
): readonly [string, string] => {
  if ('start' in win) {
    const format =
      isTotal || localDayKey(win.start) !== localDayKey(win.end) ? formatDayTime : formatTime;
    return [format(win.start, locale), format(win.end, locale)];
  }
  return [formatRelativeOffset(win.startS), formatRelativeOffset(win.endS)];
};

/**
 * Generated phase windows and total planned span for the Planning tab (#170, L75/L76/L108).
 * Reads engine-derived `RelativeTimeline` and optional `AnchoredTimeline` without UI arithmetic.
 */
export const PlanningWindows = ({ formula, process, timeline, anchored }: Props) => {
  const { t, name, componentName, stepName, locale } = useMessages();
  const headingId = useId();

  const stepLabelById = new Map(process.steps.map((step) => [step.id, stepName(step)]));
  const anchoredGroupById = useMemo(
    () => new Map(anchored?.groups.map((group) => [group.id, group.window]) ?? []),
    [anchored],
  );

  const groupLabel = (groupId: string): string => {
    if (groupId === 'mainDough') return t('planning.windows.group.mainDough');
    if (groupId === 'cooking') return t('planning.windows.group.cooking');
    if (groupId.startsWith('component:')) {
      const componentId = groupId.slice('component:'.length);
      const component = formula.components.find((c) => c.id === componentId);
      return component ? componentName(formula, component) : name(componentId);
    }
    return groupId;
  };

  const renderRow = (
    testId: string,
    label: string,
    win: Window | AnchoredWindow,
    isTotal: boolean,
  ) => {
    const range = win.status === 'complete' ? formatCompleteRange(win, isTotal, locale) : undefined;
    const blockerNames =
      win.status !== 'complete' && win.reasons.length > 0
        ? win.reasons.map((id) => stepLabelById.get(id) ?? id).join(', ')
        : undefined;

    return (
      <div key={testId} data-testid={testId} className="flex min-w-0 flex-col gap-1 px-3 py-3">
        <h3
          className={`m-0 min-w-0 break-words m3-type-body text-ink ${
            isTotal ? 'font-bold' : 'font-semibold'
          }`}
        >
          {label}
        </h3>
        {win.status === 'complete' && range ? (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
            <span className="min-w-0 break-words m3-type-supporting font-semibold text-ink">
              <span className="inline-block">{range[0]} –</span>{' '}
              <span className="inline-block">{range[1]}</span>
            </span>
            <span className="m3-type-supporting text-muted">
              {t('planning.windows.span', { duration: formatDuration(win.elapsedS) })}
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="m3-type-supporting font-medium text-muted">
              {win.status === 'partial'
                ? t('planning.windows.partial')
                : t('planning.windows.unknown')}
            </span>
            {blockerNames && (
              <span className="min-w-0 break-words m3-type-supporting text-muted">
                {t('planning.windows.blockedBy', { steps: blockerNames })}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const totalWindow: Window | AnchoredWindow = anchored ? anchored.total : timeline.total;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="m-0 m3-type-supporting px-1 font-semibold text-muted">
        {t('planning.windows.title')}
      </h2>
      <Rows>
        {renderRow('planning-window-total', t('planning.windows.total'), totalWindow, true)}
        {timeline.groups.map((group) => {
          const win = anchored ? anchoredGroupById.get(group.id) : group.window;
          return win
            ? renderRow(`planning-window-${group.id}`, groupLabel(group.id), win, false)
            : null;
        })}
      </Rows>
    </section>
  );
};
