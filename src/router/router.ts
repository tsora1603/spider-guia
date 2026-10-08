import { appState } from '../state/app-state';

export type ChecklistFilter = '' | 'Não' | 'Sim' | 'Pulei' | 'ess';
export type ExploreSection = 'jornada' | 'extras' | 'clone' | 'links';
export type HelpSection = 'ajuda' | 'glossario' | 'fontes' | 'metodologia';
export type RouteName =
  | 'hoje'
  | 'checklist'
  | 'explorar-jornada'
  | 'explorar-extras'
  | 'explorar-clone'
  | 'explorar-links'
  | 'ajuda'
  | 'ajuda-glossario'
  | 'ajuda-fontes'
  | 'ajuda-metodologia'
  | 'configuracoes'
  | 'hq';

export interface RouteState {
  name: RouteName;
  tab: 'Hoje' | 'Checklist' | 'Explorar' | 'Ajuda' | 'Configurações';
  exploreSection?: ExploreSection;
  helpSection?: HelpSection;
  readingMode?: 'ext' | 'main' | 'clone';
  checklistFilter?: ChecklistFilter;
  checklistQuery?: string;
  itemId?: number;
  /** Keeps unrecognized and future URL parameters intact on legacy redirects. */
  routeQuery?: string;
}

const filterToUrl: Record<string, string> = {
  Não: 'pendentes',
  Sim: 'lidas',
  Pulei: 'puladas',
  ess: 'essenciais'
};
const filterFromUrl: Record<string, ChecklistFilter> = {
  pendentes: 'Não',
  lidas: 'Sim',
  puladas: 'Pulei',
  essenciais: 'ess'
};

const canonicalRoutes: Record<string, Omit<RouteState, 'checklistFilter' | 'checklistQuery' | 'routeQuery'>> = {
  '#hoje': { name: 'hoje', tab: 'Hoje' },
  '#checklist': { name: 'checklist', tab: 'Checklist', readingMode: 'main' },
  '#explorar/jornada': { name: 'explorar-jornada', tab: 'Explorar', exploreSection: 'jornada' },
  '#explorar/extras': { name: 'explorar-extras', tab: 'Explorar', exploreSection: 'extras', readingMode: 'ext' },
  '#explorar/clone': { name: 'explorar-clone', tab: 'Explorar', exploreSection: 'clone', readingMode: 'clone' },
  '#explorar/links': { name: 'explorar-links', tab: 'Explorar', exploreSection: 'links' },
  '#ajuda': { name: 'ajuda', tab: 'Ajuda', helpSection: 'ajuda' },
  '#ajuda/glossario': { name: 'ajuda-glossario', tab: 'Ajuda', helpSection: 'glossario' },
  '#ajuda/fontes': { name: 'ajuda-fontes', tab: 'Ajuda', helpSection: 'fontes' },
  '#ajuda/metodologia': { name: 'ajuda-metodologia', tab: 'Ajuda', helpSection: 'metodologia' },
  '#configuracoes': { name: 'configuracoes', tab: 'Configurações' }
};

/** Old URLs still resolve; #conta/ajuda was the actual SETTINGS page, not the help hub. */
export const LEGACY_ROUTE_MAP: Readonly<Record<string, string>> = {
  '#inicio': '#hoje',
  '#ler': '#checklist',
  '#ler/checklist': '#checklist',
  '#ler/extras': '#explorar/extras',
  '#ler/clone': '#explorar/clone',
  '#jornada': '#explorar/jornada',
  '#links': '#explorar/links',
  '#mais': '#configuracoes',
  '#mais/guia': '#configuracoes',
  '#mais/ajuda': '#ajuda',
  '#mais/glossario': '#ajuda/glossario',
  '#mais/fontes': '#ajuda/fontes',
  '#mais/metodologia': '#ajuda/metodologia',
  '#conta': '#configuracoes',
  '#conta/ajuda': '#configuracoes',
  '#conta/configuracoes': '#configuracoes',
  '#conta/glossario': '#ajuda/glossario',
  '#conta/fontes': '#ajuda/fontes',
  '#conta/metodologia': '#ajuda/metodologia'
};

const routeAliases: Readonly<Record<string, string>> = {
  ...LEGACY_ROUTE_MAP,
  '#explorar': '#explorar/jornada',
  '#ajuda/guia': '#ajuda',
  '#ajuda/como-usar': '#ajuda'
};

const splitHash = (hash: string) => {
  const normalized = String(hash || '#hoje');
  const separator = normalized.indexOf('?');
  const path = separator < 0 ? normalized : normalized.slice(0, separator);
  const query = separator < 0 ? '' : normalized.slice(separator + 1);
  return { path: path.toLowerCase(), params: new URLSearchParams(query) };
};

const checklistState = (base: Omit<RouteState, 'checklistFilter' | 'checklistQuery' | 'routeQuery'>, params: URLSearchParams): RouteState => ({
  ...base,
  checklistFilter: filterFromUrl[params.get('f') || ''] || '',
  checklistQuery: params.get('q') || '',
  routeQuery: params.toString()
});

