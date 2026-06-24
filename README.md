# prism_dispersion

> newton's prism. white light through glass, and the index of refraction depends on wavelength — so blue bends harder than red and the beam fans into spectrum. the dark-side-of-the-moon triangle, the fire of a cut diamond, rainbow-edged caustics.

## what it does

Raymarched glass objects with per-wavelength refraction. At each refraction, the beam is split into N wavelength samples (16–32 across 380–700nm), each refracted by its own `n(λ)` (Cauchy dispersion). Blue bends more than red. The separated beams accumulate into a vivid, physically accurate spectrum. Additive, bloom, dark room.

**≠ `chromatic_aberration`** — honest per-wavelength refraction, not lens fringing post-effect.  
**≠ `caustic_networks`** — dispersive caustics (rainbow-fringed) vs. monochrome caustics.

## the math

**Snell's law:** n₁·sinθ₁ = n₂·sinθ₂

**Cauchy dispersion:** n(λ) = A + B/λ²
- Glass: A ≈ 1.5, B ≈ 0.004 µm²
- Blue (380nm) bends ~2.5% more than red (700nm)
- Diamond: A ≈ 2.4, B ≈ 0.004 µm² — higher dispersion = more "fire"

**Per-wavelength raymarching:**
1. Raymarch a glass SDF (prism, gem, blob)
2. At each refraction interface, split ray into N λ samples
3. Refract each λ by its own n(λ) via Snell's law
4. Accumulate each wavelength's spectral contribution → `spectral_color` → RGB
5. Additive blend all λ contributions, bloom, post-finish

**Dispersive caustics:** light through water/glass casting rainbow-fringed caustic pools. Each pool is a focal point where multiple wavelengths converge differently.

## engines

- `newton-prism.glsl` — triangular prism, single beam → spectrum fan
- `glass-dispersion.glsl` — refract through arbitrary SDF glass shapes
- `gem-fire.glsl` — faceted gem, total internal reflection + dispersion → sparkle/fire
- `dispersive-caustics.glsl` — light through water/glass casting rainbow-fringed caustic pools

## aesthetic regimes

- **dark_side** — single white beam, triangular prism, classic spectrum fan on black
- **diamond_fire** — faceted gem, TIR sparkle, rotating dispersive flashes
- **liquid_glass** — refract a scene / `u_source` through a wobbling glass blob, dispersive edges
- **spectral_caustics** — dispersive caustics on a floor, rainbow-fringed light pools

## parameters

```
ior_base(A): 1.3–2.5 (glass ≈1.5, diamond ≈2.4, water ≈1.33)
dispersion(B): 0.001–0.01 µm² (glass ≈0.004, diamond ≈0.004, water ≈0.001)
wavelength_samples: 8–32 (more = smoother, slower)
glass_shape: prism | sphere | gem | blob | custom_sdf
beam_width: 0.01–0.1 (width of incident light beam)
mode: dark_side | diamond_fire | liquid_glass | spectral_caustics
```

## controls

- **Mouse move** — rotate/view the glass object (or steer the beam / light source)
- **Scroll** — change dispersion strength (B)
- **Keys 1-4** — switch regime
- **`[` / `]`** — fewer / more wavelength samples
- **`-` / `=`** — exposure down / up

## run it

No build step. WebGL2 + ES modules need to be served over HTTP (opening the file
directly won't load the modules):

```bash
npm run serve     # python3 -m http.server 8000  →  open http://localhost:8000
# or any static server: npx serve .
```

Offline checks (need `npm install` once for the dev-only GLSL parser):

```bash
npm test          # syntax-check every shader the way main.js assembles them
npm run examples  # run the Node physics snippets in examples/
```

## layout

```
index.html                 canvas + module entry
src/js/
  main.js                  GL setup, render loop, ping-pong accumulation, post pass
  gl-utils.js              shader/program/FBO helpers (RGBA16F, fullscreen triangle)
  spectral_color.js        wavelength→RGB, spectrum→RGB, 1D spectral ramp (the dependency)
  optics.js                CPU mirror of the optics math (Snell/Cauchy/Fresnel/TIR)
  params.js                material presets + per-mode defaults
  controls.js              mouse / scroll / keyboard
src/shaders/
  common.glsl              shared prelude: Snell, Cauchy, Fresnel, TIR, SDFs, accumulation
  newton-prism.glsl        dark_side
  glass-dispersion.glsl    liquid_glass
  gem-fire.glsl            diamond_fire
  dispersive-caustics.glsl spectral_caustics
  post.glsl                bloom + ACES tonemap + vignette
examples/                  runnable snippets (see examples/README.md)
tests/check-shaders.mjs    offline shader syntax check (npm test)
docs/                      math-reference, visual-targets, AUDIT (build notes)
```

## palette

Full visible spectrum via `spectral_color` (380nm violet → 700nm red), on black. Diamond fire adds white sparkle from TIR. Spectral caustics add warm/cool fringes. Derived from dispersion, not hand-picked.

## gotchas

- dispersion = **per-wavelength refraction** (sample N λ, refract each separately, sum) — a single IOR gives zero rainbow.
- more wavelength samples = smoother spectrum, slower. 8 is minimum for recognizable colors; 32 is smooth.
- raymarching glass requires handling refraction + reflection at each interface. Use Fresnel for mix factor.
- diamond "fire" = high dispersion (high B) + high IOR (high A) + faceted TIR. Both A and B matter.
- dispersive caustics are computationally expensive — consider approximating with precomputed photon maps or FBO accumulation.

## ecosystem

**Consumes:** `spectral_color`  
**Consumed by:** none  
**≠:** `chromatic_aberration` (honest refraction, not post-effect), `caustic_networks` (rainbow caustics vs. mono)  
**Pairs with:** `gyroid_lattice` (glass), `structural_color`, `raymarching`, `sdf_fields`
