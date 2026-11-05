import { expect, it } from 'vitest';
import { historicalRange } from '../../src/data/historical-range.mjs';

it('deriva limites da linha principal, sem incluir extras ou depender da ordem dos campos', () => {
  expect(
    historicalRange(
      ['historicalNumber', 'type'],
      [
        [1002, 'Principal'],
        [1, 'Principal'],
        [9999, 'Extra']
      ]
    )
  ).toEqual({ min: 1, max: 1002 });
  expect(() => historicalRange(['type', 'historicalNumber'], [['Extra', null]])).toThrow();
});
