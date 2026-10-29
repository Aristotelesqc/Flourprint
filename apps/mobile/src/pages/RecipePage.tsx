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
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
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
  canonicalJson,
  checkRecipe,
  defaultVariant,
  doughSteps,
  moveStep,
  resolveFormula,
  sameWeighingRow,
  weighingGroups,
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
import { WeighingChecklist, type WeighedRow } from '../blocks/WeighingChecklist';
import { FormulaSection } from '../blocks/FormulaSection';
import { HistorySection } from '../blocks/HistorySection';
import { ProcessSection } from '../blocks/ProcessSection';
import { RecipeMethod } from '../blocks/RecipeMethod';
import { RecipeOutcome } from '../blocks/RecipeOutcome';
import { ChangeReviewSheet } from '../blocks/ChangeReviewSheet';
import { DraftActionBar } from '../blocks/DraftActionBar';
import { OverflowMenu } from '../ui/OverflowMenu';
import { InfoButton } from '../ui/InfoButton';
import { usePanelScroll } from '../ui/PanelContext';
import { useStepDragBack } from '../ui/use-step-drag-back';
import { useMessages } from '../i18n/use-messages';
import { formatMoveError, formatChangedEdges } from '../i18n/recipe-sort-messages';
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
import { Ui } from '../ui/library';
import { ValidationProvider, useValidation, useValidationActions } from '../ui/ValidationContext';

type Tab = 'formula' | 'process' | 'history';
type EditorSection = 'comp' | 'parts' | 'steps' | 'res';

interface Working {
  readonly formula: Formula;
  readonly process: Process;
}

interface HistorySnapshot {
  readonly name: string;
  readonly formula: Formula;
  readonly process: Process;
}

