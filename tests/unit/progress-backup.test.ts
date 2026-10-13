import { describe, expect, it } from 'vitest';
import {
  validateProgressBackup,
  retainMissingVolumeProgress,
  PROGRESS_EXPORT_FORMAT
} from '../../src/progress/backup';
const historical = [1, 2, 3];
const registered = [1, 2, 3, 4, 5];
const payload = (ids: number[]) => ({
  format: PROGRESS_EXPORT_FORMAT,
  version: 1,
  items: ids.map((id) => ({
    id,
    status: id === 2 ? 'Pulei' : 'Sim',
    updatedAt: '2026-10-12T12:00:00Z'
  })),
  readingLog: { '1': 100 }
});

describe('compatibilidade dos backups antes e depois dos volumes Panini', () => {
  it('aceita os dois registros completos e preserva estados e timestamps históricos', () => {
    const old = validateProgressBackup(payload(historical), historical, registered);
    expect(old.legacy).toBe(true);
    expect(old.items[1].status).toBe('Pulei');
    expect(old.items[1].updatedAt).toBe(Date.parse('2026-10-12T12:00:00Z'));
    expect(validateProgressBackup(payload(registered), historical, registered).legacy).toBe(false);
  });
  it('importar backup antigo preserva marcações explícitas de volumes ausentes', () => {
    const old = validateProgressBackup(payload(historical), historical, registered);
    const retained = retainMissingVolumeProgress(
      old,
      [4, 5],
      (id) => (id === 4 ? { status: 'Sim', updatedAt: 123 } : null),
      { '4': 122 }
    );
    expect(retained.items.slice(3)).toEqual([
      { id: 4, status: 'Sim', updatedAt: 123 },
      { id: 5, status: 'Não', updatedAt: 0 }
    ]);
    expect(retained.readingLog).toEqual({ '1': 100, '4': 122 });
    expect(old.items).toHaveLength(3);
  });
  it('rejeita subconjuntos, duplicações, IDs desconhecidos e histórico fora do arquivo', () => {
    expect(() => validateProgressBackup(payload([1, 2]), historical, registered)).toThrow(
      'catálogo completo'
    );
    expect(() => validateProgressBackup(payload([1, 2, 4]), historical, registered)).toThrow(
      'catálogo completo'
    );
    expect(() => validateProgressBackup(payload([1, 2, 2]), historical, registered)).toThrow(
      'duplicado'
    );
    expect(() => validateProgressBackup(payload([1, 2, 99]), historical, registered)).toThrow(
      'inválido'
    );
    const bad = { ...payload(historical), readingLog: { '5': 100 } };
    expect(() => validateProgressBackup(bad, historical, registered)).toThrow('histórico local');
  });
  it('valida status, versão e datas e respeita a sobrescrita de um backup novo', () => {
    expect(() =>
      validateProgressBackup({ ...payload(historical), version: 2 }, historical, registered)
    ).toThrow('Versão');
    const bad = payload(historical);
    bad.items[0].updatedAt = 'invalid';
    expect(() => validateProgressBackup(bad, historical, registered)).toThrow('updatedAt');
    const current = validateProgressBackup(payload(registered), historical, registered);
    expect(retainMissingVolumeProgress(current, [4, 5], () => null, {})).toBe(current);
  });
});
