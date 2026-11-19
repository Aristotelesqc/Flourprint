import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '@flourprint/core/application';
import { LEARNING_FLAGS, resolveFormula } from '@flourprint/core/domain';
import { createIntl } from 'react-intl';
import { en, fr } from '../src/i18n/messages';
import {
  getCuratedStepPresentation,
  LEGACY_TEMPLATE_STEP_LABELS,
  TEMPLATE_STEP_LABELS,
} from '../src/i18n/use-messages';
import { formatTemperature } from '../src/i18n/temperature';

/**
 * A temperature is shown once, in the unit the baker chose for its context (values-and-units.md,
 * Temperature display units): no message carries a literal unit. The only place a unit may be
 * written is an explanation of the setting itself.
 */
const LITERAL_UNIT = new RegExp(
  [
    // A degree-like sign (° º ˚) or a one-character unit (℃ ℉), whatever follows.
    '[°º˚℃℉]',
    // A number followed by C or F, with or without a degree word: "232C", "232 F", "232 degrees C".
    String.raw`\d\s*(?:deg(?:rees?|rés?)?\s*)?[CF]\b`,
  ].join('|') +
    // The scale named in words, in either language, in any case.
    String.raw`|\b(?:celsius|fahrenheit|degrees?|degrés?)\b`,
  'iu',
);

/** Messages allowed to name a unit, with the reason. */
const ALLOWED: ReadonlySet<string> = new Set([
  // The hint under the unit toggles explains that storage stays in °C.
  'advanced.units.hint',
]);

