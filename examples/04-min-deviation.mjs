// 04-min-deviation.mjs — minimum deviation angle of a 60° prism per material,
// and the spread between violet and red (the angular width of the spectrum fan).
//
//   node examples/04-min-deviation.mjs

import { minDeviation, cauchyNm, DEG, RAD } from '../src/js/optics.js';
import { MATERIALS } from '../src/js/params.js';

const apex = 60 * RAD; // equilateral prism

console.log('60° prism, minimum deviation δ = 2·asin(n·sin(30°)) − 60°\n');
for (const [name, { A, B }] of Object.entries(MATERIALS)) {
  const nV = cauchyNm(A, B, 400); // violet
  const nR = cauchyNm(A, B, 680); // red
  const dV = minDeviation(apex, nV);
  const dR = minDeviation(apex, nR);
  if (dV == null || dR == null) { console.log(`${name.padEnd(13)} TIR at this apex angle`); continue; }
  const spread = (dV - dR) * DEG;
  console.log(
    `${name.padEnd(13)} δ_violet=${(dV * DEG).toFixed(2)}°  δ_red=${(dR * DEG).toFixed(2)}°  ` +
    `→ fan width ${spread.toFixed(2)}°`
  );
}
console.log('\nThe "fan width" is how far apart violet and red emerge — the visible spectrum.');
