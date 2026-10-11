import { useIonRouter } from '@ionic/react';
import { useEffect, useRef } from 'react';
import { useMessages } from '../i18n/use-messages';
import { activeBakes } from './bakes';
import { BAKES_CHANGED, onRealClock, remindersFor } from './notifications';
import { useServices } from './services';

/**
 * Keeps the system reminders in step with the running bakes of the current world (ADR 0012,
 * ADR 0014): at start-up, after every bake command, when the simulation mode or its clock changes
 * and when the app comes back to the foreground. Renders nothing.
 */
export const NotificationSync = () => {
  const services = useServices();
  const { t, stepName } = useMessages();
  const router = useIonRouter();
  const asked = useRef(false);
  // The latest texts without restarting the listeners on every render.
  const texts = useRef({ t, stepName });
  texts.current = { t, stepName };
  const navigate = useRef(router.push);
  navigate.current = router.push;

  useEffect(() => {
    const { notifier } = services;
    let queued = Promise.resolve();
    const sync = () => {
      queued = queued.then(async () => {
        try {
          const bakes = await Promise.all(
            (await activeBakes(services))
              .flatMap(({ result }) => (result.ok ? [result.value] : []))
              .map(async (state) => {
                const id = state.snapshot?.revisions.formula.id;
                const recipe = id ? (await services.recipes.getRecipe(id))?.name : undefined;
                return { state, ...(recipe === undefined ? {} : { recipe }) };
              }),
          );
          const { t: translate, stepName: nameStep } = texts.current;
          const { simulation, offsetMs } = services.preferences.get();
          const due = remindersFor(
            bakes,
            services.clock.now(),
            (state, stepId) => {
              const step = state.process?.steps.find((s) => s.id === stepId);
              return step ? nameStep(step) : stepId;
            },
            {
              title: (alert, step) =>
                translate(`notify.${alert.kind}.title`, {
                  step,
                  set: alert.set ?? '',
                  count: alert.count ?? '',
                }),
              body: (alert, step, recipe) =>
                translate(`notify.${alert.kind}.body`, {
                  step,
                  recipe,
                  set: alert.set ?? '',
                  count: alert.count ?? '',
                }),
            },
          );
          const reminders = onRealClock(due, simulation ? offsetMs : 0);
          // Ask once per session, and only when there is something to remind.
          if (reminders.length > 0 && !asked.current) {
            asked.current = true;
            if ((await notifier.permission()) === 'prompt') await notifier.request();
          }
          await notifier.replace(reminders);
        } catch (error) {
          console.error(error);
        }
      });
    };
    const resume = () => {
      if (document.visibilityState === 'visible') sync();
    };
    sync();
    const stopPreferences = services.preferences.subscribe(sync);
    window.addEventListener(BAKES_CHANGED, sync);
    document.addEventListener('visibilitychange', resume);
    const stop = notifier.onOpen((bakeId) => navigate.current(`/bakes/${bakeId}`));
    return () => {
      window.removeEventListener(BAKES_CHANGED, sync);
      document.removeEventListener('visibilitychange', resume);
      stop();
      stopPreferences();
    };
  }, [services]);

  return null;
};
