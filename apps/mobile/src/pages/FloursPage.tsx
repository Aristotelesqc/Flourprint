import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { useEffect, useEffectEvent, useId, useState, type ReactNode } from 'react';
import { archiveFlour, saveFlourEntry, type SaveFlourError } from '@flourprint/core/application';
import {
  builtInFlour,
  CEREALS,
  customizeFlour,
  FLOUR_PCT_BASES,
  FLOUR_PROPERTY_KEYS,
  FLOUR_PROPERTY_KINDS,
  FLOUR_SOURCE_KINDS,
  newFlourEntry,
  nextFlourVersion,
  OFFERED_BUILT_IN_FLOURS,
  REFINEMENTS,
  withFlourChanges,
  type FlourEntry,
  type FlourPropertyKey,
  type Instant,
  type PropertyValue,
} from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { formatNumber } from '../i18n/numbers';
import { useMessages } from '../i18n/use-messages';
import {
  flourForm,
  formChanges,
  knownCount,
  propertyValid,
  withPropertyValue,
  type FlourForm,
  type PropertyForm,
} from '../services/flour-form';
import { flourSummary } from '../services/flour-summary';
import { newFlourId, useFlourCatalog } from '../services/flours';
import { useServices } from '../services/services';
import { useGuardedWrite } from '../services/writes';
import { InfoButton } from '../ui/InfoButton';
import { SectionTitle } from '../ui/Layout';

/**
 * What the sheet shows: a built-in entry (read-only), the latest version of a personal entry
 * (edited into its next version) or a personal entry not written yet (new or customized).
 */
type Target =
  | { readonly kind: 'builtIn'; readonly entry: FlourEntry }
  | { readonly kind: 'edit'; readonly entry: FlourEntry }
  | { readonly kind: 'create'; readonly entry: FlourEntry };

/** Flour registry screen (flours.md): built-in and personal flours, archived ones on demand. */
export const FloursPage = () => {
  const { t, flourName } = useMessages();
  const catalog = useFlourCatalog();
  const services = useServices();
  const [showArchived, setShowArchived] = useState(false);
  const [target, setTarget] = useState<Target>();

  useIonViewWillEnter(() => void catalog.reload());

  const personal = catalog.personal
    .filter((entry) => showArchived || !entry.archived)
    .sort((a, b) => flourName(a).localeCompare(flourName(b)));
  const archivedCount = catalog.personal.filter((entry) => entry.archived).length;

  const create = () =>
    setTarget({
      kind: 'create',
      entry: newFlourEntry({
        id: '',
        name: t('flours.newName'),
        createdAt: services.realClock.now(),
      }),
    });

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <IonTitle>
            <span className="inline-flex items-center gap-2">
              {t('flours.title')}
              <InfoButton topic="flours" term={t('flours.title')} />
            </span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="flex flex-col gap-3 px-4 pt-3">
          <IonButton expand="block" onClick={create}>
            {t('flours.new')}
          </IonButton>
        </div>
        <IonList>
          <IonListHeader>
            <IonLabel>{t('flours.personal')}</IonLabel>
          </IonListHeader>
          {personal.length === 0 && (
            <IonItem lines="none">
              <IonLabel className="ion-text-wrap">
                <p>{t('flours.empty')}</p>
              </IonLabel>
            </IonItem>
          )}
          {personal.map((entry) => (
            <FlourItem
              key={entry.id}
              entry={entry}
              onOpen={() => setTarget({ kind: 'edit', entry })}
            />
          ))}
          {archivedCount > 0 && (
            <IonItem lines="none">
              <IonToggle
                checked={showArchived}
                onIonChange={(event) => setShowArchived(event.detail.checked)}
              >
                {t('flours.showArchived')}
              </IonToggle>
            </IonItem>
          )}
          <IonListHeader>
            <IonLabel>{t('flours.builtIn')}</IonLabel>
          </IonListHeader>
          {OFFERED_BUILT_IN_FLOURS.map((entry) => (
            <FlourItem
              key={entry.id}
              entry={entry}
              onOpen={() => setTarget({ kind: 'builtIn', entry })}
            />
          ))}
        </IonList>
        <FlourSheet target={target} onTarget={setTarget} onClose={() => setTarget(undefined)} />
      </IonContent>
    </IonPage>
  );
};

/** The description of a built-in entry (message key `flour.<id>.description`), if it has one. */
const descriptionKey = (entry: FlourEntry): MessageKey | undefined => {
  const key = `flour.${entry.id}.description`;
  return entry.builtIn && key in en ? (key as MessageKey) : undefined;
};

