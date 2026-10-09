/** Edição/intervalo editorial independente dos IDs de progresso. */
export interface IssueRange {
  start: number;
  end: number;
}

export type EditorialCoverage =
  | { type: 'lgy'; ranges: IssueRange[]; series?: string; volume?: string; suffix?: string }
  | { type: 'series'; series: string; volume?: string; ranges: IssueRange[]; suffix?: string }
  | { type: 'one-shot'; series: string; volume?: string };

export interface EditorialDestination {
  label: string;
  url: string;
  /** Substitui (não soma) a cobertura do grupo quando o destino é mais específico. */
  coverage?: EditorialCoverage[];
  /** Sobrescreve extraId do grupo; null indica destino sem ficha própria. */
  extraId?: number | null;
}

export interface EditorialLinkGroup {
  id: string;
  title: string;
  coverage?: EditorialCoverage[];
  notes?: string;
  /** Compatibilidade de dados antigos; novas entradas devem usar notes. */
  context?: string;
  itemIds?: number[];
  /** Referência explícita ao campo estável `n` de editorial.extras. */
  extraId?: number;
  /** Campo legado, mantido até a migração do consumidor em outra etapa. */
  readingGroup?: number;
  links: EditorialDestination[];
  stores?: EditorialDestination[];
  libraries?: EditorialDestination[];
}
