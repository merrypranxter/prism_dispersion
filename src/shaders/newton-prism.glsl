#version 300 es
precision highp float;
//#include "common.glsl"

// newton-prism.glsl — the Dark Side regime.
// A single white beam enters a triangular glass prism. We refract it honestly
// (Snell's law in 2D) at the entry and exit faces, once per wavelength sample,
// so blue bends harder than red and the beam fans into a spectrum on the right.

// Equilateral-ish prism, apex up.
const float H = 0.45; // half-height
const float W = 0.52; // half-width at the base

// Gaussian falloff of a pixel's distance to a finite segment a..b.
float beamSeg(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float d = length(pa - ba * h);
  return exp(-d * d / (w * w));
}
// Gaussian falloff to a half-line (ray) from o in unit dir.
float beamRay(vec2 p, vec2 o, vec2 dir, float w) {
  vec2 po = p - o;
  float t = max(dot(po, dir), 0.0);
  float d = length(po - dir * t);
  return exp(-d * d / (w * w));
}

// 2D triangle SDF for drawing the glass body.
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0=b-a, e1=c-b, e2=a-c, v0=p-a, v1=p-b, v2=p-c;
  vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
  vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
  vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
  float s=sign(e0.x*e2.y-e0.y*e2.x);
  vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),
                 vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),
                 vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y);
}

// Intersect ray (o,dir) with the line through a..b; return t along ray (or -1).
float rayLineT(vec2 o, vec2 dir, vec2 a, vec2 b) {
  vec2 e = b - a;
  float denom = dir.x * e.y - dir.y * e.x;
  if (abs(denom) < 1e-6) return -1.0;
  return ((a.x - o.x) * e.y - (a.y - o.y) * e.x) / denom;
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  vec2 apex = vec2(0.0, H);
  vec2 bl   = vec2(-W, -H);
  vec2 br   = vec2( W, -H);

  // Beam entry height on the left face, steered by the mouse.
  float by = mix(-H * 0.5, H * 0.6, u_mouse.y);
  float fL = clamp((H - by) / (2.0 * H), 0.0, 1.0);
  vec2 entry = mix(apex, bl, fL);          // point on the left face

  // Outward normals of the two faces.
  vec2 nL = normalize(vec2(-(2.0 * H), W));   // left face -> points left
  vec2 nR = normalize(vec2( (2.0 * H), W));   // right face -> points right

  vec2 I = vec2(1.0, 0.0);                   // incoming beam travels +x

  vec3 col = vec3(0.0);
  float w = u_beamWidth * 0.6;

  // Incoming white beam, far-left up to the entry point.
  col += vec3(0.9) * beamSeg(p, vec2(-2.0, by), entry, w);

  // Per-wavelength refraction.
  int N = u_samples;
  for (int i = 0; i < 64; i++) {
    if (i >= N) break;
    float nm;
    float n = iorForSample(i, N, nm);
    vec3 wl = wavelengthRGB(nm);

    // Entry: air -> glass. N must oppose I, so use nL (points to air side).
    vec2 d1 = refract(I, nL, 1.0 / n);
    if (d1 == vec2(0.0)) continue;
    d1 = normalize(d1);

    // March inside to the right face. rayLineT uses the *infinite* line through
    // apex..br, so guard against an "exit" that lands outside the face segment
    // (i.e. the ray actually leaves through the base) and fall back to the base.
    float tR = rayLineT(entry, d1, apex, br);
    vec2 exit = entry + d1 * tR;
    if (tR <= 0.0 || exit.y < -H || exit.y > H) {
      tR = rayLineT(entry, d1, bl, br); // fallback: base
      exit = entry + d1 * tR;
    }
    if (tR <= 0.0) continue;

    // Exit: glass -> air through the right face.
    vec2 d2 = refract(d1, -nR, n / 1.0);
    bool tir = (d2 == vec2(0.0));
    d2 = tir ? reflect(d1, nR) : normalize(d2);

    float wInside = w * 0.9;
    // Inside segment: all wavelengths nearly overlap -> looks white.
    col += wl * (1.2 / float(N)) * beamSeg(p, entry, exit, wInside);
    // Outgoing fan: each wavelength leaves at its own angle -> spectrum.
    col += wl * (2.6 / float(N)) * beamRay(p, exit, d2, w);
  }

  // Faint glass body (subtle Fresnel-tinted fill + bright edges).
  float dTri = sdTri(p, apex, br, bl);
  float fill = smoothstep(0.0, -0.02, dTri);
  float edge = exp(-abs(dTri) * 220.0);
  col += vec3(0.04, 0.05, 0.07) * fill;
  col += vec3(0.25) * edge;

  writeAccum(col);
}
