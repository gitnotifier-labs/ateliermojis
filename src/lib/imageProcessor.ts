const TARGET_SIZE = 128;
const MAX_BYTES = 128 * 1024; // 128KB

export type SquareMode = "auto" | "crop" | "pad";
export type VerticalAlign = "top" | "center" | "bottom";

export interface ProcessImageOptions {
  squareMode?: SquareMode;
  landscapeVerticalAlign?: VerticalAlign;
}

interface CanvasToProcessedOptions {
  enforceMaxBytes?: boolean;
}

export interface ProcessedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function processImage(file: File): Promise<ProcessedImage> {
  return processImageWithOptions(file, {});
}

export async function processImageWithOptions(
  file: File,
  options: ProcessImageOptions,
): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const isUnderMaxBytes = file.size <= MAX_BYTES;

  if (img.width === img.height && isUnderMaxBytes) {
    return {
      blob: file,
      url: URL.createObjectURL(file),
      width: img.width,
      height: img.height,
      sizeBytes: file.size,
    };
  }

  const selectedMode = options.squareMode ?? "auto";
  const squareMode = selectedMode === "auto" ? "pad" : selectedMode;
  const landscapeVerticalAlign = options.landscapeVerticalAlign ?? "center";

  const targetSize = isUnderMaxBytes
    ? Math.max(img.width, img.height)
    : TARGET_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (squareMode === "pad") {
    const isLandscape = img.width > img.height;

    if (isLandscape) {
      const scaledHeight = (img.height / img.width) * targetSize;
      const y =
        landscapeVerticalAlign === "top"
          ? 0
          : landscapeVerticalAlign === "bottom"
            ? targetSize - scaledHeight
            : (targetSize - scaledHeight) / 2;

      ctx.drawImage(img, 0, y, targetSize, scaledHeight);
    } else {
      const scaledWidth = (img.width / img.height) * targetSize;
      const x = (targetSize - scaledWidth) / 2;
      ctx.drawImage(img, x, 0, scaledWidth, targetSize);
    }
  } else {
    const size = Math.min(img.width, img.height);
    const sx = (img.width - size) / 2;
    const sy = (img.height - size) / 2;

    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
  }

  return canvasToProcessed(canvas, {
    enforceMaxBytes: !isUnderMaxBytes,
  });
}

export async function canvasToProcessed(
  canvas: HTMLCanvasElement,
  options: CanvasToProcessedOptions = {},
): Promise<ProcessedImage> {
  const enforceMaxBytes = options.enforceMaxBytes ?? true;

  // Try PNG first
  let blob = await canvasToBlob(canvas, "image/png", 1);
  if (!enforceMaxBytes || blob.size <= MAX_BYTES) {
    return makeResult(blob, canvas.width, canvas.height);
  }

  // Iteratively reduce JPEG quality
  for (let q = 0.92; q >= 0.1; q -= 0.05) {
    blob = await canvasToBlob(canvas, "image/jpeg", q);
    if (blob.size <= MAX_BYTES) {
      return makeResult(blob, canvas.width, canvas.height);
    }
  }

  // Worst case: lowest quality
  blob = await canvasToBlob(canvas, "image/jpeg", 0.1);
  return makeResult(blob, canvas.width, canvas.height);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), type, quality);
  });
}

function makeResult(blob: Blob, width: number, height: number): ProcessedImage {
  return {
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
    sizeBytes: blob.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
