import fs from 'node:fs/promises';
import path from 'node:path';
import { SRC_DIR, ROOT, readJson } from './lib/data-utils.mjs';
import { isAnnotatedText } from './lib/spoiler-data.mjs';

const extras = await readJson(path.join(SRC_DIR, 'editorial', 'extras.json'));
const clone = await readJson(path.join(SRC_DIR, 'editorial', 'clone.json'));
const marcos = await readJson(path.join(SRC_DIR, 'marcos.json'));
const fases = await readJson(path.join(SRC_DIR, 'fases.json'));
const review = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'review', 'spoiler-suggestions.json'), 'utf8'));

const counts = {
  extrasWhy: extras.filter(entry => isAnnotatedText(entry.why)).length,
  cloneNotes: clone.entries.filter(entry => entry.note && isAnnotatedText(entry.note)).length,
  marcoDescriptions: marcos.filter(entry => entry.description && isAnnotatedText(entry.description)).length,
  faseHighlights: fases.filter(entry => entry.highlights && isAnnotatedText(entry.highlights)).length
};
const checks = {
  allExtraWhyMigrated: counts.extrasWhy === extras.length,
  allExistingCloneNotesMigrated: counts.cloneNotes === clone.entries.filter(entry => entry.note).length,
  allMarcoDescriptionsMigrated: counts.marcoDescriptions === marcos.filter(entry => entry.description).length,
  allFaseHighlightsMigrated: counts.faseHighlights === fases.filter(entry => entry.highlights).length,
  suggestionsExist: review.summary.total > 0 && review.suggestions.length === review.summary.total,
  suggestionsNotApplied: review.summary.appliedAutomatically === 0 && review.suggestions.every(entry => entry.decision === 'pending'),
  suggestionLevelsValid: review.suggestions.every(entry => entry.suggestedLevel === 'leve' || entry.suggestedLevel === 'forte')
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, counts, suggestionSummary: review.summary, checks }, null, 2));
if (!ok) process.exit(1);
