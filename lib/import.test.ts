import { describe, it, expect } from 'vitest';
import { importFromJSON } from './import';

function jsonFile(name: string, content: unknown, sizePad = 0): File {
  const body = typeof content === 'string' ? content : JSON.stringify(content);
  const padded = body + ' '.repeat(sizePad);
  return new File([padded], name, { type: 'application/json' });
}

describe('importFromJSON', () => {
  const valid = {
    nodes: [
      {
        id: 'p1',
        type: 'Person',
        label: 'Ada',
        properties: { role: 'Engineer' },
      },
    ],
    relationships: [
      { id: 'r1', from: 'p1', to: 'missing', type: 'worksOn' },
    ],
  };

  it('imports a valid graph and warns on dangling relationships', async () => {
    const result = await importFromJSON(jsonFile('backup.json', valid));
    expect(result.nodeCount).toBe(1);
    expect(result.relationshipCount).toBe(1);
    expect(result.warnings.some((w) => w.includes('reference node IDs'))).toBe(true);
  });

  it('rejects non-json extensions', async () => {
    await expect(importFromJSON(jsonFile('notes.txt', valid))).rejects.toThrow(/\.json/i);
  });

  it('rejects empty files', async () => {
    await expect(importFromJSON(new File([], 'empty.json'))).rejects.toThrow(/empty/i);
  });

  it('rejects invalid JSON', async () => {
    await expect(importFromJSON(jsonFile('bad.json', '{nope'))).rejects.toThrow(/Invalid JSON/i);
  });

  it('rejects missing nodes array', async () => {
    await expect(
      importFromJSON(jsonFile('x.json', { relationships: [] }))
    ).rejects.toThrow(/nodes/i);
  });

  it('skips invalid nodes with a warning when some remain valid', async () => {
    const mixed = {
      nodes: [
        valid.nodes[0],
        { id: 'bad', type: 'NotAType', label: 'x', properties: {} },
        { foo: 1 },
      ],
      relationships: [],
    };
    const result = await importFromJSON(jsonFile('mixed.json', mixed));
    expect(result.nodeCount).toBe(1);
    expect(result.warnings.some((w) => w.includes('skipped'))).toBe(true);
  });

  it('throws when every node is invalid', async () => {
    await expect(
      importFromJSON(
        jsonFile('all-bad.json', {
          nodes: [{ id: 1, type: 'Person', label: 'x', properties: {} }],
          relationships: [],
        })
      )
    ).rejects.toThrow(/invalid/i);
  });
});
