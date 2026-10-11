import type { ReactNode } from 'react';

/** Layout pieces of the #8 mockups. */

export const Card = ({ children, gap = 'gap-3' }: { children: ReactNode; gap?: string }) => (
  <div className={`flex flex-col ${gap} rounded-2xl border border-line bg-surface p-4`}>
    {children}
  </div>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <span className="px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">
    {children}
  </span>
);

/** Rows inside one card, separated by lines. */
export const Rows = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line">
    {children}
  </div>
);
