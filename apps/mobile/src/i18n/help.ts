/**
 * Explanations behind the ⓘ buttons (ADR 0009). One topic = a title, one to three short
 * paragraphs (`body1` to `body3`) and an optional `more` detail. They describe what the app does
 * according to docs/contracts/, never more.
 */
export const helpEn = {
  'help.button': 'Explanation: {term}',
  'help.close': 'Close',
  'help.more': 'Learn more',
  'help.less': 'Show less',

  'help.anchor.title': 'Recipe size: flour, dough or pieces',
  'help.anchor.body1':
    'The size fixes the batch. Every gram of the recipe is computed from it and from the percentages.',
  'help.anchor.body2':
    'Flour: you give the total weight of flour. Dough: you give the weight of the final dough and the flour follows. Pieces: you give a count and the weight of one piece; the dough weighs count × weight.',
  'help.anchor.body3':
    'Switching the kind keeps every gram and percentage: it only shows the same size another way. Changing the value rescales every gram and keeps the percentages.',
  'help.anchor.more':
    'The dough weight is the final dough, after declared losses such as the evaporation of a tangzhong. Toppings and glazes are not counted in it.',

  'help.bakerPct.title': 'Baker’s percentage',
  'help.bakerPct.body1':
    'An ingredient’s baker’s percentage is its weight divided by the total weight of flour, times 100. Flour is always 100 %, so the percentages add up to more than 100.',
  'help.bakerPct.body2':
    'Edit a percentage and the recipe size is kept: the grams follow. Edit grams and the grams of the other ingredients are kept: every percentage, the total flour and the size are recomputed.',
  'help.bakerPct.more':
    'In the Flours table, “Share” is different: it is the part of each flour in the flour blend, and the shares add up to 100 %.',

  'help.hydration.title': 'Hydration and added water',
  'help.hydration.body1':
    'Hydration here is total water in % of the flour: every ingredient that brings water counts (water, milk, eggs, honey, butter…), minus losses such as the evaporation of a tangzhong. It is not the usual water-to-flour ratio: with milk or eggs it is higher than the added water.',
  'help.hydration.body2':
    'Added water is only the “Water” ingredient, preparations included. Typing a hydration locks it (the lock icon): it is kept while you change ingredients, and the added water adjusts. Adding 100 g of egg then lowers the added water by the water the egg brings.',
  'help.hydration.body3':
    'The lock icon locks the hydration at its current value, or unlocks it; unlocking keeps every quantity as it is. While locked, the added water cannot be edited directly: change the hydration, or unlock.',
  'help.hydration.more':
    'When an ingredient’s water content is unknown, the hydration is flagged as incomplete or shown as an estimate (≈): it is never counted as zero. “Where the water comes from” lists each contribution.',

  'help.preparations.title': 'Preparations',
  'help.preparations.body1':
    'A preparation (a preferment such as a poolish or a biga, or a scald such as a tangzhong) is made ahead from part of the recipe’s flour and water. It adds nothing to the dough: it draws its flour, water and ingredients from the totals.',
  'help.preparations.body2':
    '“Share of the flour” is the part of the total flour it uses. “Hydration” is its liquid in % of its own flour. The name follows that ratio: a preferment is a poolish from 90 % and a biga up to 65 %; a scald is a tangzhong from 300 % and a yudane up to 150 %.',
  'help.preparations.body3':
    'A preparation has its own step in the Process, and removing it removes that step.',

  'help.finalMix.title': 'Final mix to weigh',
  'help.finalMix.body1':
    'What you weigh when you mix: each preparation as one ready item, the flour left, the water left after the preparations took theirs, and the other ingredients.',
  'help.finalMix.body2':
    'Ticking an item is a checklist for this session only. It is not saved, and a change of quantity unticks it.',

  'help.fermentation.title': 'Estimated fermentation',
  'help.fermentation.body1':
    'The app estimates how long the dough needs to ferment from the yeast dose, the temperatures and the planned durations of the dough steps (between the mix and the bake, or the boil for bagels). They count as one fermentation: the dough’s state is not reset between them.',
  'help.fermentation.body2':
    'Basic mode takes the dough at room temperature. Advanced mode aims at a dough temperature and gives the water temperature to use. Each step has its own place: room, or fridge at {fridge}.',
  'help.fermentation.body3':
    'The result line tells how far the plan takes the dough towards its “ready to bake” target; “Details” gives the ranges in plain words. The recipe changes only by an edit: a step on Auto, “Use this time” or “Use” for the yeast.',
  'help.fermentation.more':
    'The model is provisional: it is fitted on a published yeast table, not yet on recorded bakes, and its range shows how far off it can be. Preferments are estimated apart. Without an ingredient marked as commercial yeast there is no estimate.',

  'help.readiness.title': '“Ready to bake” target',
  'help.readiness.body1':
    '“Ready to bake” is your own judgement; the model needs a target to stand for it. This choice sets that target for the whole dough.',
  'help.readiness.body2':
    'Model end point (default): the model’s own end point, “about doubled once” in its source table. Not calibrated on your doughs.',
  'help.readiness.body3':
    'Experimental (×2): an assumed target of about twice the model’s time, not measured. Its range is a sensitivity range, not an error margin.',
  'help.readiness.more':
    'The “Ready to bake” marks you record in bake mode are kept to calibrate this target later. Nothing is learned automatically yet.',

  'help.modelTime.title': 'Model time and its range',
  'help.modelTime.body1':
    'The time one dough step needs for the dough to reach its target, given the yeast dose and the planned durations of the other steps: the step on Auto, otherwise the last dough step.',
  'help.modelTime.body2':
    'The range comes from the model’s uncertain parameters (speed, sensitivity to temperature, yeast conversion) and from the target’s own range. It is not a confidence interval: the real time can fall outside it.',
  'help.modelTime.body3':
    '“Not reached within 21 days” means one end of the range never reaches the target; “no reliable range” means no range could be computed. “Use this time” writes the value, rounded to 5 minutes, into the step.',
  'help.modelTime.more':
    '“The plan reaches 90 % of the target” is how far the dough gets with the planned durations. Under 100 %, the plan stops before the target; over 100 %, it goes past it. It is not a volume.',

  'help.extrapolation.title': 'Outside the model’s data',
  'help.extrapolation.body1':
    'The model was fitted on a limited range of doughs. When the recipe goes beyond it, the estimate is still given, with the reasons, but it is less reliable.',
  'help.extrapolation.body2':
    'The reasons: a preferment, more than 5 % sugar, more than 3 % fat, salt outside 1.5 to 3 %, hydration outside 55 to 75 %, or an unknown content (sugar, fat or hydration unknown: an ingredient’s composition is not known). They only flag the estimate; they do not change the computation.',
  'help.extrapolation.body3':
    'The range does not widen by itself: read the figure as an order of magnitude and watch the dough.',

  'help.schedule.title': 'Fermentation schedules',
  'help.schedule.body1':
    'A schedule replaces the dough steps, between the mix and the bake, with a usual sequence: bulk and proof; a slow cold bulk (18 h at {fridge}); a cold-retarded proof (14 h at {fridge}, baked from the fridge); or a short same-day plan.',
  'help.schedule.body2':
    'Steps in the cold are set to the fridge at {fridge}; the others stay at room temperature. The folds of the bulk are kept. Steps that add ingredients or carry another technique are not replaced: the schedule is refused.',
  'help.schedule.body3':
    'The last step of a schedule is on Auto: its time follows the model. Every value stays editable.',

  'help.autoDuration.title': 'Duration from the model (Auto)',
  'help.autoDuration.body1':
    'A step on Auto takes the time the model gives so that the dough reaches its target at the end of the dough steps, the other durations being as planned. It is updated after every edit of the recipe.',
  'help.autoDuration.body2':
    'Only one step can be on Auto: the model solves one unknown. Choosing Auto on another step puts the previous one back to its last time, typed by hand from then on.',
  'help.autoDuration.body3':
    'The stored time is always explicit, rounded to 5 minutes, and recorded as taken from the model. When the model cannot estimate it (a temperature missing, for example), the step keeps its last time.',
  'help.autoDuration.more':
    'A bake never changes a time by itself: it uses the times of the saved version. Changing the step’s time during a bake makes it manual for that bake.',

  'help.waterTemp.title': 'Dough temperature and water temperature',
  'help.waterTemp.body1':
    'In advanced mode you give the dough temperature you aim for after mixing. The fermentation estimate then starts from it, and the app computes the water temperature to use.',
  'help.waterTemp.body2':
    'Base-temperature method: base = 3 × target (4 × with a preferment); water = base − flour − room − preferment − mixer friction. The flour is taken at room temperature and a preferment at its step’s temperature.',
  'help.waterTemp.body3':
    'Friction is heat the mixer adds, so it lowers the water temperature. It counts as {noFriction} until you set it, and the result then says so. A few measured doughs will tell you your mixer’s value.',
  'help.waterTemp.more':
    'A result below {waterLow} or above {waterHigh} is flagged, never clipped.',

  'help.alap.title': 'As late as possible',
  'help.alap.body1':
    'Most steps start as soon as the steps before them are done. A step marked “as late as possible” (preheating, for example) is planned the other way round: it ends just before the earliest step that follows it.',
  'help.alap.body2':
    'So the oven is not heated for hours: it is scheduled backward from when you need it. Such a step needs a duration.',
  'help.alap.body3':
    'The plan is recomputed when a time changes, and no step ends by itself when its planned duration elapses.',

  'help.startMode.title': 'Start at, or ready by',
  'help.startMode.body1':
    'Start at: now, or a chosen time. The app computes the time of every step, down to the end of the recipe. “Now” follows the clock.',
  'help.startMode.body2':
    'Ready by: you choose when a target step must end (the bake by default) and the app works backward to tell you when to start. Every duration up to that step must be known.',
  'help.startMode.body3':
    'Starting the bake always starts it now: its timers run from the tap, whatever time is planned here. You can still adjust the steps while baking.',

  'help.readyMark.title': 'Dough-ready marks',
  'help.readyMark.body1':
    '“Ready to shape” and “Ready to bake” record the moment you judge the dough ready, and what you went by (poke test, feel, time). They never end the step nor change the plan.',
  'help.readyMark.body2':
    'The button appears on a running fermentation step: “Ready to bake” on the last one before the bake (usually the final proof), “Ready to shape” on the others (the end of the bulk, for example).',
  'help.readyMark.body3':
    'Only “Ready to bake” marks will serve to calibrate the model’s target. All marks stay in the log and in the exported data.',

  'help.bakeFocus.title': 'Current step and parallel steps',
  'help.bakeFocus.body1':
    'The large block is the step to act on: the running step that ends first, or else the next step that can start.',
  'help.bakeFocus.body2':
    'Other steps can run at the same time (a preferment overnight, the oven preheating during the final proof). They are listed here, each with its own button to finish it.',
  'help.bakeFocus.body3':
    '“Also due now” lists steps that can start and whose planned time has come.',

  'help.check.title': 'Recipe check',
  'help.check.body1':
    'The check looks at the whole recipe. “To fix” points block saving and baking: flours that do not add up to 100 %, a preparation larger than the dough, no step…',
  'help.check.body2':
    '“To check” points are warnings and never block: no salt or unusual salt (outside 1 to 3.5 %), hydration outside 45 to 90 %, no yeast and no preferment, no mix or bake step, a step without duration, folds that last longer than their step.',
  'help.check.body3':
    'The ranges are wide on purpose: they flag likely typos, not style choices. The check runs when you ask for it and before saving.',

  'help.draft.title': 'Unsaved changes and versions',
  'help.draft.body1':
    'Every edit is kept on the phone as a draft while you type: you can close the app and come back. It is not a version yet.',
  'help.draft.body2':
    'Saving checks the recipe, then creates the next version; earlier versions stay unchanged and a bake keeps the version it started from. Discarding throws the draft away. A bake starts only from a saved version.',
  'help.technique.title': 'Step technique',
  'help.technique.body1':
    'A step can record how it is done: the method (by hand, spiral mixer…), the mixing phases, sets of folds and what tells that the step is over. It is a record: nothing is predicted from it yet, neither a duration, nor an end, nor the state of the dough.',
  'help.technique.body2':
    'Mixing phases add up to the step: changing them writes their sum as the planned duration. The duration stays editable; it is then no longer the sum.',
  'help.technique.body3':
    'Fold sets are due from the real start of the step: set 1 one interval after it starts, set 2 two intervals after, and so on. Bake mode shows the next set and a reminder calls for each set not yet done. A set can be recorded early, late or twice; the plan does not change.',
  'help.technique.more':
    'Folds do not split the step: the fermentation estimate still sees one step. Sets × interval longer than the step is flagged by the recipe check.',
  'help.flours.title': 'Flours and their properties',
  'help.flours.body1':
    'Each bake records which flours it used and the version of their entry, with what is known about them: protein, ash, falling number, alveograph W and P/L, malt added. No calculation uses these properties yet; they are kept to calibrate the models later.',
  'help.flours.body2':
    'An empty property is unknown, never zero. Built-in flours describe a category: their values are typical and unverified (≈), never those of a bag. Customize one to fill in what the bag or the mill says. Each save is a new version; earlier bakes keep theirs.',
  'help.flours.body3':
    'A percentage has a basis: as sold, at 14 % moisture (common for protein and ash on mill sheets) or on dry matter. A label value given per serving is converted to % of the flour and stays “as sold”.',
  'help.flours.more':
    'The classification (T65, 00, #50…) is shown as given; nothing is inferred from it. Archiving hides a flour from the picker; recipes and bakes that use it still show it.',
} as const;

