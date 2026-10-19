import { catalogText } from './template-presentation';
export type Locale = 'fr' | 'en';

const messages = {
  appName: ['Flourprint', 'Flourprint'],
  createSelected: ['Créer', 'Create'],
  copy: ['Copie', 'Copy'],
  bakerBase: ['Base 100 % boulangère', '100% baker’s basis'],
  ingredientsWeighing: ['Ingrédients par étape · Pesée', 'Ingredients by stage · Weighing'],
  knownWater: ['Eau totale connue', 'Known total water'],
  searchOpen: ['Ouvrir la recherche', 'Open search'],
  confirmTrash: ['Déplacer dans la corbeille ?', 'Move to trash?'],
  tangzhongName: ['Tangzhong (roux d’eau)', 'Tangzhong (water roux)'],
  poolishName: ['Poolish', 'Poolish'],
  inspectUi: ['Inspecter les composants', 'Inspect components'],
  inspectionHint: [
    'Inspection active : cliquer sur un élément pour identifier son composant et ouvrir le catalogue. Désactiver pour utiliser les commandes.',
    'Inspection active: click an element to identify its component and open the catalogue. Disable inspection to use controls.',
  ],
  flourBlend: ['Mélange de farines', 'Flour blend'],
  blendHelp: [
    'Les parts doivent totaliser 100 %. Appliquer le mélange complet en une seule commande.',
    'Shares must total 100%. Apply the complete blend in one command.',
  ],
  library: ['Recettes', 'Recipes'],
  preparation: ['Préparation', 'Preparation'],
  preparationActions: ['Actions sur la préparation', 'Preparation actions'],
  registry: ['Catalogue', 'Registry'],
  settings: ['Réglages', 'Settings'],
  ingredients: ['Ingrédients', 'Ingredients'],
  steps: ['Étapes de préparation', 'Preparation steps'],
  planning: ['Planification', 'Planning'],
  history: ['Historique', 'History'],
  edit: ['Modifier', 'Edit'],
  save: ['Enregistrer', 'Save'],
  cancel: ['Annuler', 'Cancel'],
  discard: ['Abandonner', 'Discard'],
  stay: ['Rester ici', 'Stay here'],
  undo: ['Annuler la modification', 'Undo change'],
  redo: ['Rétablir', 'Redo'],
  reset: ['Réinitialiser le brouillon', 'Reset draft'],
  back: ['Retour', 'Back'],
  close: ['Fermer', 'Close'],
  start: ['Lancer', 'Start'],
  resume: ['Reprendre', 'Resume'],
  active: ['Préparation en cours', 'Running preparation'],
  new: ['Nouvelle recette', 'New recipe'],
  newShort: ['Nouvelle', 'New'],
  blank: ['Recette vierge', 'Blank recipe'],
  search: ['Rechercher une recette', 'Search recipes'],
  all: ['Toutes', 'All'],
  running: ['En cours', 'Running'],
  ready: ['Prêtes', 'Ready'],
  drafts: ['Brouillons', 'Drafts'],
  empty: ['Aucun résultat', 'No results'],
  version: ['Version', 'Version'],
  draft: ['Brouillon', 'Draft'],
  neverCooked: ['Jamais cuite', 'Never cooked'],
  coolingEnd: ['ressuage', 'cooling'],
  totalDuration: ['Jusqu’au ressuage', 'Through cooling'],
  flour: ['Farine totale', 'Total flour'],
  dough: ['Pâte assemblée', 'Assembled dough'],
  doughShort: ['Pâte', 'Dough'],
  remainingTime: ['Temps restant', 'Remaining time'],
  hydration: ['Hydratation', 'Hydration'],
  water: ['Eau', 'Water'],
  fat: ['Matières grasses', 'Fat'],
  sugar: ['Sucres', 'Sugars'],
  known: ['Part connue', 'Known portion'],
  componentShort: ['comp.', 'comp.'],
  additionsShort: ['ajouts', 'additions'],
  completeValue: ['Connu', 'Known'],
  partialTotals: [
    'Sommes partielles · composition inconnue pour',
    'Partial totals · unknown composition for',
  ],
  extrapolated: [
    'Estimation extrapolée · à interpréter avec prudence',
    'Extrapolated estimate · interpret with care',
  ],
  currentDose: ['Dose actuelle', 'Current dose'],
  freshBasis: [
    'Domaine exprimé en équivalent levure fraîche',
    'Domain expressed as fresh-equivalent yeast',
  ],
  assumptionAmbient: [
    'La température initiale de pâte est assimilée à l’ambiante.',
    'Initial dough temperature is taken from ambient.',
  ],
  assumptionTarget: [
    'La température de pâte cible est utilisée au départ.',
    'The target dough temperature is used initially.',
  ],
  assumptionReadiness: [
    'Le seuil du profil de maturité choisi est utilisé ; ce n’est pas une observation.',
    'The selected readiness profile threshold is used; it is not an observation.',
  ],
  assumptionDefault: [
    'Profil de maturité par défaut, sans calibration personnelle.',
    'Default readiness profile, without personal calibration.',
  ],
  assumptionUnplanned: [
    'Une durée intermédiaire est inconnue ; consulter les limites de projection.',
    'An intermediate duration is unknown; review projection limits.',
  ],
  assumptionUnbounded: [
    'Une borne de la plage dépasse l’horizon de recherche du modèle.',
    'A range bound exceeds the model search horizon.',
  ],
  assumptionBand: [
    'Une partie de la plage dépasse le domaine ajusté du modèle.',
    'Part of the range exceeds the fitted model domain.',
  ],
  assumptionEarly: [
    'Le seuil du modèle est atteint avant la dernière étape prévue.',
    'The model threshold is reached before the last planned stage.',
  ],
  modelRange: ['Plage du modèle', 'Model range'],
  templateDetails: ['À propos du modèle de recette', 'About this recipe template'],
  source: ['Référence', 'Reference'],
  resultCooked: ['Cuit', 'Cooked'],
  resultDough: ['Pâte préparée', 'Prepared dough'],
  resultMixed: ['Cuit et pâte conservée', 'Cooked and remaining dough'],
  finishSession: ['Terminer la préparation', 'Finish preparation'],
  outcomeChoice: ['Choisir le résultat', 'Choose outcome'],
  finishReady: [
    'Étapes terminées · préparation à terminer',
    'Steps complete · finish the preparation',
  ],
  outcome: ['Résultat', 'Outcome'],
  disposition: ['Destination de la pâte', 'Dough disposition'],
  frozen: ['Congelée', 'Frozen'],
  refrigerated: ['Réfrigérée', 'Refrigerated'],
  given: ['Donnée', 'Given'],
  sold: ['Vendue', 'Sold'],
  other: ['Autre', 'Other'],
  defaultOutcome: [
    'Résultat prévu par la recette, modifiable sans terminer.',
    'Recipe outcome; change it without finishing.',
  ],
  lastResult: ['Dernière préparation', 'Last preparation'],
  actualDuration: ['Durée réelle', 'Actual duration'],
  noRating: ['Non évaluée', 'Not rated'],
  versions: ['Versions de la recette', 'Recipe versions'],
  preparations: ['Préparations', 'Preparations'],
  activeExists: [
    'Une préparation est déjà en cours. La reprendre avant d’en lancer une autre.',
    'A preparation is already running. Resume it before starting another.',
  ],
  handles: ['Poignées visibles', 'Visible handles'],
  orderMode: ['Mode de réorganisation', 'Reorder mode'],
  estimated: ['Estimé', 'Estimated'],
  incomplete: ['Composition incomplète', 'Incomplete composition'],
  unknown: ['Inconnu', 'Unknown'],
  unknownFor: ['Composition inconnue pour', 'Unknown composition for'],
  hydrationDetails: ['Détail de l’hydratation', 'Hydration breakdown'],
  help: ['Informations', 'Information'],
  helpHydration: [
    'L’hydratation inclut l’eau apportée par tous les ingrédients. Une part connue ne représente pas un total complet.',
    'Hydration includes water from every ingredient. A known portion is not a complete total.',
  ],
  helpSize: [
    'Une seule ancre fixe la taille. Changer son type réinterprète la recette ; changer sa valeur redimensionne les quantités.',
    'One anchor fixes size. Changing its type reinterprets the recipe; changing its value rescales quantities.',
  ],
  size: ['Taille de la recette', 'Recipe size'],
  flourAnchor: ['Farine totale', 'Total flour'],
  doughAnchor: ['Poids de pâte', 'Dough weight'],
  piecesAnchor: ['Pâtons', 'Pieces'],
  count: ['Nombre', 'Count'],
  each: ['Poids par pâton', 'Weight per piece'],
  target: ['Cible d’hydratation', 'Hydration target'],
  lock: ['Verrouiller l’hydratation', 'Lock hydration'],
  unlock: ['Déverrouiller l’hydratation', 'Unlock hydration'],
  locked: [
    'Cible verrouillée : l’eau choisie absorbe les ajustements.',
    'Locked target: the selected water absorbs adjustments.',
  ],
  absorbing: ['Eau d’ajustement', 'Adjusting water'],
  invalid: ['Saisir un nombre complet et valide.', 'Enter a complete valid number.'],
  refused: ['Modification refusée par le moteur.', 'The engine refused this change.'],
  unsaved: ['Modifications non enregistrées', 'Unsaved changes'],
  saveBeforeStart: [
    'Enregistrer la recette avant de lancer une préparation.',
    'Save the recipe before starting a preparation.',
  ],
  weighed: ['Pesés', 'Weighed'],
  checkScope: ['Pesée temporaire de recette', 'Temporary recipe weighing'],
  sessionScope: ['Pesée de cette préparation', 'Weighing for this preparation'],
  flourShare: ['% de la farine totale', '% of total flour'],
  massPct: ['% du poids de farine totale', '% of total flour weight'],
  bakerPct: ['% du boulanger', 'baker’s %'],
  additions: ['Ajouts finaux', 'Final additions'],
  assembled: ['Pâte assemblée après incorporation', 'Assembled dough after incorporation'],
  incorporate: [
    'Incorporer le composant préparé, déjà compté',
    'Incorporate the prepared component, already counted',
  ],
  totals: ['Totaux de la formule assemblée', 'Assembled formula totals'],
  totalRecipe: ['Total recette', 'Recipe total'],
  component: ['Composant', 'Component'],
  components: ['Composants et ratios', 'Components and ratios'],
  ratio: ['Ratio farine:liquide', 'Flour:liquid ratio'],
  ratioHelp: [
    'Parts de liquide pour 1 part de farine ; conversion par le moteur.',
    'Liquid parts per 1 part flour; converted by the engine.',
  ],
  addComponent: ['Ajouter un composant', 'Add component'],
  remove: ['Supprimer', 'Remove'],
  confirmRemove: ['Confirmer la suppression', 'Confirm removal'],
  addIngredient: ['Ajouter un ingrédient', 'Add ingredient'],
  ingredientName: ['Nom de l’ingrédient', 'Ingredient name'],
  type: ['Type', 'Type'],
  plain: ['Ingrédient', 'Ingredient'],
  name: ['Nom', 'Name'],
  addStep: ['Ajouter une étape', 'Add step'],
  editStep: ['Modifier l’étape', 'Edit step'],
  duration: ['Durée', 'Duration'],
  temperature: ['Température', 'Temperature'],
  technique: ['Technique', 'Technique'],
  dependencies: ['Après', 'After'],
  equipment: ['Équipement', 'Equipment'],
  mode: ['Mode de four', 'Oven mode'],
  steam: ['Vapeur', 'Steam'],
  vessel: ['Récipient', 'Vessel'],
  location: ['Lieu', 'Location'],
  optional: ['Non renseigné', 'Not specified'],
  none: ['Aucun', 'None'],
  unknownDuration: ['Durée inconnue', 'Unknown duration'],
  manual: ['Manuelle', 'Manual'],
  model: ['Modèle', 'Model'],
  durationMode: ['Durée : mode', 'Duration: mode'],
  grouped: ['Étapes groupées', 'Grouped steps'],
  timeline: ['Ligne de temps', 'Timeline'],
  order: ['Ordre', 'Reorder'],
  done: ['Terminer', 'Done'],
  up: ['Monter', 'Move up'],
  down: ['Descendre', 'Move down'],
  duplicate: ['Dupliquer', 'Duplicate'],
  preview: ['Aperçu du déplacement', 'Move preview'],
  apply: ['Appliquer', 'Apply'],
  refusedMove: [
    'Le graphe refuse cet ordre. Conserver les dépendances ou choisir un autre emplacement.',
    'The graph refuses this order. Preserve dependencies or choose another position.',
  ],
  before: ['Avant', 'Before'],
  after: ['Après', 'After'],
  relative: ['Heures relatives au départ', 'Times relative to start'],
  startAt: ['Départ prévu', 'Planned start'],
  setpoint: ['Température de consigne', 'Setpoint temperature'],
  instructionBoil: [
    'Pocher la pâte selon les consignes de la recette.',
    'Poach the dough following the recipe instructions.',
  ],
  instructionSteam: [
    'Cuire à la vapeur selon les consignes de la recette.',
    'Steam following the recipe instructions.',
  ],
  instructionFry: [
    'Frire selon les consignes de la recette.',
    'Fry following the recipe instructions.',
  ],
  instructionPanCook: [
    'Cuire à la poêle selon les consignes de la recette.',
    'Pan-cook following the recipe instructions.',
  ],
  instructionGrill: [
    'Cuire au barbecue selon les consignes de la recette.',
    'Grill following the recipe instructions.',
  ],
  instructionDivide: [
    'Diviser la pâte selon les quantités prévues.',
    'Divide the dough into the planned portions.',
  ],
  instructionFold: [
    'Effectuer les rabats prévus par la recette.',
    'Perform the folds specified in the recipe.',
  ],
  schedule: ['Placement de l’étape', 'Stage scheduling'],
  asap: ['Dès que possible', 'As soon as possible'],
  alap: ['Juste à temps pour la suite', 'Just in time for the next stage'],
  planDirection: ['Fixer l’horaire', 'Set the schedule'],
  readyBy: ['Fin d’une étape', 'Finish a stage by'],
  targetStep: ['Étape cible', 'Target stage'],
  finish: ['Fin prévue', 'Expected end'],
  total: ['Durée totale', 'Total duration'],
  generated: [
    'Projection générée à partir des étapes de la recette.',
    'Projection generated from recipe steps.',
  ],
  unknownAfter: ['Horaire inconnu après', 'Timing unknown after'],
  diagnostics: ['Fermentation', 'Fermentation'],
  valid: ['Dans le domaine du modèle', 'Within the model domain'],
  outOfDomain: ['Dose actuelle hors du domaine', 'Current dose outside the domain'],
  noResult: ['Aucun résultat exploitable', 'No supported result'],
  candidate: ['Candidat inverse pour le plan', 'Inverse candidate for this plan'],
  applyCandidate: ['Appliquer au brouillon', 'Apply to draft'],
  estimate: ['Durée estimée', 'Estimated duration'],
  assumptions: ['Hypothèses et limites', 'Assumptions and limitations'],
  currentRecipe: ['Recette actuelle', 'Current recipe'],
  note: ['Note', 'Note'],
  photo: ['Photo', 'Photo'],
  journal: ['Journal', 'Journal'],
  add15: ['+15 min', '+15 min'],
  stageComplete: ['Étape terminée', 'Step complete'],
  stageStart: ['Commencer l’étape', 'Start step'],
  started: ['Début', 'Started'],
  remaining: ['restantes', 'remaining'],
  elapsed: ['écoulées', 'elapsed'],
  progress: ['Progression de l’étape', 'Step progress'],
  readyShape: ['Prête à façonner', 'Ready to shape'],
  readyCook: ['Prête à cuire', 'Ready to cook'],
  observed: ['Observation enregistrée', 'Observation recorded'],
  upcoming: ['Étapes à venir', 'Upcoming steps'],
  completed: ['Étapes terminées', 'Completed steps'],
  completeSession: ['Préparation terminée', 'Preparation complete'],
  snapshotFrozen: ['Données figées au lancement', 'Data frozen at start'],
  quantities: ['Quantités figées', 'Frozen quantities'],
  instructions: ['Consignes', 'Instructions'],
  photoDemo: ['Simulation de photo', 'Photo simulation'],
  photoHelp: [
    'Ajouter un repère photo fictif au journal, sans accès à la caméra.',
    'Add a simulated photo marker to the journal without accessing a camera.',
  ],
  photoAdded: ['Repère photo ajouté', 'Photo marker added'],
  noPreparations: ['Aucune préparation terminée.', 'No completed preparations.'],
  noSession: ['Aucune préparation en cours', 'No running preparation'],
  startRecorded: ['Préparation lancée', 'Preparation started'],
  timeChanged: ['Durée ajustée', 'Duration adjusted'],
  stepRecorded: ['Étape terminée', 'Step completed'],
  noJournal: ['Aucune note pour le moment', 'No notes yet'],
  recipeActions: ['Actions sur la recette', 'Recipe actions'],
  navigation: ['Navigation', 'Navigation'],
  trash: ['Mettre à la corbeille', 'Move to trash'],
  trashed: ['Recette mise à la corbeille', 'Recipe moved to trash'],
  copyBuild: ['Copier la version', 'Copy build identity'],
  copied: ['Copié', 'Copied'],
  copyFallback: [
    'Copie indisponible : sélectionner ce texte.',
    'Copy unavailable: select this text.',
  ],

  resetDemo: ['Réinitialiser la démonstration', 'Reset demonstration'],
  historyEmpty: ['Aucune révision précédente.', 'No previous revision.'],
  catalogue: ['Catalogue de composants', 'Component catalogue'],
  appearance: ['Apparence', 'Appearance'],
  light: ['Clair', 'Light'],
  dark: ['Sombre chaud', 'Warm dark'],
  amoled: ['AMOLED', 'AMOLED'],
  catalogueIntro: [
    'Les exemples utilisent les mêmes composants React que les écrans.',
    'Examples use the same React components as the screens.',
  ],
  milk: ['Lait entier', 'Whole milk'],
  milkPowder: ['Lait en poudre', 'Milk powder'],
  butter: ['Beurre doux', 'Unsalted butter'],
  egg: ['Œuf', 'Egg'],
  salt: ['Sel', 'Salt'],
  yeast: ['Levure instantanée', 'Instant yeast'],
  breadFlour: ['Farine de pain', 'Bread flour'],
  shokupan: ['Shokupan', 'Shokupan'],
  baguette: ['Baguette de tradition', 'Traditional baguette'],
  brioche: ['Brioche Nanterre', 'Brioche Nanterre'],
  instructionScald: [
    'Chauffer les ingrédients du tangzhong à feu doux jusqu’à épaississement.',
    'Heat the tangzhong ingredients over low heat until thickened.',
  ],
  instructionCool: ['Laisser tiédir avant incorporation.', 'Allow to cool before incorporating.'],
  instructionMix: [
    'Pétrir avec les ajouts finaux jusqu’à obtenir une pâte homogène.',
    'Mix with final additions until the dough is homogeneous.',
  ],
  instructionBulk: [
    'Laisser fermenter en masse ; observer le développement de la pâte.',
    'Ferment in bulk; observe dough development.',
  ],
  instructionShape: [
    'Façonner puis disposer dans le moule prévu.',
    'Shape and place in the intended pan.',
  ],
  instructionProof: [
    'Laisser lever jusqu’au critère de fin choisi.',
    'Proof until the chosen end criterion.',
  ],
  instructionBake: [
    'Cuire selon la température et l’équipement indiqués.',
    'Cook using the displayed temperature and equipment.',
  ],
  instructionRest: [
    'Suivre les paramètres et le critère de fin de cette étape.',
    'Follow this step’s settings and end criterion.',
  ],
  topBottom: ['Sole + voûte', 'Top + bottom heat'],
  convection: ['Sole + ventilation', 'Bottom heat + fan'],
  trueConvection: ['Chaleur tournante arrière', 'Rear-element convection'],
  broil: ['Gril supérieur', 'Top grill'],
  steamNone: ['Sans ajout de vapeur', 'No added steam'],
  steamFunction: ['Fonction vapeur', 'Steam function'],
  steamManual: ['Vapeur manuelle', 'Manual steam'],
  leaveDraft: ['Quitter le brouillon ?', 'Leave this draft?'],
  helpLock: [
    'Le moteur refuse une cible incompatible ou une composition insuffisamment connue. Une erreur conserve la saisie.',
    'The engine refuses an incompatible target or insufficiently known composition. Errors preserve the input.',
  ],
  stepsTab: ['Étapes', 'Steps'],
  reorderHelp: [
    'Choisir Monter ou Descendre. L’ordre d’affichage change directement ; un changement de dépendances demande une vérification. Les cas ambigus sont refusés.',
    'Choose Move up or Move down. Display-only moves apply immediately; dependency changes require review. Ambiguous cases are refused.',
  ],
  changeDependenciesUnchanged: [
    'Les dépendances et les horaires restent inchangés.',
    'Dependencies and scheduled times stay unchanged.',
  ],
  changeAffectedSteps: ['Étapes touchées', 'Affected steps'],
  changeBefore: ['Avant', 'Before'],
  changeAfter: ['Après', 'After'],
  changeDependencies: ['Dépend de', 'Depends on'],
  changeNoDependencies: ['Aucun préalable', 'No prerequisite'],
  changeNewStep: ['Nouvelle étape', 'New step'],
  changeDurationRequired: ['Durée à préciser', 'Duration required'],
  changeNoProjection: [
    'Horaire inconnu : vérifier la durée et les dépendances.',
    'Schedule unknown: check the duration and dependencies.',
  ],
  changeCandidateOrder: ['Ordre proposé', 'Proposed order'],
  changeWindows: ['Fenêtres de préparation', 'Preparation windows'],
  changeNotCarried: ['Non repris dans la copie', 'Not carried into the copy'],
  changeDroppedIncorporations: ['Incorporations', 'Incorporations'],
  changeDroppedEstimate: [
    'Estimation acceptée et provenance du modèle',
    'Accepted estimate and model provenance',
  ],
  changeDroppedDurationMode: ['Suivi automatique du modèle', 'Automatic model tracking'],
  changeDroppedDuration: ['Durée issue du modèle', 'Model-derived duration'],
  changeChain: [
    'Ce déplacement change les dépendances. Vérifier les étapes touchées avant d’appliquer.',
    'This move changes dependencies. Review the affected steps before applying.',
  ],
  changeOrderOnly: ['Seul l’ordre d’affichage change.', 'Only the display order changes.'],
  changeApplied: [
    'Modification des étapes appliquée au brouillon.',
    'Step change applied to the draft.',
  ],
  changeStale: [
    'Le brouillon a changé depuis cet aperçu. Fermer et refaire la demande depuis l’état actuel.',
    'The draft changed after this preview. Close it and make the request again from the current state.',
  ],
  changeRefused: ['Modification refusée', 'Change refused'],
  changeCopyRefused: [
    'La copie ne peut pas être créée dans ce contexte.',
    'The copy cannot be created in this context.',
  ],
  changeCopyNextAction: [
    'Revoir les paramètres dans Modifier l’étape, ou ajouter une nouvelle étape avec ses propres paramètres.',
    'Review settings in Edit step, or add a new step with its own settings.',
  ],
  changeEditDependencies: [
    'Choisir un autre emplacement ou ouvrir Modifier l’étape pour revoir les dépendances explicitement.',
    'Choose another position or open Edit step to review dependencies explicitly.',
  ],
  changeBreaksDependencies: [
    'L’étape passerait avant un préalable, ou après une étape qui en dépend. Le graphe est conservé.',
    'The step would precede a prerequisite or follow a step that depends on it. The graph is preserved.',
  ],
  changeCopyComponentRefused: [
    'Cette étape représente le composant préparé. Une copie de ce rôle est ambiguë.',
    'This step represents the prepared component. Copying that role is ambiguous.',
  ],
  changeCopyScheduleRefused: [
    'Cette étape est placée au plus tard par le planificateur et ne peut pas être dupliquée.',
    'This step is scheduled as late as possible and cannot be duplicated.',
  ],
  changeIncorporationRefused: [
    'Le déplacement changerait le moment d’incorporation. Modifier les dépendances explicitement.',
    'The move would change when ingredients are incorporated. Edit dependencies explicitly.',
  ],
  changeSubjectRefused: [
    'Le déplacement traverserait une autre pâte ou un autre composant. Le travail concerné reste inchangé.',
    'The move would cross into another dough or component. Its workpiece remains unchanged.',
  ],
  changeBranchRefused: [
    'Plusieurs branches empêchent de déterminer un enchaînement unique. Modifier les dépendances explicitement.',
    'Multiple branches prevent an unambiguous chain change. Edit dependencies explicitly.',
  ],
  groupHelp: [
    'Afficher les étapes par composant préparé ou suivre leur ordre dans la ligne de temps.',
    'View steps by prepared component, or follow their order in the timeline.',
  ],
  invalidPlan: [
    'Projection indisponible : vérifier les paramètres et les dépendances.',
    'Projection unavailable: check settings and dependencies.',
  ],
  compose: ['Composition', 'Composition'],
  waterContent: ['Teneur en eau', 'Water content'],
  unknownComposition: ['Composition en eau inconnue', 'Unknown water composition'],
  completedState: ['Terminée', 'Completed'],
  runningState: ['En cours', 'Running'],
  demoOnly: [
    'Maquette interactive · données en mémoire · réinitialisation au rechargement',
    'Interactive mockup · in-memory data · reload resets everything',
  ],
  readyTarget: [
    'Point final du modèle expérimental ; ne garantit pas une pâte prête.',
    'Experimental model endpoint; does not guarantee dough readiness.',
  ],
  modelLimits: [
    'Domaine : 1,7 à 35 °C ; levure équivalente fraîche 0,01 à 3 %. Les résultats dépendent de la composition et du plan.',
    'Domain: 1.7 to 35 °C; fresh-equivalent yeast 0.01 to 3%. Results depend on composition and schedule.',
  ],
  notePrompt: ['Texte de la note', 'Note text'],
  attachPhoto: ['Ajouter le repère simulé', 'Add simulated marker'],
  restore: ['Restaurer', 'Restore'],
  snapshotHelp: [
    'La recette peut être modifiée sans changer les quantités de cette préparation.',
    'The recipe can change without changing this preparation’s quantities.',
  ],
  versionTitle: ['Flourprint · maquette 0.3', 'Flourprint · 0.3 mockup'],
  filter: ['Filtre', 'Filter'],
  templates: ['Modèles de départ', 'Starting templates'],
  clearChecks: ['Effacer les coches', 'Clear checks'],
  checksChoice: [
    'Choix de conception : conserver les coches pendant la visite ou les effacer au changement de recette.',
    'Design choice: keep checks during this visit or clear them when switching recipes.',
  ],
  keepChecks: ['Conserver pendant la visite', 'Keep during this visit'],
  resetChecks: ['Effacer au changement', 'Clear when switching'],
  showGallery: ['Galerie et captures', 'Gallery and screenshots'],
  baseline: ['Application avant la proposition', 'Application before this proposal'],
  cook: ['Cuire', 'Cook'],
  result: ['Résultat', 'Outcome'],
  editable: ['Saisie libre', 'Free entry'],
  navigationChoice: ['Navigation à comparer', 'Navigation to compare'],
  targetChoice: ['Taille des cibles tactiles', 'Touch target size'],
  motionChoice: ['Animation', 'Motion'],
  motionStandard: ['Standard', 'Standard'],
  motionReduced: ['Réduite', 'Reduced'],
  modelReferenceCase: ['Cas de référence du modèle', 'Model reference case'],
  bigaName: ['Biga', 'Biga'],
  yudaneName: ['Yudane', 'Yudane'],
  scaldName: ['Échaudage', 'Scald'],
  prefermentName: ['Préferment', 'Preferment'],
  soakerName: ['Trempe', 'Soaker'],
  customComponentName: ['Composant personnalisé', 'Custom component'],
} as const;

