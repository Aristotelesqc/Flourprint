import type { RecipeTemplate } from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { useTemperature } from '../i18n/temperature';
import { useMessages } from '../i18n/use-messages';

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

/** The unit of a range, from the suffix of its code (drafts.md, Templates). */
const UNITS: readonly [string, string][] = [
  ['_pct', '%'],
  ['_h', 'h'],
  ['_min', 'min'],
  ['_s', 's'],
  ['_w', ''],
];
/** A temperature range: `_c` codes; the guide's are oven temperatures (`bake_…`). */
const temperatureOf = (key: string) =>
  key.replace(/_high$/, '').endsWith('_c')
    ? key.startsWith('bake')
      ? ('oven' as const)
      : ('ambient' as const)
    : undefined;
const unitOf = (key: string): string => {
  const base = key.replace(/_high$/, '').replace(/_13in$|_half_sheet$/, '');
  if (base.endsWith('_g')) return 'g';
  return UNITS.find(([suffix]) => base.endsWith(suffix))?.[1] ?? '';
};

/**
 * Published reference values for the selected variant, with its source and editorial choices.
 * A guide, never a rule: nothing is checked against it.
 */
export const StyleGuide = ({ template }: { template: RecipeTemplate }) => {
  const { t, locale } = useMessages();
  const temperature = useTemperature();
  const traits = `template.${template.id}.traits`;
  const guide = template.guide;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return (
    <section
      aria-label={t('guide.title')}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
    >
      <span className="text-sm font-bold tracking-wider text-muted uppercase">
        {t('guide.title')}
      </span>
      {isKey(traits) && <p className="m-0 text-[15px]">{t(traits)}</p>}
      <details className="text-sm text-muted">
        <summary className="cursor-pointer">{t('guide.basis')}</summary>
        <p className="mt-2 mb-0 whitespace-pre-line">{template.basis}</p>
      </details>
      {guide && guide.ranges.length > 0 && (
        <>
          <span className="text-sm font-semibold">{t('guide.ranges')}</span>
          <p className="m-0 text-xs text-muted">{t('guide.referenceNote')}</p>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[15px]">
            {guide.ranges.map((range) => {
              const label = `guide.key.${range.key}`;
              const context = temperatureOf(range.key);
              const unit = context ? temperature.unit(context) : unitOf(range.key);
              // Temperatures in the device's unit, whole degrees (values-and-units.md).
              const shown = (value: number) =>
                context ? temperature.editable(value, context) : number(value);
              const value =
                range.low === range.high
                  ? shown(range.low)
                  : `${shown(range.low)}–${shown(range.high)}`;
              return (
                <div key={range.key} className="contents">
                  <dt className="text-muted">{isKey(label) ? t(label) : range.key}</dt>
                  <dd className="m-0 text-right font-semibold">
                    {unit ? `${value} ${unit}` : value}
                  </dd>
                </div>
              );
            })}
          </dl>
          {!guide.verified && <p className="m-0 text-xs text-muted">{t('guide.unverified')}</p>}
        </>
      )}
    </section>
  );
};
