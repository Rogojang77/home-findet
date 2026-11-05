import { describe, expect, it } from 'vitest';
import { seed } from './inventory.js';
import { find, matches, reply, toks } from './search.js';

const db = seed();

describe('search', () => {
  it('matches synonyms with a typo and no diacritics', () => {
    expect(matches(toks('maișina de găurit'), 'Bormașină mașina de găurit')).toBe(true);
    expect(find(db, 'maișina de găurit').items.map(i => i.name)).toContain('Bormașină');
  });
  it('does not match unrelated words', () => {
    expect(find(db, 'unde e frigiderul').items).toHaveLength(0);
  });
  it('answers reverse questions with the contents of a box', () => {
    expect(reply(db, 'Ce am în cutia de sub pat?')).toMatch(/Decorațiuni Crăciun/);
  });
  it('tells where an item is', () => {
    expect(reply(db, 'Unde e bormașina?')).toMatch(/Debara, Raft metalic, Raftul de sus, Cutia albastră/);
  });
});
