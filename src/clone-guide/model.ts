export interface CloneGuideStep {
  id: string;
  checklistId?: number;
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

/** Volumes têm progresso próprio; as HQs americanas ficam como referência de cobertura. */
export function cloneStepItemIds(step: CloneGuideStep): number[] {
  return step.checklistId ? [step.checklistId] : step.itemIds;
}

export function cloneGuideItemIds(sections: readonly CloneGuideSection[]): number[] {
  return [
    ...new Set(
      sections.flatMap((section) => section.steps.flatMap((step) => cloneStepItemIds(step)))
    )
  ];
}

export function findCloneGuideStep(guide: CloneGuide, stepId: string | null) {
  if (!stepId) return null;
  for (const section of guide.sections) {
    const step = section.steps.find((candidate) => candidate.id === stepId);
    if (step) return { section, step };
  }
  return null;
}
