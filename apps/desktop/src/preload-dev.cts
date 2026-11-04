// Sandboxed preload of the Dev shell only (ADR 0023): the version picker's bridge. The main
// process answers it to pages of an allowlisted address only; the release shell has no such
// preload. A sandboxed preload is CommonJS, hence the require-style import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import electron = require('electron');

const call = (op: string, ...args: readonly unknown[]): Promise<unknown> =>
  electron.ipcRenderer.invoke('flourprint:dev', op, ...args);

electron.contextBridge.exposeInMainWorld('flourprintDevShell', {
  current: () => call('current'),
  select: (version: string) => call('select', version),
  listData: () => call('listData'),
  deleteData: (version: string) => call('deleteData', version),
  stashTransfer: (version: string, json: string) => call('stashTransfer', version, json),
  takeTransfer: () => call('takeTransfer'),
});
