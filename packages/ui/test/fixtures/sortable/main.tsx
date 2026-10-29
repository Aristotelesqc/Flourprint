/** Test-only controlled caller for system/manual reduction and cancellation evidence. */
import { useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { IonApp, IonContent, setupIonicReact } from '@ionic/react';
import '../../../catalogue.css';
import { defaultMotionManifest, MotionProvider } from '../../../src/index.ts';
import {
  SortableItem,
  SortableList,
  SortableSlot,
} from '../../../src/components/sortable-list/v1.tsx';
import type {
  DropIntent,
  DropOutcome,
  SortableHandle,
} from '../../../src/components/sortable-list/props.ts';

setupIonicReact();
const query = new URLSearchParams(location.search);
document.documentElement.setAttribute('data-theme', query.get('theme') ?? 'light');
document.documentElement.style.fontSize = query.get('scale') === '130' ? '130%' : '100%';
const initial = [
  { id: '__start__', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
  { id: 'gamma', label: 'Gamma' },
  ...(query.get('long') === 'true'
    ? Array.from({ length: 24 }, (_, index) => ({
        id: `item-${index + 4}`,
        label: `Item ${index + 4}`,
      }))
    : []),
];

function Fixture(): ReactElement {
  const [items, setItems] = useState(initial);
  const [manualReduced, setManualReduced] = useState(query.get('motion') === 'reduced');
  const [disabled, setDisabled] = useState(false);
  const [events, setEvents] = useState<readonly unknown[]>([]);
  const control = useRef<SortableHandle>(null);
  const commit = (intent: DropIntent | null): DropOutcome => {
    setEvents((previous) => [...previous, { intent }]);
    if (!intent) return 'unchanged';
    setItems((previous) => {
      const moving = previous.find((item) => item.id === intent.id);
      if (!moving) return previous;
      const remaining = previous.filter((item) => item.id !== intent.id);
      const index =
        intent.afterId === null ? 0 : remaining.findIndex((item) => item.id === intent.afterId) + 1;
      return [...remaining.slice(0, index), moving, ...remaining.slice(index)];
    });
    return 'accepted';
  };
  return (
    <MotionProvider value={defaultMotionManifest}>
      <IonApp className="fp-ionic">
        <IonContent>
          <main className="px-4 py-3" data-motion={manualReduced ? 'reduced' : undefined}>
            <h1>Sortable verification fixture</h1>
            <button
              type="button"
              onClick={() => setManualReduced((value) => !value)}
              aria-pressed={manualReduced}
            >
              Manual reduced motion
            </button>
            <button
              type="button"
              onClick={() => setDisabled((value) => !value)}
              aria-pressed={disabled}
            >
              Disable sorting
            </button>
            <button
              type="button"
              onClick={() => {
                const cancelResult = control.current?.cancelDrag() ?? false;
                setEvents((previous) => [...previous, { cancelResult }]);
              }}
            >
              Cancel current drag
            </button>
            <section aria-label="Controlled list">
              <SortableList
                ref={control}
                disabled={disabled}
                items={items}
                instructions={{
                  draggable: 'Space to lift, arrows to move, Space to drop, Escape to cancel.',
                }}
                announcements={{
                  dragStarted: (item) => `Picked up ${item.label}.`,
                  dragEnded: (item, afterId) =>
                    `Dropped ${item.label} after ${items.find((candidate) => candidate.id === afterId)?.label ?? 'start'}.`,
                  dragCancelled: (item) => `Cancelled ${item.label}.`,
                }}
                onDragActiveChange={(active) => setEvents((previous) => [...previous, { active }])}
                onDropIntent={commit}
                renderOverlay={(id) => (
                  <div className="rounded-card border bg-surface p-3">
                    {items.find((item) => item.id === id)?.label}
                  </div>
                )}
              >
                <SortableSlot afterId={null} />
                {items.map((item) => (
                  <div key={item.id}>
                    <SortableItem id={item.id}>
                      {({ handleRef }) => (
                        <div className="flex min-h-touch items-center justify-between border border-outline bg-surface p-3">
                          <span>{item.label}</span>
                          <button
                            ref={handleRef}
                            type="button"
                            className="min-h-touch min-w-touch"
                            aria-label={`Drag ${item.label}`}
                          >
                            Move
                          </button>
                        </div>
                      )}
                    </SortableItem>
                    <SortableSlot afterId={item.id} />
                  </div>
                ))}
              </SortableList>
            </section>
            <pre aria-label="Intent and activation log">{JSON.stringify(events)}</pre>
          </main>
        </IonContent>
      </IonApp>
    </MotionProvider>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(<Fixture />);
