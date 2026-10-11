import { useSyncExternalStore } from 'react';
import type { DevicePreferences } from './preferences';
import { useServices } from './services';

/** The device preferences, re-rendering when one changes. */
export const usePreferences = (): DevicePreferences => {
  const { preferences } = useServices();
  return useSyncExternalStore(preferences.subscribe, preferences.get);
};
