import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { spoilerIsVisible, spoilerParts, type SpoilerTextValue } from '../spoilers/model';
import { spoilerPreferences } from '../spoilers/preferences';

export function useSpoilerLevel() {
  const [level, setLevel] = useState(spoilerPreferences.get);
  useEffect(() => spoilerPreferences.subscribe(() => setLevel(spoilerPreferences.get())), []);
  return level;
}

export function SpoilerText({
  text,
  inline = true
}: {
  text: SpoilerTextValue | unknown;
  inline?: boolean;
}) {
  const level = useSpoilerLevel();
  const context = JSON.stringify([text, level]);
  const [revelation, setRevelation] = useState<{ context: string; indexes: Set<number> }>(() => ({
    context,
    indexes: new Set()
  }));
  useLayoutEffect(() => {
    setRevelation({ context, indexes: new Set() });
  }, [context]);
  const revealed = revelation.context === context ? revelation.indexes : new Set<number>();
  const reveal = (index: number) =>
    setRevelation((current) => ({
      context,
      indexes: new Set([...(current.context === context ? current.indexes : []), index])
    }));
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag>
      {spoilerParts(text).map((part, index) => {
        if (!part.spoiler || revealed.has(index) || spoilerIsVisible(part.spoiler, level)) {
          return <span key={index}>{part.text}</span>;
        }
        return (
          <span
            class={`spoiler spoiler-${part.spoiler}`}
            data-spoiler-level={part.spoiler}
            role="button"
            tabIndex={0}
            aria-label={`Revelar spoiler ${part.spoiler}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              reveal(index);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                reveal(index);
              }
            }}
            key={index}
          >
            <span aria-hidden="true">{part.text}</span>
          </span>
        );
      })}
    </Tag>
  );
}

export function SpoilerLevelControl({ id = 'spoiler-level' }: { id?: string } = {}) {
  const level = useSpoilerLevel();
  return (
    <label class="spoiler-level-control" for={id}>
      <span>Nível de spoilers</span>
      <select
        aria-label="Nível de spoilers"
        id={id}
        value={level}
        onChange={(event) =>
          spoilerPreferences.set(event.currentTarget.value as 'nenhum' | 'leve' | 'tudo')
        }
      >
        <option value="nenhum">Nenhum</option>
        <option value="leve">Leve</option>
        <option value="tudo">Tudo</option>
      </select>
    </label>
  );
}
