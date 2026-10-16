import { useEffect, useState, type ReactNode } from 'react';
import { RECIPE_TEMPLATES } from '@flourprint/core/application';
import { INGREDIENT_PRESETS, resolveFormula } from '@flourprint/core/domain';
import {
  Button,
  Icon,
  IconButton,
  Surface,
  Badge,
  Tabs,
  Modal,
  Menu,
  NumberField,
  Checkbox,
  Disclosure,
  type IconName,
} from './ui';
import {
  RecipeCard,
  RecipeSummary,
  IngredientRow,
  StepRow,
  StatusPanel,
  PreparationTimer,
} from './components';
import { RecipeIngredients, WaterDetails } from './RecipeView';
import { ProcessView, processDuration } from './ProcessView';
import { PreparationView } from './PreparationView';
import { usePrototype, recipeName, type Route, type Screen, type Section } from './model';
import { t, duration, grams, ingredientName, type Locale, type MessageKey } from './messages';

declare const __MOCKUP_REVISION__: string;
declare const __MOCKUP_SOURCE_HASH__: string;
const nav: Screen[] = ['library', 'preparation', 'registry', 'settings'];
const icons: Record<string, IconName> = {
  library: 'book',
  preparation: 'clock',
  registry: 'flour',
  settings: 'settings',
};
const sections: Section[] = ['ingredients', 'steps', 'planning', 'history'];
function readRoute(): Route {
  const p = new URLSearchParams(location.search);
  const screen = p.get('screen');
  return {
    screen: ['recipe', 'preparation', 'registry', 'settings', 'catalogue'].includes(screen ?? '')
      ? (screen as Screen)
      : 'library',
    recipeId: p.get('recipe') ?? undefined,
    section: sections.includes(p.get('section') as Section)
      ? (p.get('section') as Section)
      : 'ingredients',
  };
}
export default function App() {
  const params = new URLSearchParams(location.search);
  const [locale, setLocale] = useState<Locale>(params.get('lang') === 'en' ? 'en' : 'fr');
  const [theme, setTheme] = useState(params.get('theme') ?? 'light');
  const [variant, setVariant] = useState(params.get('nav') === 'B' ? 'B' : 'A');
  const [width, setWidth] = useState(params.get('width') ?? '393');
  const [scale, setScale] = useState(params.get('scale') ?? '100');
  const [targets, setTargets] = useState(params.get('targets') ?? '48');
  const [route, setRoute] = useState<Route>(readRoute);
  const [overlay, setOverlay] = useState<
    'menu' | 'nav' | 'help' | 'create' | 'trash' | 'build' | null
  >(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [copy, setCopy] = useState('');
  const [keepChecks, setKeepChecks] = useState(true);
  const store = usePrototype(locale);
  const { state, recipe, content } = store;
  const section = route.section ?? 'ingredients';
  const name = content.name ?? recipeName(recipe, locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.targetSize = targets;
    document.documentElement.style.fontSize = `${(Number(scale) / 100) * 16}px`;
    document.documentElement.style.setProperty('--phone-width', `${width}px`);
    document.body.dataset.capture = params.get('capture') === '1' ? 'true' : 'false';
  }, [locale, theme, targets, scale, width, params]);
  const writeURL = (next: Route, push: boolean) => {
    const url = new URL(location.href);
    url.searchParams.set('screen', next.screen);
    url.searchParams.set('section', next.section ?? 'ingredients');
    url.searchParams.set('recipe', next.recipeId ?? state.selected);
    url.searchParams.set('lang', locale);
    url.searchParams.set('theme', theme);
    url.searchParams.set('nav', variant);
    url.searchParams.set('width', width);
    url.searchParams.set('scale', scale);
    url.searchParams.delete('mode');
    history[push ? 'pushState' : 'replaceState']({}, '', url);
  };
  const navigate = (next: Route) => {
    setRoute(next);
    setOverlay(null);
    writeURL(next, true);
  };
  const guard = (action: () => void) => {
    if (state.draft) setPending(() => action);
    else action();
  };
  useEffect(() => {
    const onPop = () => {
      const target = readRoute();
      if (state.draft) {
        writeURL(route, true);
        setPending(() => () => {
          store.cancel();
          if (target.recipeId) store.select(target.recipeId);
          navigate(target);
        });
      } else {
        if (target.recipeId) store.select(target.recipeId);
        setRoute(target);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });
  useEffect(() => {
    writeURL(route, false);
  }, [locale, theme, variant, width, scale]);
  const openRecipe = (id: string) =>
    guard(() => {
      if (!keepChecks) store.setState((s) => ({ ...s, checks: {} }));
      store.select(id);
      setRoute({ screen: 'recipe', section: 'ingredients' });
      const url = new URL(location.href);
      url.searchParams.set('screen', 'recipe');
      url.searchParams.set('recipe', id);
      url.searchParams.set('section', 'ingredients');
      history.pushState({}, '', url);
    });
  const total = processDuration(content);
  const title =
    route.screen === 'recipe'
      ? name
      : route.screen === 'catalogue'
        ? t(locale, 'catalogue')
        : t(locale, route.screen as MessageKey);
  const primary =
    route.screen === 'library' ? (
      <Button variant="primary" icon="plus" onClick={() => setOverlay('create')}>
        {t(locale, 'new')}
      </Button>
    ) : route.screen === 'recipe' ? (
      state.draft ? (
        <Button
          variant="primary"
          dataTestId="save-recipe"
          disabled={Object.values(state.invalid).some(Boolean)}
          onClick={store.save}
        >
          {t(locale, 'save')}
        </Button>
      ) : (
        <Button
          variant="primary"
          icon="play"
          onClick={() => {
            if (store.start()) navigate({ screen: 'preparation' });
          }}
        >
          {t(locale, 'start')}
        </Button>
      )
    ) : null;
  const navigateGlobal = (screen: Screen) => guard(() => navigate({ screen }));
  const allRecipes = state.recipes.filter(
    (r) =>
      !r.trashed &&
      recipeName(r, locale).toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (filter === 'all' ||
        (filter === 'running' && r.id === state.session?.recipeId) ||
        (filter === 'drafts' && r.version === 0)),
  );
  return (
    <>
      <div className="studio-bar">
        <strong>{t(locale, 'versionTitle')}</strong>
        <a href="index.html">{t(locale, 'showGallery')}</a>
        <label>
          {t(locale, 'navigationChoice')}
          <select
            aria-label={t(locale, 'navigationChoice')}
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          >
            <option>A</option>
            <option>B</option>
          </select>
        </label>
        <label>
          {t(locale, 'appearance')}
          <select
            aria-label={t(locale, 'appearance')}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            {['light', 'dark', 'amoled'].map((value) => (
              <option key={value} value={value}>
                {t(locale, value as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          FR / EN
          <select
            aria-label="FR / EN"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </label>
        <label>
          px
          <select aria-label="Viewport" value={width} onChange={(e) => setWidth(e.target.value)}>
            {['320', '360', '393'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          %
          <select aria-label="Text scale" value={scale} onChange={(e) => setScale(e.target.value)}>
            {['100', '130', '200'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {t(locale, 'targetChoice')}
          <select
            aria-label={t(locale, 'targetChoice')}
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
          >
            <option>40</option>
            <option>48</option>
          </select>
        </label>
        <Button onClick={() => guard(() => navigate({ screen: 'catalogue' }))}>
          {t(locale, 'catalogue')}
        </Button>
      </div>
      <p className="studio-note">
        {t(locale, 'demoOnly')} · {__MOCKUP_REVISION__.slice(0, 7)} ·{' '}
        {__MOCKUP_SOURCE_HASH__.slice(0, 10)}
      </p>
      <div className="phone-stage">
        <div className="phone-frame" data-testid="phone">
          <header className="phone-header">
            <div className="header-title">
              <IconButton
                icon={route.screen === 'recipe' ? 'back' : 'menu'}
                label={t(locale, route.screen === 'recipe' ? 'back' : 'navigation')}
                onClick={() =>
                  route.screen === 'recipe'
                    ? guard(() => navigate({ screen: 'library' }))
                    : setOverlay('nav')
                }
              />
              <div>
                <h1>{title}</h1>
                <small>
                  {route.screen === 'recipe'
                    ? `${t(locale, 'version')} ${recipe.version} · ${duration(locale, total)}`
                    : 'Flourprint · 0.3'}
                </small>
              </div>
            </div>
            <div className="header-actions">
              {state.session && route.screen !== 'preparation' && (
                <IconButton
                  icon="clock"
                  label={t(locale, 'resume')}
                  onClick={() => guard(() => navigate({ screen: 'preparation' }))}
                />
              )}
              <IconButton
                icon="more"
                label={t(locale, route.screen === 'recipe' ? 'recipeActions' : 'copyBuild')}
                onClick={() => setOverlay(route.screen === 'recipe' ? 'menu' : 'build')}
              />
            </div>
          </header>
          {route.screen === 'recipe' && (
            <>
              <div className="draft-status" aria-live="polite">
                {state.draft ? t(locale, 'unsaved') : t(locale, 'currentRecipe')}
              </div>
              <Tabs
                label={t(locale, 'navigation')}
                tabs={sections.map((id) => ({
                  id,
                  label: t(locale, id === 'steps' ? 'stepsTab' : id),
                }))}
                activeId={section}
                onChange={(id) => {
                  setRoute({ ...route, section: id as Section });
                  writeURL({ ...route, section: id as Section }, false);
                }}
              />
            </>
          )}
          <main className="phone-content" key={route.screen}>
            {state.error && (
              <p className="error-banner" role="alert">
                {state.error}
              </p>
            )}
            {route.screen === 'library' && (
              <>
                <label className="field-label">
                  {t(locale, 'search')}
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t(locale, 'search')}
                  />
                </label>
                <Tabs
                  label={t(locale, 'filter')}
                  tabs={['all', 'running', 'drafts'].map((id) => ({
                    id,
                    label: t(locale, id as MessageKey),
                  }))}
                  activeId={filter}
                  onChange={setFilter}
                />
                {state.session && (
                  <Surface>
                    <div className="detail-row">
                      <strong>{t(locale, 'active')}</strong>
                      <Badge>
                        {duration(
                          locale,
                          Math.max(
                            0,
                            (state.session.effective.steps.find(
                              (s) => s.id === state.session?.activeId,
                            )?.plannedDurationS ?? 0) -
                              (Date.now() -
                                Date.parse(
                                  state.session.facts[state.session.activeId]?.startedAt ??
                                    state.session.startedAt,
                                )) /
                                1000,
                          ),
                        )}
                      </Badge>
                    </div>
                    <p>{state.session.recipeName}</p>
                    <Button icon="play" onClick={() => navigate({ screen: 'preparation' })}>
                      {t(locale, 'resume')}
                    </Button>
                  </Surface>
                )}
                {allRecipes.map((r) => {
                  const resolved = resolveFormula(r.formula);
                  return (
                    <RecipeCard
                      key={r.id}
                      title={recipeName(r, locale)}
                      details={[
                        `${t(locale, 'version')} ${r.version}`,
                        `${t(locale, 'totalDuration')} · ${duration(locale, processDuration(r))}`,
                        ...(resolved.ok ? [grams(locale, resolved.value.doughWeight)] : []),
                      ]}
                      status={t(locale, r.version === 0 ? 'draft' : 'neverCooked')}
                      onOpen={() => openRecipe(r.id)}
                    />
                  );
                })}
                {!allRecipes.length && <p>{t(locale, 'empty')}</p>}
              </>
            )}
            {route.screen === 'recipe' && (
              <>
                {state.draft && (
                  <>
                    <label className="field-label">
                      {t(locale, 'name')}
                      <input
                        data-testid="recipe-name"
                        value={name}
                        onChange={(e) => store.push({ ...content, name: e.target.value })}
                      />
                    </label>
                    <div className="actions">
                      <IconButton
                        icon="undo"
                        label={t(locale, 'undo')}
                        disabled={
                          state.draft.index === 0 || Object.values(state.invalid).some(Boolean)
                        }
                        onClick={store.undo}
                      />
                      <IconButton
                        icon="redo"
                        label={t(locale, 'redo')}
                        disabled={
                          state.draft.index === state.draft.history.length - 1 ||
                          Object.values(state.invalid).some(Boolean)
                        }
                        onClick={store.redo}
                      />
                      <Button variant="quiet" onClick={store.reset}>
                        {t(locale, 'reset')}
                      </Button>
                    </div>
                  </>
                )}
                <div hidden={section !== 'ingredients'}>
                  <RecipeIngredients
                    store={store}
                    locale={locale}
                    onHelp={() => setOverlay('help')}
                  />
                </div>
                <div hidden={section !== 'steps'}>
                  <ProcessView store={store} locale={locale} />
                </div>
                <div hidden={section !== 'planning'}>
                  <ProcessView store={store} locale={locale} planning />
                </div>
                <div hidden={section !== 'history'}>
                  {recipe.revisions.length ? (
                    recipe.revisions.map((r, index) => (
                      <Surface key={index}>
                        <h2>
                          {t(locale, 'version')} {recipe.version - index - 1}
                        </h2>
                        <p>{r.name ?? recipeName(recipe, locale)}</p>
                        <pre>{JSON.stringify(r.formula.anchor, null, 2)}</pre>
                      </Surface>
                    ))
                  ) : (
                    <p>{t(locale, 'historyEmpty')}</p>
                  )}
                </div>
              </>
            )}
            {route.screen === 'preparation' && <PreparationView store={store} locale={locale} />}
            {route.screen === 'registry' && (
              <>
                <h2>{t(locale, 'compose')}</h2>
                <p className="muted">
                  {t(locale, 'preview')} · {t(locale, 'source')}
                </p>
                {INGREDIENT_PRESETS.map((p) => (
                  <Disclosure key={p.id} title={ingredientName(locale, p.id)}>
                    <p>
                      {t(locale, 'waterContent')} :{' '}
                      {p.ingredient.kind === 'water'
                        ? '100 %'
                        : p.ingredient.water && p.ingredient.water.status !== 'unknown'
                          ? `${p.ingredient.water.valuePct} % · ${t(locale, p.ingredient.water.status === 'known' ? 'known' : 'estimated')}`
                          : t(locale, 'unknown')}
                    </p>
                  </Disclosure>
                ))}
              </>
            )}
            {route.screen === 'settings' && (
              <>
                <h2>{t(locale, 'appearance')}</h2>
                {['light', 'dark', 'amoled'].map((value) => (
                  <Button
                    key={value}
                    variant={theme === value ? 'primary' : 'secondary'}
                    onClick={() => setTheme(value)}
                  >
                    {t(locale, value as MessageKey)}
                  </Button>
                ))}
                <Disclosure title={t(locale, 'checksChoice')} defaultOpen>
                  <Checkbox
                    checked={keepChecks}
                    onChange={setKeepChecks}
                    label={t(locale, 'keepChecks')}
                  />
                  <Button onClick={() => store.setState((s) => ({ ...s, checks: {} }))}>
                    {t(locale, 'clearChecks')}
                  </Button>
                </Disclosure>
                <Button onClick={() => location.reload()}>{t(locale, 'resetDemo')}</Button>
              </>
            )}
            {route.screen === 'catalogue' && <ComponentCatalogue locale={locale} />}
          </main>
          {primary && (
            <footer className="phone-footer">
              <div className="phone-thumb-bar">
                {state.draft && route.screen === 'recipe' && (
                  <Button onClick={() => setPending(() => store.cancel)}>
                    {t(locale, 'discard')}
                  </Button>
                )}
                {primary}
              </div>
            </footer>
          )}
          {variant === 'B' && (
            <nav className="phone-bottom-nav" aria-label={t(locale, 'navigation')}>
              {nav.map((screen) => (
                <button
                  type="button"
                  key={screen}
                  className={`nav-item ${route.screen === screen ? 'active' : ''}`}
                  onClick={() => navigateGlobal(screen)}
                  aria-current={route.screen === screen ? 'page' : undefined}
                >
                  <Icon name={icons[screen]} />
                  <span>{t(locale, screen as MessageKey)}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
      <Menu
        open={overlay === 'menu'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'recipeActions')}
        closeLabel={t(locale, 'close')}
      >
        <div className="stack">
          <Button
            icon="edit"
            disabled={Boolean(state.draft)}
            onClick={() => {
              store.edit();
              setOverlay(null);
            }}
          >
            {t(locale, 'edit')}
          </Button>
          <Button icon="trash" variant="danger" onClick={() => setOverlay('trash')}>
            {t(locale, 'trash')}
          </Button>
          <Button icon="info" onClick={() => setOverlay('build')}>
            {t(locale, 'copyBuild')}
          </Button>
        </div>
      </Menu>
      <Menu
        open={overlay === 'nav'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'navigation')}
        closeLabel={t(locale, 'close')}
      >
        <div className="stack">
          {nav.map((screen) => (
            <Button key={screen} icon={icons[screen]} onClick={() => navigateGlobal(screen)}>
              {t(locale, screen as MessageKey)}
            </Button>
          ))}
          <Button onClick={() => navigateGlobal('catalogue')}>{t(locale, 'catalogue')}</Button>
        </div>
      </Menu>
      <Modal
        open={overlay === 'help'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'hydrationDetails')}
        closeLabel={t(locale, 'close')}
      >
        {store.resolved.ok && (
          <WaterDetails content={content} resolved={store.resolved.value} locale={locale} />
        )}
        <p>{t(locale, 'helpSize')}</p>
      </Modal>
      <Modal
        open={overlay === 'create'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'new')}
        closeLabel={t(locale, 'close')}
      >
        <div className="stack">
          {[
            { id: '', label: t(locale, 'blank') },
            ...RECIPE_TEMPLATES.map((template) => ({
              id: template.id,
              label: recipeName({ templateId: template.id } as typeof recipe, locale),
            })),
          ].map((template) => (
            <Button
              key={template.id}
              onClick={() => {
                const id = store.create(template.id);
                const url = new URL(location.href);
                url.searchParams.set('screen', 'recipe');
                url.searchParams.set('recipe', id);
                url.searchParams.set('section', 'ingredients');
                history.pushState({}, '', url);
                setOverlay(null);
                setRoute({ screen: 'recipe', section: 'ingredients' });
              }}
            >
              {template.label}
            </Button>
          ))}
        </div>
      </Modal>
      <Modal
        open={overlay === 'trash'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'confirmRemove')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              store.setState((s) => ({
                ...s,
                draft: null,
                recipes: s.recipes.map((r) => (r.id === s.selected ? { ...r, trashed: true } : r)),
              }));
              navigate({ screen: 'library' });
            }}
          >
            {t(locale, 'trash')}
          </Button>
        }
      >
        <p>{name}</p>
      </Modal>
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t(locale, 'leaveDraft')}
        closeLabel={t(locale, 'stay')}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              store.cancel();
              const action = pending;
              setPending(null);
              action?.();
            }}
          >
            {t(locale, 'discard')}
          </Button>
        }
      >
        <p>{t(locale, 'unsaved')}</p>
        <Button onClick={() => setPending(null)}>{t(locale, 'stay')}</Button>
      </Modal>
      <Modal
        open={overlay === 'build'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'versionTitle')}
        closeLabel={t(locale, 'close')}
      >
        <div className="stack">
          <code className="build-id">
            {__MOCKUP_REVISION__}
            <br />
            {__MOCKUP_SOURCE_HASH__}
          </code>
          <Button
            onClick={() => {
              navigator.clipboard
                ?.writeText(`${__MOCKUP_REVISION__}\n${__MOCKUP_SOURCE_HASH__}`)
                .then(() => setCopy(t(locale, 'copied')))
                .catch(() => setCopy(t(locale, 'copyFallback')));
              if (!navigator.clipboard) setCopy(t(locale, 'copyFallback'));
            }}
          >
            {t(locale, 'copyBuild')}
          </Button>
          <p role="status">{copy}</p>
        </div>
      </Modal>
    </>
  );
}
function ComponentCatalogue({ locale }: { locale: Locale }) {
  const [checked, setChecked] = useState(false),
    [value, setValue] = useState(25),
    [tab, setTab] = useState('a'),
    [modal, setModal] = useState(false);
  const items: { name: string; example: ReactNode }[] = [
    {
      name: 'Button / IconButton',
      example: (
        <div className="actions">
          <Button variant="primary" onClick={() => setModal(true)}>
            {t(locale, 'edit')}
          </Button>
          <IconButton icon="info" label={t(locale, 'help')} onClick={() => setModal(true)} />
        </div>
      ),
    },
    {
      name: 'NumberField',
      example: (
        <NumberField
          value={value}
          label={t(locale, 'editable')}
          unit="g"
          locale={locale}
          errorMessage={t(locale, 'invalid')}
          onCommit={(v) => {
            if (v < 0) return false;
            setValue(v);
            return true;
          }}
        />
      ),
    },
    {
      name: 'Checkbox',
      example: <Checkbox checked={checked} onChange={setChecked} label={t(locale, 'weighed')} />,
    },
    {
      name: 'Tabs',
      example: (
        <Tabs
          label={t(locale, 'navigation')}
          tabs={[
            { id: 'a', label: t(locale, 'ingredients') },
            { id: 'b', label: t(locale, 'steps') },
          ]}
          activeId={tab}
          onChange={setTab}
        />
      ),
    },
    {
      name: 'Disclosure / Surface / Badge',
      example: (
        <Disclosure title={t(locale, 'totals')} badge={t(locale, 'preview')}>
          <Surface>
            <Badge>{t(locale, 'known')}</Badge>
          </Surface>
        </Disclosure>
      ),
    },
    {
      name: 'RecipeSummary',
      example: (
        <RecipeSummary
          metrics={[
            { label: t(locale, 'flour'), value: '314 g' },
            { label: t(locale, 'dough'), value: '699 g' },
          ]}
          onHelp={() => setModal(true)}
          helpLabel={t(locale, 'help')}
        />
      ),
    },
    {
      name: 'IngredientRow',
      example: (
        <IngredientRow
          id="catalogue"
          name={t(locale, 'milk')}
          gramsText="156 g"
          pctText={`49,7 ${t(locale, 'bakerPct')}`}
          checked={checked}
          onToggle={() => setChecked(!checked)}
          checkLabel={t(locale, 'weighed')}
        />
      ),
    },
    {
      name: 'StepRow',
      example: (
        <StepRow
          number={1}
          title={t(locale, 'steps')}
          details={['15 min']}
          onEdit={() => setModal(true)}
          editLabel={t(locale, 'editStep')}
        />
      ),
    },
    {
      name: 'RecipeCard',
      example: (
        <RecipeCard
          title={t(locale, 'shokupan')}
          details={['699 g']}
          status={t(locale, 'neverCooked')}
          onOpen={() => setModal(true)}
        />
      ),
    },
    {
      name: 'StatusPanel',
      example: (
        <StatusPanel
          title={t(locale, 'diagnostics')}
          status="warning"
          message={t(locale, 'outOfDomain')}
        />
      ),
    },
    {
      name: 'PreparationTimer',
      example: (
        <PreparationTimer
          title={t(locale, 'remaining')}
          remaining="1 h 05"
          start="08:00"
          end="09:15"
          progress={0.15}
          labels={{
            start: t(locale, 'started'),
            end: t(locale, 'finish'),
            progress: t(locale, 'progress'),
          }}
        />
      ),
    },
    {
      name: 'Modal / Menu',
      example: <Button onClick={() => setModal(true)}>{t(locale, 'preview')}</Button>,
    },
  ];
  return (
    <>
      <p>{t(locale, 'catalogueIntro')}</p>
      {items.map((item) => (
        <section key={item.name} className="catalogue-case">
          <h2>{item.name}</h2>
          {item.example}
        </section>
      ))}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={t(locale, 'preview')}
        closeLabel={t(locale, 'close')}
      >
        <p>{t(locale, 'catalogueIntro')}</p>
      </Modal>
    </>
  );
}
