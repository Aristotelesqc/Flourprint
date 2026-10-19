import { Ui } from './library';
import type {
  RecipeSummaryProps,
  IngredientRowProps,
  StepRowProps,
  RecipeCardProps,
  StatusPanelProps,
  PreparationTimerProps,
  ContextTilesProps,
} from '../../../../packages/ui/src/props';
export type * from '../../../../packages/ui/src/props';
export const RecipeSummary = (props: RecipeSummaryProps) => (
  <Ui component="fp.hero-summary" {...props} />
);
export const IngredientRow = (props: IngredientRowProps) => (
  <Ui component="fp.ingredient-row" {...props} />
);
export const StepRow = (props: StepRowProps) => <Ui component="fp.step-node" {...props} />;
export const RecipeCard = (props: RecipeCardProps) => <Ui component="fp.recipe-card" {...props} />;
export const StatusPanel = (props: StatusPanelProps) => (
  <Ui component="fp.warning-banner" {...props} />
);
export const PreparationTimer = (props: PreparationTimerProps) => (
  <Ui component="fp.prep-hero" {...props} />
);
export const ContextTiles = (props: ContextTilesProps) => (
  <Ui component="fp.context-tiles" {...props} />
);
