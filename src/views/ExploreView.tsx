import { useEffect, useMemo, useState } from 'preact/hooks';
import { cloneEntries, editorialExtras, itemsById, milestones, normalizeText, readings } from '../data/model';
import { appState } from '../state/app-state';
import { linksEnabled, router } from '../runtime/controller';
import { Icon } from '../components/Icon';
import { SpoilerText } from '../components/SpoilerText';
import { JourneyView } from './JourneyView';
import { CloneView, ExtrasView } from './ReadingView';
import { LinksView, getEditorialLinkGroups } from './LinksView';
import { ScreenState } from '../components/ScreenState';
import { ListSearch } from '../components/ListSearch';
import { exploreTarget, replaceExploreSearch, milestoneAnchorKey, extraAnchorKey } from './explore-navigation';

type ExploreSection = 'jornada' | 'extras' | 'clone' | 'links';

const SECTION_LABELS: Array<[ExploreSection, string]> = [
  ['jornada', 'Jornada'],
  ['extras', 'Extras'],
  ['clone', 'Saga do Clone']
];

function GlobalSearch({ query }: { query: string }) {
  const results = useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return null;
    const issueTokens = needle.split(/\s+/).filter(Boolean);
    const issueResults = readings.filter(item => issueTokens.every(token => item.searchText.includes(token))).slice(0, 8);
    const extraResults = editorialExtras.filter((entry: any) => normalizeText([
      entry.name, entry.why, entry.howMuch, entry.weight, entry.category
    ].join(' ')).includes(needle)).slice(0, 5);
    const milestoneResults = milestones.filter((entry: any) => normalizeText([
      entry.year, entry.title, entry.description, entry.whereToRead, entry.weight
    ].join(' ')).includes(needle)).slice(0, 5);
    const linkResults = linksEnabled ? getEditorialLinkGroups().filter(group => normalizeText([
      group.searchText
    ].join(' ')).includes(needle)).slice(0, 5) : [];
    const cloneResults = cloneEntries.filter((entry: any) => {
      const reading = itemsById[entry.id];
      return normalizeText([entry.phase, entry.crossover, entry.note, entry.part, reading?.series, reading?.issue].join(' ')).includes(needle);
    }).slice(0, 5);
    return { issueResults, extraResults, milestoneResults, cloneResults, linkResults };
  }, [query]);

  if (!results) return null;
  const total = results.issueResults.length + results.extraResults.length + results.milestoneResults.length + results.cloneResults.length + results.linkResults.length;
  if (!total) return <ScreenState kind="empty" title="Nenhum resultado" message={`“${query}” não apareceu nas áreas pesquisadas do guia.`} />;
  return <section class="explore-search-results" aria-live="polite">
    <div class="search-result-summary"><b>{total} resultados rápidos</b><span class="mu sm">Resultados da Checklist, Jornada, Extras, Saga do Clone${linksEnabled ? ' e Links' : ''}.</span></div>
    {results.issueResults.length ? <div class="search-result-group"><h3>Checklist</h3>{results.issueResults.map(item => <button class="search-result" key={`issue-${item.id}`} onClick={event => router.navigate(`#checklist/hq/${item.id}`, event.currentTarget)}><span><b>{item.series} {item.issue}</b><small>{item.phase}{item.historicalNumber ? ` · #${item.historicalNumber}` : ''}</small></span><Icon name="chevD" /></button>)}</div> : null}
    {results.milestoneResults.length ? <div class="search-result-group"><h3>Jornada</h3>{results.milestoneResults.map((item: any) => <button class="search-result" key={`${item.year}-${item.title}`} onClick={event => router.navigate(exploreTarget('jornada', 'marco', milestoneAnchorKey(item)), event.currentTarget)}><span><b><SpoilerText text={item.title} /></b><small>{item.year} · {item.whereToRead}</small></span><Icon name="route" /></button>)}</div> : null}
    {results.extraResults.length ? <div class="search-result-group"><h3>Extras</h3>{results.extraResults.map((item: any) => <button class="search-result" key={item.id || item.name} onClick={event => router.navigate(item.special === 'clone' ? '#explorar/clone' : exploreTarget('extras', 'extra', extraAnchorKey(item)), event.currentTarget)}><span><b><SpoilerText text={item.name} /></b><small>{item.weight}</small></span><Icon name="book" /></button>)}</div> : null}
    {results.linkResults.length ? <div class="search-result-group"><h3>Links editoriais</h3>{results.linkResults.map(group => <button class="search-result" key={group.key} onClick={event => router.navigate(exploreTarget('links', 'link', group.key), event.currentTarget)}><span><b><SpoilerText text={group.name} /></b><small>{group.coverageLabel || 'Link externo'}</small></span><Icon name="link" /></button>)}</div> : null}
    {results.cloneResults.length ? <div class="search-result-group"><h3>Saga do Clone</h3>{results.cloneResults.map((entry: any, index: number) => { const item = itemsById[entry.id]; return <button class="search-result" key={`${entry.id}-${entry.readingOrder}-${index}`} onClick={event => router.navigate(`#checklist/hq/${entry.id}`, event.currentTarget)}><span><b>{item ? `${item.series} ${item.issue}` : `Leitura ${entry.id}`}</b><small>{entry.phase}{entry.crossover ? ` · ${entry.crossover}` : ''}</small></span><Icon name="chevD" /></button>; })}</div> : null}
  </section>;
}

export function ExploreView() {
  const [query, setQuery] = useState(() => { const params = new URLSearchParams(location.hash.split('?')[1] || ''); return ['marco', 'extra', 'link'].some(key => params.has(key)) ? '' : params.get('q') || ''; });
  const hash = location.hash;
  useEffect(() => {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    setQuery(['marco', 'extra', 'link'].some(key => params.has(key)) ? '' : params.get('q') || '');
  }, [hash]);
  const onQueryChange = (value: string) => {
    replaceExploreSearch(value);
    setQuery(value);
  };
  const section = appState.exploreSection || 'jornada';
  const sections = linksEnabled ? [...SECTION_LABELS, ['links', 'Links'] as [ExploreSection, string]] : SECTION_LABELS;
  const go = (next: ExploreSection, origin: HTMLElement) => router.navigate(next === 'jornada' ? '#explorar/jornada' : `#explorar/${next}`, origin);

  return <>
    <div class="explore-search">
      <ListSearch id="explore-global-search" label="Buscar em todo o guia" placeholder="Buscar em todo o guia" value={query} onChange={onQueryChange} />
      <p class="mu sm">Edições, fases, arcos, extras, marcos e links editoriais disponíveis em uma única busca.</p>
    </div>
    {query.trim() ? <GlobalSearch query={query} /> : <>
      <div class="seg explore-sections" aria-label="Seções de Explorar">{sections.map(([value, label]) => <button type="button" class={section === value ? 'on' : ''} aria-pressed={section === value} onClick={event => go(value, event.currentTarget)}>{label}</button>)}</div>
      {section === 'extras' ? <ExtrasView /> : section === 'clone' ? <CloneView /> : section === 'links' && linksEnabled ? <LinksView /> : <JourneyView />}
    </>}
  </>;
}
