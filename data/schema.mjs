import { z } from 'zod';

export const WeightSchema = z.enum(['● Essencial', '◐ Contexto', '○ Opcional']);
export const ConfirmationSchema = z.enum(['Confirmado', 'Parcial', 'A confirmar']);
export const ExtraConfirmationCriteriaSchema = z
  .object({
    position: z.enum(['source-only', 'not-met']),
    weight: z.enum(['evidence-led-60-40', 'not-met'])
  })
  .strict();
export const ExtraConfirmationPolicySchema = z
  .object({
    position: z
      .object({
        minimumEvidencePercent: z.literal(100),
        maximumDeductionPercent: z.literal(0)
      })
      .strict(),
    weight: z
      .object({
        minimumEvidencePercent: z.literal(60),
        maximumDeductionPercent: z.literal(40)
      })
      .strict()
  })
  .strict();
export const SpoilerLevelSchema = z.enum(['leve', 'forte']);
export const SpoilerPartSchema = z
  .object({ text: z.string(), spoiler: SpoilerLevelSchema.optional() })
  .strict();
export const SpoilerTextSchema = z.union([
  z.string(),
  z.object({ text: z.string(), spoiler: SpoilerLevelSchema }).strict(),
  z.object({ parts: z.array(SpoilerPartSchema).min(1) }).strict()
]);

export const ItemSchema = z.object({
  id: z.number().int().positive(),
  historicalNumber: z.number().int().positive().nullable(),
  type: z.string().min(1),
  series: z.string().min(1),
  issue: z.string(),
  phase: z.string().min(1),
  weight: WeightSchema,
  instructions: z.string(),
  readingOrder: z.number().int().positive(),
  note: z.string()
});

export const CatalogPhaseSchema = z.object({
  phase: z.string().min(1),
  items: z.array(ItemSchema).min(1)
});

export const FaseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('phase'),
    historicalStart: z.number().int().positive(),
    historicalEnd: z.number().int().positive(),
    name: z.string().min(1),
    creators: z.string(),
    highlights: SpoilerTextSchema,
    notes: z.string()
  }),
  z.object({
    kind: z.literal('summary'),
    label: z.string().min(1),
    name: z.string(),
    creators: z.string(),
    highlights: SpoilerTextSchema,
    notes: z.string()
  })
]);

export const ExtraSchema = z
  .object({
    n: z.number().int().positive(),
    after: z.number().int().nonnegative(),
    weight: WeightSchema,
    name: z.string().min(1),
    sequence: z.string(),
    why: SpoilerTextSchema,
    confirmation: ConfirmationSchema,
    confirmationNote: z.string().optional(),
    howMuch: z.string(),
    itemIds: z.array(z.number().int().positive()).min(1),
    readingGroup: z.number().int().positive().nullable().optional(),
    unavailable: z.boolean().optional(),
    where: z.tuple([z.string(), z.number().int().nonnegative()]).nullable().optional(),
    links: z.array(z.tuple([z.string(), z.string()])).optional(),
    category: z.string().min(1),
    newItem: z.boolean(),
    special: z.string(),
    positionEvidence: z.string().optional(),
    weightEvidence: z.string().optional(),
    confirmationCriteria: ExtraConfirmationCriteriaSchema,
    confirmationDetail: z.string().optional(),
    src: z.array(z.number().int().nonnegative()).optional(),
    just: z.string().optional()
  })
  .strict()
  .superRefine((extra, ctx) => {
    const criteriaPass =
      extra.confirmationCriteria.position === 'source-only' &&
      extra.confirmationCriteria.weight === 'evidence-led-60-40';
    const statusConfirmed = extra.confirmation === 'Confirmado';
    if (criteriaPass !== statusConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmation'],
        message: statusConfirmed
          ? 'Confirmado exige posição 100% baseada em fontes e peso no critério 60/40.'
          : 'Os dois critérios passaram; o status deve ser Confirmado.'
      });
    }
  });

