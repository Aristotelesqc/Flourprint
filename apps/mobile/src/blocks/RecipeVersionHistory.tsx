import { useIonAlert } from '@ionic/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  promoteReferenceVersion,
  restoreRevision,
  type RecipeHistoryError,
  type RecipeStoreError,
} from '@flourprint/core/application';
import type { Formula, ReferenceVersion, Result, Revision } from '@flourprint/core/domain';
import { formatDayTime } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { useServices, type Services } from '../services/services';
import type { GuardedResult } from '../services/writes';
import { Ui } from '../ui/library';
import { useRecipeDiscardMotion } from '../ui/useRecipeDiscardMotion';

interface RecipeVersionHistoryProps {
  readonly recipeId: string;
  readonly baseRevision: Revision;
  readonly visible: boolean;
  readonly hasDraft: boolean;
  readonly trashed: boolean;
  readonly busy: boolean;
  readonly runWrite: <T>(work: () => Promise<T>) => Promise<GuardedResult<T>>;
  readonly dismissRecipeNotice: () => Promise<void>;
  readonly onRestored: (revision: Revision) => void;
}

interface ReferencesLoadState {
  readonly services: Services;
  readonly contextKey: string;
  readonly status: 'loading' | 'ready' | 'failed';
  readonly items: readonly ReferenceVersion[];
}

interface OlderRevisionsLoadState {
  readonly services: Services;
  readonly contextKey: string;
  readonly status: 'loading' | 'ready' | 'failed';
  readonly items: readonly Revision[];
  readonly error?: RecipeStoreError | 'missing' | 'storage';
}

type ActionFeedback =
  | {
      readonly services: Services;
      readonly recipeId: string;
      readonly kind: 'error';
      readonly error: RecipeHistoryError | 'busy' | 'storage';
    }
  | {
      readonly services: Services;
      readonly recipeId: string;
      readonly kind: 'promoted';
      readonly reference: ReferenceVersion;
    }
  | {
      readonly services: Services;
      readonly recipeId: string;
      readonly kind: 'restored';
      readonly version: number;
      readonly noOp: boolean;
    };

type HistoryAction =
  | {
      readonly kind: 'promote';
      readonly version: number;
      readonly name: string | undefined;
      readonly expectedHead: number;
    }
  | {
      readonly kind: 'restore';
      readonly version: number;
      readonly expectedHead: number;
    };

type SettledAction =
  | { readonly kind: 'promote'; readonly result: Result<ReferenceVersion, RecipeHistoryError> }
  | { readonly kind: 'restore'; readonly result: Result<Revision, RecipeHistoryError> };

const emptyReferences: readonly ReferenceVersion[] = [];
const emptyRevisions: readonly Revision[] = [];

/**
 * Recipe version history (#172, L83/L103): numbered reference versions and saved revisions,
 * separated from preparations and operating strictly on persisted revisions.
 */
