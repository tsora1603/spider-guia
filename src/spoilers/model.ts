export type SpoilerStrength = 'leve' | 'forte';
export type SpoilerVisibility = 'nenhum' | 'leve' | 'tudo';

export interface SpoilerPart {
  text: string;
  spoiler?: SpoilerStrength;
}

export type SpoilerTextValue =
  | string
  | { text: string; spoiler: SpoilerStrength }
  | { parts: SpoilerPart[] };

export const isSpoilerStrength = (value: unknown): value is SpoilerStrength =>
  value === 'leve' || value === 'forte';

export function spoilerParts(value: unknown): SpoilerPart[] {
  if (typeof value === 'string' || value == null) return [{ text: String(value ?? '') }];
  if (typeof value !== 'object') return [{ text: String(value) }];
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string' && isSpoilerStrength(record.spoiler)) {
    return [{ text: record.text, spoiler: record.spoiler }];
  }
  if (Array.isArray(record.parts)) {
    return record.parts
      .filter(part => part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string')
      .map(part => {
        const item = part as Record<string, unknown>;
        return {
          text: String(item.text),
          ...(isSpoilerStrength(item.spoiler) ? { spoiler: item.spoiler } : {})
        };
      });
  }
  return [{ text: String(value) }];
}

export const spoilerPlainText = (value: unknown) => spoilerParts(value).map(part => part.text).join('');

export const spoilerIsVisible = (strength: SpoilerStrength, visibility: SpoilerVisibility) =>
  visibility === 'tudo' || (visibility === 'leve' && strength === 'leve');
