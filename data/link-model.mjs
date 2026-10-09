/* Modelo único de cobertura e associações de Links para Vite e Node. */
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const issueLabel = ({ start, end }, suffix = '') =>
  start === end ? `#${start}${suffix}` : `#${start}${suffix}–${end}${suffix}`;

function formatCoverage(coverage) {
  if (!Array.isArray(coverage)) return '';
  return coverage
    .map((entry) => {
      if (entry.type === 'one-shot')
        return `${entry.series}${entry.volume ? ` (${entry.volume})` : ''} — edição única`;
      const identity =
        entry.type === 'lgy'
          ? `LGY${entry.series ? ` · ${entry.series}` : ''}${entry.volume ? ` (${entry.volume})` : ''}`
          : `${entry.series}${entry.volume ? ` (${entry.volume})` : ''}`;
      return `${identity} ${Array.isArray(entry.ranges) ? entry.ranges.map((range) => issueLabel(range, entry.suffix ? `.${entry.suffix}` : '')).join(', ') : ''}`;
    })
    .join(' · ');
}

function validateCoverage(coverage, field, fail) {
  if (!Array.isArray(coverage) || !coverage.length) {
    fail('links.coverage', `${field}: cobertura deve ser uma lista não vazia.`);
    return;
  }
  const seen = new Map();
  coverage.forEach((entry, index) => {
    const label = `${field}[${index}]`;
    if (!isObject(entry) || !['lgy', 'series', 'one-shot'].includes(entry.type)) {
      fail('links.coverage', `${label}: tipo de cobertura inválido.`);
      return;
    }
    if (entry.type !== 'lgy' && !isText(entry.series))
      fail('links.coverage', `${label}: série obrigatória.`);
    if (entry.series != null && !isText(entry.series))
      fail('links.coverage', `${label}: série inválida.`);
    if (entry.volume != null && !isText(entry.volume))
      fail('links.coverage', `${label}: volume inválido.`);
    if (entry.suffix != null && (!isText(entry.suffix) || !/^[a-z0-9]+$/i.test(entry.suffix))) {
      fail('links.coverage', `${label}: sufixo inválido.`);
    }
    if (entry.type === 'one-shot') {
      if (entry.ranges != null || entry.suffix != null)
        fail('links.coverage', `${label}: one-shot não aceita intervalos ou sufixo.`);
      const key = JSON.stringify([entry.type, entry.series, entry.volume || '']);
      if (seen.has(key)) fail('links.coverage.duplicate', `${label}: edição única duplicada.`);
      seen.set(key, []);
      return;
    }
    if (!Array.isArray(entry.ranges) || !entry.ranges.length) {
      fail('links.coverage', `${label}: ranges deve ser uma lista não vazia.`);
      return;
    }
    const key = JSON.stringify([
      entry.type,
      entry.series || '',
      entry.volume || '',
      entry.suffix || ''
    ]);
    const previous = seen.get(key) || [];
    entry.ranges.forEach((range, rangeIndex) => {
      const path = `${label}.ranges[${rangeIndex}]`;
      const min = entry.type === 'lgy' ? 1 : 0; // Ex.: Spider-Geddon #0
      if (
        !isObject(range) ||
        !Number.isSafeInteger(range.start) ||
        !Number.isSafeInteger(range.end) ||
        range.start < min ||
        range.end < range.start
      ) {
        fail('links.coverage', `${path}: intervalo inválido (start/end inteiros, ordenados).`);
        return;
      }
      if (previous.some((known) => range.start <= known.end && range.end >= known.start)) {
        fail('links.coverage.duplicate', `${path}: intervalo repetido ou sobreposto.`);
      }
      previous.push(range);
    });
    seen.set(key, previous);
  });
}

