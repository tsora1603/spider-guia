import { checklistReadings } from '../data/model';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { appState } from '../state/app-state';
import { exportProgress, handleProgressImport, homeSyncCopy, supabaseClient, toggleAuth } from '../runtime/controller';
import { useUiRevision } from '../ui/hooks';
import { SpoilerLevelControl } from '../components/SpoilerText';
import { useReadingPreferences } from '../preferences/hooks';
import { readingPreferences, type ReadingDepth } from '../preferences/reading-preferences';
import { DesignPreferencesCard } from '../design/DesignPreferencesCard';
import { DeviceResetCard } from '../reset/DeviceResetCard';
import { isSyncBlocked, resetPhase, cloudDecision, mayUseCloud } from '../reset/reset-guard';
import { changeAuthenticatedPassword, passwordAuthError } from '../auth/password-auth';

function ReadingPreferencesCard() {
  const preferences = useReadingPreferences();
  const [depth, setDepth] = useState<ReadingDepth>(preferences.depth);
  const [focusQuery, setFocusQuery] = useState(preferences.focusQuery);

  useEffect(() => {
    setDepth(preferences.depth);
    setFocusQuery(preferences.focusQuery);
  }, [preferences.depth, preferences.focusQuery]);

  const dirty = depth !== preferences.depth || focusQuery.trim() !== preferences.focusQuery;
  const validPlan = depth !== 'focus' || focusQuery.trim().length >= 2;
  const savePlan = () => readingPreferences.set({ depth, focusQuery: focusQuery.trim() });
  return <section class="card account-preferences-card">
    <div class="lbl">Preferências de leitura</div>
    <h3>Escolha a profundidade</h3>
    <fieldset class="account-choice-group">
      <legend>Profundidade</legend>
      <label><input type="radio" name="account-reading-depth" checked={depth === 'complete'} onChange={() => setDepth('complete')} /> <span><b>Completo</b><small>Todas as {checklistReadings.length.toLocaleString('pt-BR')} leituras da sequência atual.</small></span></label>
      <label><input type="radio" name="account-reading-depth" checked={depth === 'essential'} onChange={() => setDepth('essential')} /> <span><b>Essenciais</b><small>Só o núcleo classificado como essencial.</small></span></label>
      <label><input type="radio" name="account-reading-depth" checked={depth === 'focus'} onChange={() => setDepth('focus')} /> <span><b>Arco ou filme</b><small>Plano enxuto para um foco específico.</small></span></label>
    </fieldset>
    {depth === 'focus' ? <label class="account-focus-field" for="account-focus"><span>Foco do plano</span><input id="account-focus" type="search" value={focusQuery} onInput={event => setFocusQuery(event.currentTarget.value)} placeholder="Ex.: Venom, Kraven, Saga do Clone" /><small class="mu">A busca usa apenas os termos presentes no catálogo, fases, marcos e Extras.</small></label> : null}
    <button class="btn g account-save-preferences" type="button" disabled={!dirty || !validPlan} onClick={savePlan}>{dirty ? 'Salvar plano' : 'Plano salvo'}</button>
    {dirty ? <p class="sm mu settings-field-hint" role="status">As mudanças no plano só serão aplicadas após salvar.</p> : null}
  </section>;
}

