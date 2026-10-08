(() => {
  const VALID_WEIGHTS = new Set(['● Essencial', '◐ Contexto', '○ Opcional']);
  const VALID_STATUSES = new Set(['Confirmado', 'Parcial', 'A confirmar']);
  const REQUIRED_ITEM_FIELDS = [
    'id',
    'historicalNumber',
    'type',
    'series',
    'issue',
    'phase',
    'weight',
    'brazilianEdition',
    'instructions',
    'readingOrder',
    'note'
  ];

  function validate(data, links) {
    const errors = [];
    const fail = (code, message) => errors.push({ code, message });
    const itemRows = Array.isArray(data?.items) ? data.items : [];
    const itemFields = Array.isArray(data?.itemFields) ? data.itemFields : [];
    const missingFields = REQUIRED_ITEM_FIELDS.filter(field => !itemFields.includes(field));
    if (missingFields.length) {
      fail('items.fields', `Campos ausentes em DATA.itemFields: ${missingFields.join(', ')}.`);
    }
    const items = itemRows.map(row =>
      Object.fromEntries(itemFields.map((field, index) => [field, row[index]]))
    );
    const ids = items.map(item => item.id);
    const orders = items.map(item => item.readingOrder);
    const idSet = new Set(ids);
    const sourceCount = data?.fontes?.r?.length || 0;

    if (!items.length) fail('items.count', 'O catálogo não pode estar vazio.');
    const sortedOrders = [...orders].sort((a, b) => a - b);
    if (sortedOrders.some((order, index) => order !== index + 1))
      fail('items.order.sequence', `readingOrder deve formar 1..${items.length}, sem lacunas.`);
    if (idSet.size !== ids.length) fail('items.id.unique', 'Há IDs duplicados.');
    if (new Set(orders).size !== orders.length) fail('items.order.unique', 'Há readingOrder duplicados.');

    items.forEach(item => {
      if (!VALID_WEIGHTS.has(item.weight)) fail('items.weight', `Peso inválido no ID ${item.id}: ${item.weight}.`);
    });
    const historical = items.filter(item => item.type === 'Principal').map(item => Number(item.historicalNumber)).sort((a, b) => a - b);
    if (historical.length !== 1000 || historical.some((number, index) => number !== index + 1)) fail('items.historical', 'A linha histórica não corresponde exatamente a #1–#1000.');

    const confirmationPolicy = data?.editorial?.confirmationPolicy;
    if (
      confirmationPolicy?.position?.minimumEvidencePercent !== 100 ||
      confirmationPolicy?.position?.maximumDeductionPercent !== 0 ||
      confirmationPolicy?.weight?.minimumEvidencePercent !== 60 ||
      confirmationPolicy?.weight?.maximumDeductionPercent !== 40
    ) {
      fail('extras.confirmation.policy', 'A política de confirmação deve ser posição 100/0 e peso 60/40.');
    }

    const extras = data?.editorial?.extras || [];
    extras.forEach((extra, index) => {
      (extra.itemIds || []).forEach(id => {
        if (!idSet.has(id)) fail('extras.item', `Extra ${index + 1} referencia ID inexistente ${id}.`);
      });
      if (!VALID_WEIGHTS.has(extra.weight)) fail('extras.weight', `Peso inválido em ${extra.name || `extra ${index + 1}`}.`);
      if (extra.confirmation && !VALID_STATUSES.has(extra.confirmation)) fail('extras.status', `Status inválido em ${extra.name || `extra ${index + 1}`}: ${extra.confirmation}.`);
      const positionPass = extra.confirmationCriteria?.position === 'source-only';
      const weightPass = extra.confirmationCriteria?.weight === 'evidence-led-60-40';
      const criteriaPass = positionPass && weightPass;
      if (!extra.confirmationCriteria) fail('extras.confirmation.criteria', `${extra.name || `Extra ${index + 1}`} não declara confirmationCriteria.`);
      if ((extra.confirmation === 'Confirmado') !== criteriaPass) {
        fail('extras.confirmation.invariant', `${extra.name || `Extra ${index + 1}`}: Confirmado exige posição 100% baseada em fontes e peso no critério 60/40.`);
      }
      if (criteriaPass && !(extra.src || []).length) {
        fail('extras.confirmation.sources', `${extra.name || `Extra ${index + 1}`}: Confirmado precisa registrar fonte.`);
      }
      for (const sourceIndex of extra.src || []) {
        if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= sourceCount) fail('extras.source', `${extra.name || `Extra ${index + 1}`} referencia fonte inexistente ${sourceIndex}.`);
      }
    });

    const readingGroups = extras
      .filter(extra => extra.readingGroup != null)
      .map(extra => extra.readingGroup)
      .sort((a, b) => a - b);
    if (readingGroups.length !== 32 || readingGroups.some((group, index) => group !== index + 1)) {
      fail('extras.readingGroup', 'editorial.extras deve preservar exatamente readingGroup 1..32.');
    }
    const memberships = new Map();
    extras.forEach(extra => (extra.itemIds || []).forEach(id => {
      const owners = memberships.get(id) || [];
      owners.push(extra.n);
      memberships.set(id, owners);
    }));
    const duplicatedMemberships = [...memberships].filter(([, owners]) => owners.length > 1);
    if (duplicatedMemberships.length) {
      fail('extras.item.unique', `Há itemIds duplicados entre extras: ${JSON.stringify(duplicatedMemberships)}.`);
    }



    const cloneEntries = data?.editorial?.clone?.entries || [];
    cloneEntries.forEach((entry, index) => {
      if (!idSet.has(entry.id)) fail('clone.item', `Saga do Clone #${index + 1} referencia ID inexistente ${entry.id}.`);
      const item = items.find(candidate => candidate.id === entry.id);
      if (item && item.readingOrder !== entry.readingOrder) fail('clone.order', `Saga do Clone ID ${entry.id}: readingOrder divergente.`);
    });

    (links || []).forEach((group, groupIndex) => {
      const groupName = group.id || groupIndex + 1;
      (group.itemIds || []).forEach(id => {
        if (!idSet.has(Number(id))) {
          fail('links.item', `Grupo de link ${groupName} referencia ID inexistente ${id}.`);
        }
      });

      const validateDestinations = (entries, field) => {
        if (entries == null) return;
        if (!Array.isArray(entries)) {
          fail('links.field', `${field} deve ser uma lista no grupo ${groupName}.`);
          return;
        }
        entries.forEach((link, linkIndex) => {
          if (!link?.url || !link?.label) {
            fail(
              'links.entry',
              `Link incompleto em ${groupName}.${field}, posição ${linkIndex + 1}.`
            );
          }
        });
      };

      validateDestinations(group.links || [], 'links');
      validateDestinations(group.stores, 'stores');
      validateDestinations(group.libraries, 'libraries');

      if (
        group.brazilianEdition != null &&
        typeof group.brazilianEdition !== 'string'
      ) {
        fail(
          'links.brazilianEdition',
          `brazilianEdition deve ser texto no grupo ${groupName}.`
        );
      }
    });



    return {
      ok: errors.length === 0,
      errors,
      summary: {
        items: items.length,
        idsUnique: idSet.size,
        readingOrdersUnique: new Set(orders).size,
        extras: extras.length,
        cloneEntries: cloneEntries.length,
        linkGroups: (links || []).length,
        sources: sourceCount
      }
    };
  }

  window.SpiderValidator = { validate };
})();
