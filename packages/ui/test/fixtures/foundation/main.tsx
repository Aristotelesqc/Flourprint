/** Test-only controlled consumers; never included in a release build. */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { IonApp, IonContent, setupIonicReact } from '@ionic/react';
import '../../../catalogue.css';
import { createUi, defaultMotionManifest, library, MotionProvider } from '../../../src/index.ts';
import button from '../../../src/components/button/v1.tsx';
import surface from '../../../src/components/surface/v1.tsx';
import numberField from '../../../src/components/number-field/v1.tsx';
import disclosure from '../../../src/components/disclosure/v1.tsx';
import tabs from '../../../src/components/tabs/v1.tsx';
import floatingMenu from '../../../src/components/floating-menu/v1.tsx';
import bottomSheet from '../../../src/components/bottom-sheet/v1.tsx';
import dialog from '../../../src/components/dialog/v1.tsx';
import select from '../../../src/components/select/v1.tsx';

setupIonicReact();
const { Ui } = createUi(
  library.manifest({
    'fp.button': button,
    'fp.surface': surface,
    'fp.number-field': numberField,
    'fp.disclosure': disclosure,
    'fp.tabs': tabs,
    'fp.floating-menu': floatingMenu,
    'fp.bottom-sheet': bottomSheet,
    'fp.dialog': dialog,
    'fp.select': select,
  }),
);
const query = new URLSearchParams(location.search);
const theme = query.get('theme') ?? 'light';
const scopeTheme = query.get('scopeTheme') ?? theme;
const motion = query.get('motion') ?? 'standard';
const scopeMotion = query.get('scopeMotion') ?? motion;
document.documentElement.setAttribute('data-theme', theme);
document.documentElement.setAttribute('data-motion', motion);
document.documentElement.style.fontSize = query.get('scale') === '130' ? '130%' : '100%';

