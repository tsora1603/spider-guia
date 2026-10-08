import { useRef, useState } from 'preact/hooks';
import { exportProgress, resetLocalDevice, resetCloudAndDevice, remoteResetAvailable,
  finishInterruptedCloudReset, getInterruptedCloudReset, router } from '../runtime/controller';
import { isSyncBlocked, resetPhase } from './reset-guard';
import { useUiRevision } from '../ui/hooks';

type Mode = 'device' | 'all';
/** As opções remotas só ficam ativas após validação administrativa real do SQL/RLS. */
export function DeviceResetCard() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const originRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('device');
  const [typed, setTyped] = useState('');
  useUiRevision('session');
  useUiRevision('sync');
  const completed = resetPhase() === 'completed';
  const guarded = isSyncBlocked();
  const remoteReady = remoteResetAvailable();
  let interrupted: ReturnType<typeof getInterruptedCloudReset> | { phase: 'invalid' } = null;
  try { interrupted = getInterruptedCloudReset(); } catch { interrupted = { phase: 'invalid' }; }

  const open = () => {
    setError(''); setMode('device'); setTyped('');
    dialogRef.current?.showModal();
  };
  const close = () => { if (!busy) dialogRef.current?.close(); };
  const runReset = async () => {
    if (busy || (mode === 'all' && (!remoteReady || typed !== 'APAGAR'))) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'all') await resetCloudAndDevice(typed);
      else await resetLocalDevice();
      dialogRef.current?.close();
      router.navigate('#hoje');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o reset. Verifique o estado dos seus dados antes de tentar novamente.');
    } finally { setBusy(false); }
  };
  const finish = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await finishInterruptedCloudReset(); router.navigate('#hoje'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível recuperar o reset remoto.'); }
    finally { setBusy(false); }
  };

  return <section class="card account-reset-card" aria-labelledby="reset-section-title">
    <div class="lbl">Gerenciamento de dados</div>
    <h3 id="reset-section-title">Resetar todos os dados</h3>
    <p class="sm mu">Apague o progresso e as configurações deste aparelho. A exclusão da nuvem só estará disponível após validação da segurança do Supabase.</p>
    {guarded ? <p class="sm reset-blocked" role="status">Sincronização com a nuvem bloqueada neste dispositivo{completed ? ' após o reset' : ' por segurança'}. Nenhum progresso remoto será recuperado automaticamente.</p> : null}
    {interrupted ? <div class="reset-warning" role="alert">
      <b>{interrupted.phase === 'confirmed' ? 'A exclusão remota foi confirmada, mas o reset local está pendente.' : 'Há uma operação remota sem conclusão verificada.'}</b>
      <p class="sm">Não sincronize nem inicie outro reset. Use a recuperação da operação original; a nuvem não será apagada novamente com outra requisição.</p>
      {error ? <p class="reset-error">{error}</p> : null}
      {interrupted.phase !== 'invalid' ? <button type="button" class="btn g" disabled={busy} onClick={() => void finish()}>{busy ? 'Verificando…' : 'Retomar reset interrompido'}</button> : null}
    </div> : null}
    <button type="button" ref={originRef} class="btn g reset-trigger" disabled={busy || Boolean(interrupted)} onClick={open}>Resetar todos os dados</button>
    <dialog ref={dialogRef} class="device-reset-dialog" aria-labelledby="device-reset-title" aria-describedby="device-reset-description" onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => originRef.current?.focus()}>
      <h2 id="device-reset-title">Resetar dados deste dispositivo?</h2>
      <p id="device-reset-description">Escolha o alcance da exclusão. O reset local apaga progresso, histórico, metas, preferências, spoilers, aparência, configuração guiada e fila de sincronização deste navegador. A conta Supabase nunca é excluída. Se escolher somente este dispositivo, os dados já salvos no Supabase não serão excluídos.</p>
      <fieldset class="reset-modes" disabled={busy}>
        <legend>O que você deseja apagar?</legend>
        <label><input type="radio" name="spider-reset-mode" checked={mode === 'device'} onChange={() => { setMode('device'); setTyped(''); }} /> Resetar somente este dispositivo <small>(padrão; preserva a nuvem)</small></label>
        <label><input type="radio" name="spider-reset-mode" checked={mode === 'all'} disabled={!remoteReady} onChange={() => setMode('all')} /> Resetar dispositivo e nuvem</label>
        {!remoteReady ? <p class="sm mu" role="status">Exclusão remota indisponível: requer login, conexão e migração SQL/RLS aplicada e validada no Supabase.</p> : null}
      </fieldset>
      {mode === 'all' ? <>
        <p class="reset-warning"><b>Exclusão irreversível:</b> o progresso desta conta no Supabase também será apagado de todos os dispositivos sincronizados. Outros dispositivos ficarão bloqueados até nova autorização. Faça um backup antes.</p>
        <label class="reset-type-confirm" for="reset-typed-confirm">Para confirmar, digite <b>APAGAR</b>:</label>
        <input id="reset-typed-confirm" type="text" autoComplete="off" spellcheck={false} value={typed} disabled={busy} onInput={event => setTyped(event.currentTarget.value)} aria-required="true" />
      </> : <p class="reset-warning"><b>Atenção:</b> sem backup, o progresso presente somente neste dispositivo não poderá ser recuperado. A nuvem será preservada.</p>}
      <p class="sm mu">O arquivo JSON exporta progresso e histórico, não aparência ou metas. Confira se o arquivo foi salvo. Feche outras abas do guia antes de continuar.</p>
      {error ? <p class="reset-error" role="alert">{error}</p> : null}
      <div class="reset-backup-row"><button type="button" class="btn g" disabled={busy} onClick={() => exportProgress()}>Exportar backup JSON</button></div>
      <div class="dialog-actions reset-actions">
        <button type="button" class="btn g" disabled={busy} onClick={close}>Cancelar</button>
        <button type="button" class="btn reset-danger" disabled={busy || (mode === 'all' && typed !== 'APAGAR')} aria-busy={busy} onClick={() => void runReset()}>{busy ? 'Resetando…' : mode === 'all' ? 'Apagar dispositivo e nuvem' : 'Resetar dispositivo'}</button>
      </div>
    </dialog>
  </section>;
}
