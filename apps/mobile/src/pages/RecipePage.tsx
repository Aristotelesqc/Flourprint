import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
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
  processEquipmentEntries,
  RECIPE_TEMPLATES,
  saveDraft,
  type Draft,
} from '@flourprint/core/application';
import {
  applyDraftFormulaEdit,
  checkRecipe,
  defaultVariant,
  doughSteps,
  resolveFormula,
  type BakeCommandPayload,
  type BakeSummary,
  type Recipe,
  type RecipeFamily,
  type DomainError,
  type Formula,
  type FormulaEdit,
  type Instant,
  type Process,
  type ProjectionMode,
  type Result,
  type Revision,
} from '@flourprint/core/domain';
import { FormulaConsultation } from '../blocks/FormulaConsultation';
import { buildFinalMixItems } from '../blocks/WeighingChecklist';
import { FormulaSection } from '../blocks/FormulaSection';
import { HistorySection } from '../blocks/HistorySection';
import { ProcessSection } from '../blocks/ProcessSection';
import { RecipeMethod } from '../blocks/RecipeMethod';
import { ChangeReviewSheet } from '../blocks/ChangeReviewSheet';
import { DraftActionBar } from '../blocks/DraftActionBar';
import { usePanelScroll } from '../ui/PanelContext';
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
import { Segmented } from '../ui/Segmented';
import { ValidationProvider, useValidation, useValidationActions } from '../ui/ValidationContext';

type Tab = 'formula' | 'process' | 'history';

interface Working {
  readonly formula: Formula;
  readonly process: Process;
}

/**
 * A recipe, or a new recipe being built: formula, process and history tabs over one draft (#8).
 * Saved recipes open read-first in consultation mode with explicit Edit and Plan actions (#67).
 * Edits are free in editing mode and the draft is stored after each one (drafts.md).
 */
export const RecipePage = () => {
  return (
    <ValidationProvider>
      <RecipePageContent />
    </ValidationProvider>
  );
};

