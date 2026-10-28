import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { ResolvedFormula } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { Ui } from '../ui/library';
import { totalWaterKey } from './water-label';

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
  const { t, grams, wholePct, name } = useMessages();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const water = resolved.totalWater;
  const statusKey = totalWaterKey(water);

  const sheetTitle = intl.formatMessage({ id: 'formula.hydration.breakdown' });
  const sheetCloseLabel = t('explain.close');

  const toggleRow = (key: string, next: boolean) => {
    setExpandedRows((prev) => ({ ...prev, [key]: next }));
  };

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
                  <span>{name(id)}</span>
                  <span className="font-medium text-alert">
                    {intl.formatMessage({ id: 'explain.unknownValue' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {water.contributions.map((c) => {
            const rowKey = `${c.kind}-${c.source}`;
            const isExpanded = Boolean(expandedRows[rowKey]);

            const rowLabel =
              c.kind === 'loss' ? t('explain.loss', { name: name(c.source) }) : name(c.source);

            const rowSummary = c.range
              ? intl.formatMessage(
                  { id: 'explain.valueWithRange' },
                  {
                    value: grams(c.grams),
                    range: intl.formatMessage(
                      { id: 'explain.range' },
                      { low: grams(c.range[0]), high: grams(c.range[1]) },
                    ),
                  },
                )
              : grams(c.grams);

            const detailMessage =
              c.kind === 'pureWater'
                ? intl.formatMessage({ id: 'explain.detail.pureWater' })
                : c.kind === 'loss'
                  ? intl.formatMessage({ id: 'explain.detail.loss' }, { name: name(c.source) })
                  : c.status === 'known'
                    ? intl.formatMessage({ id: 'explain.detail.known' })
                    : c.range
                      ? intl.formatMessage(
                          { id: 'explain.detail.estimatedRange' },
                          { low: grams(c.range[0]), high: grams(c.range[1]) },
                        )
                      : intl.formatMessage({ id: 'explain.detail.estimated' });

            return (
              <Ui
                key={rowKey}
                component="fp.disclosure"
                expanded={isExpanded}
                onExpandedChange={(next: boolean) => toggleRow(rowKey, next)}
                label={
                  <span className="flex w-full flex-wrap items-center justify-between gap-2 text-body">
                    <span className="font-medium text-on-surface">{rowLabel}</span>
                    <span className="font-semibold tabular-nums text-on-surface">{rowSummary}</span>
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
