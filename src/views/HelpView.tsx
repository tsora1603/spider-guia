import { useEffect, useState } from 'preact/hooks';
import { DATA, editorialData, editorialExtras, normalizeText } from '../data/model';
import { appState } from '../state/app-state';
import { router } from '../runtime/controller';
import { SpoilerText } from '../components/SpoilerText';
import { ScreenState } from '../components/ScreenState';
import { ListSearch } from '../components/ListSearch';
import { helpQueryParams, withHelpSearch, helpTargetIndex } from './help-routing';

const SOURCE_SITE_NAMES: Record<string, string> = {
  'wikipedia.org': 'Wikipédia', 'whakoom.com': 'Whakoom', 'comics.org': 'Grand Comics Database (GCD)', 'marvel.com': 'Marvel',
  'marvel.fandom.com': 'Marvel Database', 'panini.com.br': 'Panini', 'howtolovecomics.com': 'How To Love Comics', 'comicvine.gamespot.com': 'Comic Vine',
  'universohq.com': 'Universo HQ', 'crushingkrisis.com': 'Crushing Krisis', 'spiderfan.org': 'SpiderFan'
};
const firstSourceUrl = (source: any[]) => String(source?.[2] || '').split(/\s*;\s*/).find(url => /^https?:\/\//.test(url)) || '';
const sourceSite = (url: string) => {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { /* fonte sem URL */ }
  if (host.endsWith('.wikipedia.org')) host = 'wikipedia.org';
  if (host === 'panini.com.br' || host.endsWith('.panini.com.br')) host = 'panini.com.br';
  return { key: host || 'sem-site', label: SOURCE_SITE_NAMES[host] || host || 'Sem website' };
};

// Cache the editorial cross-references: searching must not scan every Extra for every source.
const sourceUses = new Map<number, string[]>();
editorialExtras.forEach((extra: any) => (extra.src || []).forEach((index: number) => {
  const names = sourceUses.get(index) || [];
  names.push(extra.name);
  sourceUses.set(index, names);
}));

function groupedSources(query: string, target: number | null) {
  const needle = normalizeText(query);
  const groups = new Map<string, { key: string; label: string; sources: Array<{ source: any[]; index: number; uses: string[]; url: string }> }>();
  DATA.fontes.r.forEach((source: any[], index: number) => {
    const uses = sourceUses.get(index) || [];
    const url = firstSourceUrl(source);
    const site = sourceSite(url);
    if (needle && index !== target && !normalizeText([...source, ...uses, site.label, site.key].join(' ')).includes(needle)) return;
    if (!groups.has(site.key)) groups.set(site.key, { ...site, sources: [] });
    groups.get(site.key)!.sources.push({ source, index, uses, url });
  });
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));
}

function readHelpParams() { return helpQueryParams(location.hash); }

/** Replacing the hash state does not push an entry for each typed character. */
function replaceHelpSearch(value: string) {
  history.replaceState(history.state, '', withHelpSearch(location.hash, value));
}

function Glossary({ query, target }: { query: string; target: number | null }) {
  const needle = normalizeText(query);
  const filtered = DATA.glossario.r.map((row: any[], index: number) => ({ row, index }))
    .filter(({ row, index }) => index === target || !needle || normalizeText(row.join(' ')).includes(needle));
  if (!filtered.length) return <ScreenState kind="empty" title="Nenhum termo encontrado" message={`O glossário não tem resultados para “${query}”.`} />;
  return <>
    <p class="mu sm glossary-count ui-list-count" role="status">{filtered.length} {filtered.length === 1 ? 'termo' : 'termos'} de {DATA.glossario.r.length} · Toque para ler a definição</p>
    <div class="glossary-grid">{filtered.map(({ row, index }) => <details class={`card disclosure-item glossary-card${index === target ? ' is-targeted' : ''}`} id={`glossario-${index}`} key={index} open={index === target ? true : undefined}>
      <summary class="disclosure-summary ui-disclosure-summary"><b>{row[0]}</b></summary>
      <div class="row-body disclosure-content"><p class="sm"><SpoilerText text={row[1]} /></p>{row[2] ? <p class="sm mu">Ex.: {row[2]}</p> : null}<a class="help-deep-link sm" href={`#ajuda/glossario?termo=${index}`}>Link para este termo</a></div>
    </details>)}</div>
  </>;
}

