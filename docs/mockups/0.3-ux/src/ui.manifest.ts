import Timeline from '../../../../packages/ui/src/components/timeline/v1';
import MetricPill from '../../../../packages/ui/src/components/metric-pill/v1';
import BottomBar from '../../../../packages/ui/src/components/bottom-bar/v1';
import { library } from '../../../../packages/ui/src/index';
import Icon from '../../../../packages/ui/src/components/icon/v1';
import Button from '../../../../packages/ui/src/components/button/v1';
import IconButton from '../../../../packages/ui/src/components/icon-button/v1';
import Surface from '../../../../packages/ui/src/components/surface/v1';
import Badge from '../../../../packages/ui/src/components/badge/v1';
import NumberField from '../../../../packages/ui/src/components/number-field/v1';
import Checkbox from '../../../../packages/ui/src/components/weighing-checkbox/v1';
import Tabs from '../../../../packages/ui/src/components/tabs/v1';
import Disclosure from '../../../../packages/ui/src/components/group-card/v1';
import Modal from '../../../../packages/ui/src/components/bottom-sheet/v1';
import Menu from '../../../../packages/ui/src/components/floating-menu/v1';
import RecipeSummary from '../../../../packages/ui/src/components/hero-summary/v1';
import IngredientRow from '../../../../packages/ui/src/components/ingredient-row/v1';
import StepRow from '../../../../packages/ui/src/components/step-node/v1';
import RecipeCard from '../../../../packages/ui/src/components/recipe-card/v1';
import StatusPanel from '../../../../packages/ui/src/components/warning-banner/v1';
import PreparationTimer from '../../../../packages/ui/src/components/prep-hero/v1';
import ContextTiles from '../../../../packages/ui/src/components/context-tiles/v1';
export const manifest = library.manifest({
  'fp.timeline': Timeline,
  'fp.metric-pill': MetricPill,
  'fp.bottom-bar': BottomBar,
  'fp.icon': Icon,
  'fp.button': Button,
  'fp.icon-button': IconButton,
  'fp.surface': Surface,
  'fp.badge': Badge,
  'fp.number-field': NumberField,
  'fp.weighing-checkbox': Checkbox,
  'fp.tabs': Tabs,
  'fp.group-card': Disclosure,
  'fp.bottom-sheet': Modal,
  'fp.floating-menu': Menu,
  'fp.hero-summary': RecipeSummary,
  'fp.ingredient-row': IngredientRow,
  'fp.step-node': StepRow,
  'fp.recipe-card': RecipeCard,
  'fp.warning-banner': StatusPanel,
  'fp.prep-hero': PreparationTimer,
  'fp.context-tiles': ContextTiles,
});
