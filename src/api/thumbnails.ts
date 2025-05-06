import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, FileError, UserForbiddenError } from "./errors";
import type { Thumbnail } from "../types";
import { writeFileToAssets } from "../utils";

const MAX_UPLOAD_SIZE = 10 << 20; // 10 * 1024 * 1024
const ALLOWED_THUMBNAIL_TYPES = ["image/jpeg", "image/png"];

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  const formData = (await req.formData()).get("thumbnail");

  if (!(formData instanceof File)) {
    throw new BadRequestError("Invalid file in form data");
  }
  if (formData.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError(`File size exceeds: ${MAX_UPLOAD_SIZE} bytes`);
  }
  if (!ALLOWED_THUMBNAIL_TYPES.includes(formData.type)) {
    throw new BadRequestError(`File type is Invalid`);
  }

  const thumbnail: Thumbnail = {
    data: await formData.arrayBuffer(),
    mediaType: formData.type,
  };
  const video = getVideo(cfg.db, videoId);

  if (!video || video.userID !== userID) {
    throw new UserForbiddenError("User is not owner of the video");
  }

  const filePath = await writeFileToAssets(cfg, thumbnail);
  if (filePath === null) {
    throw new FileError("Failed writing file, try again");
  }
  video.thumbnailURL = `http://localhost:${cfg.port}/${filePath}`;
  updateVideo(cfg.db, video);

  return respondWithJSON(200, video);
}
