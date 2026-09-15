import { z } from "zod";
import sharp from "sharp";

export const MAX_OVERLAY_BYTES = 8 * 1024 * 1024;
export const MAX_OVERLAY_PIXELS = 40_000_000;

// Decode, enforce pixel limits, strip metadata and store a static raster.
// Magic-byte checks alone do not catch truncated images or decompression bombs.
export async function normalizeOverlayImage(dataUrl: string): Promise<string> {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  const output = await sharp(bytes, { limitInputPixels: MAX_OVERLAY_PIXELS, failOn: "warning" })
    .rotate()
    .webp({ quality: 95 })
    .toBuffer();
  if (output.length > MAX_OVERLAY_BYTES) throw new Error("Processed image exceeds 8 MB");
  return `data:image/webp;base64,${output.toString("base64")}`;
}
const imageData = z.string().max(Math.ceil(MAX_OVERLAY_BYTES / 3) * 4 + 100).superRefine((value, ctx) => {
  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Upload a PNG, JPEG, WebP, or GIF image" });
    return;
  }
  const bytes = Buffer.from(match[2], "base64");
  const valid = match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : match[1] === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : match[1] === "gif" ? /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())
    : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!valid || bytes.length > MAX_OVERLAY_BYTES) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid image or image exceeds 8 MB" });
  }
});

const geometry = {
  name: z.string().trim().min(1).max(120),
  x: z.number().finite().min(-1000000).max(1000000).transform(Math.round),
  y: z.number().finite().min(-1000000).max(1000000).transform(Math.round),
  width: z.number().finite().min(100).max(100000).transform(Math.round),
  height: z.number().finite().min(100).max(100000).transform(Math.round),
  opacity: z.number().finite().min(0).max(100).transform(Math.round),
};

export const createOverlaySchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  imageData,
  ...geometry,
}).strict();

// Images are immutable; adjusting an overlay never needs to re-upload it.
export const patchOverlaySchema = z.object(geometry).partial().strict()
  .refine(value => Object.keys(value).length > 0, "No overlay changes supplied");