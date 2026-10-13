import { createRouter } from '../router/router';
import { appState } from '../state/app-state';
import { itemsById } from '../data/model';
import { uiStore } from '../ui/ui-store';
import { showToast } from '../components/feedback';
import { linksEnabled } from '../config/public';
export const router = createRouter({
  linksEnabled,
  apply(route, scroll) {
    appState.activeTab = route.tab;
    if (route.readingMode) appState.readingMode = route.readingMode;
    if (route.exploreSection) appState.exploreSection = route.exploreSection;
    if (route.helpSection) appState.helpSection = route.helpSection;
    if (route.name === 'checklist') {
      appState.checklistFilter = route.checklistFilter || '';
      appState.checklistQuery = route.checklistQuery || '';
      appState.focusedItemId = null;
    } else if (route.name === 'hq' && route.itemId != null) {
      appState.readingMode = 'main';
      appState.checklistFilter = '';
      appState.checklistQuery = '';
      appState.focusedItemId = route.itemId;
    } else {
      appState.focusedItemId = null;
    }
    if (route.tab !== 'Ajuda' || route.helpSection !== 'fontes') appState.highlightedSource = null;
    uiStore.notify('route');
    if (
      scroll &&
      route.name !== 'hq' &&
      !(route.tab === 'Explorar' && new URLSearchParams(route.routeQuery || '').has('marco')) &&
      !(route.tab === 'Explorar' && new URLSearchParams(route.routeQuery || '').has('extra')) &&
      !(route.tab === 'Explorar' && new URLSearchParams(route.routeQuery || '').has('link'))
    )
      requestAnimationFrame(() => scrollTo(0, 0));
  },
  itemExists(id) {
    return Boolean(itemsById[id]);
  },
  onInvalidItem(id) {
    showToast(`HQ ${id} não existe no catálogo atual.`);
  }
});
