import { useEffect, useMemo, useState } from 'preact/hooks';
import { editorialExtras, itemsById, normalizeText } from '../data/model';
import { editorialLinks, router } from '../runtime/controller';
import { Icon } from '../components/Icon';
import { SpoilerText } from '../components/SpoilerText';
import { ScreenState } from '../components/ScreenState';
import { ListSearch } from '../components/ListSearch';
import { exploreTarget, focusEditorialTarget, resolveLinkTargets } from './explore-navigation';
import { createEditorialLinkCards, destinationActionLabel } from './link-card-model';
import { formatCoverage, resolveExtraId } from '../../data/link-model.mjs';

export function getEditorialLinkGroups() {
  return createEditorialLinkCards(
    editorialLinks,
    editorialExtras,
    { formatCoverage, resolveExtraId },
    itemsById
  );
}

export function LinksView() {
  const hash = location.hash;
  const [query, setQuery] = useState(
    () => new URLSearchParams(hash.split('?')[1] || '').get('lq') || ''
  );
  useEffect(() => {
    setQuery(new URLSearchParams(hash.split('?')[1] || '').get('lq') || '');
  }, [hash]);
  const onLocalQueryChange = (value: string) => {
    const [path, raw = ''] = location.hash.split('?');
    const params = new URLSearchParams(raw);
    params.delete('link');
    params.delete('from');
    if (value.trim()) params.set('lq', value);
    else params.delete('lq');
    const qs = params.toString();
    history.replaceState(history.state, '', `${path}${qs ? `?${qs}` : ''}`);
    setQuery(value);
  };
  const all = useMemo(getEditorialLinkGroups, []);
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const targets = resolveLinkTargets(params.getAll('link'), all.map((group) => group.key));
  const targetKey = targets.join('|');
  const targeted = new Set(targets);
  const targetIndex = targets.length ? all.findIndex((group) => group.key === targets[0]) : -1;
  const from = params.get('from');
  const safeReturn = from && /^#(?:checklist(?:\/hq\/\d+)?|explorar\/extras)(?:\?|$)/.test(from) ? from : null;
  useEffect(() => {
    if (targetIndex < 0) return;
    setQuery('');
    const frame = requestAnimationFrame(() => focusEditorialTarget(`explore-link-${targetIndex}`));
    return () => cancelAnimationFrame(frame);
  }, [targetKey, targetIndex]);
  const needle = targets.length ? '' : normalizeText(query);
  const filtered = targets.length > 1
    ? all.filter((group) => targeted.has(group.key))
    : !needle ? all : all.filter((group) => group.searchText.includes(needle));

  return (
    <>
      <div class="links-toolbar ui-toolbar">
        <ListSearch
          label="Buscar links"
          placeholder="Buscar arco, série, edição ou destino"
          value={query}
          onChange={onLocalQueryChange}
        />
      </div>
      {targets.length ? (
        <div class="links-context-toolbar">
          {safeReturn ? <button type="button" class="btn g links-back-reading" onClick={(event) => router.navigate(safeReturn, event.currentTarget)}><Icon name="arrowLeft" size={18} /> Voltar à leitura</button> : null}
          {targets.length > 1 ? <><span class="sm mu">Links associados a esta leitura</span><button type="button" class="btn g" onClick={(event) => router.navigate('#explorar/links', event.currentTarget)}>Ver todos os links</button></> : null}
        </div>
      ) : null}
      {filtered.length ? (
        <div class="content-list ui-list links-list" aria-label="Links editoriais">
          {filtered.map((group) => (
            <article
              class={`ui-list-item link-row link-card editorial-anchor${targeted.has(group.key) ? ' is-targeted' : ''}`}
              key={group.key}
              id={`explore-link-${all.indexOf(group)}`}
              data-explore-target={targeted.has(group.key) ? 'link' : undefined}
              tabIndex={-1}
              aria-label={group.name}
            >
              <h3 class="link-card-title">
                <SpoilerText text={group.name} />
              </h3>
              {group.coverageLabel ? <p class="link-coverage">{group.coverageLabel}</p> : null}
              <div class="link-destinations">
                {group.destinations.map((destination, index) => (
                  <div class="link-destination" key={`${destination.url}-${index}`}>
                    {destination.coverageLabel ? (
                      <p class="link-coverage">{destination.coverageLabel}</p>
                    ) : null}
                    <div class="link-actions">
                      <a
                        class="lk link-external"
                        href={destination.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon name="externalLink" size={18} />
                        <span>{destinationActionLabel(destination.label)}</span>
                        <span class="sr-only"> (abre em nova aba)</span>
                      </a>
                      {destination.extraTarget ? (
                        <button
                          type="button"
                          class="btn g link-extra"
                          onClick={(event) =>
                            router.navigate(
                              exploreTarget('extras', 'extra', destination.extraTarget!),
                              event.currentTarget
                            )
                          }
                        >
                          <Icon name="book" size={18} /> Ver na ficha de Leituras Extras
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <ScreenState
          kind="empty"
          title="Nenhum link encontrado"
          message="Tente outro arco, série, edição ou destino."
        />
      )}
    </>
  );
}