function Sources({ query, target }: { query: string; target: number | null }) {
  const groups = groupedSources(query, target);
  const total = groups.reduce((sum, group) => sum + group.sources.length, 0);
  return <>
    <div class="list-callout sm mu"><b>Fontes documentais</b> usadas para confirmar posição e peso das leituras do guia. Elas são diferentes dos links editoriais de leitura.</div>
    <p class="mu sm ui-list-count" role="status">{total} de {DATA.fontes.r.length} fontes · {groups.length} {groups.length === 1 ? 'website' : 'websites'}</p>
    {groups.length ? <div class="content-list disclosure-list ui-list source-site-list">{groups.map(group => {
      const hasTarget = group.sources.some(item => item.index === target);
      return <details class="source-site-group ui-list-item disclosure-item" key={group.key} open={query || hasTarget ? true : undefined}>
        <summary class="disclosure-summary ui-disclosure-summary source-site-summary"><div class="row-head"><b>{group.label}</b><div class="row-meta disclosure-meta"><span class="tag">{group.sources.length} fontes</span><span class="mu sm">{group.key === 'sem-site' ? 'sem domínio' : group.key}</span></div></div></summary>
        <div class="source-site-body disclosure-content"><div class="source-list disclosure-list source-list-nested">{group.sources.map(({ source, index, uses, url }) => <details class={`content-row ui-list-item disclosure-item source-row${index === target ? ' is-targeted' : ''}`} id={`fonte-${index}`} key={index} open={index === target ? true : undefined}>
          <summary class="disclosure-summary ui-disclosure-summary"><b>{source[0]}</b></summary>
          <div class="row-body disclosure-content"><p class="sm mu"><SpoilerText text={source[1]} /></p>{url ? <a class="source-link" href={url} target="_blank" rel="noopener noreferrer">Abrir fonte ↗</a> : null}{uses.length ? <div class="source-uses sm mu"><b>Usada em:</b> {uses.join(' · ')}</div> : null}<a class="help-deep-link sm" href={`#ajuda/fontes?fonte=${index}`}>Link para esta fonte</a></div>
        </details>)}</div></div>
      </details>;
    })}</div> : <ScreenState kind="empty" title="Nenhuma fonte encontrada" message={`Nenhuma fonte corresponde a “${query}”.`} />}
  </>;
}

function Methodology({ target }: { target: number | null }) {
  const entries = editorialData.metodologia || [];
  if (!entries.length) return <ScreenState kind="empty" title="Metodologia indisponível" message="O catálogo atual não trouxe os textos de metodologia." />;
  return <>
    <p class="mu sm ui-list-count">{entries.length} {entries.length === 1 ? 'tema' : 'temas'} de metodologia</p>
    <div class="method-grid">{entries.map((entry: any, index: number) => <section class={`card${index === target ? ' is-targeted' : ''}`} id={`metodologia-${index}`} key={entry.title} tabIndex={-1}>
      <h3>{entry.title}</h3><p class="sm mu"><SpoilerText text={entry.body} /></p><a class="help-deep-link sm" href={`#ajuda/metodologia?bloco=${index}`}>Link para este tema</a>
    </section>)}</div>
    {editorialData.changelog?.length ? <div class="content-list disclosure-list"><details class="content-row ui-list-item disclosure-item"><summary class="disclosure-summary ui-disclosure-summary"><b>Atualizações editoriais</b></summary><div class="row-body disclosure-content">{editorialData.changelog.map((entry: any) => <div class="src" key={`${entry.date}-${entry.title}`}><b>{entry.date} · {entry.title}</b><p class="sm mu">{entry.body}</p></div>)}</div></details></div> : null}
  </>;
}