function Fixture(): ReactElement {
  const [raw, setRaw] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState('first');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissAllowed, setDismissAllowed] = useState(false);
  const [dialogRaw, setDialogRaw] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRaw, setSheetRaw] = useState('');
  const [choice, setChoice] = useState<string | undefined>('first');
  const [actionStatus, setActionStatus] = useState('No action executed');
  const dismissed = useRef(false);
  useEffect(() => {
    const willPresent = (): void => {
      dismissed.current = false;
    };
    const didDismiss = (): void => {
      dismissed.current = true;
    };
    document.addEventListener('ionPopoverWillPresent', willPresent, true);
    document.addEventListener('ionPopoverDidDismiss', didDismiss, true);
    return () => {
      document.removeEventListener('ionPopoverWillPresent', willPresent, true);
      document.removeEventListener('ionPopoverDidDismiss', didDismiss, true);
    };
  }, []);
  const executeAction = (): void => {
    setActionStatus(
      dismissed.current ? 'Action executed after dismissal' : 'Action executed before dismissal',
    );
  };
  return (
    <MotionProvider value={defaultMotionManifest}>
      <IonApp className="fp-ionic">
        <IonContent>
          <main
            data-theme={scopeTheme}
            data-motion={scopeMotion}
            className="p-4 bg-background text-on-surface min-h-screen"
          >
            <h1>Shared foundation behaviour fixture</h1>
            <section aria-label="Fields and actions">
              <Ui
                component="fp.number-field"
                label="Raw amount"
                value={raw}
                onValueChange={setRaw}
                unit="g"
              />
              <Ui component="fp.button" variant="primary">
                Primary action
              </Ui>
              <Ui component="fp.button" variant="secondary">
                Secondary action
              </Ui>
              <Ui component="fp.button" variant="quiet">
                Quiet action
              </Ui>
              <Ui component="fp.button" variant="danger">
                Destructive action
              </Ui>
              <Ui component="fp.button" disabled>
                Unavailable action
              </Ui>
              <Ui component="fp.surface">
                <p>Opaque surface content</p>
              </Ui>
            </section>
            <section aria-label="Mounted disclosure">
              <Ui
                component="fp.disclosure"
                label="Preserved details"
                expanded={expanded}
                onExpandedChange={setExpanded}
              >
                <label htmlFor="disclosure-scratch">Disclosure scratch value</label>
                <input id="disclosure-scratch" type="text" defaultValue="" />
                <Ui component="fp.button" variant="secondary" onClick={() => setExpanded(false)}>
                  Collapse from inside
                </Ui>
              </Ui>
            </section>
            <section aria-label="Real tab panels">
              <Ui
                component="fp.tabs"
                label="Fixture sections"
                selected={selected}
                onSelectedChange={setSelected}
                items={[
                  {
                    id: 'first',
                    label: 'First section',
                    panel: (
                      <>
                        <label htmlFor="panel-scratch">Panel scratch value</label>
                        <input id="panel-scratch" type="text" defaultValue="" />
                      </>
                    ),
                  },
                  {
                    id: 'unavailable',
                    label: 'Unavailable section',
                    disabled: true,
                    panel: 'Unavailable panel content',
                  },
                  { id: 'second', label: 'Second section', panel: 'Second panel content' },
                  { id: 'third', label: 'Third section', panel: 'Third panel content' },
                ]}
              />
            </section>
            <section aria-label="Context menus">
              <Ui
                component="fp.floating-menu"
                title="Fixture actions"
                triggerLabel="Open actions"
                closeLabel="Close actions"
                scrollHint="More actions below"
                actions={[
                  {
                    id: 'edit',
                    label: 'Edit a descriptive fixture entry',
                    onSelect: executeAction,
                  },
                  { id: 'duplicate', label: 'Duplicate fixture entry', onSelect: executeAction },
                  {
                    id: 'unavailable',
                    label: 'Unavailable menu action',
                    disabled: true,
                    onSelect: executeAction,
                  },
                  { id: 'export', label: 'Export fixture entry', onSelect: executeAction },
                  {
                    id: 'delete',
                    label: 'Delete fixture entry',
                    destructive: true,
                    onSelect: executeAction,
                  },
                ]}
              />
              <Ui
                component="fp.floating-menu"
                title="Many fixture actions"
                triggerLabel="Open long actions"
                closeLabel="Close long actions"
                scrollHint="More actions below"
                actions={[
                  ...Array.from({ length: 20 }, (_, index) => ({
                    id: `item-${index}`,
                    label: `Fixture action ${index + 1}`,
                    onSelect: executeAction,
                  })),
                  {
                    id: 'last',
                    label: 'Final destructive action',
                    destructive: true,
                    onSelect: executeAction,
                  },
                ]}
              />
              <p role="status" aria-label="Action result">
                {actionStatus}
              </p>
            </section>
            <section aria-label="Controlled modal consumers">
              <Ui
                component="fp.button"
                onClick={() => {
                  setDismissAllowed(false);
                  setDialogOpen(true);
                }}
              >
                Open compact dialog
              </Ui>
              <Ui
                component="fp.dialog"
                isOpen={dialogOpen}
                title="Edit a measurement"
                closeLabel="Close dialog"
                onDismiss={() => setDialogOpen(false)}
                canDismiss={dismissAllowed}
                footer={
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    onClick={() => setDismissAllowed(true)}
                  >
                    Allow dialog dismissal
                  </Ui>
                }
              >
                <Ui
                  component="fp.number-field"
                  label="Dialog amount"
                  value={dialogRaw}
                  onValueChange={setDialogRaw}
                />
              </Ui>
              <Ui component="fp.button" onClick={() => setSheetOpen(true)}>
                Open editor sheet
              </Ui>
              <Ui
                component="fp.bottom-sheet"
                isOpen={sheetOpen}
                title="Edit fixture details"
                closeLabel="Cancel sheet"
                onDismiss={() => setSheetOpen(false)}
              >
                <Ui
                  component="fp.number-field"
                  label="Sheet amount"
                  value={sheetRaw}
                  onValueChange={setSheetRaw}
                />
              </Ui>
            </section>
            <section aria-label="Controlled selection">
              <Ui
                component="fp.select"
                label="Choose flour"
                value={choice}
                onValueChange={setChoice}
                cancelText="Cancel selection"
                okText="Confirm selection"
                options={[
                  { id: 'first', label: 'First flour' },
                  { id: 'disabled', label: 'Unavailable flour', disabled: true },
                  { id: 'second', label: 'Second flour' },
                ]}
                description="Choose one available fixture option."
              />
              <p role="status" aria-label="Selected option">
                {choice}
              </p>
            </section>
          </main>
        </IonContent>
      </IonApp>
    </MotionProvider>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(<Fixture />);
