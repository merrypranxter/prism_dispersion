// common.glsl — shared prelude injected into every engine fragment shader.
// (No #version / precision here — the engine declares those, then includes this.)

// ---- Shared IO & uniforms (set by main.js for every engine) ----
in  vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform int   u_frame;       // progressive accumulation index
uniform vec2  u_mouse;       // normalized 0..1
uniform float u_iorBase;     // Cauchy A
uniform float u_dispersion;  // Cauchy B (µm²)
uniform int   u_samples;     // wavelength samples 8..32
uniform float u_beamWidth;
uniform float u_absorption;  // Beer-Lambert coefficient
uniform sampler2D u_ramp;    // 1D spectral ramp (spectral_color)
uniform sampler2D u_prev;    // previous accumulation frame

const float PI = 3.14159265359;
const float LAMBDA_MIN = 380.0;
const float LAMBDA_MAX = 700.0;

// ---- Randomness (per-pixel, per-frame jitter for anti-banding) ----
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float frameJitter() { return hash12(gl_FragCoord.xy + float(u_frame) * 17.13); }

// ---- Spectral helpers ----
// Sample wavelength -> RGB from the 1D ramp built by spectral_color.js.
vec3 wavelengthRGB(float nm) {
  float t = clamp((nm - LAMBDA_MIN) / (LAMBDA_MAX - LAMBDA_MIN), 0.0, 1.0);
  return texture(u_ramp, vec2(t, 0.5)).rgb;
}
// Cauchy dispersion n(λ): lambda in micrometers.
float cauchy(float A, float B, float lambdaMicrons) {
  return A + B / (lambdaMicrons * lambdaMicrons);
}
// IOR for the i-th of N wavelength samples (jittered within its bucket).
float iorForSample(int i, int n, out float nm) {
  float t = (float(i) + frameJitter()) / float(n);
  nm = mix(LAMBDA_MIN, LAMBDA_MAX, t);
  return cauchy(u_iorBase, u_dispersion, nm / 1000.0); // nm -> µm
}

// ---- Fresnel (Schlick) ----
float fresnelSchlick(float cosTheta, float n1, float n2) {
  float r0 = (n1 - n2) / (n1 + n2);
  r0 *= r0;
  float m = clamp(1.0 - cosTheta, 0.0, 1.0);
  return r0 + (1.0 - r0) * m * m * m * m * m;
}

// ---- Rotations ----
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }

// ---- SDF primitives (see docs/math-reference.md) ----
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdOctahedron(vec3 p, float s) { p = abs(p); return (p.x + p.y + p.z - s) * 0.57735027; }
float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; }
float sdTriPrism(vec3 p, vec2 h) {        // h = (radius, half-depth)
  vec3 q = abs(p);
  return max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5);
}
// Smooth minimum for metaball/liquid blends.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Numerical normal of any scene map(): CALC_NORMAL(p, map)
#define NORMAL_EPS 0.0008
#define CALC_NORMAL(p, MAP) normalize(vec3( \
  MAP(p + vec3(NORMAL_EPS,0,0)) - MAP(p - vec3(NORMAL_EPS,0,0)), \
  MAP(p + vec3(0,NORMAL_EPS,0)) - MAP(p - vec3(0,NORMAL_EPS,0)), \
  MAP(p + vec3(0,0,NORMAL_EPS)) - MAP(p - vec3(0,0,NORMAL_EPS))))

// ---- Environment (sky/gradient) sampled by escaped/refracted rays ----
// Includes faint structure so refraction & dispersion are visible at edges.
vec3 environment(vec3 dir) {
  float y = dir.y * 0.5 + 0.5;
  vec3 sky = mix(vec3(0.02, 0.03, 0.05), vec3(0.10, 0.13, 0.20), y);
  // soft key light -> bright highlight / sparkle source
  float key = pow(max(dot(dir, normalize(vec3(0.6, 0.7, 0.4))), 0.0), 48.0);
  // faint lat/long bands so distortion through glass reads clearly
  float bands = 0.5 + 0.5 * sin(atan(dir.z, dir.x) * 8.0) * sin(asin(clamp(dir.y, -1.0, 1.0)) * 8.0);
  sky += vec3(0.03, 0.04, 0.05) * smoothstep(0.7, 1.0, bands);
  return sky + vec3(1.2) * key;
}

// ---- Progressive accumulation write (ping-pong) ----
void writeAccum(vec3 hdr) {
  vec3 prev = texture(u_prev, gl_FragCoord.xy / u_resolution).rgb;
  float n = float(u_frame);
  vec3 outc = (u_frame == 0) ? hdr : mix(prev, hdr, 1.0 / (n + 1.0));
  fragColor = vec4(outc, 1.0);
}
