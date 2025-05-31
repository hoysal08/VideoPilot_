import path from "path";

export async function getVideoAspectRatio(filePath: string) {
  const proc = Bun.spawn([
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filePath,
  ]);
  const exited = await proc.exited;
  const firstStreamInfo = await new Response(proc.stdout).json();
  const firstStreamError = await new Response(proc.stderr).text();
  if (exited != 0) {
    console.error(
      "#getVideoAspectRatio error getting aspect for path,",
      filePath,
      firstStreamError
    );
    return null;
  }
  return getAspectRatioCategory(
    parseInt(firstStreamInfo.streams[0].width),
    parseInt(firstStreamInfo.streams[0].height)
  );
}

function getAspectRatioCategory(width: number, height: number) {
  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  if (w === 16 && h === 9) {
    return "landscape";
  } else if (w === 9 && h === 16) {
    return "portrait";
  } else {
    return "other";
  }
}

async function updateFastStartMetadata(
  inputFilePath: string,
  processedFileName: string
) {
    console.log([
        "ffmpeg",
        "-i",
        inputFilePath,
        "-movflags",
        "faststart",
        "-map_metadata",
        "0",
        "-codec",
        "copy",
        "-f",
        "mp4",
        processedFileName,
      ])
  const proc = Bun.spawn([
    "ffmpeg",
    "-i",
    inputFilePath,
    "-movflags",
    "faststart",
    "-map_metadata",
    "0",
    "-codec",
    "copy",
    "-f",
    "mp4",
    processedFileName,
  ]);
  const exited = await proc.exited;
  console.log(proc)
  if (exited != 0) {
    console.error(
      "#updateFastStartMetadata error creating faststart,",
      inputFilePath
    );
    return null;
  }
  return processedFileName
}

export function processVideoForFastStart(inputFilePath: string) {
  const processedFileName = getProcessedFilePath(inputFilePath);    
  const outputFileName = updateFastStartMetadata(inputFilePath, processedFileName)
  return outputFileName
}

function getProcessedFilePath(inputFilePath: string) {
  const dir = path.dirname(inputFilePath);
  const ext = path.extname(inputFilePath);
  const fileName = path.parse(inputFilePath).name;

  const processedFileName = fileName + ".processed" + ext;
  const processedFilePath = path.join(dir, processedFileName);

  return processedFilePath;
}

// const res = await getVideoAspectRatio('/Users/soorajhoysal/Desktop/DEV/boot-dev/VideoPilot/samples/boots-video-horizontal.mp4')
// console.log(res)

//ffmpeg  -i /Users/soorajhoysal/Desktop/DEV/boot-dev/VideoPilot/samples/boots-video-horizontal.mp4 -movflags faststart -map_metadata 0 -codec copy -f mp4 /Users/soorajhoysal/Desktop/DEV/boot-dev/VideoPilot/samples/pp-boots-video-horizontal.mp4
