// lib/ontology.ts
import { OntologyNode, Relationship, AetherData } from '@/types';

export const mockNodes: OntologyNode[] = [
  {
    id: "p1",
    type: "Person",
    label: "Avery Miller",
    properties: { role: "Founder", email: "avery@stratford.ca", location: "Stratford, ON" },
    createdAt: "2026-05-01"
  },
  {
    id: "proj1",
    type: "Project",
    label: "Q3 Product Launch",
    properties: { status: "Active", budget: 45000, priority: "High" },
    createdAt: "2026-04-15"
  },
  {
    id: "loc1",
    type: "Location",
    label: "Stratford Tech Hub",
    properties: { city: "Stratford", province: "Ontario", type: "Office" },
    createdAt: "2026-01-10"
  },
  // We'll add more soon
];

export const mockRelationships: Relationship[] = [
  {
    id: "r1",
    from: "p1",
    to: "proj1",
    type: "worksOn",
    properties: { role: "Lead" }
  },
  {
    id: "r2",
    from: "proj1",
    to: "loc1",
    type: "locatedAt"
  }
];

export const initialAetherData: AetherData = {
  nodes: mockNodes,
  relationships: mockRelationships
};
