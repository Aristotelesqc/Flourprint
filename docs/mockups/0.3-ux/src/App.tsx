import { Catalogue } from '../../../../packages/ui/src/catalogue/Catalogue';

import { catalogue, guides } from '../../../../packages/ui/src/catalogue/registry';

import { manifest } from './ui.manifest';
import { motionManifest } from './library';
import { motionCatalogue, motionGuides } from '../../../../packages/ui/src/catalogue/motions';

import { useEffect, useLayoutEffect, useState } from 'react';

import { RECIPE_TEMPLATES } from '@flourprint/core/application';

import { INGREDIENT_PRESETS, resolveFormula } from '@flourprint/core/domain';

import {
  Button,
  BottomBar,
  IconButton,
  Tabs,
  Modal,
  CompactDialog,
  Menu,
  Checkbox,
  Disclosure,
  type IconName,
} from './ui';
import './review-options.css';
import { copyT, formatResetMessage, getBaselineDescription } from './app-copy';
import { editingCopyT } from './editing-copy';

import { RecipeCard } from './components';
import { catalogText, templateBasis } from './template-presentation';
import { TrashView } from './TrashView';

import { RecipeIngredients, WaterDetails, componentDisplayName } from './RecipeView';

import { ProcessView, processDuration, titleOf } from './ProcessView';

import { PreparationView } from './PreparationView';
import { RecipeHistory } from './RecipeHistory';
import { cancelActiveStepDrag } from './StepDrag';
import { formatHistoryError } from './history-copy';

import {
  usePrototype,
  recipeName,
  getSessionRemainingSeconds,
  type Route,
  type Screen,
  type Section,
  type Recipe,
} from './model';

import {
  t,
  duration,
  grams,
  percent,
  colon,
  ingredientName,
  componentName,
  type Locale,
  type MessageKey,
} from './messages';

import { SectionCarousel } from './SectionCarousel';
import { navCopyT } from './navigation-copy';
import { useDevicePreferences, type ThemePreference } from './device-preferences';
import { preferencesCopy } from './preferences-copy';
import { DeviceSettings } from './DeviceSettings';
import { ComponentDefaultsSettings } from './ComponentDefaultsSettings';

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

const sections: Section[] = ['ingredients', 'planning', 'history'];

function readRoute(): Route {
  const p = new URLSearchParams(location.search);

  const screen = p.get('screen');
  const rawSection = p.get('section');
  const section: Section =
    rawSection === 'steps'
      ? 'ingredients'
      : sections.includes(rawSection as Section)
        ? (rawSection as Section)
        : 'ingredients';

  return {
    screen: ['recipe', 'preparation', 'registry', 'settings', 'catalogue'].includes(screen ?? '')
      ? (screen as Screen)
      : 'library',

    recipeId: p.get('recipe') ?? undefined,

    section,
  };
}

