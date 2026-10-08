/** Mantém a posição escolhida em Anterior/Próxima, mesmo após um recálculo da lista.
 * Caso um filtro de status remova a HQ ativa, escolhe a próxima edição visível
 * na ordem original (ou a anterior, se não houver próxima).
 */
export function reconcileFocusSelection(
  visibleIds: readonly number[],
  currentId: number | null,
  catalogPosition: ReadonlyMap<number, number>,
  isUnread: (id: number) => boolean
): number | null {
  if (!visibleIds.length) return null;
  if (currentId != null && visibleIds.includes(currentId)) return currentId;
  if (currentId != null) {
    const oldPosition = catalogPosition.get(currentId);
    if (oldPosition !== undefined) {
      const nextId = visibleIds.find(id => (catalogPosition.get(id) ?? -1) > oldPosition);
      if (nextId != null) return nextId;
      const previousId = [...visibleIds].reverse().find(id => (catalogPosition.get(id) ?? Infinity) < oldPosition);
      if (previousId != null) return previousId;
    }
  }
  return visibleIds.find(isUnread) ?? visibleIds[0];
}
