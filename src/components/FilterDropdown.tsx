import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { Icon } from './Icon';

type FilterOption<Value extends string> = readonly [value: Value, label: string];

/** Accessible, single-select filter menu shared by Checklist and Extras.
 * Buttons keep their native keyboard semantics; the popup is a group, not a fake <select>.
 */
export function FilterDropdown<Value extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: ReadonlyArray<FilterOption<Value>>;
  value: Value;
  onChange(next: Value): void;
}) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const selectedLabel = options.find(option => option[0] === value)?.[1] || options[0]?.[1] || '';

  const focusOption = (index: number) => {
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('.filter-option');
    if (!buttons?.length) return;
    buttons[(index + buttons.length) % buttons.length].focus();
  };

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const menuHeight = menu.offsetHeight;
      setAbove(window.innerHeight - trigger.bottom < menuHeight + 12 && trigger.top > window.innerHeight - trigger.bottom);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    // Tab uses the native focus order: only dismiss when focus truly leaves the popup.
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    reposition();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const openAt = (index: number) => {
    setOpen(true);
    requestAnimationFrame(() => focusOption(index));
  };

  return (
    <div class="extra-filter ui-toolbar">
      <span class="extra-filter-label">Mostrar</span>
      <div class={`filter-dropdown${open ? ' is-open' : ''}${above ? ' opens-above' : ''}`}>
        <button
          type="button"
          ref={triggerRef}
          class="filter-trigger"
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={popupId}
          aria-label={`${label}: ${selectedLabel}`}
          onClick={() => open ? close() : setOpen(true)}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              openAt(event.key === 'ArrowDown' ? Math.max(0, options.findIndex(option => option[0] === value)) : options.length - 1);
            }
          }}
        >
          <span>{selectedLabel}</span>
          <span class="filter-chevron" aria-hidden="true"><Icon name="chevD" /></span>
        </button>
        {open ? (
          <div ref={menuRef} class="filter-menu" role="group" id={popupId} aria-label={label}
            onKeyDown={event => {
              if (event.key === 'Tab') {
                const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('.filter-option') || []);
                const atBoundary = event.shiftKey ? document.activeElement === buttons[0] : document.activeElement === buttons[buttons.length - 1];
                if (atBoundary) {
                  event.preventDefault();
                  const next = !event.shiftKey && triggerRef.current
                    ? Array.from(document.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
                      .find(element => !menuRef.current?.contains(element) && element.getClientRects().length > 0 &&
                        Boolean(triggerRef.current!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING))
                    : null;
                  close();
                  (next || triggerRef.current)?.focus();
                }
                return;
              }
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('.filter-option') || []);
              const current = buttons.findIndex(button => button === document.activeElement);
              if (event.key === 'Home') focusOption(0);
              else if (event.key === 'End') focusOption(buttons.length - 1);
              else focusOption(current + (event.key === 'ArrowDown' ? 1 : -1));
            }}
          >
            {options.map(([optionValue, optionLabel]) => (
              <button
                key={optionValue}
                type="button"
                class="filter-option"
                aria-pressed={value === optionValue}
                onClick={() => { onChange(optionValue); close(true); }}
              >{optionLabel}{value === optionValue ? <Icon name="check" className="filter-option-check" /> : null}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
