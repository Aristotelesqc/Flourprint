/* global window, document */
// Every Web Animation the page creates is kept (test only). After each willPresent / willDismiss,
// once the bridge's microtask has run, the animations created since the event on the overlay or
// its shadow parts are read: the timing that actually plays, even a zero-length one that has
// already finished.
export const recordPlayedTimings = () => {
  window.__played = [];
  const created = [];
  const animate = window.Element.prototype.animate;
  window.Element.prototype.animate = function (...args) {
    const animation = animate.apply(this, args);
    created.push({ element: this, animation });
    return animation;
  };
  const record = (event) => {
    const overlay = event.target;
    if (!(overlay instanceof window.HTMLElement) || !overlay.shadowRoot) return;
    const from = created.length;
    // Queued before the bridge's microtask, so the inner one runs after it.
    queueMicrotask(() =>
      queueMicrotask(() => {
        for (const { element, animation } of created.slice(from)) {
          if (element !== overlay && element.getRootNode() !== overlay.shadowRoot) continue;
          window.__played.push({
            phase: event.type,
            part: element === overlay ? 'host' : element.localName + '.' + element.className,
            duration: animation.effect.getTiming().duration,
            easing: animation.effect.getTiming().easing,
          });
        }
      }),
    );
  };
  document.addEventListener('willPresent', record, true);
  document.addEventListener('willDismiss', record, true);
};
