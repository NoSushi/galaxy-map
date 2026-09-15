import { test } from "node:test";
import assert from "node:assert/strict";
import { transformOverlay, type OverlayGesture } from "./overlay-transform";

const origin = { id: "test", name: "Test", imageData: "", x: 200, y: 400, width: 1800, height: 900, opacity: 50 };
for (const scale of [0.15, 0.2, 1, 3]) {
  const gesture: OverlayGesture = { type: "resize", startX: 500, startY: 300, scale, origin };
  test(`no pointer movement leaves dimensions unchanged at zoom ${scale}`, () => {
    assert.deepEqual(transformOverlay(gesture, 500, 300), origin);
  });
  test(`horizontal resize cannot change height at zoom ${scale}`, () => {
    const result = transformOverlay(gesture, 500 + 100 * scale, 300);
    assert.equal(result.width, 1900);
    assert.equal(result.height, 900);
  });
  test(`vertical resize changes height only by pointer delta at zoom ${scale}`, () => {
    const result = transformOverlay(gesture, 500, 300 + 50 * scale);
    assert.equal(result.height, 950);
    assert.equal(result.width, 1800);
    assert.deepEqual(transformOverlay(gesture, 500, 300 + 50 * scale), result);
  });
  test(`moving cannot change dimensions at zoom ${scale}`, () => {
    const result = transformOverlay({ ...gesture, type: "move" }, 500 + 10 * scale, 300 + 20 * scale);
    assert.deepEqual(result, { ...origin, x: 210, y: 420 });
  });
}
test("resize enforces minimum dimensions", () => {
  const result = transformOverlay({ type: "resize", startX: 0, startY: 0, scale: 1, origin }, -10000, -10000);
  assert.equal(result.width, 100);
  assert.equal(result.height, 100);
});