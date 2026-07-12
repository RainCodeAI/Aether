import { describe, it, expect } from 'vitest';
import {
  buildStaticCommands,
  filterCommands,
  scoreCommand,
  entityCommands,
  type PaletteHandlers,
} from './command-palette';
import type { OntologyNode } from '@/types';

const noop = () => {};
const handlers: PaletteHandlers = {
  go: noop,
  newEntity: noop,
  openAI: noop,
  openPDF: noop,
  openReport: noop,
  openShortcuts: noop,
  importJSON: noop,
  exportJSON: noop,
  surprise: noop,
  selectEntity: noop,
  openPathFinder: noop,
  focusSelectedNeighborhood: noop,
  applyTemplate: noop,
  undo: noop,
  redo: noop,
};

describe('command palette ranking', () => {
  const statics = buildStaticCommands(handlers);

  it('builds a non-empty static command list', () => {
    expect(statics.length).toBeGreaterThan(10);
    expect(statics.some((c) => c.id === 'nav-dashboard')).toBe(true);
    expect(statics.some((c) => c.id === 'ai-analyse')).toBe(true);
  });

  it('matches navigation by partial label', () => {
    const hits = filterCommands(statics, 'kanban');
    expect(hits[0]?.id).toBe('nav-kanban');
  });

  it('matches by keyword', () => {
    const hits = filterCommands(statics, 'snapshot');
    expect(hits.some((c) => c.id === 'nav-data')).toBe(true);
  });

  it('prefers exact / prefix matches', () => {
    const cmd = statics.find((c) => c.id === 'act-new-entity')!;
    expect(scoreCommand(cmd, 'new entity')).toBeLessThan(
      scoreCommand(cmd, 'ent')!
    );
  });

  it('returns null for unrelated queries', () => {
    const cmd = statics.find((c) => c.id === 'nav-calendar')!;
    expect(scoreCommand(cmd, 'zzzz-no-match-qqqq')).toBeNull();
  });

  it('includes entities and ranks them under Entities', () => {
    const nodes: OntologyNode[] = [
      {
        id: 'p1',
        type: 'Person',
        label: 'Avery Miller',
        properties: { role: 'Founder' },
      },
    ];
    const all = [
      ...statics,
      ...entityCommands(nodes, noop),
    ];
    const hits = filterCommands(all, 'avery');
    expect(hits.some((c) => c.entityId === 'p1')).toBe(true);
    expect(hits.find((c) => c.entityId === 'p1')?.section).toBe('Entities');
  });

  it('empty query still returns static commands', () => {
    const hits = filterCommands(statics, '');
    expect(hits.length).toBe(statics.length);
  });
});