export function parseHash(hash: string, linksEnabled: boolean): RouteState {
  const { path: rawPath, params } = splitHash(hash);
  const hq = rawPath.match(/^#(?:checklist\/)?hq\/(\d+)$/);
  if (hq) {
    return {
      name: 'hq',
      tab: 'Checklist',
      readingMode: 'main',
      itemId: Number(hq[1]),
      routeQuery: params.toString()
    };
  }

  const mappedPath = routeAliases[rawPath] || rawPath;
  const safePath = mappedPath === '#explorar/links' && !linksEnabled ? '#explorar/jornada' : mappedPath;
  const base = canonicalRoutes[safePath];
  if (!base) return { ...canonicalRoutes['#hoje'] };
  if (base.name === 'checklist') return checklistState(base, params);
  return { ...base, routeQuery: params.toString() };
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function routeToHash(route: RouteState): string {
  if (route.name === 'hq' && Number.isInteger(route.itemId)) {
    return withQuery(`#checklist/hq/${route.itemId}`, new URLSearchParams(route.routeQuery || ''));
  }
  const path = Object.entries(canonicalRoutes).find(([, candidate]) => candidate.name === route.name)?.[0] || '#hoje';
  const params = new URLSearchParams(route.routeQuery || '');
  if (route.name !== 'checklist') return withQuery(path, params);
  // Keep unknown URL parameters, but never revive a filter/search the user cleared.
  params.delete('f');
  params.delete('q');
  if (route.checklistFilter && filterToUrl[route.checklistFilter]) params.set('f', filterToUrl[route.checklistFilter]);
  if (route.checklistQuery?.trim()) params.set('q', route.checklistQuery.trim());
  return withQuery(path, params);
}

export interface RouterOptions {
  linksEnabled: boolean;
  apply(route: RouteState, scroll: boolean): void;
  onInvalidItem?(id: number): void;
  itemExists?(id: number): boolean;
}

export function createRouter(options: RouterOptions) {
  let started = false;
  let pendingNavigationFocus = false;
  let currentRoute: RouteState | null = null;

  const commit = (route: RouteState, scroll = true) => {
    if (route.name === 'hq' && route.itemId != null && options.itemExists && !options.itemExists(route.itemId)) {
      options.onInvalidItem?.(route.itemId);
      route = { ...canonicalRoutes['#checklist'], checklistFilter: '', checklistQuery: '' } as RouteState;
      history.replaceState(history.state, '', routeToHash(route));
    }
    const screenChanged = currentRoute?.name !== route.name;
    currentRoute = route;
    options.apply(route, scroll);
    if (pendingNavigationFocus && screenChanged) {
      requestAnimationFrame(() => document.getElementById('app')?.focus({ preventScroll: true }));
    }
    pendingNavigationFocus = false;
  };

  const navigate = (
    target: string | RouteState,
    origin: HTMLElement | null = null,
    beforeApply?: (() => void) | null,
    replace = false
  ) => {
    const route = typeof target === 'string' ? parseHash(target, options.linksEnabled) : target;
    const hash = routeToHash(route);
    pendingNavigationFocus = Boolean(origin);
    beforeApply?.();
    if (replace) {
      history.replaceState(history.state, '', hash);
      commit(route, false);
    } else if (location.hash === hash) {
      commit(route);
    } else {
      location.hash = hash;
    }
  };

  const handleLocation = () => {
    const route = parseHash(location.hash, options.linksEnabled);
    const canonical = routeToHash(route);
    if (location.hash !== canonical) history.replaceState(history.state, '', canonical);
    commit(route);
  };

  const toTab = (
    target: string,
    origin: HTMLElement | null,
    optionsForTab: { readingMode?: 'ext' | 'main' | 'clone'; extraFilter?: string } = {}
  ) => {
    let hash = '#hoje';
    if (target === 'Checklist' || target === 'Ler') {
      hash = '#checklist';
    } else if (target === 'Explorar' || target === 'Jornada') {
      hash = '#explorar/jornada';
    } else if (target === 'Ajuda') {
      hash = '#ajuda';
    } else if (target === 'Configurações' || target === 'Conta' || target === 'Mais') {
      hash = '#configuracoes';
    } else if (target === 'Links' && options.linksEnabled) {
      hash = '#explorar/links';
    }
    if (target === 'Ler' && optionsForTab.readingMode) {
      hash = optionsForTab.readingMode === 'clone' ? '#explorar/clone' : optionsForTab.readingMode === 'ext' ? '#explorar/extras' : '#checklist';
    }
    return navigate(hash, origin, () => {
      appState.highlightedSource = null;
      if (optionsForTab.extraFilter) appState.extrasFilter = optionsForTab.extraFilter;
    });
  };

  const replaceChecklistState = () => {
    const current = parseHash(location.hash, options.linksEnabled);
    const route: RouteState = {
      name: 'checklist',
      tab: 'Checklist',
      readingMode: 'main',
      checklistFilter: appState.checklistFilter as ChecklistFilter,
      checklistQuery: appState.checklistQuery,
      routeQuery: current.name === 'checklist' ? current.routeQuery : ''
    };
    history.replaceState(history.state, '', routeToHash(route));
  };

  const start = () => {
    if (started) return;
    started = true;
    addEventListener('hashchange', handleLocation);
    if (!location.hash) history.replaceState(history.state, '', '#hoje');
    handleLocation();
  };

  const stop = () => {
    if (!started) return;
    removeEventListener('hashchange', handleLocation);
    started = false;
  };

  return { navigate, toTab, replaceChecklistState, handleLocation, start, stop };
}
