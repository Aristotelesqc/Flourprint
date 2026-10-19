import {
  IonContent,
  IonButton,
  IonPage,
  IonRouterLink,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { blankRecipe, loadBake, nextDraftName, type Draft } from '@flourprint/core/application';
import {
  defaultVariant,
  resolveFormula,
  type BakeState,
  type Instant,
  type Recipe,
  type Formula,
  type Process,
  type RecipeTemplate,
  type Revision,
} from '@flourprint/core/domain';
import { NewRecipe, useTemplateName } from '../blocks/NewRecipe';
import { AppBar, AppBarButton, FlourIcon, MoreIcon, PlusIcon, TimerIcon } from '../ui/AppBar';
import { DevRefresher } from '../ui/DevRefresher';
import { useMessages } from '../i18n/use-messages';
import { formatDuration, formatRelative } from '../i18n/time';
import { bakeView } from '../services/bake-view';
import { recipeDuration } from '../services/recipe-duration';
import { activeBakes } from '../services/bakes';
import { useServices } from '../services/services';
import { totalWaterKey } from '../blocks/water-label';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';

interface Card {
  readonly recipe: Recipe;
  readonly revision?: Revision;
  readonly lastBaked?: Instant;
  readonly cookingUnknown?: boolean;
  /** Last finished preparation that ended as dough only (no cooking). */
  readonly lastDough?: Instant;
  /** Number of variants when the recipe is the shown variant of a family. */
  readonly variants?: number;
}

/**
 * Recipe list of the #8 mockups: running bakes first, then one card per recipe; a family shows
 * once, through its default variant (persistence.md).
 */
export const RecipesPage = () => {
  const services = useServices();
  const router = useIonRouter();
  const { t, locale } = useMessages();
  const templateName = useTemplateName();
  const [drafts, setDrafts] = useState<readonly Draft[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const pendingRouteRef = useRef<string | null>(null);
  const [cards, setCards] = useState<readonly Card[]>();
  const [running, setRunning] = useState<readonly BakeState[]>([]);
  // Every recipe, trashed ones and family variants included: a running bake may use a variant not
  // shown as a card, or a recipe put in the trash since.
  const [allRecipes, setAllRecipes] = useState<readonly Recipe[]>([]);
  const [now, setNow] = useState(services.clock.now());
  const [readFailed, setReadFailed] = useState(false);
  // Drafts of a version read as edits of their recipe while it exists, in the trash or not; once
  // it is deleted they stand alone and can be saved as a new recipe (persistence.md).
  const editsOf = ({ origin }: Draft): string | undefined =>
    origin.kind === 'revision' && allRecipes.some((recipe) => recipe.id === origin.recipeId)
      ? origin.recipeId
      : undefined;
  // Running bakes this version cannot read: said, never hidden.
  const [unreadable, setUnreadable] = useState(0);

  const load = async () => {
    setNow(services.clock.now());
    const summaries = await services.bakes.listBakes();
    const finished = await Promise.all(
      summaries
        .filter((s) => s.status === 'finished')
        .map(async (summary) => ({
          summary,
          state: await loadBake(services.bakes, summary.bakeId),
        })),
    );
    const all = await services.recipes.listRecipes();
    const families = await services.recipes.listFamilies();
    // The trash too: a running bake may use a recipe put there since.
    setAllRecipes([...all, ...(await services.recipes.listTrash())]);
    const shown = new Set(families.map((f) => defaultVariant(f, all)?.id));
    const recipes = all.filter((r) => r.familyId === undefined || shown.has(r.id));
    const variants = (recipe: Recipe) =>
      recipe.familyId === undefined
        ? undefined
        : all.filter((r) => r.familyId === recipe.familyId).length;
    setCards(
      await Promise.all(
        recipes.map(async (recipe) => {
          const count = variants(recipe);
          const revision = await services.recipes.getRevision(recipe.id, recipe.headVersion);
          const history = finished.filter(({ summary }) => summary.recipeId === recipe.id);
          const cookedHistory = history
            .filter(
              ({ state }) =>
                state.ok &&
                (state.value.outcome?.result === 'cooked' ||
                  state.value.outcome?.result === 'cookedAndDough'),
            )
            .map(
              ({ summary, state }) =>
                (state.ok ? state.value.endedAt : undefined) ??
                (summary.endedAt as Instant | undefined),
            )
            .filter((endedAt): endedAt is Instant => endedAt !== undefined)
            .sort((a, b) => Date.parse(a) - Date.parse(b));
          const lastBaked = cookedHistory.at(-1);
          // A preparation does not always end in cooking (bake-session.md, Outcome).
          const lastDough = history
            .filter(({ state }) => state.ok && state.value.outcome?.result === 'dough')
            .map(
              ({ summary, state }) =>
                (state.ok ? state.value.endedAt : undefined) ??
                (summary.endedAt as Instant | undefined),
            )
            .filter((endedAt): endedAt is Instant => endedAt !== undefined)
            .sort((a, b) => Date.parse(a) - Date.parse(b))
            .at(-1);
          const hasCookingUnknown = history.some(({ summary, state }) => {
            if (!state.ok || state.value.outcome === undefined) return true;
            const isCooked =
              state.value.outcome.result === 'cooked' ||
              state.value.outcome.result === 'cookedAndDough';
            const endInstant = state.value.endedAt ?? summary.endedAt;
            return isCooked && endInstant === undefined;
          });
          return {
            recipe,
            ...(revision.ok && revision.value ? { revision: revision.value } : {}),
            ...(lastBaked ? { lastBaked } : {}),
            ...(hasCookingUnknown ? { cookingUnknown: true } : {}),
            ...(lastDough ? { lastDough } : {}),
            ...(count === undefined ? {} : { variants: count }),
          };
        }),
      ),
    );
    const active = await activeBakes(services);
    setDrafts(await services.recipes.listDrafts());
    setRunning(active.flatMap(({ result }) => (result.ok ? [result.value] : [])));
    setUnreadable(active.filter(({ result }) => !result.ok).length);
    setReadFailed(false);
  };

  // Pages stay mounted in the Ionic stack: refresh when the view becomes active again.
  useIonViewWillEnter(() => {
    load().catch((error: unknown) => {
      console.error(error);
      setReadFailed(true);
    });
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(services.clock.now()), 15_000);
    return () => clearInterval(timer);
  }, [services]);

  /** A new draft named "<base> <n>", stored at once, then opened (drafts.md). */
  const create = async (
    base: string,
    start: { formula: Formula; process: Process },
    origin: Draft['origin'],
  ) => {
    if (creatingRef.current || pendingRouteRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const taken = [
        ...(await services.recipes.listRecipes()).map((r) => r.name),
        ...(await services.recipes.listDrafts()).map((d) => d.name),
      ];
      const now = services.realClock.now();
      const draft: Draft = {
        id: services.ids.next(),
        name: nextDraftName(base, taken),
        origin,
        // A copy: the template itself never changes (drafts.md).
        formula: structuredClone(start.formula),
        process: structuredClone(start.process),
        createdAt: now,
        updatedAt: now,
      };
      await services.recipes.saveDraft(draft);
      pendingRouteRef.current = `/drafts/${draft.id}`;
      setChoosing(false);
    } catch (error) {
      console.error(error);
      setReadFailed(true);
      pendingRouteRef.current = null;
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };
  const fromTemplate = (template: RecipeTemplate) =>
    void create(templateName(template.id), template, {
      kind: 'template',
      template: { id: template.id, version: template.version },
    });

  return (
    <IonPage>
      <AppBar>
        <AppBarButton label={t('bakes.title')} routerLink="/bakes" count={running.length}>
          <TimerIcon />
        </AppBarButton>
        <AppBarButton label={t('new.title')} onClick={() => setChoosing(true)}>
          <PlusIcon />
        </AppBarButton>
        <AppBarButton label={t('flours.title')} routerLink="/flours">
          <FlourIcon />
        </AppBarButton>
        <AppBarButton label={t('advanced.title')} routerLink="/advanced">
          <MoreIcon />
        </AppBarButton>
      </AppBar>
      <IonContent>
        <DevRefresher />
        <div className="flex flex-col gap-3 px-4 pt-2 pb-8">
          <h1 className="m3-type-page m-0 px-1">{t('recipes.title')}</h1>
          <SessionOnlyNotice />
          {readFailed && <p role="alert">{t('state.storageRead')}</p>}
          {unreadable > 0 && (
            <p role="alert" className="m-0 text-alert">
              {t('bakes.unreadable', { count: unreadable })}
            </p>
          )}
          {running.length > 1 && (
            <IonButton expand="block" fill="outline" routerLink="/bakes">
              {t('recipes.allBakes', { count: running.length })}
            </IonButton>
          )}
          {running.map((bake) => (
            <RunningBake key={bake.bakeId} bake={bake} now={now} recipes={allRecipes} />
          ))}
          {drafts.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="m-0 px-1 text-sm font-bold tracking-wider text-muted uppercase">
                {t('recipes.drafts')}
              </h2>
              {drafts.map((draft) => (
                <IonRouterLink
                  key={draft.id}
                  routerLink={
                    editsOf(draft) !== undefined
                      ? `/recipes/${editsOf(draft)}`
                      : `/drafts/${draft.id}`
                  }
                  className="text-ink"
                >
                  <div className="flex items-baseline justify-between gap-2 rounded-2xl border border-dashed border-line bg-surface px-4 py-3">
                    <span className="font-semibold">{draft.name}</span>
                    <span className="shrink-0 text-[13px] text-muted">
                      {editsOf(draft) !== undefined
                        ? t('recipes.draftEdits')
                        : formatRelative(draft.updatedAt, services.realClock.now(), locale)}
                    </span>
                  </div>
                </IonRouterLink>
              ))}
            </section>
          )}
          {cards?.length === 0 && <p className="text-muted">{t('recipes.empty')}</p>}
          {cards?.map((card) => (
            <RecipeCard key={card.recipe.id} card={card} now={now} />
          ))}
        </div>
        <NewRecipe
          open={choosing}
          busy={creating}
          onBlank={() => void create(t('draft.blankName'), blankRecipe(), { kind: 'blank' })}
          onTemplate={fromTemplate}
          onClose={() => setChoosing(false)}
          onDismissed={() => {
            const route = pendingRouteRef.current;
            pendingRouteRef.current = null;
            if (route) {
              router.push(route);
            }
          }}
        />
      </IonContent>
    </IonPage>
  );
};

const RunningBake = ({
  bake,
  now,
  recipes,
}: {
  bake: BakeState;
  now: Instant;
  recipes: readonly Recipe[];
}) => {
  const { t, stepName } = useMessages();
  const recipe = recipes.find((r) => r.id === bake.snapshot?.revisions.formula.id);
  const focus = bakeView(bake, now)?.focus;
  let detail = '';
  if (focus) {
    const end = focus.projected?.end;
    if (focus.running && end) {
      const seconds = (Date.parse(end) - Date.parse(now)) / 1000;
      detail = `${stepName(focus.step)} · ${formatDuration(seconds)} ${t(seconds >= 0 ? 'bake.left' : 'bake.over')}`;
    } else detail = t('bake.start', { step: stepName(focus.step) });
  }
  return (
    <IonRouterLink routerLink={`/bakes/${bake.bakeId}`} className="text-ink">
      <div className="m3-card-quiet m3-card-interactive">
        <div className="text-xs font-bold tracking-wider text-accent uppercase">
          {t('recipes.activeBakeCard')}
        </div>
        <h2 className="m3-type-title m-0">{recipe?.name ?? t('recipe.deleted')}</h2>
        <div className="text-sm text-muted">{detail}</div>
        <div className="mt-0.5">
          <span className="text-sm font-semibold text-accent underline">
            {t('recipes.resumeBake')}
          </span>
        </div>
      </div>
    </IonRouterLink>
  );
};

const RecipeCard = ({ card, now }: { card: Card; now: Instant }) => {
  const { t, grams, pct, wholePct, componentName, locale } = useMessages();
  const { recipe, revision } = card;
  const resolved = revision ? resolveFormula(revision.formula) : undefined;
  const length = revision ? recipeDuration(revision.process, now) : undefined;
  const duration =
    length?.kind === 'complete'
      ? formatDuration(length.seconds)
      : length?.kind === 'atLeast'
        ? t('recipes.card.durationAtLeast', { duration: formatDuration(length.seconds) })
        : undefined;
  const parts = revision?.formula.components
    .map(
      (c) =>
        `${componentName(revision.formula, c)} ${t('formula.prep.flourPct', { pct: pct(c.flourPct) })}`,
    )
    .join(' · ');
  const isEstimate =
    resolved?.ok &&
    (resolved.value.totalWater.completeness === 'incomplete' ||
      totalWaterKey(resolved.value.totalWater) === 'formula.stat.totalWaterEstimate');
  const hydrationDisplay = resolved?.ok
    ? isEstimate
      ? `≈ ${wholePct(resolved.value.totalWaterPct)}`
      : wholePct(resolved.value.totalWaterPct)
    : '—';
  return (
    <IonRouterLink routerLink={`/recipes/${recipe.id}`} className="text-ink">
      <div className="m3-card m3-card-interactive">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="m3-type-title m-0">{recipe.name}</h2>
          <span className="shrink-0 text-[13px] text-muted">
            {card.variants === undefined
              ? `v${recipe.headVersion}`
              : t('family.variants', { count: card.variants })}
          </span>
        </div>
        <div className="card-stats">
          <Figure
            label={t('recipes.card.dough')}
            value={resolved?.ok ? grams(resolved.value.doughWeight) : '—'}
          />
          <Figure label={t('recipes.card.hydration')} value={hydrationDisplay} />
          <Figure label={t('recipes.card.duration')} value={duration ?? '—'} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted">
          {parts && <span className="min-w-0 max-w-full truncate">{parts}</span>}
          <span className="shrink-0 whitespace-nowrap">
            {card.lastBaked
              ? t('recipes.card.lastBaked', { when: formatRelative(card.lastBaked, now, locale) })
              : card.cookingUnknown
                ? t('recipes.card.cookingUnknown')
                : card.lastDough
                  ? t('recipes.card.lastDough', {
                      when: formatRelative(card.lastDough, now, locale),
                    })
                  : t('recipes.card.neverPrepared')}
          </span>
        </div>
      </div>
    </IonRouterLink>
  );
};

const Figure = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);
