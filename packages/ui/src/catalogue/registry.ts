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
});
