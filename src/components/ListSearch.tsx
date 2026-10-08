/** Shared searchable-list field. The native search input also exposes browser clear behavior. */
export function ListSearch({
  label,
  placeholder,
  value,
  onChange,
  id
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
  id?: string;
}) {
  return (
    <input
      id={id}
      class="s ui-search"
      type="search"
      data-shortcut-search
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onInput={event => onChange(event.currentTarget.value)}
    />
  );
}
