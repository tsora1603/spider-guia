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
  /** Define a ficha de Extras deste destino; null suprime o alvo herdado. */
  extraTarget?: number | null;
}

export type EditorialLinkTarget =
  | { kind: 'items'; ids: number[] }
  | { kind: 'historical'; ranges: IssueRange[] }
  | { kind: 'extra'; id: number }
  | { kind: 'cloneArc'; id: string };

export interface EditorialLinkGroup {
  id: string;
  title: string;
  coverage?: EditorialCoverage[];
  notes?: string;
  /** Compatibilidade de dados antigos; novas entradas devem usar notes. */
  context?: string;
  /** Fonte única das associações contextuais da Checklist, Extras e Saga do Clone. */
  targets?: EditorialLinkTarget[];
  links: EditorialDestination[];
  stores?: EditorialDestination[];
  libraries?: EditorialDestination[];
}
