interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface Props<T extends string> {
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
  readonly size?: 'regular' | 'small';
}

/** Pill segmented control of the #8 mockups; real buttons, so it is reachable by keyboard. */
export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  size = 'regular',
}: Props<T>) => (
  <div
    role="group"
    className="grid gap-1 rounded-2xl bg-track p-1"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(option.value)}
          className={`fp-reset flex min-w-0 items-center justify-center rounded-xl text-center leading-tight [overflow-wrap:anywhere] hyphens-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            size === 'small' ? 'min-h-9 px-1 py-0.5 text-[15px]' : 'min-h-10 px-2 py-1'
          } ${selected ? 'bg-surface font-bold shadow-sm text-ink' : 'font-semibold text-muted'}`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