function validateEditorialLinks(groups, { knownItemIds, extras, cloneArcIds } = {}) {
  const errors = [];
  const fail = (code, message) => errors.push({ code, message });
  if (!Array.isArray(groups))
    return [{ code: 'links.groups', message: 'Links deve ser um array.' }];
  const ids = new Set();
  const extraById = extras ? new Map(extras.map((extra) => [extra.n, extra])) : null;
  groups.forEach((group, index) => {
    const label = `Links[${index}]`;
    if (!isObject(group)) {
      fail('links.group', `${label}: grupo inválido.`);
      return;
    }
    if (!isText(group.id)) fail('links.id', `${label}: ID obrigatório.`);
    else if (ids.has(group.id)) fail('links.id.duplicate', `${label}: ID duplicado ${group.id}.`);
    ids.add(group.id);
    if (!isText(group.title)) fail('links.title', `${label}: título obrigatório.`);
    if (group.notes != null && !isText(group.notes))
      fail('links.notes', `${label}: observação inválida.`);
    if (group.context != null && !isText(group.context))
      fail('links.notes', `${label}: contexto legado inválido.`);
    if (group.coverage != null) validateCoverage(group.coverage, `${label}.coverage`, fail);
    if (group.targets == null) {
      if (group.coverage == null)
        fail('links.association', `${label}: sem targets exige coverage válida.`);
    } else if (!Array.isArray(group.targets) || !group.targets.length) {
      fail('links.target', `${label}: targets deve ser lista não vazia ou omitida.`);
    } else {
      const usedTargets = new Set();
      for (const [targetIndex, target] of group.targets.entries()) {
        const path = `${label}.targets[${targetIndex}]`;
        if (
          !isObject(target) ||
          !['items', 'historical', 'extra', 'cloneArc'].includes(target.kind)
        ) {
          fail('links.target', `${path}: alvo inválido.`);
          continue;
        }
        const key = JSON.stringify(target);
        if (usedTargets.has(key)) fail('links.target.duplicate', `${path}: alvo duplicado.`);
        usedTargets.add(key);
        if (target.kind === 'items') {
          if (!Array.isArray(target.ids) || !target.ids.length)
            fail('links.item', `${path}: ids vazio.`);
          const ids = new Set();
          for (const id of target.ids || []) {
            if (!Number.isSafeInteger(id) || id <= 0 || (knownItemIds && !knownItemIds.has(id)))
              fail('links.item', `${path}: ID de HQ inexistente/inválido ${id}.`);
            if (ids.has(id)) fail('links.item.duplicate', `${path}: ID de HQ duplicado ${id}.`);
            ids.add(id);
          }
        } else if (target.kind === 'historical') {
          if (!Array.isArray(target.ranges) || !target.ranges.length)
            fail('links.historical', `${path}: ranges vazio.`);
          for (const range of target.ranges || []) {
            if (
              !isObject(range) ||
              !Number.isSafeInteger(range.start) ||
              !Number.isSafeInteger(range.end) ||
              range.start < 1 ||
              range.end < range.start
            )
              fail('links.historical', `${path}: intervalo histórico inválido.`);
          }
        } else if (target.kind === 'extra') {
          if (
            !Number.isSafeInteger(target.id) ||
            target.id <= 0 ||
            (extraById && !extraById.has(target.id))
          )
            fail('links.extra', `${path}: ficha de Extras inexistente/inválida ${target.id}.`);
        } else if (!isText(target.id) || (cloneArcIds && !cloneArcIds.has(target.id))) {
          fail(
            'links.cloneArc',
            `${path}: arco da Saga do Clone inexistente/inválido ${target.id}.`
          );
        }
      }
    }
    const urls = new Set();
    let destinations = 0;
    for (const field of ['links', 'stores', 'libraries']) {
      const list = group[field];
      if (list == null && field !== 'links') continue;
      if (!Array.isArray(list)) {
        fail('links.destinations', `${label}.${field} deve ser array.`);
        continue;
      }
      list.forEach((destination, i) => {
        const path = `${label}.${field}[${i}]`;
        if (!isObject(destination) || !isText(destination.label) || !isText(destination.url)) {
          fail('links.destination', `${path}: destino exige label e url.`);
          return;
        }
        try {
          const url = new URL(destination.url);
          if (!['http:', 'https:'].includes(url.protocol) || !url.hostname)
            throw Error('protocolo/host');
        } catch {
          fail('links.url', `${path}: URL HTTP(S) inválida.`);
        }
        if (urls.has(destination.url))
          fail('links.url.duplicate', `${path}: URL repetida no mesmo grupo.`);
        urls.add(destination.url);
        if (destination.coverage != null)
          validateCoverage(destination.coverage, `${path}.coverage`, fail);
        if (destination.extraTarget !== undefined && destination.extraTarget !== null) {
          if (
            !Number.isSafeInteger(destination.extraTarget) ||
            destination.extraTarget <= 0 ||
            (extraById && !extraById.has(destination.extraTarget))
          )
            fail(
              'links.extra',
              `${path}: extraTarget inexistente/inválido ${destination.extraTarget}.`
            );
        }
        destinations++;
      });
    }
    if (!destinations) fail('links.destinations', `${label}: nenhum destino definido.`);
  });
  return errors;
}

// null explícito no destino suprime o único alvo de Extra herdado do grupo.
function resolveExtraId(group, destination) {
  if (destination && Object.prototype.hasOwnProperty.call(destination, 'extraTarget'))
    return destination.extraTarget;
  const ids = (group.targets || [])
    .filter((target) => target.kind === 'extra')
    .map((target) => target.id);
  return ids.length === 1 ? ids[0] : null;
}

export { formatCoverage, validateCoverage, validateEditorialLinks, resolveExtraId };
