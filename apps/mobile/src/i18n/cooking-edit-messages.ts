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
  'cooking.edit.levelValue': 'Power level',
  'cooking.edit.levelOf': 'Scale maximum',
  'cooking.edit.scaleHelp': 'Specify a power level to set a scale.',
  'cooking.edit.fan': 'Fan state',
  'cooking.edit.fan.on': 'On',
  'cooking.edit.fan.off': 'Off',
  'cooking.edit.fan.unknown': 'Unknown',
  'cooking.edit.steamSource': 'Steam source',
  'cooking.edit.steam.function': 'Appliance function',
  'cooking.edit.steam.manual': 'Manual addition',
  'cooking.edit.steam.none': 'No steam',
  'cooking.edit.steamDetail': 'Steam detail',
  'cooking.edit.steamDetailPlaceholder': 'e.g. Ice cubes in a tray',
  'cooking.edit.steamDetailHelp': 'Select a steam source to add details.',
  'cooking.edit.cancel': 'Cancel',
  'cooking.edit.ok': 'OK',
  'error.InvalidProcess.equipmentModeNeedsOven':
    'An oven mode requires an oven. Clear the mode before changing the appliance.',
  'error.InvalidProcess.equipmentHeatNeedsCustom':
    'Custom heat sources are only allowed when the oven mode is set to custom. Clear heat sources before changing the mode.',
  'error.InvalidProcess.equipmentLevelValueMin':
    'Power level must be greater than or equal to zero.',
  'error.InvalidProcess.equipmentLevelOfMin': 'Scale must be greater than zero.',
  'error.InvalidProcess.equipmentLevelValueAtMostOf': 'Power level cannot exceed the scale.',
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
  'cooking.edit.levelValue': 'Niveau de puissance',
  'cooking.edit.levelOf': 'Maximum de l’échelle',
  'cooking.edit.scaleHelp': 'Renseigner un niveau pour définir une échelle.',
  'cooking.edit.fan': 'Ventilation',
  'cooking.edit.fan.on': 'Activée',
  'cooking.edit.fan.off': 'Désactivée',
  'cooking.edit.fan.unknown': 'Inconnue',
  'cooking.edit.steamSource': 'Source de vapeur',
  'cooking.edit.steam.function': 'Fonction de l’appareil',
  'cooking.edit.steam.manual': 'Ajout manuel',
  'cooking.edit.steam.none': 'Sans vapeur',
  'cooking.edit.steamDetail': 'Détail de la vapeur',
  'cooking.edit.steamDetailPlaceholder': 'Ex. Glaçons dans un plat',
  'cooking.edit.steamDetailHelp': 'Sélectionner une source de vapeur pour préciser des détails.',
  'cooking.edit.cancel': 'Annuler',
  'cooking.edit.ok': 'Valider',
  'error.InvalidProcess.equipmentModeNeedsOven':
    'Un mode de four nécessite un four. Effacer le mode avant de changer d’appareil.',
  'error.InvalidProcess.equipmentHeatNeedsCustom':
    'Les sources de chaleur personnalisées ne sont autorisées qu’avec le mode personnalisé. Effacer les sources de chaleur avant de changer de mode.',
  'error.InvalidProcess.equipmentLevelValueMin':
    'Le niveau de puissance doit être supérieur ou égal à zéro.',
  'error.InvalidProcess.equipmentLevelOfMin':
    'Le maximum de l’échelle doit être strictement supérieur à zéro.',
  'error.InvalidProcess.equipmentLevelValueAtMostOf':
    'Le niveau de puissance ne peut pas dépasser l’échelle.',
} as const;

export type CookingEditMessageKey = keyof typeof cookingEditEn;
