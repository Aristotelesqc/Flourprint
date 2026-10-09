// Sandboxed preload (ADR 0011): exposes only the SQLite bridge to the app's page. A sandboxed
// preload is CommonJS, hence the require-style import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import electron = require('electron');

electron.contextBridge.exposeInMainWorld('flourprintDesktop', {
  sql: (op: string, sql?: string, params?: readonly unknown[]) =>
    electron.ipcRenderer.invoke('flourprint:sql', op, sql, params),
});