export type MessageKey = keyof typeof messages;
export const t = (locale: Locale, key: MessageKey): string =>
  messages[key]?.[locale === 'fr' ? 0 : 1] ?? messages[key]?.[0] ?? (key as string);

const operationNames: Record<string, readonly [string, string]> = {
  scald: ['Échaudage', 'Scald'],
  mix: ['Pétrissage', 'Mix'],
  bulk: ['Pointage', 'Bulk fermentation'],
  proof: ['Apprêt', 'Proof'],
  shape: ['Façonnage', 'Shape'],
  divide: ['Division', 'Divide'],
  degas: ['Dégazage', 'Degas'],
  preheat: ['Préchauffage', 'Preheat'],
  bake: ['Cuisson', 'Bake'],
  cool: ['Ressuage', 'Cool'],
  retard: ['Fermentation au froid', 'Cold fermentation'],
  preferment: ['Préferment', 'Preferment'],
  fold: ['Rabat', 'Fold'],
  rest: ['Repos', 'Rest'],
  autolyse: ['Autolyse', 'Autolyse'],
  boil: ['Pochage', 'Boil'],
  fry: ['Friture', 'Fry'],
};
export const operationName = (locale: Locale, operation: string): string =>
  operationNames[operation]?.[locale === 'fr' ? 0 : 1] ??
  catalogText(locale, `operation.${operation}`) ??
  operation;
