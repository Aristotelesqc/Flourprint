/**
 * Translation catalogs for step equipment and cooking authoring (Recipe #169, L71, L89, L129).
 * Spreads into apps/mobile/src/i18n/messages.ts.
 */

export const cookingEditEn = {
  'cooking.edit.title': 'Cooking & equipment',
  'cooking.edit.appliance': 'Appliance',
  'cooking.edit.otherAppliance': 'Other appliance',
  'cooking.edit.mode': 'Oven mode',
  'cooking.edit.notSpecified': 'Not specified',
  'cooking.edit.setpoint': 'Setpoint',
  'cooking.edit.modeOvenHelp':
    'Oven modes apply when the appliance is an oven. No profile required.',
  'cooking.edit.heatSources': 'Heat sources',
  'cooking.edit.heatHelp': 'Select active heat sources for custom mode.',
  'cooking.edit.heat.top': 'Top element',
  'cooking.edit.heat.bottom': 'Bottom element',
  'cooking.edit.heat.rear': 'Rear element',
  'cooking.edit.heat.fan': 'Fan',
  'cooking.edit.cancel': 'Cancel',
  'cooking.edit.ok': 'OK',
  'error.InvalidProcess.equipmentModeNeedsOven':
    'An oven mode requires an oven. Clear the mode before changing the appliance.',
  'error.InvalidProcess.equipmentHeatNeedsCustom':
    'Custom heat sources are only allowed when the oven mode is set to custom. Clear heat sources before changing the mode.',
} as const;

export const cookingEditFr = {
  'cooking.edit.title': 'Équipement et cuisson',
  'cooking.edit.appliance': 'Appareil',
  'cooking.edit.otherAppliance': 'Autre appareil',
  'cooking.edit.mode': 'Mode du four',
  'cooking.edit.notSpecified': 'Non renseigné',
  'cooking.edit.setpoint': 'Consigne',
  'cooking.edit.modeOvenHelp': 'Les modes de four s’appliquent au four. Aucun profil requis.',
  'cooking.edit.heatSources': 'Sources de chaleur',
  'cooking.edit.heatHelp': 'Sélectionner les sources de chaleur actives pour le mode personnalisé.',
  'cooking.edit.heat.top': 'Élément du haut',
  'cooking.edit.heat.bottom': 'Élément du bas',
  'cooking.edit.heat.rear': 'Résistance arrière',
  'cooking.edit.heat.fan': 'Ventilateur',
  'cooking.edit.cancel': 'Annuler',
  'cooking.edit.ok': 'Valider',
  'error.InvalidProcess.equipmentModeNeedsOven':
    'Un mode de four nécessite un four. Effacer le mode avant de changer d’appareil.',
  'error.InvalidProcess.equipmentHeatNeedsCustom':
    'Les sources de chaleur personnalisées ne sont autorisées qu’avec le mode personnalisé. Effacer les sources de chaleur avant de changer de mode.',
} as const;

export type CookingEditMessageKey = keyof typeof cookingEditEn;
