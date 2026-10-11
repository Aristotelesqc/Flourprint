import { exportFeedback } from '@flourprint/core/application';
import type { Services } from './services';

/** The feedback export (history.md) as compact JSON, for the clipboard or a file. */
export const feedbackJson = async (
  services: Services,
): Promise<{ json: string; bakes: number } | undefined> => {
  const now = services.realClock.now();
  // Both worlds, each bake with its origin (ADR 0014).
  const stores = { recipes: services.recipes, bakes: services.allBakes, flours: services.flours };
  const result = await exportFeedback(stores, now, {
    platform: services.platform,
    storage: services.storage,
    build: __APP_BUILD__,
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffsetMinutes: -new Date(now).getTimezoneOffset(),
  });
  if (!result.ok) return undefined;
  // Compact: the phone's clipboard has a size limit.
  return { json: JSON.stringify(result.value), bakes: result.value.bakes.length };
};

export const feedbackFileName = (now: string) =>
  `flourprint-feedback-${now.slice(0, 16).replace(/[:T]/g, '-')}.json`;