const ingredientKeys: Record<string, MessageKey> = {
  'bread-flour': 'breadFlour',
  water: 'water',
  milk: 'milk',
  'milk-powder': 'milkPowder',
  sugar: 'sugar',
  salt: 'salt',
  butter: 'butter',
  egg: 'egg',
  'instant-yeast': 'yeast',
};
export const ingredientName = (
  locale: Locale,
  id: string,
  names: Record<string, string> = {},
): string =>
  names[id] ??
  catalogText(locale, `name.${id}`) ??
  (ingredientKeys[id] ? t(locale, ingredientKeys[id]) : id.replaceAll('-', ' '));
export const colon = (locale: Locale): string => (locale === 'fr' ? ' : ' : ': ');
export const formatColon = (locale: Locale, label: string, value: string): string =>
  locale === 'fr' ? `${label} : ${value}` : `${label}: ${value}`;

export const percentSuffix = (locale: Locale): string => (locale === 'fr' ? ' %' : '%');
export const formatPercent = (locale: Locale, value: number, digits = 1): string => {
  const formatted = num(locale, value, digits);
  return locale === 'fr' ? `${formatted} %` : `${formatted}%`;
};
export const percent = (locale: Locale, points: number, digits = 1): string => {
  const formatted = num(locale, points, digits);
  return locale === 'fr' ? `${formatted} %` : `${formatted}%`;
};

