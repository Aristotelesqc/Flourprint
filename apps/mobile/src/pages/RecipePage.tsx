import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonAlert,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  applyModelDurations,
  flourRefsOf,
  RECIPE_TEMPLATES,
  saveDraft,
  type Draft,
} from '@flourprint/core/application';
import {
  applyDraftFormulaEdit,
  checkRecipe,
  defaultVariant,
  resolveFormula,
  type BakeCommandPayload,
  type BakeSummary,
  type Recipe,
  type RecipeFamily,
  type DomainError,
  type Formula,
  type FormulaEdit,
  type Process,
  type ProjectionMode,
  type Revision,
} from '@flourprint/core/domain';
import { FormulaSection } from '../blocks/FormulaSection';
import { HistorySection } from '../blocks/HistorySection';
import { ProcessSection } from '../blocks/ProcessSection';
import { useMessages } from '../i18n/use-messages';
import { sendBakeCommand } from '../services/bakes';
import { useFlourCatalog } from '../services/flours';
import { RecipeChecks } from '../blocks/RecipeChecks';
import { StyleGuide } from '../blocks/StyleGuide';
import { currentWorld } from '../services/preferences';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';
import { SimulationBanner } from '../ui/SimulationBanner';
import { useGuardedWrite } from '../services/writes';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';
import { InfoButton } from '../ui/InfoButton';
import { Segmented } from '../ui/Segmented';

type Tab = 'formula' | 'process' | 'history';

interface Working {
  readonly formula: Formula;
  readonly process: Process;
}

/**
 * A recipe, or a new recipe being built: formula, process and history tabs over one draft (#8).
 * Edits are free and the draft is stored after each one (drafts.md); the recipe is checked on
 * demand and before it is saved. Only a save writes a new immutable revision (#7, #23).
 */
