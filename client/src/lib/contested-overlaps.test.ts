import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getContestedOverlaps } from './contested-overlaps';

const sector = (id: string, x: number, faction = id) => ({
  id, name: id, faction, color: id === 'a' ? '0 80% 50%' : '190 90% 50%',
  points: [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10]] as [number, number][],
});

test('moving borders into overlap derives only the intersection with both actual colours', () => {
  const a = sector('a', 0), b = sector('b', 20);
  assert.equal(getContestedOverlaps([a, b]).length, 0);
  const moved = sector('b', 5);
  const result = getContestedOverlaps([a, moved]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].colors, [a.color, b.color]);
  assert.match(result[0].path, /5 0/);
  assert.match(result[0].path, /10 10/);
  assert.equal(result[0].path.includes('15 '), false);
  assert.equal(getContestedOverlaps([a, b]).length, 0);
  assert.equal(getContestedOverlaps([a, { ...moved, color: '40 80% 50%' }])[0].colors[1], '40 80% 50%');
});

test('edge contacts, allied sectors, invalid rings and manual contested areas do not create conflicts', () => {
  const a = sector('a', 0);
  assert.equal(getContestedOverlaps([a, sector('b', 10)]).length, 0);
  assert.equal(getContestedOverlaps([a, sector('b', 5, 'a')]).length, 0);
  assert.equal(getContestedOverlaps([a, { ...sector('b', 5), isContested: true }]).length, 0);
  assert.equal(getContestedOverlaps([a, { ...sector('b', 5), points: [] }]).length, 0);
});

test('contained territories, multiple opponents and reloads stay consistent without modifying sources', () => {
  const input = [sector('a', 0), sector('b', 4), sector('c', 7)];
  const original = structuredClone(input);
  const result = getContestedOverlaps(input);
  assert.equal(result.length, 3);
  assert.deepEqual(input, original);
  assert.deepEqual(getContestedOverlaps(JSON.parse(JSON.stringify(input))), result);
  const inner = { ...sector('b', 0), points: [[2, 2], [3, 2], [3, 3], [2, 3]] as [number, number][] };
  assert.equal(getContestedOverlaps([input[0], inner]).length, 1);
});