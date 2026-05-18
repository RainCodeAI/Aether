// lib/enrich.ts
import { AetherData, OntologyNode } from '@/types';

export interface EnrichSuggestion {
  nodeId: string;
  nodeLabel: string;
  field: string;
  currentValue: unknown;
  suggestedValue: unknown;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── City coordinate table ────────────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'new york':      { lat: 40.7128,  lng: -74.0060  },
  'new york city': { lat: 40.7128,  lng: -74.0060  },
  'nyc':           { lat: 40.7128,  lng: -74.0060  },
  'los angeles':   { lat: 34.0522,  lng: -118.2437 },
  'la':            { lat: 34.0522,  lng: -118.2437 },
  'chicago':       { lat: 41.8781,  lng: -87.6298  },
  'san francisco': { lat: 37.7749,  lng: -122.4194 },
  'sf':            { lat: 37.7749,  lng: -122.4194 },
  'seattle':       { lat: 47.6062,  lng: -122.3321 },
  'boston':        { lat: 42.3601,  lng: -71.0589  },
  'austin':        { lat: 30.2672,  lng: -97.7431  },
  'denver':        { lat: 39.7392,  lng: -104.9903 },
  'miami':         { lat: 25.7617,  lng: -80.1918  },
  'london':        { lat: 51.5074,  lng: -0.1278   },
  'paris':         { lat: 48.8566,  lng: 2.3522    },
  'berlin':        { lat: 52.5200,  lng: 13.4050   },
  'tokyo':         { lat: 35.6762,  lng: 139.6503  },
  'singapore':     { lat: 1.3521,   lng: 103.8198  },
  'sydney':        { lat: -33.8688, lng: 151.2093  },
  'toronto':       { lat: 43.6532,  lng: -79.3832  },
  'amsterdam':     { lat: 52.3676,  lng: 4.9041    },
  'dubai':         { lat: 25.2048,  lng: 55.2708   },
  'beijing':       { lat: 39.9042,  lng: 116.4074  },
  'mumbai':        { lat: 19.0760,  lng: 72.8777   },
  'bangalore':     { lat: 12.9716,  lng: 77.5946   },
  'sao paulo':     { lat: -23.5505, lng: -46.6333  },
};

// ─── Role suggestion by context ───────────────────────────────────────────────

const ROLE_KEYWORDS: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /engineer|dev|developer|coder|programmer/i,  role: 'Engineer'          },
  { pattern: /designer|ux|ui|creative/i,                  role: 'Designer'          },
  { pattern: /manager|lead|head|director/i,               role: 'Manager'           },
  { pattern: /analyst|data|science|scientist/i,           role: 'Analyst'           },
  { pattern: /sales|business\s?dev|account/i,             role: 'Sales'             },
  { pattern: /marketing|growth|seo|content/i,             role: 'Marketing'         },
  { pattern: /product|pm|owner/i,                         role: 'Product Manager'   },
  { pattern: /cto|ceo|coo|cfo|vp|chief/i,                 role: 'Executive'         },
  { pattern: /intern|junior|jr/i,                         role: 'Intern'            },
  { pattern: /research|phd|professor|scientist/i,         role: 'Researcher'        },
];

function inferRole(label: string, props: Record<string, any>): string | null {
  const text = [label, props.title, props.position, props.department].filter(Boolean).join(' ');
  for (const { pattern, role } of ROLE_KEYWORDS) {
    if (pattern.test(text)) return role;
  }
  return null;
}

// ─── Status suggestion for projects ──────────────────────────────────────────

function inferProjectStatus(props: Record<string, any>): string | null {
  const progress = Number(props.progress);
  if (!props.status) {
    if (!isNaN(progress)) {
      if (progress === 0)   return 'Planning';
      if (progress >= 100)  return 'Complete';
      if (progress < 25)    return 'At Risk';
      return 'Active';
    }
  }
  return null;
}

// ─── Main analysis function ───────────────────────────────────────────────────

