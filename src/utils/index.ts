import type { Thumbnail } from "../types";

export function getBase64Encoded(thumbnail: Thumbnail) : string {
    const encodedImage64 = Buffer.from(thumbnail.data).toBase64()
    return `data:${thumbnail.mediaType};base64,${encodedImage64}`

}