import { expect, test as base } from '@playwright/test';
import { sampleBackup } from '../test/fixtures/sample-recipe';

/**
 * The app seeds no recipe (persistence.md, Recipe trash), yet most journeys start from the
 * "Poolish + tangzhong" reference recipe. Each browser context therefore starts with it already
 * in the preview's saved snapshot (ADR 0015), which the app restores through its normal restore
 * path. It is written once per context: erasing the browser data, or any later reload, leaves
 * the app as the journey left it.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript((snapshot: string) => {
      try {
        if (localStorage.getItem('e2e-sample-loaded')) return;
        localStorage.setItem('e2e-sample-loaded', '1');
        const open = indexedDB.open('flourprint-preview', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('snapshots');
        open.onsuccess = () => {
          const db = open.result;
          const done = () => db.close();
          const tx = db.transaction('snapshots', 'readwrite');
          const request = tx.objectStore('snapshots').add(snapshot, 'backup');
          request.onerror = (event) => event.preventDefault();
          tx.oncomplete = done;
          tx.onabort = done;
        };
      } catch {
        // About pages and opaque origins have no storage: nothing to seed there.
      }
    }, JSON.stringify(sampleBackup()));
    await use(context);
  },
});

export { expect };
