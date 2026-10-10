import { useIonRouter } from '@ionic/react';
import { useEffect, useRef } from 'react';
import { useMessages } from '../i18n/use-messages';
import { activeBakes } from './bakes';
import { BAKES_CHANGED, remindersFor } from './notifications';
import { useServices } from './services';

/**
 * Keeps the system reminders in step with the running bakes (ADR 0012): at start-up, after every
 * bake command and when the app comes back to the foreground. Renders nothing.
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
              .flatMap((r) => (r.ok ? [r.value] : []))
              .map(async (state) => {
                const id = state.snapshot?.revisions.formula.id;
                const recipe = id ? (await services.recipes.getRecipe(id))?.name : undefined;
                return { state, ...(recipe === undefined ? {} : { recipe }) };
              }),
          );
          const { t: translate, stepName: nameStep } = texts.current;
          const reminders = remindersFor(
            bakes,
            services.clock.now(),
            (state, stepId) => {
              const step = state.process?.steps.find((s) => s.id === stepId);
              return step ? nameStep(step) : stepId;
            },
            {
              title: (alert, step) =>
                translate(alert.kind === 'end' ? 'notify.end.title' : 'notify.start.title', {
                  step,
                }),
              body: (alert, step, recipe) =>
                translate(alert.kind === 'end' ? 'notify.end.body' : 'notify.start.body', {
                  step,
                  recipe,
                }),
            },
          );
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
    window.addEventListener(BAKES_CHANGED, sync);
    document.addEventListener('visibilitychange', resume);
    const stop = notifier.onOpen((bakeId) => navigate.current(`/bakes/${bakeId}`));
    return () => {
      window.removeEventListener(BAKES_CHANGED, sync);
      document.removeEventListener('visibilitychange', resume);
      stop();
    };
  }, [services]);

  return null;
};
