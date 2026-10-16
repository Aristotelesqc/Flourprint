import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  shell,
  type MenuItemConstructorOptions,
  type WebContents,
} from 'electron';
import { BRIDGE_OPS, type BridgeOp } from '@flourprint/adapters/sqlite-bridge';
import { nodeSqliteBridge, openNodeDatabase } from '@flourprint/adapters/sqlite-node';
import { sameApp, shellChannel } from './channel.js';
import { catalogFor, type MessageKey } from './messages.js';
import {
  contentSize,
  DEVICES,
  effectiveSettings,
  parseSettings,
  ZOOMS,
  type Settings,
} from './settings.js';

/**
 * Desktop shell (ADR 0011): the APK's web build in a phone-sized window, touch simulated by the
 * mouse, SQLite in this process behind a bridge. No screen or business rule lives here. The dev
 * shell (#113) loads the dev address instead, without the bridge (see `channel.ts`).
 */

const SCHEME = 'app';
const ORIGIN = `${SCHEME}://flourprint`;
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 16; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/140.0.0.0 Mobile Safari/537.36';

const ownPackage = (): unknown => {
  try {
    return JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8'));
  } catch {
    return undefined;
  }
};
const channel = shellChannel(ownPackage(), process.env);

app.setName(channel.name);
// Windows shows web notifications (bake reminders, ADR 0012) only for an identified app.
if (process.platform === 'win32') app.setAppUserModelId(channel.appId);
// Tests and side-by-side profiles point the shell at another data folder; the dev shell never
// shares the release shell's.
if (process.env.FLOURPRINT_USER_DATA) app.setPath('userData', process.env.FLOURPRINT_USER_DATA);
else app.setPath('userData', join(app.getPath('appData'), channel.name));

const settingsFile = join(app.getPath('userData'), 'settings.json');
const readStored = (): Settings =>
  parseSettings(existsSync(settingsFile) ? readFileSync(settingsFile, 'utf8') : undefined);
const store = (settings: Settings) => {
  mkdirSync(app.getPath('userData'), { recursive: true });
  writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
};

let stored = readStored();
const settings = effectiveSettings(stored, process.argv, process.env);
// Both must be set before the app is ready.
if (settings.disableGpu) app.disableHardwareAcceleration();
if (settings.forceSrgb) app.commandLine.appendSwitch('force-color-profile', 'srgb');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** The web build: next to the shell when packaged, the mobile app's `dist` in the repository. */
const webRoot = (): string => {
  const packaged = join(app.getAppPath(), 'web');
  return existsSync(packaged) ? packaged : resolve(app.getAppPath(), '..', 'mobile', 'dist');
};

const t = (key: MessageKey) => catalogFor(app.getLocale())[key];

/** Touch from the mouse, a mobile user agent: what Chrome's device mode does, without its UI. */
const emulatePhone = async (contents: WebContents) => {
  if (!contents.debugger.isAttached()) contents.debugger.attach('1.3');
  await contents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5,
  });
  await contents.debugger.sendCommand('Emulation.setEmitTouchEventsForMouse', {
    enabled: true,
    configuration: 'mobile',
  });
  // Phones draw overlay scrollbars; the PC's would steal width from the layout.
  await contents.debugger.sendCommand('Emulation.setScrollbarsHidden', { hidden: true });
  await contents.debugger.sendCommand('Emulation.setUserAgentOverride', {
    userAgent: ANDROID_UA,
    platform: 'Android',
    userAgentMetadata: {
      platform: 'Android',
      platformVersion: '16',
      architecture: '',
      model: 'Pixel 9 Pro XL',
      mobile: true,
    },
  });
};

