import React, { useRef, useState, useEffect } from 'react';
import type { Section } from './model';
import type { Locale } from './messages';
import { navCopyT } from './navigation-copy';
import { Ui } from './library';
import './section-carousel.css';

export interface SectionCarouselProps {
  readonly sections: readonly Section[];
  readonly activeSection: Section;
  readonly onChangeSection: (section: Section) => void;
  readonly locale: Locale;
  readonly reduced: boolean;
  readonly children: React.ReactNode;
}

export function SectionCarousel({
  sections,
  activeSection,
  onChangeSection,
  locale,
  reduced,
  children,
}: SectionCarouselProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tabsElement, setTabsElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const landmark =
      el.closest('[data-tabs-scope], [data-navigation], [role="application"], body') ??
      el.parentElement?.parentElement;
    const found = landmark?.querySelector<HTMLElement>(
      '[data-fp-component="fp.tabs"], .section-tabs, [role="tablist"]',
    );
    if (found) {
      setTabsElement(found);
    }
  }, []);

  return (
    <div ref={wrapperRef} style={{ display: 'contents' }}>
      <Ui
        component="fp.section-carousel"
        sections={sections}
        activeSection={activeSection}
        onChangeSection={(sec: string) => onChangeSection(sec as Section)}
        label={navCopyT(locale, 'carouselLabel')}
        reduced={reduced}
        targetTabsElement={tabsElement}
      >
        {children}
      </Ui>
    </div>
  );
}
