import type { Locale } from './messages';

export const navigationCopy = {
  carouselLabel: ['Carrousel des sections de recette', 'Recipe section carousel'],
  swipeHint: ['Glisser horizontalement pour changer d’onglet', 'Swipe horizontally to change tabs'],
  previousSection: ['Section précédente', 'Previous section'],
  nextSection: ['Section suivante', 'Next section'],
  navA: ['Variante A (contextuelle)', 'Variant A (contextual)'],
  inspectorToggle: ['Inspecteur d’interface', 'UI Inspector'],
} as const;

export type NavigationCopyKey = keyof typeof navigationCopy;

export function navCopyT(locale: Locale, key: NavigationCopyKey): string {
  const entry = navigationCopy[key];
  if (!entry) return key;
  return locale === 'fr' ? entry[0] : entry[1];
}
