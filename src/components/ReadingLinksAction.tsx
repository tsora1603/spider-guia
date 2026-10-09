import { cloneEntries, editorialExtras, readings } from '../data/model';
import { editorialLinks, linksEnabled, router } from '../runtime/controller';
import {
  createLinkAssociations,
  linkTargetsFor,
  linkTargetsForCloneArc,
  linkTargetsForItems
} from '../links/associations';
import { rememberReadingReturn } from '../links/return-context';
import { contextualLinksTarget, exploreTarget, extraAnchorKey } from '../views/explore-navigation';
import { Icon } from './Icon';

// Índice construído uma vez sobre IDs explícitos; sem matching por títulos ou LGY.
const associations = createLinkAssociations(
  editorialLinks,
  readings,
  editorialExtras,
  new Set(cloneEntries.map((entry: any) => entry.arcId))
);

export function hasReadingLinks(kind: 'item' | 'extra', id: number): boolean {
  return linkTargetsFor(associations, kind, id).length > 0;
}

export function ReadingLinksAction({
  kind,
  id,
  compact = false
}: {
  kind: 'item' | 'extra';
  id: number;
  compact?: boolean;
}) {
  if (!linksEnabled) return null;
  const linkIds = linkTargetsFor(associations, kind, id);
  if (!linkIds.length && !compact) return null;
  // O link de retorno também funciona após recarregar a página e no Modo Foco.
  const current = location.hash;
  const source =
    kind === 'extra'
      ? exploreTarget(
          'extras',
          'extra',
          extraAnchorKey(editorialExtras.find((extra: { n: number }) => extra.n === id)!)
        )
      : current.startsWith('#explorar/extras') || current.startsWith('#checklist?')
        ? current
        : `#checklist/hq/${id}`;
  return (
    <ReadingLinksButton
      linkIds={linkIds}
      source={source}
      kind={kind}
      id={id}
      compact={compact}
      label="Ver links desta leitura"
    />
  );
}

export function ReadingGroupLinksAction({ itemIds, label }: { itemIds: number[]; label: string }) {
  if (!linksEnabled) return null;
  const linkIds = linkTargetsForItems(associations, itemIds);
  const source = location.hash.startsWith('#checklist?')
    ? location.hash
    : `#checklist/hq/${itemIds[0]}`;
  return (
    <ReadingLinksButton
      linkIds={linkIds}
      source={source}
      kind="item"
      id={itemIds[0]}
      compact
      label={`Ver links de ${label}`}
    />
  );
}

export function CloneArcLinksAction({ arcId, label }: { arcId: string; label: string }) {
  if (!linksEnabled) return null;
  const explicit = linkTargetsForCloneArc(associations, arcId);
  if (!explicit.length) return null;
  return (
    <ReadingLinksButton
      linkIds={explicit}
      source="#explorar/clone"
      kind="item"
      id={0}
      compact
      remember={false}
      label={`Ver links de ${label}`}
    />
  );
}

function ReadingLinksButton({
  linkIds,
  source,
  kind,
  id,
  compact,
  label,
  remember = true
}: {
  linkIds: readonly string[];
  source: string;
  kind: 'item' | 'extra';
  id: number;
  compact: boolean;
  label: string;
  remember?: boolean;
}) {
  const available = linkIds.length > 0;
  return (
    <div class={`reading-links-action${compact ? ' is-compact' : ''}`}>
      <button
        type="button"
        class="btn reading-links-cta reading-links-green"
        disabled={!available}
        aria-label={available ? label : 'Link de leitura ainda não cadastrado'}
        title={available ? label : 'Nenhum link cadastrado para estas edições'}
        onClick={(event) => {
          if (remember) rememberReadingReturn(kind, id);
          router.navigate(contextualLinksTarget(linkIds, source), event.currentTarget);
        }}
      >
        <Icon name="link" size={18} />
        {available ? (compact ? 'Ler' : label) : 'Sem link'}
        {!compact && available ? <Icon name="arrowRight" size={18} /> : null}
      </button>
    </div>
  );
}
