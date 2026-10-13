import assert from 'node:assert/strict';
import { reconcileFocusSelection } from '../src/components/focus-selection.ts';

const sequence = [1, 2, 3, 4, 5];
const positions = new Map(sequence.map((id, index) => [id, index]));
const read = new Set();
const unread = (id) => !read.has(id);
let current = reconcileFocusSelection(sequence, null, positions, unread);
assert.equal(current, 1, 'início em Amazing Fantasy #15');
read.add(1);
current = reconcileFocusSelection(sequence, 2, positions, unread);
assert.equal(current, 2, 'Próxima não retorna a Amazing Fantasy #15 após marcá-la');
read.add(2);
current = reconcileFocusSelection(sequence, 3, positions, unread);
assert.equal(current, 3, 'segunda Próxima não retorna à primeira HQ');
current = reconcileFocusSelection(sequence, 2, positions, unread);
assert.equal(current, 2, 'Anterior volta à HQ anterior');
assert.equal(
  reconcileFocusSelection([3, 4, 5], 2, positions, unread),
  3,
  'filtro Pendentes avança a partir da posição da HQ removida'
);
assert.equal(
  reconcileFocusSelection([1, 2], 5, positions, unread),
  2,
  'filtro no fim escolhe a última edição visível'
);
assert.equal(reconcileFocusSelection([], 5, positions, unread), null, 'lista vazia é estável');

console.log('OK: navegação 1→2→3→2, estados independentes e filtros.');
