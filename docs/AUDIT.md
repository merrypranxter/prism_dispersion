# Build / Audit Notes

This repo was scaffolded from `repo_seed.txt` + `context.manifest.json` (the brief
that shipped in `prism_dispersion.zip`). The seed defined the *intent* — physics,
aesthetic regimes, parameters, canon, and the file names the engines should have —
but contained no runnable code beyond a stub `index.html`. This document records
what the seed specified, what was built, and what was added on top.

## What the seed provided

- `README.md`, `docs/math-reference.md`, `docs/visual-targets.md` — design + physics.
- `context.manifest.json` — archetype `RAYMARCHED_DISPERSION`, canon flags
  (`fbo_ping_pong`, `additive_blend`, `1d_ramp: spectral_color.js`, `post_finisher`),
  tech stack (webgl2 / glsl / vanilla_js), and the four physics pillars.
- `index.html` — referenced `src/js/main.js` and engine `.glsl` files that did not exist.

## What was built to satisfy the brief

| Area | File(s) | Honors |
|------|---------|--------|
| Entry / render loop | `src/js/main.js` | ping-pong accumulation + post finisher |
| GL helpers | `src/js/gl-utils.js` | RGBA16F FBOs, fullscreen-triangle, program cache |
| Spectral dependency | `src/js/spectral_color.js` | the `1d_ramp` / `spectral_color` canon |
| Params + presets | `src/js/params.js` | Cauchy A/B material table, per-mode defaults |
| Input | `src/js/controls.js` | mouse rotate, scroll = dispersion, keys 1–4 |
| Shared GLSL | `src/shaders/common.glsl` | Snell, Cauchy, Fresnel, TIR, SDFs, accumulation |
| `dark_side` | `src/shaders/newton-prism.glsl` | honest 2D per-λ refraction through both faces |
| `liquid_glass` | `src/shaders/glass-dispersion.glsl` | metaball refractor, dispersive edges |
| `diamond_fire` | `src/shaders/gem-fire.glsl` | high-IOR gem, multi-bounce TIR "fire" |
| `spectral_caustics` | `src/shaders/dispersive-caustics.glsl` | floor caustics, per-λ deviation fringes |
| Post | `src/shaders/post.glsl` | bloom + ACES tonemap + vignette |

Every one of the four engine names listed in the seed README now exists and is wired
to the `1-4` keys via `ENGINES` in `main.js`.

## Added beyond the brief (the "audit" additions)

- **`src/js/optics.js`** — a CPU mirror of the shader optics (Snell, Cauchy, Fresnel,
  critical angle, prism minimum deviation, vector refraction). Lets the physics be
  tested and documented without a GPU, and keeps a single source of truth the
  examples import directly.
- **`examples/`** — seven runnable snippets (5 Node `.mjs`, 2 browser `.html`),
  see `examples/README.md`.
- **`tests/check-shaders.mjs`** + `npm test` — injects `common.glsl` like the runtime,
  preprocesses, and parses every engine to catch GLSL syntax errors offline.
- **`package.json`** — `serve` / `test` / `examples` scripts; the parser as the only
  (dev-only) dependency. The app itself ships zero runtime dependencies.
- **`.gitignore`, `LICENSE`** — housekeeping. (License is MIT with the repo owner as
  copyright holder — change it if you'd prefer something else.)
- **`index.html`** — multiline HUD, a `<noscript>` hint that it must be served over HTTP.

## Verified

- `npm test` — all five shaders parse after `common.glsl` injection + preprocessing.
- `npm run examples` — all Node examples run; output matches the seed's stated numbers
  (crown-glass Δn ≈ 0.0195 across 380–700nm, diamond critical angle ≈ 24.4°).

## Known approximations / caveats

- **Dispersive caustics** are approximated (the seed explicitly allows this): the floor's
  caustic field is an interference pattern sampled per-wavelength with a dispersion-scaled
  offset, rather than full photon transport. It reads as rainbow pools but isn't a
  physically converged caustic.
- A 60° **diamond** prism cannot transmit at minimum deviation (`n·sin30° > 1` → TIR);
  `examples/04-min-deviation.mjs` reports this rather than printing a bogus angle.
- Shader validation is **syntax-level** (no GPU available in CI here). Type/semantic
  errors would only surface in a real WebGL2 context — load `index.html` to confirm visuals.
- Requires WebGL2 + `EXT_color_buffer_float` (the HDR float render targets).

## How to run

```bash
npm install        # dev-only: the GLSL parser used by `npm test`
npm run serve      # http://localhost:8000  -> open index.html
npm test           # offline shader syntax check
npm run examples   # run the Node physics snippets
```