function Guide() {
  return <div class="help-guide-layout">
    <section class="help-start" aria-labelledby="help-start-title">
      <h2 id="help-start-title">O que você precisa consultar?</h2>
      <nav class="help-quick-links" aria-label="Acesso rápido à Ajuda">
        <button type="button" onClick={event => router.navigate('#ajuda/glossario', event.currentTarget)}><b>Glossário</b><small>{DATA.glossario.r.length} termos e definições</small></button>
        <button type="button" onClick={event => router.navigate('#ajuda/fontes', event.currentTarget)}><b>Fontes</b><small>{DATA.fontes.r.length} referências agrupadas por website</small></button>
        <button type="button" onClick={event => router.navigate('#ajuda/metodologia', event.currentTarget)}><b>Metodologia</b><small>Critérios e atualizações editoriais</small></button>
      </nav>
    </section>
    <div class="account-help-grid help-guide-grid">
      <section class="card account-guide-card">
        <div class="lbl">Como usar</div>
        <h3>Um lugar para cada intenção</h3>
        <p class="sm"><b>Hoje</b> respeita seu plano e mostra o próximo passo. <b>Checklist</b> acompanha as 1.301 leituras. <b>Explorar</b> reúne Jornada, Extras e Saga do Clone. <b>Configurações</b> reúne preferências e gerenciamento de dados.</p>
      </section>
      <section class="card account-guide-card">
        <div class="lbl">Peso da leitura</div>
        <div class="leg"><span class="tag e">● Essencial</span><div class="sm">Faz falta para entender a história.</div></div>
        <div class="leg"><span class="tag">◐ Contexto</span><div class="sm">Ajuda, mas dá para seguir sem.</div></div>
        <div class="leg"><span class="tag">○ Opcional</span><div class="sm">Aprofunda sem ser necessária.</div></div>
      </section>
      <section class="card account-guide-card">
        <div class="lbl">Atalhos de teclado</div>
        <h3>Acesso rápido</h3>
        <p class="sm">Pressione <kbd>?</kbd> para consultar os atalhos disponíveis. Use <kbd>/</kbd> para focar a busca da tela atual. Na Checklist, use <kbd>J</kbd> e <kbd>K</kbd> para navegar entre leituras.</p>
      </section>
    </div>
  </div>;
}

const HELP_SECTIONS = [
  ['ajuda', 'Como usar', '#ajuda'],
  ['glossario', 'Glossário', '#ajuda/glossario'],
  ['fontes', 'Fontes', '#ajuda/fontes'],
  ['metodologia', 'Metodologia', '#ajuda/metodologia']
] as const;

export function HelpView() {
  const section = appState.helpSection || 'ajuda';
  const currentHash = location.hash;
  const params = readHelpParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const target = section === 'fontes' ? helpTargetIndex(params, 'fonte', DATA.fontes.r.length)
    : section === 'glossario' ? helpTargetIndex(params, 'termo', DATA.glossario.r.length)
    : section === 'metodologia' ? helpTargetIndex(params, 'bloco', (editorialData.metodologia || []).length) : null;

  // Back/forward and direct links restore this section's query without shared settings state.
  useEffect(() => setQuery(readHelpParams().get('q') || ''), [section, currentHash]);
  useEffect(() => {
    if (target === null) return;
    const prefix = section === 'fontes' ? 'fonte' : section === 'glossario' ? 'glossario' : 'metodologia';
    const frame = requestAnimationFrame(() => {
      const item = document.getElementById(`${prefix}-${target}`);
      item?.scrollIntoView({ block: 'center', behavior: 'auto' });
      const focus = item?.querySelector('summary') || item;
      (focus as HTMLElement | null)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [section, target, currentHash]);

  const changeQuery = (value: string) => { setQuery(value); replaceHelpSearch(value); };
  return <div class="help-layout">
    <nav class="seg help-sections" aria-label="Seções de Ajuda">
      {HELP_SECTIONS.map(([value, label, hash]) => <button key={value} type="button" class={section === value ? 'on' : ''} aria-current={section === value ? 'page' : undefined} onClick={event => router.navigate(hash, event.currentTarget)}>{label}</button>)}
    </nav>
    {section === 'glossario' || section === 'fontes' ? <div class="help-search-toolbar"><ListSearch label={section === 'glossario' ? 'Buscar termo' : 'Buscar fonte'} placeholder={section === 'glossario' ? 'Buscar termo ou definição' : 'Buscar referência, website ou uso'} value={query} onChange={changeQuery} />{query ? <button class="btn g" type="button" onClick={() => changeQuery('')}>Limpar busca</button> : null}</div> : null}
    {section === 'glossario' ? <Glossary query={query} target={target} /> : section === 'fontes' ? <Sources query={query} target={target} /> : section === 'metodologia' ? <Methodology target={target} /> : <Guide />}
  </div>;
}
