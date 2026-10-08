/** Login privado: contas são criadas pelo administrador no Supabase Auth.
 * Nunca persistir, registrar em log ou enviar senhas para o progresso/localStorage. */
export type AuthFailure = { message?: string; code?: string; status?: number } | null | undefined;

export function passwordAuthError(error: AuthFailure): string {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (code === 'invalid_credentials' || message.includes('invalid login credentials'))
    return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed'))
    return 'Esta conta ainda não foi confirmada. Peça ao administrador para confirmar o e-mail no Supabase.';
  if (error?.status === 429 || code.includes('over_request_rate_limit') || message.includes('rate limit') || message.includes('too many requests'))
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  if (code === 'same_password' || message.includes('different from the old password') || message.includes('same password'))
    return 'Escolha uma senha diferente da atual.';
  if (code === 'weak_password' || message.includes('password should be at least') || message.includes('password is too short'))
    return 'A senha não atende aos requisitos de segurança do Supabase.';
  if (message.includes('failed to fetch') || message.includes('network'))
    return 'Não foi possível conectar ao Supabase. Confira a conexão e tente novamente.';
  return 'Não foi possível concluir a operação. Tente novamente ou consulte o administrador.';
}

export type PasswordAuthClient = {
  auth: {
    signInWithPassword(credentials: {email: string; password: string}): Promise<{
      error: AuthFailure;
      data?: { session?: unknown; user?: {id?: string} | null };
    }>;
    updateUser(attributes: {password: string}): Promise<{ error: AuthFailure }>;
  };
};

export async function loginWithPassword(client: PasswordAuthClient, email: string, password: string) {
  return client.auth.signInWithPassword({ email: email.trim(), password });
}

/** Reautenticação antes da troca: não depende de e-mail de recuperação/SMTP. */
export async function changeAuthenticatedPassword(
  client: PasswordAuthClient, email: string, currentPassword: string,
  newPassword: string, expectedUserId: string
): Promise<AuthFailure> {
  const reauth = await loginWithPassword(client, email, currentPassword);
  if (reauth.error) return reauth.error;
  // Não trocar a senha de outra conta caso uma sessão inesperada tenha sido retornada.
  if (!reauth.data?.user?.id || reauth.data.user.id !== expectedUserId)
    return { message: 'Sessão diferente da conta atual', code: 'unexpected_user' };
  const updated = await client.auth.updateUser({ password: newPassword });
  return updated.error;
}
