import type { AdvisorEdit } from '@web/api/client.js';

import type { Dict } from '../i18n/en.js';
import type { DraftPlot, EdgeClass, Hierarchy, RulesForm } from './model.js';

/*
  WHAT CLAUDE MAY PROPOSE TO CHANGE, AND WHAT EACH FIELD ACCEPTS.

  Eng. Mohamed, 16 Oct 2026: «وامكانيه كلود التعديل على المدخلات كتحسين … وكل شئ
  بناء على كود دبي». So the review may come back with edits to the reader's own
  inputs, each resting on a clause of the Dubai Building Code — and the server
  has already dropped any whose clause is not in the code text it was given.

  An edit is a proposal on the screen until the reader presses Apply. Then it is
  exactly what typing the value would have been: the reader's input, sent under
  the reader's name, recomputed only when the reader computes. Nothing here is a
  source of a figure — a model's value entering a run unasked would be a number
  with no provenance, the one thing this product refuses.

  The list is short on purpose. A limit the affection plan states or is silent on
  (FAR, GFA, height, coverage) is not here: those come from instruments, and a
  proposal to fill one would be the borrowing the intake exists to stop. The mix
  is not here either: it is the developer's commercial choice, not the code's.
*/

const LEVELS = /^(?:[0-9]|1[0-2])$/;
const AREA = /^\d{1,5}(?:\.\d{1,2})?$/;
const METRES = /^\d{1,2}(?:\.\d{1,2})?$/;
const CLASSES: readonly EdgeClass[] = ['ROAD', 'ADJACENT_PLOT', 'OPEN_SPACE', 'OTHER'];
const HIERARCHIES: readonly Hierarchy[] = ['ARTERIAL', 'COLLECTOR', 'LOCAL', 'ACCESS'];

type RulesField = 'basements' | 'groundIsParking' | 'podiumAboveGround' | 'podiumParkingLevels' | 'coreArea';
const RULES: Readonly<Record<RulesField, (v: string) => boolean>> = {
  basements: (v) => LEVELS.test(v),
  groundIsParking: (v) => v === 'yes' || v === 'no',
  podiumAboveGround: (v) => LEVELS.test(v),
  podiumParkingLevels: (v) => LEVELS.test(v),
  coreArea: (v) => AREA.test(v) && Number(v) > 0,
};
const RULES_FIELDS = Object.keys(RULES) as RulesField[];

/** Boundaries are numbered from 1 here, as the plot step numbers them. */
const EDGE = /^boundary\.(\d{1,2})\.(class|road|towerSetback)$/;

/** Every field Claude may propose for, with its value now. */
export function editableFields(draft: DraftPlot, rules: RulesForm): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of RULES_FIELDS) out[`rules.${f}`] = rules[f];
  draft.edges.forEach((e, i) => {
    out[`boundary.${i + 1}.class`] = e.classification;
    out[`boundary.${i + 1}.road`] = e.roadHierarchy;
    out[`boundary.${i + 1}.towerSetback`] = e.towerSetback ?? '';
  });
  return out;
}

/** Whether the value is one the field could hold; the screen offers nothing else. */
export function acceptable(edit: AdvisorEdit, fields: Readonly<Record<string, string>>): boolean {
  if (!(edit.field in fields) || fields[edit.field] === edit.value) return false;
  const v = edit.value.trim();
  if (edit.field.startsWith('rules.')) return RULES[edit.field.slice(6) as RulesField]?.(v) ?? false;
  const m = EDGE.exec(edit.field);
  if (!m) return false;
  if (m[2] === 'class') return (CLASSES as readonly string[]).includes(v);
  if (m[2] === 'road') return (HIERARCHIES as readonly string[]).includes(v);
  return METRES.test(v);
}

/** Does this edit change what the plot is filed as? Then the plot goes back to unfiled, as typing it would. */
export const refilesPlot = (edit: AdvisorEdit): boolean => /^boundary\.\d+\.(class|road)$/.test(edit.field);

/** The inputs with the edits the reader applied; any that does not fit its field is left out. */
export function applyEdits(
  draft: DraftPlot,
  rules: RulesForm,
  edits: readonly AdvisorEdit[],
): { readonly draft: DraftPlot; readonly rules: RulesForm } {
  const fields = editableFields(draft, rules);
  let nextRules: RulesForm = rules;
  const edges = draft.edges.map((e) => ({ ...e }));
  for (const edit of edits) {
    if (!acceptable(edit, fields)) continue;
    const v = edit.value.trim();
    if (edit.field.startsWith('rules.')) {
      nextRules = { ...nextRules, [edit.field.slice(6)]: v };
      continue;
    }
    const m = EDGE.exec(edit.field)!;
    const e = edges[Number(m[1]) - 1];
    if (!e) continue;
    if (m[2] === 'class') {
      e.classification = v as EdgeClass;
      if (v !== 'ROAD') e.roadHierarchy = '';
    } else if (m[2] === 'road') {
      e.roadHierarchy = v as Hierarchy;
    } else {
      e.towerSetback = v;
    }
  }
  return { draft: { ...draft, edges }, rules: nextRules };
}

/** The field and a value, in the reader's words. */
export function describeField(t: Dict, field: string): string {
  if (field.startsWith('rules.')) {
    const f = field.slice(6) as RulesField;
    return {
      basements: t.rules.basements,
      groundIsParking: t.rules.groundParking,
      podiumAboveGround: t.rules.podiumAbove,
      podiumParkingLevels: t.rules.podiumParking,
      coreArea: t.rules.core,
    }[f];
  }
  const m = EDGE.exec(field);
  if (!m) return field;
  const n = Number(m[1]);
  return m[2] === 'class' ? t.advisor.boundaryKind(n) : m[2] === 'road' ? t.plot.hierarchyOf(n) : t.plot.towerSetbackOf(n);
}

export function describeValue(t: Dict, field: string, value: string): string {
  if (value === '') return t.advisor.blank;
  if (field === 'rules.groundIsParking') return value === 'yes' ? t.common.yes : value === 'no' ? t.common.no : value;
  if (field.endsWith('.class')) return (t.plot.cls as Record<string, string>)[value] ?? value;
  if (field.endsWith('.road')) return (t.plot.road as Record<string, string>)[value] ?? value;
  return value;
}
