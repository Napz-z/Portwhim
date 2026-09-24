// Optional visual audit for the simulated fixture, never imported by the app.
// Open ui-fixture.html?motionAudit=1, interact normally, then inspect console records.
let sequence = 0;
const selectors = ['.nav-selection', '.segment-selection', '.utility-dialog', '.inspector-dialog', '.view-content', '.project-expansion', '.favorite-editor'];
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = ++sequence;
  const action = button.getAttribute('aria-label') || button.textContent.trim();
  const states = Object.fromEntries(selectors.map(selector => [selector, new Set()]));
  let frames = 0;
  const sample = () => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) { states[selector].add('absent'); continue; }
      const style = getComputedStyle(element);
      states[selector].add([style.transform, style.opacity, style.height, style.filter].join('|'));
    }
    if (++frames < 50) requestAnimationFrame(sample);
    else console.info('MOTION_AUDIT ' + JSON.stringify({ id, action, mode: document.querySelector('[data-motion]')?.dataset.motion, frames, distinctFrames: Object.fromEntries(Object.entries(states).map(([key, values]) => [key, values.size])), dialogs: document.querySelectorAll('[role="dialog"]').length, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() }));
  };
  sample();
}, true);
