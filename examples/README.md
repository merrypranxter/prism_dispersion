# examples

Small, self-contained snippets that exercise the physics in this repo. The
`.mjs` ones run in Node (no browser, no GPU) and double as a sanity check on the
math the shaders implement; the `.html` ones run in the browser.

Run a single example:

```bash
node examples/01-cauchy-table.mjs
```

Run all the Node examples at once:

```bash
npm run examples
```

| file | what it shows |
|------|---------------|
| `01-cauchy-table.mjs`     | `n(λ)` for each material across the visible band — why blue bends more than red |
| `02-critical-angle.mjs`   | total-internal-reflection thresholds — why diamond traps and sparkles |
| `03-fresnel-curve.mjs`    | Schlick reflectance vs. angle (ASCII bars) — bright rims at grazing angles |
| `04-min-deviation.mjs`    | a 60° prism's minimum-deviation angle and the violet→red fan width per material |
| `05-spectrum-to-rgb.mjs`  | `spectral_color`: monochromatic lines and integrated spectra → sRGB (ANSI swatches) |
| `06-spectrum-strip.html`  | draws the 1D spectral ramp + a live Cauchy refraction diagram on a canvas |
| `07-minimal-prism.html`   | the smallest possible standalone WebGL2 dark-side prism — copy/paste starting point |

The `.mjs` files import directly from `../src/js/` (`optics.js`, `spectral_color.js`,
`params.js`), so they always reflect the real code, not a copy.
