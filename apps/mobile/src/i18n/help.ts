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

  'help.water.title': 'Added water and total water',
  'help.water.body1':
    'Added water is the water you put in as the “Water” ingredient, preparations included, in % of the flour.',
  'help.water.body2':
    'Total water also counts the water brought by milk, eggs, honey, butter and the other ingredients, minus losses such as evaporation. It is the figure that describes how wet the dough really is.',
  'help.water.body3':
    'When an ingredient’s water content is unknown, total water is flagged as incomplete or shown as an estimate (≈): it is never counted as zero. Tap the total water figure to see where it comes from.',

  'help.lock.title': 'Locked total water',
  'help.lock.body1':
    'Locking fixes total water at the percentage shown. The added water then adjusts by itself when another ingredient brings water (eggs, milk…), so the dough keeps the same wetness.',
  'help.lock.body2':
    'While locked, the added water can no longer be edited: change the locked target, or unlock. Unlocking keeps every current quantity.',
  'help.lock.more':
    'Without the lock, adding 100 g of egg raises total water. With it, the added water goes down by the water the egg brings.',

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
    'The app estimates how long the dough needs to ferment from the yeast dose, the temperatures and the planned durations of your steps. The model is provisional: it is fitted on a published yeast table, not yet on your own bakes.',
  'help.fermentation.body2':
    'Basic mode takes the dough at room temperature. Advanced mode lets you aim at a dough temperature and gives the water temperature to use.',
  'help.fermentation.body3':
    'The recipe never changes by itself: “Use this time” and “Use this dose” are edits that you choose.',
  'help.fermentation.more':
    'The steps between the mix and the bake are counted together as one fermentation; the dough’s state is not reset between them. Preferments are estimated apart. Without an ingredient marked as commercial yeast there is no estimate.',

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
    'The time the last fermentation step needs for the dough to reach its target, given the yeast dose and the planned durations of the other steps.',
  'help.modelTime.body2':
    'The range in brackets comes from the model’s uncertain parameters (speed, sensitivity to temperature, yeast conversion). It is not a confidence interval: the real time can fall outside it.',
  'help.modelTime.body3':
    '“Not reached within 21 days” means one end of the range never reaches the target; “no reliable range” means no range could be computed. “Use this time” writes the value, rounded to 5 minutes, into the step.',
  'help.modelTime.more':
    '“At the planned times: 90 %” is how far the dough gets with the durations you planned, as a percentage of its target. Under 100 %, the plan stops before the target. It is not a volume.',

  'help.extrapolation.title': 'Outside the model’s data',
  'help.extrapolation.body1':
    'The model was fitted on a limited range of doughs. When your recipe goes beyond it, the estimate is still given, with the reasons, but it is less reliable.',
  'help.extrapolation.body2':
    'The reasons: a preferment, more than 5 % sugar, more than 3 % fat, salt outside 1.5 to 3 %, total water outside 55 to 75 %, or an unknown content. They only flag the estimate; they do not change the computation.',
  'help.extrapolation.body3':
    'The range does not widen by itself: read the figure as an order of magnitude and watch the dough.',

  'help.waterTemp.title': 'Dough temperature and water temperature',
  'help.waterTemp.body1':
    'In advanced mode you give the dough temperature you aim for after mixing. The fermentation estimate then starts from it, and the app computes the water temperature to use.',
  'help.waterTemp.body2':
    'Base-temperature method: base = 3 × target (4 × with a preferment); water = base − flour − room − preferment − mixer friction. The flour is taken at room temperature and a preferment at its step’s temperature.',
  'help.waterTemp.body3':
    'Friction is heat the mixer adds, so it lowers the water temperature. It counts as 0 °C until you set it, and the result then says so. A few measured doughs will tell you your mixer’s value.',
  'help.waterTemp.more': 'A result below 0 °C or above 60 °C is flagged, never clipped.',

  'help.alap.title': 'As late as possible',
  'help.alap.body1':
    'Most steps start as soon as the steps before them are done. A step marked “as late as possible” (preheating, for example) is planned the other way round: it ends just before the earliest step that follows it.',
  'help.alap.body2':
    'So the oven is not heated for hours: it is scheduled backward from when you need it. Such a step needs a duration.',
  'help.alap.body3':
    'The plan is recomputed when a time changes, and no step ends by itself when its planned duration elapses.',

  'help.startMode.title': 'Start at, or ready by',
  'help.startMode.body1':
    'Start at: you choose when the first step begins, and the app computes the time of every step, down to the end of the recipe.',
  'help.startMode.body2':
    'Ready by: you choose when a target step must end (the bake by default) and the app works backward to tell you when to start. Every duration up to that step must be known.',
  'help.startMode.body3':
    'Starting the bake takes the mode and the time shown here as the plan. You can still adjust the steps while baking.',

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
    '“To check” points are warnings and never block: no salt or unusual salt (outside 1 to 3.5 %), total water outside 45 to 90 %, no yeast and no preferment, no mix or bake step, a step without duration.',
  'help.check.body3':
    'The ranges are wide on purpose: they flag likely typos, not style choices. The check runs when you ask for it and before saving.',

  'help.draft.title': 'Unsaved changes and versions',
  'help.draft.body1':
    'Every edit is kept on the phone as a draft while you type: you can close the app and come back. It is not a version yet.',
  'help.draft.body2':
    'Saving checks the recipe, then creates the next version; earlier versions stay unchanged and a bake keeps the version it started from. Discarding throws the draft away. A bake starts only from a saved version.',
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
    'Farine : tu donnes le poids total de farine. Pâte : tu donnes le poids de la pâte finale et la farine en découle. Pâtons : tu donnes un nombre et le poids d’un pâton ; la pâte pèse nombre × poids.',
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

  'help.water.title': 'Eau ajoutée et eau totale',
  'help.water.body1':
    'L’eau ajoutée est l’eau que tu mets comme ingrédient « Eau », préparations comprises, en % de la farine.',
  'help.water.body2':
    'L’eau totale compte aussi l’eau apportée par le lait, les œufs, le miel, le beurre et les autres ingrédients, moins les pertes comme l’évaporation. C’est le chiffre qui dit à quel point la pâte est vraiment humide.',
  'help.water.body3':
    'Quand la teneur en eau d’un ingrédient est inconnue, l’eau totale est signalée incomplète ou affichée comme estimation (≈) : elle n’est jamais comptée comme zéro. Touche le chiffre de l’eau totale pour voir d’où il vient.',

  'help.lock.title': 'Eau totale verrouillée',
  'help.lock.body1':
    'Verrouiller fixe l’eau totale au pourcentage affiché. L’eau ajoutée s’ajuste alors d’elle-même quand un autre ingrédient apporte de l’eau (œufs, lait…) : la pâte garde la même humidité.',
  'help.lock.body2':
    'Tant qu’elle est verrouillée, l’eau ajoutée ne se modifie plus : change la cible verrouillée, ou déverrouille. Déverrouiller garde toutes les quantités actuelles.',
  'help.lock.more':
    'Sans verrou, ajouter 100 g d’œuf augmente l’eau totale. Avec le verrou, l’eau ajoutée baisse de l’eau que l’œuf apporte.',

  'help.preparations.title': 'Préparations',
  'help.preparations.body1':
    'Une préparation (un préferment comme un poolish ou une biga, ou un échaudage comme un tangzhong) se fait à l’avance avec une partie de la farine et de l’eau de la recette. Elle n’ajoute rien à la pâte : elle prend sa farine, son eau et ses ingrédients dans les totaux.',
  'help.preparations.body2':
    '« Part de la farine » est la part de la farine totale qu’elle utilise. « Hydratation » est son liquide en % de sa propre farine. Le nom suit ce rapport : un préferment est un poolish à partir de 90 % et une biga jusqu’à 65 % ; un échaudage est un tangzhong à partir de 300 % et un yudane jusqu’à 150 %.',
  'help.preparations.body3':
    'Une préparation a sa propre étape dans le Processus, et la retirer retire cette étape.',

  'help.finalMix.title': 'Pétrissage final à peser',
  'help.finalMix.body1':
    'Ce que tu pèses au pétrissage : chaque préparation comme un seul élément prêt, la farine restante, l’eau restante après celle des préparations, et les autres ingrédients.',
  'help.finalMix.body2':
    'Cocher un élément est une liste de contrôle pour cette séance seulement. Rien n’est enregistré, et un changement de quantité décoche.',

  'help.fermentation.title': 'Fermentation estimée',
  'help.fermentation.body1':
    'L’app estime le temps de fermentation de la pâte à partir de la dose de levure, des températures et des durées prévues de tes étapes. Le modèle est provisoire : il est ajusté sur une table de levure publiée, pas encore sur tes propres cuissons.',
  'help.fermentation.body2':
    'Le mode de base prend la pâte à la température ambiante. Le mode avancé permet de viser une température de pâte et donne la température de l’eau à utiliser.',
  'help.fermentation.body3':
    'La recette ne change jamais toute seule : « Prendre ce temps » et « Prendre cette dose » sont des modifications que tu choisis.',
  'help.fermentation.more':
    'Les étapes entre le pétrissage et la cuisson sont comptées ensemble comme une seule fermentation ; l’état de la pâte n’est pas remis à zéro entre elles. Les préferments sont estimés à part. Sans ingrédient marqué comme levure commerciale, il n’y a pas d’estimation.',

  'help.readiness.title': 'Cible « prête à cuire »',
  'help.readiness.body1':
    '« Prête à cuire » est ton propre jugement ; le modèle a besoin d’une cible pour le représenter. Ce choix fixe cette cible pour toute la pâte.',
  'help.readiness.body2':
    'Point final du modèle (par défaut) : le point final du modèle lui-même, « à peu près doublé une fois » dans sa table d’origine. Non calibré sur tes pâtes.',
  'help.readiness.body3':
    'Expérimentale (×2) : une cible supposée, environ deux fois le temps du modèle, non mesurée. Sa fourchette est une plage de sensibilité, pas une marge d’erreur.',
  'help.readiness.more':
    'Les repères « Prête à cuire » que tu notes en cuisson sont gardés pour calibrer cette cible plus tard. Rien n’est encore appris automatiquement.',

  'help.modelTime.title': 'Temps du modèle et sa fourchette',
  'help.modelTime.body1':
    'Le temps dont la dernière étape de fermentation a besoin pour que la pâte atteigne sa cible, vu la dose de levure et les durées prévues des autres étapes.',
  'help.modelTime.body2':
    'La fourchette entre parenthèses vient des paramètres incertains du modèle (vitesse, sensibilité à la température, conversion de la levure). Ce n’est pas un intervalle de confiance : le temps réel peut en sortir.',
  'help.modelTime.body3':
    '« Pas atteinte en 21 jours » veut dire qu’une borne de la fourchette n’atteint jamais la cible ; « pas de fourchette fiable », qu’aucune fourchette n’a pu être calculée. « Prendre ce temps » écrit la valeur, arrondie à 5 minutes, dans l’étape.',
  'help.modelTime.more':
    '« Aux temps prévus : 90 % » dit jusqu’où la pâte va avec les durées que tu as prévues, en pourcentage de sa cible. Sous 100 %, le plan s’arrête avant la cible. Ce n’est pas un volume.',

  'help.extrapolation.title': 'Hors des données du modèle',
  'help.extrapolation.body1':
    'Le modèle est ajusté sur une plage limitée de pâtes. Quand ta recette en sort, l’estimation est quand même donnée, avec les raisons, mais elle est moins fiable.',
  'help.extrapolation.body2':
    'Les raisons : un préferment, plus de 5 % de sucre, plus de 3 % de gras, un sel hors de 1,5 à 3 %, une eau totale hors de 55 à 75 %, ou une teneur inconnue. Elles signalent l’estimation sans changer le calcul.',
  'help.extrapolation.body3':
    'La fourchette ne s’élargit pas toute seule : lis le chiffre comme un ordre de grandeur et surveille la pâte.',

  'help.waterTemp.title': 'Température de pâte et température de l’eau',
  'help.waterTemp.body1':
    'En mode avancé, tu donnes la température de pâte visée après le pétrissage. L’estimation de fermentation part de cette valeur, et l’app calcule la température de l’eau à utiliser.',
  'help.waterTemp.body2':
    'Méthode de la température de base : base = 3 × visée (4 × avec un préferment) ; eau = base − farine − ambiante − préferment − friction du pétrin. La farine est prise à l’ambiante et un préferment à la température de son étape.',
  'help.waterTemp.body3':
    'La friction est la chaleur que le pétrin ajoute : elle baisse donc la température de l’eau. Elle compte pour 0 °C tant que tu ne la règles pas, et le résultat le dit. Quelques pâtes mesurées te donneront la valeur de ton pétrin.',
  'help.waterTemp.more': 'Un résultat sous 0 °C ou au-dessus de 60 °C est signalé, jamais tronqué.',

  'help.alap.title': 'Le plus tard possible',
  'help.alap.body1':
    'La plupart des étapes commencent dès que les précédentes sont finies. Une étape « le plus tard possible » (le préchauffage, par exemple) est planifiée à l’envers : elle se termine juste avant la première étape qui la suit.',
  'help.alap.body2':
    'Le four ne chauffe donc pas pendant des heures : il est programmé à rebours depuis le moment où tu en as besoin. Une telle étape a besoin d’une durée.',
  'help.alap.body3':
    'Le plan est recalculé quand une heure change, et aucune étape ne se termine toute seule quand sa durée prévue est écoulée.',

  'help.startMode.title': 'Commencer à, ou prêt pour',
  'help.startMode.body1':
    'Commencer à : tu choisis quand la première étape commence, et l’app calcule l’heure de chaque étape, jusqu’à la fin de la recette.',
  'help.startMode.body2':
    'Prêt pour : tu choisis quand une étape cible doit se terminer (la cuisson par défaut) et l’app remonte le temps pour te dire quand commencer. Toutes les durées jusqu’à cette étape doivent être connues.',
  'help.startMode.body3':
    'Démarrer la cuisson prend le mode et l’heure affichés ici comme plan. Tu peux encore ajuster les étapes pendant la cuisson.',

  'help.readyMark.title': 'Repères de pâte prête',
  'help.readyMark.body1':
    '« Prête à façonner » et « Prête à cuire » notent le moment où tu juges la pâte prête, et à quoi tu t’es fié (test du doigt, toucher, temps). Ils ne terminent jamais l’étape et ne changent pas le plan.',
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
    'La vérification regarde toute la recette. Les points « À corriger » bloquent l’enregistrement et la cuisson : des farines qui ne font pas 100 %, une préparation plus grosse que la pâte, aucune étape…',
  'help.check.body2':
    'Les points « À vérifier » sont des avertissements qui ne bloquent jamais : pas de sel ou un sel inhabituel (hors de 1 à 3,5 %), une eau totale hors de 45 à 90 %, ni levure ni préferment, pas d’étape de pétrissage ou de cuisson, une étape sans durée.',
  'help.check.body3':
    'Les fourchettes sont larges exprès : elles signalent les fautes de frappe probables, pas des choix de style. La vérification se lance à la demande et avant d’enregistrer.',

  'help.draft.title': 'Modifications non enregistrées et versions',
  'help.draft.body1':
    'Chaque modification est gardée sur le téléphone comme brouillon pendant que tu saisis : tu peux fermer l’app et revenir. Ce n’est pas encore une version.',
  'help.draft.body2':
    'Enregistrer vérifie la recette puis crée la version suivante ; les versions précédentes restent intactes et une cuisson garde la version dont elle est partie. Abandonner jette le brouillon. Une cuisson ne démarre que d’une version enregistrée.',
};
