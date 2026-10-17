import { Catalogue } from '../../../../packages/ui/src/catalogue/Catalogue';

import { catalogue } from '../../../../packages/ui/src/catalogue/registry';

import { manifest } from './ui.manifest';

import { useEffect, useState } from 'react';

import { RECIPE_TEMPLATES } from '@flourprint/core/application';

import { INGREDIENT_PRESETS, resolveFormula } from '@flourprint/core/domain';

import {
  Button,
  BottomBar,
  IconButton,
  Surface,
  Tabs,
  Modal,
  Menu,
  Checkbox,
  Disclosure,
  type IconName,
} from './ui';

import { RecipeCard } from './components';

import { RecipeIngredients, WaterDetails } from './RecipeView';

import { ProcessView, processDuration } from './ProcessView';

import { PreparationView } from './PreparationView';

import { usePrototype, recipeName, type Route, type Screen, type Section } from './model';

import { t, duration, grams, num, ingredientName, type Locale, type MessageKey } from './messages';

declare const __MOCKUP_REVISION__: string;

declare const __MOCKUP_SOURCE_HASH__: string;

declare const __MOCKUP_BUILD_LABEL__: string | undefined;

declare const __MOCKUP_BUILD__: string | undefined;

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

  const [motion, setMotion] = useState(params.get('motion') === 'reduce' ? 'reduced' : 'standard');

  const [variant, setVariant] = useState<'A' | 'B'>(params.get('nav') === 'B' ? 'B' : 'A');

  const [width, setWidth] = useState(params.get('width') ?? '393');

  const [scale, setScale] = useState(params.get('scale') ?? '100');

  const [targets, setTargets] = useState(params.get('targets') ?? '48');

  const [route, setRoute] = useState<Route>(readRoute);

  const [overlay, setOverlay] = useState<
    'menu' | 'nav' | 'help' | 'sizeHelp' | 'create' | 'trash' | 'build' | null
  >(
    params.get('sheet') === 'hydration'
      ? 'help'
      : params.get('sheet') === 'create'
        ? 'create'
        : params.get('sheet') === 'menu'
          ? 'menu'
          : null,
  );

  const [pending, setPending] = useState<(() => void) | null>(null);

  const [query, setQuery] = useState('');

  const [filter, setFilter] = useState('all');

  const [clockNow, setClockNow] = useState(Date.now());
  const [copy, setCopy] = useState('');

  const [keepChecks, setKeepChecks] = useState(true);

  const [inspecting, setInspecting] = useState(false);
  const [inspected, setInspected] = useState<{ id: string; version: string }[]>([]);
  useEffect(() => {
    if (route.screen !== 'library') return;
    const tick = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [route.screen]);
  const [prepHost, setPrepHost] = useState<HTMLDivElement | null>(null);
  const store = usePrototype(locale);

  const { state, recipe, content } = store;
  useEffect(() => {
    if (!inspecting) return;
    const inspect = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.phone-frame')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const entries: { id: string; version: string }[] = [];
      let node = event.target.closest<HTMLElement>('[data-fp-component]');
      while (node) {
        if (node.dataset.fpContainer)
          entries.push({
            id: node.dataset.fpContainer,
            version: node.dataset.fpContainerVersion ?? '',
          });
        if (node.dataset.fpComponent)
          entries.push({ id: node.dataset.fpComponent, version: node.dataset.fpVersion ?? '' });
        node = node.parentElement?.closest<HTMLElement>('[data-fp-component]') ?? null;
      }
      setInspected(entries);
    };
    window.addEventListener('click', inspect, true);
    return () => window.removeEventListener('click', inspect, true);
  }, [inspecting]);

  const section = route.section ?? 'ingredients';

  const name = content.name ?? recipeName(recipe, locale);

  useEffect(() => {
    document.documentElement.lang = locale;

    document.documentElement.dataset.theme = theme;

    document.documentElement.dataset.targetSize = targets;

    document.documentElement.dataset.textScale = scale;

    document.documentElement.dataset.motion = motion;

    document.documentElement.style.fontSize = `${(Number(scale) / 100) * 16}px`;

    document.documentElement.style.setProperty('--phone-width', `${width}px`);

    document.body.dataset.capture = params.get('capture') === '1' ? 'true' : 'false';
  }, [locale, theme, motion, targets, scale, width, params]);

  useEffect(() => {
    const focus = new URLSearchParams(location.search).get('focus');

    if (!focus || !['ingredient-grams-milk', 'component-ratio-tangzhong'].includes(focus)) return;

    requestAnimationFrame(() => {
      for (const node of document.querySelectorAll<HTMLElement>('[data-testid]'))
        if (node.dataset.testid === focus) node.scrollIntoView({ block: 'center' });
    });
  }, []);

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

    url.searchParams.set('motion', motion === 'reduced' ? 'reduce' : 'standard');

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
  }, [locale, theme, motion, variant, width, scale]);

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

  const buildIdentity =
    (typeof __MOCKUP_BUILD_LABEL__ !== 'undefined' && __MOCKUP_BUILD_LABEL__) ||
    (typeof __MOCKUP_BUILD__ !== 'undefined' && __MOCKUP_BUILD__) ||
    `Build ${__MOCKUP_REVISION__.slice(0, 7)}`;

  const title =
    route.screen === 'recipe'
      ? name
      : route.screen === 'preparation' && state.session
        ? state.session.recipeName
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

          disabled={Object.values(state.invalid).some(Boolean) || !name.trim()}

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

  const activeSession = state.session;

  const activeDuration = activeSession?.effective.steps.find(
    (s) => s.id === activeSession.activeId,
  )?.plannedDurationS;

  const sessionRemaining =
    activeSession && activeDuration !== undefined
      ? Math.max(
          0,
          activeDuration -
            (clockNow -
              Date.parse(
                activeSession.facts[activeSession.activeId]?.startedAt ?? activeSession.startedAt,
              )) /
              1000 -
            activeSession.elapsedOffsetS,
        )
      : undefined;

  const allRecipes = state.recipes.filter(
    (r) =>
      !r.trashed &&
      recipeName(r, locale).toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (filter === 'all' ||
        (filter === 'running' && r.id === state.session?.recipeId) ||
        (filter === 'ready' && r.version > 0 && r.id !== state.session?.recipeId) ||
        (filter === 'drafts' && r.version === 0)),
  );

  if (route.screen === 'catalogue')
    return (
      <>
        <Button onClick={() => navigate({ screen: 'library' })}>{t(locale, 'back')}</Button>
        <ComponentCatalogue />
      </>
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

            onChange={(e) => setVariant(e.target.value as 'A' | 'B')}
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
          {t(locale, 'motionChoice')}

          <select
            aria-label={t(locale, 'motionChoice')}

            value={motion}

            onChange={(e) => setMotion(e.target.value)}
          >
            <option value="standard">{t(locale, 'motionStandard')}</option>

            <option value="reduced">{t(locale, 'motionReduced')}</option>
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

        <label>
          {t(locale, 'modelReferenceCase')}
          <select
            aria-label={t(locale, 'modelReferenceCase')}
            value={params.get('scenario') ?? 'recipe'}
            onChange={(e) => {
              const url = new URL(location.href);
              url.searchParams.set('scenario', e.target.value);
              url.searchParams.set('diagnostics', '1');
              url.searchParams.set('screen', 'recipe');
              url.searchParams.set('section', 'steps');
              location.assign(url.href);
            }}
          >
            {(['recipe', 'valid', 'out', 'noResult'] as const).map((id) => (
              <option key={id} value={id}>
                {t(locale, id === 'recipe' ? 'currentRecipe' : id === 'out' ? 'outOfDomain' : id)}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={() => guard(() => navigate({ screen: 'catalogue' }))}>
          {t(locale, 'catalogue')}
        </Button>
      </div>

      <aside className="component-inspector">
        <Button aria-pressed={inspecting} onClick={() => setInspecting(!inspecting)}>
          {t(locale, 'inspectUi')}
        </Button>
        {inspecting && <p>{t(locale, 'inspectionHint')}</p>}
        {inspected.map((item) => (
          <a
            key={item.id}
            target="_blank"
            rel="noreferrer"
            href={`mockup.html?screen=catalogue#${item.id}`}
          >
            {item.id} · {item.version}
          </a>
        ))}
      </aside>
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

              <div className="header-title-wrap">
                <h1 className="header-heading">
                  {route.screen === 'recipe' && state.draft ? (
                    <input
                      className="header-name-input"
                      aria-label={t(locale, 'name')}
                      data-testid="recipe-name"
                      value={name}
                      onChange={(e) => store.push({ ...content, name: e.target.value })}
                    />
                  ) : (
                    title
                  )}
                </h1>

                <small className="header-subtitle">
                  {route.screen === 'recipe'
                    ? `${t(locale, 'version')} ${recipe.version} · ${duration(locale, total)}`
                    : buildIdentity}
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

              {route.screen !== 'recipe' && (
                <IconButton
                  icon="more"
                  label={t(locale, 'copyBuild')}
                  onClick={() => setOverlay('build')}
                />
              )}
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

          <main className="phone-content" data-scene={`${route.screen}-${section}`}>
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
                  variant="pills"
                  label={t(locale, 'filter')}

                  tabs={['all', 'running', 'ready', 'drafts'].map((id) => ({
                    id,

                    label: t(locale, id as MessageKey),
                  }))}

                  activeId={filter}

                  onChange={setFilter}
                />

                {allRecipes.map((r) => {
                  const resolved = resolveFormula(r.formula);

                  const isRunning = state.session?.recipeId === r.id;

                  const dWeight = resolved.ok
                    ? grams(locale, resolved.value.doughWeight)
                    : undefined;

                  const hyd = resolved.ok
                    ? `${num(locale, resolved.value.totalWaterPct, 0)} %`
                    : undefined;

                  const dur = duration(locale, processDuration(r));

                  return (
                    <RecipeCard
                      key={r.id}

                      title={recipeName(r, locale)}

                      metrics={[
                        ...(hyd
                          ? [{ icon: 'water' as const, value: hyd, label: t(locale, 'hydration') }]
                          : []),

                        ...(dWeight ? [{ icon: 'scale' as const, value: dWeight }] : []),

                        { icon: 'clock' as const, value: dur },

                        { value: `${t(locale, 'version')} ${r.version}` },
                      ]}

                      status={t(
                        locale,

                        isRunning ? 'running' : r.version === 0 ? 'draft' : 'neverCooked',
                      )}

                      statusVariant={
                        isRunning ? 'success' : r.version === 0 ? 'primary' : 'default'
                      }

                      featured={isRunning}

                      actions={
                        isRunning ? (
                          <Button icon="play" onClick={() => navigate({ screen: 'preparation' })}>
                            {t(locale, 'resume')} · {duration(locale, sessionRemaining)}
                          </Button>
                        ) : undefined
                      }

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
                    onSizeHelp={() => setOverlay('sizeHelp')}
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

                        <p className="detail-row">
                          <span>
                            {t(
                              locale,
                              r.formula.anchor.kind === 'flourTotal'
                                ? 'flourAnchor'
                                : r.formula.anchor.kind === 'doughWeight'
                                  ? 'doughAnchor'
                                  : 'piecesAnchor',
                            )}
                          </span>
                          <strong>
                            {r.formula.anchor.kind === 'pieces'
                              ? `${num(locale, r.formula.anchor.count)} × ${grams(locale, r.formula.anchor.gramsEach)}`
                              : grams(locale, r.formula.anchor.grams)}
                          </strong>
                        </p>
                      </Surface>
                    ))
                  ) : (
                    <p>{t(locale, 'historyEmpty')}</p>
                  )}
                </div>
              </>
            )}

            {route.screen === 'preparation' && (
              <PreparationView store={store} locale={locale} footerHost={prepHost} />
            )}

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
          </main>

          <BottomBar
            variant={variant}
            navigationLabel={t(locale, 'navigation')}
            destinations={nav.map((screen) => ({
              id: screen,
              label: t(locale, screen as MessageKey),
              icon: icons[screen],
              selected:
                route.screen === screen || (screen === 'library' && route.screen === 'recipe'),
              onSelect: () => navigateGlobal(screen),
            }))}
          >
            {route.screen !== 'preparation' ? (
              <>
                {route.screen === 'recipe' &&
                  (state.draft ? (
                    <Button onClick={() => setPending(() => store.cancel)}>
                      {t(locale, 'discard')}
                    </Button>
                  ) : (
                    <Button icon="edit" variant="quiet" onClick={store.edit}>
                      {t(locale, 'edit')}
                    </Button>
                  ))}

                {primary}

                {route.screen === 'recipe' && (
                  <IconButton
                    icon="more"
                    label={t(locale, 'recipeActions')}
                    onClick={() => setOverlay('menu')}
                  />
                )}

                {!primary && (
                  <Button onClick={() => guard(() => navigate({ screen: 'library' }))}>
                    {t(locale, 'library')}
                  </Button>
                )}
              </>
            ) : state.session?.finished ? undefined : (
              <div className="prep-actions-host" ref={setPrepHost} />
            )}
          </BottomBar>
        </div>
      </div>

      <Menu
        anchor="top"

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
        anchor="top"

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
      </Modal>

      <Modal
        open={overlay === 'sizeHelp'}
        onClose={() => setOverlay(null)}
        title={t(locale, 'size')}
        closeLabel={t(locale, 'close')}
      >
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

        title={t(locale, 'confirmTrash')}

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
            {buildIdentity}
            <br />
            {__MOCKUP_REVISION__} · {__MOCKUP_SOURCE_HASH__}
          </code>

          <Button
            onClick={() => {
              navigator.clipboard

                ?.writeText(`${buildIdentity}\n${__MOCKUP_REVISION__}\n${__MOCKUP_SOURCE_HASH__}`)

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

function ComponentCatalogue() {
  return <Catalogue catalogue={catalogue} manifest={manifest} />;
}
