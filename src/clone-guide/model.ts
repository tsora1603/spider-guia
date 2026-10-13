export interface CloneGuideStep {
  id: string;
  number: number;
  title: string;
  edition: string;
  read: string;
  note: string;
  format: string;
  originals: string[];
  itemIds: number[];
  arcIds: string[];
  complement: string;
}

export interface CloneGuideSection {
  id: string;
  title: string;
  description: string;
  steps: CloneGuideStep[];
}

export interface CloneGuide {
  title: string;
  intro: string[];
  legend: string;
  sections: CloneGuideSection[];
  notes: Array<{ title: string; body: string }>;
  sources: Array<{ title: string; description: string; url?: string }>;
}

/** A HQ pode ter contos em mais de um volume. O progresso continua sendo único por ID. */
export function cloneGuideItemIds(sections: readonly CloneGuideSection[]): number[] {
  return [...new Set(sections.flatMap((section) => section.steps.flatMap((step) => step.itemIds)))];
}

export function findCloneGuideStep(guide: CloneGuide, stepId: string | null) {
  if (!stepId) return null;
  for (const section of guide.sections) {
    const step = section.steps.find((candidate) => candidate.id === stepId);
    if (step) return { section, step };
  }
  return null;
}
