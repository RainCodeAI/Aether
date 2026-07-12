// Shared relationship type catalogue for connect + edit UIs

export interface RelationshipTypeOption {
  value: string;
  label: string;
}

export const RELATIONSHIP_TYPES: RelationshipTypeOption[] = [
  { value: 'worksOn', label: 'Works On' },
  { value: 'locatedAt', label: 'Located At' },
  { value: 'hasMetric', label: 'Has Metric' },
  { value: 'hasDocument', label: 'Has Document' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'owns', label: 'Owns' },
  { value: 'impacts', label: 'Impacts' },
  { value: 'participatedIn', label: 'Participated In' },
  { value: 'reportsTo', label: 'Reports To' },
  { value: 'dependsOn', label: 'Depends On' },
  { value: 'relatedTo', label: 'Related To' },
  { value: 'hasAnalysis', label: 'Has Analysis' },
];

export function relationshipTypeLabel(type: string): string {
  return RELATIONSHIP_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Ensure custom types still appear in the select. */
export function relationshipTypeOptions(current?: string): RelationshipTypeOption[] {
  if (!current || RELATIONSHIP_TYPES.some((t) => t.value === current)) {
    return RELATIONSHIP_TYPES;
  }
  return [{ value: current, label: current }, ...RELATIONSHIP_TYPES];
}
