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
  defaultVariant,
  resolveFormula,
  validateRecipe,
  type BakeCommandPayload,
  type BakeSummary,
  type Recipe,
  type RecipeFamily,
  type DomainError,
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
        await loadFamily(recipe);
      } catch (error) {
        console.error(error);
        setLoading('failed');
      }
    })();
  }, [recipeId, services]);

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

  // A double tap can reach a second button after the first navigation: never stack the same page.
  const openBake = (bakeId: string) => {
    const path = `/bakes/${bakeId}`;
    if (window.location.pathname !== path) router.push(path);
  };

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

  /** A formula edit and the process change it needs (a preparation's step), validated together. */
  const editStructure = (command: FormulaEdit, nextProcess?: Process): boolean => {
    const next = applyFormulaEdit(draft.formula, command);
    if (!next.ok) {
      setFailure(next.error);
      return false;
    }
    const process = nextProcess ?? draft.process;
    const valid = validateRecipe(next.value, process);
    if (!valid.ok) {
      setFailure(valid.error);
      return false;
    }
    update({ formula: next.value, process });
    return true;
  };

  const changeDuration = (stepId: string, durationS: number | undefined): boolean => {
    const process = {
      ...draft.process,
      steps: draft.process.steps.map((s) => {
        if (s.id !== stepId) return s;
        // A typed duration is no longer an applied suggestion (fermentation.md).
        const { plannedDurationS: _, accepted: __, ...rest } = s;
        return durationS === undefined ? rest : { ...rest, plannedDurationS: durationS };
      }),
    };
    const valid = validateRecipe(draft.formula, process);
    if (valid.ok) update({ ...draft, process });
    else setFailure(valid.error);
    return valid.ok;
  };

  const changeProcess = (process: Process): boolean => {
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
              onClick={() => (active ? openBake(active.bakeId) : setTab('process'))}
            >
              {active ? t('recipe.baking') : t('recipe.bake')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
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
        {readFailed && (
          <p role="alert" className="mt-0 mb-3 text-alert">
            {t('state.storageRead')}
          </p>
        )}
        <SessionOnlyNotice />

        {/* Tabs stay mounted: a draft being typed and the weighing checklist survive a switch. */}
        <div hidden={tab !== 'formula'}>
          {resolved.ok ? (
            <FormulaSection
              formula={draft.formula}
              resolved={resolved.value}
              onEdit={editFormula}
              base={base.revision.formula}
              process={draft.process}
              now={services.clock.now()}
              onStructure={editStructure}
              onProcess={changeProcess}
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
            {...(active ? { activeBakeId: active.bakeId } : {})}
            onOpenBake={openBake}
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
