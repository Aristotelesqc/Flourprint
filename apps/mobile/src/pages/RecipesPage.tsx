import {
  IonButton,
  IonContent,
  IonPage,
  IonRouterLink,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { blankRecipe, loadBake, nextDraftName, type Draft } from '@flourprint/core/application';
import {
  defaultVariant,
  type BakeState,
  type Recipe,
  type Formula,
  type Process,
  type RecipeTemplate,
  type Revision,
} from '@flourprint/core/domain';
import {
  FallbackRunningCard,
  LibraryCard,
  type CardHistory,
  type LibraryCardItem,
} from '../blocks/LibraryCard';
import { NewRecipe, useTemplateName } from '../blocks/NewRecipe';
import { AppBar, AppBarButton, FlourIcon, MoreIcon, PlusIcon, TimerIcon } from '../ui/AppBar';
import { DevRefresher } from '../ui/DevRefresher';
import { useMessages } from '../i18n/use-messages';
import { formatRelative } from '../i18n/time';
import { activeBakes } from '../services/bakes';
import { useServices } from '../services/services';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';

interface CardRecord {
  readonly recipe: Recipe;
  readonly revision?: Revision;
  readonly history: CardHistory;
  /** Number of variants when the recipe is the shown variant of a family. */
  readonly variants?: number;
}

type StatusFilter = 'all' | 'active' | 'ready' | 'drafts';

const normalizeSearchText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

const matchesTokens = (tokens: readonly string[], visibleTexts: readonly string[]): boolean => {
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(visibleTexts.join(' '));
  return tokens.every((token) => haystack.includes(token));
};

const latestRating = (state: BakeState): number | undefined => {
  for (let i = state.observations.length - 1; i >= 0; i -= 1) {
    const rating = state.observations[i]?.payload.rating;
    if (rating !== undefined) return rating;
  }
  return undefined;
};

/**
 * Recipe library: running preparations first, in-place search, drafts, and one card per saved
 * recipe (a family shows once through its default variant per persistence.md).
 */
export const RecipesPage = () => {
  const services = useServices();
  const router = useIonRouter();
  const { t, componentName, locale } = useMessages();
  const templateName = useTemplateName();
  const [drafts, setDrafts] = useState<readonly Draft[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const pendingRouteRef = useRef<string | null>(null);
  const [cards, setCards] = useState<readonly CardRecord[]>();
  const [running, setRunning] = useState<readonly BakeState[]>([]);
  // Every recipe, trashed ones and family variants included: a running bake may use a variant not
  // shown as a card, or a recipe put in the trash since.
  const [allRecipes, setAllRecipes] = useState<readonly Recipe[]>([]);
  const [now, setNow] = useState(services.clock.now());
  const [readFailed, setReadFailed] = useState(false);
  // Running bakes this version cannot read: said, never hidden.
  const [unreadable, setUnreadable] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const searchInputId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Drafts of a version read as edits of their recipe while it exists, in the trash or not; once
  // it is deleted they stand alone and can be saved as a new recipe (persistence.md).
  const editsOf = ({ origin }: Draft): string | undefined =>
    origin.kind === 'revision' && allRecipes.some((recipe) => recipe.id === origin.recipeId)
      ? origin.recipeId
      : undefined;

  const load = async () => {
    const nextNow = services.clock.now();
    const [summaries, all, families, trash, active, nextDrafts] = await Promise.all([
      services.bakes.listBakes(),
      services.recipes.listRecipes(),
      services.recipes.listFamilies(),
      services.recipes.listTrash(),
      activeBakes(services),
      services.recipes.listDrafts(),
    ]);
    const past = await Promise.all(
      summaries
        .filter((s) => s.status === 'finished' || s.status === 'abandoned')
        .map(async (summary) => ({
          summary,
          state: await loadBake(services.bakes, summary.bakeId),
        })),
    );
    const shown = new Set(families.map((f) => defaultVariant(f, all)?.id));
    const recipes = all.filter((r) => r.familyId === undefined || shown.has(r.id));
    const variants = (recipe: Recipe) =>
      recipe.familyId === undefined
        ? undefined
        : all.filter((r) => r.familyId === recipe.familyId).length;
    const nextCards = await Promise.all(
      recipes.map(async (recipe): Promise<CardRecord> => {
        const count = variants(recipe);
        const revision = await services.recipes.getRevision(recipe.id, recipe.headVersion);
        const historyEntries = past
          .filter(({ summary }) => summary.recipeId === recipe.id)
          .map((entry) => {
            const endedAt =
              (entry.state.ok ? entry.state.value.endedAt : undefined) ?? entry.summary.endedAt;
            const sortMs = Date.parse(endedAt ?? entry.summary.updatedAt);
            const updatedMs = Date.parse(entry.summary.updatedAt);
            return {
              ...entry,
              endedAt,
              sortMs: Number.isFinite(sortMs) ? sortMs : 0,
              updatedMs: Number.isFinite(updatedMs) ? updatedMs : 0,
            };
          })
          .sort((a, b) => b.sortMs - a.sortMs || b.updatedMs - a.updatedMs);

        const latest = historyEntries[0];
        let history: CardHistory;
        if (!latest) {
          history = { kind: 'neverPrepared' };
        } else if (
          latest.summary.status === 'abandoned' ||
          (latest.state.ok && latest.state.value.status === 'abandoned')
        ) {
          history = {
            kind: 'abandoned',
            ...(latest.endedAt === undefined ? {} : { endedAt: latest.endedAt }),
          };
        } else {
          const result = latest.state.ok
            ? (latest.state.value.outcome?.result ?? 'unknown')
            : 'unknown';
          const rating = latest.state.ok ? latestRating(latest.state.value) : undefined;
          history = {
            kind: 'finished',
            result,
            ...(latest.endedAt === undefined ? {} : { endedAt: latest.endedAt }),
            ...(rating === undefined ? {} : { rating }),
          };
        }

        return {
          recipe,
          ...(revision.ok && revision.value ? { revision: revision.value } : {}),
          history,
          ...(count === undefined ? {} : { variants: count }),
        };
      }),
    );

    setNow(nextNow);
    // The trash too: a running bake may use a recipe put there since.
    setAllRecipes([...all, ...trash]);
    setCards(nextCards);
    setDrafts(nextDrafts);
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

  /** A new draft named by nextDraftName (the base name, else "<base> <n>"), stored at once, then opened (drafts.md). */
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
      const realNow = services.realClock.now();
      const draft: Draft = {
        id: services.ids.next(),
        name: nextDraftName(base, taken),
        origin,
        // A copy: the template itself never changes (drafts.md).
        formula: structuredClone(start.formula),
        process: structuredClone(start.process),
        createdAt: realNow,
        updatedAt: realNow,
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

  const queryTokens = normalizeSearchText(searchQuery).trim().split(/\s+/).filter(Boolean);
  const hasQuery = queryTokens.length > 0;

  const activeByRecipe = new Map<string, BakeState[]>();
  for (const bake of running) {
    const id = bake.snapshot?.revisions.formula.id;
    if (!id) continue;
    const list = activeByRecipe.get(id);
    if (list) list.push(bake);
    else activeByRecipe.set(id, [bake]);
  }

  const draftRecipeIds = new Set<string>();
  for (const draft of drafts) {
    if (draft.origin.kind === 'revision') draftRecipeIds.add(draft.origin.recipeId);
  }

  const visibleCardIds = new Set((cards ?? []).map((c) => c.recipe.id));

  const queryMatchingCards: LibraryCardItem[] = [];
  for (const card of cards ?? []) {
    const formula = card.revision?.formula;
    const preDoughs = formula ? formula.components.map((c) => componentName(formula, c)) : [];
    if (!matchesTokens(queryTokens, [card.recipe.name, ...preDoughs])) continue;
    queryMatchingCards.push({
      recipe: card.recipe,
      ...(card.revision === undefined ? {} : { revision: card.revision }),
      history: card.history,
      ...(card.variants === undefined ? {} : { variants: card.variants }),
      hasDraft: draftRecipeIds.has(card.recipe.id),
      preDoughs,
      activeBakes: activeByRecipe.get(card.recipe.id) ?? [],
    });
  }

  const activeCards = queryMatchingCards.filter((c) => c.activeBakes.length > 0);
  const inactiveCards = queryMatchingCards.filter((c) => c.activeBakes.length === 0);

  // Fallback featured cards for active bakes of hidden variants, trashed recipes, or deleted recipes.
  const queryMatchingFallbacks = running
    .filter((bake) => {
      const id = bake.snapshot?.revisions.formula.id;
      return id === undefined || !visibleCardIds.has(id);
    })
    .map((bake) => {
      const recipe = allRecipes.find((r) => r.id === bake.snapshot?.revisions.formula.id);
      return { bake, recipe, title: recipe?.name ?? t('recipe.deleted') };
    })
    .filter((entry) => matchesTokens(queryTokens, [entry.title]));

  const queryMatchingDrafts = drafts.filter((draft) => matchesTokens(queryTokens, [draft.name]));

  const inProgressCount = activeCards.length + queryMatchingFallbacks.length;
  const readyCount = inactiveCards.length;
  const draftsCount = queryMatchingDrafts.length;
  const allCount = inProgressCount + readyCount + draftsCount;

  const filteredFallbacks =
    statusFilter === 'all' || statusFilter === 'active' ? queryMatchingFallbacks : [];
  const matchingDrafts =
    statusFilter === 'all' || statusFilter === 'drafts' ? queryMatchingDrafts : [];
  const filteredCards =
    statusFilter === 'all'
      ? [...activeCards, ...inactiveCards]
      : statusFilter === 'active'
        ? activeCards
        : statusFilter === 'ready'
          ? inactiveCards
          : [];

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    searchInputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const hasLibraryContent = (cards?.length ?? 0) > 0 || running.length > 0 || drafts.length > 0;
  const hasVisibleResults =
    filteredCards.length > 0 || filteredFallbacks.length > 0 || matchingDrafts.length > 0;

  const filterOptions: readonly { readonly id: StatusFilter; readonly label: string }[] = [
    { id: 'all', label: t('recipes.filter.all', { count: allCount }) },
    { id: 'active', label: t('recipes.filter.active', { count: inProgressCount }) },
    { id: 'ready', label: t('recipes.filter.ready', { count: readyCount }) },
    { id: 'drafts', label: t('recipes.filter.drafts', { count: draftsCount }) },
  ];

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
          {hasLibraryContent && (
            <>
              <form role="search" onSubmit={handleSearchSubmit} className="flex flex-col gap-1.5">
                <label
                  htmlFor={searchInputId}
                  className="px-1 text-supporting font-semibold text-muted"
                >
                  {t('recipes.search.label')}
                </label>
                <div className="flex min-h-touch items-center gap-1.5 rounded-card border border-field bg-field-bg pr-1 pl-3 has-[>input:focus]:border-accent has-[>input:focus-visible]:fp-focus-ring">
                  <SearchIcon />
                  <input
                    ref={searchInputRef}
                    id={searchInputId}
                    name="q"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t('recipes.search.placeholder')}
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="fp-control-reset min-h-touch min-w-0 flex-1 text-left text-body text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      aria-label={t('recipes.search.clear')}
                      className="fp-control-reset fp-focus inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-pill text-muted hover:text-ink"
                    >
                      <ClearIcon />
                    </button>
                  )}
                </div>
              </form>
              <div
                role="group"
                aria-label={t('recipes.filter.label')}
                className="flex flex-wrap gap-2"
              >
                {filterOptions.map((option) => {
                  const pressed = statusFilter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() =>
                        setStatusFilter(option.id !== 'all' && pressed ? 'all' : option.id)
                      }
                      className={`fp-control-reset fp-focus inline-flex min-h-touch max-w-full items-center rounded-pill border px-3 py-1.5 text-left text-supporting font-semibold break-words ${
                        pressed
                          ? 'border-accent bg-accent text-on-accent'
                          : 'border-line bg-surface text-ink'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {running.length > 1 && (
            <IonButton expand="block" fill="outline" routerLink="/bakes">
              {t('recipes.allBakes', { count: running.length })}
            </IonButton>
          )}
          {filteredFallbacks.map(({ bake, recipe }) => (
            <FallbackRunningCard key={bake.bakeId} bake={bake} recipe={recipe} now={now} />
          ))}
          {matchingDrafts.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="m-0 px-1 text-sm font-bold tracking-wider text-muted uppercase">
                {t('recipes.drafts')}
              </h2>
              {matchingDrafts.map((draft) => (
                <IonRouterLink
                  key={draft.id}
                  routerLink={
                    editsOf(draft) !== undefined
                      ? `/recipes/${editsOf(draft)}`
                      : `/drafts/${draft.id}`
                  }
                  className="block rounded-card text-ink no-underline focus-visible:fp-focus-ring"
                >
                  <div className="flex items-baseline justify-between gap-2 rounded-2xl border border-dashed border-line bg-surface px-4 py-3">
                    <span className="min-w-0 font-semibold break-words">{draft.name}</span>
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
          {cards?.length === 0 && !hasQuery && statusFilter === 'all' && (
            <p className="text-muted">{t('recipes.empty')}</p>
          )}
          {cards !== undefined && hasLibraryContent && !hasVisibleResults && (
            <div className="m3-card-quiet items-start gap-2">
              <p className="m-0 font-semibold text-ink">{t('recipes.search.empty')}</p>
              {hasQuery && (
                <p className="m-0 text-supporting text-muted break-words">
                  {t('recipes.search.emptyHint', { query: searchQuery.trim() })}
                </p>
              )}
              {statusFilter !== 'all' && (
                <p className="m-0 text-supporting text-muted">{t('recipes.search.emptyFilter')}</p>
              )}
              {(hasQuery || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    searchInputRef.current?.focus();
                  }}
                  className="fp-control-reset fp-focus inline-flex min-h-touch items-center rounded-pill border border-line bg-surface px-4 py-2 text-supporting font-semibold text-accent-text"
                >
                  {t('recipes.search.reset')}
                </button>
              )}
            </div>
          )}
          {filteredCards.map((item) => (
            <LibraryCard key={item.recipe.id} item={item} now={now} />
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

const SearchIcon = () => (
  <svg
    className="size-5 shrink-0 text-muted"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const ClearIcon = () => (
  <svg
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
