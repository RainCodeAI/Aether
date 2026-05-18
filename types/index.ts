// types/index.ts
export type EntityType =
  | 'Person'
  | 'Project'
  | 'Location'
  | 'Metric'
  | 'Insight'
  | 'Event'
  | 'Document';

export interface OntologyNode {
  id: string;
  type: EntityType;
  label: string;
  properties: Record<string, any>;
  tags?: string[];
  createdAt?: string;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string; // e.g. "worksOn", "locatedAt", "hasMetric", "participatedIn"
  properties?: Record<string, any>;
}

export interface AetherData {
  nodes: OntologyNode[];
  relationships: Relationship[];
}

export interface Workspace {
  id: string;
  name: string;
  owner: string;
  members: string[];
  createdAt: string;
  sharedNodes: string[];
  sharedRelationships: string[];
}