const restartPrompt = async (window: BrowserWindow) => {
  const { response } = await dialog.showMessageBox(window, {
    type: 'info',
    message: t('restart.message'),
    buttons: [t('restart.now'), t('restart.later')],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) {
    app.relaunch();
    app.exit(0);
  }
};

const applyWindowSize = (window: BrowserWindow) => {
  const size = contentSize(stored);
  window.setContentSize(size.width, size.height);
  window.webContents.setZoomFactor(stored.zoom);
};

const buildMenu = (window: BrowserWindow) => {
  const update = (changes: Partial<Settings>, restart: boolean) => {
    stored = { ...stored, ...changes };
    store(stored);
    if (restart) void restartPrompt(window);
    else applyWindowSize(window);
    buildMenu(window);
  };
  const template: MenuItemConstructorOptions[] = [
    {
      label: t('menu.view'),
      submenu: [
        {
          label: t('menu.device'),
          submenu: DEVICES.map((device) => ({
            label: `${device.label} (${device.width} × ${device.height})`,
            type: 'radio',
            checked: stored.device === device.id,
            click: () => update({ device: device.id }, false),
          })),
        },
        {
          label: t('menu.zoom'),
          submenu: ZOOMS.map((zoom) => ({
            label: `${Math.round(zoom * 100)} %`,
            type: 'radio',
            checked: stored.zoom === zoom,
            click: () => update({ zoom }, false),
          })),
        },
        { type: 'separator' },
        {
          label: t('menu.disableGpu'),
          type: 'checkbox',
          checked: stored.disableGpu,
          click: (item) => update({ disableGpu: item.checked }, true),
        },
        {
          label: t('menu.forceSrgb'),
          type: 'checkbox',
          checked: stored.forceSrgb,
          click: (item) => update({ forceSrgb: item.checked }, true),
        },
        { type: 'separator' },
        { label: t('menu.reload'), role: 'reload' },
        { label: t('menu.devTools'), role: 'toggleDevTools' },
      ],
    },
    {
      label: t('menu.data'),
      submenu: [
        {
          label: t('menu.openData'),
          click: () => void shell.openPath(app.getPath('userData')),
        },
        { type: 'separator' },
        { label: t('menu.quit'), role: 'quit' },
      ],
    },
  ];
  window.setMenu(Menu.buildFromTemplate(template));
};

const serveWeb = () => {
  const root = webRoot();
  protocol.handle(SCHEME, (request) => {
    const path = normalize(join(root, decodeURIComponent(new URL(request.url).pathname)));
    const inside = path === root || path.startsWith(root + sep);
    const file =
      inside && existsSync(path) && statSync(path).isFile() ? path : join(root, 'index.html');
    // Client-side routes (/recipes/…) fall back to the single page.
    return net.fetch(pathToFileURL(file).toString());
  });
};

const openDatabase = () => {
  mkdirSync(app.getPath('userData'), { recursive: true });
  const database = openNodeDatabase(join(app.getPath('userData'), 'flourprint.db'));
  const bridge = nodeSqliteBridge(database);
  ipcMain.handle('flourprint:sql', (event, op: unknown, sql: unknown, params: unknown) => {
    if (!event.senderFrame?.url.startsWith(`${ORIGIN}/`)) throw new Error('refused origin');
    if (!BRIDGE_OPS.includes(op as BridgeOp)) throw new Error('refused operation');
    return bridge.call(
      op as BridgeOp,
      sql as string | undefined,
      params as readonly (string | number | null)[] | undefined,
    );
  });
  app.on('will-quit', () => database.close());
  return database;
};

/** Packaged: icon.png next to the app; in the repository, the channel's icon in resources/. */
const windowIcon = (): string | undefined =>
  [
    join(app.getAppPath(), 'icon.png'),
    join(app.getAppPath(), 'resources', channel.kind === 'dev' ? 'icon-dev.png' : 'icon.png'),
  ].find((path) => existsSync(path));

const createWindow = (database: ReturnType<typeof openNodeDatabase> | undefined) => {
  const size = contentSize(stored);
  const icon = windowIcon();
  const window = new BrowserWindow({
    title: channel.name,
    useContentSize: true,
    width: size.width,
    height: size.height,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#f7f5f0',
    ...(icon ? { icon } : {}),
    autoHideMenuBar: false,
    webPreferences: {
      // Only the bundled app gets the SQLite bridge, never a remote page.
      ...(channel.kind === 'release' ? { preload: join(import.meta.dirname, 'preload.cjs') } : {}),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  const contents = window.webContents;
  // A reload in the middle of a transaction would leave the connection inside it.
  contents.on('did-start-loading', () => {
    if (database?.isTransaction) database.exec('ROLLBACK');
  });
  contents.on('will-navigate', (event, url) => {
    if (!sameApp(channel, url, ORIGIN)) event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('dom-ready', () => contents.setZoomFactor(stored.zoom));
  buildMenu(window);
  // Emulation needs a live document; set it on a blank page so the app starts as on a phone.
  void window
    .loadURL('about:blank')
    .then(() => emulatePhone(contents))
    .then(() => window.loadURL(channel.kind === 'dev' ? channel.url : `${ORIGIN}/`));
  return window;
};

void app.whenReady().then(() => {
  if (channel.kind === 'dev') {
    createWindow(undefined);
    return;
  }
  serveWeb();
  createWindow(openDatabase());
});

app.on('window-all-closed', () => app.quit());
