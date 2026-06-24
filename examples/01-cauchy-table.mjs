// 01-cauchy-table.mjs — print the Cauchy dispersion n(λ) for each material.
//
//   node examples/01-cauchy-table.mjs
//
// Shows why blue bends harder than red: n is larger at short wavelengths.

import { cauchyNm } from '../src/js/optics.js';
import { MATERIALS } from '../src/js/params.js';

const LAMBDAS = [380, 440, 490, 550, 620, 700]; // nm: violet -> red

console.log('Cauchy dispersion  n(λ) = A + B/λ²   (λ in µm)\n');
const head = ['material'.padEnd(13), ...LAMBDAS.map((l) => `${l}nm`.padStart(8)), '   Δn(380-700)'];
console.log(head.join(''));

for (const [name, { A, B }] of Object.entries(MATERIALS)) {
  const ns = LAMBDAS.map((l) => cauchyNm(A, B, l));
  const dn = ns[0] - ns[ns.length - 1];
  const row = [
    name.padEnd(13),
    ...ns.map((n) => n.toFixed(4).padStart(8)),
    `   ${dn.toFixed(4)} (${((dn / ns[ns.length - 1]) * 100).toFixed(1)}%)`,
  ];
  console.log(row.join(''));
}

console.log('\nLarger Δn → wider spectral fan. Flint glass spreads ~2.5× a crown prism.');
