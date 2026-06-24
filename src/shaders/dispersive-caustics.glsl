#version 300 es
precision highp float;
//#include "common.glsl"

// dispersive-caustics.glsl — the Spectral Caustics regime.
// A glass prism sits above a light floor under a bright light. Light focused
// through the prism lands as sharp, rainbow-fringed caustic pools. True caustic
// transport is expensive, so the floor's received irradiance is approximated by
// an interference field that is sampled per-wavelength with a dispersion-scaled
// offset — bluer wavelengths deviate more, producing the rainbow fringes.

float mapGlass(vec3 p) {
  vec3 q = p - vec3(0.0, 0.45, 0.0);
  q.xz = rot2(u_time * 0.2) * q.xz;
  return sdTriPrism(q, vec2(0.55, 0.55));
}
float mapFloor(vec3 p) { return p.y + 1.2; }

// Sharp interfering filaments -> bright caustic lines.
float causticField(vec2 q) {
  float v = 0.0;
  v += sin(q.x * 6.0 + sin(q.y * 5.0 + u_time));
  v += sin(q.y * 6.5 + sin(q.x * 4.5 - u_time * 0.8));
  v += sin((q.x + q.y) * 5.0 + u_time * 0.6);
  float c = abs(v) / 3.0;
  return pow(1.0 - clamp(c, 0.0, 1.0), 6.0);
}

// Raymarch glass; returns t (or -1) and writes the surface normal.
float marchGlass(vec3 ro, vec3 rd, out vec3 nor) {
  float t = 0.01;
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    float d = mapGlass(p);
    if (d < 0.001) {
      nor = normalize(vec3(
        mapGlass(p + vec3(0.001, 0, 0)) - mapGlass(p - vec3(0.001, 0, 0)),
        mapGlass(p + vec3(0, 0.001, 0)) - mapGlass(p - vec3(0, 0.001, 0)),
        mapGlass(p + vec3(0, 0, 0.001)) - mapGlass(p - vec3(0, 0, 0.001))));
      return t;
    }
    t += d;
    if (t > 12.0) break;
  }
  return -1.0;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  vec3 lightPos = vec3((u_mouse.x - 0.5) * 3.0, 2.4, (u_mouse.y - 0.5) * 2.0 - 0.5);

  vec3 ro = vec3(0.0, 0.9, 3.6);
  vec3 ta = vec3(0.0, -0.2, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0, 1, 0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);

  vec3 col = vec3(0.0);

  // Intersect the floor (analytic plane).
  float tFloor = (rd.y < -1e-4) ? (-1.2 - ro.y) / rd.y : -1.0;
  vec3 nor;
  float tGlass = marchGlass(ro, rd, nor);

  bool hitGlass = tGlass > 0.0 && (tFloor < 0.0 || tGlass < tFloor);

  if (hitGlass) {
    // Glassy prism: Fresnel rim + a hint of refracted dispersion.
    float fres = fresnelSchlick(max(dot(-rd, nor), 0.0), 1.0, u_iorBase);
    vec3 refr = vec3(0.0);
    int N = u_samples;
    for (int i = 0; i < 64; i++) {
      if (i >= N) break;
      float nm; float n = iorForSample(i, N, nm);
      vec3 d = refract(rd, nor, 1.0 / n);
      d = (d == vec3(0.0)) ? reflect(rd, nor) : normalize(d);
      refr += wavelengthRGB(nm) * environment(d);
    }
    refr *= 1.8 / float(N);
    col = mix(refr, environment(reflect(rd, nor)), fres) + vec3(0.15) * fres;
  } else if (tFloor > 0.0) {
    vec3 pos = ro + rd * tFloor;
    vec3 baseFloor = vec3(0.72, 0.74, 0.78);

    // Soft shadow of the prism between the floor point and the light.
    vec3 toL = normalize(lightPos - pos);
    vec3 sn = vec3(0.0);
    float sh = (marchGlass(pos + toL * 0.05, toL, sn) > 0.0) ? 0.45 : 1.0;

    // Dispersive caustic: sample the field per-wavelength with a deviation
    // offset that grows with (n(λ) - n_mid) — bluer bends more.
    float nMid = cauchy(u_iorBase, u_dispersion, 0.55);
    vec2 q = pos.xz * 1.4 + vec2(0.6, 0.0);     // pool sits beside the prism
    vec3 caustic = vec3(0.0);
    int N = u_samples;
    for (int i = 0; i < 64; i++) {
      if (i >= N) break;
      float nm; float n = iorForSample(i, N, nm);
      float dev = (n - nMid) / max(u_dispersion, 1e-4) * 0.018;
      caustic += wavelengthRGB(nm) * causticField(q + vec2(dev, dev * 0.5));
    }
    caustic *= 3.2 / float(N);

    // Envelope: pool concentrated near the refracted spot, fading outward.
    float env = exp(-dot(pos.xz - vec2(0.6, 0.0), pos.xz - vec2(0.6, 0.0)) * 0.5);
    col = baseFloor * (0.35 + 0.65 * sh) + caustic * env * sh;
  } else {
    col = environment(rd) * 0.3;
  }

  writeAccum(col);
}
