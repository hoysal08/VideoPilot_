import { respondWithJSON } from "./json";

import { type ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { getBearerToken, validateJWT } from "../auth";
import { BadRequestError, FileError, UserForbiddenError } from "./errors";
import { getVideo, updateVideo } from "../db/videos";
import type { FileAsset } from "../types";
import { deleteAssets, getVideoS3URL, writeAssetToS3, writeFileToAssets } from "../utils";
import path from "path";

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
    const s3Response = await writeAssetToS3(cfg, filePath, fileName, videoAsset.mediaType)
    if(!s3Response) {
      throw new FileError("Failed writing to s3, try again")
    }
    const s3Url = getVideoS3URL(cfg, fileName)
    video.videoURL = s3Url;
    updateVideo(cfg.db, video)
    deleteAssets(`${cfg.assetsRoot}/${fileName}`)
    return respondWithJSON(200, video);
}
