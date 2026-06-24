// check-shaders.mjs — syntax-check every engine the way main.js assembles it.
//
//   npm install   # once, to get the dev-only GLSL parser
//   npm test
//
// Injects common.glsl into each engine (same as the runtime), runs the GLSL
// preprocessor (expanding #define macros), then parses. Catches syntax errors
// before they reach a browser. Not a full type-checker, but a fast guardrail.

import { parser } from '@shaderfrog/glsl-parser/index.js';
import { preprocess } from '@shaderfrog/glsl-parser/preprocessor/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/shaders');
const common = fs.readFileSync(path.join(ROOT, 'common.glsl'), 'utf8');

const inject = (frag) =>
  frag.includes('//#include "common.glsl"')
    ? frag.replace('//#include "common.glsl"', common)
    : frag;

// Declare GL built-ins the parser doesn't know, so only real errors surface.
const BUILTINS = 'vec4 gl_FragCoord;\nint gl_VertexID;\nvec4 gl_Position;\n';

const engines = ['newton-prism', 'glass-dispersion', 'gem-fire', 'dispersive-caustics', 'post'];
let failed = 0;

for (const e of engines) {
  const src = inject(fs.readFileSync(path.join(ROOT, `${e}.glsl`), 'utf8'));
  let pp = preprocess(src);
  pp = pp.replace(/#version.*\n/, '').replace(/precision\s+\w+\s+\w+\s*;/g, '');
  try {
    // Silence the parser's unknown-builtin warnings; keep real errors.
    const warn = console.warn; console.warn = () => {};
    parser.parse(BUILTINS + pp);
    console.warn = warn;
    console.log(`  ok   ${e}.glsl`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${e}.glsl: ${String(err.message).split('\n')[0]}`);
  }
}

if (failed) { console.error(`\n${failed} shader(s) failed to parse.`); process.exit(1); }
console.log('\nAll shaders parsed cleanly.');
