import {
  IonContent,
  IonButton,
  IonPage,
  IonRouterLink,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import { blankRecipe, nextDraftName, type Draft } from '@flourprint/core/application';
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
import { AppBar, AppBarButton, MoreIcon, PlusIcon, TimerIcon } from '../ui/AppBar';
import { useMessages } from '../i18n/use-messages';
import { formatDuration, formatRelative } from '../i18n/time';
import { bakeView } from '../services/bake-view';
import { recipeDuration } from '../services/recipe-duration';
import { activeBakes } from '../services/bakes';
import { useServices } from '../services/services';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';

interface Card {
  readonly recipe: Recipe;
  readonly revision?: Revision;
  readonly lastBaked?: Instant;
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
  const [cards, setCards] = useState<readonly Card[]>();
  const [running, setRunning] = useState<readonly BakeState[]>([]);
  // Every recipe, family variants included: a running bake may use a variant not shown as a card.
  const [allRecipes, setAllRecipes] = useState<readonly Recipe[]>([]);
  const [now, setNow] = useState(services.clock.now());
  const [readFailed, setReadFailed] = useState(false);
  // Running bakes this version cannot read: said, never hidden.
  const [unreadable, setUnreadable] = useState(0);

  const load = async () => {
    setNow(services.clock.now());
    const summaries = await services.bakes.listBakes();
    const all = await services.recipes.listRecipes();
    const families = await services.recipes.listFamilies();
    setAllRecipes(all);
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
          const lastBaked = summaries
            .filter((s) => s.recipeId === recipe.id && s.status === 'finished' && s.endedAt)
            .map((s) => s.endedAt as Instant)
            .sort()
            .at(-1);
          return {
            recipe,
            ...(revision.ok && revision.value ? { revision: revision.value } : {}),
            ...(lastBaked ? { lastBaked } : {}),
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

  /** A new draft named "<base> <n>", stored at once, then opened (drafts.md). */
  const create = async (
    base: string,
    start: { formula: Formula; process: Process },
    origin: Draft['origin'],
  ) => {
    setCreating(true);
    try {
      const taken = [
        ...(await services.recipes.listRecipes()).map((r) => r.name),
        ...(await services.recipes.listDrafts()).map((d) => d.name),
      ];
      const now = services.clock.now();
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
      setChoosing(false);
      router.push(`/drafts/${draft.id}`);
    } catch (error) {
      console.error(error);
      setReadFailed(true);
    } finally {
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
        <AppBarButton label={t('advanced.title')} routerLink="/advanced">
          <MoreIcon />
        </AppBarButton>
      </AppBar>
      <IonContent>
        <div className="flex flex-col gap-3 px-4 pt-2 pb-8">
          <h1 className="m-0 px-1 text-[26px] font-bold">{t('recipes.title')}</h1>
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
                    draft.origin.kind === 'revision'
                      ? `/recipes/${draft.origin.recipeId}`
                      : `/drafts/${draft.id}`
                  }
                  className="text-ink"
                >
                  <div className="flex items-baseline justify-between gap-2 rounded-2xl border border-dashed border-line bg-surface px-4 py-3">
                    <span className="font-semibold">{draft.name}</span>
                    <span className="shrink-0 text-[13px] text-muted">
                      {draft.origin.kind === 'revision'
                        ? t('recipes.draftEdits')
                        : formatRelative(draft.updatedAt, now, locale)}
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
    <IonRouterLink routerLink={`/bakes/${bake.bakeId}`}>
      <div className="flex items-center gap-3.5 rounded-2xl bg-accent px-4 py-3.5 text-on-accent">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold opacity-85">
            {t('recipes.activeBake', { recipe: recipe?.name ?? '' })}
          </div>
          <div className="text-[19px] font-bold">{detail}</div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </IonRouterLink>
  );
};

const RecipeCard = ({ card, now }: { card: Card; now: Instant }) => {
  const { t, grams, pct, componentName, locale } = useMessages();
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
    .map((c) => `${componentName(revision.formula, c)} ${pct(c.flourPct)}`)
    .join(' · ');
  return (
    <IonRouterLink routerLink={`/recipes/${recipe.id}`} className="text-ink">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-semibold">{recipe.name}</span>
          <span className="shrink-0 text-[13px] text-muted">
            {card.variants === undefined
              ? `v${recipe.headVersion}`
              : t('family.variants', { count: card.variants })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Figure
            label={t('recipes.card.dough')}
            value={resolved?.ok ? grams(resolved.value.doughWeight) : '—'}
          />
          <Figure
            label={t('recipes.card.hydration')}
            value={resolved?.ok ? pct(resolved.value.pureWaterPct) : '—'}
          />
          <Figure label={t('recipes.card.duration')} value={duration ?? '—'} />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <span>{parts}</span>
          <span>
            {card.lastBaked
              ? t('recipes.card.lastBaked', { when: formatRelative(card.lastBaked, now, locale) })
              : t('recipes.card.neverBaked')}
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