describe.each([
  ['en', en],
  ['fr', fr],
] as const)('message catalog %s', (_name, catalog) => {
  it('has no literal °C or °F outside the allow-list', () => {
    const offenders = Object.entries(catalog)
      .filter(([key, text]) => LITERAL_UNIT.test(text) && !ALLOWED.has(key))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it('keeps the allow-list honest: every allowed message really names a unit', () => {
    for (const key of ALLOWED) {
      expect(LITERAL_UNIT.test((catalog as Record<string, string>)[key] ?? ''), key).toBe(true);
    }
  });
});

describe('curated template step texts', () => {
  const labels = Object.entries({ ...LEGACY_TEMPLATE_STEP_LABELS, ...TEMPLATE_STEP_LABELS });

  it('exist in both languages for every label of every template, current or legacy', () => {
    for (const template of RECIPE_TEMPLATES) {
      for (const step of template.process.steps) {
        if (!step.label) continue;
        const curated = getCuratedStepPresentation(step.label);
        expect(curated, `${template.id}/${step.id}: ${step.label}`).toBeDefined();
        if (!curated) continue;
        for (const key of [curated.shortKey, curated.fullKey]) {
          expect(en[key].trim().length, `en ${key}`).toBeGreaterThan(0);
          expect(fr[key].trim().length, `fr ${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('are keyed by labels no template literal still carries a unit in', () => {
    for (const template of RECIPE_TEMPLATES) {
      for (const step of template.process.steps) {
        expect(step.label ?? '', `${template.id}/${step.id}`).not.toMatch(LITERAL_UNIT);
      }
    }
  });

  it('keep resolving the labels of earlier template versions, which carried a unit', () => {
    const legacy = Object.keys(LEGACY_TEMPLATE_STEP_LABELS);
    expect(legacy.length).toBeGreaterThan(0);
    for (const label of legacy) {
      expect(LITERAL_UNIT.test(label) || label.includes('43 g'), label).toBe(true);
      expect(getCuratedStepPresentation(label), label).toBeDefined();
    }
  });

  it('give every parameter a value and leave none unresolved', () => {
    for (const [label, curated] of labels) {
      for (const locale of ['en', 'fr'] as const) {
        const messages = locale === 'en' ? en : fr;
        const intl = createIntl({ locale: locale === 'en' ? 'en-US' : 'fr-CA', messages });
        const values = Object.fromEntries(
          Object.entries(curated.temperatures ?? {}).map(([name, celsius]) => [
            name,
            formatTemperature(celsius, 'F', locale === 'en' ? 'en-US' : 'fr-CA'),
          ]),
        );
        for (const key of [curated.shortKey, curated.fullKey]) {
          const text = intl.formatMessage({ id: key }, values);
          expect(text, `${locale} ${key} for ${label}`).not.toMatch(/\{\w+\}/);
          expect(text, `${locale} ${key} for ${label}`).not.toMatch(/°C/);
        }
      }
    }
  });

  it('restate no formula quantity of the template they belong to (they follow resizing)', () => {
    const gramsIn = (text: string) =>
      [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/g)].map(
        (m) => Number((m[1] ?? '').replace(',', '.')) * (m[2] === 'kg' ? 1000 : 1),
      );
    for (const template of RECIPE_TEMPLATES) {
      const resolved = resolveFormula(template.formula);
      if (!resolved.ok) throw new Error(template.id);
      const r = resolved.value;
      const quantities = new Set<number>(
        [
          ...Object.values(r.flourByFlour),
          ...Object.values(r.grams),
          ...Object.values(r.components).flatMap((c) => [
            c.flour,
            c.water,
            c.mass,
            ...Object.values(c.allocations),
          ]),
          r.doughWeight,
          r.flourTotal,
        ].map((g) => Math.round(g * 10) / 10),
      );
      for (const step of template.process.steps) {
        if (!step.label) continue;
        const curated = getCuratedStepPresentation(step.label);
        if (!curated) continue;
        for (const text of [en[curated.fullKey], fr[curated.fullKey]]) {
          for (const grams of gramsIn(text)) {
            expect(
              quantities.has(grams),
              `${template.id}/${step.id}: "${text}" states ${grams} g`,
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe('learning flag texts', () => {
  it('state the engine thresholds through parameters, in the baker’s unit', () => {
    for (const [name, messages] of [
      ['en-US', en],
      ['fr-CA', fr],
    ] as const) {
      const intl = createIntl({ locale: name, messages });
      const warm = intl.formatMessage(
        { id: 'fermentation.extra.dough_above_28c' },
        { limit: formatTemperature(LEARNING_FLAGS.warmAboveC, 'F', name, { digits: 1 }) },
      );
      expect(warm).toMatch(/82[.,]4 °F/);
      expect(warm).not.toContain('°C');
      const cold = intl.formatMessage(
        { id: 'fermentation.extra.cold_hold_over_72h' },
        { hours: LEARNING_FLAGS.coldHoldOverH },
      );
      expect(cold).toContain(String(LEARNING_FLAGS.coldHoldOverH));
    }
  });
});

describe('the unit lint', () => {
  it.each([
    '450 °F',
    '450 ºF',
    '450 ˚C',
    '450 °c',
    '450℃',
    '450℉',
    '450 degrees',
    '450 degrés',
    '450 degrees C',
    '232C',
    '232 C',
    '450 F',
    '232 Celsius',
    '450 fahrenheit',
    '450 °Celsius',
  ])('catches "%s"', (text) => {
    expect(LITERAL_UNIT.test(text)).toBe(true);
  });

  it.each([
    'Cuisson avec vapeur',
    'Bake 2 cups, 3 flours and 1 tray',
    'Cook 30 s per side',
    'Pétrir 2 min à basse vitesse',
    'Gluten at 10 % of the flour',
  ])('leaves "%s" alone', (text) => {
    expect(LITERAL_UNIT.test(text)).toBe(false);
  });
});

/**
 * Professional-only equipment (drafts.md, Templates, proposed rule 3): a built-in template says
 * nothing in its step texts or its traits that needs a professional oven or mixer, unless it is on
 * this list with its reason. The list is empty: the Roman and teglia templates carry a sourced
 * home bake instead. (The retired professional labels stay in the legacy table by design.)
 */
const PROFESSIONAL_ONLY: Readonly<Record<string, string>> = {};
const PROFESSIONAL = /professional|professionnel|deck oven|four à sole|four à pizza|spiral/i;

describe('no built-in template needs professional-only equipment', () => {
  it('in its step texts or its traits, in both languages', () => {
    for (const template of RECIPE_TEMPLATES) {
      if (template.id in PROFESSIONAL_ONLY) continue;
      const texts: [string, string][] = [];
      const traits = `template.${template.id}.traits` as keyof typeof en;
      texts.push(
        [`${template.id} traits en`, en[traits]],
        [`${template.id} traits fr`, fr[traits]],
      );
      for (const step of template.process.steps) {
        const curated = getCuratedStepPresentation(step.label);
        if (!curated) continue;
        for (const key of [curated.shortKey, curated.fullKey]) {
          texts.push(
            [`${template.id}/${step.id} en`, en[key]],
            [`${template.id}/${step.id} fr`, fr[key]],
          );
        }
      }
      for (const [where, text] of texts) expect(text, where).not.toMatch(PROFESSIONAL);
    }
  });
});
