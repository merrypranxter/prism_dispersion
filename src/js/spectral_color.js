// spectral_color.js — the `spectral_color` dependency this repo consumes.
//
// Maps physical wavelengths (380–700nm) to displayable sRGB, builds a 1D ramp
// texture for shaders, and integrates a sampled spectrum S(λ) → RGB.
//
// The wavelength→RGB curve is an approximation of the CIE 1931 perception of a
// single monochromatic line, with a gamma + intensity falloff near the ends of
// the visible band so violets/reds dim out naturally instead of clipping.

export const LAMBDA_MIN = 380; // nm
export const LAMBDA_MAX = 700; // nm

/**
 * Approximate sRGB (0..1, linear-ish) for a single wavelength in nm.
 * Based on Dan Bruton's well-known piecewise approximation.
 * @param {number} nm wavelength in nanometers
 * @returns {[number, number, number]} rgb in 0..1
 */
export function wavelengthToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / (440 - 380); b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / (490 - 440); b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / (510 - 490); }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / (580 - 510); g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / (645 - 580); }
  else if (nm >= 645 && nm <= 700) { r = 1; }

  // Intensity rolls off at the edges of the visible range.
  let f = 1;
  if (nm >= 380 && nm < 420) f = 0.3 + 0.7 * (nm - 380) / (420 - 380);
  else if (nm >= 645 && nm <= 700) f = 0.3 + 0.7 * (700 - nm) / (700 - 645);
  else if (nm < 380 || nm > 700) f = 0;

  const gamma = 0.8;
  return [
    Math.pow(r * f, gamma),
    Math.pow(g * f, gamma),
    Math.pow(b * f, gamma),
  ];
}

/**
 * Integrate a sampled spectrum into RGB. `samples[i]` is the intensity at
 * wavelength LAMBDA_MIN + i/(n-1)*(LAMBDA_MAX-LAMBDA_MIN).
 * @param {number[]} samples
 * @returns {[number, number, number]}
 */
export function spectrumToRGB(samples) {
  const n = samples.length;
  if (n === 0) return [0, 0, 0];
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const nm = LAMBDA_MIN + t * (LAMBDA_MAX - LAMBDA_MIN);
    const c = wavelengthToRGB(nm);
    r += c[0] * samples[i];
    g += c[1] * samples[i];
    b += c[2] * samples[i];
  }
  // Normalize by sample count so a flat spectrum ~= white.
  const k = 1 / n;
  return [r * k, g * k, b * k];
}

/**
 * Build a width×1 RGBA8 ramp of the visible spectrum, ready to upload as a
 * GL texture (or draw to a 2D canvas). Honors the `1d_ramp` canon.
 * @param {number} width number of texels (default 256)
 * @returns {Uint8Array} RGBA bytes, length width*4
 */
export function buildSpectralRamp(width = 256) {
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i++) {
    const t = width === 1 ? 0.5 : i / (width - 1);
    const nm = LAMBDA_MIN + t * (LAMBDA_MAX - LAMBDA_MIN);
    const [r, g, b] = wavelengthToRGB(nm);
    data[i * 4 + 0] = Math.round(clamp01(r) * 255);
    data[i * 4 + 1] = Math.round(clamp01(g) * 255);
    data[i * 4 + 2] = Math.round(clamp01(b) * 255);
    data[i * 4 + 3] = 255;
  }
  return data;
}

/** Upload the spectral ramp as a GL texture bound to TEXTURE_2D. */
export function createSpectralRampTexture(gl, width = 256) {
  const data = buildSpectralRamp(width);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
