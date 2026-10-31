import { useState } from 'react';
import { useIntl } from 'react-intl';
import { waterSources, type ResolvedFormula } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { Ui } from '../ui/library';
import { totalWaterKey } from './water-label';

const PALETTE = ['bg-primary', 'bg-on-surface', 'bg-muted', 'bg-field-outline'] as const;

const hatchedStyle = {
  backgroundImage:
    'repeating-linear-gradient(45deg, var(--color-muted), var(--color-muted) 0.15rem, var(--color-surface) 0.15rem, var(--color-surface) 0.3rem)',
};

interface Props {
  readonly resolved: ResolvedFormula;
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Explains calculated water quantities from authoritative engine contributions (L10, L11, L16, L19).
 * Uses the shared fp.bottom-sheet overlay function-renderer; contribution rows stay discoverable via fp.disclosure.
 */
export const WaterExplanation = ({ resolved, open, onClose }: Props) => {
  const intl = useIntl();
  const { t, grams, pct, wholePct, name } = useMessages();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const water = resolved.totalWater;
  const statusKey = totalWaterKey(water);

  const sheetTitle = intl.formatMessage({ id: 'formula.hydration.breakdown' });
  const sheetCloseLabel = t('explain.close');

  const toggleRow = (key: string, next: boolean) => {
    setExpandedRows((prev) => ({ ...prev, [key]: next }));
  };

  const sources = waterSources(resolved);
  const barSources = sources.filter((s) => (s.sharePct ?? 0) > 0);
  const legendSources = sources.filter((s) => s.status !== 'unknown');

  return (
    <Ui
      component="fp.bottom-sheet"
      isOpen={open}
      title={sheetTitle}
      closeLabel={sheetCloseLabel}
      onDismiss={onClose}
    >
      <div className="flex flex-col gap-4 text-body text-on-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline/20 pb-3 text-body font-bold text-on-surface">
          <span>{t('formula.stat.hydration')}</span>
          <span className="tabular-nums text-right whitespace-normal">
            {statusKey === 'formula.stat.totalWaterSpecifiedEstimate'
              ? intl.formatMessage(
                  { id: 'explain.partialEstimatedSummary' },
                  {
                    grams: grams(water.value),
                    pct: wholePct(resolved.totalWaterPct),
                  },
                )
              : statusKey === 'formula.stat.totalWaterLowerBound'
                ? intl.formatMessage(
                    { id: 'explain.totalSummary' },
                    {
                      grams: intl.formatMessage(
                        { id: 'explain.lowerBound' },
                        { value: grams(water.value) },
                      ),
                      pct: intl.formatMessage(
                        { id: 'explain.lowerBound' },
                        { value: wholePct(resolved.totalWaterPct) },
                      ),
                    },
                  )
                : intl.formatMessage(
                    { id: 'explain.totalSummary' },
                    {
                      grams: grams(water.value),
                      pct:
                        statusKey === 'formula.stat.totalWaterEstimate'
                          ? t('formula.stat.totalWaterEstimate', {
                              pct: wholePct(resolved.totalWaterPct),
                            })
                          : wholePct(resolved.totalWaterPct),
                    },
                  )}
          </span>
        </div>

        {barSources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div
              data-testid="water-source-bar"
              aria-hidden="true"
              className="flex h-3 w-full overflow-hidden rounded-full bg-field-outline/20"
            >
              {barSources.map((s, index) => (
                <div
                  key={`${s.kind}-${s.source}`}
                  data-testid="water-source-segment"
                  data-source={s.source}
                  className={`h-full ${PALETTE[index % PALETTE.length]}`}
                  style={{ flexBasis: `${s.sharePct}%`, flexShrink: 0 }}
                />
              ))}
            </div>
            <p className="m-0 text-xs text-muted">{t('explain.waterSources.caption')}</p>
          </div>
        )}

        {water.unknownContributors.length > 0 && (
          <div className="flex flex-col gap-2 rounded-card border border-outline/30 bg-surface-container p-3">
            <span className="text-sm font-semibold text-alert">
              {intl.formatMessage(
                { id: 'explain.incompleteNotice' },
                { ingredients: water.unknownContributors.map(name).join(', ') },
              )}
            </span>
            <div className="flex flex-col gap-1 text-sm text-muted">
              {water.unknownContributors.map((id) => (
                <div key={`unknown-${id}`} className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2">
                    <span
                      data-testid="water-source-unknown"
                      className="h-3 w-3 shrink-0 rounded-sm border border-outline/30"
                      style={hatchedStyle}
                      aria-hidden="true"
                    />
                    <span>{name(id)}</span>
                  </span>
                  <span className="font-medium text-alert">
                    {intl.formatMessage({ id: 'explain.unknownValue' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div data-testid="water-source-legend" className="flex flex-col gap-2">
          {legendSources.map((s) => {
            if (s.grams === undefined) return null;
            const rowKey = `${s.kind}-${s.source}`;
            const isExpanded = Boolean(expandedRows[rowKey]);

            const matching = water.contributions.find(
              (c) => c.source === s.source && c.kind === s.kind,
            );

            const rowLabel =
              s.kind === 'loss' ? t('explain.loss', { name: name(s.source) }) : name(s.source);

            const range = matching?.range;

            const rowSummary = range
              ? intl.formatMessage(
                  { id: 'explain.valueWithRange' },
                  {
                    value: grams(s.grams),
                    range: intl.formatMessage(
                      { id: 'explain.range' },
                      { low: grams(range[0]), high: grams(range[1]) },
                    ),
                  },
                )
              : grams(s.grams);

            const detailMessage =
              s.kind === 'pureWater'
                ? intl.formatMessage({ id: 'explain.detail.pureWater' })
                : s.kind === 'loss'
                  ? intl.formatMessage({ id: 'explain.detail.loss' }, { name: name(s.source) })
                  : s.status === 'known'
                    ? intl.formatMessage({ id: 'explain.detail.known' })
                    : range
                      ? intl.formatMessage(
                          { id: 'explain.detail.estimatedRange' },
                          { low: grams(range[0]), high: grams(range[1]) },
                        )
                      : intl.formatMessage({ id: 'explain.detail.estimated' });

            const barIndex = barSources.findIndex(
              (b) => b.source === s.source && b.kind === s.kind,
            );
            const colorClass = barIndex >= 0 ? PALETTE[barIndex % PALETTE.length] : undefined;

            return (
              <Ui
                key={rowKey}
                component="fp.disclosure"
                expanded={isExpanded}
                onExpandedChange={(next: boolean) => toggleRow(rowKey, next)}
                label={
                  <span className="flex w-full flex-wrap items-center justify-between gap-2 text-body">
                    <span className="flex items-center gap-2">
                      {colorClass && (
                        <span
                          className={`h-3 w-3 shrink-0 rounded-sm ${colorClass}`}
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-medium text-on-surface">{rowLabel}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 font-semibold tabular-nums text-on-surface">
                      <span>{rowSummary}</span>
                      {typeof s.sharePct === 'number' && s.sharePct > 0 && (
                        <span className="text-sm font-normal text-muted">{pct(s.sharePct)}</span>
                      )}
                    </span>
                  </span>
                }
              >
                <div className="py-1 text-sm text-muted">
                  <p className="m-0">{detailMessage}</p>
                </div>
              </Ui>
            );
          })}
        </div>
      </div>
    </Ui>
  );
};
