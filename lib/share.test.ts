import { describe, it, expect } from 'vitest';
import {
  encodeShareToken,
  decodeShareToken,
  type ShareToken,
} from './share';

const sample: ShareToken = {
  type: 'node',
  id: 'proj1',
  workspaceId: 'ws-personal',
  label: 'Q3 Product Launch',
};

describe('share tokens', () => {
  it('round-trips a basic token', () => {
    const encoded = encodeShareToken(sample);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    // base64url should not include +, /, or =
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeShareToken(encoded)).toEqual(sample);
  });

  it('round-trips unicode labels (emoji / accents)', () => {
    const token: ShareToken = {
      type: 'insight',
      id: 'si-1',
      workspaceId: 'ws-2',
      label: 'Résumé · 🚀 growth',
    };
    expect(decodeShareToken(encodeShareToken(token))).toEqual(token);
  });

  it('returns null for garbage input', () => {
    expect(decodeShareToken('not-valid-!!!')).toBeNull();
    expect(decodeShareToken('')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    // craft invalid payload via bare base64url of incomplete JSON
    const incomplete = Buffer.from(JSON.stringify({ type: 'node', id: 'x' }), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeShareToken(incomplete)).toBeNull();
  });
});
