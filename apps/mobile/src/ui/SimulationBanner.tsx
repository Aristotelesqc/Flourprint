import { useEffect, useState } from 'react';
import { formatDayTime } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';

/**
 * Says that the simulation mode is on (ADR 0014), with the simulated time, at the top of the main
 * screens. Nothing while the mode is off.
 */
export const SimulationBanner = () => {
  const { simulation, offsetMs } = usePreferences();
  const { clock } = useServices();
  const { t, locale } = useMessages();
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (!simulation) return;
    setNow(clock.now());
    const timer = setInterval(() => setNow(clock.now()), 15_000);
    return () => clearInterval(timer);
  }, [simulation, offsetMs, clock]);
  if (!simulation) return null;
  return (
    <div
      role="status"
      className="bg-accent-soft px-4 py-1.5 text-center text-[13px] font-semibold text-accent-text"
    >
      {t('sim.banner', { time: formatDayTime(now, locale) })}
    </div>
  );
};