// Estrutura dos Links canônicos em JSON. Regras semânticas de IDs,
// cobertura sobreposta, URLs e associações são centralizadas em link-model.mjs.
const LinkRangeSchema = z.object({ start: z.number().int(), end: z.number().int() }).strict();
export const LinkCoverageSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('lgy'),
      ranges: z.array(LinkRangeSchema).min(1),
      series: z.string().optional(),
      volume: z.string().optional(),
      suffix: z.string().optional()
    })
    .strict(),
  z
    .object({
      type: z.literal('series'),
      series: z.string().min(1),
      ranges: z.array(LinkRangeSchema).min(1),
      volume: z.string().optional(),
      suffix: z.string().optional()
    })
    .strict(),
  z
    .object({
      type: z.literal('one-shot'),
      series: z.string().min(1),
      volume: z.string().optional()
    })
    .strict()
]);
const LinkDestinationSchema = z
  .object({
    label: z.string().min(1),
    url: z.string().min(1),
    coverage: z.array(LinkCoverageSchema).min(1).optional(),
    extraId: z.number().int().positive().nullable().optional()
  })
  .strict();
export const EditorialLinkGroupSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    coverage: z.array(LinkCoverageSchema).min(1).optional(),
    notes: z.string().optional(),
    context: z.string().optional(),
    itemIds: z.array(z.number().int().positive()).min(1).optional(),
    extraId: z.number().int().positive().optional(),
    readingGroup: z.number().int().positive().optional(),
    links: z.array(LinkDestinationSchema).min(1),
    stores: z.array(LinkDestinationSchema).optional(),
    libraries: z.array(LinkDestinationSchema).optional()
  })
  .strict();

export const EditorialMetaSchema = z
  .object({
    sourcesAppended: z.number().int().nonnegative(),
    editorialVersion: z.number().int().positive(),
    extraConfirmationPolicy: ExtraConfirmationPolicySchema
  })
  .strict();

export const CloneEntrySchema = z.object({
  id: z.number().int().positive(),
  readingOrder: z.number().int().positive(),
  phase: z.string().min(1),
  crossover: z.string(),
  part: z.string(),
  note: SpoilerTextSchema,
  sourceOrder: z.number().int().positive()
});

export const CloneSchema = z.object({
  entries: z.array(CloneEntrySchema)
});

export const MarcoSchema = z.object({
  year: z.string(),
  title: z.string().min(1),
  description: SpoilerTextSchema,
  whereToRead: z.string(),
  historicalStart: z.number().int().positive().nullable(),
  historicalEnd: z.number().int().positive().nullable(),
  weight: WeightSchema
});

// View derivada para os cards de leitura. Não é persistida como DATA.leituras.
const EditorialLinkSchema = z.tuple([z.string(), z.string()]);
const ReadingAnchorSchema = z.tuple([z.string(), z.number().int().nonnegative()]);

export const LeituraSchema = z.object({
  n: z.number().int().positive(),
  after: z.number().int().nonnegative(),
  weight: WeightSchema,
  name: z.string().min(1),
  unavailable: z.boolean(),
  sequence: z.string(),
  why: SpoilerTextSchema,
  confirmation: ConfirmationSchema,
  howMuch: z.string(),
  where: ReadingAnchorSchema.nullable(),
  links: z.array(EditorialLinkSchema),
  itemIds: z.array(z.number().int().positive()).min(1),
  sourceRefs: z.array(z.number().int().nonnegative()),
  justification: z.string()
});

export const SkipRuleSchema = z.object({
  recommendation: z.string(),
  item: z.string(),
  range: z.string(),
  weight: z.string(),
  rule: z.string()
});

export const SourceSchema = z.object({
  source: z.string(),
  usedFor: z.string(),
  link: z.string()
});

export const GlossaryEntrySchema = z.object({
  term: z.string(),
  definition: z.string(),
  example: z.string()
});

export const MethodologyEntrySchema = z.object({
  title: z.string(),
  body: z.string()
});

export const ChangelogEntrySchema = z.object({
  date: z.string(),
  title: z.string(),
  body: z.string()
});
