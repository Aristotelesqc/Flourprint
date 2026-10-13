import { useIntl } from 'react-intl';
import {
  componentStyle,
  type Component,
  type DomainError,
  type FlourEntry,
  type Formula,
} from '@flourprint/core/domain';
import { useFlourCatalog } from '../services/flours';
import { en, type MessageKey } from './messages';
import { formatGrams, formatPct, formatWholePct } from './numbers';

type Values = Record<string, string | number>;

export interface CuratedStepPresentation {
  readonly shortKey: MessageKey;
  readonly fullKey: MessageKey;
}

export const BUILT_IN_DUTCH_OVEN_LABEL =
  'Bake in preheated 6–8 qt Dutch oven at 450 °F (232 °C): 30 min covered, then 22.5 min uncovered';

export const TEMPLATE_STEP_LABELS: Readonly<Record<string, CuratedStepPresentation>> = {
  [BUILT_IN_DUTCH_OVEN_LABEL]: {
    shortKey: 'template.dutchOven.bakeShort',
    fullKey: 'template.dutchOven.bake',
  },
  'Bake at 450 °F (232 °C) on stone or pan with steam': {
    shortKey: 'template.baguette.bakeShort',
    fullKey: 'template.baguette.bake',
  },
  'Bake at 460 °F (238 °C) with steam': {
    shortKey: 'template.ciabatta.bakeShort',
    fullKey: 'template.ciabatta.bake',
  },
  'Simmer 30 s per side in gentle water bath in batches of 3–4': {
    shortKey: 'template.bagels.boilShort',
    fullKey: 'template.bagels.boil',
  },
  'Bake on parchment-lined sheet pan at 425 °F (218 °C)': {
    shortKey: 'template.bagels.bakeShort',
    fullKey: 'template.bagels.bake',
  },
  'Bake in pan on lower rack at 475 °F (246 °C)': {
    shortKey: 'template.focaccia.bakeShort',
    fullKey: 'template.focaccia.bake',
  },
  'Finish out of pan on lower rack with oven turned off (residual heat)': {
    shortKey: 'template.focaccia.bakeFinishShort',
    fullKey: 'template.focaccia.bakeFinish',
  },
  'Bake on Baking Steel at 500–550 °F (274 °C)': {
    shortKey: 'template.pizzaNeoNeapolitan.bakeShort',
    fullKey: 'template.pizzaNeoNeapolitan.bake',
  },
  'Bake in professional pizza oven (≤350 °C)': {
    shortKey: 'template.pizzaRoman.bakeShort',
    fullKey: 'template.pizzaRoman.bake',
  },
  'Bake on preheated stone or steel at 550 °F (288 °C)': {
    shortKey: 'template.pizzaNewYork.bakeShort',
    fullKey: 'template.pizzaNewYork.bake',
  },
  'Layer cheeses, vegetables, meats, and sauce in skillet': {
    shortKey: 'template.pizzaChicago.assemblyShort',
    fullKey: 'template.pizzaChicago.assembly',
  },
  'Bake in cast-iron skillet at 450 °F (230 °C), tent with foil after 20 min': {
    shortKey: 'template.pizzaChicago.bakeShort',
    fullKey: 'template.pizzaChicago.bake',
  },
  'Stretch to fill pan; repeat 10–15 min rest and stretch manually if needed': {
    shortKey: 'template.pizzaSicilian.finishStretchShort',
    fullKey: 'template.pizzaSicilian.finishStretch',
  },
  'Par-bake untopped crust in 18×13-inch half-sheet pan at 450 °F (232 °C)': {
    shortKey: 'template.pizzaSicilian.parBakeShort',
    fullKey: 'template.pizzaSicilian.parBake',
  },
  'Top par-baked crust with sauce, cheese, and toppings': {
    shortKey: 'template.pizzaSicilian.assemblyShort',
    fullKey: 'template.pizzaSicilian.assembly',
  },
  'Bake topped pizza at 450 °F (232 °C)': {
    shortKey: 'template.pizzaSicilian.bakeShort',
    fullKey: 'template.pizzaSicilian.bake',
  },
  'Rest before slicing': {
    shortKey: 'template.pizzaSicilian.coolShort',
    fullKey: 'template.pizzaSicilian.cool',
  },
  'Bake in electric deck oven (deck 300–320 °C, top 200 °C, static)': {
    shortKey: 'template.pizzaTeglia.bakeShort',
    fullKey: 'template.pizzaTeglia.bake',
  },
  'Mix 2 min low speed, 8 min medium speed, then incorporate butter gradually (DDT <=26 °C)': {
    shortKey: 'template.brioche.mixShort',
    fullKey: 'template.brioche.mix',
  },
  'Shape into 50 g balls, arrange 7 per loaf tin': {
    shortKey: 'template.brioche.shapeShort',
    fullKey: 'template.brioche.shape',
  },
  'Proof in proofer at 28 °C': {
    shortKey: 'template.brioche.proofShort',
    fullKey: 'template.brioche.proof',
  },
  'Brush with separate egg wash, then bake in fan-assisted oven at 180 °C': {
    shortKey: 'template.brioche.bakeShort',
    fullKey: 'template.brioche.bake',
  },
  'Shape each piece into a ball and flatten to about 3 inches': {
    shortKey: 'template.burgerBuns.shapeShort',
    fullKey: 'template.burgerBuns.shape',
  },
  'Brush with half the separate 43 g melted butter, then bake on sheet at 375 °F (191 °C)': {
    shortKey: 'template.burgerBuns.bakeShort',
    fullKey: 'template.burgerBuns.bake',
  },
  'Brush with remaining glaze butter and cool on rack': {
    shortKey: 'template.burgerBuns.coolShort',
    fullKey: 'template.burgerBuns.cool',
  },
  'Mix by machine to full gluten development (DDT 24–26 °C)': {
    shortKey: 'template.pullman.mixShort',
    fullKey: 'template.pullman.mix',
  },
  'Shape oblong bâtard and place in prepared lidded 13x4x4-inch Pullman pan': {
    shortKey: 'template.pullman.shapeShort',
    fullKey: 'template.pullman.shape',
  },
  'Proof in prepared 13x4x4-inch Pullman pan with the lid off': {
    shortKey: 'template.pullman.proofShort',
    fullKey: 'template.pullman.proof',
  },
  'Home bake covered in lidded 13x4x4-inch Pullman pan at 200 °C': {
    shortKey: 'template.pullman.bakeShort',
    fullKey: 'template.pullman.bake',
  },
  'Remove lid, invert loaf onto wire rack, bake vented at 200 °C': {
    shortKey: 'template.pullman.bakeVentedShort',
    fullKey: 'template.pullman.bakeVented',
  },
  'Cook 14 g flour, 43 g water and 43 g milk on low heat until thickened': {
    shortKey: 'template.shokupan.tangzhongShort',
    fullKey: 'template.shokupan.tangzhong',
  },
  'Cool tangzhong to lukewarm before mixing; 60 min is an editable editorial allowance': {
    shortKey: 'template.shokupan.tangzhongCoolShort',
    fullKey: 'template.shokupan.tangzhongCool',
  },
  'Roll and fold each piece into a 4-inch log, place in 9x5-inch loaf pan': {
    shortKey: 'template.shokupan.shapeShort',
    fullKey: 'template.shokupan.shape',
  },
  'Brush with separate milk wash, then bake in 9x5-inch loaf pan at 350 °F (177 °C)': {
    shortKey: 'template.shokupan.bakeShort',
    fullKey: 'template.shokupan.bake',
  },
};

