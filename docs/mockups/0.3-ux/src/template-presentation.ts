// Prototype bridge: reuse the production catalogs; mapping copied from use-messages.ts.
// Keep production services and hooks out of the isolated review bundle.
import { en, fr, type MessageKey } from '../../../../apps/mobile/src/i18n/messages';
import type { Locale } from './messages';
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

export const catalogText = (locale: Locale, key: string): string | undefined =>
  key in en ? (locale === 'fr' ? fr : en)[key as MessageKey] : undefined;

/** Local reviewed overrides for curated built-in French step text with metric/SI units (L74). */
const REVIEWED_FR_STEP_TEXT: Readonly<Record<string, string>> = {
  'template.dutchOven.bake':
    'Cuisson en cocotte préchauffée de 5,5–7,5 L (6–8 qt) à 232 °C : 30 min avec couvercle, puis 22,5 min sans couvercle',
  'template.baguette.bake': 'Cuire à 232 °C sur pierre ou plaque avec buée',
  'template.ciabatta.bake': 'Cuire à 238 °C avec buée',
  'template.bagels.boil': 'Pocher 30 s par face dans un bain d’eau frémissante par tournées de 3–4',
  'template.bagels.bake': 'Cuire sur plaque chemisée de papier sulfurisé à 218 °C',
  'template.focaccia.bake': 'Cuire en moule sur grille basse à 246 °C',
  'template.focaccia.bakeFinish':
    'Terminer hors du moule sur grille basse four éteint (chaleur résiduelle)',
  'template.pizzaNeoNeapolitan.bake': 'Cuire sur plaque d’acier Baking Steel à 274 °C',
  'template.pizzaRoman.bake': 'Cuire au four à pizza professionnel (≤350 °C)',
  'template.pizzaNewYork.bake': 'Cuire sur pierre ou acier préchauffé à 288 °C',
  'template.pizzaChicago.assembly':
    'Disposer en couches fromages, légumes, viandes et sauce dans la poêle',
  'template.pizzaChicago.bake':
    'Cuire en poêle en fonte à 230 °C, couvrir d’une feuille d’aluminium après 20 min',
  'template.pizzaSicilian.finishStretch':
    'Étaler jusqu’aux bords du moule ; répéter 10–15 min de repos et étirer si nécessaire',
  'template.pizzaSicilian.parBake':
    'Précuire la pâte seule en demi-plaque de 45 × 33 cm (18 × 13 po) à 232 °C',
  'template.pizzaSicilian.assembly': 'Garnir la pâte précuite de sauce, fromage et garnitures',
  'template.pizzaSicilian.bake': 'Cuire la pizza garnie à 232 °C',
  'template.pizzaSicilian.cool': 'Laisser reposer avant de découper',
  'template.pizzaTeglia.bake':
    'Cuire au four à sole électrique (sole 300–320 °C, voûte 200 °C, statique)',
  'template.brioche.mix':
    'Pétrir 2 min à basse vitesse, 8 min à vitesse moyenne, puis incorporer le beurre progressivement (température de pâte en fin de pétrissage ≤ 26 °C)',
  'template.brioche.shape': 'Façonner en boules de 50 g, disposer à raison de 7 par moule à cake',
  'template.brioche.proof': 'Laisser lever en étuve à 28 °C',
  'template.brioche.bake': 'Dorer à l’œuf, puis cuire au four ventilé à 180 °C',
  'template.burgerBuns.shape': 'Façonner chaque pâton en boule et aplatir à environ 7,5 cm (3 po)',
  'template.burgerBuns.bake':
    'Badigeonner avec la moitié des 43 g de beurre fondu, puis cuire sur plaque à 191 °C',
  'template.burgerBuns.cool':
    'Badigeonner avec le reste de beurre de glaçage et laisser refroidir sur grille',
  'template.pullman.mix':
    'Pétrir au batteur jusqu’à développement complet du réseau glutineux (température de pâte en fin de pétrissage 24–26 °C)',
  'template.pullman.shape':
    'Façonner en bâtard allongé et placer dans le moule Pullman chemisé de 33 × 10 × 10 cm avec couvercle',
  'template.pullman.proof':
    'Laisser lever dans le moule Pullman chemisé de 33 × 10 × 10 cm sans le couvercle',
  'template.pullman.bake':
    'Cuire à la maison avec couvercle dans le moule Pullman de 33 × 10 × 10 cm à 200 °C',
  'template.pullman.bakeVented': 'Retirer le couvercle, démouler sur grille, cuire ouvert à 200 °C',
  'template.shokupan.tangzhong':
    'Cuire 14 g de farine, 43 g d’eau et 43 g de lait à feu doux jusqu’à épaississement',
  'template.shokupan.tangzhongCool':
    'Laisser tiédir le tangzhong avant incorporation ; 60 min constitue une marge indicative modifiable',
  'template.shokupan.shape':
    'Rouler et plier chaque pâton en boudin de 10 cm (4 po), placer dans un moule à cake de 23 × 13 cm (9 × 5 po)',
  'template.shokupan.bake':
    'Dorer au lait, puis cuire en moule à cake de 23 × 13 cm (9 × 5 po) à 177 °C',
};

