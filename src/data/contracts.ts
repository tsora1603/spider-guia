import type { z } from 'zod';
import type {
  ExtraSchema,
  CloneEntrySchema,
  FaseSchema,
  MarcoSchema,
  MethodologyEntrySchema,
  ChangelogEntrySchema,
  ExtraConfirmationPolicySchema
} from '../../data/schema.mjs';
import type { CloneGuide } from '../clone-guide/model';
import type { EditorialLinkGroup } from '../links/types';

export type EditorialExtra = z.infer<typeof ExtraSchema>;
export type CloneEntry = z.infer<typeof CloneEntrySchema>;
export type CloneReference = Pick<CloneEntry, 'id' | 'arcId' | 'sourceOrder'> & Partial<CloneEntry>;
export type JourneyPhase = Extract<z.infer<typeof FaseSchema>, { kind: 'phase' }>;
export type Milestone = z.infer<typeof MarcoSchema>;
export interface CatalogChunk {
  phase: string;
  itemFields: string[];
  items: unknown[][];
}
export interface ChunkDescriptor {
  key: string;
  file: string;
  phase: string;
  itemIds: number[];
  firstReadingOrder: number;
  lastReadingOrder: number;
}
export interface EditorialData {
  extras: EditorialExtra[];
  links: EditorialLinkGroup[];
  clone: { entries: CloneReference[]; guide: CloneGuide };
  metodologia: z.infer<typeof MethodologyEntrySchema>[];
  changelog: z.infer<typeof ChangelogEntrySchema>[];
  sourcesAppended: number;
  confirmationPolicy: z.infer<typeof ExtraConfirmationPolicySchema>;
}
export interface RuntimeIndex {
  itemIndexFields: string[];
  itemIndex: unknown[][];
  catalogChunks: ChunkDescriptor[];
  fases: { h: string[]; r: unknown[][] };
  marcos: { h: string[]; r: unknown[][] };
  pular: { h: string[]; r: unknown[][] };
  fontes: { h: string[]; r: string[][] };
  glossario: { h: string[]; r: string[][] };
  schemaVersion: number;
  editorialVersion: number;
  editorial: EditorialData;
}