const sameSnapshot = (
  snapshot: HistorySnapshot,
  baseline: HistorySnapshot | undefined,
): boolean => {
  if (!baseline) return false;
  if (snapshot === baseline) return true;
  if (snapshot.name !== baseline.name) return false;
  return (
    canonicalJson(snapshot.formula) === canonicalJson(baseline.formula) &&
    canonicalJson(snapshot.process) === canonicalJson(baseline.process)
  );
};

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
  const newRecipe = draftId !== undefined;
  const services = useServices();
  const flourCatalog = useFlourCatalog();
  const router = useIonRouter();
  const [presentAlert] = useIonAlert();
  const { t, error, stepName } = useMessages();
  const [tab, setTab] = useState<Tab>('formula');
  const [editorSection, setEditorSection] = useState<EditorSection>('comp');
  const [base, setBase] = useState<{ name: string; revision: Revision }>();
  const [stored, setStored] = useState<Draft>();
  const latestDraft = useRef<Draft | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const pendingChecksReturnRef = useRef<HTMLElement | null>(null);
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
  const baselineRef = useRef<HistorySnapshot | undefined>(undefined);
  const resumedAtStartRef = useRef(false);
  const pastRef = useRef<readonly HistorySnapshot[]>([]);
  const futureRef = useRef<readonly HistorySnapshot[]>([]);
  const [past, setPast] = useState<readonly HistorySnapshot[]>([]);
  const [future, setFuture] = useState<readonly HistorySnapshot[]>([]);

  // Explicit consultation vs editing state initialized once after hydration (#67)
  const [isEditing, setIsEditing] = useState(false);
  const [hasEnteredEdit, setHasEnteredEdit] = useState(false);
  const [targetedStepId, setTargetedStepId] = useState<string>();
  const [returnToPlanning, setReturnToPlanning] = useState(false);

  const [isMethodDragging, setIsMethodDragging] = useState(false);
  const methodSortRef = useRef<{ cancelDrag(): boolean } | null>(null);
  const [moveError, setMoveError] = useState<string>();
  useStepDragBack(isMethodDragging, methodSortRef);

  // Shared temporary weighing checklist lifted to page level (#67, L110, L111)
  const [weighed, setWeighed] = useState<readonly WeighedRow[]>([]);
  const toggleWeighed = useCallback((target: WeighedRow) => {
    setWeighed((prev) => {
      const exists = prev.some((w) => sameWeighingRow(w, target));
      return exists ? prev.filter((w) => !sameWeighingRow(w, target)) : [...prev, target];
    });
  }, []);

  const hydrateOnRoute = useEffectEvent(() => {
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
          resumedAtStartRef.current = true;
          baselineRef.current = {
            name: found.name,
            formula: found.formula,
            process: found.process,
          };
          pastRef.current = [];
          futureRef.current = [];
          setPast([]);
          setFuture([]);
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
        resumedAtStartRef.current = resumed !== undefined;
        baselineRef.current = resumed
          ? { name: resumed.name, formula: resumed.formula, process: resumed.process }
          : { name: recipe.name, formula: revision.value.formula, process: revision.value.process };
        pastRef.current = [];
        futureRef.current = [];
        setPast([]);
        setFuture([]);
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
  });
  useEffect(() => hydrateOnRoute(), [recipeId, draftId, services]);

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
  type Panel = Tab | `edit-${EditorSection}`;
  const panel: Panel = isEditing ? `edit-${editorSection}` : tab;
  const panelRef = useRef<Panel>(panel);
  if (!isMethodDragging) {
    panelRef.current = panel;
  }
  const effectivePanel = isMethodDragging ? panelRef.current : panel;

  const setPanel = useCallback((next: Panel) => {
    if (next.startsWith('edit-')) {
      setHasEnteredEdit(true);
      setIsEditing(true);
      setEditorSection(next.slice(5) as EditorSection);
    } else {
      setIsEditing(false);
      setTab(next as Tab);
    }
  }, []);
  const { switchTab: selectPanel } = usePanelScroll(
    contentRef,
    effectivePanel,
    setPanel,
    draftId ?? recipeId,
    loading === 'ready',
  );
  const switchTab = useCallback((next: Tab) => selectPanel(next), [selectPanel]);
  const selectEditor = useCallback(
    (next: EditorSection) => selectPanel(`edit-${next}`),
    [selectPanel],
  );

  const displayReadingLayout = effectivePanel === 'formula';
  const showEditingChrome = effectivePanel.startsWith('edit-');
  const isMethodVisible = effectivePanel === 'formula' || effectivePanel === 'edit-steps';
  const isSortDisabled = trashedAt !== undefined || writes.busy || hasInvalid;

  const handleClearTargetedStep = useCallback(() => {
    setTargetedStepId(undefined);
  }, []);

  const editStepInRecipe = useCallback(
    (stepId: string) => {
      if (trashedAt !== undefined) return;
      selectEditor('steps');
      setReturnToPlanning(true);
      setTargetedStepId(stepId);
      setEditorSection('steps');
    },
    [trashedAt, selectEditor],
  );

  // Commit only the focused field through its normal blur path, including keyboard/AT activation.
  const blurActiveEditor = useCallback(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement && contentRef.current?.contains(focused)) {
      focused.blur();
    }
  }, []);

  const leaveEditing = useCallback(
    async (destination: Tab = 'formula') => {
      blurActiveEditor();
      setMoveError(undefined);
      await saving.current;
      // Planning is a preview of accepted values: keep mounted raw fields for the return journey.
      if (destination === 'process') {
        setReturnToPlanning(false);
        setTargetedStepId(undefined);
        switchTab(destination);
        return;
      }
      const invalid = validationActions?.isBlocked() ?? false;
      const leave = () => {
        if (invalid) setEditorGeneration((generation) => generation + 1);
        setReturnToPlanning(false);
        setTargetedStepId(undefined);
        if (newRecipe && destination === 'formula') {
          router.push('/recipes', 'back');
          return;
        }
        setIsEditing(false);
        setEditorSection('comp');
        switchTab(destination);
        requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
      };
      if (invalid) {
        if (confirming.current) return;
        confirming.current = true;
        void presentAlert({
          header: t('editor.leaveTitle'),
          message: t('editor.leaveInvalid'),
          onDidDismiss: () => {
            confirming.current = false;
          },
          buttons: [
            { text: t('bake.cancel'), role: 'cancel' },
            { text: t('editor.keepDraft'), handler: leave },
          ],
        });
      } else leave();
    },
    [blurActiveEditor, validationActions, newRecipe, router, switchTab, presentAlert, t],
  );

  const handleReturnToPlanning = useCallback(() => {
    void leaveEditing('process');
  }, [leaveEditing]);

  const hydrationRef = useRef<HTMLDivElement>(null);

  const fermentationRef = useRef<HTMLDivElement>(null);

  const handleEditFermentation = useCallback(() => {
    selectEditor('res');
    requestAnimationFrame(() => {
      if (fermentationRef.current) {
        fermentationRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        fermentationRef.current.focus({ preventScroll: true });
      }
    });
  }, [selectEditor]);

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

  // Reset checks on recipe/draft route switch or when baseline recipe's saved revision changes
  const activeRecipeKey = draftId ?? recipeId;
  const savedRevisionKey = base ? `${base.revision.recipeId}@${base.revision.version}` : undefined;
  const lastBaselineRef = useRef<{
    recipeKey: string | undefined;
    revisionKey: string | undefined;
  }>({
    recipeKey: undefined,
    revisionKey: undefined,
  });
  useEffect(() => {
    const prev = lastBaselineRef.current;
    if (prev.recipeKey !== undefined && prev.recipeKey !== activeRecipeKey) {
      setWeighed([]);
    } else if (prev.revisionKey !== undefined && prev.revisionKey !== savedRevisionKey) {
      setWeighed([]);
    }
    lastBaselineRef.current = { recipeKey: activeRecipeKey, revisionKey: savedRevisionKey };
  }, [activeRecipeKey, savedRevisionKey]);

  // Prune absent rows by identity against core groups, preserving checks across quantity edits
  useEffect(() => {
    if (!draft || !resolved?.ok) return;
    const groups = weighingGroups(draft.formula, resolved.value);
    setWeighed((previous) => {
      if (previous.length === 0) return previous;
      const valid = previous.filter((checked) =>
        groups.some((group) => group.rows.some((row) => sameWeighingRow(row, checked))),
      );
      return valid.length === previous.length ? previous : valid;
    });
  }, [draft, resolved]);

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

  const dirty =
    stored !== undefined &&
    (newRecipe ||
      !base ||
      !sameSnapshot(
        { name: stored.name, formula: stored.formula, process: stored.process },
        { name: base.name, formula: base.revision.formula, process: base.revision.process },
      ));
  const name = stored?.name ?? base?.name ?? '';
  const active = bakes.find((b) => b.status === 'active');

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
    const current = latestDraft.current;
    const active = current ?? draft;
    const next = {
      ...edited,
      process: applyModelDurations(edited.formula, edited.process).process,
    };
    if (active) {
      const currentSnap: HistorySnapshot = {
        name: current?.name ?? name,
        formula: active.formula,
        process: active.process,
      };
      if (sameSnapshot({ ...next, name: rename ?? currentSnap.name }, currentSnap)) {
        setFailure(undefined);
        setNotice(undefined);
        setMoveError(undefined);
        return;
      }
      const newPast = [...pastRef.current.slice(-49), currentSnap];
      pastRef.current = newPast;
      futureRef.current = [];
      setPast(newPast);
      setFuture([]);
    }
    const now = services.realClock.now();
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
    setMoveError(undefined);
  };

  const applySnapshot = (snapshot: HistorySnapshot) => {
    const isBaseline = sameSnapshot(snapshot, baselineRef.current);
    const isUnchangedSaved = !resumedAtStartRef.current && base !== undefined;

    if (isBaseline && isUnchangedSaved) {
      const idToDelete = latestDraft.current?.id ?? stored?.id;
      setStored(undefined);
      latestDraft.current = undefined;
      if (idToDelete) {
        saving.current = saving.current
          .then(() => services.recipes.deleteDraft(idToDelete))
          .catch((cause: unknown) => {
            console.error(cause);
            setStorageFailed(true);
          });
      }
    } else {
      const now = services.realClock.now();
      const current = latestDraft.current;
      const doc: Draft = current
        ? {
            ...current,
            name: snapshot.name,
            formula: snapshot.formula,
            process: snapshot.process,
            updatedAt: now,
          }
        : {
            id: services.ids.next(),
            name: snapshot.name,
            origin: {
              kind: 'revision',
              recipeId,
              baseVersion: base?.revision.version ?? 0,
            },
            formula: snapshot.formula,
            process: snapshot.process,
            createdAt: now,
            updatedAt: now,
          };
      setStored(doc);
      latestDraft.current = doc;
      persist(doc);
    }
    setFailure(undefined);
    setNotice(undefined);
    setMoveError(undefined);
    setEditorGeneration((generation) => generation + 1);
  };

  const undo = () => {
    blurActiveEditor();
    if (validationActions?.isBlocked()) return;
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    const active = latestDraft.current ?? draft;
    if (!previous || !active) return;
    const newPast = pastRef.current.slice(0, -1);
    const currentSnap: HistorySnapshot = {
      name: latestDraft.current?.name ?? name,
      formula: active.formula,
      process: active.process,
    };
    pastRef.current = newPast;
    futureRef.current = [currentSnap, ...futureRef.current.slice(0, 49)];
    setPast(newPast);
    setFuture(futureRef.current);
    applySnapshot(previous);
  };

  const redo = () => {
    blurActiveEditor();
    if (validationActions?.isBlocked()) return;
    if (futureRef.current.length === 0) return;
    const nextSnap = futureRef.current[0];
    const active = latestDraft.current ?? draft;
    if (!nextSnap || !active) return;
    const newFuture = futureRef.current.slice(1);
    const currentSnap: HistorySnapshot = {
      name: latestDraft.current?.name ?? name,
      formula: active.formula,
      process: active.process,
    };
    futureRef.current = newFuture;
    pastRef.current = [...pastRef.current.slice(-49), currentSnap];
    setFuture(newFuture);
    setPast(pastRef.current);
    applySnapshot(nextSnap);
  };

  const reset = () => {
    blurActiveEditor();
    const baseline = baselineRef.current;
    if (!baseline) return;
    void presentAlert({
      header: t('editor.reset'),
      message: t('editor.resetConfirm'),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('editor.reset'),
          role: 'destructive',
          handler: () => {
            pastRef.current = [];
            futureRef.current = [];
            setPast([]);
            setFuture([]);
            applySnapshot(baseline);
          },
        },
      ],
    });
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

  const handleDragStart = () => {
    setMoveError(undefined);
    setNotice(undefined);

    setIsEditing(true);
    setHasEnteredEdit(true);
    setEditorSection('steps');

    if (!latestDraft.current && draft) {
      const now = services.realClock.now();
      const doc: Draft = {
        id: services.ids.next(),
        name,
        origin: {
          kind: 'revision',
          recipeId,
          baseVersion: base?.revision.version ?? 0,
        },
        formula: draft.formula,
        process: draft.process,
        createdAt: now,
        updatedAt: now,
      };
      setStored(doc);
      latestDraft.current = doc;
      persist(doc);
    }
  };

  const handleDragActiveChange = (active: boolean) => {
    setIsMethodDragging(active);
  };

  const handleDropIntent = (
    intent: { id: string; afterId: string | null } | null,
  ): 'accepted' | 'refused' | 'unchanged' => {
    if (!intent) {
      return 'unchanged';
    }
    const { id: stepId, afterId } = intent;
    const latest = latestDraft.current ?? draft;
    if (!latest) return 'unchanged';

    const result = moveStep(latest.process, stepId, afterId);
    if (!result.ok) {
      const message = formatMoveError(result.error, stepId, latest.process, t, stepName);
      setMoveError(message);
      setNotice(undefined);
      return 'refused';
    }

    setMoveError(undefined);
    const moveResult = result.value;
    if (moveResult.kind === 'unchanged') {
      return 'unchanged';
    }

    changeProcess(moveResult.process);
    if (
      moveResult.kind === 'chain' &&
      moveResult.changedEdges &&
      moveResult.changedEdges.length > 0
    ) {
      const summary = formatChangedEdges(moveResult.changedEdges, moveResult.process, t, stepName);
      setNotice(summary);
    } else {
      setNotice(undefined);
    }

    return 'accepted';
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

  const save = async () => {
    const opener =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
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
      if (saved.error.code === 'RecipeHasBlockingIssues') {
        pendingChecksReturnRef.current = opener;
        setChecking(true);
      } else {
        setFailure(saved.error);
      }
      return;
    }
    setStored(undefined);
    latestDraft.current = undefined;
    pastRef.current = [];
    futureRef.current = [];
    setPast([]);
    setFuture([]);
    resumedAtStartRef.current = false;
    baselineRef.current = {
      name: target.name,
      formula: saved.value.formula,
      process: saved.value.process,
    };
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
            pastRef.current = [];
            futureRef.current = [];
            setPast([]);
            setFuture([]);
            resumedAtStartRef.current = false;
            setEditorGeneration((generation) => generation + 1);
            setFailure(undefined);
            setMoveError(undefined);
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
    const savedResolved = resolveFormula(revision.formula);
    const savedGroups = savedResolved.ok
      ? weighingGroups(revision.formula, savedResolved.value)
      : [];
    const validWeighed = weighed
      .filter((w) => savedGroups.some((g) => g.rows.some((r) => sameWeighingRow(r, w))))
      .map((w) => ({
        stage:
          w.stage.kind === 'component'
            ? { kind: 'component' as const, id: w.stage.id }
            : { kind: w.stage.kind },
        item:
          w.item.kind === 'ingredient'
            ? { kind: 'ingredient' as const, id: w.item.id }
            : { kind: w.item.kind },
      }));
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
        ...(validWeighed.length === 0 ? {} : { weighed: validWeighed }),
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
    setWeighed([]);
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
    selectEditor('comp');
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
            {showEditingChrome || isMethodDragging ? (
              <IonButton
                fill="clear"
                onClick={() => {
                  if (!methodSortRef.current?.cancelDrag()) void leaveEditing();
                }}
                aria-label={t(isMethodDragging ? 'bake.cancel' : 'recipe.consultation')}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </IonButton>
            ) : (
              <IonBackButton defaultHref="/recipes" />
            )}
          </IonButtons>

          {showEditingChrome ? (
            <div className="min-w-0 px-2 font-bold text-lg">
              {t('recipe.edit')}
              {base && (
                <div className="m3-type-metadata font-medium text-muted">
                  {t('recipe.version', { version: base.revision.version })}
                </div>
              )}
            </div>
          ) : (
            <div ref={titleRef} tabIndex={-1} className="min-w-0 px-2 py-1 outline-none">
              <h1 className="m-0 text-lg font-bold break-words leading-tight">{name}</h1>
              <div className="text-xs text-muted mt-0.5">
                {base
                  ? t('recipe.version', { version: base.revision.version })
                  : t('draft.newRecipe')}
                {dirty && (
                  <span className="ml-2" role="status">
                    {t('draft.unsaved')}
                  </span>
                )}
              </div>
            </div>
          )}

          <IonButtons slot="end">
            {showEditingChrome && (
              <OverflowMenu
                ariaLabel={t('editor.overflowActions')}
                title={t('editor.overflowActions')}
                actions={[
                  {
                    label: t('draft.rename'),
                    handler: rename,
                  },
                  {
                    label:
                      issues.length === 0
                        ? t('editor.check')
                        : `${t('editor.check')} (${issues.length})`,
                    handler: () => {
                      pendingChecksReturnRef.current = null;
                      setChecking(true);
                    },
                  },
                  {
                    label: t('recipe.tab.process'),
                    handler: () => void leaveEditing('process'),
                  },
                  {
                    label: t('editor.review'),
                    disabled: !dirty,
                    handler: () => setReviewing(true),
                  },
                  'divider',
                  {
                    label: t('editor.discard'),
                    destructive: true,
                    disabled: (!dirty && !hasInvalid) || writes.busy,
                    handler: discard,
                  },
                ]}
              />
            )}
          </IonButtons>
        </IonToolbar>
        {trashedAt !== undefined && (
          <IonToolbar>
            <div className="flex min-h-12 items-center px-4 py-1">
              <IonButton
                fill="outline"
                shape="round"
                className="m-0 min-h-11"
                disabled={writes.busy}
                onClick={() => void restore()}
              >
                {t('trash.restore')}
              </IonButton>
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
            {!showEditingChrome ? (
              <Ui
                component="fp.tabs"
                selected={tab}
                onSelectedChange={(id) => switchTab(id as Tab)}
                label={t('recipe.tabsLabel')}
                renderPanels={false}
                items={(base
                  ? (['formula', 'process', 'history'] as const)
                  : (['formula', 'process'] as const)
                ).map((value) => ({
                  id: value,
                  label: t(`recipe.tab.${value}`),
                }))}
              />
            ) : (
              <Segmented
                value={editorSection}
                appearance="editor"
                options={(['comp', 'parts', 'steps', 'res'] as const).map((value) => ({
                  value,
                  label: t(`recipe.tab.${value}`),
                }))}
                onChange={(section) => {
                  blurActiveEditor();
                  selectEditor(section);
                }}
              />
            )}
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef} className="ion-padding">
        {moveError && (
          <p role="alert" className="mt-0 mb-3 text-alert">
            {moveError}
          </p>
        )}
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

        {!isEditing && hasInvalid && (
          <div className="m3-card-quiet mb-4 flex-row flex-wrap items-center justify-between">
            <span className="flex items-center gap-2 text-sm" role="status">
              {t('draft.invalidPreview')}
              <InfoButton topic="draft" term={t('draft.invalid')} />
            </span>
            <button
              type="button"
              className="fp-reset min-h-touch px-2 text-sm font-semibold text-accent underline focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => selectEditor(editorSection)}
            >
              {t('recipe.edit')}
            </button>
          </div>
        )}

        {displayReadingLayout && (
          <div hidden={effectivePanel !== 'formula'} className="pb-6">
            <FormulaConsultation
              formula={draft.formula}
              {...(resolved.ok ? { resolved: resolved.value } : {})}
              process={draft.process}
              weighed={weighed}
              onToggleWeighed={toggleWeighed}
            />
          </div>
        )}
        {hasEnteredEdit && (
          <div key={`editor-${editorGeneration}`} hidden={displayReadingLayout || !isEditing}>
            <div hidden={editorSection !== 'comp'} className="mb-4 flex flex-col gap-3">
              {template && <StyleGuide template={template} />}
              <div className="m3-card flex-row items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-muted">{t('recipe.nameLabel')}</div>
                  <h1 className="m3-type-title m-0 break-words">{name}</h1>
                </div>
              </div>
            </div>
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
              visibleSection={editorSection === 'steps' ? 'none' : editorSection}
            />
            <div hidden={editorSection !== 'res'}>
              <RecipeOutcome process={draft.process} editable={true} onChange={changeProcess} />
            </div>
          </div>
        )}
        <div hidden={!isMethodVisible} className={displayReadingLayout ? 'mt-5 pb-6' : undefined}>
          <RecipeMethod
            key="recipe-method-singleton"
            dragControl={methodSortRef}
            process={draft.process}
            onDurationChange={changeDuration}
            onProcessChange={changeProcess}
            onDropIntent={handleDropIntent}
            onDragStart={handleDragStart}
            onDragActiveChange={handleDragActiveChange}
            disabled={isSortDisabled}
            preparationIds={draft.formula.components.map((c) => c.id)}
            editable={effectivePanel.startsWith('edit-')}
            showOutcome={displayReadingLayout}
            {...(targetedStepId !== undefined ? { targetedStepId } : {})}
            onClearTargetedStep={handleClearTargetedStep}
            {...(returnToPlanning ? { onReturnToPlanning: handleReturnToPlanning } : {})}
            fermentationStepIds={fermentationStepIds}
            onEditFermentation={handleEditFermentation}
          />
        </div>
        <div hidden={isEditing || tab !== 'process'}>
          <ProcessSection
            process={draft.process}
            canStart={
              base !== undefined && trashedAt === undefined && !dirty && !hasInvalid && !writes.busy
            }
            showActions={false}
            onStart={confirmStart}
            {...(active ? { activeBakeId: active.bakeId } : {})}
            onOpenBake={openBake}
            {...(trashedAt === undefined ? { onEditStepInRecipe: editStepInRecipe } : {})}
          />
          {resolved.ok && trashedAt === undefined && (
            <div className="mt-5 pb-6">
              <WeighingChecklist
                formula={draft.formula}
                resolved={resolved.value}
                weighed={weighed}
                onToggle={toggleWeighed}
              />
            </div>
          )}
        </div>

        {base && (
          <div hidden={isEditing || tab !== 'history'}>
            <HistorySection bakes={bakes} />
          </div>
        )}

        <RecipeChecks
          open={checking}
          issues={issues}
          process={draft.process}
          onClose={() => setChecking(false)}
          onDismissed={() => {
            const target = pendingChecksReturnRef.current;
            pendingChecksReturnRef.current = null;
            if (!target) return;
            requestAnimationFrame(() => {
              if (
                !target.isConnected ||
                ('disabled' in target && (target as HTMLButtonElement).disabled) ||
                target.closest('[inert], [hidden], [aria-hidden="true"], .ion-page-hidden')
              ) {
                return;
              }
              const isVisible =
                typeof target.checkVisibility === 'function'
                  ? target.checkVisibility()
                  : target.getClientRects().length > 0;
              if (!isVisible) return;
              const active = typeof document !== 'undefined' ? document.activeElement : null;
              if (active && active !== document.body && active !== target) return;
              if (
                typeof document !== 'undefined' &&
                document.querySelector(
                  'ion-alert:not(.overlay-hidden), ion-action-sheet:not(.overlay-hidden), ion-loading:not(.overlay-hidden), ion-modal:not(.overlay-hidden), ion-popover:not(.overlay-hidden)',
                )
              ) {
                return;
              }
              target.focus({ preventScroll: true });
            });
          }}
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
      {!showEditingChrome && base && trashedAt === undefined && (
        <IonFooter className="ion-no-border">
          <Ui component="fp.bottom-bar" navigationLabel={t('recipe.bottomBarLabel')}>
            <Ui
              component="fp.button"
              variant="quiet"
              aria-label={t('recipe.editAction')}
              onClick={enterEditing}
            >
              {t('recipe.edit')}
            </Ui>
            <div className="flex items-center gap-2 shrink-0">
              <Ui
                component="fp.button"
                variant="primary"
                aria-label={active ? t('recipe.resumeAction') : t('recipe.startAction')}
                disabled={!active && (writes.busy || dirty || hasInvalid)}
                onClick={() => (active ? openBake(active.bakeId) : confirmStart())}
              >
                {active ? t('recipe.resumeActionShort') : t('recipe.startActionShort')}
              </Ui>
              <OverflowMenu
                ariaLabel={t('recipe.overflowActions')}
                title={t('recipe.overflowActions')}
                actions={[
                  ...(active
                    ? [
                        {
                          label: t('process.startAnother'),
                          handler: confirmStart,
                          disabled: dirty || hasInvalid || writes.busy,
                        },
                      ]
                    : []),
                  'divider',
                  {
                    label: t('recipe.trash'),
                    destructive: true,
                    disabled: writes.busy,
                    handler: confirmTrash,
                  },
                ]}
              />
            </div>
          </Ui>
        </IonFooter>
      )}
      {showEditingChrome && (
        <DraftActionBar
          dirty={dirty}
          newRecipe={newRecipe}
          {...(base ? { baseVersion: base.revision.version } : {})}
          busy={writes.busy}
          hasInvalid={hasInvalid}
          onSave={() => void save()}
          canUndo={past.length > 0 && !hasInvalid}
          canRedo={future.length > 0 && !hasInvalid}
          canReset={dirty || past.length > 0 || hasInvalid}
          onUndo={undo}
          onRedo={redo}
          onReset={reset}
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
