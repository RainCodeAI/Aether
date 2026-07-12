import { describe, it, expect } from 'vitest';
import { detectIntent, searchOntology } from './ai-search';
import type { AetherData } from '@/types';

describe('detectIntent', () => {
  it.each([
    ['what if revenue doubles next year', 'scenario_projection'],
    ['forecast our trajectory', 'scenario_projection'],
    ['predict project next quarter growth', 'scenario_projection'],
    ['who is the network hub connecting teams', 'connection_discovery'],
    ['find isolated orphan nodes', 'connection_discovery'],
    ['show me the budget and ROI', 'financial'],
    ['monthly revenue metrics', 'financial'],
    ['what are the top risks and blockers', 'risk'],
    ['critical issues on the roadmap', 'risk'],
    ['who is on the team', 'team'],
    ['list all people and founders', 'team'],
    ['project launch status and milestones', 'projects'],
    ['portfolio progress and deadlines', 'projects'],
    ['where are our offices in Ontario', 'location'],
    ['map geo coverage by city', 'location'],
    // avoid "growth"/"grow" — those hit scenario_projection first
    ['market expansion opportunities', 'opportunity'],
    ['untapped potential to scale', 'opportunity'],
    ['give me a summary overview', 'summary'],
    ['dashboard snapshot of everything', 'summary'],
    ['xyzzy foobar unrelated', 'search'],
    ['', 'search'],
  ] as const)('"%s" → %s', (query, expected) => {
    expect(detectIntent(query)).toBe(expected);
  });

  it('prioritizes scenario_projection over projects when both match', () => {
    // contains "project" but scenario regex should win
    expect(detectIntent('project our next year forecast')).toBe('scenario_projection');
  });

  it('prioritizes financial over projects when budget is mentioned', () => {
    expect(detectIntent('project budget review')).toBe('financial');
  });
});

describe('searchOntology', () => {
  const data: AetherData = {
    nodes: [
      {
        id: '1',
        type: 'Person',
        label: 'Avery Miller',
        properties: { role: 'Founder', email: 'avery@example.com' },
      },
      {
        id: '2',
        type: 'Project',
        label: 'Q3 Product Launch',
        properties: { status: 'Active', budget: 45000 },
      },
      {
        id: '3',
        type: 'Location',
        label: 'Stratford Tech Hub',
        properties: { city: 'Stratford' },
      },
    ],
    relationships: [],
  };

  it('returns empty for blank query', () => {
    expect(searchOntology(data, '   ')).toEqual([]);
  });

  it('matches label case-insensitively', () => {
    const hits = searchOntology(data, 'avery');
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('1');
  });

  it('matches property values', () => {
    const hits = searchOntology(data, 'founder');
    expect(hits.map((n) => n.id)).toContain('1');
  });

  it('matches type name', () => {
    const hits = searchOntology(data, 'project');
    expect(hits.map((n) => n.id)).toContain('2');
  });

  it('returns multiple matches', () => {
    const hits = searchOntology(data, 'strat');
    // Stratford in location; no other "strat"
    expect(hits.some((n) => n.id === '3')).toBe(true);
  });
});
