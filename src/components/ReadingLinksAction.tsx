import { editorialExtras, itemsById } from '../data/model';
import { editorialLinks, router } from '../runtime/controller';
import { createLinkAssociations, linkTargetsFor } from '../links/associations';
import { rememberReadingReturn } from '../links/return-context';
import { contextualLinksTarget, exploreTarget, extraAnchorKey } from '../views/explore-navigation';
import { Icon } from './Icon';

// Índice construído uma vez sobre IDs explícitos; sem matching por títulos ou LGY.
const associations = createLinkAssociations(
  editorialLinks,
  new Set(Object.keys(itemsById).map(Number)),
  new Set(editorialExtras.map((extra: { n: number }) => extra.n))
);

export function hasReadingLinks(kind: 'item' | 'extra', id: number): boolean {
  return linkTargetsFor(associations, kind, id).length > 0;
}

export function ReadingLinksAction({ kind, id }: { kind: 'item' | 'extra'; id: number }) {
  const linkIds = linkTargetsFor(associations, kind, id);
  if (!linkIds.length) return null;
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
    <div class="reading-links-action">
      <button
        type="button"
        class="btn g reading-links-cta"
        onClick={(event) => {
          rememberReadingReturn(kind, id);
          router.navigate(contextualLinksTarget(linkIds, source), event.currentTarget);
        }}
      >
        <Icon name="link" size={18} />
        Ver links desta leitura
        <Icon name="arrowRight" size={18} />
      </button>
    </div>
  );
}
