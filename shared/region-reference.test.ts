import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRegion, previewRegionImport, regionReferenceOverlay } from "./region-reference";

test("aligned reference matches named map landmarks within 20 map units", () => {
  const anchors = [
    [536.6,348.1,2499,2302], [534,383,2502,2463], [516,427,2403,2668],
    [605.5,433,2813,2675], [594,351,2762,2318], [618,375,2871,2424],
    [604,709,2811,3965], [545,780,2533,4275], [681,658,3167,3720],
  ];
  for (const [ix, iy, x, y] of anchors) {
    assert.ok(Math.hypot(
      regionReferenceOverlay.x + ix * regionReferenceOverlay.width / 1024 - x,
      regionReferenceOverlay.y + iy * regionReferenceOverlay.height / 868 - y,
    ) < 20);
  }
});
test("recognizes Deep Core, keeps boundary points for review", () => {
  assert.equal(classifyRegion(2502, 2463).region, "Deep Core");
  assert.equal(classifyRegion(2403, 2668).region, "Deep Core");
  const boundaryX = regionReferenceOverlay.x + (537 + 52) * regionReferenceOverlay.width / 1024;
  const boundaryY = regionReferenceOverlay.y + 411 * regionReferenceOverlay.height / 868;
  assert.match(classifyRegion(boundaryX, boundaryY).reason!, /boundary/);
});
test("preserves existing Region, sector and other data and fills blanks only", () => {
  const source = [
    { id: "1", name: "Existing", x: 2502, y: 2463, oversector: "Core", sectorId: "political-sector" },
    { id: "2", name: "Blank", x: 2502, y: 2463, oversector: null },
    { id: "3", name: "Unknown", x: -200, y: -200, oversector: null },
    { id: "4", name: "Invalid", x: 2502, y: 2463, oversector: "https://example.com/image.png" },
  ];
  const original = structuredClone(source);
  const result = previewRegionImport(source);
  assert.deepEqual(source, original);
  assert.equal(result.preserved, 2);
  assert.deepEqual(result.candidates.map(item => item.id), ["2"]);
  assert.equal(result.candidates[0].region, "Deep Core");
  assert.equal(result.review.length, 3);
  const updated = source.map(item => ({ ...item, oversector: result.candidates.find(c => c.id === item.id)?.region ?? item.oversector }));
  assert.equal(previewRegionImport(updated).candidates.length, 0);
});