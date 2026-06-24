// 02-critical-angle.mjs — total internal reflection thresholds.
//
//   node examples/02-critical-angle.mjs
//
// The critical angle is why diamond sparkles: light entering a diamond is
// trapped by TIR over a huge range of angles, bouncing internally before it
// escapes — and on the way out it's dispersed into "fire".

import { criticalAngle, DEG } from '../src/js/optics.js';
import { MATERIALS } from '../src/js/params.js';

console.log('Total internal reflection — critical angle θc = asin(n_air / n_mat)\n');
for (const [name, { A }] of Object.entries(MATERIALS)) {
  const tc = criticalAngle(A, 1.0); // material -> air
  const deg = tc * DEG;
  const trapped = 90 - deg; // angular window that undergoes TIR
  console.log(
    `${name.padEnd(13)} n≈${A.toFixed(2)}   θc = ${deg.toFixed(1)}°   ` +
    `(TIR for incidence > ${deg.toFixed(1)}°, a ${trapped.toFixed(1)}° trapping window)`
  );
}
console.log('\nDiamond\'s small θc (~24°) traps the most light → maximum internal sparkle.');
