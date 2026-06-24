// params.js — parameter state for the four aesthetic regimes.
//
// Material presets follow the Cauchy coefficients from docs/math-reference.md.

export const MATERIALS = {
  crown_glass: { A: 1.52, B: 0.004 },
  flint_glass: { A: 1.66, B: 0.010 },
  diamond:     { A: 2.42, B: 0.004 },
  water:       { A: 1.33, B: 0.001 },
};

export const MODES = ['dark_side', 'diamond_fire', 'liquid_glass', 'spectral_caustics'];

/** Default parameters; tweaked per-mode in applyModeDefaults(). */
export function defaultParams() {
  return {
    mode: 'dark_side',
    iorBase: 1.52,         // Cauchy A
    dispersion: 0.004,     // Cauchy B (µm²)
    wavelengthSamples: 16, // 8..32
    beamWidth: 0.05,
    absorption: 0.1,       // Beer-Lambert
    exposure: 1.0,
    bloom: 0.6,
  };
}

/** Sensible per-mode starting point so each key (1-4) looks right immediately. */
export function applyModeDefaults(p, mode) {
  p.mode = mode;
  switch (mode) {
    case 'dark_side':
      Object.assign(p, MATERIALS.crown_glass, { wavelengthSamples: 24, beamWidth: 0.04, absorption: 0.05, exposure: 1.0, bloom: 0.5 });
      break;
    case 'diamond_fire':
      Object.assign(p, MATERIALS.diamond, { wavelengthSamples: 20, absorption: 0.02, exposure: 1.1, bloom: 0.9 });
      break;
    case 'liquid_glass':
      Object.assign(p, MATERIALS.crown_glass, { wavelengthSamples: 16, absorption: 0.15, exposure: 1.0, bloom: 0.4 });
      break;
    case 'spectral_caustics':
      Object.assign(p, MATERIALS.flint_glass, { wavelengthSamples: 24, absorption: 0.08, exposure: 1.2, bloom: 0.6 });
      break;
  }
  // applyModeDefaults reuses MATERIALS' A/B as iorBase/dispersion:
  p.iorBase = p.A; p.dispersion = p.B;
  delete p.A; delete p.B;
  return p;
}
