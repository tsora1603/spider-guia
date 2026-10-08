import { describe, expect, it } from 'vitest';
import { LEGACY_ROUTE_MAP, parseHash, routeToHash } from '../../src/router/router';

describe('router por hash — nova arquitetura de informação', () => {
  it('faz round-trip canônico da Checklist com filtro e busca', () => {
    const route = parseHash('#checklist?f=pendentes&q=clone', true);
    expect(route).toMatchObject({
      name: 'checklist',
      tab: 'Checklist',
      readingMode: 'main',
      checklistFilter: 'Não',
      checklistQuery: 'clone'
    });
    expect(routeToHash(route)).toBe('#checklist?f=pendentes&q=clone');
  });

  it('redireciona a rota antiga da Checklist sem perder parâmetros', () => {
    const route = parseHash('#ler/checklist?f=essenciais&q=venom', true);
    expect(route).toMatchObject({ name: 'checklist', checklistFilter: 'ess', checklistQuery: 'venom' });
    expect(routeToHash(route)).toBe('#checklist?f=essenciais&q=venom');
  });

  it('preserva deep-link antigo de HQ em rota canônica nova', () => {
    const route = parseHash('#hq/123', true);
    expect(route).toMatchObject({ name: 'hq', tab: 'Checklist', itemId: 123, readingMode: 'main' });
    expect(routeToHash(route)).toBe('#checklist/hq/123');
    expect(parseHash('#checklist/hq/123', true)).toMatchObject({ name: 'hq', itemId: 123 });
  });

  it('mapeia todos os aliases antigos para cinco destinos, sem perder parâmetros', () => {
    const expected = {
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
    expect(LEGACY_ROUTE_MAP).toEqual(expected);
    for (const [legacy, canonical] of Object.entries(expected)) {
      expect(routeToHash(parseHash(legacy, true))).toBe(canonical);
      expect(routeToHash(parseHash(`${legacy}?from=external`, true))).toBe(`${canonical}?from=external`);
    }
  });

  it('diferencia Ajuda de Configurações e resolve subseções canônicas', () => {
    expect(parseHash('#ajuda', true)).toMatchObject({ name: 'ajuda', tab: 'Ajuda', helpSection: 'ajuda' });
    expect(parseHash('#ajuda/fontes', true)).toMatchObject({ name: 'ajuda-fontes', tab: 'Ajuda', helpSection: 'fontes' });
    expect(parseHash('#ajuda/metodologia', true).tab).toBe('Ajuda');
    expect(parseHash('#configuracoes', true)).toMatchObject({ name: 'configuracoes', tab: 'Configurações' });
    expect(parseHash('#conta/ajuda', true).tab).toBe('Configurações');
    expect(routeToHash(parseHash('#hq/123?origem=email', true))).toBe('#checklist/hq/123?origem=email');
    expect(routeToHash(parseHash('#ler/checklist?f=pendentes&q=clone&origem=email', true))).toBe('#checklist?origem=email&f=pendentes&q=clone');
  });

  it('normaliza rota desconhecida para Hoje', () => {
    expect(parseHash('#nao-existe', true).name).toBe('hoje');
    expect(routeToHash(parseHash('#nao-existe', true))).toBe('#hoje');
  });

  it('leva Links desativado para Explorar em vez de quebrar o destino', () => {
    expect(parseHash('#links', false).name).toBe('explorar-jornada');
    expect(routeToHash(parseHash('#links', false))).toBe('#explorar/jornada');
    expect(parseHash('#links', true).name).toBe('explorar-links');
  });
});