const RecipePageContent = () => {
  const params = useParams<{ recipeId?: string; draftId?: string }>();
  const draftId = params.draftId;
  const recipeId = params.recipeId ?? '';
  const services = useServices();
  const flourCatalog = useFlourCatalog();
  const router = useIonRouter();
  const [presentAlert] = useIonAlert();
  const { t, error, name: ingredientName, componentName } = useMessages();
  const [tab, setTab] = useState<Tab>('formula');
  const [base, setBase] = useState<{ name: string; revision: Revision }>();
  const [stored, setStored] = useState<Draft>();
  const latestDraft = useRef<Draft | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const saving = useRef(Promise.resolve());
  const [bakes, setBakes] = useState<readonly BakeSummary[]>([]);
  const [failure, setFailure] = useState<DomainError>();
  const [storageFailed, setStorageFailed] = useState(false);
  const [notice, setNotice] = useState<string>();
  // Set while the recipe is in the trash: it is then read-only until restored.
  const [trashedAt, setTrashedAt] = useState<Instant>();
  const [loading, setLoading] = useState<'loading' | 'missing' | 'failed' | 'ready'>('loading');
  const [family, setFamily] = useState<{ family: RecipeFamily; members: readonly Recipe[] }>();
  const writes = useGuardedWrite();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const pendingStart = useRef<{
    bakeId: string;
    commandId: string;
    payload: Extract<BakeCommandPayload, { type: 'StartBake' }>;
  }>(undefined);
  const [readFailed, setReadFailed] = useState(false);
  const { simulation } = usePreferences();
  const confirming = useRef(false);
  const { hasInvalid } = useValidation();
  const validationActions = useValidationActions();
  const [editorGeneration, setEditorGeneration] = useState(0);

  // Explicit consultation vs editing state initialized once after hydration (#67)
  const [isEditing, setIsEditing] = useState(false);
  const [hasEnteredEdit, setHasEnteredEdit] = useState(false);
  const [targetedStepId, setTargetedStepId] = useState<string>();
  const [returnToPlanning, setReturnToPlanning] = useState(false);

  // Shared temporary weighing checklist lifted to page level (#67)
  const [weighed, setWeighed] = useState<ReadonlyMap<string, number>>(new Map());
  const toggleWeighed = useCallback((key: string, grams: number) => {
    setWeighed((prev) => {
      const next = new Map(prev);
      if (next.get(key) === grams) {
        next.delete(key);
      } else {
        next.set(key, grams);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        if (draftId !== undefined) {
          const found = await services.recipes.getDraft(draftId);
          if (!found) {
            setLoading('missing');
            return;
          }
          // The edits of a deleted recipe stand alone and can be saved as a new recipe.
          if (
            found.origin.kind === 'revision' &&
            (await services.recipes.getRecipe(found.origin.recipeId))
          ) {
            router.push(`/recipes/${found.origin.recipeId}`, 'none', 'replace');
            return;
          }
          setStored(found);
          latestDraft.current = found;
          setIsEditing(true);
          setHasEnteredEdit(true);
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
        setTrashedAt(recipe.trashedAt);
        const resumed = (await services.recipes.listDrafts()).find(
          (d) => d.origin.kind === 'revision' && d.origin.recipeId === recipeId,
        );
        setStored(resumed);
        latestDraft.current = resumed;
        const shouldEdit = resumed !== undefined && recipe.trashedAt === undefined;
        setIsEditing(shouldEdit);
        setHasEnteredEdit(shouldEdit);
        setLoading('ready');
        await loadFamily(recipe);
      } catch (error) {
        console.error(error);
        setLoading('failed');
      }
    })();
  }, [recipeId, draftId, services]);

  const loadFamily = async (recipe: Recipe) => {
    if (recipe.familyId === undefined || recipe.trashedAt !== undefined) {
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
  useEffect(() => void refreshBakes(), [refreshBakes, simulation]);

  const draft: Working | undefined = stored ?? base?.revision;
  const { switchTab } = usePanelScroll(
    contentRef,
    tab,
    setTab,
    draftId ?? recipeId,
    loading === 'ready',
  );

  const handleClearTargetedStep = useCallback(() => {
    setTargetedStepId(undefined);
  }, []);

  const editStepInRecipe = useCallback(
    (stepId: string) => {
      if (trashedAt !== undefined) return;
      setIsEditing(true);
      setHasEnteredEdit(true);
      setReturnToPlanning(true);
      setTargetedStepId(stepId);
      switchTab('formula');
    },
    [switchTab, trashedAt],
  );

  const handleReturnToPlanning = useCallback(() => {
    setReturnToPlanning(false);
    setTargetedStepId(undefined);
    switchTab('process');
  }, [switchTab]);

  const hydrationRef = useRef<HTMLDivElement>(null);
  const hydrationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (hydrationFrameRef.current !== undefined) {
        cancelAnimationFrame(hydrationFrameRef.current);
      }
    };
  }, []);

  const editHydration = useCallback(() => {
    if (trashedAt !== undefined) return;
    setIsEditing(true);
    setHasEnteredEdit(true);
    switchTab('formula');
    void contentRef.current?.getScrollElement().then((el) => {
      el.scrollTop = 0;
    });
    if (hydrationFrameRef.current !== undefined) {
      cancelAnimationFrame(hydrationFrameRef.current);
    }
    hydrationFrameRef.current = requestAnimationFrame(() => {
      hydrationFrameRef.current = requestAnimationFrame(() => {
        const el = hydrationRef.current;
        if (el && document.contains(el) && !el.closest('[hidden], .ion-page-hidden')) {
          el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          el.focus({ preventScroll: true });
        } else if (!el) {
          titleRef.current?.focus({ preventScroll: true });
        }
      });
    });
  }, [switchTab, trashedAt]);

  const fermentationRef = useRef<HTMLDivElement>(null);

  const handleEditFermentation = useCallback(() => {
    setIsEditing(true);
    setHasEnteredEdit(true);
    switchTab('formula');
    requestAnimationFrame(() => {
      if (fermentationRef.current) {
        fermentationRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        fermentationRef.current.focus({ preventScroll: true });
      }
    });
  }, [switchTab]);

  const fermentationStepIds = useMemo(() => {
    if (!draft) return new Set<string>();
    const ids = new Set<string>();
    for (const s of doughSteps(draft.process) ?? []) ids.add(s.id);
    for (const c of draft.formula.components) {
      if (c.kind === 'preferment' && c.flourPct > 0) ids.add(c.id);
    }
    return ids;
  }, [draft]);

  const resolved = useMemo(() => (draft ? resolveFormula(draft.formula) : undefined), [draft]);
  const issues = useMemo(() => (draft ? checkRecipe(draft.formula, draft.process) : []), [draft]);
  useEffect(() => {
    if (!draft || !resolved?.ok) return;
    const quantities = new Map(
      buildFinalMixItems(draft.formula, resolved.value, ingredientName, componentName).map(
        (item) => [item.key, item.grams],
      ),
    );
    setWeighed((previous) => {
      const next = new Map(previous);
      for (const [key, grams] of previous) {
        if (quantities.get(key) !== grams) next.delete(key);
      }
      return next.size === previous.size ? previous : next;
    });
  }, [draft, resolved, ingredientName, componentName]);
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

  const openBake = (bakeId: string) => {
    const path = `/bakes/${bakeId}`;
    if (window.location.pathname !== path) router.push(path);
  };

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
    const next = {
      ...edited,
      process: applyModelDurations(edited.formula, edited.process).process,
    };
    const now = services.realClock.now();
    const current = latestDraft.current;
    const doc: Draft = current
      ? { ...current, ...next, ...(rename === undefined ? {} : { name: rename }), updatedAt: now }
      : {
          id: services.ids.next(),
          name: rename ?? name,
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
    latestDraft.current = doc;
    persist(doc);
    setFailure(undefined);
    setNotice(undefined);
  };

  const editFormula = (command: FormulaEdit): boolean => {
    const current = latestDraft.current ?? draft;
    const next = applyDraftFormulaEdit(current.formula, command);
    if (next.ok) update({ ...current, formula: next.value });
    else setFailure(next.error);
    return next.ok;
  };

  const editStructure = (command: FormulaEdit, nextProcess?: Process): boolean => {
    const current = latestDraft.current ?? draft;
    const next = applyDraftFormulaEdit(current.formula, command);
    if (!next.ok) {
      setFailure(next.error);
      return false;
    }
    update({ formula: next.value, process: nextProcess ?? current.process });
    return true;
  };

  const changeDuration = (stepId: string, durationS: number | undefined): boolean => {
    const current = latestDraft.current ?? draft;
    update({
      ...current,
      process: {
        ...current.process,
        steps: current.process.steps.map((s) => {
          if (s.id !== stepId) return s;
          const { plannedDurationS: _, accepted: __, durationMode: ___, ...rest } = s;
          return durationS === undefined ? rest : { ...rest, plannedDurationS: durationS };
        }),
      },
    });
    return true;
  };

  const changeProcess = (process: Process): boolean => {
    update({ ...(latestDraft.current ?? draft), process });
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
            update(latestDraft.current ?? draft, next);
            return true;
          },
        },
      ],
    });

  // Commit only the focused field through its normal blur path, including keyboard/AT activation.
  const blurActiveEditor = () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement && contentRef.current?.contains(focused)) {
      focused.blur();
    }
  };

  const save = async () => {
    blurActiveEditor();
    if (validationActions?.isBlocked()) return;
    await saving.current;
    if (validationActions?.isBlocked()) return;
    const target = latestDraft.current;
    if (!target) return;
    const result = await writes.run(() =>
      saveDraft(services.recipes, target, {
        newRecipeId: services.ids.next(),
        createdAt: services.realClock.now(),
        // A draft of a version whose recipe was deleted becomes a new recipe.
        asNewRecipe: newRecipe,
      }),
    );
    if (!result.ok) {
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
    latestDraft.current = undefined;
    setNotice(t('draft.saved', { version: saved.value.version }));
    if (newRecipe) {
      router.push(`/recipes/${saved.value.recipeId}`, 'none', 'replace');
      return;
    }
    setBase({ name: target.name, revision: saved.value });
    setIsEditing(false);
    setEditorGeneration((generation) => generation + 1);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  };

  const discard = () => {
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
            latestDraft.current = undefined;
            setEditorGeneration((generation) => generation + 1);
            setFailure(undefined);
            if (id !== undefined) {
              saving.current = saving.current
                .then(() => services.recipes.deleteDraft(id))
                .catch((cause: unknown) => {
                  console.error(cause);
                  setStorageFailed(true);
                });
            }
            if (newRecipe) {
              router.push('/recipes', 'back', 'replace');
            } else {
              setIsEditing(false);
            }
          },
        },
      ],
    });
  };

  const startBake = async () => {
    if (!base) return;
    const mode: ProjectionMode = { kind: 'startAt', at: services.clock.now() };
    const { revision } = base;
    const ref = { id: revision.recipeId, version: revision.version };
    if (pendingStart.current) setNotice(t('recipe.retryStart'));
    // The entry versions the process references, copied into the bake (equipment.md).
    const equipment = await processEquipmentEntries(services.equipment, revision.process);
    const pending = (pendingStart.current ??= {
      bakeId: services.ids.next(),
      commandId: services.ids.next(),
      payload: {
        type: 'StartBake',
        revisions: { formula: ref, process: ref },
        formula: revision.formula,
        process: revision.process,
        mode,
        origin: currentWorld(services.preferences.get()),
        flours: flourRefsOf(
          revision.formula.flours.map((f) => f.id),
          flourCatalog.personal,
        ),
        ...(equipment.length === 0 ? {} : { equipment }),
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

  const confirmStart = () => {
    blurActiveEditor();
    if (confirming.current) return;
    confirming.current = true;
    void presentAlert({
      onDidDismiss: () => {
        confirming.current = false;
      },
      ...(latestDraft.current !== undefined || validationActions?.isBlocked()
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

  /** Runs a trash operation; resolves to whether it was applied, saying why when not. */
  const changeTrash = async (work: () => Promise<Result<void, DomainError>>): Promise<boolean> => {
    const result = await writes.run(work);
    if (!result.ok) {
      setStorageFailed(result.reason === 'storage');
      return false;
    }
    setStorageFailed(false);
    if (!result.value.ok) {
      setFailure(result.value.error);
      return false;
    }
    setFailure(undefined);
    return true;
  };

  const confirmTrash = () =>
    void presentAlert({
      header: t('recipe.trash.title'),
      message: t('recipe.trash.confirm', { name }),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('recipe.trash'),
          role: 'destructive',
          handler: () => {
            void (async () => {
              const at = services.realClock.now();
              if (await changeTrash(() => services.recipes.trashRecipe(recipeId, at))) {
                router.push('/recipes', 'back', 'replace');
              }
            })();
          },
        },
      ],
    });

  const restore = async () => {
    if (await changeTrash(() => services.recipes.restoreRecipe(recipeId))) {
      setTrashedAt(undefined);
      const recipe = await services.recipes.getRecipe(recipeId);
      if (recipe) await loadFamily(recipe);
    }
  };

  const enterEditing = () => {
    setIsEditing(true);
    setHasEnteredEdit(true);
    switchTab('formula');
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  };

  const leaveEditing = async () => {
    blurActiveEditor();
    if (validationActions?.isBlocked()) {
      setNotice(t('draft.invalid'));
      return;
    }
    await saving.current;
    if (validationActions?.isBlocked() || latestDraft.current !== undefined) {
      setNotice(t(validationActions?.isBlocked() ? 'draft.invalid' : 'draft.unsaved'));
      return;
    }
    setIsEditing(false);
    switchTab('formula');
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  };

  const origin = stored?.origin;
  const template =
    origin?.kind === 'template'
      ? RECIPE_TEMPLATES.find((tpl) => tpl.id === origin.template.id)
      : undefined;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>

          <div
            ref={titleRef}
            tabIndex={-1}
            className="min-w-0 outline-none"
            role="heading"
            aria-level={1}
            aria-label={name}
          >
            {isEditing ? (
              <button
                type="button"
                className="fp-reset min-w-0 px-1 text-left"
                aria-label={t('draft.rename')}
                onClick={rename}
              >
                <div className="truncate text-[21px] font-bold">{name}</div>
                <div className="text-[13px] text-muted">
                  {base
                    ? t('recipe.version', { version: base.revision.version })
                    : t('draft.newRecipe')}
                </div>
              </button>
            ) : (
              <div className="min-w-0 px-1 text-left">
                <div className="truncate text-[21px] font-bold">{name}</div>
                <div className="text-[13px] text-muted">
                  {base
                    ? t('recipe.version', { version: base.revision.version })
                    : t('draft.newRecipe')}
                </div>
              </div>
            )}
          </div>
          <IonButtons slot="end">
            {base && trashedAt === undefined && (
              <IonButton
                fill="solid"
                shape="round"
                color="primary"
                className="pr-2 text-xs"
                disabled={!active && writes.busy}
                onClick={() => (active ? openBake(active.bakeId) : confirmStart())}
              >
                {active ? t('recipe.baking') : t('recipe.bake')}
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        {!newRecipe && (
          <IonToolbar>
            <div className="flex min-h-12 flex-wrap items-center gap-2 px-4 py-1">
              {trashedAt !== undefined ? (
                <IonButton
                  fill="outline"
                  className="m-0 min-h-11"
                  disabled={writes.busy}
                  onClick={() => void restore()}
                >
                  {t('trash.restore')}
                </IonButton>
              ) : !isEditing ? (
                <>
                  <IonButton fill="outline" className="m-0 min-h-11" onClick={enterEditing}>
                    {t('recipe.edit')}
                  </IonButton>
                  <IonButton
                    fill="outline"
                    className="m-0 min-h-11"
                    onClick={() => switchTab('process')}
                  >
                    {t('recipe.plan')}
                  </IonButton>
                  <IonButton
                    fill="outline"
                    color="danger"
                    className="m-0 min-h-11"
                    disabled={writes.busy}
                    onClick={confirmTrash}
                  >
                    {t('recipe.trash')}
                  </IonButton>
                </>
              ) : !newRecipe ? (
                <IonButton
                  fill="outline"
                  className="m-0 min-h-11"
                  onClick={() => void leaveEditing()}
                >
                  {t('recipe.consultation')}
                </IonButton>
              ) : null}
            </div>
          </IonToolbar>
        )}
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
              onChange={switchTab}
            />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef} className="ion-padding">
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
        {trashedAt !== undefined && (
          <p role="status" className="mt-0 mb-3">
            {t('recipe.trashed')}
          </p>
        )}
        {notice && <p className="mt-0 mb-3">{notice}</p>}
        {readFailed && (
          <p role="alert" className="mt-0 mb-3 text-alert">
            {t('state.storageRead')}
          </p>
        )}
        <SessionOnlyNotice />

        {!isEditing && (
          <div hidden={tab !== 'formula'}>
            <FormulaConsultation
              formula={draft.formula}
              {...(resolved.ok ? { resolved: resolved.value } : {})}
              process={draft.process}
              weighed={weighed}
              onToggleWeighed={toggleWeighed}
              {...(trashedAt === undefined ? { onEditHydration: editHydration } : {})}
            />
            <div className="mt-5">
              <RecipeMethod
                process={draft.process}
                preparationIds={draft.formula.components.map((c) => c.id)}
                editable={false}
                fermentationStepIds={fermentationStepIds}
              />
            </div>
          </div>
        )}
        {hasEnteredEdit && (
          <div key={`formula-${editorGeneration}`} hidden={!isEditing || tab !== 'formula'}>
            {template && (
              <div className="mb-5">
                <StyleGuide template={template} />
              </div>
            )}
            <FormulaSection
              formula={draft.formula}
              {...(resolved.ok ? { resolved: resolved.value } : {})}
              onEdit={editFormula}
              process={draft.process}
              now={services.realClock.now()}
              onStructure={editStructure}
              onProcess={changeProcess}
              weighed={weighed}
              onToggleWeighed={toggleWeighed}
              fermentationRef={fermentationRef}
              hydrationRef={hydrationRef}
            />
            <div className="mt-5">
              <RecipeMethod
                process={draft.process}
                onDurationChange={changeDuration}
                onProcessChange={changeProcess}
                preparationIds={draft.formula.components.map((c) => c.id)}
                editable={true}
                {...(targetedStepId !== undefined ? { targetedStepId } : {})}
                onClearTargetedStep={handleClearTargetedStep}
                {...(returnToPlanning ? { onReturnToPlanning: handleReturnToPlanning } : {})}
                fermentationStepIds={fermentationStepIds}
                onEditFermentation={handleEditFermentation}
              />
            </div>
          </div>
        )}
        <div hidden={tab !== 'process'}>
          <ProcessSection
            process={draft.process}
            canStart={
              base !== undefined && trashedAt === undefined && !dirty && !hasInvalid && !writes.busy
            }
            onStart={confirmStart}
            {...(active ? { activeBakeId: active.bakeId } : {})}
            onOpenBake={openBake}
            {...(trashedAt === undefined ? { onEditStepInRecipe: editStepInRecipe } : {})}
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
        <ChangeReviewSheet
          open={reviewing}
          {...(base
            ? { baseFormula: base.revision.formula, baseProcess: base.revision.process }
            : {})}
          currentFormula={draft.formula}
          currentProcess={draft.process}
          onClose={() => setReviewing(false)}
        />
      </IonContent>
      {isEditing && (
        <DraftActionBar
          dirty={dirty}
          newRecipe={newRecipe}
          {...(base ? { baseVersion: base.revision.version } : {})}
          issuesCount={issues.length}
          blockingCount={blocking}
          busy={writes.busy}
          hasInvalid={hasInvalid}
          onSave={() => void save()}
          onDiscard={discard}
          onCheck={() => setChecking(true)}
          onReview={() => setReviewing(true)}
        />
      )}
    </IonPage>
  );
};

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
