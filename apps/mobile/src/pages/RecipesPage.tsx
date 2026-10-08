import {
  IonContent,
  IonItem,
  IonLabel,
  IonPage,
  IonRouterLink,
  useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import {
  projectProcess,
  resolveFormula,
  type BakeState,
  type Instant,
  type Recipe,
  type Revision,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { formatDuration, formatRelative } from '../i18n/time';
import { bakeView } from '../services/bake-view';
import { activeBakes } from '../services/bakes';
import { useServices } from '../services/services';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';

interface Card {
  readonly recipe: Recipe;
  readonly revision?: Revision;
  readonly lastBaked?: Instant;
}

/** Recipe list of the #8 mockups: running bakes first, then one card per recipe. */
export const RecipesPage = () => {
  const services = useServices();
  const { t } = useMessages();
  const [cards, setCards] = useState<readonly Card[]>();
  const [running, setRunning] = useState<readonly BakeState[]>([]);
  const [now, setNow] = useState(services.clock.now());
  const [readFailed, setReadFailed] = useState(false);

  const load = async () => {
    setNow(services.clock.now());
    const summaries = await services.bakes.listBakes();
    const recipes = await services.recipes.listRecipes();
    setCards(
      await Promise.all(
        recipes.map(async (recipe) => {
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
          };
        }),
      ),
    );
    setRunning((await activeBakes(services)).flatMap((r) => (r.ok ? [r.value] : [])));
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
          <h1 className="m-0 px-1 pb-1 text-[32px] font-bold">{t('recipes.title')}</h1>
          <SessionOnlyNotice />
          {readFailed && <p role="alert">{t('state.storageRead')}</p>}
          {running.map((bake) => (
            <RunningBake key={bake.bakeId} bake={bake} now={now} cards={cards ?? []} />
          ))}
          {cards?.length === 0 && <p className="text-muted">{t('recipes.empty')}</p>}
          {cards?.map((card) => (
            <RecipeCard key={card.recipe.id} card={card} now={now} />
          ))}
          <IonItem routerLink="/device-checks" lines="none" detail className="mt-6">
            <IonLabel color="medium">{t('recipes.deviceChecks')}</IonLabel>
          </IonItem>
        </div>
      </IonContent>
    </IonPage>
  );
};

const RunningBake = ({
  bake,
  now,
  cards,
}: {
  bake: BakeState;
  now: Instant;
  cards: readonly Card[];
}) => {
  const { t, stepName } = useMessages();
  const recipe = cards.find((c) => c.recipe.id === bake.snapshot?.revisions.formula.id)?.recipe;
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
  const { t, grams, pct, name, locale } = useMessages();
  const { recipe, revision } = card;
  const resolved = revision ? resolveFormula(revision.formula) : undefined;
  const projection = revision
    ? projectProcess(revision.process, { mode: { kind: 'startAt', at: now } })
    : undefined;
  let duration: string | undefined;
  if (projection?.ok) {
    const ends = Object.values(projection.value.steps).flatMap((s) =>
      s.end ? [Date.parse(s.end)] : [],
    );
    if (ends.length > 0) duration = formatDuration((Math.max(...ends) - Date.parse(now)) / 1000);
  }
  const parts = revision?.formula.components
    .map((c) => `${name(c.id)} ${pct(c.flourPct)}`)
    .join(' · ');
  return (
    <IonRouterLink routerLink={`/recipes/${recipe.id}`} className="text-ink">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-semibold">{recipe.name}</span>
          <span className="text-[13px] text-muted">v{recipe.headVersion}</span>
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
