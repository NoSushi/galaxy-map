import { test } from "node:test";
import assert from "node:assert/strict";
import { previewAppendixRegions } from "./appendix-matching";

test("only existing planets can be updated; coordinates do not affect matching", () => {
  const planets = [
    { id: "one", name: "Coruscant", oversector: null, x: -1000, y: 99999 },
    { id: "two", name: "Unlisted", oversector: "Mid Rim", x: 0, y: 0 },
  ];
  const snapshot = structuredClone(planets);
  const result = previewAppendixRegions(planets, [
    { name: "Coruscant", region: "Core Worlds", page: 3 },
    { name: "Absent Planet", region: "Outer Rim Territories", page: 1 },
  ]);
  assert.deepEqual(result.candidates.map(row => row.id), ["one"]);
  assert.equal(result.candidates[0].region, "Core");
  assert.deepEqual(planets, snapshot);
  assert.equal(result.review[0].name, "Unlisted");
});

test("duplicates and conflicting entries are not guessed", () => {
  const result = previewAppendixRegions([
    { id: "1", name: "Byss" }, { id: "2", name: "Byss" }, { id: "3", name: "Conflicting" },
  ], [
    { name: "Byss", region: "Deep Core", page: 2 },
    { name: "Conflicting", region: "Core Worlds", page: 2 },
    { name: "Conflicting", region: "Mid Rim", page: 3 },
  ]);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.review.length, 3);
});

test("typographic differences match but planet suffixes are never removed", () => {
  const result = previewAppendixRegions([
    { id: "1", name: "N’Zoth" }, { id: "2", name: "Yavin IV" },
  ], [
    { name: "N'Zoth", region: "Core Worlds", page: 8 },
    { name: "Yavin", region: "Outer Rim Territories", page: 14 },
  ]);
  assert.deepEqual(result.candidates.map(row => row.id), ["1"]);
});

test("source corrections are explicit and equivalent region labels remain unchanged", () => {
  const planets = [
    { id: "1", name: "Alpha", oversector: "Core" },
    { id: "2", name: "Beta", oversector: "Inner Rim" },
  ];
  const entries = [
    { name: "Alpha", region: "Core Worlds", page: 1 },
    { name: "Beta", region: "Mid Rim", page: 2 },
  ];
  const result = previewAppendixRegions(planets, entries);
  assert.equal(result.unchanged, 1);
  assert.equal(result.corrected, 1);
  assert.equal(result.candidates[0].previous, "Inner Rim");
  assert.equal(result.candidates[0].region, "Mid Rim");
  const applied = planets.map(p => ({ ...p, oversector: result.candidates.find(c => c.id === p.id)?.region ?? p.oversector }));
  assert.equal(previewAppendixRegions(applied, entries).candidates.length, 0);
});

test("meaningful separators are preserved rather than collapsed into false matches", () => {
  const result = previewAppendixRegions([
    { id: "1", name: "A-B" }, { id: "2", name: "New Planet" },
  ], [
    { name: "AB", region: "Mid Rim", page: 1 },
    { name: "NewPlanet", region: "Deep Core", page: 1 },
  ]);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.review.length, 2);
});