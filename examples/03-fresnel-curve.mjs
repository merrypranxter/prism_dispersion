// 03-fresnel-curve.mjs — Schlick reflectance vs. incidence angle, as ASCII.
//
//   node examples/03-fresnel-curve.mjs
//
// At normal incidence glass reflects ~4%, diamond ~17%. Everything reflects
// ~100% at grazing angles — the basis of the bright rims on glass objects.

import { fresnelSchlick, fresnelR0, RAD } from '../src/js/optics.js';

const cases = [
  ['glass  (n=1.52)', 1.0, 1.52],
  ['diamond(n=2.42)', 1.0, 2.42],
];

for (const [label, n1, n2] of cases) {
  console.log(`\n${label}   R0 = ${(fresnelR0(n1, n2) * 100).toFixed(1)}%`);
  for (let deg = 0; deg <= 90; deg += 10) {
    const R = fresnelSchlick(Math.cos(deg * RAD), n1, n2);
    const bar = '#'.repeat(Math.round(R * 40));
    console.log(`  ${String(deg).padStart(2)}°  ${(R * 100).toFixed(1).padStart(5)}%  ${bar}`);
  }
}
