import { appState } from '../state/app-state';
import { resetPhase } from '../reset/reset-guard';
import { supabaseClient } from './auth-session';
import { loginWithPassword, passwordAuthError } from './password-auth';
import { $ } from '../ui/dialogs';
export function initializeAuthDialog() {
  const loginDialog = $('#dlg') as HTMLDialogElement | null;
  const loginForm = $('#login-form') as HTMLFormElement | null;
  const loginEmail = $('#em') as HTMLInputElement | null;
  const loginPassword = $('#login-password') as HTMLInputElement | null;
  const loginSubmit = $('#go') as HTMLButtonElement | null;
  const loginShowPassword = $('#login-show-password') as HTMLButtonElement | null;
  const loginMessage = $('#msg') as HTMLElement | null;
  let loginPending = false;
  const clearLogin = () => {
    loginForm?.reset();
    if (loginPassword) loginPassword.type = 'password';
    if (loginShowPassword) {
      loginShowPassword.textContent = 'Mostrar';
      loginShowPassword.setAttribute('aria-pressed', 'false');
    }
    if (loginMessage) loginMessage.textContent = '';
  };
  loginDialog?.addEventListener('close', clearLogin);
  loginDialog?.addEventListener('cancel', (event) => {
    if (loginPending) event.preventDefault();
  });
  loginDialog?.addEventListener('pointerdown', (event) => {
    if (loginPending || !loginDialog) return;
    const rect = loginDialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      loginDialog.close();
  });
  ($('#cl') as HTMLButtonElement | null)?.addEventListener('click', () => {
    if (!loginPending) loginDialog?.close();
  });
  loginShowPassword?.addEventListener('click', () => {
    if (!loginPassword) return;
    const isVisible = loginPassword.type === 'password';
    loginPassword.type = isVisible ? 'text' : 'password';
    loginShowPassword.textContent = isVisible ? 'Ocultar' : 'Mostrar';
    loginShowPassword.setAttribute('aria-pressed', String(isVisible));
    loginPassword.focus();
  });
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loginPending || !loginForm.reportValidity()) return;
    if (!navigator.onLine || !supabaseClient) {
      if (loginMessage)
        loginMessage.textContent =
          'Sem conexão com o Supabase. Você pode continuar lendo neste dispositivo.';
      return;
    }
    const email = loginEmail?.value.trim() || '';
    const password = loginPassword?.value || '';
    if (!email || !password) return;
    loginPending = true;
    loginForm.setAttribute('aria-busy', 'true');
    if (loginSubmit) {
      loginSubmit.disabled = true;
      loginSubmit.textContent = 'Entrando…';
    }
    if (loginShowPassword) loginShowPassword.disabled = true;
    const cancelButton = $('#cl') as HTMLButtonElement | null;
    if (cancelButton) cancelButton.disabled = true;
    if (loginMessage) loginMessage.textContent = '';
    try {
      const result = await loginWithPassword(supabaseClient, email, password);
      if (result.error) {
        if (loginMessage) loginMessage.textContent = passwordAuthError(result.error);
        if (loginPassword) {
          loginPassword.value = '';
          loginPassword.focus();
        }
      } else if (result.data?.session) {
        loginDialog?.close();
      } else if (loginMessage) {
        loginMessage.textContent = 'Não foi possível confirmar a sessão. Tente novamente.';
      }
    } catch {
      if (loginMessage) loginMessage.textContent = 'Falha de conexão. Tente novamente.';
      if (loginPassword) loginPassword.value = '';
    } finally {
      loginPending = false;
      loginForm.removeAttribute('aria-busy');
      if (loginSubmit) {
        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Entrar';
      }
      if (loginShowPassword) loginShowPassword.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  });
}

export function toggleAuth() {
  if (resetPhase() === 'preparing' || !supabaseClient) return;
  if (appState.currentUser)
    void supabaseClient.auth.signOut(resetPhase() ? { scope: 'local' } : undefined);
  else {
    const dialog = $('#dlg') as HTMLDialogElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
      ($('#em') as HTMLInputElement | null)?.focus();
    }
  }
}
