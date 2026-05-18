// lib/data.ts
import { OntologyNode, Relationship, AetherData } from '@/types';

export const mockNodes: OntologyNode[] = [
  {
    id: "p1",
    type: "Person",
    label: "Avery Miller",
    properties: {
      role: "Founder",
      email: "avery@stratford.ca",
      location: "Stratford, ON",
      joined: "2024"
    },
    createdAt: "2026-05-01"
  },
  {
    id: "proj1",
    type: "Project",
    label: "Q3 Product Launch",
    properties: {
      status: "Active",
      budget: 45000,
      priority: "High",
      progress: 65
    },
    createdAt: "2026-04-15"
  },
  {
    id: "proj2",
    type: "Project",
    label: "Ontario Market Expansion",
    properties: {
      status: "Planning",
      budget: 28000,
      priority: "Medium"
    },
    createdAt: "2026-03-20"
  },
  {
    id: "loc1",
    type: "Location",
    label: "Stratford Tech Hub",
    properties: {
      city: "Stratford",
      province: "Ontario",
      type: "Office",
      coordinates: { lat: 43.37, lng: -80.98 }
    },
    createdAt: "2026-01-10"
  },
  {
    id: "m1",
    type: "Metric",
    label: "Monthly Revenue",
    properties: { value: 12400, unit: "CAD", trend: "up" },
    createdAt: "2026-05-01"
  }
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
  },
  {
    id: "r3",
    from: "p1",
    to: "proj2",
    type: "worksOn",
    properties: { role: "Advisor" }
  },
  {
    id: "r4",
    from: "proj1",
    to: "m1",
    type: "hasMetric"
  }
];

export const initialAetherData: AetherData = {
  nodes: mockNodes,
  relationships: mockRelationships
};
