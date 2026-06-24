// main.js — entry point. Wires GL, shaders, controls, and the render loop.
//
// Pipeline (honors the repo canon: fbo_ping_pong + additive accumulation + 1d_ramp + post_finisher):
//   1. The active engine renders one HDR sample into a ping-pong buffer,
//      blending with the previous frame for progressive (temporal) accumulation.
//   2. A post pass tone-maps + blooms + vignettes the accumulated HDR → screen.

import { getGL, createProgram, FULLSCREEN_VERT, PingPong } from './gl-utils.js';
import { createSpectralRampTexture } from './spectral_color.js';
import { defaultParams, applyModeDefaults } from './params.js';
import { attachControls } from './controls.js';

const ENGINES = {
  dark_side: 'newton-prism',
  diamond_fire: 'gem-fire',
  liquid_glass: 'glass-dispersion',
  spectral_caustics: 'dispersive-caustics',
};

const canvas = document.getElementById('gl');
const overlay = document.getElementById('overlay');

function fatal(err) {
  console.error(err);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:0;margin:0;padding:16px;color:#ff6b6b;background:#000;font:12px/1.4 monospace;white-space:pre-wrap;overflow:auto;z-index:9;';
  pre.textContent = 'prism_dispersion failed to start:\n\n' + (err.stack || err.message || err);
  document.body.appendChild(pre);
}

async function loadShader(name) {
  const res = await fetch(`src/shaders/${name}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`could not load shader src/shaders/${name} (${res.status})`);
  return res.text();
}

async function main() {
  const gl = getGL(canvas);
  const params = defaultParams();
  applyModeDefaults(params, 'dark_side');

  // Shared GLSL prelude prepended to every engine fragment shader.
  const common = await loadShader('common.glsl');
  const postFrag = await loadShader('post.glsl');

  // Compile every engine up front (there are only four).
  const programs = {};
  for (const engine of new Set(Object.values(ENGINES))) {
    const frag = await loadShader(`${engine}.glsl`);
    programs[engine] = createProgram(gl, FULLSCREEN_VERT, injectCommon(frag, common));
  }
  const postProgram = createProgram(gl, FULLSCREEN_VERT, postFrag);

  const ramp = createSpectralRampTexture(gl, 256);

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let pp; // ping-pong HDR buffers
  let frame = 0; // progressive accumulation counter

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h && pp) return;
    canvas.width = w; canvas.height = h;
    if (!pp) pp = new PingPong(gl, w, h);
    else pp.resize(w, h);
    resetAccum();
  }

  function resetAccum() { frame = 0; }

  // Any input that changes the image restarts accumulation.
  const input = attachControls(canvas, params, resetAccum);
  window.addEventListener('resize', resize);

  // Static fullscreen-triangle VAO (no buffers; uses gl_VertexID).
  const vao = gl.createVertexArray();

  const start = performance.now();
  function render(now) {
    resize();
    const t = (now - start) / 1000;
    const engine = programs[ENGINES[params.mode]];

    // --- Pass 1: engine renders one sample into the write buffer. ---
    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pp.write.fbo);
    gl.viewport(0, 0, pp.write.w, pp.write.h);
    gl.useProgram(engine);

    gl.uniform2f(engine.u('u_resolution'), pp.write.w, pp.write.h);
    gl.uniform1f(engine.u('u_time'), t);
    gl.uniform1i(engine.u('u_frame'), frame);
    gl.uniform2f(engine.u('u_mouse'), input.mouse[0], input.mouse[1]);
    gl.uniform1f(engine.u('u_iorBase'), params.iorBase);
    gl.uniform1f(engine.u('u_dispersion'), params.dispersion);
    gl.uniform1i(engine.u('u_samples'), params.wavelengthSamples);
    gl.uniform1f(engine.u('u_beamWidth'), params.beamWidth);
    gl.uniform1f(engine.u('u_absorption'), params.absorption);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ramp);
    gl.uniform1i(engine.u('u_ramp'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pp.read.tex);
    gl.uniform1i(engine.u('u_prev'), 1);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    pp.swap(); // newly written buffer becomes the read buffer

    // --- Pass 2: post finisher to the screen. ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(postProgram);
    gl.uniform2f(postProgram.u('u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(postProgram.u('u_exposure'), params.exposure);
    gl.uniform1f(postProgram.u('u_bloom'), params.bloom);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pp.read.tex);
    gl.uniform1i(postProgram.u('u_scene'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    frame++;
    updateHUD(t);
    requestAnimationFrame(render);
  }

  function updateHUD() {
    overlay.textContent =
      `prism_dispersion · ${params.mode} · ` +
      `n(A)=${params.iorBase.toFixed(2)} B=${params.dispersion.toFixed(4)} ` +
      `λ-samples=${params.wavelengthSamples} · spp=${frame}\n` +
      `1-4 mode · scroll dispersion · [ ] samples · - = exposure`;
  }

  requestAnimationFrame(render);
}

// Replaces the `//#include "common.glsl"` directive (or prepends after #version).
function injectCommon(frag, common) {
  if (frag.includes('//#include "common.glsl"')) {
    return frag.replace('//#include "common.glsl"', common);
  }
  // Otherwise splice the prelude right after the #version line.
  const lines = frag.split('\n');
  const vi = lines.findIndex((l) => l.trim().startsWith('#version'));
  lines.splice(vi + 1, 0, common);
  return lines.join('\n');
}

main().catch(fatal);
