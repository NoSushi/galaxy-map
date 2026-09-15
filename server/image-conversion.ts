import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
let activeConversions = 0;

export class ImageConversionError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Convert raster data URLs using the ImageMagick 6-compatible CLI. */
export async function convertImageToWebP(dataUrl: string): Promise<string> {
  if (dataUrl.length > 12_000_000) {
    throw new ImageConversionError("Overlay image is too large", 413);
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) {
    throw new ImageConversionError("Upload a PNG, JPEG, or WebP image", 400);
  }
  const input = Buffer.from(match[2], "base64");
  const format = match[1];
  const validSignature = format === "png"
    ? input.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    : format === "jpeg"
      ? input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff
      : input.toString("ascii", 0, 4) === "RIFF" && input.toString("ascii", 8, 12) === "WEBP";
  if (!validSignature) throw new ImageConversionError("Invalid image contents", 400);
  if (activeConversions >= 2) {
    throw new ImageConversionError("Image converter is busy. Please try again shortly.", 503);
  }
  activeConversions++;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), "galaxy-image-"));
    const source = join(directory, "input");
    const output = join(directory, "output.webp");
    await writeFile(source, input);
    // Explicit raster decoder and generated filenames prevent delegates,
    // shell interpolation, and user-controlled ImageMagick path expressions.
    await run("convert", [
      "-limit", "thread", "1",
      "-limit", "memory", "128MiB",
      "-limit", "map", "256MiB",
      "-limit", "disk", "256MiB",
      "-limit", "width", "16384",
      "-limit", "height", "16384",
      `${format}:${source}[0]`,
      "-auto-orient", "-strip",
      "-define", "webp:lossless=true",
      `webp:${output}`,
    ], { timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024 });
    const result = await readFile(output);
    const encoded = `data:image/webp;base64,${result.toString("base64")}`;
    if (encoded.length > 12_000_000) {
      throw new ImageConversionError("Converted image is too large. Upload a smaller image.", 413);
    }
    if (result.toString("ascii", 0, 4) !== "RIFF" || result.toString("ascii", 8, 12) !== "WEBP") {
      throw new ImageConversionError("Image converter produced an invalid WebP image", 500);
    }
    return encoded;
  } catch (error) {
    if (error instanceof ImageConversionError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    throw new ImageConversionError(
      code === "ENOENT"
        ? "ImageMagick is unavailable on this server"
        : "Image conversion failed. The image may be damaged or exceed processing limits.",
      code === "ENOENT" ? 503 : 422,
    );
  } finally {
    activeConversions--;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}