/** Status is descriptive only: reconnect permissions continue to be checked by the reset guard. */
function ChangePasswordForm({ userId, email }: { userId: string; email: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const save = async (event: Event) => {
    event.preventDefault();
    if (pending) return;
    setSuccess(false);
    if (next.length < 8) { setMessage('Use pelo menos 8 caracteres na nova senha.'); return; }
    if (next !== confirm) { setMessage('A confirmação não corresponde à nova senha.'); return; }
    if (next === current) { setMessage('A nova senha deve ser diferente da atual.'); return; }
    if (!navigator.onLine || !supabaseClient) { setMessage('Conecte-se à internet para alterar sua senha.'); return; }
    setPending(true);
    setMessage('');
    try {
      const error = await changeAuthenticatedPassword(supabaseClient, email, current, next, userId);
      if (error) setMessage(passwordAuthError(error));
      else { setCurrent(''); setNext(''); setConfirm(''); setSuccess(true); setMessage('Senha alterada. Utilize a nova senha no próximo acesso.'); }
    } catch { setMessage('Não foi possível alterar a senha. Verifique sua conexão e tente novamente.'); }
    finally { setPending(false); }
  };
  return <div class="account-password-panel">
    <h3>Alterar minha senha</h3>
    <p class="sm mu">Você pode trocar sua senha sem e-mail de recuperação. Informe a senha atual para confirmar sua identidade.</p>
    <form class="account-password-form" onSubmit={save} aria-busy={pending}>
      <label for="account-current-password">Senha atual
        <input id="account-current-password" type="password" autocomplete="current-password" value={current} required disabled={pending} onInput={event => setCurrent(event.currentTarget.value)} />
      </label>
      <label for="account-new-password">Nova senha
        <input id="account-new-password" type="password" autocomplete="new-password" minLength={8} value={next} required disabled={pending} onInput={event => setNext(event.currentTarget.value)} />
      </label>
      <label for="account-confirm-password">Confirmar nova senha
        <input id="account-confirm-password" type="password" autocomplete="new-password" minLength={8} value={confirm} required disabled={pending} onInput={event => setConfirm(event.currentTarget.value)} />
      </label>
      <button class="btn g" type="submit" disabled={pending || !current || !next || !confirm}>{pending ? 'Alterando…' : 'Alterar senha'}</button>
      {message ? <p class="sm auth-message" role={success ? 'status' : 'alert'}>{message}</p> : null}
    </form>
  </div>;
}

function AccountSyncCard() {
  useUiRevision('session');
  useUiRevision('sync');
  const blocked = isSyncBlocked() || Boolean(appState.currentUser && !mayUseCloud(appState.currentUser.id));
  const offline = !navigator.onLine;
  const configured = Boolean(supabaseClient);
  const status = blocked ? 'blocked' : !configured ? 'local' : offline ? 'offline' : !appState.currentUser ? 'local' : appState.syncState === 'error' ? 'error' : appState.syncState === 'syncing' ? 'syncing' : 'saved';
  const statusLabel: Record<string, string> = {
    blocked: 'Sincronização bloqueada', local: 'Somente neste aparelho', offline: 'Sem conexão',
    error: 'Aguardando nova tentativa', syncing: 'Sincronizando', saved: 'Sincronização ativa'
  };
  return <section class="card account-sync-card">
    <div class="settings-sync-heading"><h3>Seu progresso entre aparelhos</h3><span class="settings-sync-indicator" data-state={status} role="status">{statusLabel[status]}</span></div>
    <p class="sm mu">{configured || isSyncBlocked() ? homeSyncCopy() : 'A sincronização via Supabase não está configurada neste deploy. Seu progresso continua salvo neste aparelho.'}</p>
    {resetPhase() !== 'preparing' && configured ? <button class="btn g" type="button" onClick={toggleAuth}>{appState.currentUser ? 'Sair da conta' : 'Entrar para sincronizar'}</button> : null}
    {resetPhase() === 'completed' && isSyncBlocked() && appState.currentUser && cloudDecision() !== 'restored' ? <button class="btn g settings-recovery-action" type="button" onClick={() => dispatchEvent(new Event('spider:cloud-review'))}>Decidir sobre o progresso na nuvem</button> : null}
    {appState.currentUser?.email ? <p class="sm mu account-email">Conectado como {appState.currentUser.email}</p> : null}
    {appState.currentUser?.id && appState.currentUser?.email && configured ? <ChangePasswordForm key={appState.currentUser.id} userId={appState.currentUser.id} email={appState.currentUser.email} /> : null}
  </section>;
}

function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  return <section class="card account-backup-card">
    <h3>Leve seu progresso com você</h3>
    <p class="sm mu">Exporte um JSON versionado ou importe um backup em outro navegador. A importação mantém as validações e confirmações de segurança existentes.</p>
    <p class="sm mu">O backup contém progresso e histórico de leitura; aparência e metas não são incluídas.</p>
    <div class="dialog-actions settings-backup-actions">
      <button class="btn g" type="button" onClick={exportProgress}>Exportar JSON</button>
      <button class="btn g" type="button" onClick={() => fileRef.current?.click()}>Importar JSON</button>
    </div>
    <input ref={fileRef} class="sr-only" type="file" accept="application/json,.json" aria-label="Selecionar arquivo JSON para importação" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void handleProgressImport(file); }} />
  </section>;
}

function SettingsBlock({ id, title, description, className = '', children }: {
  id: string; title: string; description: string; className?: string; children: ComponentChildren;
}) {
  return <section class={`settings-block ${className}`} aria-labelledby={id}>
    <div class="settings-block-heading"><h2 id={id}>{title}</h2><p class="sm mu">{description}</p></div>
    {children}
  </section>;
}

/** Each settings responsibility has one home; progress entry belongs on Hoje. */
export function MoreView() {
  return <div class="settings-layout">
    <SettingsBlock id="settings-plan" title="Plano de leitura" description="Defina quais edições entram na sua jornada." className="settings-wide"><ReadingPreferencesCard /></SettingsBlock>
    <SettingsBlock id="settings-spoilers" title="Spoilers" description="Escolha quanto do conteúdo editorial deseja revelar.">
      <section class="card settings-spoiler-card"><SpoilerLevelControl id="account-spoiler-level" /></section>
    </SettingsBlock>
    <SettingsBlock id="settings-appearance" title="Aparência" description="Ajuste tema, tipografia e leitura." className="settings-wide"><DesignPreferencesCard /></SettingsBlock>
    <SettingsBlock id="settings-onboarding" title="Configuração guiada" description="Revise suas escolhas iniciais sem precisar apagar o progresso." className="settings-onboarding-block">
      <section class="card settings-onboarding-card">
        <div><h3>Rever meu plano</h3><p class="sm mu">Reabra o assistente de configuração. Suas leituras já registradas serão preservadas.</p></div>
        <button class="btn settings-onboarding-action" type="button" onClick={() => readingPreferences.set({ onboardingComplete: false })}>Refazer configuração guiada</button>
      </section>
    </SettingsBlock>
    <SettingsBlock id="settings-account" title="Conta e sincronização" description="Consulte o estado da nuvem e gerencie sua sessão."><AccountSyncCard /></SettingsBlock>
    <SettingsBlock id="settings-backup" title="Backup" description="Guarde uma cópia antes de trocar de aparelho ou resetar."><BackupCard /></SettingsBlock>
    <SettingsBlock id="settings-data" title="Gerenciamento de dados" description="Ações destrutivas ficam separadas das preferências." className="settings-wide settings-danger-block"><DeviceResetCard /></SettingsBlock>
  </div>;
}