export default function App() {
  const params = new URLSearchParams(location.search);

  const [locale, setLocale] = useState<Locale>(params.get('lang') === 'en' ? 'en' : 'fr');

  const { themePreference, resolvedTheme, setThemePreference } = useDevicePreferences();

  useLayoutEffect(() => {
    const p = params.get('theme');
    if (p && ['system', 'light', 'dark', 'amoled'].includes(p)) {
      setThemePreference(p as ThemePreference);
    }
  }, []);

  const [motion, setMotion] = useState(params.get('motion') === 'reduce' ? 'reduced' : 'standard');

  const [width, setWidth] = useState(params.get('width') ?? '393');

  const [scale, setScale] = useState(params.get('scale') ?? '100');

  const [orderStyle, setOrderStyle] = useState(params.get('ordering') ?? 'mode');

  const [targets, setTargets] = useState(params.get('targets') ?? '48');

  const [route, setRoute] = useState<Route>(readRoute);
  const [trashOpen, setTrashOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [returnToPlanning, setReturnToPlanning] = useState(false);
  const [collapsedGroupsByRecipe, setCollapsedGroupsByRecipe] = useState<
    Record<string, Record<string, boolean>>
  >({});

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
  const [confirmReset, setConfirmReset] = useState(false);

  const stepDesignParam = params.get('stepDesign');
  const stepDesign = ['compact', 'rail', 'outline'].includes(stepDesignParam ?? '')
    ? (stepDesignParam as 'compact' | 'rail' | 'outline')
    : 'compact';

  const [query, setQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('shokupan');

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

    document.documentElement.dataset.theme = resolvedTheme;

    document.documentElement.dataset.targetSize = targets;
    document.documentElement.dataset.ordering = orderStyle;

    document.documentElement.dataset.textScale = scale;

    document.documentElement.dataset.motion = motion;

    document.documentElement.style.fontSize = `${(Number(scale) / 100) * 16}px`;

    document.documentElement.style.setProperty('--phone-width', `${width}px`);

    document.body.dataset.capture = params.get('capture') === '1' ? 'true' : 'false';
  }, [locale, resolvedTheme, motion, targets, scale, width, orderStyle, params]);

  useEffect(() => {
    const focus = new URLSearchParams(location.search).get('focus');

    if (!focus || !['ingredient-grams-milk', 'component-ratio-tangzhong'].includes(focus)) return;

    requestAnimationFrame(() => {
      for (const node of document.querySelectorAll<HTMLElement>('[data-testid]'))
        if (node.dataset.testid === focus) node.scrollIntoView({ block: 'center' });
    });
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('section') === 'steps') {
      requestAnimationFrame(() => {
        const stepsEl = document.getElementById('recipe-steps');
        if (stepsEl) stepsEl.scrollIntoView({ block: 'start' });
      });
    }
  }, [route.section]);

  const writeURL = (next: Route, push: boolean) => {
    const url = new URL(location.href);

    url.searchParams.set('screen', next.screen);

    url.searchParams.set('section', next.section ?? 'ingredients');

    url.searchParams.set('recipe', next.recipeId ?? state.selected);

    url.searchParams.set('lang', locale);

    url.searchParams.set('theme', themePreference);

    url.searchParams.set('width', width);

    url.searchParams.set('scale', scale);

    url.searchParams.set('motion', motion === 'reduced' ? 'reduce' : 'standard');

    if (stepDesignParam) {
      url.searchParams.set('stepDesign', stepDesignParam);
    }

    url.searchParams.delete('mode');

    history[push ? 'pushState' : 'replaceState']({}, '', url);
  };

  const makeStepDesignUrl = (design: 'compact' | 'rail' | 'outline') => {
    const url = new URL(location.href);
    url.searchParams.set('screen', 'recipe');
    url.searchParams.set('recipe', 'shokupan');
    url.searchParams.set('section', 'ingredients');
    url.searchParams.set('mode', 'edit');
    url.searchParams.set('stepDesign', design);
    url.searchParams.set('dragActivation', 'hold');
    url.searchParams.set('theme', themePreference);
    url.searchParams.set('lang', locale);
    url.searchParams.set('width', width);
    url.searchParams.set('scale', scale);
    url.searchParams.set('motion', motion === 'reduced' ? 'reduce' : 'standard');
    url.searchParams.delete('capture');
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const isDraftDirty = Boolean(
    (state.draft &&
      (state.draft.index > 0 ||
        Object.values(state.invalid).some(Boolean) ||
        recipe.version === 0)) ||
    Object.values(state.pendingInputs ?? {}).some(Boolean),
  );

  const handleCancel = () => {
    if (cancelActiveStepDrag()) return;
    setOverlay(null);
    setEditingStepId(null);
    setReturnToPlanning(false);
    if (isDraftDirty) {
      setPending(() => () => {
        store.cancel();
      });
    } else {
      store.cancel();
    }
  };

  const navigate = (next: Route) => {
    setRoute(next);
    if (next.screen !== 'settings') {
      setTrashOpen(false);
    }

    setOverlay(null);

    writeURL(next, true);
  };

  const guard = (action: () => void) => {
    if (cancelActiveStepDrag()) return;
    if (isDraftDirty) {
      setOverlay(null);
      setPending(() => () => {
        setEditingStepId(null);
        setReturnToPlanning(false);
        action();
      });
    } else {
      action();
    }
  };

  useEffect(() => {
    const onPop = () => {
      if (cancelActiveStepDrag()) {
        writeURL(route, false);
        return;
      }

      const target = readRoute();

      if (isDraftDirty) {
        writeURL(route, true);
        setOverlay(null);
        setPending(() => () => {
          setEditingStepId(null);
          setReturnToPlanning(false);
          store.cancel();

          if (target.recipeId) store.select(target.recipeId);

          navigate(target);
        });
      } else {
        setEditingStepId(null);
        setReturnToPlanning(false);
        if (state.draft) store.cancel();
        if (target.recipeId) store.select(target.recipeId);

        setRoute(target);
      }
    };

    window.addEventListener('popstate', onPop);

    return () => window.removeEventListener('popstate', onPop);
  });

  useEffect(() => {
    writeURL(route, false);
  }, [locale, themePreference, motion, width, scale]);

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

  const copyBuild = () => {
    const value = `${buildIdentity}\n${__MOCKUP_REVISION__}\n${__MOCKUP_SOURCE_HASH__}`;
    if (!navigator.clipboard) {
      setCopy(t(locale, 'copyFallback'));
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => setCopy(t(locale, 'copied')))
      .catch(() => setCopy(t(locale, 'copyFallback')));
  };

  const title =
    route.screen === 'recipe'
      ? name
      : route.screen === 'preparation' && state.session
        ? state.session.recipeName
        : route.screen === 'catalogue'
          ? t(locale, 'catalogue')
          : route.screen === 'library'
            ? t(locale, 'appName')
            : route.screen === 'settings' && trashOpen
              ? copyT(locale, 'trashTitle')
              : t(locale, route.screen as MessageKey);

  const primary =
    route.screen === 'library' ? (
      <Button
        variant="primary"
        icon="plus"
        aria-label={t(locale, 'new')}
        onClick={() => setOverlay('create')}
      >
        {t(locale, 'newShort')}
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
        (() => {
          const running = store.getRunningSession(recipe.id);
          const isRunning = Boolean(running && !running.finished);
          return (
            <Button
              variant="primary"
              icon="play"
              onClick={() => {
                if (running && !running.finished) {
                  store.selectSession(running.id);
                  navigate({ screen: 'preparation' });
                } else if (store.start()) {
                  navigate({ screen: 'preparation' });
                }
              }}
            >
              {t(locale, isRunning ? 'resume' : 'start')}
            </Button>
          );
        })()
      )
    ) : null;

  const contextualControls = (
    <>
      {route.screen !== 'preparation' ? (
        <>
          {route.screen === 'recipe' &&
            (state.draft ? (
              <>
                <Button variant="quiet" onClick={handleCancel}>
                  {t(locale, 'cancel')}
                </Button>
                <IconButton
                  icon="undo"
                  label={t(locale, 'undo')}
                  disabled={state.draft.index === 0 || Object.values(state.invalid).some(Boolean)}
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
              </>
            ) : (
              <Button variant="quiet" onClick={() => store.edit()}>
                {t(locale, 'edit')}
              </Button>
            ))}

          {route.screen === 'library' && (
            <input
              className="toolbar-search"
              type="search"
              aria-label={t(locale, 'search')}
              placeholder={t(locale, 'search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {primary}

          {(route.screen === 'recipe' || route.screen === 'library') && (
            <IconButton
              icon="more"
              label={t(locale, route.screen === 'recipe' ? 'recipeActions' : 'navigation')}
              onClick={() => setOverlay(route.screen === 'recipe' ? 'menu' : 'nav')}
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
    </>
  );

  const navigateGlobal = (screen: Screen) =>
    guard(() => {
      if (screen === 'preparation') {
        const activeSessions = store.getActiveSessions();
        const targetActiveSession =
          (state.session && !state.session.finished ? state.session : undefined) ??
          activeSessions[0];
        if (targetActiveSession) {
          store.selectSession(targetActiveSession.id);
        }
      }
      navigate({ screen });
    });

  const matchesRecipeSearch = (r: Recipe, q: string): boolean => {
    if (!q) return true;
    const term = q.trim().toLocaleLowerCase();
    if (!term) return true;
    if (recipeName(r, locale).toLocaleLowerCase().includes(term)) return true;
    for (const c of r.formula.components) {
      if (componentDisplayName(locale, r.formula, c, r.names).toLocaleLowerCase().includes(term)) {
        return true;
      }
    }
    const lastStep = [...r.process.steps].reverse().find((s) => s.operation !== 'preheat');
    if (lastStep && titleOf(lastStep, locale).toLocaleLowerCase().includes(term)) {
      return true;
    }
    return false;
  };

  const eligibleRecipes = state.recipes.filter((r) => {
    if (r.trashed) return false;
    return matchesRecipeSearch(r, query);
  });

  const allRecipes = eligibleRecipes.filter((r) => {
    const isRunning = Boolean(store.getRunningSession(r.id));
    if (filter === 'all') return true;
    if (filter === 'running') return isRunning;
    if (filter === 'ready') return r.version > 0 && !isRunning;
    if (filter === 'drafts') return r.version === 0;
    return false;
  });

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

        <div className="studio-segment" role="group" aria-label={t(locale, 'navigationChoice')}>
          <span className="studio-segment-label">{navCopyT(locale, 'navA')}</span>
        </div>

        <label>
          {t(locale, 'appearance')}

          <select
            aria-label={t(locale, 'appearance')}
            value={themePreference}
            onChange={(e) => {
              const v = e.target.value;
              if (['system', 'light', 'dark', 'amoled'].includes(v)) {
                setThemePreference(v as ThemePreference);
              }
            }}
          >
            {['system', 'light', 'dark', 'amoled'].map((value) => (
              <option key={value} value={value}>
                {value === 'system'
                  ? preferencesCopy(locale, 'themeSystem')
                  : t(locale, value as MessageKey)}
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

      <aside
        className={`component-inspector ${inspecting ? 'is-forced-visible' : ''}`}
        style={inspecting ? { display: 'flex' } : undefined}
      >
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
      <aside className="studio-note step-design-panel">
        <div className="step-design-header">
          <strong>{copyT(locale, 'stepDesignHeading')}</strong>
          <span className="step-design-status">
            {copyT(locale, 'currentStepDesign')}: <code>{stepDesign}</code>
          </span>
        </div>
        <p className="step-design-explanation">{copyT(locale, 'stepDesignExplanation')}</p>
        <div className="step-design-links">
          {(['compact', 'rail', 'outline'] as const).map((design) => (
            <a
              key={design}
              className={`step-design-link ${stepDesign === design ? 'is-active' : ''}`}
              href={makeStepDesignUrl(design)}
              target="_blank"
              rel="noreferrer"
            >
              <span>{copyT(locale, `stepDesign_${design}`)}</span>
              {design === 'compact' && (
                <span className="step-design-badge">{copyT(locale, 'selectedOption')}</span>
              )}
            </a>
          ))}
        </div>
      </aside>
      <aside className="studio-note">
        <label>
          {t(locale, 'orderMode')}{' '}
          <select
            value={orderStyle}
            onChange={(e) => {
              setOrderStyle(e.target.value);
              const url = new URL(location.href);
              url.searchParams.set('ordering', e.target.value);
              history.replaceState({}, '', url);
            }}
          >
            <option value="mode">{t(locale, 'orderMode')}</option>
            <option value="handles">{t(locale, 'handles')}</option>
          </select>
        </label>
      </aside>
      <aside className="studio-note">
        <p>{t(locale, 'checksChoice')}</p>
        <Button onClick={() => location.reload()}>{t(locale, 'resetDemo')}</Button>
      </aside>
      <div className="phone-stage">
        <div
          className="phone-frame"
          data-testid="phone"
          data-navigation="A"
          data-fp-overlay-boundary
        >
          <header className="phone-header">
            <div className="header-title">
              <IconButton
                imageSrc={route.screen === 'library' ? 'mark.svg' : undefined}
                icon={
                  route.screen === 'recipe' || (route.screen === 'settings' && trashOpen)
                    ? 'back'
                    : 'menu'
                }
                label={t(
                  locale,
                  route.screen === 'recipe' || (route.screen === 'settings' && trashOpen)
                    ? 'back'
                    : 'navigation',
                )}
                onClick={() => {
                  if (route.screen === 'recipe') {
                    guard(() => navigate({ screen: 'library' }));
                  } else if (route.screen === 'settings' && trashOpen) {
                    setTrashOpen(false);
                  } else {
                    setOverlay('nav');
                  }
                }}
              />
              {route.screen === 'recipe' && (
                <IconButton
                  icon="menu"
                  label={t(locale, 'navigation')}
                  onClick={() => setOverlay('nav')}
                />
              )}

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
                    ? (() => {
                        if (state.draft) {
                          return `${t(locale, 'draft')} · ${duration(locale, total)}`;
                        }
                        const currentMilestone = recipe.referenceVersions.find(
                          (ref) => ref.version === recipe.version,
                        );
                        if (currentMilestone) {
                          return `v${currentMilestone.number}${currentMilestone.name ? ` (${currentMilestone.name})` : ''} · ${duration(locale, total)}`;
                        }
                        return `${t(locale, 'ready')} · ${duration(locale, total)}`;
                      })()
                    : undefined}
                </small>
              </div>
            </div>

            <div className="header-actions">
              {(() => {
                const activeSessions = store.getActiveSessions();
                const targetActiveSession =
                  (state.session && !state.session.finished ? state.session : undefined) ??
                  activeSessions[0];

                if (
                  targetActiveSession &&
                  route.screen !== 'preparation' &&
                  (route.screen !== 'recipe' || targetActiveSession.recipeId !== recipe.id)
                ) {
                  return (
                    <IconButton
                      icon="clock"
                      label={t(locale, 'resume')}
                      onClick={() =>
                        guard(() => {
                          store.selectSession(targetActiveSession.id);
                          navigate({ screen: 'preparation' });
                        })
                      }
                    />
                  );
                }
                return null;
              })()}
            </div>
          </header>

          {route.screen === 'recipe' && (
            <>
              <Tabs
                label={t(locale, 'navigation')}

                tabs={sections.map((id) => ({
                  id,

                  label: t(locale, id === 'ingredients' ? 'recipeTab' : id),
                }))}

                activeId={section}

                onChange={(id) => {
                  setRoute({ ...route, section: id as Section });

                  writeURL({ ...route, section: id as Section }, false);
                }}
              />
            </>
          )}

          <main
            className={`phone-content ${route.screen === 'recipe' ? 'has-carousel' : ''}`}
            data-scene={`${route.screen}-${section}`}
          >
            {!(route.screen === 'recipe' && section === 'history' && state.historyError) &&
              (state.historyError || state.error) && (
                <p className="error-banner" role="alert">
                  {state.historyError
                    ? formatHistoryError(state.historyError, locale)
                    : state.error}
                </p>
              )}

            {route.screen === 'library' && (
              <>
                <Tabs
                  variant="chips"
                  label={t(locale, 'filter')}

                  tabs={['all', 'running', 'ready', 'drafts'].map((id) => {
                    const count = eligibleRecipes.filter((r) => {
                      const isRunning = Boolean(store.getRunningSession(r.id));
                      if (id === 'all') return true;
                      if (id === 'running') return isRunning;
                      if (id === 'ready') return r.version > 0 && !isRunning;
                      if (id === 'drafts') return r.version === 0;
                      return false;
                    }).length;
                    return {
                      id,
                      label: `${t(locale, id as MessageKey)} (${count})`,
                    };
                  })}

                  activeId={filter}

                  onChange={setFilter}
                />

                {allRecipes.map((r) => {
                  const resolved = resolveFormula(r.formula);

                  const running = store.getRunningSession(r.id);
                  const isRunning = Boolean(running);
                  const remaining = running
                    ? getSessionRemainingSeconds(running, clockNow)
                    : undefined;

                  const lastSession = state.sessionHistory
                    .filter((session) => session.recipeId === r.id)
                    .at(-1);

                  const dWeight = resolved.ok
                    ? grams(locale, resolved.value.doughWeight)
                    : undefined;

                  const hyd = resolved.ok
                    ? percent(locale, resolved.value.totalWaterPct, 0)
                    : undefined;

                  const totalDurS = processDuration(r);
                  const dur = totalDurS !== undefined ? duration(locale, totalDurS) : undefined;
                  const lastStep = [...r.process.steps]
                    .reverse()
                    .find((s) => s.operation !== 'preheat');
                  const finalStepTitle = lastStep ? titleOf(lastStep, locale) : undefined;
                  const clockMetricValue = dur
                    ? finalStepTitle
                      ? `${dur} · ${finalStepTitle}`
                      : dur
                    : t(locale, 'unknown');

                  const currentMilestone = r.referenceVersions.find(
                    (ref) => ref.version === r.version,
                  );

                  const statusText = isRunning
                    ? `${t(locale, 'running')}${remaining !== undefined ? ` · ${duration(locale, remaining)}` : ''}`
                    : r.version === 0
                      ? t(locale, 'draft')
                      : currentMilestone
                        ? `${t(locale, 'ready')} · v${currentMilestone.number}`
                        : t(locale, 'ready');

                  const description = isRunning
                    ? undefined
                    : r.version === 0
                      ? undefined
                      : lastSession
                        ? lastSession.abandoned
                          ? editingCopyT(locale, 'statusAbandoned')
                          : lastSession.outcome
                            ? t(
                                locale,
                                lastSession.outcome.result === 'cooked'
                                  ? 'resultCooked'
                                  : lastSession.outcome.result === 'dough'
                                    ? 'resultDough'
                                    : lastSession.outcome.result === 'cookedAndDough'
                                      ? 'resultMixed'
                                      : 'unknown',
                              )
                            : t(locale, 'unknown')
                        : copyT(locale, 'neverPrepared');

                  return (
                    <RecipeCard
                      key={r.id}

                      title={recipeName(r, locale)}

                      description={description}

                      metrics={[
                        ...(hyd
                          ? [
                              {
                                icon: 'water' as const,
                                value: `${resolved.ok && resolved.value.totalWater.completeness === 'incomplete' ? '≥ ' : ''}${hyd}`,
                              },
                            ]
                          : []),

                        ...(dWeight ? [{ icon: 'scale' as const, value: dWeight }] : []),

                        { icon: 'clock' as const, value: clockMetricValue },

                        ...r.formula.components.map((c) => ({
                          value: componentDisplayName(locale, r.formula, c, r.names),
                        })),
                      ]}

                      status={statusText}

                      statusVariant={
                        isRunning ? 'success' : r.version === 0 ? 'primary' : 'default'
                      }

                      featured={isRunning}

                      onOpen={() => openRecipe(r.id)}
                      onResume={
                        running
                          ? () => {
                              store.selectSession(running.id);
                              navigate({ screen: 'preparation', recipeId: r.id });
                            }
                          : undefined
                      }
                      resumeLabel={t(locale, 'resume')}
                    />
                  );
                })}

                {!allRecipes.length && <p>{t(locale, 'empty')}</p>}
              </>
            )}

            {route.screen === 'recipe' && (
              <SectionCarousel
                sections={sections}
                activeSection={section}
                onChangeSection={(id) => {
                  setRoute((prev) => ({ ...prev, section: id }));
                  writeURL({ ...route, section: id }, false);
                }}
                locale={locale}
                reduced={motion === 'reduced'}
              >
                <div>
                  <RecipeIngredients
                    store={store}

                    locale={locale}

                    onHelp={() => setOverlay('help')}
                    onSizeHelp={() => setOverlay('sizeHelp')}
                  />
                  <div id="recipe-steps" data-testid="recipe-steps" data-step-design={stepDesign}>
                    <ProcessView
                      store={store}
                      locale={locale}
                      editingStepId={editingStepId}
                      onClearEditingStepId={() => setEditingStepId(null)}
                      returnToPlanning={
                        returnToPlanning
                          ? () => {
                              setReturnToPlanning(false);
                              setEditingStepId(null);
                              setRoute((prev) => ({ ...prev, section: 'planning' }));
                              writeURL({ ...route, section: 'planning' }, false);
                            }
                          : undefined
                      }
                      collapsedGroups={collapsedGroupsByRecipe[recipe.id] ?? {}}
                      onToggleGroup={(groupId, open) =>
                        setCollapsedGroupsByRecipe((prev) => ({
                          ...prev,
                          [recipe.id]: {
                            ...(prev[recipe.id] ?? {}),
                            [groupId]: !open,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div data-step-design={stepDesign}>
                  <ProcessView
                    store={store}
                    locale={locale}
                    planning
                    collapsedGroups={collapsedGroupsByRecipe[recipe.id] ?? {}}
                    onToggleGroup={(groupId, open) =>
                      setCollapsedGroupsByRecipe((prev) => ({
                        ...prev,
                        [recipe.id]: {
                          ...(prev[recipe.id] ?? {}),
                          [groupId]: !open,
                        },
                      }))
                    }
                  />
                </div>

                <RecipeHistory
                  recipe={recipe}
                  store={store}
                  locale={locale}
                  isDraftDirty={isDraftDirty}
                />
              </SectionCarousel>
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
                      {t(locale, 'waterContent')}
                      {colon(locale)}
                      {p.ingredient.kind === 'water'
                        ? percent(locale, 100, 0)
                        : p.ingredient.water && p.ingredient.water.status !== 'unknown'
                          ? `${percent(locale, p.ingredient.water.valuePct, 0)} · ${t(locale, p.ingredient.water.status === 'known' ? 'known' : 'estimated')}`
                          : t(locale, 'unknown')}
                    </p>
                  </Disclosure>
                ))}
              </>
            )}

            {route.screen === 'settings' &&
              (trashOpen ? (
                <TrashView store={store} locale={locale} onBack={() => setTrashOpen(false)} />
              ) : (
                <>
                  <Disclosure title={preferencesCopy(locale, 'advancedTitle')} defaultOpen>
                    <DeviceSettings locale={locale} />
                    <ComponentDefaultsSettings locale={locale} />
                  </Disclosure>

                  <Disclosure title={t(locale, 'checkScope')} defaultOpen>
                    <Checkbox
                      checked={keepChecks}

                      onChange={setKeepChecks}

                      label={t(locale, 'keepChecks')}
                    />

                    <Button onClick={() => store.setState((s) => ({ ...s, checks: {} }))}>
                      {t(locale, 'clearChecks')}
                    </Button>
                  </Disclosure>

                  <div style={{ marginTop: 'var(--fp-space-2)' }}>
                    <Button onClick={() => setTrashOpen(true)}>
                      {copyT(locale, 'openTrashAction')}
                    </Button>
                  </div>
                </>
              ))}
          </main>

          <button
            type="button"
            className="build-label"
            data-testid="visible-build"
            aria-label={t(locale, 'copyBuild')}
            onClick={() => {
              setOverlay('build');
              copyBuild();
            }}
          >
            {buildIdentity}
          </button>
          <BottomBar
            variant="A"
            navigationLabel={t(locale, 'navigation')}
            destinations={nav.map((screen) => ({
              id: screen,
              label: t(locale, screen as MessageKey),
              icon: icons[screen],
              badge:
                screen === 'preparation' && store.getActiveSessions().length > 0
                  ? String(store.getActiveSessions().length)
                  : undefined,
              selected:
                route.screen === screen || (screen === 'library' && route.screen === 'recipe'),
              onSelect: () => navigateGlobal(screen),
            }))}
          >
            {contextualControls}
          </BottomBar>
        </div>
      </div>

      <Menu
        anchor="bottom"

        open={overlay === 'menu'}

        onClose={() => setOverlay(null)}

        title={t(locale, 'recipeActions')}

        closeLabel={t(locale, 'close')}
      >
        <div className="menu-actions">
          {state.draft && (
            <Button
              variant="quiet"
              disabled={state.draft.index === 0}
              onClick={() => {
                setOverlay(null);
                setConfirmReset(true);
              }}
            >
              {t(locale, 'reset')}
            </Button>
          )}
          {!state.draft && Boolean(store.getRunningSession(recipe.id)) && (
            <Button
              icon="play"
              variant="quiet"
              onClick={() => {
                store.start();
                setOverlay(null);
                navigate({ screen: 'preparation' });
              }}
            >
              {copyT(locale, 'startAnotherPreparation')}
            </Button>
          )}
          <Button
            icon="copy"
            variant="quiet"
            onClick={() => {
              const duplicate = structuredClone(recipe);
              duplicate.id = crypto.randomUUID();
              duplicate.name = `${name} · ${t(locale, 'copy')}`;
              duplicate.trashed = false;
              store.setState((s) => ({
                ...s,
                recipes: [duplicate, ...s.recipes],
                selected: duplicate.id,
                draft: null,
                checks: { ...s.checks, [duplicate.id]: [] },
              }));
              setOverlay(null);
            }}
          >
            {t(locale, 'duplicate')}
          </Button>
          <Button
            icon="trash"
            variant="quiet"
            className="menu-destructive"
            onClick={() => setOverlay('trash')}
          >
            {t(locale, 'trash')}
          </Button>
        </div>
      </Menu>

      <CompactDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={copyT(locale, 'confirmResetTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setConfirmReset(false)}>
              {t(locale, 'cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                store.reset();
                setConfirmReset(false);
              }}
            >
              {copyT(locale, 'confirmResetAction')}
            </Button>
          </div>
        }
      >
        <p>
          {formatResetMessage(
            locale,
            getBaselineDescription(recipe, locale, recipeName(recipe, locale)),
          )}
        </p>
      </CompactDialog>

      <Menu
        anchor="top"

        open={overlay === 'nav'}

        onClose={() => setOverlay(null)}

        title={t(locale, 'navigation')}

        closeLabel={t(locale, 'close')}
      >
        <div className="stack">
          {nav.map((screen) => {
            const activeCount = screen === 'preparation' ? store.getActiveSessions().length : 0;
            return (
              <Button key={screen} icon={icons[screen]} onClick={() => navigateGlobal(screen)}>
                {t(locale, screen as MessageKey)}
                {activeCount > 0 ? ` (${activeCount})` : ''}
              </Button>
            );
          })}

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
        footer={
          <Button
            variant="primary"
            onClick={() => {
              const id = store.create(selectedTemplate);
              const url = new URL(location.href);
              url.searchParams.set('screen', 'recipe');
              url.searchParams.set('recipe', id);
              url.searchParams.set('section', 'ingredients');
              history.pushState({}, '', url);
              setOverlay(null);
              setRoute({ screen: 'recipe', section: 'ingredients' });
            }}
          >
            {t(locale, 'createSelected')} «{' '}
            {selectedTemplate
              ? recipeName({ templateId: selectedTemplate } as typeof recipe, locale)
              : t(locale, 'blank')}{' '}
            »
          </Button>
        }
      >
        <div className="stack">
          <Button aria-pressed={selectedTemplate === ''} onClick={() => setSelectedTemplate('')}>
            {t(locale, 'blank')}
          </Button>
          {[...RECIPE_TEMPLATES]
            .sort((a, b) => (a.id === 'shokupan' ? -1 : b.id === 'shokupan' ? 1 : 0))
            .map((template) => {
              const result = resolveFormula(template.formula);
              return (
                <div key={template.id}>
                  <RecipeCard
                    title={recipeName({ templateId: template.id } as typeof recipe, locale)}
                    selected={selectedTemplate === template.id}
                    description={
                      selectedTemplate === template.id
                        ? catalogText(locale, `template.${template.id}.traits`)
                        : undefined
                    }
                    status={template.formula.components
                      .map((c) => componentName(locale, c.id, {}))
                      .join(' · ')}
                    metrics={
                      result.ok
                        ? [
                            {
                              icon: 'water',
                              value: `${result.value.totalWater.completeness === 'incomplete' ? '≥ ' : ''}${percent(locale, result.value.totalWaterPct, 0)}`,
                            },
                            { icon: 'scale', value: grams(locale, result.value.doughWeight) },
                            {
                              icon: 'clock',
                              value: duration(locale, processDuration({ ...template, names: {} })),
                            },
                          ]
                        : []
                    }
                    onOpen={() => setSelectedTemplate(template.id)}
                  />
                  <details className="template-details">
                    <summary>{t(locale, 'templateDetails')}</summary>
                    <p>{templateBasis(locale, template.id, template.basis)}</p>
                    {template.guide && (
                      <p>
                        {t(locale, 'source')}
                        {colon(locale)}
                        {template.guide.reference}
                      </p>
                    )}
                  </details>
                </div>
              );
            })}
        </div>
      </Modal>

      <CompactDialog
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
      </CompactDialog>

      <CompactDialog
        open={Boolean(pending)}

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
      </CompactDialog>

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

          <Button onClick={copyBuild}>{t(locale, 'copyBuild')}</Button>

          <p role="status">{copy}</p>
        </div>
      </Modal>
    </>
  );
}

function ComponentCatalogue() {
  return (
    <Catalogue
      catalogue={catalogue}
      manifest={manifest}
      guides={guides}
      motions={motionCatalogue}
      motionGuides={motionGuides}
      motionManifest={motionManifest}
    />
  );
}
