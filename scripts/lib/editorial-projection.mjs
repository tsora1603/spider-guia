export function buildExtraDetailsById(editorialExtras) {
  const result = {};
  for (const extra of editorialExtras) {
    for (const id of extra.itemIds || []) {
      if (result[id]) throw new Error(`ID editorial duplicado no índice de detalhes: ${id}.`);
      result[id] = {
        porque: extra.why || '',
        quanto: extra.howMuch || '',
        conf: extra.confirmation || 'A confirmar',
        confirmationDetail: extra.confirmationDetail || extra.just || ''
      };
    }
  }
  return result;
}

export function buildReadingGroups(editorialExtras) {
  return editorialExtras
    .filter(extra => Number.isInteger(extra.readingGroup))
    .sort((a, b) => a.readingGroup - b.readingGroup)
    .map(extra => ({
      n: extra.readingGroup,
      after: extra.after,
      weight: extra.weight,
      name: extra.name,
      unavailable: Boolean(extra.unavailable),
      sequence: extra.sequence,
      why: extra.why,
      confirmation: extra.confirmation || 'A confirmar',
      howMuch: extra.howMuch,
      where: extra.where ?? null,
      links: extra.links || [],
      itemIds: extra.itemIds || [],
      brazilianEdition: extra.brazilianEdition || '',
      sourceRefs: extra.src || [],
      justification: extra.just || extra.confirmationDetail || ''
    }));
}
