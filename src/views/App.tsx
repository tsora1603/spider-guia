import { lazy, Suspense } from 'preact/compat';
import { useProgressRevision, useUiRevision } from '../ui/hooks';
import { appState } from '../state/app-state';
import { principalReadings } from '../data/model';
import { statusOf } from '../state/progress-store';
import { Icon, type IconName } from '../components/Icon';
import { percent } from '../components/Progress';
import { SpoilerLevelControl } from '../components/SpoilerText';
import { router, supabaseClient, toggleAuth } from '../runtime/controller';
import { isSyncBlocked, mayUseCloud, resetPhase } from '../reset/reset-guard';
import { CloudReconnectDialog } from '../reset/CloudReconnectDialog';
import { Onboarding } from '../components/Onboarding';
import { useReadingPreferences } from '../preferences/hooks';
import { BulkProgressDialog } from '../components/BulkProgressDialog';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { ScreenState, ViewErrorBoundary } from '../components/ScreenState';
import { ProgressBarVisual } from '../design/ProgressVisuals';

const HomeView = lazy(() => import('./HomeView').then(module => ({ default: module.HomeView })));
const ReadingView = lazy(() => import('./ReadingView').then(module => ({ default: module.ReadingView })));
const ExploreView = lazy(() => import('./ExploreView').then(module => ({ default: module.ExploreView })));
const MoreView = lazy(() => import('./MoreView').then(module => ({ default: module.MoreView })));
const HelpView = lazy(() => import('./HelpView').then(module => ({ default: module.HelpView })));

const NAV_ITEMS: Array<{ key: 'Hoje' | 'Checklist' | 'Explorar' | 'Ajuda' | 'Configurações'; icon: IconName; hash: string; mobileLabel?: string }> = [
  { key: 'Hoje', icon: 'home', hash: '#hoje' },
  { key: 'Checklist', icon: 'checklist', hash: '#checklist' },
  { key: 'Explorar', icon: 'route', hash: '#explorar/jornada' },
  { key: 'Ajuda', icon: 'info', hash: '#ajuda' },
  { key: 'Configurações', icon: 'settings', hash: '#configuracoes', mobileLabel: 'Config.' }
];
const PAGE_HEADERS: Record<string, [string, string]> = {
  Checklist: ['Checklist', 'Acompanhe as 1.301 leituras agrupadas por fase ou arco.'],
  Explorar: ['Explorar', 'Descubra a Jornada, leituras Extras e a ordem da Saga do Clone.'],
  Ajuda: ['Ajuda', 'Como usar o guia, glossário, fontes e metodologia.'],
  Configurações: ['Configurações', 'Gerencie suas preferências, sincronização e dados locais.']
};

function SidebarProgress() {
  const ids = principalReadings.map(item => item.id);
  useProgressRevision(ids);
  const read = ids.filter(id => statusOf(id) === 'Sim').length;
  const value = percent(read, ids.length);
  return <div class="sprog" id="sp"><b>Linha principal · {value}%</b><ProgressBarVisual value={value} label="Progresso da linha principal" /></div>;
}

function Header() {
  useUiRevision('session');
  useUiRevision('sync');
  const syncState = (isSyncBlocked() || (appState.currentUser && !mayUseCloud(appState.currentUser.id))) ? 'blocked' : !supabaseClient || !appState.currentUser ? 'local' : !navigator.onLine ? 'offline' : appState.syncState;
  const labels: Record<string, string> = { local: 'Neste dispositivo', saved: 'Sincronizado', syncing: 'Sincronizando…', error: 'Erro de sincronização', offline: 'Offline', blocked: 'Nuvem bloqueada' };
  return <header class="side"><div class="brand"><h1>SPIDER<span>·</span>GUIA</h1><small>Leitura do #1 ao #1000</small></div><nav id="nav" aria-label="Navegação principal">{NAV_ITEMS.map(item => <button key={item.key} type="button" aria-label={item.key} class={item.key === appState.activeTab ? 'on' : ''} aria-current={item.key === appState.activeTab ? 'page' : undefined} onClick={event => router.navigate(item.hash, event.currentTarget)}><i><Icon name={item.icon} /></i><span class={item.mobileLabel ? 'nav-label-long' : undefined}>{item.key}</span>{item.mobileLabel ? <span class="nav-label-short" aria-hidden="true">{item.mobileLabel}</span> : null}</button>)}</nav><SidebarProgress /><SpoilerLevelControl /><div class="acct"><small>{appState.currentUser?.email || ''}</small><span class="sync-status" data-state={syncState} role="status" aria-live="polite">{labels[syncState] || labels.saved}</span>{resetPhase() !== 'preparing' && supabaseClient ? <button onClick={toggleAuth}>{appState.currentUser ? 'Sair' : 'Entrar'}</button> : null}</div></header>;
}

function PageHeader() {
  const header = PAGE_HEADERS[appState.activeTab];
  return header ? <div class="ph"><h2>{header[0]}</h2><p class="sm">{header[1]}</p></div> : null;
}

function ActiveView() {
  const screen = appState.activeTab;
  const view = screen === 'Checklist'
    ? <ReadingView />
    : screen === 'Explorar'
      ? <ExploreView />
      : screen === 'Ajuda'
        ? <HelpView />
        : screen === 'Configurações'
          ? <MoreView />
        : <HomeView />;
  return (
    <ViewErrorBoundary screen={screen}>
      <Suspense fallback={<ScreenState kind="loading" title={`Carregando ${screen}`} message="Preparando esta área do guia…" />}>
        {view}
      </Suspense>
    </ViewErrorBoundary>
  );
}

export function App() {
  useUiRevision('route');
  const preferences = useReadingPreferences();
  return <>
    <div class="shell"><Header /><main id="app" tabIndex={-1} data-tab={appState.activeTab}><PageHeader /><ActiveView /></main></div>
    <CloudReconnectDialog />
    <BulkProgressDialog />
    <KeyboardShortcuts />
    {!preferences.onboardingComplete ? <Onboarding /> : null}
  </>;
}
