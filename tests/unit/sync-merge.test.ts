import { describe, expect, it } from 'vitest';
import { mergeRecords } from '../../src/sync/sync-engine';

describe('merge de sincronização por updated_at', () => {
  it('mantém o registro local mais novo', () => {
    expect(
      mergeRecords(
        { status: 'Pulei', updatedAt: 200 },
        { status: 'Sim', updatedAt: 100 }
      )
    ).toEqual({ winner: 'local', record: { status: 'Pulei', updatedAt: 200 } });
  });

  it('aceita o registro remoto mais novo', () => {
    expect(
      mergeRecords(
        { status: 'Sim', updatedAt: 100 },
        { status: 'Pulei', updatedAt: 200 }
      )
    ).toEqual({ winner: 'remote', record: { status: 'Pulei', updatedAt: 200 } });
  });

  it('preserva desmarcação offline quando o tombstone local é mais novo', () => {
    expect(
      mergeRecords(
        { status: 'Não', updatedAt: 300 },
        { status: 'Sim', updatedAt: 250 }
      )
    ).toEqual({ winner: 'local', record: { status: 'Não', updatedAt: 300 } });
  });

  it('desempata timestamps iguais em favor do local para não ressuscitar status', () => {
    expect(
      mergeRecords(
        { status: 'Não', updatedAt: 500 },
        { status: 'Sim', updatedAt: 500 }
      )
    ).toEqual({ winner: 'local', record: { status: 'Não', updatedAt: 500 } });
  });

  it('reconhece registros idênticos', () => {
    expect(
      mergeRecords(
        { status: 'Sim', updatedAt: 500 },
        { status: 'Sim', updatedAt: 500 }
      )
    ).toEqual({ winner: 'equal', record: { status: 'Sim', updatedAt: 500 } });
  });
});
