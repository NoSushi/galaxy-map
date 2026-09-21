import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectorTerritory } from './sector-enclaves';
import { getContestedOverlaps } from './contested-overlaps';

const empire = {
  id: 's1776765155304', name: 'The Empire', faction: 'Empire', color: '0 80% 50%',
  points: [[0, 0], [20, 0], [20, 20], [0, 20]] as [number, number][],
};
const meridian = {
  id: 's1783184732363', name: 'The Meridian', faction: 'Independent', color: '253 50% 50%',
  points: [[5, 5], [10, 5], [10, 10], [5, 10]] as [number, number][],
};

test('Meridian is a hole in Empire territory, not a contested overlap', () => {
  const sectors = [empire, meridian];
  const original = structuredClone(sectors);
  assert.equal(sectorTerritory(empire, sectors)[0].length, 2);
  assert.equal(sectorTerritory(meridian, sectors)[0].length, 1);
  assert.equal(getContestedOverlaps(sectors).length, 0);
  assert.equal(getContestedOverlaps([...sectors].reverse()).length, 0);
  assert.deepEqual(sectors, original);
});

test('other rival territories remain contested, including incursions into the enclave', () => {
  const rival = { ...meridian, id: 'rival', faction: 'Rival' };
  const overlaps = getContestedOverlaps([empire, meridian, rival]);
  assert.equal(overlaps.length, 1);
  assert.match(overlaps[0].name, /Independent \/ Rival/);
  assert.equal(getContestedOverlaps([empire, { ...meridian, id: 'ordinary-sector' }]).length, 1);
});

test('relationship survives renaming and does not affect unrelated Empire sectors', () => {
  assert.equal(getContestedOverlaps([empire, { ...meridian, name: 'Renamed' }]).length, 0);
  assert.equal(getContestedOverlaps([{ ...empire, id: 'other-empire' }, meridian]).length, 1);
  assert.equal(sectorTerritory(empire, [empire])[0].length, 1);
});