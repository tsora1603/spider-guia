import index from './generated-index.json' with { type: 'json' };

export function historicalRange(fields, rows) {
  const type = fields.indexOf('type');
  const historical = fields.indexOf('historicalNumber');
  const numbers = rows.filter((row) => row[type] === 'Principal').map((row) => row[historical]);
  if (!numbers.length || numbers.some((n) => !Number.isSafeInteger(n) || n < 1))
    throw Error('Linha histórica inválida no índice do catálogo.');
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

export const { min: HISTORICAL_MIN, max: HISTORICAL_MAX } = historicalRange(
  index.itemIndexFields,
  index.itemIndex
);
