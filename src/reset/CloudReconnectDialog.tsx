import { useEffect, useRef, useState } from 'preact/hooks';
import { appState } from '../state/app-state';
import { useUiRevision } from '../ui/hooks';
import { cloudDecision, isSyncBlocked, resetPhase, remoteResetIsPending } from './reset-guard';
import { confirmCloudRestore, confirmStartOnEmptyCloud, confirmLocalOnly, inspectCloudAfterReset } from '../runtime/controller';
import type { CloudPreview } from './cloud-reconnect';
import { getKnownGeneration } from '../sync/server-generation';

/** Somente uma escolha explícita pode liberar o fluxo normal de sincronização. */
export function CloudReconnectDialog() {
  useUiRevision('session');
  useUiRevision('sync');
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const querySequence = useRef(0);
  const [preview, setPreview] = useState<CloudPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const userId = appState.currentUser?.id || '';
  const decision = cloudDecision();
  const blocked = isSyncBlocked();
  let staleGeneration = false;
  try {
    const known = userId ? getKnownGeneration(userId) : null;
    staleGeneration = Boolean(preview?.protocolGeneration && ((known !== null && known !== preview.protocolGeneration) || (preview.protocolGeneration > 1 && preview.localCount > 0)));
  } catch { staleGeneration = true; }

  const inspect = async () => {
    const sequence = ++querySequence.current;
    const user = appState.currentUser?.id;
    setPreview(null);
    setError('');
    setLoading(true);
    try {
      const result = await inspectCloudAfterReset();
      if (sequence === querySequence.current && user === appState.currentUser?.id) setPreview(result);
    } catch (cause) {
      if (sequence === querySequence.current) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a nuvem.');
    } finally {
      if (sequence === querySequence.current) setLoading(false);
    }
  };
  const open = () => {
    if (remoteResetIsPending() || !appState.currentUser || resetPhase() !== 'completed' || cloudDecision() === 'restored' || !isSyncBlocked()) return;
    if (!dialog.current?.open) {
      origin.current = document.activeElement as HTMLElement | null;
      dialog.current?.showModal();
    }
    void inspect();
  };
  const close = () => { if (!busy) dialog.current?.close(); };

  useEffect(() => {
    const request = () => open();
    addEventListener('spider:cloud-review', request);
    return () => removeEventListener('spider:cloud-review', request);
  });
  useEffect(() => {
    if (remoteResetIsPending() || !userId || resetPhase() !== 'completed' || cloudDecision() === 'restored') {
      ++querySequence.current;
      dialog.current?.close();
      return;
    }
    if (cloudDecision() === 'pending') open();
    // Ao escolher "Continuar", não incomodar novamente; usuário reabre manualmente.
  }, [userId, decision, blocked]);

  const localOnly = () => {
    try {
      confirmLocalOnly();
      ++querySequence.current;
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar sua decisão.');
    }
  };
  const startEmpty = async () => {
    if (!preview || preview.count !== 0 || !preview.protocolGeneration || busy) return;
    setBusy(true); setError('');
    try {
      await confirmStartOnEmptyCloud(preview);
      ++querySequence.current;
      dialog.current?.close();
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'A autorização falhou; a sincronização permanece bloqueada.');
    } finally { setBusy(false); }
  };
  const restore = async () => {
    if (!preview?.count || loading || busy) return;
    setBusy(true);
    setError('');
    try {
      await confirmCloudRestore(preview);
      ++querySequence.current;
      dialog.current?.close();
    } catch (cause) {
      setPreview(null); // nova consulta obrigatória: não aceitar preview desatualizado.
      setError(cause instanceof Error ? cause.message : 'A restauração falhou. A sincronização permanece protegida.');
    } finally {
      setBusy(false);
    }
  };

  return <dialog id="cloud-reconnect-dialog" ref={dialog} class="device-reset-dialog cloud-reconnect-dialog"
    aria-labelledby="cloud-reconnect-title" aria-describedby="cloud-reconnect-description"
    onCancel={event => { if (busy) event.preventDefault(); }}
    onClose={() => { ++querySequence.current; origin.current?.focus(); origin.current = null; }}>
    <h2 id="cloud-reconnect-title">{loading ? 'Verificando progresso salvo na nuvem…' : preview?.count === 0 ? 'Nenhum progresso salvo na nuvem' : preview?.count ? 'Encontramos progresso salvo na nuvem.' : 'Decidir sobre o progresso na nuvem'}</h2>
    <p id="cloud-reconnect-description">Após o reset deste dispositivo, nenhuma leitura será baixada ou enviada sem sua autorização. Seus dados remotos não foram excluídos.</p>
    {loading ? <p role="status">Consultando o progresso remoto, somente leitura…</p> : null}
    {preview && preview.count > 0 ? <>
      <p role="status">{preview.count} {preview.count === 1 ? 'registro encontrado' : 'registros encontrados'} na nuvem. {preview.localCount} {preview.localCount === 1 ? 'registro local' : 'registros locais'} neste dispositivo.</p>
      <p class="sm mu">A restauração combina registros por data de atualização. O mais recente prevalece; em empate divergente, o registro local é preservado. {preview.collisions ? `${preview.collisions} registros existem nos dois lugares e podem mudar conforme esse critério.` : 'Não há registros compartilhados para comparar.'} Depois da confirmação, alterações locais mais recentes também poderão ser sincronizadas com a nuvem.</p>
    </> : null}
    {preview?.count === 0 ? <p role="status">Nenhuma leitura remota foi encontrada. O dispositivo continuará protegido; não será enviado progresso local sem uma autorização de sincronização adequada.</p> : null}
    {staleGeneration ? <p class="reset-warning" role="alert">Este aparelho ainda contém dados vinculados a uma geração excluída. Exporte backup e faça reset somente deste dispositivo antes de começar uma nova sincronização.</p> : null}
    {error ? <p role="alert" class="reset-error">{error}</p> : null}
    <div class="dialog-actions reset-actions cloud-reconnect-actions">
      <button type="button" class="btn g" disabled={busy} onClick={close}>Decidir depois</button>
      <button type="button" class="btn g" disabled={busy} onClick={localOnly}>Continuar sem sincronizar</button>
      {error && !loading ? <button type="button" class="btn g" disabled={busy} onClick={() => void inspect()}>Tentar novamente</button> : null}
      {preview?.count === 0 && preview.protocolGeneration && !staleGeneration ? <button type="button" class="btn" disabled={busy || loading} onClick={() => void startEmpty()}>Iniciar nova sincronização com nuvem vazia</button> : null}
      {preview && preview.count > 0 ? <button type="button" class="btn" disabled={loading || busy} aria-busy={busy} onClick={() => void restore()}>{busy ? 'Restaurando…' : 'Restaurar progresso da nuvem'}</button> : null}
    </div>
  </dialog>;
}
