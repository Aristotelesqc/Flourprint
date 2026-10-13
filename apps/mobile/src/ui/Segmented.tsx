import { useLayoutEffect, useRef, useState } from 'react';

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}
interface Props<T extends string> {
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
  readonly size?: 'regular' | 'small';
  readonly appearance?: 'segments' | 'tabs' | 'editor';
}

/** Shared selection control: full labels reflow when the font or available width changes. */
export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  size = 'regular',
  appearance = 'segments',
}: Props<T>) => {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const [wrapped, setWrapped] = useState(false);
  const labelKey = options.map((option) => option.label).join('\u0000');
  const count = options.length;
  useLayoutEffect(() => {
    const container = host.current;
    if (!container || count < 2) return;
    const weights =
      appearance === 'editor' && count === 4
        ? [1.2, 1.2, 0.75, 0.85]
        : Array<number>(count).fill(1);
    const measure = () => {
      if (container.clientWidth === 0) return;
      const style = getComputedStyle(container);
      const width =
        container.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        parseFloat(style.columnGap) * (count - 1);
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      setWrapped(
        labels.current.slice(0, count).some((label, index) => {
          if (!label?.parentElement) return false;
          const buttonStyle = getComputedStyle(label.parentElement);
          return (
            label.scrollWidth +
              parseFloat(buttonStyle.paddingLeft) +
              parseFloat(buttonStyle.paddingRight) >
            width * ((weights[index] ?? 1) / total) + 1
          );
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    labels.current.slice(0, count).forEach((label) => {
      if (label) observer.observe(label);
    });
    return () => observer.disconnect();
  }, [appearance, count, labelKey]);
  return (
    <div
      ref={host}
      role="group"
      className={`grid gap-1 ${appearance === 'tabs' ? 'm3-tabs' : 'rounded-2xl bg-track p-1'}`}
      style={{
        gridTemplateColumns: wrapped
          ? 'repeat(2, minmax(0, 1fr))'
          : appearance === 'editor' && count === 4
            ? '1.2fr 1.2fr 0.75fr 0.85fr'
            : `repeat(${count}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            style={
              wrapped && count % 2 === 1 && index === count - 1
                ? { gridColumn: '1 / -1' }
                : undefined
            }
            className={`fp-reset flex min-h-touch min-w-0 items-center justify-center font-semibold text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${appearance === 'editor' ? 'px-1 py-1 text-[0.8125rem]' : size === 'small' ? 'px-1 py-1 text-sm' : 'px-2 py-1 text-sm'} ${appearance === 'tabs' ? 'm3-tab' : `rounded-xl ${selected ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}`}
          >
            <span
              ref={(node) => {
                labels.current[index] = node;
              }}
              className="whitespace-nowrap leading-tight"
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
