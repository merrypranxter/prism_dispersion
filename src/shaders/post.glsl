#version 300 es
precision highp float;

// post.glsl — the post finisher (canon: post_finisher).
// Cheap single-pass bloom (multi-tap bright sampling) + ACES-ish tone mapping
// + vignette. Reads the accumulated HDR scene and writes 8-bit sRGB to screen.

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_scene;
uniform vec2  u_resolution;
uniform float u_exposure;
uniform float u_bloom;

vec3 sampleBloom(vec2 uv) {
  vec2 px = 1.0 / u_resolution;
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  // 13-tap dispersed kernel; only keep bright energy.
  const int R = 6;
  for (int i = -R; i <= R; i++) {
    float w = exp(-float(i * i) / 18.0);
    vec3 sx = texture(u_scene, uv + vec2(float(i) * px.x * 2.0, 0.0)).rgb;
    vec3 sy = texture(u_scene, uv + vec2(0.0, float(i) * px.y * 2.0)).rgb;
    vec3 bx = max(sx - 0.6, 0.0);
    vec3 by = max(sy - 0.6, 0.0);
    sum += (bx + by) * w;
    wsum += w * 2.0;
  }
  return sum / max(wsum, 1e-4);
}

// Narkowicz ACES approximation.
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 hdr = texture(u_scene, uv).rgb;
  hdr += sampleBloom(uv) * u_bloom;
  hdr *= u_exposure;

  vec3 col = aces(hdr);
  col = pow(col, vec3(1.0 / 2.2));            // sRGB-ish gamma

  // Vignette.
  vec2 c = uv - 0.5;
  col *= 1.0 - 0.5 * dot(c, c);

  fragColor = vec4(col, 1.0);
}
