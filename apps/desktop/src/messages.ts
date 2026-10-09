/** Menu and dialog texts of the desktop shell (ADR 0009): English source, French catalog. */
export const en = {
  'menu.view': 'View',
  'menu.device': 'Phone',
  'menu.zoom': 'Window size',
  'menu.disableGpu': 'Disable GPU acceleration (restart)',
  'menu.forceSrgb': 'Force the sRGB colour profile (restart)',
  'menu.reload': 'Reload',
  'menu.devTools': 'Developer tools',
  'menu.data': 'Data',
  'menu.openData': 'Open the data folder',
  'menu.quit': 'Quit',
  'restart.message': 'This setting applies after a restart.',
  'restart.now': 'Restart now',
  'restart.later': 'Later',
};

export type MessageKey = keyof typeof en;

export const fr: Record<MessageKey, string> = {
  'menu.view': 'Affichage',
  'menu.device': 'Téléphone',
  'menu.zoom': 'Taille de la fenêtre',
  'menu.disableGpu': 'Désactiver l’accélération GPU (redémarrage)',
  'menu.forceSrgb': 'Forcer le profil de couleur sRGB (redémarrage)',
  'menu.reload': 'Recharger',
  'menu.devTools': 'Outils de développement',
  'menu.data': 'Données',
  'menu.openData': 'Ouvrir le dossier des données',
  'menu.quit': 'Quitter',
  'restart.message': 'Ce réglage s’applique après un redémarrage.',
  'restart.now': 'Redémarrer maintenant',
  'restart.later': 'Plus tard',
};

export const catalogFor = (locale: string): Record<MessageKey, string> =>
  locale.toLowerCase().startsWith('fr') ? fr : en;
