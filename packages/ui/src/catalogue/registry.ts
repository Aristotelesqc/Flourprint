/**
 * Every version of every Flourprint component, for the catalogue and for comparison overrides
 * (ADR 0020). This module imports all versions, so release builds must not import it: consumers
 * load it only behind a build-time flag (see the package README).
 */
import Timeline from '../components/timeline/v1';
import MetricPill from '../components/metric-pill/v1';
import BottomBar from '../components/bottom-bar/v1';
import { library } from '../index.ts';
import Icon from '../components/icon/v1';
import Button from '../components/button/v1';
import IconButton from '../components/icon-button/v1';
import Surface from '../components/surface/v1';
import Badge from '../components/badge/v1';
import NumberField from '../components/number-field/v1';
import Checkbox from '../components/weighing-checkbox/v1';
import Tabs from '../components/tabs/v1';
import Disclosure from '../components/group-card/v1';
import Modal from '../components/bottom-sheet/v1';
import Menu from '../components/floating-menu/v1';
import RecipeSummary from '../components/hero-summary/v1';
import IngredientRow from '../components/ingredient-row/v1';
import StepRow from '../components/step-node/v1';
import RecipeCard from '../components/recipe-card/v1';
import StatusPanel from '../components/warning-banner/v1';
import PreparationTimer from '../components/prep-hero/v1';
import ContextTiles from '../components/context-tiles/v1';
import SectionCarousel from '../components/section-carousel/v1';
import TimelineGuide from '../components/timeline/guide.ts';
import MetricPillGuide from '../components/metric-pill/guide.ts';
import BottomBarGuide from '../components/bottom-bar/guide.ts';
import IconGuide from '../components/icon/guide.ts';
import ButtonGuide from '../components/button/guide.ts';
import IconButtonGuide from '../components/icon-button/guide.ts';
import SurfaceGuide from '../components/surface/guide.ts';
import BadgeGuide from '../components/badge/guide.ts';
import NumberFieldGuide from '../components/number-field/guide.ts';
import WeighingCheckboxGuide from '../components/weighing-checkbox/guide.ts';
import TabsGuide from '../components/tabs/guide.ts';
import GroupCardGuide from '../components/group-card/guide.ts';
import BottomSheetGuide from '../components/bottom-sheet/guide.ts';
import FloatingMenuGuide from '../components/floating-menu/guide.ts';
import HeroSummaryGuide from '../components/hero-summary/guide.ts';
import IngredientRowGuide from '../components/ingredient-row/guide.ts';
import StepNodeGuide from '../components/step-node/guide.ts';
import RecipeCardGuide from '../components/recipe-card/guide.ts';
import WarningBannerGuide from '../components/warning-banner/guide.ts';
import PrepHeroGuide from '../components/prep-hero/guide.ts';
import ContextTilesGuide from '../components/context-tiles/guide.ts';
import SectionCarouselGuide from '../components/section-carousel/guide.ts';

export const catalogue = library.catalogue({
  'fp.timeline': [Timeline],
  'fp.metric-pill': [MetricPill],
  'fp.bottom-bar': [BottomBar],
  'fp.icon': [Icon],
  'fp.button': [Button],
  'fp.icon-button': [IconButton],
  'fp.surface': [Surface],
  'fp.badge': [Badge],
  'fp.number-field': [NumberField],
  'fp.weighing-checkbox': [Checkbox],
  'fp.tabs': [Tabs],
  'fp.group-card': [Disclosure],
  'fp.bottom-sheet': [Modal],
  'fp.floating-menu': [Menu],
  'fp.hero-summary': [RecipeSummary],
  'fp.ingredient-row': [IngredientRow],
  'fp.step-node': [StepRow],
  'fp.recipe-card': [RecipeCard],
  'fp.warning-banner': [StatusPanel],
  'fp.prep-hero': [PreparationTimer],
  'fp.context-tiles': [ContextTiles],
  'fp.section-carousel': [SectionCarousel],
});

/** One guide per component id (ADR 0021). */
export const guides = library.guides({
  'fp.timeline': TimelineGuide,
  'fp.metric-pill': MetricPillGuide,
  'fp.bottom-bar': BottomBarGuide,
  'fp.icon': IconGuide,
  'fp.button': ButtonGuide,
  'fp.icon-button': IconButtonGuide,
  'fp.surface': SurfaceGuide,
  'fp.badge': BadgeGuide,
  'fp.number-field': NumberFieldGuide,
  'fp.weighing-checkbox': WeighingCheckboxGuide,
  'fp.tabs': TabsGuide,
  'fp.group-card': GroupCardGuide,
  'fp.bottom-sheet': BottomSheetGuide,
  'fp.floating-menu': FloatingMenuGuide,
  'fp.hero-summary': HeroSummaryGuide,
  'fp.ingredient-row': IngredientRowGuide,
  'fp.step-node': StepNodeGuide,
  'fp.recipe-card': RecipeCardGuide,
  'fp.warning-banner': WarningBannerGuide,
  'fp.prep-hero': PrepHeroGuide,
  'fp.context-tiles': ContextTilesGuide,
  'fp.section-carousel': SectionCarouselGuide,
});
