import { randomBytes } from 'crypto';
import type { ApiConfig } from "../config";
import type { FileAsset, Thumbnail } from "../types";
import path from "path";
import { FileError } from '../api/errors';
import type { Video } from '../db/videos';

export function getBase64Encoded(thumbnail: Thumbnail): string {
  const encodedImage64 = Buffer.from(thumbnail.data).toBase64();
  return `data:${thumbnail.mediaType};base64,${encodedImage64}`;
}

export function getVideoS3URL(cfg: ApiConfig, videoFileName: string): string{
  return `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${videoFileName}`
}

export function getEdgeUrl(cfg: ApiConfig, videoFileName: string): string{
  return `https://${cfg.s3CfDistribution}/${videoFileName}`
}

export async function writeFileToAssets(
  cfg: ApiConfig,
  file: FileAsset
): Promise<string | null> {
  const fileExtension = "." + file.mediaType.split("/").at(1);
  const randomId = randomBytes(64).toString("base64url");
  const filePath = path.join(cfg.assetsRoot, `${randomId}${fileExtension}`);
  try {
    await Bun.write(filePath, file.data);
    return filePath;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function writeAssetToS3(
  cfg: ApiConfig,
  filePath: string,
  s3Path: string,
  mimeType: string
): Promise<boolean> {
  try {
    s3Path = s3Path.replace(/^\/+/, '');
    const fileData = await Bun.file(filePath).arrayBuffer();
    const s3File = cfg.s3Client.file(s3Path)
    const response = await s3File.write(fileData, {
      type: mimeType,
      
    })
    if(response != 0){
      return true
    }
    return false
  } catch (err) {
    console.log("Error uploading to S3:", err);
    return false;
  }
}

export async function deleteAssets(filePath:string): Promise<boolean> {
  const file =  Bun.file(filePath);
  if(!file.exists) {
    throw new FileError(`#deleteAssets, Failed delete file for ${filePath}`)
  }
  file.delete()
  return true;
}


