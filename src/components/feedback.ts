export function showToast(
  message: string,
  options: { undo?: () => void | Promise<void>; duration?: number } = {}
) {
  const region = document.querySelector<HTMLElement>('#toasts');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  const copy = document.createElement('span');
  copy.textContent = message;
  toast.appendChild(copy);
  if (typeof options.undo === 'function') {
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = 'Desfazer';
    undo.addEventListener('click', async () => {
      undo.disabled = true;
      try {
        await options.undo?.();
      } finally {
        toast.remove();
      }
    });
    toast.appendChild(undo);
  }
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), Number(options.duration) || 5000);
}