export const RecipeVersionHistory = ({
  recipeId,
  baseRevision,
  visible,
  hasDraft,
  trashed,
  busy,
  runWrite,
  dismissRecipeNotice,
  onRestored,
}: RecipeVersionHistoryProps) => {
  const { t, grams, locale } = useMessages();
  const services = useServices();
  const [presentAlert] = useIonAlert();
  const alertMotion = useRecipeDiscardMotion();

  const referencesHeadingId = useId();
  const revisionsHeadingId = useId();
  const referencesHeadingRef = useRef<HTMLHeadingElement>(null);
  const headVersion = baseRevision.version;
  const contextKey = `${recipeId}@${headVersion}`;

  const [referencesLoad, setReferencesLoad] = useState<ReferencesLoadState>(() => ({
    services,
    contextKey,
    status: 'loading',
    items: [],
  }));
  const [revisionsLoad, setRevisionsLoad] = useState<OlderRevisionsLoadState>(() => ({
    services,
    contextKey,
    status: 'loading',
    items: [],
  }));
  const [referencesRefresh, setReferencesRefresh] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>();

  const confirmingRef = useRef(false);
  const pendingFocusReferencesRef = useRef(false);
  const loadedRevisionsRef = useRef<{ services: Services; contextKey: string } | undefined>(
    undefined,
  );
  const liveRef = useRef({ mounted: true, services, recipeId, trashed, busy });

  useEffect(() => {
    liveRef.current = { mounted: true, services, recipeId, trashed, busy };
  }, [services, recipeId, trashed, busy]);

  useEffect(
    () => () => {
      liveRef.current.mounted = false;
    },
    [],
  );

  useEffect(() => {
    if (!visible) {
      setActionFeedback(undefined);
      pendingFocusReferencesRef.current = false;
      return;
    }

    let cancelled = false;
    const targetServices = services;
    const targetRecipeId = recipeId;
    const targetHead = headVersion;
    const targetKey = `${targetRecipeId}@${targetHead}`;

    void (async () => {
      try {
        const items = await targetServices.recipes.listReferenceVersions(targetRecipeId);
        if (cancelled) return;
        setReferencesLoad({
          services: targetServices,
          contextKey: targetKey,
          status: 'ready',
          items,
        });
      } catch (cause) {
        if (cancelled) return;
        console.error(cause);
        setReferencesLoad({
          services: targetServices,
          contextKey: targetKey,
          status: 'failed',
          items: [],
        });
      }
    })();

    const alreadyLoadedRevisions =
      loadedRevisionsRef.current?.services === targetServices &&
      loadedRevisionsRef.current.contextKey === targetKey;

    if (targetHead > 1 && !alreadyLoadedRevisions) {
      void (async () => {
        try {
          const items: Revision[] = [];
          for (let version = targetHead - 1; version >= 1; version -= 1) {
            if (cancelled) return;
            const res = await targetServices.recipes.getRevision(targetRecipeId, version);
            if (cancelled) return;
            if (!res.ok) {
              setRevisionsLoad({
                services: targetServices,
                contextKey: targetKey,
                status: 'failed',
                items: [],
                error: res.error,
              });
              return;
            }
            if (!res.value) {
              setRevisionsLoad({
                services: targetServices,
                contextKey: targetKey,
                status: 'failed',
                items: [],
                error: 'missing',
              });
              return;
            }
            items.push(res.value);
          }
          loadedRevisionsRef.current = { services: targetServices, contextKey: targetKey };
          setRevisionsLoad({
            services: targetServices,
            contextKey: targetKey,
            status: 'ready',
            items,
          });
        } catch (cause) {
          if (cancelled) return;
          console.error(cause);
          setRevisionsLoad({
            services: targetServices,
            contextKey: targetKey,
            status: 'failed',
            items: [],
            error: 'storage',
          });
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [visible, services, recipeId, headVersion, referencesRefresh]);

  const refMatch = referencesLoad.services === services && referencesLoad.contextKey === contextKey;
  const references = refMatch ? referencesLoad.items : emptyReferences;
  const referencesStatus: 'loading' | 'ready' | 'failed' = refMatch
    ? referencesLoad.status
    : 'loading';

  useEffect(() => {
    if (
      visible &&
      pendingFocusReferencesRef.current &&
      !confirmingRef.current &&
      referencesStatus === 'ready' &&
      references.length > 0
    ) {
      pendingFocusReferencesRef.current = false;
      requestAnimationFrame(() => referencesHeadingRef.current?.focus({ preventScroll: true }));
    }
  }, [visible, referencesStatus, references]);

  const revMatch = revisionsLoad.services === services && revisionsLoad.contextKey === contextKey;
  const olderRevisions = headVersion > 1 && revMatch ? revisionsLoad.items : emptyRevisions;
  const olderStatus: 'loading' | 'ready' | 'failed' =
    headVersion <= 1 ? 'ready' : revMatch ? revisionsLoad.status : 'loading';
  const olderError = headVersion > 1 && revMatch ? revisionsLoad.error : undefined;

  const savedRevisions = useMemo(
    () => [baseRevision, ...olderRevisions],
    [baseRevision, olderRevisions],
  );

  const referenceByVersion = useMemo(() => {
    const map = new Map<number, ReferenceVersion>();
    for (const ref of references) {
      map.set(ref.version, ref);
    }
    return map;
  }, [references]);

  const formatHistoryError = (failure: RecipeHistoryError | RecipeStoreError): string => {
    switch (failure.code) {
      case 'HeadConflict':
        return t('history.versions.error.HeadConflict', {
          currentHead: failure.details?.currentHead ?? '',
        });
      case 'UnknownRevision':
        return t('history.versions.error.UnknownRevision', {
          version: failure.details?.version ?? '',
        });
      case 'AlreadyReferenced':
        return t('history.versions.error.AlreadyReferenced', {
          number: failure.details?.number ?? '',
        });
      case 'RecipeTrashed':
        return t('error.RecipeTrashed');
      case 'NotFound':
        return t('error.NotFound');
      case 'UnsupportedDocumentVersion':
        return t('history.versions.error.UnsupportedDocumentVersion', {
          schemaVersion: failure.details?.schemaVersion ?? '',
        });
    }
  };

  const formatAnchorSummary = (anchor: Formula['anchor']): string => {
    switch (anchor.kind) {
      case 'doughWeight':
        return `${t('formula.anchor.doughWeight')} · ${grams(anchor.grams)}`;
      case 'flourTotal':
        return `${t('formula.anchor.flourTotal')} · ${grams(anchor.grams)}`;
      case 'pieces':
        return t('recipe.document.summaryPieces', {
          count: anchor.count,
          grams: grams(anchor.gramsEach),
        });
    }
  };

  const runHistoryAction = async (
    targetServices: Services,
    targetRecipeId: string,
    action: HistoryAction,
  ) => {
    setActionFeedback(undefined);
    const guarded = await runWrite<SettledAction>(async () =>
      action.kind === 'promote'
        ? {
            kind: 'promote',
            result: await promoteReferenceVersion(
              targetServices.recipes,
              targetRecipeId,
              action.version,
              action.name,
              action.expectedHead,
              targetServices.realClock.now(),
            ),
          }
        : {
            kind: 'restore',
            result: await restoreRevision(
              targetServices.recipes,
              targetRecipeId,
              action.version,
              action.expectedHead,
              targetServices.realClock.now(),
            ),
          },
    );

    if (
      !liveRef.current.mounted ||
      liveRef.current.services !== targetServices ||
      liveRef.current.recipeId !== targetRecipeId
    ) {
      return;
    }
    if (!guarded.ok) {
      setActionFeedback({
        services: targetServices,
        recipeId: targetRecipeId,
        kind: 'error',
        error: guarded.reason,
      });
      return;
    }

    const settled = guarded.value;
    if (!settled.result.ok) {
      setActionFeedback({
        services: targetServices,
        recipeId: targetRecipeId,
        kind: 'error',
        error: settled.result.error,
      });
      if (settled.kind === 'promote' && settled.result.error.code === 'AlreadyReferenced') {
        setReferencesRefresh((count) => count + 1);
      }
      return;
    }

    if (settled.kind === 'promote') {
      pendingFocusReferencesRef.current = true;
      setActionFeedback({
        services: targetServices,
        recipeId: targetRecipeId,
        kind: 'promoted',
        reference: settled.result.value,
      });
      setReferencesRefresh((count) => count + 1);
      return;
    }

    const restored = settled.result.value;
    setActionFeedback({
      services: targetServices,
      recipeId: targetRecipeId,
      kind: 'restored',
      version: restored.version,
      noOp: restored.version === action.expectedHead,
    });
    onRestored(restored);
  };

  const openActionAlert = async (kind: 'promote' | 'restore', revision: Revision) => {
    if (trashed || busy || confirmingRef.current) return;
    const targetServices = services;
    const targetRecipeId = recipeId;
    const expectedHead = headVersion;
    const chosenVersion = revision.version;

    confirmingRef.current = true;
    await dismissRecipeNotice();
    const live = liveRef.current;
    if (!live.mounted || live.services !== targetServices || live.recipeId !== targetRecipeId) {
      confirmingRef.current = false;
      return;
    }
    void presentAlert({
      ...alertMotion,
      header: t(
        kind === 'promote' ? 'history.versions.promoteTitle' : 'history.versions.restoreTitle',
      ),
      message: t(
        kind === 'promote'
          ? 'history.versions.promoteConfirmMessage'
          : 'history.versions.restoreConfirmMessage',
        { version: chosenVersion },
      ),
      ...(kind === 'promote'
        ? {
            inputs: [
              {
                name: 'name',
                type: 'text' as const,
                placeholder: t('history.versions.promoteNamePlaceholder'),
                attributes: {
                  'aria-label': t('history.versions.promoteNameLabel'),
                },
              },
            ],
          }
        : {}),
      onDidDismiss: () => {
        confirmingRef.current = false;
        if (pendingFocusReferencesRef.current && referencesStatus === 'ready') {
          pendingFocusReferencesRef.current = false;
          requestAnimationFrame(() => referencesHeadingRef.current?.focus({ preventScroll: true }));
        }
      },
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t(
            kind === 'promote'
              ? 'history.versions.promoteConfirm'
              : 'history.versions.restoreConfirm',
          ),
          handler: (values: { name?: string }) => {
            if (liveRef.current.trashed || liveRef.current.busy) return;
            if (kind === 'promote') {
              const trimmed = (values?.name ?? '').trim();
              void runHistoryAction(targetServices, targetRecipeId, {
                kind: 'promote',
                version: chosenVersion,
                name: trimmed === '' ? undefined : trimmed,
                expectedHead,
              });
              return;
            }
            void runHistoryAction(targetServices, targetRecipeId, {
              kind: 'restore',
              version: chosenVersion,
              expectedHead,
            });
          },
        },
      ],
    });
  };

  const activeFeedback =
    actionFeedback !== undefined &&
    actionFeedback.services === services &&
    actionFeedback.recipeId === recipeId
      ? actionFeedback
      : undefined;

  let feedbackMessage: string | undefined;
  if (activeFeedback) {
    if (activeFeedback.kind === 'error') {
      if (activeFeedback.error === 'busy') feedbackMessage = t('state.writeBusy');
      else if (activeFeedback.error === 'storage') feedbackMessage = t('state.storageWrite');
      else feedbackMessage = formatHistoryError(activeFeedback.error);
    } else if (activeFeedback.kind === 'promoted') {
      const refName = activeFeedback.reference.name?.trim();
      feedbackMessage =
        refName !== undefined && refName !== ''
          ? t('history.versions.promotedNamed', {
              number: activeFeedback.reference.number,
              name: refName,
            })
          : t('history.versions.promoted', { number: activeFeedback.reference.number });
    } else {
      feedbackMessage = activeFeedback.noOp
        ? t('history.versions.restoredNoOp', { version: activeFeedback.version })
        : t('history.versions.restored', { version: activeFeedback.version });
    }
  }

  const olderErrorMessage =
    olderError === undefined
      ? undefined
      : olderError === 'missing' || olderError === 'storage'
        ? t('state.storageRead')
        : formatHistoryError(olderError);

  const actionsDisabled = trashed || busy;

  return (
    <div className="flex flex-col gap-6">
      {hasDraft && (
        <Ui
          component="fp.surface"
          variant="container"
          padding="compact"
          role="status"
          className="text-supporting text-on-surface break-words"
        >
          {t('history.versions.draftNotice')}
        </Ui>
      )}

      <section aria-labelledby={referencesHeadingId} className="flex flex-col gap-3">
        <h2
          ref={referencesHeadingRef}
          id={referencesHeadingId}
          tabIndex={-1}
          className="m-0 text-supporting font-bold tracking-wider text-muted uppercase outline-none"
        >
          {t('history.versions.referencesTitle')}
        </h2>
        {referencesStatus === 'loading' ? (
          <p role="status" className="m-0 px-1 text-supporting text-muted">
            {t('history.versions.referencesLoading')}
          </p>
        ) : referencesStatus === 'failed' ? (
          <p role="alert" className="m-0 px-1 text-supporting text-alert">
            {t('state.storageRead')}
          </p>
        ) : references.length === 0 ? (
          <p className="m-0 px-1 text-supporting text-muted">
            {t('history.versions.referencesEmpty')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {references.map((reference) => {
              const refName = reference.name?.trim();
              return (
                <li key={`${reference.number}-${reference.version}`}>
                  <Ui
                    component="fp.surface"
                    variant="outlined"
                    padding="compact"
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="inline-flex max-w-full items-center rounded-pill bg-primary-container px-2.5 py-0.5 text-metadata font-semibold text-primary whitespace-nowrap">
                        {t('history.versions.referenceNumber', { number: reference.number })}
                      </span>
                      <span className="text-metadata text-muted tabular-nums break-words">
                        {t('history.revision', { version: reference.version })}
                      </span>
                    </div>
                    {refName !== undefined && refName !== '' && (
                      <div className="min-w-0 text-body font-medium text-on-surface break-words">
                        {refName}
                      </div>
                    )}
                    <div className="min-w-0 text-supporting text-muted tabular-nums break-words">
                      {t('history.versions.promotedAt', {
                        time: formatDayTime(reference.createdAt, locale),
                      })}
                    </div>
                  </Ui>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby={revisionsHeadingId} className="flex flex-col gap-3">
        <h2
          id={revisionsHeadingId}
          className="m-0 text-supporting font-bold tracking-wider text-muted uppercase"
        >
          {t('history.versions.savedTitle')}
        </h2>
        {feedbackMessage !== undefined && activeFeedback !== undefined && (
          <p
            role={activeFeedback.kind === 'error' ? 'alert' : 'status'}
            className={`m-0 px-1 text-supporting break-words ${
              activeFeedback.kind === 'error' ? 'text-alert' : 'text-on-surface'
            }`}
          >
            {feedbackMessage}
          </p>
        )}
        {olderStatus === 'loading' && (
          <p role="status" className="m-0 px-1 text-supporting text-muted">
            {t('history.versions.savedLoading')}
          </p>
        )}
        {olderStatus === 'failed' && olderErrorMessage !== undefined && (
          <p role="alert" className="m-0 px-1 text-supporting text-alert">
            {olderErrorMessage}
          </p>
        )}
        {savedRevisions.length === 0 ? (
          <p className="m-0 px-1 text-supporting text-muted">{t('history.versions.savedEmpty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {savedRevisions.map((revision) => {
              const isCurrent = revision.version === headVersion;
              const linkedReference =
                referencesStatus === 'ready' ? referenceByVersion.get(revision.version) : undefined;
              const linkedName = linkedReference?.name?.trim();
              const note = revision.note?.trim();

              return (
                <li key={revision.version}>
                  <Ui
                    component="fp.surface"
                    variant="outlined"
                    padding="compact"
                    className="flex flex-col gap-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      {isCurrent ? (
                        <span className="inline-flex items-center rounded-pill bg-primary-container px-2.5 py-0.5 text-metadata font-semibold text-primary whitespace-nowrap">
                          {t('history.versions.current')}
                        </span>
                      ) : (
                        <span className="text-supporting font-medium text-on-surface break-words">
                          {t('history.versions.savedItem')}
                        </span>
                      )}
                      <span className="text-metadata text-muted tabular-nums break-words">
                        {t('history.revision', { version: revision.version })}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-supporting text-muted tabular-nums break-words">
                      <span className="min-w-0 break-words">
                        {t('history.versions.savedAt', {
                          time: formatDayTime(revision.createdAt, locale),
                        })}
                      </span>
                      <span className="min-w-0 break-words">
                        {formatAnchorSummary(revision.formula.anchor)}
                      </span>
                    </div>
                    {linkedReference !== undefined && (
                      <div className="min-w-0 text-supporting font-medium text-on-surface break-words">
                        {linkedName !== undefined && linkedName !== ''
                          ? t('history.versions.linkedNamed', {
                              number: linkedReference.number,
                              name: linkedName,
                            })
                          : t('history.versions.linked', { number: linkedReference.number })}
                      </div>
                    )}
                    {note !== undefined && note !== '' && (
                      <p className="m-0 min-w-0 text-supporting text-on-surface break-words">
                        {note}
                      </p>
                    )}
                    {(!linkedReference || !isCurrent) && (
                      <div className="flex min-w-0 flex-wrap gap-2 pt-0.5">
                        {!linkedReference && (
                          <Ui
                            component="fp.button"
                            variant="secondary"
                            className="text-supporting"
                            aria-label={t('history.versions.promoteLabel', {
                              version: revision.version,
                            })}
                            disabled={actionsDisabled}
                            onClick={() => void openActionAlert('promote', revision)}
                          >
                            {t('history.versions.promote')}
                          </Ui>
                        )}
                        {!isCurrent && (
                          <Ui
                            component="fp.button"
                            variant="secondary"
                            className="text-supporting"
                            aria-label={t('history.versions.restoreLabel', {
                              version: revision.version,
                            })}
                            disabled={actionsDisabled}
                            onClick={() => void openActionAlert('restore', revision)}
                          >
                            {t('history.versions.restore')}
                          </Ui>
                        )}
                      </div>
                    )}
                  </Ui>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
