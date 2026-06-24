# Math Reference

## Snell's Law

```
n₁·sin(θ₁) = n₂·sin(θ₂)
```

- n₁ = IOR of incident medium (air ≈ 1.0)
- n₂ = IOR of refracting medium (glass, water, diamond)
- θ₁ = angle of incidence
- θ₂ = angle of refraction

For a given wavelength λ, the refracted angle is:
```
sin(θ₂) = (n₁/n₂(λ)) · sin(θ₁)
```

## Cauchy Dispersion

```
n(λ) = A + B/λ²  (λ in µm)
```

- A = base refractive index (material property)
- B = dispersion coefficient (material property)
- λ = wavelength in micrometers

Typical values:
- Crown glass: A ≈ 1.52, B ≈ 0.004 µm²
- Flint glass: A ≈ 1.66, B ≈ 0.01 µm² (high dispersion)
- Diamond: A ≈ 2.42, B ≈ 0.004 µm² (high IOR + moderate dispersion = "fire")
- Water: A ≈ 1.33, B ≈ 0.001 µm² (low dispersion, weak rainbow)

### Dispersion Example (Crown Glass)
- 380nm (violet): n = 1.52 + 0.004/(0.38)² = 1.52 + 0.0277 = 1.5477
- 550nm (green): n = 1.52 + 0.004/(0.55)² = 1.52 + 0.0132 = 1.5332
- 700nm (red): n = 1.52 + 0.004/(0.70)² = 1.52 + 0.0082 = 1.5282
- Difference: Δn = 0.0195 → blue bends ~2.5% more than red

## Fresnel Reflection (Schlick Approximation)

```
R(θ) = R₀ + (1 - R₀)·(1 - cos(θ))⁵
R₀ = ((n₁ - n₂)/(n₁ + n₂))²
```

- At grazing angles, reflection → 1 (total reflection)
- At normal incidence, reflection = R₀
- For glass-air: R₀ ≈ 0.04 (4% reflection)
- For diamond-air: R₀ ≈ 0.17 (17% reflection) — much more sparkle

## Total Internal Reflection (TIR)

When exiting a high-IOR material to low-IOR (e.g., diamond to air):
- If sin(θ₂) > 1, TIR occurs — ray reflects instead of refracting
- This is the source of diamond's internal sparkle
- Critical angle: θ_c = arcsin(n₂/n₁) = arcsin(1/2.42) ≈ 24.4° for diamond

## Beer-Lambert Absorption

```
I = I₀ · e^(-α·d)
```

- α = absorption coefficient (wavelength-dependent)
- d = distance traveled through material
- For glass: α is small (transparent)
- For colored glass: α varies with wavelength (e.g., red glass absorbs blue/green)

## Dispersive Caustics

Light through a dispersive medium creates caustics with rainbow fringes:
- Each wavelength focuses at a slightly different point
- The caustic pool is a superposition of differently-colored focal points
- Can be approximated by photon mapping or by accumulating many raymarched samples

## Raymarching SDF Primitives

### Triangular Prism
```
sdPrism(p, h, r) = ...
```
- h = height
- r = radius of inscribed circle

### Sphere
```
sdSphere(p, r) = length(p) - r
```

### Gem (Octahedron / Brilliant Cut)
```
sdOctahedron(p, s) = ...
```
- s = scale
- Can be modified for brilliant cut by adding facets

### Glass Blob (Metaball / Soft SDF)
```
sdMetaball(p, centers, radii) = ...
```
- centers = array of sphere centers
- radii = array of sphere radii
- Use smooth minimum for liquid-like blending

## References

1. Born, M., & Wolf, E. (1999). *Principles of Optics* (7th ed.). Cambridge University Press. (Chapters 1–3 on refraction, reflection, dispersion)
2. Hecht, E. (2017). *Optics* (5th ed.). Pearson. (Chapters 4–6 on geometric optics, lenses, dispersion)
3. Glassner, A. S. (1995). *Principles of Digital Image Synthesis*. Morgan Kaufmann. (Volume 1, Chapter 5 on ray tracing)
4. Schlick, C. (1994). "An Inexpensive BRDF Model for Physically-based Rendering." *Computer Graphics Forum*, 13(3), 233–246.
5. Inagaki, T. (1980). "Refractive Index and Dispersion of Synthetic Sapphire." *Optical Materials*, 1, 15–20.
