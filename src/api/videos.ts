import { respondWithJSON } from "./json";

import { type ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { getBearerToken, validateJWT } from "../auth";
import { BadRequestError, FileError, UserForbiddenError } from "./errors";
import { getVideo, updateVideo, type Video } from "../db/videos";
import type { FileAsset } from "../types";
import { deleteAssets, getEdgeUrl, getVideoS3URL, writeAssetToS3, writeFileToAssets } from "../utils";
import path from "path";
import { getVideoAspectRatio, processVideoForFastStart } from "./helper/fileHelper";

const MAX_UPLOAD_SIZE_VIDEO = 1 << 30;
const ALLOWED_VIDEO_TYPES = ["video/mp4"];
export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }
  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);
  console.log("uploading video for video", videoId, "by user", userID);
  const video = getVideo(cfg.db, videoId);
  if (!video || video.userID !== userID) {
    throw new UserForbiddenError("User is not owner of the video");
  }
  const formData = (await req.formData()).get("video");
  if (!(formData instanceof File)) {
    throw new BadRequestError("Invalid file in form data");
  }
  if (formData.size > MAX_UPLOAD_SIZE_VIDEO) {
    throw new BadRequestError(
      `File size exceeds: ${MAX_UPLOAD_SIZE_VIDEO} bytes`
    );
  }
  if (!ALLOWED_VIDEO_TYPES.includes(formData.type)) {
    throw new BadRequestError(`File type is Invalid`);
  }
  const videoAsset: FileAsset = {
    data: await formData.arrayBuffer(),
    mediaType: formData.type,
  };

    const filePath = await writeFileToAssets(cfg, videoAsset);
    if (filePath === null) {
      throw new FileError("Failed writing file, try again");
    }
    const fileName = path.basename(filePath)
    const aspectRatio = await getVideoAspectRatio(filePath)
    const s3FileName = aspectRatio + '-' + fileName
    const processedFilePath = await processVideoForFastStart(filePath)
    if( !processedFilePath){
      throw new FileError("Failed to update faststart")
    }
    const processedFileName = path.basename(processedFilePath)
    const s3Response = await writeAssetToS3(cfg, processedFilePath, s3FileName, videoAsset.mediaType)
    if (!s3Response) {
      throw new FileError("Failed writing to s3, try again")
    }
    const edgeUrl = getEdgeUrl(cfg, s3FileName)
    video.videoURL = edgeUrl;
    updateVideo(cfg.db, video)
    deleteAssets(`${cfg.assetsRoot}/${fileName}`)
    deleteAssets(`${cfg.assetsRoot}/${processedFileName}`)
    return respondWithJSON(200, video)
}