import { readFileSync } from 'node:fs';
import {
  createLinkAssociations,
  linkTargetsForCloneStep,
  linkTargetsForItems
} from '../../src/links/associations';
import type { EditorialLinkGroup } from '../../src/links/types';
import type { CloneGuide } from '../../src/clone-guide/model';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const groups = read('data/src/editorial/links.json') as EditorialLinkGroup[];
const clone = read('data/src/editorial/clone.json') as {
  guide: CloneGuide;
  entries: { arcId: string }[];
};
export const configuredCatalog = (read('data/src/manifest.json').catalogFiles as string[]).flatMap(
  (file) =>
    read(`data/src/${file}`).items as {
      id: number;
      historicalNumber: number | null;
      type: string;
    }[]
);
const volumes = clone.guide.sections[0].steps.map((step) => ({
  id: step.checklistId!,
  historicalNumber: null,
  type: 'Volume Panini'
}));
export const configuredReadings = [...configuredCatalog, ...volumes];
const associations = createLinkAssociations(
  groups,
  configuredReadings,
  read('data/src/editorial/extras.json'),
  new Set(clone.entries.map((entry) => entry.arcId))
);

export const configuredCloneSteps = clone.guide.sections[0].steps;
export const configuredStepLinks = (stepId: string) =>
  linkTargetsForCloneStep(
    associations,
    clone.guide.sections.flatMap((section) => section.steps).find((step) => step.id === stepId)!
  );
export const configuredItemLinks = (ids: number[]) => linkTargetsForItems(associations, ids);
