import { randomBytes } from 'crypto';
import type { ApiConfig } from "../config";
import type { Thumbnail } from "../types";
import path from "path";

export function getBase64Encoded(thumbnail: Thumbnail): string {
  const encodedImage64 = Buffer.from(thumbnail.data).toBase64();
  return `data:${thumbnail.mediaType};base64,${encodedImage64}`;
}

export async function writeFileToAssets(
  cfg: ApiConfig,
  thumbnail: Thumbnail
): Promise<string | null> {
  const fileExtension = "." + thumbnail.mediaType.split("/").at(1);
  const randomId = randomBytes(64).toString("base64url")
  const filePath = path.join(cfg.assetsRoot, `${randomId}${fileExtension}`);
  try {
    await Bun.write(filePath, thumbnail.data);
    return filePath;
  } catch (err) {
    console.log(err);
    return null;
  }
}
