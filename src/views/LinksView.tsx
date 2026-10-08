import { useEffect, useMemo, useState } from 'preact/hooks';
import { editorialLinks } from '../runtime/controller';
import { itemsById, normalizeText } from '../data/model';
import { Icon } from '../components/Icon';
import { SpoilerText } from '../components/SpoilerText';
import { ScreenState } from '../components/ScreenState';
import { ListSearch } from '../components/ListSearch';
import { exploreRouteParam, focusEditorialTarget } from './explore-navigation';

const normalizeDestinations = (value: any) => Array.isArray(value) ? value.map(entry => ({ label: String(entry?.label || ''), url: String(entry?.url || '') })).filter(entry => entry.label && entry.url) : [];

export function getEditorialLinkGroups() {
  return editorialLinks.map((group: any) => {
    const itemIds = (group.itemIds || []).map(Number).filter(Number.isFinite);
    return {
      key: group.id || `link-${group.readingGroup || itemIds[0] || 'grupo'}`,
      name: group.title || itemIds.map((id: number) => itemsById[id]).filter(Boolean).map((item: any) => `${item.series} ${item.issue}`).join(' · ') || 'Link editorial',
      itemIds,
      issues: itemIds.map((id: number) => itemsById[id]).filter(Boolean).map((item: any) => `${item.series} ${item.issue}`),
      context: group.context || '',
      brazilianEdition: group.brazilianEdition || '',
      links: (group.links || []).map((link: any) => ({ label: link.label, url: link.url })),
      stores: normalizeDestinations(group.stores),
      libraries: normalizeDestinations(group.libraries)
    };
  }).filter((group: any) => group.links.length || group.stores.length || group.libraries.length || group.brazilianEdition);
}

function DestinationGroup({ label, entries }: { label: string; entries: any[] }) {
  if (!entries.length) return null;
  return <div class="legal-links"><b class="sm">{label}</b><div class="link-actions">{entries.map(entry => <a class="lk" href={entry.url} target="_blank" rel="noopener" key={entry.url}><Icon name="link" /> {entry.label}</a>)}</div></div>;
}

export function LinksView() {
  const hash = location.hash;
  const [query, setQuery] = useState(() => new URLSearchParams(hash.split('?')[1] || '').get('lq') || '');
  useEffect(() => {
    setQuery(new URLSearchParams(hash.split('?')[1] || '').get('lq') || '');
  }, [hash]);
  const onLocalQueryChange = (value: string) => {
    const [path, raw = ''] = location.hash.split('?');
    const params = new URLSearchParams(raw);
    params.delete('link');
    if (value.trim()) params.set('lq', value);
    else params.delete('lq');
    const qs = params.toString();
    history.replaceState(history.state, '', `${path}${qs ? `?${qs}` : ''}`);
    setQuery(value);
  };
  const all = useMemo(getEditorialLinkGroups, []);
  const targetLink = exploreRouteParam('link');
  const targetIndex = all.findIndex(group => group.key === targetLink);
  useEffect(() => {
    if (targetIndex < 0) return;
    setQuery('');
    const frame = requestAnimationFrame(() => focusEditorialTarget(`explore-link-${targetIndex}`));
    return () => cancelAnimationFrame(frame);
  }, [targetIndex]);
  const needle = normalizeText(query);
  const filtered = !needle ? all : all.filter((group: any) => normalizeText([group.name, ...group.issues, ...[...group.links, ...group.stores, ...group.libraries].flatMap((entry: any) => [entry.label, entry.url]), group.context, group.brazilianEdition].join(' ')).includes(needle));
  const linkCount = filtered.reduce((total: number, group: any) => total + group.links.length + group.stores.length + group.libraries.length, 0);
  return <>
    <div class="list-callout sm mu"><b>Links editoriais curados.</b> Estes destinos foram associados manualmente a leituras, arcos e volumes. Fontes de pesquisa continuam separadas em <b>Ajuda → Fontes</b>.</div>
    <div class="links-toolbar ui-toolbar"><ListSearch label="Buscar links" placeholder="Buscar arco, série, edição ou rótulo" value={query} onChange={onLocalQueryChange} /></div>
    <p class="mu sm ui-list-count">{filtered.length} {filtered.length === 1 ? 'entrada' : 'entradas'} · {linkCount} {linkCount === 1 ? 'link' : 'links'}</p>
    {filtered.length ? <div class="content-list disclosure-list ui-list links-list">{filtered.map((group: any) => <details class={`content-row ui-list-item disclosure-item link-row editorial-anchor${group.key === targetLink ? ' is-targeted' : ''}`} key={group.key} id={`explore-link-${all.indexOf(group)}`} data-explore-target={group.key === targetLink ? 'link' : undefined} open={group.key === targetLink ? true : undefined}><summary class="disclosure-summary ui-disclosure-summary"><div class="row-head"><b><SpoilerText text={group.name} /></b><div class="row-meta disclosure-meta"><span class="tag">{group.links.length + group.stores.length + group.libraries.length} links</span>{group.itemIds.length ? <span class="mu sm">{group.itemIds.length} {group.itemIds.length === 1 ? 'edição relacionada' : 'edições relacionadas'}</span> : null}</div></div><Icon name="chevD" className="disclosure-chevron" /></summary><div class="row-body disclosure-content"><div class="link-panel disclosure-nested">{group.issues.length ? <div class="k"><span>Série / edição</span><div class="link-issues">{group.issues.join(' · ')}</div></div> : null}{group.brazilianEdition ? <div class="k"><span>Edição brasileira</span>{group.brazilianEdition}</div> : null}{group.context ? <div class="link-context sm mu"><SpoilerText text={group.context} /></div> : null}{group.links.length ? <div class="link-actions">{group.links.map((entry: any) => <a class="lk" href={entry.url} target="_blank" rel="noopener" key={entry.url}><Icon name="link" /> {entry.label}</a>)}</div> : null}<DestinationGroup label="Lojas" entries={group.stores} /><DestinationGroup label="Bibliotecas" entries={group.libraries} /></div></div></details>)}</div> : <ScreenState kind="empty" title="Nenhum link encontrado" message="Tente outro arco, série, edição ou rótulo." />}
  </>;
}