export const curatedText = (
  locale: Locale,
  label: string | undefined,
  full = false,
): string | undefined => {
  const match = getCuratedStepPresentation(label);
  if (!match) return undefined;
  const key = full ? match.fullKey : match.shortKey;
  if (locale === 'fr' && REVIEWED_FR_STEP_TEXT[key]) {
    return REVIEWED_FR_STEP_TEXT[key];
  }
  return catalogText(locale, key);
};

/** Faithful French translations of built-in RECIPE_TEMPLATES basis references (L46). */
const TEMPLATE_BASIS_FR: Readonly<Record<string, string>> = {
  shokupan:
    'King Arthur Baking / Charlotte Rutledge — Pain au lait japonais (https://www.kingarthurbaking.com/recipes/japanese-milk-bread-recipe ; pain au tangzhong en moule de 23 × 13 cm / 9 × 5 po). ' +
    'Formule : 314 g de farine de force au total (14 g pour le tangzhong + 300 g pour la pâte finale) ; 43 g d’eau pure (13,694 % de la farine totale), ' +
    'entièrement allouée au tangzhong (hydratation de l’échaudage 307,143 % par rapport à sa farine) ; 156 g de lait entier (49,682 % de la farine totale), ' +
    'répartis en 43 g pour le tangzhong (13,694 % de la farine totale) et 113 g pour la pâte finale ; 14 g de lait en poudre (4,459 %, ingrédient direct de composition inconnue) ; ' +
    '50 g de sucre cristallisé (15,924 %) ; 6 g de sel de table (1,911 %) ; 57 g de beurre doux (18,153 % de la masse des ingrédients) ; 1 gros œuf calibré à 50 g (15,924 %) ; ' +
    'levure instantanée 1 c. à soupe normalisée selon le barème KAB à 9 g (2,866 %). Dorure au lait exclue de la formule de pâte. ' +
    'Déroulement : tangzhong cuit 4 min (point médian éditorial de la plage source de 3–5 min) à feu doux, puis tiédi ' +
    '(durée éditoriale de ressuage de 60 min, distincte des 4 min de cuisson) ; pétrissage au batteur 15 min (source : « presque 15 minutes ») à température ambiante éditoriale de 21 °C ; ' +
    'pointage 75 min (point médian éditorial de la plage source de 1–1,5 h) à 21 °C ; dégazage et division 10 min en 4 pâtons égaux (~170–175 g chacun ; durée éditoriale) ; ' +
    'façonnage 10 min en boudins roulés disposés dans un moule graissé de 23 × 13 cm (durée éditoriale) ; apprêt 45 min (point médian éditorial de 40–50 min) à 21 °C ; ' +
    'préchauffage 30 min (défaut éditorial) ; cuisson 32,5 min (1950 s, point médian éditorial de 30–35 min) à 177 °C (converti de 350 °F) dans un moule de 23 × 13 cm ; ' +
    'ressuage 60 min sur grille (défaut éditorial).',

  pullman:
    'Modernist Cuisine — Pain de mie, volume 4 p. 296 errata (https://modernistcuisine.com/wp-content/uploads/2018/12/BREAD_Vol4_296_Errata.pdf ; variante pour four domestique en moule Pullman à couvercle de 33 × 10 × 10 cm / 13 × 4 × 4 po). ' +
    'Formule : 560 g de farine de force (100 %), 360 g d’eau (64,286 % d’eau pure), 35 g de beurre pommade (6,25 % de la masse des ingrédients), ' +
    '25 g de sucre (4,464 %), 10 g de sel fin (1,786 %), 5 g de levure instantanée osmotolérante (0,893 %), 2 g de sirop de malt d’orge (0,357 % de la masse des ingrédients). ' +
    'Pâte totale : 997 g. Sans lait, œuf ni préferment dans la formule. Le tableau humidité/lipides nets de l’errata indique des compositions nettes plutôt que des pourcentages du boulanger ajoutés. ' +
    'Déroulement : pétrissage mécanique 13,5 min (810 s, point médian éditorial de la plage source de 10–17 min ; consigne de température de pâte en fin de pétrissage 25 °C dans la plage source de 24–26 °C) ; ' +
    'pointage 1,5 h à température ambiante éditoriale de 21 °C avec 1 rabat après 45 min consigné en technique ; façonnage en bâtard allongé 1,5 min (90 s, point médian éditorial de 1–2 min) ; ' +
    'apprêt en moule Pullman fermé de 33 × 10 × 10 cm retenant la variante à température ambiante de 21 °C pendant 2,75 h (9900 s, point médian éditorial de la plage source de 2,5–3 h à 21 °C ; ' +
    'variante en étuve 1,5–2 h à 27 °C / 65 % HR conservée dans les notes scientifiques) ; préchauffage 30 min (défaut éditorial) ; ' +
    'cuisson domestique phase 1 avec couvercle à 200 °C pendant 52,5 min (3150 s, point médian éditorial de 45–60 min) ; ' +
    'cuisson domestique phase 2 démoulée à l’envers sur grille à 200 °C pendant 10 min (600 s) avec tirage ouvert ; ressuage 60 min (défaut éditorial). ' +
    'Variante en chaleur tournante à 185 °C pendant 30–35 min + 10 min avec tirage conservée dans les notes.',

  baguette:
    'King Arthur Baking — Baguettes classiques (https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe). ' +
    'Recette publiée de référence ; branche poolish avec levure instantanée. Mesures d’origine : 540 g de farine totale (120 g poolish + 420 g pâte finale), ' +
    '368 g d’eau (113 g poolish [94,167 % d’hydratation] + 255 g finale [68,148 % d’hydratation totale]), 12 g de sel de table (2,222 %). ' +
    'Levure instantanée : 1/16 c. à café poolish + 1,5 c. à café finale ; convertie via barème KAB (3 g/c. à café) à 0,1875 g poolish (0,0347 % farine totale) et 4,5 g finale, ' +
    'soit 4,6875 g au total (0,8681 %). Valeurs éditoriales planifiées : poolish 14 h à 21 °C (température ambiante non spécifiée) ; pétrissage 4 min ; ' +
    'pointage 90 min à 21 °C avec 1 rabat à 45 min ; division 10 min (défaut éditorial) ; détente 37,5 min (médiane de 15–60 min) ; ' +
    'façonnage 10 min (défaut éditorial) ; apprêt 52,5 min (médiane de 45–60 min) à 20 °C (68 °F) selon source ; préchauffage 30 min (défaut éditorial) à 232 °C (450 °F) ; ' +
    'cuisson 26 min (médiane de 24–28 min) sur pierre ou plaque avec buée ; ressuage 60 min (défaut éditorial). Variante levure active sèche et pointage 3 h à faible dose omises.',

  'boule-dutch-oven':
    'Leite’s Culinaria — Pain sans pétrissage de Jim Lahey (https://leitesculinaria.com/99521/recipes-jim-laheys-no-knead-bread.html). ' +
    'Recette attribuée à Lahey (Sullivan Street Bakery) via David Leite. Mesures normalisées selon le barème KAB : 3 tasses de farine tout usage (360 g), ' +
    '1 1/3 tasse d’eau tiède (302,667 g, hydratation 84,074 %), 1/4 c. à café de levure instantanée (0,75 g, 0,2083 %), ' +
    '1 1/4 c. à café de sel avec hypothèse explicite de sel de table (6 g/c. à café = 7,5 g, 2,083 %). Pâte directe sans préferment. ' +
    'Valeurs éditoriales planifiées : mélange 30 s (sourcé) ; pointage 15 h (médiane éditoriale de 12–18 h, retenant la recommandation de 18 h) à 22,2 °C (72 °F) idéal sourcé ; ' +
    'façonnage/rabat 10 min (défaut éditorial) ; apprêt 2 h (sourcé) à 21 °C ; préchauffage 30 min (sourcé) avec cocotte en fonte de 5,5–7,5 L (6–8 qt) avec couvercle à 232 °C (450 °F) ; ' +
    'cuisson 52,5 min (médiane éditoriale de 45–60 min : 30 min couverte + 22,5 min découverte [plage 15–30 min]) à 232 °C ; ressuage 60 min (sourcé : au moins 1 h).',

  ciabatta:
    'King Arthur Baking — Ciabatta professionnelle (https://www.kingarthurbaking.com/pro/formulas/ciabatta). ' +
    'Formule professionnelle publiée. Mesures d’origine : 10 kg de farine totale (Sir Galahad), 7,6 kg d’eau (76 %), 0,2 kg de sel (2 %), 0,12 kg de levure (1,2 %). ' +
    'Biga : 3 kg de farine (30 % de préferment), 1,8 kg d’eau (60 % d’hydratation du composant), 3 g de levure (0,03 % farine totale) ; maturée ~16 h à 21 °C. ' +
    'Ajouts pâte finale : 7 kg farine, 5,8 kg eau, 200 g sel, 117 g levure. Absence de preuve : la forme de la levure n’est pas spécifiée dans la source professionnelle ; ' +
    'conservée comme ingrédient direct sans marqueur levure, évitant toute supposition non étayée entre fraîche et instantanée. ' +
    'Valeurs éditoriales planifiées : pétrissage 7,5 min (3 min vitesse lente + 4,5 min vitesse moyenne) avec température de pâte 23,9 °C (75 °F) à 21 °C ambiant ; ' +
    'pointage 2 h à 21 °C avec 1 rabat à 1 h ; division 10 min en rectangles de 0,57 kg ; apprêt 1 h à 21 °C ; préchauffage 30 min ; cuisson 36 min à 238 °C (460 °F) avec buée ; ressuage 60 min.',

  bagels:
    'King Arthur Baking — Bagels pochés à l’eau (https://www.kingarthurbaking.com/recipes/water-bagels-recipe). ' +
    'Recette publiée de référence ; variante sur une journée par Arnold Golfman. Mesures d’origine : 690 g farine tout usage, 454 g eau (65,797 %), ' +
    '35 g malt non diastasique en poudre (5,072 %), 25 g sucre cristallisé (3,623 %), 18 g sel de table (2,609 %), 6,75 g levure instantanée (0,9783 %, convertie de 2 1/4 c. à café via barème KAB à 3 g/c. à café). ' +
    'Malt représenté comme ingrédient direct de composition inconnue. Bain de pochage externe (1814 g eau, 18 g malt, 14 g sucre) et garnitures exclus de la formule de pâte. ' +
    'Valeurs éditoriales planifiées : pétrissage 8 min ; pointage 75 min (médiane de 1–1,5 h pour doubler) à 21 °C ; division 10 min en 16 pièces ; façonnage 10 min ; ' +
    'aucun apprêt final prescrit (la pâte passe directement du façonnage au bain frémissant) ; préchauffage 30 min à 218 °C (425 °F) ; ' +
    'pochage 10 min (logistique éditoriale pour 16 bagels par tournées de 3–4, pochés 30 s par face) ; cuisson 20 min sur plaque chemisée à 218 °C ; ressuage 60 min.',

  brioche:
    'Meilleur du Chef / Chef Philippe — Brioche Nanterre classique (https://www.meilleurduchef.com/en/recipe/brioche-loaf.html). ' +
    'Formule : 500 g farine T45 (100 %), 300 g œufs entiers (60 %), 250 g beurre (50 % masse ingrédients), 60 g sucre semoule (12 %), 10 g sel (2 %), 20 g levure fraîche de boulanger (4 %). ' +
    'Pâte directe sans lait ni eau pure ; dorure à l’œuf et sucre perlé exclus de la pâte. Déroulement : pétrissage 18 min (2 min vitesse lente + 8 min vitesse moyenne, ' +
    'plus 8 min éditoriales pour incorporation progressive du beurre ; consigne de température de pâte 24 °C, sous le plafond sourcé de ≤26 °C) ; pointage 30 min à 21 °C ; ' +
    'dégazage 1 min ; blocage au froid 1 h à 4 °C au réfrigérateur (minimum sourcé ≥1 h) ; division 10 min en boules de 50 g ; ' +
    'façonnage 10 min à raison de 7 boules par moule ; apprêt 2 h en étuve à 28 °C selon source ; préchauffage 30 min ; ' +
    'cuisson au four ventilé à 180 °C pendant 27,5 min (médiane de 25–30 min) ; ressuage 60 min.',

  'burger-buns':
    'King Arthur Baking / Ellen Dorsey (« Moomie ») — Pains à burger moelleux (https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe). ' +
    'Formule : 420 g farine tout usage (100 %), 198 g eau tiède (47,143 %), 28 g beurre à température ambiante (6,667 %), 50 g sucre cristallisé (11,905 %), ' +
    '9 g levure instantanée (2,143 %), 1 gros œuf calibré à 50 g (11,905 %), sel de table 1 1/4 c. à café normalisé à 7,5 g via barème KAB (1,786 %). ' +
    'Sans lait ni préferment. Glaçage au beurre séparé (43 g fondu) et graines optionnelles exclus de la pâte. Déroulement : pétrissage 8 min à 21 °C ; ' +
    'pointage 1,5 h (médiane de 1–2 h) à 21 °C ; dégazage et division 10 min en 8 pâtons (~95 g chacun) ; façonnage 10 min en boules aplaties à 7,5 cm (3 po) ; ' +
    'apprêt 60 min à 21 °C ; préchauffage 30 min ; cuisson 16,5 min (990 s, médiane de 15–18 min) sur plaque à 191 °C (converti de 375 °F) ; ressuage 60 min sur grille.',

  focaccia:
    'King Arthur Baking — Focaccia alvéolée (https://www.kingarthurbaking.com/recipes/big-and-bubbly-focaccia-recipe). ' +
    'Variante haute hydratation en moule carré de 23 cm (9 po). Mesures d’origine : 360 g farine tout usage, 284 g eau (78,889 %), 18 g huile d’olive dans la pâte (5,0 %), ' +
    '9 g sel de table (2,5 %), 5 g sucre (1,389 %), 3 g levure instantanée (0,833 %). Huile d’olive pour le moule et le dessus (26 g) et fleur de sel exclues de la pâte. ' +
    'Déroulement : pétrissage 8 min ; consigne de température de pâte 29 °C (médiane de 27,8–30,0 °C) ; pointage 2 h (4 séries de rabats à 15 min d’intervalle puis 1 h de repos) à 22,5 °C ; ' +
    'mise en moule et étirage 10 min ; apprêt en moule 75 min (médiane de 1–1,5 h) à 22,5 °C ; préchauffage 30 min à 246 °C (475 °F) ; ' +
    'cuisson sur grille basse 16,5 min (médiane de 15–18 min) à 246 °C ; finition sur grille 6 min directement sur la grille inférieure four éteint avec chaleur résiduelle ; ressuage 60 min.',

  'pizza-neo-neapolitan':
    'Baking Steel / Andris Lagsdin — Pâte à pizza 72 heures (https://bakingsteel.com/blogs/recipes/72-hour-pizza-dough). ' +
    'Variante pour plaque d’acier Baking Steel domestique (adaptation de la lignée sans pétrissage de Jim Lahey). ' +
    'Mesures d’origine : 500 g farine de force, 350 g eau (70 %), 16 g sel de mer (3,2 %), 1 g levure instantanée (0,2 %). ' +
    'Poids total de pâte 867 g, donnant 3 pâtons de ~289 g pour pizzas de 30–35 cm (12–14 po). ' +
    'Déroulement : pétrissage 2,5 min en bol ; pointage initial 24 h à température ambiante de 21 °C ; blocage au froid 48 h à 4 °C au réfrigérateur ' +
    '(l’appellation « 72 heures » couvre le pointage ambiant de 24 h et le froid de 48 h) ; division/boulage 10 min ; apprêt final 3,5 h à 21 °C ; ' +
    'préchauffage 60 min sur Baking Steel à 274 °C (500–550 °F) ; cuisson 6,5 min (médiane de 5–8 min) à 274 °C.',

  'pizza-roman':
    'Molino Vigevano / Gabriele Valdes — Pizza scrocchiarella romaine (https://molinovigevano.com/pizza-scrocchiarella-romana/). ' +
    'Méthode directe avec fermentation au froid. Formule d’origine : 1 000 g farine tipo 0 (W 280–300), 600 g eau (60 %), 26 g sel fin (2,6 %), 2 g levure fraîche (0,2 %). ' +
    'Poids total de pâte 1 628 g, divisé en pâtons de 180 g pour tonda romana fine et croustillante. Sans matière grasse ni sucre. ' +
    'Retient le four à pizza professionnel (≤350 °C, 120–180 s ; médiane 2,5 min = 150 s). ' +
    'Pétrissage 8 min, consigne de température de pâte 24 °C ; pointage 1 h à 21 °C ; division 10 min en pâtons de 180 g ; ' +
    'détente en boules 90 min à 23,5 °C ; blocage au froid 24 h à 4 °C ; remise à température 2 h à 21 °C ; étalage 10 min ; préchauffage 30 min à 350 °C.',

  'pizza-new-york':
    'Feeling Foodish / Marie — Pâte à pizza style New York (https://feelingfoodish.com/the-best-new-york-style-pizza-dough/). ' +
    'Branche métrique pour quatre pizzas de 35 cm / 14 po. Formule d’origine : 796 g farine de force, 493 g eau (61,935 %), 15,6 g sel (1,960 %), ' +
    '7,8 g sucre (0,980 %), 11,8 g huile d’olive (1,482 %), 3,5 g levure sèche instantanée (0,4397 %). Poids total calculé 1 327,7 g (4 × 331,9 g). ' +
    'Pétrissage 4,5 min avec consigne de température de pâte 27 °C ; division/boulage 10 min ; blocage au froid 48 h à 4 °C ; ' +
    'tempérage/détente 40 min à 21 °C ; étalage et garniture 10 min ; préchauffage 60 min à 288 °C (550 °F) sur pierre/acier ; cuisson 5 min (médiane de 4–6 min) à 288 °C.',

  'pizza-chicago':
    'Bake from Scratch — Baking School module 4, pizza Chicago Deep-Dish (https://bakefromscratch.com/wp-content/uploads/2022/04/Module-4-Low-Res.pdf). ' +
    'Variante avec semoule de maïs cuite en poêle en fonte Lodge de 26 cm (10 1/4 po). Formule d’origine : dénominateur céréalier 257 g composé de 219 g farine tout usage (85,214 %) ' +
    'et 38 g semoule de maïs jaune fine (14,786 %). Eau 160 g (62,257 % hydratation totale), sel casher 4,5 g (1,751 %), levure instantanée 3 g (1,167 %), ' +
    'sucre 4 g (1,556 %), huile d’olive 14 g (5,447 %), beurre fondu 14 g (5,447 %). Garnitures multicouches exclues de la formule de pâte. ' +
    'Pétrissage 12 min ; pointage 37,5 min à 24 °C (75 °F) ; fonçage en poêle 10 min ; garniture en couches 10 min ; sans apprêt séparé ; ' +
    'préchauffage 30 min à 230 °C (450 °F) ; cuisson 27,5 min à 230 °C, couverte d’aluminium après 20 min ; ressuage 12,5 min.',

  'pizza-sicilian':
    'King Arthur Baking — Pizza sicilienne (https://www.kingarthurbaking.com/recipes/sicilian-style-pizza-recipe). ' +
    'Adaptation sur une journée pour demi-plaque de 45 × 33 cm (18 × 13 po). Formule d’origine : 540 g farine riche en gluten, jusqu’à 397 g eau (jusqu’à 73,519 %), ' +
    '12 g sel de table (2,222 %), 2 c. à café levure instantanée (6 g, 1,111 %). Les 14 g d’huile d’olive appartiennent à la garniture d’oignons et sont exclus de la pâte. ' +
    'Pétrissage 8 min à 21 °C ; pointage 1 h à 21 °C ; étalage en plaque huilée 10 min ; détente 12,5 min ; finition de l’étirage 5 min ; ' +
    'apprêt en plaque 1,5 h à 21 °C ; préchauffage 30 min à 232 °C (450 °F) ; précuisson de la pâte seule 11 min à 232 °C ; garniture 10 min ; ' +
    'cuisson finale avec garniture 17,5 min à 232 °C ; repos 10 min avant découpe.',

  'pizza-teglia':
    'La Confraternita della Pizza — Disciplinare Autentica Pizza in Teglia alla Romana (https://laconfraternitadellapizza.net/documenti/Disciplinare-Autentica-Pizza-In-Teglia-Alla-Romana.pdf). ' +
    'Exemple normatif du disciplinare sur 48 h au batteur pour plaque en tôle bleue de 40 × 60 cm. Formule d’origine : 725 g farine (W 300–380), ' +
    '580 g eau à 4 °C (80 %), 18 g sel (2,483 %), 15 g huile d’olive (2,069 %), 4 g levure fraîche comprimée (0,552 %). Pâte totale ~1 342 g. ' +
    'Retient le four à sole électrique professionnel (sole 300–320 °C, voûte 200 °C, statique). Pétrissage mécanique 22,5 min, consigne de température de pâte 22 °C ; ' +
    'repos en masse 1 h ; blocage au froid 44 h à 4 °C ; division (staglio) 10 min ; apprêt (appretto) 3,5 h à 21 °C ; ' +
    'étalage en plaque (stesura) 10 min (cœur de pâte ≥19 °C) ; préchauffage 30 min ; cuisson 10,5 min ; ressuage 60 min sur grille.',
};

export const templateBasis = (locale: Locale, id: string, originalBasis: string): string => {
  if (locale === 'en') {
    return originalBasis;
  }
  return TEMPLATE_BASIS_FR[id] ?? originalBasis;
};
