// optics.js — pure-JS mirror of the optics math used in the shaders.
//
// Keeping a CPU copy of Snell / Cauchy / Fresnel / TIR lets the examples (and
// any tests) verify the physics without a GPU, and documents the exact formulas
// the GLSL implements. All angles are in radians unless noted.

/** Cauchy dispersion n(λ). λ in micrometers. */
export function cauchy(A, B, lambdaMicrons) {
  return A + B / (lambdaMicrons * lambdaMicrons);
}

/** Convenience: n for a wavelength given in nanometers. */
export function cauchyNm(A, B, lambdaNm) {
  return cauchy(A, B, lambdaNm / 1000);
}

/**
 * Snell's law. Returns the refracted angle, or null on total internal
 * reflection (when sinθ₂ would exceed 1).
 */
export function snell(n1, n2, thetaInc) {
  const s = (n1 / n2) * Math.sin(thetaInc);
  if (Math.abs(s) > 1) return null; // TIR
  return Math.asin(s);
}

/** Critical angle for n1 -> n2 (only meaningful when n1 > n2), else null. */
export function criticalAngle(n1, n2) {
  if (n1 <= n2) return null;
  return Math.asin(n2 / n1);
}

/** Schlick R0 at normal incidence. */
export function fresnelR0(n1, n2) {
  const r = (n1 - n2) / (n1 + n2);
  return r * r;
}

/** Schlick reflectance for a given cosine of the incidence angle. */
export function fresnelSchlick(cosTheta, n1, n2) {
  const r0 = fresnelR0(n1, n2);
  const m = Math.min(1, Math.max(0, 1 - cosTheta));
  return r0 + (1 - r0) * Math.pow(m, 5);
}

/**
 * Minimum deviation angle of a thin prism with apex angle `apex` (radians)
 * and refractive index n. δ_min = 2·asin(n·sin(apex/2)) − apex.
 * Returns null if the geometry implies TIR.
 */
export function minDeviation(apex, n) {
  const s = n * Math.sin(apex / 2);
  if (Math.abs(s) > 1) return null;
  return 2 * Math.asin(s) - apex;
}

/**
 * Vector refraction (matches GLSL `refract`). I and N are unit 2- or 3-vectors
 * as plain arrays; eta = n1/n2. Returns the refracted unit vector, or null on TIR.
 */
export function refractVec(I, N, eta) {
  const dotNI = dot(N, I);
  const k = 1 - eta * eta * (1 - dotNI * dotNI);
  if (k < 0) return null; // TIR
  const f = eta * dotNI + Math.sqrt(k);
  return I.map((Ii, i) => eta * Ii - f * N[i]);
}

const dot = (a, b) => a.reduce((s, ai, i) => s + ai * b[i], 0);

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;
