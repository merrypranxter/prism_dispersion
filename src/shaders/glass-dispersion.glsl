#version 300 es
precision highp float;
//#include "common.glsl"

// glass-dispersion.glsl — the Liquid Glass regime.
// A wobbling metaball blob refracts the environment. We refract once per
// wavelength on the way in and on the way out; because each λ takes a slightly
// different path, the environment sampled per wavelength differs at the edges,
// producing rainbow fringes (honest dispersion, not a post-effect).

// Blob centers, computed once per frame in main() (map runs thousands of times
// per pixel — keep the sin/cos out of it).
vec3 gC1, gC2, gC3;

float map(vec3 p) {
  float b = sdSphere(p - gC1, 0.55);
  b = smin(b, sdSphere(p - gC2, 0.45), 0.30);
  b = smin(b, sdSphere(p - gC3, 0.40), 0.30);
  return b;
}

// March until the (side-signed) field goes negative. side=+1 outside, -1 inside.
float march(vec3 ro, vec3 rd, float side) {
  float t = 0.002;
  for (int i = 0; i < 96; i++) {
    float d = map(ro + rd * t) * side;
    if (d < 0.0006) return t;
    t += max(d, 0.004);
    if (t > 8.0) break;
  }
  return -1.0;
}

vec3 shade(vec3 ro, vec3 rd) {
  float t = march(ro, rd, 1.0);
  if (t < 0.0) return environment(rd);

  vec3 pos = ro + rd * t;
  vec3 nor = CALC_NORMAL(pos, map);
  float cosI = max(dot(-rd, nor), 0.0);
  float fres = fresnelSchlick(cosI, 1.0, u_iorBase);
  vec3 reflCol = environment(reflect(rd, nor));

  vec3 trans = vec3(0.0);
  int N = u_samples;
  for (int i = 0; i < 64; i++) {
    if (i >= N) break;
    float nm;
    float n = iorForSample(i, N, nm);
    vec3 wl = wavelengthRGB(nm);

    vec3 din = refract(rd, nor, 1.0 / n);
    if (din == vec3(0.0)) { trans += wl * reflCol; continue; }
    din = normalize(din);

    vec3 ip = pos - nor * 0.01;
    float t2 = march(ip, din, -1.0);
    float pathLen = (t2 < 0.0) ? 0.6 : t2;
    vec3 exitp = (t2 < 0.0) ? ip + din * 0.6 : ip + din * t2;

    vec3 outdir;
    if (t2 < 0.0) {
      outdir = din;
    } else {
      vec3 nn = CALC_NORMAL(exitp, map);
      if (dot(din, nn) > 0.0) nn = -nn;       // face against the incident ray
      vec3 ro2 = refract(din, nn, n);
      outdir = (ro2 == vec3(0.0)) ? reflect(din, nn) : normalize(ro2);
    }
    // Beer-Lambert: longer interior path = more absorption.
    float a = exp(-u_absorption * pathLen * 2.0);
    trans += wl * environment(outdir) * a;
  }
  trans *= 2.6 / float(N);

  return mix(trans, reflCol, fres);
}

void main() {
  float t = u_time * 0.5;
  gC1 = vec3(sin(t) * 0.25, cos(t * 0.7) * 0.20, 0.0);
  gC2 = vec3(-sin(t * 1.3) * 0.30, sin(t * 0.5) * 0.25, cos(t) * 0.20);
  gC3 = vec3(cos(t * 0.9) * 0.30, -0.20, sin(t * 1.1) * 0.30);

  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  // Orbit camera with the mouse.
  vec2 m = (u_mouse - 0.5) * vec2(6.2, 3.0);
  vec3 ro = vec3(0.0, 0.0, 3.4);
  ro.yz *= rot2(-m.y); ro.xz *= rot2(-m.x);
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(vec3(0, 1, 0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);

  writeAccum(shade(ro, rd));
}
