import { useLayoutEffect, useRef } from 'preact/hooks';
import { appState } from '../state/app-state';
import { requestStatus } from '../runtime/controller';
import { bulkProgressUi } from '../progress/bulk-ui';
import { useUiRevision } from '../ui/hooks';

const isEditable = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
};

const visibleReadingRows = () => [...document.querySelectorAll<HTMLElement>('[data-keyboard-reading]')]
  .filter(element => element.offsetParent !== null);

function moveReadingFocus(direction: 1 | -1) {
  const rows = visibleReadingRows();
  if (!rows.length) return;
  const active = document.activeElement as HTMLElement | null;
  const current = active?.closest<HTMLElement>('[data-keyboard-reading]');
  const index = current ? rows.indexOf(current) : -1;
  const nextIndex = index < 0 ? (direction > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, index + direction));
  rows[nextIndex]?.focus();
}

export function KeyboardShortcuts() {
  useUiRevision('route');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const openDialog = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (openDialog) return;
      if ((event.key === '?' || (event.key === '/' && event.shiftKey)) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (!isEditable(event.target)) {
          event.preventDefault();
          dialogRef.current?.showModal();
        }
        return;
      }
      if (isEditable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-shortcut-search]');
        if (search) {
          event.preventDefault();
          search.focus();
          search.select?.();
        }
        return;
      }
      if (appState.activeTab !== 'Checklist') return;
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        bulkProgressUi.open({ origin: document.activeElement as HTMLElement | null });
        return;
      }
      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        const focusNext = document.querySelector<HTMLButtonElement>('[data-focus-nav=\"next\"]');
        if (focusNext && !focusNext.disabled) focusNext.click();
        else moveReadingFocus(1);
        return;
      }
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const focusPrevious = document.querySelector<HTMLButtonElement>('[data-focus-nav=\"previous\"]');
        if (focusPrevious && !focusPrevious.disabled) focusPrevious.click();
        else moveReadingFocus(-1);
        return;
      }
      if (event.key.toLowerCase() === 'm') {
        const row = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-keyboard-reading]');
        const id = Number(row?.dataset.readingId);
        if (Number.isInteger(id)) {
          event.preventDefault();
          requestStatus(id, 'Sim', row);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [appState.activeTab]);

  return (
    <dialog ref={dialogRef} class="shortcut-dialog" aria-labelledby="shortcut-title">
      <div class="bulk-dialog-head"><div><div class="lbl">Teclado</div><h2 id="shortcut-title">Atalhos</h2></div><button class="dialog-close" type="button" aria-label="Fechar atalhos" onClick={() => dialogRef.current?.close()}>×</button></div>
      <div class="shortcut-list">
        <div><kbd>?</kbd><span>Abrir esta ajuda</span></div>
        <div><kbd>/</kbd><span>Focar a busca da tela atual</span></div>
        <div><kbd>B</kbd><span>Abrir ações em lote na Checklist</span></div>
        <div><kbd>J</kbd><span>Próxima leitura visível na Checklist</span></div>
        <div><kbd>K</kbd><span>Leitura visível anterior</span></div>
        <div><kbd>M</kbd><span>Marcar/desmarcar a leitura com foco</span></div>
        <div><kbd>Esc</kbd><span>Fechar diálogos e menus</span></div>
      </div>
      <p class="mu sm">Atalhos de progresso não funcionam enquanto você digita em campos de texto.</p>
    </dialog>
  );
}
