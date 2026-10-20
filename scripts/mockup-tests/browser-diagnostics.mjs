// Keep Linux/Windows layout and trusted pointer evidence with failed acceptance tests.
export async function installPointerDiagnostics(page) {
  await page.addInitScript(() => {
    window.__mockupPointerEvidence = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.addEventListener(
        type,
        (event) => {
          const ancestors = [];
          for (let el = event.target; el instanceof Element; el = el.parentElement) {
            const css = getComputedStyle(el);
            ancestors.push({
              tag: el.tagName,
              class: el.getAttribute('class'),
              overflowX: css.overflowX,
              touchAction: css.touchAction,
              width: el.clientWidth,
              scrollWidth: el.scrollWidth,
            });
          }
          window.__mockupPointerEvidence.push({
            type,
            x: event.clientX,
            y: event.clientY,
            pointerType: event.pointerType,
            trusted: event.isTrusted,
            ancestors,
          });
        },
        true,
      );
    }
  });
}

export async function attachBrowserDiagnostics(page, testInfo) {
  if (testInfo.status === testInfo.expectedStatus || page.isClosed()) return;
  const evidence = await page.evaluate(() => {
    const selectors = [
      '.phone-content',
      '.section-carousel-container',
      '.section-carousel-pane.is-active',
      '.recipe-card',
      '.recipe-card-title',
      '.recipe-card-metrics',
    ];
    return {
      userAgent: navigator.userAgent,
      pointers: window.__mockupPointerEvidence,
      layout: selectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].slice(0, 4).map((el) => {
          const rect = el.getBoundingClientRect();
          const css = getComputedStyle(el);
          return {
            selector,
            text: el.textContent.slice(0, 100),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            font: css.font,
            gap: css.gap,
            padding: css.padding,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
          };
        }),
      ),
    };
  });
  const body = JSON.stringify(evidence, null, 2);
  console.log(`BROWSER_DIAGNOSTICS ${testInfo.title}\n${body}`);
  await testInfo.attach('browser-diagnostics', { body, contentType: 'application/json' });
}
