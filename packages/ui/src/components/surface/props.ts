import type { HTMLAttributes, ReactNode } from 'react';

export type SurfaceVariant = 'surface' | 'container' | 'outlined';
export type SurfacePadding = 'compact' | 'normal' | 'none';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: SurfaceVariant;
  readonly padding?: SurfacePadding;
  readonly children: ReactNode;
}
