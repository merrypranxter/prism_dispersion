// 05-spectrum-to-rgb.mjs — exercise spectral_color: single lines and integrated
// spectra → sRGB, rendered as 24-bit ANSI swatches in the terminal.
//
//   node examples/05-spectrum-to-rgb.mjs

import { wavelengthToRGB, spectrumToRGB, LAMBDA_MIN, LAMBDA_MAX } from '../src/js/spectral_color.js';

const swatch = (rgb, w = 6) => {
  const [r, g, b] = rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255));
  return `\x1b[48;2;${r};${g};${b}m${' '.repeat(w)}\x1b[0m`;
};

console.log('Monochromatic wavelengths → sRGB:\n');
for (let nm = LAMBDA_MIN; nm <= LAMBDA_MAX; nm += 20) {
  console.log(`  ${String(nm).padStart(3)}nm ${swatch(wavelengthToRGB(nm), 10)}`);
}

console.log('\nIntegrated spectra → sRGB:');
const flat = Array(32).fill(1);                                   // ~white
const warm = Array.from({ length: 32 }, (_, i) => i / 31);        // red-weighted
const cool = Array.from({ length: 32 }, (_, i) => 1 - i / 31);    // blue-weighted
console.log(`  flat (equal energy) ${swatch(spectrumToRGB(flat), 12)}`);
console.log(`  warm (red-weighted) ${swatch(spectrumToRGB(warm), 12)}`);
console.log(`  cool (blue-weighted)${swatch(spectrumToRGB(cool), 12)}`);
