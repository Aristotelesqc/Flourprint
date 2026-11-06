import type { ReactNode, Ref } from 'react';

export interface SectionCarouselProgressDetail {
  readonly fromId: string;
  readonly toId: string;
  readonly progress: number;
}

export interface SectionCarouselControl {
  selectSection(id: string): void;
  cancel(): void;
}

export interface SectionCarouselProps {
  /** Ordered list of section identifiers. */
  readonly sections: readonly string[];
  /** Controlled active section identifier. */
  readonly activeSection: string;
  /** Callback committed only after settle completes, once. */
  readonly onChangeSection: (id: string) => void;
  /** Accessible label describing the carousel region. */
  readonly label: string;
  /** Child panes corresponding to sections in the same order. */
  readonly children: readonly ReactNode[] | ReactNode;
  /** Optional disabled flag (e.g. during step drag or modal presentation). */
  readonly disabled?: boolean | undefined;
  /** Imperative control ref for programmatic selection and cancellation. */
  readonly control?: Ref<SectionCarouselControl> | undefined;
  /** Optional external scroller element (IonContent scrollElement). */
  readonly scrollElement?: HTMLElement | null | undefined;
  /** Function to read remembered scrollTop for any section identifier. */
  readonly getScrollPosition?: ((id: string) => number) | undefined;
  /** Real-time gesture and settle progress callback for synchronizing tab indicators. */
  readonly onGestureProgress?: ((detail: SectionCarouselProgressDetail | null) => void) | undefined;
  /** Optional callback fired before commit/selection (e.g. to blur active input). */
  readonly onBeforeChange?: (() => void) | undefined;
  /** Optional container className. */
  readonly className?: string | undefined;
}