export const num = (locale: Locale, value: number, digits = 1): string =>
  new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    maximumFractionDigits: digits,
  }).format(value);
export const grams = (locale: Locale, value: number): string => `${num(locale, value)} g`;
export const time = (locale: Locale, instant?: string): string =>
  instant
    ? new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(instant))
    : t(locale, 'unknown');
export const duration = (locale: Locale, seconds?: number): string => {
  if (seconds === undefined) return t(locale, 'unknownDuration');
  const minutes = Math.max(0, Math.ceil(seconds / 60));
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
    : `${minutes} min`;
};

const styleKeys: Record<string, MessageKey> = {
  tangzhong: 'tangzhongName',
  poolish: 'poolishName',
  biga: 'bigaName',
  yudane: 'yudaneName',
  scald: 'scaldName',
  preferment: 'prefermentName',
  soaker: 'soakerName',
  custom: 'customComponentName',
};

export const styleName = (locale: Locale, style?: string): string | undefined => {
  if (!style) return undefined;
  const key = styleKeys[style];
  if (key) return t(locale, key);
  return catalogText(locale, `style.${style}`) ?? catalogText(locale, `component.${style}`);
};

export const componentName = (
  locale: Locale,
  id: string,
  names: Record<string, string> = {},
  style?: string,
): string => {
  // Preserve user custom name if explicitly provided
  if (names[id]) return names[id];

  // If a known style is provided (from core componentStyle or resolved component), prioritize it
  // so autogenerated IDs (e.g. c-123, yudane-1) never leak as raw display names
  if (style) {
    const styled = styleName(locale, style);
    if (styled) return styled;
  }

  // Check known ID lookups
  if (styleKeys[id]) {
    return t(locale, styleKeys[id]);
  }

  const catalogMatch =
    catalogText(locale, `component.${id}`) ??
    catalogText(locale, `name.${id}`) ??
    catalogText(locale, `style.${id}`);
  if (catalogMatch) return catalogMatch;

  // Fallback avoiding raw dashes/slugs
  return id
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const vesselName = (
  locale: Locale,
  vesselId: string,
  customNames: Record<string, string> = {},
): string => {
  if (customNames[vesselId]) return customNames[vesselId];
  const catalog =
    catalogText(locale, `equipment.${vesselId}.name`) ??
    catalogText(locale, `equipment.${vesselId}`);
  if (catalog) return catalog;
  return vesselId
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};
