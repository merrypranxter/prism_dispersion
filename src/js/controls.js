// controls.js — mouse / scroll / keyboard input, mapped to params.
// Returns a small state object; calls onChange() whenever something that
// affects the image changes (so main.js can reset progressive accumulation).

import { MODES, applyModeDefaults } from './params.js';

export function attachControls(canvas, params, onChange) {
  const state = {
    mouse: [0.5, 0.5], // normalized 0..1
    dragging: false,
  };

  const notify = () => onChange && onChange();

  // Cache the canvas rect; querying it per pointermove forces layout reflow.
  let rect = canvas.getBoundingClientRect();
  const refreshRect = () => { rect = canvas.getBoundingClientRect(); };
  window.addEventListener('resize', refreshRect);
  window.addEventListener('scroll', refreshRect, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    state.mouse[0] = (e.clientX - rect.left) / rect.width;
    state.mouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
    notify();
  });

  // Scroll → dispersion strength (B), clamped to the documented range.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = e.deltaY > 0 ? -0.0004 : 0.0004;
    params.dispersion = clamp(params.dispersion + step, 0.001, 0.01);
    notify();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const idx = ['1', '2', '3', '4'].indexOf(e.key);
    if (idx >= 0) {
      applyModeDefaults(params, MODES[idx]);
      notify();
      return;
    }
    // Bonus keys: tweak sample count and exposure.
    if (e.key === '[') { params.wavelengthSamples = clamp(params.wavelengthSamples - 4, 8, 32); notify(); }
    if (e.key === ']') { params.wavelengthSamples = clamp(params.wavelengthSamples + 4, 8, 32); notify(); }
    if (e.key === '-') { params.exposure = clamp(params.exposure - 0.1, 0.2, 3.0); notify(); }
    if (e.key === '=') { params.exposure = clamp(params.exposure + 0.1, 0.2, 3.0); notify(); }
  });

  return state;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
