import { useState } from 'react';
import type { Formula } from '@flourprint/core/domain';
import { Surface, Button, CompactDialog } from './ui';
import {
  historyCopyT,
  formatHistoryDate,
  formatHistoryError,
  type HistoryError,
} from './history-copy';
import { editingCopyT } from './editing-copy';
import { t, grams, num, colon, duration, type Locale } from './messages';
import type { Recipe, Prototype, SavedRevision } from './model';
import './recipe-history.css';

export interface RecipeHistoryProps {
  recipe: Recipe;
  store: Prototype;
  locale: Locale;
  isDraftDirty: boolean;
}

export function RecipeHistory({ recipe, store, locale, isDraftDirty }: RecipeHistoryProps) {
  const { state } = store;
  const [promoteTarget, setPromoteTarget] = useState<number | null>(null);
  const [promoteName, setPromoteName] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null);
  const [expectedHead, setExpectedHead] = useState<number | null>(null);

  const referenceVersions = recipe.referenceVersions;

  // Sort historical revisions newest first by explicit version counter
  const historicalRevisions: SavedRevision[] = [...recipe.revisions].sort(
    (a, b) => b.version - a.version,
  );

  const nextMilestoneNumber =
    referenceVersions.reduce((max, ref) => Math.max(max, ref.number), 0) + 1;

  const isModalOpen = promoteTarget !== null || restoreTarget !== null;

  const handleOpenPromote = (version: number) => {
    if (state.historyError) {
      store.setState((s) => ({ ...s, historyError: undefined, error: '' }));
    }
    setExpectedHead(recipe.version);
    setPromoteName('');
    setPromoteTarget(version);
  };

  const handleOpenRestore = (version: number) => {
    if (state.historyError) {
      store.setState((s) => ({ ...s, historyError: undefined, error: '' }));
    }
    setExpectedHead(recipe.version);
    setRestoreTarget(version);
  };

  const handlePromoteConfirm = () => {
    if (promoteTarget === null || expectedHead === null) return;
    const promoteFn = store.promoteReferenceVersion as (
      v: number,
      n?: string,
      expHead?: number,
    ) => boolean;
    const ok = promoteFn(promoteTarget, promoteName.trim() || undefined, expectedHead);
    if (ok) {
      setPromoteTarget(null);
      setPromoteName('');
      setExpectedHead(null);
    }
  };

  const handleRestoreConfirm = () => {
    if (restoreTarget === null || expectedHead === null) return;
    const restoreFn = store.restoreRevision as (v: number, expHead?: number) => boolean;
    const ok = restoreFn(restoreTarget, expectedHead);
    if (ok) {
      setRestoreTarget(null);
      setExpectedHead(null);
    }
  };

  const renderAnchorMetric = (formula?: Formula) => {
    if (!formula?.anchor) return null;
    const { anchor } = formula;
    const kindLabel =
      anchor.kind === 'flourTotal'
        ? historyCopyT(locale, 'anchorFlour')
        : anchor.kind === 'doughWeight'
          ? historyCopyT(locale, 'anchorDough')
          : historyCopyT(locale, 'anchorPieces');

    const valueStr =
      anchor.kind === 'pieces'
        ? `${num(locale, anchor.count)} × ${grams(locale, anchor.gramsEach)}`
        : grams(locale, anchor.grams);

    return (
      <div className="history-item-metrics">
        <span>{kindLabel}</span>
        <strong>{valueStr}</strong>
      </div>
    );
  };

  const recipeSessions = state.sessionHistory.filter((session) => session.recipeId === recipe.id);

  return (
    <div className="recipe-history" data-testid="recipe-history-view">
      {/* Active uncommitted draft banner */}
      {isDraftDirty && (
        <div className="recipe-history-banner draft-banner" role="status">
          <strong>{historyCopyT(locale, 'draftBannerTitle')}</strong>
          <p>{historyCopyT(locale, 'draftBannerSubtitle')}</p>
        </div>
      )}

      {/* Structured history error banner: shown here only when modal is not open */}
      {!isModalOpen && state.historyError && (
        <div className="recipe-history-banner error-banner" role="alert">
          {formatHistoryError(state.historyError as HistoryError, locale)}
        </div>
      )}

      {/* Section 1: Reference Versions */}
      <section aria-labelledby="heading-ref-versions">
        <header className="history-section-header">
          <h2 id="heading-ref-versions">{historyCopyT(locale, 'referenceVersionsTitle')}</h2>
          <p>{historyCopyT(locale, 'referenceVersionsSubtitle')}</p>
        </header>

        {referenceVersions.length > 0 ? (
          <div className="history-list">
            {referenceVersions.map((ref) => (
              <Surface key={ref.number} className="history-item">
                <div className="history-item-top">
                  <div className="history-item-title-group">
                    <h3>
                      <span>
                        {historyCopyT(locale, 'referenceVersionBadge', {
                          number: ref.number,
                        })}
                      </span>
                      {ref.name && <span>· {ref.name}</span>}
                    </h3>
                    <p className="history-item-date">
                      {historyCopyT(locale, 'sourceRevision', { version: ref.version })}
                      {ref.createdAt && ` · ${formatHistoryDate(ref.createdAt, locale)}`}
                    </p>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <p className="history-empty-text">{historyCopyT(locale, 'emptyReferenceVersions')}</p>
        )}
      </section>

      {/* Section 2: Saved History (Current Head + Prior Revisions) */}
      <section aria-labelledby="heading-saved-history">
        <header className="history-section-header">
          <h2 id="heading-saved-history">{historyCopyT(locale, 'savedHistoryTitle')}</h2>
          <p>{historyCopyT(locale, 'savedHistorySubtitle')}</p>
        </header>

        <div className="history-list">
          {/* Current Saved Head */}
          <Surface className="history-item">
            <div className="history-item-top">
              <div className="history-item-title-group">
                <h3>
                  <span>{historyCopyT(locale, 'currentSavedHead')}</span>
                  <span className="history-head-tag">
                    {historyCopyT(locale, 'revisionItem', { version: recipe.version })}
                  </span>
                </h3>
                {recipe.savedAt && (
                  <p className="history-item-date">
                    {historyCopyT(locale, 'savedAt', {
                      date: formatHistoryDate(recipe.savedAt, locale),
                    })}
                  </p>
                )}
              </div>
            </div>

            {renderAnchorMetric(recipe.formula)}

            <div className="history-item-actions">
              <Button
                variant="quiet"
                onClick={() => handleOpenPromote(recipe.version)}
                dataTestId={`promote-revision-${recipe.version}`}
              >
                {historyCopyT(locale, 'promoteAction')}
              </Button>
            </div>
          </Surface>

          {/* Historical Revisions */}
          {historicalRevisions.length > 0 ? (
            historicalRevisions.map((rev) => (
              <Surface key={rev.version} className="history-item">
                <div className="history-item-top">
                  <div className="history-item-title-group">
                    <h3>{historyCopyT(locale, 'revisionItem', { version: rev.version })}</h3>
                    {rev.createdAt && (
                      <p className="history-item-date">
                        {historyCopyT(locale, 'createdAt', {
                          date: formatHistoryDate(rev.createdAt, locale),
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {rev.note && <p className="history-item-note">{rev.note}</p>}
                {renderAnchorMetric(rev.formula)}

                <div className="history-item-actions">
                  <Button
                    variant="quiet"
                    onClick={() => handleOpenRestore(rev.version)}
                    dataTestId={`restore-revision-${rev.version}`}
                  >
                    {historyCopyT(locale, 'restoreAction')}
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={() => handleOpenPromote(rev.version)}
                    dataTestId={`promote-revision-${rev.version}`}
                  >
                    {historyCopyT(locale, 'promoteAction')}
                  </Button>
                </div>
              </Surface>
            ))
          ) : (
            <p className="history-empty-text">{historyCopyT(locale, 'emptyRevisions')}</p>
          )}
        </div>
      </section>

      {/* Section 3: Preparation History */}
      <section aria-labelledby="heading-preparations">
        <header className="history-section-header">
          <h2 id="heading-preparations">{historyCopyT(locale, 'preparationsTitle')}</h2>
        </header>

        {recipeSessions.length > 0 ? (
          <div className="history-list">
            {recipeSessions.map((session) => (
              <Surface key={session.id} className="history-item">
                <h3>
                  {historyCopyT(locale, 'revisionBaseline', {
                    version: session.recipeVersion,
                  })}{' '}
                  ·{' '}
                  {session.abandoned
                    ? editingCopyT(locale, 'statusAbandoned')
                    : session.outcome
                      ? t(
                          locale,
                          session.outcome.result === 'cooked'
                            ? 'resultCooked'
                            : session.outcome.result === 'dough'
                              ? 'resultDough'
                              : session.outcome.result === 'cookedAndDough'
                                ? 'resultMixed'
                                : 'unknown',
                        )
                      : t(locale, 'unknown')}
                </h3>
                {!session.abandoned && session.outcome?.dough && (
                  <p>{t(locale, session.outcome.dough)}</p>
                )}
                <p className="history-item-date">
                  {t(locale, 'actualDuration')}
                  {colon(locale)}
                  {session.endedAt
                    ? duration(
                        locale,
                        (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000,
                      )
                    : t(locale, 'unknownDuration')}
                </p>
                <p className="history-item-date">{historyCopyT(locale, 'noRating')}</p>
              </Surface>
            ))}
          </div>
        ) : (
          <p className="history-empty-text">{historyCopyT(locale, 'emptyPreparations')}</p>
        )}
      </section>

      {/* Promote Milestone Dialog */}
      <CompactDialog
        open={promoteTarget !== null}
        onClose={() => setPromoteTarget(null)}
        title={historyCopyT(locale, 'promoteDialogTitle')}
        closeLabel={t(locale, 'close')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setPromoteTarget(null)}>
              {historyCopyT(locale, 'cancelAction')}
            </Button>
            <Button variant="primary" dataTestId="submit-promote" onClick={handlePromoteConfirm}>
              {historyCopyT(locale, 'promoteSubmit')}
            </Button>
          </div>
        }
      >
        <div className="history-dialog-body">
          {state.historyError && (
            <div className="recipe-history-banner error-banner" role="alert">
              {formatHistoryError(state.historyError as HistoryError, locale)}
            </div>
          )}
          <p>
            {historyCopyT(locale, 'promoteDialogDescription', {
              nextNumber: nextMilestoneNumber,
              version: promoteTarget ?? 0,
            })}
          </p>
          <label>
            <span>{historyCopyT(locale, 'promoteNameLabel')}</span>
            <input
              type="text"
              className="history-dialog-input"
              value={promoteName}
              placeholder={historyCopyT(locale, 'promoteNamePlaceholder')}
              onChange={(e) => setPromoteName(e.target.value)}
              autoFocus
            />
          </label>
        </div>
      </CompactDialog>

      {/* Restore Revision Dialog */}
      <CompactDialog
        open={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        title={historyCopyT(locale, 'restoreDialogTitle')}
        closeLabel={t(locale, 'close')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setRestoreTarget(null)}>
              {historyCopyT(locale, 'cancelAction')}
            </Button>
            <Button variant="primary" dataTestId="submit-restore" onClick={handleRestoreConfirm}>
              {historyCopyT(locale, 'restoreSubmit')}
            </Button>
          </div>
        }
      >
        <div className="history-dialog-body">
          {state.historyError && (
            <div className="recipe-history-banner error-banner" role="alert">
              {formatHistoryError(state.historyError as HistoryError, locale)}
            </div>
          )}
          <p>
            {historyCopyT(locale, 'restoreDialogDescription', {
              version: restoreTarget ?? 0,
            })}
          </p>
        </div>
      </CompactDialog>
    </div>
  );
}
