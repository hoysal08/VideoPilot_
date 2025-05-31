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
  const exited = await proc.exited
  const firstStreamInfo = await new Response(proc.stdout).json();
  const firstStreamError = await new Response(proc.stderr).text();
  if (exited != 0) {
    console.error(
      "#getVideoAspectRatio error getting aspect for path,",
      filePath, firstStreamError
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

// const res = await getVideoAspectRatio('/Users/soorajhoysal/Desktop/DEV/boot-dev/VideoPilot/samples/boots-video-horizontal.mp4')
// console.log(res)