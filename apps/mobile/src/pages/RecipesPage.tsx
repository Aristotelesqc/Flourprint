import { IonContent, IonButton, IonPage, IonRouterLink, useIonViewWillEnter } from '@ionic/react';
import { useState } from 'react';
import {
  defaultVariant,
  resolveFormula,
  type BakeState,
  type Instant,
  type Recipe,
  type Revision,
} from '@flourprint/core/domain';
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
  const { t } = useMessages();
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

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col gap-3 px-4 pt-[calc(var(--ion-safe-area-top,0px)+20px)] pb-8">
          <div className="flex items-center justify-between">
            <h1 className="m-0 px-1 pb-1 text-[32px] font-bold">{t('recipes.title')}</h1>
            <IonButton
              fill="clear"
              color="medium"
              routerLink="/advanced"
              aria-label={t('advanced.title')}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
              </svg>
            </IonButton>
          </div>
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
          {cards?.length === 0 && <p className="text-muted">{t('recipes.empty')}</p>}
          {cards?.map((card) => (
            <RecipeCard key={card.recipe.id} card={card} now={now} />
          ))}
        </div>
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
