export const SPOILER_LEVELS = new Set(['leve', 'forte']);

export function isAnnotatedText(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      ((typeof value.text === 'string' && SPOILER_LEVELS.has(value.spoiler)) || Array.isArray(value.parts))
  );
}

export function plainText(value) {
  if (typeof value === 'string' || value == null) return String(value ?? '');
  if (typeof value !== 'object') return String(value);
  if (typeof value.text === 'string') return value.text;
  if (Array.isArray(value.parts)) return value.parts.map(part => plainText(part)).join('');
  return String(value);
}

export const strongField = value =>
  isAnnotatedText(value) ? value : { text: String(value ?? ''), spoiler: 'forte' };
