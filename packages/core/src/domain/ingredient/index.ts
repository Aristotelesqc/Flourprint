export * from './types.js';
export {
  BUILT_IN_INGREDIENT_VERSION,
  BUILT_IN_INGREDIENT_VERSIONS,
  BUILT_IN_INGREDIENTS,
  builtInIngredient,
  isBuiltInIngredientId,
  unknownComposition,
  unknownIngredientProperties,
} from './builtin.js';
export {
  customizeIngredient,
  duplicateIngredient,
  effectiveIngredient,
  ingredientEntryFrom,
  ingredientEntryWarnings,
  isCustomization,
  newIngredientEntry,
  nextIngredientVersion,
  validateIngredientEntry,
  withIngredientChanges,
  type IngredientEntryChanges,
  type IngredientEntryError,
  type IngredientEntryWarning,
} from './entry.js';
export {
  contentOf,
  entryContents,
  ingredientRefOf,
  ingredientUsedProperties,
  refersTo,
  sourceText,
  type EntryContents,
  type IngredientUsedProperty,
} from './mapping.js';
