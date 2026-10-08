import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { saveRevision } from '@flourprint/core/application';
import {
  applyFormulaEdit,
  resolveFormula,
  validateRecipe,
  type BakeSummary,
  type DomainError,
  type FormulaEdit,
  type ProjectionMode,
  type Revision,
} from '@flourprint/core/domain';
import { FormulaSection } from '../blocks/FormulaSection';
import { HistorySection } from '../blocks/HistorySection';
import { ProcessSection } from '../blocks/ProcessSection';
import { useMessages } from '../i18n/use-messages';
import { sendBakeCommand } from '../services/bakes';
import { useDrafts, type RecipeDraft } from '../services/drafts';
import { useServices } from '../services/services';
import { useGuardedWrite } from '../services/writes';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';
import { Segmented } from '../ui/Segmented';

type Tab = 'formula' | 'process' | 'history';

/**
 * A recipe: formula, process and history tabs over one draft (#8). The draft follows the policy
 * of `services/drafts`; only an explicit save writes a new immutable revision (#7, #23).
 */
export const RecipePage = () => {
  const recipeId = useParams<{ recipeId: string }>().recipeId ?? '';
  const services = useServices();
  const drafts = useDrafts();
  const router = useIonRouter();
  const { t, error } = useMessages();
  const [tab, setTab] = useState<Tab>('formula');
  const [base, setBase] = useState<{ name: string; revision: Revision }>();
  const [draft, setDraft] = useState<RecipeDraft>();
  const [bakes, setBakes] = useState<readonly BakeSummary[]>([]);
  const [failure, setFailure] = useState<DomainError>();
  const [storageFailed, setStorageFailed] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [loading, setLoading] = useState<'loading' | 'missing' | 'failed' | 'ready'>('loading');
  const writes = useGuardedWrite();
  // A bake start whose outcome is unknown keeps its ids, so a retry cannot start a second bake.
  const pendingStart = useRef<{ bakeId: string; commandId: string }>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const recipe = await services.recipes.getRecipe(recipeId);
        const revision = recipe
          ? await services.recipes.getRevision(recipeId, recipe.headVersion)
          : undefined;
        if (!recipe || !revision?.ok || !revision.value) {
          setLoading(revision && !revision.ok ? 'failed' : 'missing');
          return;
        }
        const { formula, process } = revision.value;
        setBase({ name: recipe.name, revision: revision.value });
        setDraft(drafts.get(recipeId, revision.value.version) ?? { formula, process });
        setLoading('ready');
      } catch (error) {
        console.error(error);
        setLoading('failed');
      }
    })();
  }, [recipeId, services]);

  const refreshBakes = useCallback(async () => {
    try {
      const all = await services.bakes.listBakes();
      setBakes(
        all
          .filter((b) => b.recipeId === recipeId)
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      );
    } catch (error) {
      console.error(error);
      setStorageFailed(true);
    }
  }, [services, recipeId]);
  useIonViewWillEnter(() => void refreshBakes(), [refreshBakes]);

  const resolved = useMemo(() => (draft ? resolveFormula(draft.formula) : undefined), [draft]);
  if (!base || !draft || !resolved) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/recipes" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {loading !== 'loading' && (
            <p role="alert">
              {t(loading === 'missing' ? 'state.recipeMissing' : 'state.storageRead')}
            </p>
          )}
        </IonContent>
      </IonPage>
    );
  }
  const dirty = draft.formula !== base.revision.formula || draft.process !== base.revision.process;
  const active = bakes.find((b) => b.status === 'active');

  const update = (next: RecipeDraft) => {
    setDraft(next);
    drafts.set(recipeId, base.revision.version, next);
    setFailure(undefined);
    setNotice(undefined);
  };

  const editFormula = (command: FormulaEdit): boolean => {
    const next = applyFormulaEdit(draft.formula, command);
    if (next.ok) update({ ...draft, formula: next.value });
    else setFailure(next.error);
    return next.ok;
  };

  const changeDuration = (stepId: string, durationS: number | undefined): boolean => {
    const process = {
      steps: draft.process.steps.map((s) => {
        if (s.id !== stepId) return s;
        const { plannedDurationS: _, ...rest } = s;
        return durationS === undefined ? rest : { ...rest, plannedDurationS: durationS };
      }),
    };
    const valid = validateRecipe(draft.formula, process);
    if (valid.ok) update({ ...draft, process });
    else setFailure(valid.error);
    return valid.ok;
  };

  const save = async () => {
    const result = await writes.run(() =>
      saveRevision(services.recipes, {
        recipeId,
        name: base.name,
        expectedHead: base.revision.version,
        formula: draft.formula,
        process: draft.process,
        createdAt: services.clock.now(),
      }),
    );
    if (!result.ok) {
      // The draft stays; a lost response after commit shows as HeadConflict on retry.
      setStorageFailed(result.reason === 'storage');
      return;
    }
    setStorageFailed(false);
    const saved = result.value;
    if (!saved.ok) {
      setFailure(saved.error);
      return;
    }
    drafts.clear(recipeId);
    setBase({ name: base.name, revision: saved.value });
    setDraft({ formula: saved.value.formula, process: saved.value.process });
    setNotice(t('draft.saved', { version: saved.value.version }));
  };

  const discard = () => {
    drafts.clear(recipeId);
    setDraft({ formula: base.revision.formula, process: base.revision.process });
    setFailure(undefined);
  };

  const startBake = async (mode: ProjectionMode) => {
    const { revision } = base;
    const ref = { id: revision.recipeId, version: revision.version };
    const ids = (pendingStart.current ??= {
      bakeId: services.ids.next(),
      commandId: services.ids.next(),
    });
    const result = await writes.run(() =>
      sendBakeCommand(
        services,
        { bakeId: ids.bakeId, version: 0 },
        {
          type: 'StartBake',
          revisions: { formula: ref, process: ref },
          formula: revision.formula,
          process: revision.process,
          mode,
        },
        ids.commandId,
      ),
    );
    if (!result.ok) {
      setStorageFailed(result.reason === 'storage');
      return;
    }
    setStorageFailed(false);
    pendingStart.current = undefined;
    if (result.value.ok) router.push(`/bakes/${ids.bakeId}`);
    else setFailure(result.value.error);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <div className="min-w-0 px-1">
            <div className="truncate text-[21px] font-bold">{base.name}</div>
            <div className="text-[13px] text-muted">
              {t(dirty ? 'recipe.versionModified' : 'recipe.version', {
                version: base.revision.version,
              })}
            </div>
          </div>
          <IonButtons slot="end">
            <IonButton
              fill="solid"
              shape="round"
              color="primary"
              className="pr-2"
              onClick={() => (active ? router.push(`/bakes/${active.bakeId}`) : setTab('process'))}
            >
              {active ? t('recipe.baking') : t('recipe.bake')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <div className="px-4 pb-2">
            <Segmented
              value={tab}
              options={(['formula', 'process', 'history'] as const).map((value) => ({
                value,
                label: t(`recipe.tab.${value}`),
              }))}
              onChange={setTab}
            />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {failure && (
          <p role="alert" className="mt-0 mb-3 text-alert">
            {error(failure)}
          </p>
        )}
        {storageFailed && (
          <p role="alert" className="mt-0 mb-3 text-alert">
            {t('state.storageWrite')}
          </p>
        )}
        {notice && <p className="mt-0 mb-3">{notice}</p>}
        <SessionOnlyNotice />

        {/* Tabs stay mounted: a draft being typed and the weighing checklist survive a switch. */}
        <div hidden={tab !== 'formula'}>
          {resolved.ok ? (
            <FormulaSection
              formula={draft.formula}
              resolved={resolved.value}
              onEdit={editFormula}
            />
          ) : (
            <p role="alert">{error(resolved.error)}</p>
          )}
        </div>
        <div hidden={tab !== 'process'}>
          <ProcessSection
            process={draft.process}
            onDurationChange={changeDuration}
            canStart={!dirty && !writes.busy}
            onStart={(mode) => void startBake(mode)}
          />
        </div>
        <div hidden={tab !== 'history'}>
          <HistorySection bakes={bakes} />
        </div>
      </IonContent>
      {dirty && (
        <IonFooter>
          <IonToolbar>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="flex-1 text-sm text-muted">{t('draft.unsaved')}</span>
              <IonButton fill="outline" onClick={discard}>
                {t('draft.discard')}
              </IonButton>
              <IonButton disabled={writes.busy} onClick={() => void save()}>
                {t('draft.save', { version: base.revision.version + 1 })}
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};
