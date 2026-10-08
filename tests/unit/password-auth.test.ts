import { describe, expect, it, vi } from 'vitest';
import { changeAuthenticatedPassword, loginWithPassword, passwordAuthError } from '../../src/auth/password-auth';

describe('autenticação privada por senha', () => {
  it('apresenta mensagens pt-BR sem expor erros internos', () => {
    expect(passwordAuthError({ code: 'invalid_credentials' })).toContain('incorretos');
    expect(passwordAuthError({ message: 'Email not confirmed' })).toContain('confirmada');
    expect(passwordAuthError({ status: 429 })).toContain('Muitas tentativas');
    expect(passwordAuthError({ message: 'internal exception with secrets' })).not.toContain('secrets');
  });
  it('faz login por senha sem solicitar OTP ou criar contas', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null, data: { session: { user: { id: 'me' } } } });
    const client = { auth: { signInWithPassword, updateUser: vi.fn() } };
    await loginWithPassword(client, ' amigo@example.com ', 'senha-de-teste');
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'amigo@example.com', password: 'senha-de-teste' });
  });
  it('não altera a senha quando a atual está errada', async () => {
    const updateUser = vi.fn();
    const client = { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: { code: 'invalid_credentials' } }), updateUser } };
    const error = await changeAuthenticatedPassword(client, 'me@example.com', 'errada', 'nova-senha-segura', 'me');
    expect(error?.code).toBe('invalid_credentials');
    expect(updateUser).not.toHaveBeenCalled();
  });
  it('impede trocar a senha se a reautenticação identificar outro usuário', async () => {
    const updateUser = vi.fn();
    const client = { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null, data: { user: { id: 'other' } } }), updateUser } };
    expect((await changeAuthenticatedPassword(client, 'me@example.com', 'atual', 'nova-senha-segura', 'me'))?.code).toBe('unexpected_user');
    expect(updateUser).not.toHaveBeenCalled();
  });
  it('altera a senha autenticada sem serviço SMTP', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null, data: { user: { id: 'me' } } }), updateUser } };
    expect(await changeAuthenticatedPassword(client, 'me@example.com', 'atual', 'nova-senha-segura', 'me')).toBeNull();
    expect(updateUser).toHaveBeenCalledWith({ password: 'nova-senha-segura' });
  });
});
