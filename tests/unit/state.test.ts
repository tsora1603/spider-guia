import { beforeEach, describe, expect, it, vi } from 'vitest';
import oldProgressFixture from '../fixtures/progress-v1-example.json';
import { appState } from '../../src/state/app-state';
import { progressStore, STORAGE_KEYS } from '../../src/state/progress-store';
import { migrateStorage, STORAGE_VERSION } from '../../src/state/storage-migrations';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

describe('estado e migração de progresso', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    appState.progress = {};
    appState.progressMeta = {};
    appState.readingLog = {};
    appState.syncQueue = [];
  });

  it('migra o progresso v1 sem alterar nenhum status ou log', () => {
    const migrated = migrateStorage({
      version: 0,
      progress: oldProgressFixture['aranha-progress-v1'],
      log: oldProgressFixture['aranha-log-v1'],
      meta: {},
      queue: []
    });

    expect(migrated.version).toBe(STORAGE_VERSION);
    expect(migrated.progress).toEqual(oldProgressFixture['aranha-progress-v1']);
    expect(migrated.log).toEqual(oldProgressFixture['aranha-log-v1']);
    expect(Object.keys(migrated.meta).sort()).toEqual(
      Object.keys(oldProgressFixture['aranha-progress-v1']).sort()
    );
    for (const [id, status] of Object.entries(oldProgressFixture['aranha-progress-v1'])) {
      expect(migrated.meta[id]).toEqual({ status, updatedAt: 0 });
    }
  });

  it('mantém as chaves históricas e persiste tombstone apenas em metadata', () => {
    localStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify(oldProgressFixture['aranha-progress-v1'])
    );
    localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(oldProgressFixture['aranha-log-v1']));

    progressStore.load();
    progressStore.set(1, 'Não', { updatedAt: 123, updateLog: false });
    progressStore.save();

    const progress = JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}');
    const meta = JSON.parse(localStorage.getItem('aranha-progress-meta-v2') || '{}');

    expect(progress['1']).toBeUndefined();
    expect(meta['1']).toEqual({ status: 'Não', updatedAt: 123 });
    expect(localStorage.getItem('aranha-storage-version-v1')).toBe(String(STORAGE_VERSION));
  });

  it('faz batch sem emitir atualizações intermediárias', () => {
    const one = vi.fn();
    const two = vi.fn();
    const all = vi.fn();
    const stopOne = progressStore.subscribe(1, one);
    const stopTwo = progressStore.subscribe(2, two);
    const stopAll = progressStore.subscribeAll(all);

    progressStore.batch(() => {
      progressStore.set(1, 'Sim', { updatedAt: 10 });
      progressStore.set(2, 'Pulei', { updatedAt: 11 });
      expect(one).not.toHaveBeenCalled();
      expect(two).not.toHaveBeenCalled();
      expect(all).not.toHaveBeenCalled();
    });

    expect(one).toHaveBeenCalledTimes(1);
    expect(two).toHaveBeenCalledTimes(1);
    expect(all).toHaveBeenCalledTimes(1);

    stopOne();
    stopTwo();
    stopAll();
  });

  it('desfaz apenas os IDs capturados sem reverter alterações independentes', () => {
    progressStore.set(1, 'Sim', { updatedAt: 10 });
    progressStore.set(2, 'Pulei', { updatedAt: 11 });
    const before = progressStore.snapshotIds([1, 2]);

    progressStore.set(1, 'Não', { updatedAt: 20 });
    progressStore.set(2, 'Sim', { updatedAt: 21 });
    progressStore.set(3, 'Sim', { updatedAt: 22 });
    progressStore.restoreIds(before);

    expect(progressStore.get(1)).toBe('Sim');
    expect(progressStore.get(2)).toBe('Pulei');
    expect(progressStore.get(3)).toBe('Sim');
    expect(progressStore.record(1)?.updatedAt).toBe(10);
    expect(progressStore.record(2)?.updatedAt).toBe(11);
  });

});