const FlourItem = ({ entry, onOpen }: { entry: FlourEntry; onOpen: () => void }) => {
  const { t, flourName, name, locale } = useMessages();
  const description = descriptionKey(entry);
  const details = [
    [entry.brand, entry.product].filter(Boolean).join(' '),
    // Classification and values: known plain, estimated with ≈ (built-in typical values).
    flourSummary(entry, t, locale),
    entry.basedOn ? t('flours.basedOn', { name: name(entry.basedOn.id) }) : '',
    entry.builtIn ? '' : t('flours.version', { version: entry.version }),
    entry.builtIn ? '' : t('flours.known', { count: knownCount(entry) }),
  ].filter((part) => part !== '');
  return (
    <IonItem button detail onClick={onOpen}>
      <IonLabel className="ion-text-wrap">
        {flourName(entry)}
        {entry.archived && (
          <span className="ml-2 rounded-full bg-track px-2 text-[12px] font-semibold text-muted">
            {t('flours.archived')}
          </span>
        )}
        {description && <p>{t(description)}</p>}
        {details.length > 0 && <p>{details.join(' · ')}</p>}
      </IonLabel>
    </IonItem>
  );
};

const FlourSheet = ({
  target,
  onTarget,
  onClose,
}: {
  target: Target | undefined;
  onTarget: (target: Target) => void;
  onClose: () => void;
}) => {
  const { t, flourName, name, error, locale } = useMessages();
  const services = useServices();
  const catalog = useFlourCatalog();
  const writes = useGuardedWrite();
  const [form, setForm] = useState<FlourForm>();
  const [problem, setProblem] = useState<string>();
  const [invalid, setInvalid] = useState<readonly string[]>([]);

  const resetOnTarget = useEffectEvent(() => {
    setProblem(undefined);
    setInvalid([]);
    setForm(target && flourForm(target.entry, flourName(target.entry), locale));
    // Reset only when another entry is opened: the names refresh while the sheet is open.
  });
  useEffect(() => resetOnTarget(), [target]);

  const now = (): Instant => services.realClock.now();

  const failed = async (failure: SaveFlourError) => {
    if (failure.code === 'HeadConflict' && target) {
      await catalog.reload();
      const latest = (await services.flours.listFlours()).find((e) => e.id === target.entry.id);
      if (latest) onTarget({ kind: 'edit', entry: latest });
      setProblem(t('flours.conflict'));
      return;
    }
    setProblem(error(failure));
  };

  const save = async () => {
    if (!target || !form || target.kind === 'builtIn') return;
    const read = formChanges(form, target.entry, locale);
    if (!read.ok) {
      setInvalid(read.invalid);
      setProblem(t(read.invalid.includes('name') ? 'flours.nameRequired' : 'flours.invalid'));
      return;
    }
    setInvalid([]);
    const result = await writes.run(async () => {
      if (target.kind === 'edit') {
        const next = nextFlourVersion(target.entry, read.changes, now());
        return next.ok ? saveFlourEntry(services.flours, next.value) : next;
      }
      const taken = (id: string) =>
        catalog.entry(id) !== undefined || builtInFlour(id) !== undefined;
      const id = newFlourId(read.changes.name ?? '', services.ids.next(), taken);
      return saveFlourEntry(services.flours, {
        ...withFlourChanges(target.entry, read.changes),
        id,
        version: 1,
        createdAt: now(),
      });
    });
    if (!result.ok) {
      setProblem(t('state.storageWrite'));
      return;
    }
    if (!result.value.ok) {
      await failed(result.value.error);
      return;
    }
    await catalog.reload();
    onClose();
  };

  const archive = async () => {
    if (target?.kind !== 'edit') return;
    const result = await writes.run(() =>
      archiveFlour(services.flours, target.entry, now(), !target.entry.archived),
    );
    if (!result.ok) {
      setProblem(t('state.storageWrite'));
      return;
    }
    if (!result.value.ok) {
      await failed(result.value.error);
      return;
    }
    await catalog.reload();
    onClose();
  };

  const customize = () => {
    if (target?.kind !== 'builtIn') return;
    onTarget({
      kind: 'create',
      entry: customizeFlour(target.entry, {
        id: '',
        name: flourName(target.entry),
        createdAt: now(),
      }),
    });
  };

  const readOnly = target?.kind === 'builtIn';
  const set = (changes: Partial<FlourForm>) => form && setForm({ ...form, ...changes });
  const setProperty = (key: FlourPropertyKey, changes: Partial<PropertyForm>) =>
    form &&
    setForm({
      ...form,
      properties: { ...form.properties, [key]: { ...form.properties[key], ...changes } },
    });

  return (
    <IonModal isOpen={target !== undefined} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{target ? flourName(target.entry) : ''}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('flours.close')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {target && form && (
          <div className="flex flex-col gap-4 pb-8">
            {readOnly && (
              <>
                {descriptionKey(target.entry) && (
                  <p className="m-0">{t(descriptionKey(target.entry) as MessageKey)}</p>
                )}
                <p className="m-0 text-sm text-muted">{t('flours.builtInNote')}</p>
                <IonButton onClick={customize}>{t('flours.customize')}</IonButton>
                <TypicalValues entry={target.entry} />
              </>
            )}
            {!readOnly && target.entry.basedOn && (
              <p className="m-0 text-sm text-muted">
                {t('flours.basedOn', { name: name(target.entry.basedOn.id) })}
                {target.kind === 'edit' &&
                  ` · ${t('flours.version', { version: target.entry.version })}`}
              </p>
            )}
            <SectionTitle>{t('flours.identity')}</SectionTitle>
            {!readOnly && (
              <TextField
                label={t('flours.field.name')}
                value={form.name}
                invalid={invalid.includes('name')}
                onChange={(name) => set({ name })}
              />
            )}
            <SelectField
              label={t('flours.field.cereal')}
              value={form.cereal}
              disabled={readOnly}
              options={CEREALS.map((c) => [c, t(`flours.cereal.${c}`)])}
              onChange={(cereal) => set({ cereal })}
            />
            <SelectField
              label={t('flours.field.refinement')}
              value={form.refinement}
              disabled={readOnly}
              options={REFINEMENTS.map((r) => [r, t(`flours.refinement.${r}`)])}
              onChange={(refinement) => set({ refinement })}
            />
            <TextField
              label={t('flours.field.classificationSystem')}
              value={form.system}
              disabled={readOnly}
              invalid={invalid.includes('classification')}
              onChange={(system) => set({ system })}
            />
            <TextField
              label={t('flours.field.classificationCode')}
              value={form.code}
              disabled={readOnly}
              invalid={invalid.includes('classification')}
              onChange={(code) => set({ code })}
            />
            {!readOnly && (
              <>
                <TextField
                  label={t('flours.field.brand')}
                  value={form.brand}
                  onChange={(brand) => set({ brand })}
                />
                <TextField
                  label={t('flours.field.product')}
                  value={form.product}
                  onChange={(product) => set({ product })}
                />
                <SectionTitle>{t('flours.properties')}</SectionTitle>
                <PropertyFields
                  label={t('flours.field.organic')}
                  kind="boolean"
                  form={form.organic}
                  invalid={invalid.includes('organic')}
                  onChange={(changes) => set({ organic: { ...form.organic, ...changes } })}
                />
                {FLOUR_PROPERTY_KEYS.map((key) => (
                  <PropertyFields
                    key={key}
                    label={t(`flours.prop.${key}` as MessageKey)}
                    kind={FLOUR_PROPERTY_KINDS[key].type}
                    form={form.properties[key]}
                    invalid={invalid.includes(key)}
                    onChange={(changes) => setProperty(key, changes)}
                  />
                ))}
                <TextField
                  label={t('flours.field.notes')}
                  value={form.notes}
                  multiline
                  onChange={(notes) => set({ notes })}
                />
              </>
            )}
            {problem && (
              <p role="alert" className="m-0 text-alert">
                {problem}
              </p>
            )}
            {!readOnly && (
              <span className="flex flex-wrap gap-2">
                <IonButton disabled={writes.busy} onClick={() => void save()}>
                  {writes.busy ? t('flours.saving') : t('flours.save')}
                </IonButton>
                {target.kind === 'edit' && (
                  <IonButton fill="outline" disabled={writes.busy} onClick={() => void archive()}>
                    {t(target.entry.archived ? 'flours.unarchive' : 'flours.archive')}
                  </IonButton>
                )}
              </span>
            )}
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

const fieldClass =
  'fp-field h-11 w-full rounded-[10px] border-[1.5px] border-field bg-field-bg px-2.5 disabled:opacity-70';

const Labelled = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
  <span className="flex flex-col gap-1">
    <label htmlFor={id} className="text-sm font-semibold">
      {label}
    </label>
    {children}
  </span>
);

const TextField = ({
  label,
  value,
  disabled,
  invalid,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) => {
  const id = useId();
  return (
    <Labelled id={id} label={label}>
      {multiline ? (
        <textarea
          id={id}
          className={`${fieldClass} h-24 py-2`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className={fieldClass}
          value={value}
          disabled={disabled}
          aria-invalid={invalid ? 'true' : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Labelled>
  );
};

const SelectField = <T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) => {
  const id = useId();
  return (
    <Labelled id={id} label={label}>
      <select
        id={id}
        className={fieldClass}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </Labelled>
  );
};

/** One property: its value (empty = unknown) and, once known, its basis and source. */
const PropertyFields = ({
  label,
  kind,
  form,
  invalid,
  onChange,
}: {
  label: string;
  kind: 'pct' | 'number' | 'boolean';
  form: PropertyForm;
  invalid: boolean;
  onChange: (changes: Partial<PropertyForm>) => void;
}) => {
  const { t } = useMessages();
  const id = useId();
  const known = form.value.trim() !== '';
  const bad = invalid || !propertyValid(form, { type: kind });
  return (
    <fieldset className="m-0 flex flex-col gap-2 rounded-2xl border border-line p-3">
      <legend className="px-1 font-semibold">{label}</legend>
      {kind === 'boolean' ? (
        <select
          aria-label={t('flours.field.value', { property: label })}
          className={fieldClass}
          value={form.value}
          onChange={(event) => onChange(withPropertyValue(form, event.target.value))}
        >
          <option value="">{t('flours.unknown')}</option>
          <option value="true">{t('flours.yes')}</option>
          <option value="false">{t('flours.no')}</option>
        </select>
      ) : (
        <>
          <input
            aria-label={t('flours.field.value', { property: label })}
            aria-invalid={bad ? 'true' : undefined}
            aria-describedby={bad ? `${id}-error` : undefined}
            inputMode="decimal"
            placeholder={t('flours.unknown')}
            className={fieldClass}
            value={form.value}
            onChange={(event) => onChange(withPropertyValue(form, event.target.value))}
          />
          {bad && (
            <span id={`${id}-error`} className="text-sm text-alert">
              {t('flours.invalidNumber')}
            </span>
          )}
        </>
      )}
      {form.estimated && <span className="text-sm text-muted">{t('flours.estimatedHint')}</span>}
      {known && kind === 'pct' && (
        <select
          aria-label={t('flours.field.basis', { property: label })}
          className={fieldClass}
          value={form.basis}
          onChange={(event) => onChange({ basis: event.target.value as PropertyForm['basis'] })}
        >
          {FLOUR_PCT_BASES.map((basis) => (
            <option key={basis} value={basis}>
              {t(`flours.basis.${basis}`)}
            </option>
          ))}
        </select>
      )}
      {known && (
        <>
          <select
            aria-label={t('flours.field.source', { property: label })}
            className={fieldClass}
            value={form.source}
            onChange={(event) => onChange({ source: event.target.value as PropertyForm['source'] })}
          >
            {FLOUR_SOURCE_KINDS.map((source) => (
              <option key={source} value={source}>
                {t(`flours.source.${source}`)}
              </option>
            ))}
          </select>
          <input
            aria-label={t('flours.field.detail', { property: label })}
            placeholder={t('flours.field.detail', { property: label })}
            className={fieldClass}
            value={form.detail}
            onChange={(event) => onChange({ detail: event.target.value })}
          />
        </>
      )}
    </fieldset>
  );
};

/**
 * The values a built-in gives for its category (flours.md, version 2): estimated, with their
 * uncertainty; unknown ones are left out.
 */
const TypicalValues = ({ entry }: { entry: FlourEntry }) => {
  const { t, pct, locale } = useMessages();
  const rows = FLOUR_PROPERTY_KEYS.flatMap((key) => {
    const property: PropertyValue = entry.properties[key];
    if (property.status === 'unknown' || typeof property.value !== 'number') return [];
    const pctKind = FLOUR_PROPERTY_KINDS[key].type === 'pct';
    const format = (n: number) => (pctKind ? pct(n) : formatNumber(n, locale));
    const value =
      property.status === 'estimated' && property.uncertainty !== undefined
        ? t('flours.estimateValue', {
            value: format(property.value),
            uncertainty: format(property.uncertainty),
          })
        : format(property.value);
    return [{ key, label: t(`flours.prop.${key}` as MessageKey), value }];
  });
  if (rows.length === 0) return null;
  return (
    <>
      <SectionTitle>{t('flours.typical')}</SectionTitle>
      <dl className="m-0 flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.key} className="flex justify-between gap-3">
            <dt>{row.label}</dt>
            <dd className="m-0 font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
};
