import { test } from "node:test";
import assert from "node:assert/strict";
import { previewCombinedRegions } from "./combined-regions";

test("PDF wins over rings and existing regions; rings fill only remaining blanks", () => {
  const planets = [
    { id: "1", name: "PDF", x: 2502, y: 2463, oversector: null },
    { id: "2", name: "Rings", x: 2502, y: 2463, oversector: null },
    { id: "3", name: "Correction", x: 2502, y: 2463, oversector: "Core" },
    { id: "4", name: "Preserved", x: 2502, y: 2463, oversector: "Core" },
    { id: "5", name: "Already", x: 2502, y: 2463, oversector: "Outer Rim" },
    { id: "6", name: "Outside", x: -200, y: -200, oversector: null },
  ];
  const entries = ["PDF", "Correction", "Already", "Outside", "Not on map"].map(name => ({
    name, region: "Outer Rim Territories", page: 1,
  }));
  const original = structuredClone(planets);
  const result = previewCombinedRegions(planets, entries);
  assert.deepEqual(planets, original);
  assert.deepEqual(result.candidates.map(p => [p.id, p.region, p.source]), [
    ["1", "Outer Rim", "pdf"], ["2", "Deep Core", "rings"],
    ["3", "Outer Rim", "pdf"], ["6", "Outer Rim", "pdf"],
  ]);
  assert.equal(result.filled, 3);
  assert.equal(result.corrected, 1);
  assert.equal(result.candidates[0].ringRegion, "Deep Core");
  assert.equal(result.candidates[2].previous, "Core");
  const updated = planets.map(p => ({ ...p, oversector: result.candidates.find(c => c.id === p.id)?.region ?? p.oversector }));
  assert.equal(previewCombinedRegions(updated, entries).candidates.length, 0);
});

test("ambiguous PDF entries cannot override safe rings; unresolved boundaries remain in review", () => {
  const result = previewCombinedRegions([
    { id: "1", name: "Conflict", x: 2502, y: 2463 },
    { id: "2", name: "Unresolved", x: -200, y: -200 },
    { id: "3", name: "Conflict", x: 2502, y: 2463, oversector: "Core" },
  ], [
    { name: "Conflict", region: "Mid Rim", page: 1 },
    { name: "Conflict", region: "Outer Rim", page: 2 },
  ]);
  assert.deepEqual(result.candidates.map(p => [p.id, p.region]), [["1", "Deep Core"]]);
  assert.deepEqual(result.review.map(p => p.id), ["2", "3"]);
});