export const RecipePage = () => {
  const params = useParams<{ recipeId?: string; draftId?: string }>();
  const draftId = params.draftId;
  const recipeId = params.recipeId ?? '';
  const services = useServices();
  const flourCatalog = useFlourCatalog();
  const router = useIonRouter();
  const [presentAlert] = useIonAlert();
  const { t, error } = useMessages();
  const [tab, setTab] = useState<Tab>('formula');
  const [base, setBase] = useState<{ name: string; revision: Revision }>();
  // The stored draft: absent on a recipe until its first edit.
  const [stored, setStored] = useState<Draft>();
  const [checking, setChecking] = useState(false);
  const saving = useRef(Promise.resolve());
  const [bakes, setBakes] = useState<readonly BakeSummary[]>([]);
  const [failure, setFailure] = useState<DomainError>();
  const [storageFailed, setStorageFailed] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [loading, setLoading] = useState<'loading' | 'missing' | 'failed' | 'ready'>('loading');
  const [family, setFamily] = useState<{ family: RecipeFamily; members: readonly Recipe[] }>();
  const writes = useGuardedWrite();
  // A bake start whose outcome is unknown keeps its ids and its exact content: a retry resends
  // the same command, so it can neither start a second bake nor reuse an id with other content.
  const pendingStart = useRef<{
    bakeId: string;
    commandId: string;
    payload: Extract<BakeCommandPayload, { type: 'StartBake' }>;
  }>(undefined);
  const [readFailed, setReadFailed] = useState(false);
  const { simulation } = usePreferences();
  const confirming = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        if (draftId !== undefined) {
          // A new recipe being built (blank or from a template).
          const found = await services.recipes.getDraft(draftId);
          if (!found) {
            setLoading('missing');
            return;
          }
          if (found.origin.kind === 'revision') {
            router.push(`/recipes/${found.origin.recipeId}`, 'none', 'replace');
            return;
          }
          setStored(found);
          setLoading('ready');
          return;
        }
        const recipe = await services.recipes.getRecipe(recipeId);
        const revision = recipe
          ? await services.recipes.getRevision(recipeId, recipe.headVersion)
          : undefined;
        if (!recipe || !revision?.ok || !revision.value) {
          setLoading(revision && !revision.ok ? 'failed' : 'missing');
          return;
        }
        setBase({ name: recipe.name, revision: revision.value });
        // At most one draft per recipe: opening the recipe resumes it (drafts.md).
        const resumed = (await services.recipes.listDrafts()).find(
          (d) => d.origin.kind === 'revision' && d.origin.recipeId === recipeId,
        );
        setStored(resumed);
        setLoading('ready');
        await loadFamily(recipe);
      } catch (error) {
        console.error(error);
        setLoading('failed');
      }
    })();
  }, [recipeId, draftId, services]);

  /** The variants of the recipe's family, if it belongs to one (persistence.md). */
  const loadFamily = async (recipe: Recipe) => {
    if (recipe.familyId === undefined) {
      setFamily(undefined);
      return;
    }
    const found = (await services.recipes.listFamilies()).find((f) => f.id === recipe.familyId);
    const members = (await services.recipes.listRecipes())
      .filter((r) => r.familyId === recipe.familyId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    setFamily(found && { family: found, members });
  };

  const pin = async (recipeIdToPin: string | undefined) => {
    if (!family) return;
    const result = await writes.run(() =>
      services.recipes.pinVariant(family.family.id, recipeIdToPin),
    );
    if (!result.ok) {
      setStorageFailed(result.reason === 'storage');
      return;
    }
    setStorageFailed(false);
    if (!result.value.ok) {
      setFailure(result.value.error);
      return;
    }
    // The pin is saved; a failed refresh only leaves the display stale, and says so.
    try {
      const recipe = await services.recipes.getRecipe(recipeId);
      if (recipe) await loadFamily(recipe);
      setReadFailed(false);
    } catch (error) {
      console.error(error);
      setReadFailed(true);
    }
  };

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
  // The History tab and the header button follow the simulation mode (ADR 0014).
  useEffect(() => void refreshBakes(), [refreshBakes, simulation]);

  const draft: Working | undefined = stored ?? base?.revision;
  const resolved = useMemo(() => (draft ? resolveFormula(draft.formula) : undefined), [draft]);
  const issues = useMemo(() => (draft ? checkRecipe(draft.formula, draft.process) : []), [draft]);
  const newRecipe = draftId !== undefined;
  if ((!base && !newRecipe) || !draft || !resolved) {
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
  const dirty = stored !== undefined;
  const name = stored?.name ?? base?.name ?? '';
  const active = bakes.find((b) => b.status === 'active');
  const blocking = issues.filter((i) => i.severity === 'blocking').length;

  // A double tap can reach a second button after the first navigation: never stack the same page.
  const openBake = (bakeId: string) => {
    const path = `/bakes/${bakeId}`;
    if (window.location.pathname !== path) router.push(path);
  };

  /** Stores the draft after every edit, one write at a time; a failure is shown, never lost. */
  const persist = (next: Draft) => {
    saving.current = saving.current
      .then(() => services.recipes.saveDraft(next))
      .then(() => setStorageFailed(false))
      .catch((cause: unknown) => {
        console.error(cause);
        setStorageFailed(true);
      });
  };

  const update = (edited: Working, rename?: string) => {
    // The model-driven step follows the model after every edit (fermentation.md); when the
    // estimate is not ok it keeps its last time and the fermentation card says why.
    const next = {
      ...edited,
      process: applyModelDurations(edited.formula, edited.process).process,
    };
    const now = services.realClock.now();
    const doc: Draft = stored
      ? { ...stored, ...next, ...(rename === undefined ? {} : { name: rename }), updatedAt: now }
      : {
          id: services.ids.next(),
          name: rename ?? name,
          // Only a recipe has no stored draft yet: its first edit starts one.
          origin: {
            kind: 'revision',
            recipeId,
            baseVersion: base?.revision.version ?? 0,
          },
          ...next,
          createdAt: now,
          updatedAt: now,
        };
    setStored(doc);
    persist(doc);
    setFailure(undefined);
    setNotice(undefined);
  };

  const editFormula = (command: FormulaEdit): boolean => {
    const next = applyDraftFormulaEdit(draft.formula, command);
    if (next.ok) update({ ...draft, formula: next.value });
    else setFailure(next.error);
    return next.ok;
  };

  /** A formula edit and the process change it needs (a preparation's step). */
  const editStructure = (command: FormulaEdit, nextProcess?: Process): boolean => {
    const next = applyDraftFormulaEdit(draft.formula, command);
    if (!next.ok) {
      setFailure(next.error);
      return false;
    }
    update({ formula: next.value, process: nextProcess ?? draft.process });
    return true;
  };

  const changeDuration = (stepId: string, durationS: number | undefined): boolean => {
    update({
      ...draft,
      process: {
        ...draft.process,
        steps: draft.process.steps.map((s) => {
          if (s.id !== stepId) return s;
          // A typed duration is no longer an applied suggestion, nor model-driven (fermentation.md).
          const { plannedDurationS: _, accepted: __, durationMode: ___, ...rest } = s;
          return durationS === undefined ? rest : { ...rest, plannedDurationS: durationS };
        }),
      },
    });
    return true;
  };

  const changeProcess = (process: Process): boolean => {
    update({ ...draft, process });
    return true;
  };

  const rename = () =>
    void presentAlert({
      header: t('draft.rename'),
      inputs: [{ name: 'name', type: 'text', value: name }],
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('bake.save'),
          handler: (values: { name: string }) => {
            const next = values.name.trim();
            if (next === '') return false;
            update(draft, next);
            return true;
          },
        },
      ],
    });

  /** Saves the draft as a recipe or a version; refused, with the list, while something blocks. */
  const save = async () => {
    if (!stored) return;
    await saving.current;
    const result = await writes.run(() =>
      saveDraft(services.recipes, stored, {
        newRecipeId: services.ids.next(),
        createdAt: services.realClock.now(),
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
      if (saved.error.code === 'RecipeHasBlockingIssues') setChecking(true);
      else setFailure(saved.error);
      return;
    }
    setStored(undefined);
    setNotice(t('draft.saved', { version: saved.value.version }));
    if (newRecipe) {
      router.push(`/recipes/${saved.value.recipeId}`, 'none', 'replace');
      return;
    }
    setBase({ name: stored.name, revision: saved.value });
  };

  const discard = () =>
    void presentAlert({
      header: t(newRecipe ? 'draft.delete' : 'draft.discard'),
      message: t(newRecipe ? 'draft.deleteConfirm' : 'draft.discardConfirm'),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t(newRecipe ? 'draft.delete' : 'draft.discard'),
          role: 'destructive',
          handler: () => {
            const id = stored?.id;
            setStored(undefined);
            setFailure(undefined);
            if (id !== undefined) {
              saving.current = saving.current
                .then(() => services.recipes.deleteDraft(id))
                .catch((cause: unknown) => {
                  console.error(cause);
                  setStorageFailed(true);
                });
            }
            if (newRecipe) router.push('/recipes', 'back', 'replace');
          },
        },
      ],
    });

  /** A bake starts now: its timers run from the tap, whatever time the planner showed. */
  const startBake = async () => {
    if (!base) return;
    const mode: ProjectionMode = { kind: 'startAt', at: services.clock.now() };
    const { revision } = base;
    const ref = { id: revision.recipeId, version: revision.version };
    if (pendingStart.current) setNotice(t('recipe.retryStart'));
    const pending = (pendingStart.current ??= {
      bakeId: services.ids.next(),
      commandId: services.ids.next(),
      payload: {
        type: 'StartBake',
        revisions: { formula: ref, process: ref },
        formula: revision.formula,
        process: revision.process,
        mode,
        // The simulation mode in force decides, on every platform (ADR 0014).
        origin: currentWorld(services.preferences.get()),
        // The current registry version of each flour that has an entry (flours.md).
        flours: flourRefsOf(
          revision.formula.flours.map((f) => f.id),
          flourCatalog.personal,
        ),
      },
    });
    const result = await writes.run(() =>
      sendBakeCommand(
        services,
        { bakeId: pending.bakeId, version: 0 },
        pending.payload,
        pending.commandId,
      ),
    );
    if (!result.ok) {
      setStorageFailed(result.reason === 'storage');
      return;
    }
    setStorageFailed(false);
    pendingStart.current = undefined;
    if (!result.value.ok) {
      setFailure(result.value.error);
      return;
    }
    await refreshBakes();
    openBake(pending.bakeId);
  };

  /** Starts a bake now, once confirmed; a bake starts from the saved revision only. */
  const confirmStart = () => {
    // A double tap opens one confirmation, not two stacked ones.
    if (confirming.current) return;
    confirming.current = true;
    void presentAlert({
      onDidDismiss: () => {
        confirming.current = false;
      },
      ...(dirty
        ? { header: t('recipe.bake'), message: t('process.saveFirst'), buttons: [t('help.close')] }
        : {
            header: t('recipe.startConfirm'),
            ...(simulation ? { message: t('recipe.startConfirmSimulation') } : {}),
            buttons: [
              { text: t('bake.cancel'), role: 'cancel' },
              { text: t('recipe.startNow'), handler: () => void startBake() },
            ],
          }),
    });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <button
            type="button"
            className="fp-reset min-w-0 px-1 text-left"
            aria-label={t('draft.rename')}
            onClick={rename}
          >
            <div className="truncate text-[21px] font-bold">{name}</div>
            <div className="text-[13px] text-muted">
              {base
                ? t(dirty ? 'recipe.versionModified' : 'recipe.version', {
                    version: base.revision.version,
                  })
                : t('draft.newRecipe')}
            </div>
          </button>
          {base && (
            <IonButtons slot="end">
              <IonButton
                fill="solid"
                shape="round"
                color="primary"
                className="pr-2"
                disabled={!active && writes.busy}
                onClick={() => (active ? openBake(active.bakeId) : confirmStart())}
              >
                {active ? t('recipe.baking') : t('recipe.bake')}
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
        <SimulationBanner />
        {family && (
          <IonToolbar>
            <Variants
              family={family.family}
              members={family.members}
              current={recipeId}
              busy={writes.busy}
              onOpen={(id) => {
                if (id !== recipeId) router.push(`/recipes/${id}`, 'none', 'replace');
              }}
              onPin={(id) => void pin(id)}
            />
          </IonToolbar>
        )}
        <IonToolbar>
          <div className="px-4 pb-2">
            <Segmented
              value={tab}
              options={(base
                ? (['formula', 'process', 'history'] as const)
                : (['formula', 'process'] as const)
              ).map((value) => ({
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
        {readFailed && (
          <p role="alert" className="mt-0 mb-3 text-alert">
            {t('state.storageRead')}
          </p>
        )}
        <SessionOnlyNotice />

        {/* Tabs stay mounted: a draft being typed and the weighing checklist survive a switch. */}
        <div hidden={tab !== 'formula'}>
          {(() => {
            const origin = stored?.origin;
            const template =
              origin?.kind === 'template'
                ? RECIPE_TEMPLATES.find((tpl) => tpl.id === origin.template.id)
                : undefined;
            return template ? (
              <div className="mb-5">
                <StyleGuide template={template} />
              </div>
            ) : null;
          })()}
          <FormulaSection
            formula={draft.formula}
            {...(resolved.ok ? { resolved: resolved.value } : {})}
            onEdit={editFormula}
            base={base?.revision.formula ?? draft.formula}
            process={draft.process}
            now={services.realClock.now()}
            onStructure={editStructure}
            onProcess={changeProcess}
          />
        </div>
        <div hidden={tab !== 'process'}>
          <ProcessSection
            process={draft.process}
            onDurationChange={changeDuration}
            onProcessChange={changeProcess}
            preparationIds={draft.formula.components.map((c) => c.id)}
            canStart={base !== undefined && !dirty && !writes.busy}
            onStart={confirmStart}
            {...(active ? { activeBakeId: active.bakeId } : {})}
            onOpenBake={openBake}
          />
        </div>
        {base && (
          <div hidden={tab !== 'history'}>
            <HistorySection bakes={bakes} />
          </div>
        )}
        <RecipeChecks
          open={checking}
          issues={issues}
          process={draft.process}
          onClose={() => setChecking(false)}
        />
      </IonContent>
      {dirty && (
        <IonFooter>
          <IonToolbar>
            {/* Two rows so nothing is clipped at phone width: what the draft is, then its actions. */}
            <div className="flex flex-col gap-1.5 px-4 py-2">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                  <span className="truncate">
                    {t(newRecipe ? 'draft.newRecipe' : 'draft.unsaved')}
                  </span>
                  <InfoButton
                    topic="draft"
                    term={t(newRecipe ? 'draft.newRecipe' : 'draft.unsaved')}
                  />
                </span>
                <IonButton
                  size="small"
                  fill="clear"
                  className="m-0 shrink-0"
                  color={blocking > 0 ? 'danger' : 'medium'}
                  onClick={() => setChecking(true)}
                >
                  {issues.length === 0
                    ? t('check.button')
                    : t('check.buttonCount', { count: issues.length })}
                </IonButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <IonButton fill="outline" className="m-0 h-auto min-h-11" onClick={discard}>
                  <span className="pointer-events-none py-1 leading-tight whitespace-normal">
                    {t(newRecipe ? 'draft.delete' : 'draft.discard')}
                  </span>
                </IonButton>
                <IonButton
                  className="m-0 h-auto min-h-11"
                  disabled={writes.busy}
                  onClick={() => void save()}
                >
                  <span className="pointer-events-none py-1 leading-tight whitespace-normal">
                    {newRecipe
                      ? t('draft.saveRecipe')
                      : t('draft.save', { version: (base?.revision.version ?? 0) + 1 })}
                  </span>
                </IonButton>
              </div>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

/**
 * Variants of a family: tap to open one; the star shows the variant opened by default, pinned
 * by the user or else the most recent.
 */
const Variants = ({
  family,
  members,
  current,
  busy,
  onOpen,
  onPin,
}: {
  family: RecipeFamily;
  members: readonly Recipe[];
  current: string;
  busy: boolean;
  onOpen: (recipeId: string) => void;
  onPin: (recipeId: string | undefined) => void;
}) => {
  const { t } = useMessages();
  const shown = defaultVariant(family, members)?.id;
  const pinned = family.pinnedRecipeId === current;
  return (
    <div className="flex flex-col gap-1.5 px-4 pb-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">
          {t('family.title', { family: family.name })}
        </span>
        <button
          type="button"
          className="fp-reset flex min-h-11 items-center gap-1.5 text-sm text-accent-text"
          disabled={busy}
          aria-pressed={pinned}
          onClick={() => onPin(pinned ? undefined : current)}
        >
          <Star filled={shown === current} />
          {pinned
            ? t('family.unpin')
            : shown === current
              ? t('family.mostRecent')
              : t('family.pin')}
        </button>
      </div>
      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1">
        {members.map((member) => (
          <li key={member.id} className="shrink-0">
            <button
              type="button"
              aria-current={member.id === current ? 'page' : undefined}
              className={`fp-reset flex min-h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-sm ${
                member.id === current
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-line bg-surface text-ink'
              }`}
              onClick={() => onOpen(member.id)}
            >
              {member.id === shown && <Star filled small />}
              {member.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Star = ({ filled, small = false }: { filled: boolean; small?: boolean }) => (
  <svg
    width={small ? 14 : 18}
    height={small ? 14 : 18}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
  </svg>
);