export function analyzeEnrichment(data: AetherData): EnrichSuggestion[] {
  const suggestions: EnrichSuggestion[] = [];

  for (const node of data.nodes) {
    // Location nodes: suggest coordinates from city name
    if (node.type === 'Location') {
      const hasCoords = node.properties.coordinates || node.properties.lat || node.properties.lng;
      if (!hasCoords) {
        const key = node.label.toLowerCase().trim();
        const coords = CITY_COORDS[key];
        if (coords) {
          suggestions.push({
            nodeId: node.id,
            nodeLabel: node.label,
            field: 'coordinates',
            currentValue: null,
            suggestedValue: coords,
            reason: `Known coordinates for "${node.label}"`,
            confidence: 'high',
          });
        }
      }
    }

    // Person nodes: suggest role if missing
    if (node.type === 'Person') {
      if (!node.properties.role && !node.properties.title && !node.properties.position) {
        const inferred = inferRole(node.label, node.properties);
        if (inferred) {
          suggestions.push({
            nodeId: node.id,
            nodeLabel: node.label,
            field: 'role',
            currentValue: null,
            suggestedValue: inferred,
            reason: `Inferred from name/label keywords`,
            confidence: 'medium',
          });
        }
      }

      // Suggest email domain if email is missing but company is present
      if (!node.properties.email && node.properties.company) {
        const domain = String(node.properties.company)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 20);
        const firstName = node.label.split(/\s+/)[0].toLowerCase();
        suggestions.push({
          nodeId: node.id,
          nodeLabel: node.label,
          field: 'email',
          currentValue: null,
          suggestedValue: `${firstName}@${domain}.com`,
          reason: `Generated from name + company`,
          confidence: 'low',
        });
      }
    }

    // Project nodes: suggest status from progress
    if (node.type === 'Project') {
      const status = inferProjectStatus(node.properties);
      if (status) {
        suggestions.push({
          nodeId: node.id,
          nodeLabel: node.label,
          field: 'status',
          currentValue: node.properties.status ?? null,
          suggestedValue: status,
          reason: `Derived from progress value (${node.properties.progress}%)`,
          confidence: 'high',
        });
      }

      // Suggest priority if missing and budget is present
      if (!node.properties.priority && node.properties.budget) {
        const budget = Number(node.properties.budget);
        const priority = budget > 500000 ? 'high' : budget > 100000 ? 'medium' : 'low';
        suggestions.push({
          nodeId: node.id,
          nodeLabel: node.label,
          field: 'priority',
          currentValue: null,
          suggestedValue: priority,
          reason: `Derived from budget ($${budget.toLocaleString()})`,
          confidence: 'medium',
        });
      }
    }

    // Metric nodes: suggest unit if missing
    if (node.type === 'Metric') {
      if (!node.properties.unit && node.properties.value !== undefined) {
        const label = node.label.toLowerCase();
        const unit =
          /revenue|cost|budget|spend|sales/i.test(label) ? 'USD'     :
          /rate|percent|%/i.test(label)                   ? '%'       :
          /count|number|users|people/i.test(label)         ? 'count'   :
          /score|index|nps/i.test(label)                   ? 'score'   :
          null;
        if (unit) {
          suggestions.push({
            nodeId: node.id,
            nodeLabel: node.label,
            field: 'unit',
            currentValue: null,
            suggestedValue: unit,
            reason: `Inferred from metric name`,
            confidence: 'medium',
          });
        }
      }
    }
  }

  return suggestions;
}

// ─── Apply accepted suggestions ───────────────────────────────────────────────

export function applyEnrichment(
  data: AetherData,
  accepted: EnrichSuggestion[],
): AetherData {
  const acceptedMap = new Map<string, EnrichSuggestion[]>();
  for (const s of accepted) {
    if (!acceptedMap.has(s.nodeId)) acceptedMap.set(s.nodeId, []);
    acceptedMap.get(s.nodeId)!.push(s);
  }

  return {
    ...data,
    nodes: data.nodes.map(node => {
      const patches = acceptedMap.get(node.id);
      if (!patches) return node;
      const newProps = { ...node.properties };
      for (const p of patches) newProps[p.field] = p.suggestedValue;
      return { ...node, properties: newProps };
    }),
  };
}
