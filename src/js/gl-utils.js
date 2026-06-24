// gl-utils.js — minimal WebGL2 helpers: shader compile, program link, FBO ping-pong.
// No dependencies, no build step. Throws with readable messages on failure.

/** Create a WebGL2 context or throw. */
export function getGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error('WebGL2 not supported in this browser.');
  // We render HDR into float textures and tone-map in the post pass.
  const ext = gl.getExtension('EXT_color_buffer_float');
  if (!ext) throw new Error('EXT_color_buffer_float unavailable — HDR float FBOs unsupported.');
  gl.getExtension('OES_texture_float_linear'); // optional, for linear filtering of float
  return gl;
}

/** Compile a single shader stage; throws with the info log on error. */
function compileShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    const kind = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    gl.deleteShader(sh);
    throw new Error(`${kind} shader compile error:\n${log}\n\n${numberLines(source)}`);
  }
  return sh;
}

/** Link a program from vertex + fragment source. */
export function createProgram(gl, vertSrc, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    throw new Error(`program link error:\n${log}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  // Cache uniform locations lazily.
  const cache = new Map();
  prog.u = (name) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
    return cache.get(name);
  };
  return prog;
}

/** A single fullscreen triangle covering the viewport (no VBO needed beyond gl_VertexID). */
export const FULLSCREEN_VERT = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  // 3-vertex trick: spans the screen with a single triangle.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = p;                       // 0..2 range; >1 clipped
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Create an RGBA16F render target. */
export function createRenderTarget(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`RGBA16F render target incomplete (status 0x${status.toString(16)}) — this device may not support rendering to half-float textures.`);
  }
  return { fbo, tex, w, h };
}

/** A pair of render targets for ping-pong accumulation. */
export class PingPong {
  constructor(gl, w, h) {
    this.gl = gl;
    this.a = createRenderTarget(gl, w, h);
    this.b = createRenderTarget(gl, w, h);
  }
  get read() { return this.a; }
  get write() { return this.b; }
  swap() { const t = this.a; this.a = this.b; this.b = t; }
  resize(w, h) {
    const gl = this.gl;
    for (const rt of [this.a, this.b]) {
      gl.deleteFramebuffer(rt.fbo);
      gl.deleteTexture(rt.tex);
    }
    this.a = createRenderTarget(gl, w, h);
    this.b = createRenderTarget(gl, w, h);
  }
}

function numberLines(src) {
  return src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join('\n');
}
