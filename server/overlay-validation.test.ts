import assert from "node:assert/strict";
import { test } from "node:test";
import { createOverlaySchema, patchOverlaySchema, normalizeOverlayImage } from "./overlay-validation";
import sharp from "sharp";

const imageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=";
const overlay = { id: "test-overlay", name: "Test", imageData, x: 0, y: 0, width: 5000, height: 3000, opacity: 50 };

test("accept raster upload and normalize map coordinates", () => {
  assert.equal(createOverlaySchema.parse({ ...overlay, x: 2.5 }).x, 3);
});
test("reject empty names, invalid IDs and out of range geometry", () => {
  for (const patch of [{ name: " " }, { id: "../bad" }, { width: 0 }, { height: -1 }, { opacity: 101 }, { x: 2 ** 32 }]) {
    assert.equal(createOverlaySchema.safeParse({ ...overlay, ...patch }).success, false);
  }
});
test("reject active content, spoofed types, and oversized images", () => {
  for (const value of ["data:image/svg+xml;base64,PHN2Zy8+", "data:image/png;base64,PHN2Zy8+", imageData + "A".repeat(12_000_000)]) {
    assert.equal(createOverlaySchema.safeParse({ ...overlay, imageData: value }).success, false);
  }
});
test("patches cannot alter IDs or image content", () => {
  for (const patch of [{}, { id: "new" }, { imageData }, { width: null }, { width: "500" }, { height: Infinity }]) {
    assert.equal(patchOverlaySchema.safeParse(patch).success, false);
  }
  assert.deepEqual(patchOverlaySchema.parse({ x: -12.6, width: 100 }), { x: -13, width: 100 });
});

test("decode valid raster and reject truncated and oversized raster dimensions", async () => {
  const valid = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#ff0000" } }).png().toBuffer();
  assert.match(await normalizeOverlayImage(`data:image/png;base64,${valid.toString("base64")}`), /^data:image\/webp;base64,/);
  for (const header of ["89504e470d0a1a0a", "ffd8ff", "474946383961", "524946460000000057454250"]) {
    await assert.rejects(normalizeOverlayImage(`data:image/png;base64,${Buffer.from(header, "hex").toString("base64")}`));
  }
  const huge = await sharp({ create: { width: 6500, height: 6500, channels: 3, background: "#000000" } }).png().toBuffer();
  await assert.rejects(normalizeOverlayImage(`data:image/png;base64,${huge.toString("base64")}`));
});