import type { EditorialCoverage, EditorialLinkGroup, EditorialDestination } from '../src/links/types';
export function formatCoverage(coverage: EditorialCoverage[]): string;
export function resolveExtraId(group: EditorialLinkGroup, destination?: EditorialDestination): number | null;
export function validateCoverage(coverage: EditorialCoverage[], path: string, fail: (code:string, message:string)=>void): void;
export function validateEditorialLinks(groups: EditorialLinkGroup[], options?: { knownItemIds?: Set<number>; extras?: Array<{ n:number; readingGroup?:number|null; itemIds?:number[] }> }): Array<{code:string;message:string}>;
