import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabaseConfig } from '../../src/config/public';

afterEach(() => vi.unstubAllGlobals());
describe('Configuração pública do Supabase', () => {
  it('permite progresso local sem configuração ou DOM', () => {
    expect(supabaseConfig()).toBeNull();
    vi.stubGlobal('window', {});
    expect(supabaseConfig()).toBeNull();
  });
  it.each(['', 'COLE_A_URL', 'javascript:alert(1)', 'endereco-invalido'])(
    'ignora URL inválida %s',
    (url) => {
      vi.stubGlobal('window', { SUPABASE_URL: url, SUPABASE_ANON_KEY: 'public-key' });
      expect(supabaseConfig()).toBeNull();
    }
  );
  it('exige chave e normaliza espaços antes de criar o cliente', () => {
    vi.stubGlobal('window', {
      SUPABASE_URL: ' https://exemplo.supabase.co ',
      SUPABASE_ANON_KEY: ' '
    });
    expect(supabaseConfig()).toBeNull();
    window.SUPABASE_ANON_KEY = ' public-key ';
    expect(supabaseConfig()).toEqual({ url: 'https://exemplo.supabase.co', key: 'public-key' });
  });
});