export const helpFr: Record<keyof typeof helpEn, string> = {
  'help.button': 'Explication : {term}',
  'help.close': 'Fermer',
  'help.more': 'En savoir plus',
  'help.less': 'Réduire',

  'help.anchor.title': 'Taille de la recette : farine, pâte ou pâtons',
  'help.anchor.body1':
    'La taille fixe la fournée. Chaque gramme de la recette en est calculé, avec les pourcentages.',
  'help.anchor.body2':
    'Farine : indiquer le poids total de farine. Pâte : indiquer le poids de la pâte finale ; la farine en découle. Pâtons : indiquer un nombre et le poids d’un pâton ; la pâte pèse nombre × poids.',
  'help.anchor.body3':
    'Changer de type garde tous les grammes et pourcentages : c’est la même taille vue autrement. Changer la valeur met tous les grammes à l’échelle et garde les pourcentages.',
  'help.anchor.more':
    'Le poids de pâte est celui de la pâte finale, après les pertes déclarées comme l’évaporation d’un tangzhong. Les garnitures et les glaçages n’y comptent pas.',

  'help.bakerPct.title': 'Pourcentage boulanger',
  'help.bakerPct.body1':
    'Le pourcentage boulanger d’un ingrédient est son poids divisé par le poids total de farine, fois 100. La farine vaut toujours 100 % : les pourcentages dépassent donc 100 au total.',
  'help.bakerPct.body2':
    'Modifier un pourcentage garde la taille de la recette : les grammes suivent. Modifier des grammes garde les grammes des autres ingrédients : tous les pourcentages, la farine totale et la taille sont recalculés.',
  'help.bakerPct.more':
    'Dans le tableau des farines, « Part » est différente : c’est la part de chaque farine dans le mélange de farines, et les parts font 100 %.',

  'help.hydration.title': 'Hydratation et eau ajoutée',
  'help.hydration.body1':
    'L’hydratation est ici l’eau totale en % de la farine : chaque ingrédient qui apporte de l’eau compte (eau, lait, œufs, miel, beurre…), moins les pertes comme l’évaporation d’un tangzhong. Ce n’est pas le rapport habituel eau sur farine : avec du lait ou des œufs, elle dépasse l’eau ajoutée.',
  'help.hydration.body2':
    'L’eau ajoutée est seulement l’ingrédient « Eau », préparations comprises. Saisir une hydratation la verrouille (l’icône de cadenas) : elle est gardée quand les ingrédients changent, et l’eau ajoutée s’ajuste. Ajouter 100 g d’œuf baisse alors l’eau ajoutée de l’eau que l’œuf apporte.',
  'help.hydration.body3':
    'Le cadenas verrouille l’hydratation à sa valeur actuelle, ou la déverrouille ; déverrouiller garde chaque quantité telle quelle. Tant qu’elle est verrouillée, l’eau ajoutée ne se modifie pas directement : changer l’hydratation, ou déverrouiller.',
  'help.hydration.more':
    'Quand la teneur en eau d’un ingrédient est inconnue, l’hydratation est signalée incomplète ou affichée comme estimation (≈) : elle n’est jamais comptée comme zéro. « D’où vient l’eau » détaille chaque apport.',

  'help.preparations.title': 'Préparations',
  'help.preparations.body1':
    'Une préparation (un préferment comme un poolish ou une biga, ou un échaudage comme un tangzhong) se fait à l’avance avec une partie de la farine et de l’eau de la recette. Elle n’ajoute rien à la pâte : elle prend sa farine, son eau et ses ingrédients dans les totaux.',
  'help.preparations.body2':
    '« Part de la farine » est la part de la farine totale qu’elle utilise. « Hydratation » est son liquide en % de sa propre farine. Le nom suit ce rapport : un préferment est un poolish à partir de 90 % et une biga jusqu’à 65 % ; un échaudage est un tangzhong à partir de 300 % et un yudane jusqu’à 150 %.',
  'help.preparations.body3':
    'Une préparation a sa propre étape dans le Processus, et la retirer retire cette étape.',

  'help.finalMix.title': 'Pétrissage final à peser',
  'help.finalMix.body1':
    'Ce qui est pesé au pétrissage : chaque préparation comme un seul élément prêt, la farine restante, l’eau restante après celle des préparations, et les autres ingrédients.',
  'help.finalMix.body2':
    'Cocher un élément est une liste de contrôle pour cette séance seulement. Rien n’est enregistré, et un changement de quantité décoche.',

  'help.fermentation.title': 'Fermentation estimée',
  'help.fermentation.body1':
    'L’app estime le temps de fermentation de la pâte à partir de la dose de levure, des températures et des durées prévues des étapes de la pâte (entre le pétrissage et la cuisson, ou l’ébullition pour les bagels). Elles comptent comme une seule fermentation : l’état de la pâte n’est pas remis à zéro entre elles.',
  'help.fermentation.body2':
    'Le mode de base prend la pâte à la température ambiante. Le mode avancé vise une température de pâte et donne la température de l’eau à utiliser. Chaque étape a son lieu : ambiante, ou frigo à {fridge}.',
  'help.fermentation.body3':
    'La ligne de résultat indique jusqu’où le plan mène la pâte vers sa cible « prête à cuire » ; « Détails » donne les fourchettes en phrases simples. La recette ne change que par une modification : une étape en Auto, « Prendre ce temps » ou « Utiliser » pour la levure.',
  'help.fermentation.more':
    'Le modèle est provisoire : il est ajusté sur une table de levure publiée, pas encore sur les fournées enregistrées, et sa fourchette montre de combien il peut se tromper. Les préferments sont estimés à part. Sans ingrédient marqué comme levure commerciale, il n’y a pas d’estimation.',

  'help.readiness.title': 'Cible « prête à cuire »',
  'help.readiness.body1':
    '« Prête à cuire » est un jugement personnel ; le modèle a besoin d’une cible pour le représenter. Ce choix fixe cette cible pour toute la pâte.',
  'help.readiness.body2':
    'Point final du modèle (par défaut) : le point final du modèle lui-même, « à peu près doublé une fois » dans sa table d’origine. Non calibré sur des pâtes réelles.',
  'help.readiness.body3':
    'Expérimentale (×2) : une cible supposée, environ deux fois le temps du modèle, non mesurée. Sa fourchette est une plage de sensibilité, pas une marge d’erreur.',
  'help.readiness.more':
    'Les repères « Prête à cuire » notés pendant une fournée sont gardés pour calibrer cette cible plus tard. Rien n’est encore appris automatiquement.',

  'help.modelTime.title': 'Temps du modèle et sa fourchette',
  'help.modelTime.body1':
    'Le temps dont une étape de la pâte a besoin pour que la pâte atteigne sa cible, vu la dose de levure et les durées prévues des autres étapes : l’étape en Auto, sinon la dernière étape de la pâte.',
  'help.modelTime.body2':
    'La fourchette vient des paramètres incertains du modèle (vitesse, sensibilité à la température, conversion de la levure) et de la fourchette de la cible. Ce n’est pas un intervalle de confiance : le temps réel peut en sortir.',
  'help.modelTime.body3':
    '« Pas atteinte en 21 jours » veut dire qu’une borne de la fourchette n’atteint jamais la cible ; « pas de fourchette fiable », qu’aucune fourchette n’a pu être calculée. « Prendre ce temps » écrit la valeur, arrondie à 5 minutes, dans l’étape.',
  'help.modelTime.more':
    '« Le plan atteint 90 % de la cible » indique jusqu’où la pâte va avec les durées prévues. Sous 100 %, le plan s’arrête avant la cible ; au-dessus, il la dépasse. Ce n’est pas un volume.',

  'help.extrapolation.title': 'Hors des données du modèle',
  'help.extrapolation.body1':
    'Le modèle est ajusté sur une plage limitée de pâtes. Quand la recette en sort, l’estimation est quand même donnée, avec les raisons, mais elle est moins fiable.',
  'help.extrapolation.body2':
    'Les raisons : un préferment, plus de 5 % de sucre, plus de 3 % de gras, un sel hors de 1,5 à 3 %, une hydratation hors de 55 à 75 %, ou une teneur inconnue (sucre, gras ou hydratation inconnus : la composition d’un ingrédient n’est pas connue). Elles signalent l’estimation sans changer le calcul.',
  'help.extrapolation.body3':
    'La fourchette ne s’élargit pas toute seule : lire le chiffre comme un ordre de grandeur et surveiller la pâte.',

  'help.schedule.title': 'Horaires de fermentation',
  'help.schedule.body1':
    'Un horaire remplace les étapes de la pâte, entre le pétrissage et la cuisson, par une suite habituelle : pointage et apprêt ; pointage lent au froid (18 h à {fridge}) ; apprêt bloqué au froid (14 h à {fridge}, cuit à la sortie du frigo) ; ou un plan court le même jour.',
  'help.schedule.body2':
    'Les étapes au froid sont placées au frigo à {fridge} ; les autres restent à la température ambiante. Les rabats du pointage sont gardés. Des étapes qui ajoutent des ingrédients ou portent une autre technique ne sont pas remplacées : l’horaire est refusé.',
  'help.schedule.body3':
    'La dernière étape d’un horaire est en Auto : son temps suit le modèle. Toutes les valeurs restent modifiables.',

  'help.autoDuration.title': 'Durée selon le modèle (Auto)',
  'help.autoDuration.body1':
    'Une étape en Auto prend le temps que donne le modèle pour que la pâte atteigne sa cible à la fin des étapes de la pâte, les autres durées restant celles prévues. Il est mis à jour après chaque modification de la recette.',
  'help.autoDuration.body2':
    'Une seule étape peut être en Auto : le modèle résout une seule inconnue. Choisir Auto sur une autre étape remet la précédente à son dernier temps, saisi à la main dès lors.',
  'help.autoDuration.body3':
    'Le temps enregistré est toujours explicite, arrondi à 5 minutes, et noté comme tiré du modèle. Quand le modèle ne peut pas l’estimer (une température manquante, par exemple), l’étape garde son dernier temps.',
  'help.autoDuration.more':
    'Une fournée ne change jamais un temps d’elle-même : elle suit les temps de la version enregistrée. Changer le temps de l’étape pendant une fournée la rend manuelle pour cette fournée.',

  'help.waterTemp.title': 'Température de pâte et température de l’eau',
  'help.waterTemp.body1':
    'En mode avancé, on indique la température de pâte visée après le pétrissage. L’estimation de fermentation part de cette valeur, et l’app calcule la température de l’eau à utiliser.',
  'help.waterTemp.body2':
    'Méthode de la température de base : base = 3 × visée (4 × avec un préferment) ; eau = base − farine − ambiante − préferment − friction du pétrin. La farine est prise à l’ambiante et un préferment à la température de son étape.',
  'help.waterTemp.body3':
    'La friction est la chaleur que le pétrin ajoute : elle baisse donc la température de l’eau. Elle compte pour {noFriction} tant qu’elle n’est pas réglée, et le résultat le dit. Quelques pâtes mesurées donneront la valeur du pétrin.',
  'help.waterTemp.more':
    'Un résultat sous {waterLow} ou au-dessus de {waterHigh} est signalé, jamais tronqué.',

  'help.alap.title': 'Le plus tard possible',
  'help.alap.body1':
    'La plupart des étapes commencent dès que les précédentes sont finies. Une étape « le plus tard possible » (le préchauffage, par exemple) est planifiée à l’envers : elle se termine juste avant la première étape qui la suit.',
  'help.alap.body2':
    'Le four ne chauffe donc pas pendant des heures : il est programmé à rebours depuis le moment où il est nécessaire. Une telle étape a besoin d’une durée.',
  'help.alap.body3':
    'Le plan est recalculé quand une heure change, et aucune étape ne se termine toute seule quand sa durée prévue est écoulée.',

  'help.startMode.title': 'Commencer à, ou prêt pour',
  'help.startMode.body1':
    'Commencer à : maintenant, ou à une heure choisie. L’app calcule l’heure de chaque étape, jusqu’à la fin de la recette. « Maintenant » suit l’horloge.',
  'help.startMode.body2':
    'Prêt pour : choisir quand une étape cible doit se terminer (la cuisson par défaut) ; l’app remonte le temps pour indiquer quand commencer. Toutes les durées jusqu’à cette étape doivent être connues.',
  'help.startMode.body3':
    'Démarrer la fournée la démarre toujours maintenant : ses minuteries partent du toucher, quelle que soit l’heure planifiée ici. Les étapes restent ajustables pendant la fournée.',

  'help.readyMark.title': 'Repères de pâte prête',
  'help.readyMark.body1':
    '« Prête à façonner » et « Prête à cuire » notent le moment où la pâte est jugée prête, et ce sur quoi ce jugement repose (test du doigt, toucher, temps). Ils ne terminent jamais l’étape et ne changent pas le plan.',
  'help.readyMark.body2':
    'Le bouton apparaît sur une étape de fermentation en cours : « Prête à cuire » sur la dernière avant la cuisson (en général l’apprêt), « Prête à façonner » sur les autres (la fin du pointage, par exemple).',
  'help.readyMark.body3':
    'Seuls les repères « Prête à cuire » serviront à calibrer la cible du modèle. Tous les repères restent dans le journal et dans les données exportées.',

  'help.bakeFocus.title': 'Étape en cours et étapes parallèles',
  'help.bakeFocus.body1':
    'Le grand bloc est l’étape sur laquelle agir : l’étape en cours qui se termine en premier, sinon la prochaine qui peut commencer.',
  'help.bakeFocus.body2':
    'D’autres étapes peuvent tourner en même temps (un préferment pendant la nuit, le four qui préchauffe pendant l’apprêt). Elles sont listées ici, chacune avec son bouton pour la terminer.',
  'help.bakeFocus.body3':
    '« À faire aussi maintenant » liste les étapes qui peuvent commencer et dont l’heure prévue est venue.',

  'help.check.title': 'Vérification de la recette',
  'help.check.body1':
    'La vérification regarde toute la recette. Les points « À corriger » bloquent l’enregistrement et le démarrage : des farines qui ne font pas 100 %, une préparation plus grosse que la pâte, aucune étape…',
  'help.check.body2':
    'Les points « À vérifier » sont des avertissements qui ne bloquent jamais : pas de sel ou un sel inhabituel (hors de 1 à 3,5 %), une hydratation hors de 45 à 90 %, ni levure ni préferment, pas d’étape de pétrissage ou de cuisson, une étape sans durée, des rabats plus longs que leur étape.',
  'help.check.body3':
    'Les fourchettes sont larges exprès : elles signalent les fautes de frappe probables, pas des choix de style. La vérification se lance à la demande et avant d’enregistrer.',

  'help.draft.title': 'Modifications non enregistrées et versions',
  'help.draft.body1':
    'Chaque modification est gardée sur le téléphone comme brouillon pendant la saisie : il est possible de fermer l’app et de revenir. Ce n’est pas encore une version.',
  'help.draft.body2':
    'Enregistrer vérifie la recette puis crée la version suivante ; les versions précédentes restent intactes et une fournée garde la version dont elle est partie. Abandonner jette le brouillon. Une fournée ne démarre que d’une version enregistrée.',
  'help.technique.title': 'Technique de l’étape',
  'help.technique.body1':
    'Une étape peut noter comment elle se fait : la méthode (à la main, pétrin à spirale…), les phases de pétrissage, les séries de rabats et ce qui indique la fin de l’étape. C’est un enregistrement : rien n’en est encore prédit, ni une durée, ni une fin, ni l’état de la pâte.',
  'help.technique.body2':
    'Les phases de pétrissage forment l’étape : les modifier écrit leur somme comme durée prévue. La durée reste modifiable ; elle n’est alors plus la somme.',
  'help.technique.body3':
    'Les séries de rabats sont dues à partir du début réel de l’étape : la série 1 un intervalle après le début, la série 2 deux intervalles après, et ainsi de suite. Le mode fournée affiche la prochaine série, et un rappel est envoyé pour chaque série pas encore faite. Une série peut être notée en avance, en retard ou deux fois ; le plan ne change pas.',
  'help.technique.more':
    'Les rabats ne découpent pas l’étape : l’estimation de fermentation voit toujours une seule étape. Un nombre de séries × intervalle plus long que l’étape est signalé par la vérification.',
  'help.flours.title': 'Farines et leurs propriétés',
  'help.flours.body1':
    'Chaque fournée enregistre les farines utilisées et la version de leur fiche, avec ce qui en est connu : protéines, cendres, indice de chute, W et P/L de l’alvéographe, malt ajouté. Aucun calcul n’utilise encore ces propriétés ; elles sont gardées pour calibrer les modèles plus tard.',
  'help.flours.body2':
    'Une propriété vide est inconnue, jamais zéro. Les farines de base décrivent une catégorie : leurs valeurs sont typiques et non vérifiées (≈), jamais celles d’un sac. En personnaliser une pour saisir ce qu’indiquent le sac ou le meunier. Chaque enregistrement crée une nouvelle version ; les fournées passées gardent la leur.',
  'help.flours.body3':
    'Un pourcentage a une base : tel que vendu, à 14 % d’humidité (courant pour les protéines et les cendres sur les fiches de meunerie) ou sur matière sèche. Une valeur d’étiquette par portion est convertie en % de la farine et reste « tel que vendu ».',
  'help.flours.more':
    'La classification (T65, 00, #50…) est affichée telle quelle ; rien n’en est déduit. Archiver retire une farine du choix ; les recettes et les fournées qui l’utilisent l’affichent toujours.',
};
