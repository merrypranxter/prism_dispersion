#version 300 es
precision highp float;
//#include "common.glsl"

// gem-fire.glsl — the Diamond Fire regime.
// A faceted, flat-topped gem (clipped octahedron) rotates slowly. High IOR
// (diamond ≈ 2.42) means rays bounce repeatedly by total internal reflection
// before escaping; each bounce is refracted per-wavelength, so the escaping
// light flashes rainbow "fire". Strong Fresnel reflection gives white sparkle.

// Combined gem rotation, computed once per frame in main() (map runs thousands
// of times per pixel — keep the sin/cos out of it).
mat3 gRot;

float map(vec3 p) {
  p = gRot * p;
  float o = sdOctahedron(p, 0.98);
  o = max(o, p.y - 0.40);     // flat table on top
  return o;
}

float march(vec3 ro, vec3 rd, float side) {
  float t = 0.002;
  for (int i = 0; i < 80; i++) {
    float d = map(ro + rd * t) * side;
    if (d < 0.0006) return t;
    t += max(d, 0.004);
    if (t > 8.0) break;
  }
  return -1.0;
}

vec3 shade(vec3 ro, vec3 rd) {
  float t = march(ro, rd, 1.0);
  if (t < 0.0) return environment(rd) * 0.4;

  vec3 pos = ro + rd * t;
  vec3 nor = CALC_NORMAL(pos, map);
  float cosI = max(dot(-rd, nor), 0.0);
  float fres = fresnelSchlick(cosI, 1.0, u_iorBase);
  vec3 sparkle = environment(reflect(rd, nor)) * fres * 1.4;

  vec3 fire = vec3(0.0);
  int N = u_samples;
  for (int i = 0; i < 64; i++) {
    if (i >= N) break;
    float nm;
    float n = iorForSample(i, N, nm);
    vec3 wl = wavelengthRGB(nm);

    vec3 din = refract(rd, nor, 1.0 / n);
    if (din == vec3(0.0)) continue;
    din = normalize(din);
    vec3 ip = pos - nor * 0.01;

    float pathTotal = 0.0;
    vec3 escaped = vec3(0.0);
    // Up to 4 internal bounces — TIR keeps light trapped, building "fire".
    for (int k = 0; k < 4; k++) {
      float td = march(ip, din, -1.0);
      if (td < 0.0) break;
      pathTotal += td;
      vec3 ep = ip + din * td;
      vec3 nn = CALC_NORMAL(ep, map);
      if (dot(din, nn) > 0.0) nn = -nn;
      vec3 outd = refract(din, nn, n);
      if (outd == vec3(0.0)) {
        din = reflect(din, nn);   // total internal reflection
        ip = ep + din * 0.01;
        continue;
      }
      float fout = 1.0 - fresnelSchlick(max(dot(din, -nn), 0.0), 1.0, n);
      escaped = environment(normalize(outd)) * fout;
      break;
    }
    float a = exp(-u_absorption * pathTotal * 1.5);
    fire += wl * escaped * a;
  }
  fire *= 3.4 / float(N);

  return sparkle + fire;
}

void main() {
  gRot = rotX(0.5) * rotY(u_time * 0.45);   // p = rotX*(rotY*p)
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  vec2 m = (u_mouse - 0.5) * vec2(6.2, 2.6);
  vec3 ro = vec3(0.0, 0.2, 3.2);
  ro.yz *= rot2(-m.y); ro.xz *= rot2(-m.x);
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(vec3(0, 1, 0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.7 * fw);

  writeAccum(shade(ro, rd));
}
