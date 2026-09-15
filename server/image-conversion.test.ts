import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { convertImageToWebP, ImageConversionError } from "./image-conversion";

const run = promisify(execFile);

for (const format of ["png", "jpeg", "webp"]) {
  test(`converts ${format} to WebP and preserves dimensions`, async () => {
    const { stdout } = await run("convert", ["-size", "16x12", "xc:red", `${format}:-`], { encoding: "buffer" });
    const converted = await convertImageToWebP(`data:image/${format};base64,${stdout.toString("base64")}`);
    assert.ok(converted.startsWith("data:image/webp;base64,"));
    const buffer = Buffer.from(converted.split(",")[1], "base64");
    assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
    // Lossless VP8L headers encode dimensions in these packed bits.
    assert.equal(buffer.toString("ascii", 12, 16), "VP8L");
    const bits = buffer.readUInt32LE(21);
    assert.equal((bits & 0x3fff) + 1, 16);
    assert.equal(((bits >>> 14) & 0x3fff) + 1, 12);
  });
}

test("rejects unsafe formats and mismatched contents", async () => {
  for (const image of [
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/png;base64,SGVsbG8=",
    "https://example.com/image.png",
  ]) {
    await assert.rejects(convertImageToWebP(image), (error: unknown) =>
      error instanceof ImageConversionError && error.status === 400);
  }
});

test("rejects oversized uploads", async () => {
  await assert.rejects(convertImageToWebP("x".repeat(12_000_001)), (error: unknown) =>
    error instanceof ImageConversionError && error.status === 413);
});