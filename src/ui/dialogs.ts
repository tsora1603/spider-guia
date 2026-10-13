import { appState } from '../state/app-state';
let confirmResolver: ((value: boolean) => void) | null = null;
let confirmOrigin: HTMLElement | null = null;

export const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector);

export function confirmAction({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar'
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const dialog = $('#confirmdlg') as HTMLDialogElement | null;
  if (!dialog) return Promise.resolve(false);
  if (confirmResolver) confirmResolver(false);
  confirmOrigin = document.activeElement as HTMLElement | null;
  const titleNode = $('#confirm-title');
  const copyNode = $('#confirm-copy');
  const ok = $('#confirmok') as HTMLButtonElement | null;
  const cancel = $('#confirmcancel') as HTMLButtonElement | null;
  if (titleNode) titleNode.textContent = title;
  if (copyNode) copyNode.textContent = message;
  if (ok) ok.textContent = confirmLabel;
  if (cancel) cancel.textContent = cancelLabel;
  return new Promise<boolean>((resolve) => {
    confirmResolver = resolve;
    dialog.showModal();
    cancel?.focus();
  });
}

function closeOnBackdrop(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  dialog.addEventListener('pointerdown', (event) => {
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
}

export function initializeDialogs(onSkip: (id: number) => Promise<void>) {
  const confirmDialog = $('#confirmdlg') as HTMLDialogElement | null;
  ($('#confirmcancel') as HTMLButtonElement | null)?.addEventListener('click', () =>
    confirmDialog?.close()
  );
  ($('#confirmok') as HTMLButtonElement | null)?.addEventListener('click', () => {
    const resolve = confirmResolver;
    confirmResolver = null;
    confirmDialog?.close();
    resolve?.(true);
  });
  if (confirmDialog)
    confirmDialog.onclose = () => {
      if (confirmResolver) {
        const resolve = confirmResolver;
        confirmResolver = null;
        resolve(false);
      }
      confirmOrigin?.focus?.();
      confirmOrigin = null;
    };

  const skipDialog = $('#skipdlg') as HTMLDialogElement | null;
  ($('#skipback') as HTMLButtonElement | null)?.addEventListener('click', () =>
    skipDialog?.close()
  );
  ($('#skipgo') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    const id = appState.skipPending;
    const origin = appState.skipOrigin;
    appState.skipCommitted = true;
    skipDialog?.close();
    if (id != null) await onSkip(id);
    origin?.focus();
  });
  if (skipDialog)
    skipDialog.onclose = () => {
      if (!appState.skipCommitted) appState.skipOrigin?.focus();
      appState.skipPending = null;
      appState.skipOrigin = null;
      appState.skipCommitted = false;
    };

  [$('#xd'), skipDialog, confirmDialog].forEach((dialog) =>
    closeOnBackdrop(dialog as HTMLDialogElement | null)
  );
}
