import type { ReactNode } from 'react';

/** Layout pieces of the #8 mockups. */

export const Card = ({
  children,
  gap = 'gap-3',
  className = '',
}: {
  children: ReactNode;
  gap?: string;
  className?: string;
}) => <div className={`m3-card ${gap} ${className}`}>{children}</div>;

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <span className="m3-type-supporting px-1 font-semibold text-muted">{children}</span>
);

/** Rows inside one card, separated by lines. */
export const Rows = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line">
    {children}
  </div>
);