export const getCuratedStepPresentation = (
  label: string | undefined,
): CuratedStepPresentation | undefined => {
  if (!label) return undefined;
  return Object.hasOwn(TEMPLATE_STEP_LABELS, label) ? TEMPLATE_STEP_LABELS[label] : undefined;
};

/** Typed access to the catalogs and to locale-aware formatting. */
export const useMessages = () => {
  const intl = useIntl();
  const t = (key: MessageKey, values?: Values): string => intl.formatMessage({ id: key }, values);
  const grams = (value: number) => formatGrams(value, intl.locale);
  const pct = (value: number) => formatPct(value, intl.locale);
  const wholePct = (value: number) => formatWholePct(value, intl.locale);
  const flours = useFlourCatalog();

  /** Display name of a flour entry: a personal one by its name, a built-in one by message key. */
  const flourName = (entry: FlourEntry): string =>
    !entry.builtIn && entry.name ? entry.name : catalogName(entry.id);

  const catalogName = (id: string): string => {
    const key = `name.${id}`;
    return key in en ? t(key as MessageKey) : id;
  };

  /**
   * Display name of an ingredient, flour or component: a personal flour entry by its name
   * (flours.md), else a known id by its catalog key until the ingredient registry (#26) covers
   * the other ingredients; an unknown id is shown as is.
   */
  const name = (id: string): string => {
    const entry = flours.entry(id);
    return entry ? flourName(entry) : catalogName(id);
  };

  /** Display name of a component: its style from the liquid ratio, else its kind (formula.md). */
  const componentName = (formula: Formula, component: Component): string =>
    t(`style.${componentStyle(formula, component) ?? component.kind}`);

  /** Display name of a process step: its curated short name, its custom label, else its operation. */
  const stepName = (step: { readonly operation: string; readonly label?: string }): string => {
    if (step.label) {
      const curated = getCuratedStepPresentation(step.label);
      if (curated) {
        return t(curated.shortKey);
      }
      return step.label;
    }
    const key = `operation.${step.operation}`;
    return key in en ? t(key as MessageKey) : step.operation;
  };

  /** Full localized instructions for steps with curated instructions (e.g. built-in templates). */
  const stepInstructions = (step: { readonly label?: string }): string | undefined => {
    const curated = getCuratedStepPresentation(step.label);
    return curated ? t(curated.fullKey) : undefined;
  };

  const nameOf = (id: string) => name(id);

  /** Maps an engine error code to a localized message (engine messages are never shown). */
  const error = (failure: DomainError): string => {
    const details = (failure.details ?? {}) as Record<string, unknown>;
    // A refusal may name its field for a more precise message (e.g. a locked total water).
    const precise = `error.${failure.code}.${String(details.field)}`;
    const key = precise in en ? precise : `error.${failure.code}`;
    if (!(key in en)) return t('error.unknown', { code: failure.code });
    const values: Values = {};
    for (const [name, value] of Object.entries(details)) {
      if (typeof value === 'number') values[name.replace(/Grams$/, '')] = grams(value);
      else if (typeof value === 'string') values[name] = value;
      else if (Array.isArray(value)) values[name] = value.map(String).map(nameOf).join(', ');
    }
    return t(key as MessageKey, values);
  };

  return {
    t,
    grams,
    pct,
    wholePct,
    name,
    flourName,
    componentName,
    stepName,
    stepInstructions,
    error,
    locale: intl.locale,
  };
};
