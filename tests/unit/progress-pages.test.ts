import { describe, expect, it, vi } from 'vitest';
import { progressPages } from '../../src/sync/progress-pages';

function clientFor(read: (start: number, end: number) => unknown) {
  const range = vi.fn(async (start: number, end: number) => read(start, end));
  const order = vi.fn(() => ({ range }));
  const eq = vi.fn(() => ({ order }));
  const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) };
  return { client, eq, order, range };
}

async function countPages(client: unknown) {
  let count = 0;
  for await (const page of progressPages(client, 'account-a')) count += page.length;
  return count;
}

describe('consulta compartilhada de progresso', () => {
  it('consulta todas as páginas com filtro de conta e ordem estável', async () => {
    const rows = Array.from({ length: 1001 }, (_, ord) => ({ ord }));
    const api = clientFor((start, end) => ({ data: rows.slice(start, end + 1) }));
    expect(await countPages(api.client)).toBe(1001);
    expect(api.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499]
    ]);
    expect(api.eq.mock.calls).toEqual(Array(3).fill(['user_id', 'account-a']));
    expect(api.order).toHaveBeenCalledWith('ord', { ascending: true });
  });

  it('recusa um resultado truncado quando o servidor excede o limite', async () => {
    const api = clientFor(() => ({ data: Array(500).fill({ ord: 1 }) }));
    await expect(countPages(api.client)).rejects.toThrow('Quantidade de registros inesperada');
  });

  it('não considera falha numa página posterior como fim da consulta', async () => {
    const api = clientFor((start) =>
      start === 0
        ? { data: Array(500).fill({ ord: 1 }) }
        : { error: { message: 'rede indisponível' } }
    );
    await expect(countPages(api.client)).rejects.toThrow('rede indisponível');
  });
});
