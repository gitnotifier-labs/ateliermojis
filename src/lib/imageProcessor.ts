import type { ProjectSettings, SavedCrop } from "@/lib/projectTypes";

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

  // Find the highest JPEG quality that stays under 128KB.
  const minQuality = 0.1;
  let low = minQuality;
  let high = 0.98;

  const highBlob = await canvasToBlob(canvas, "image/jpeg", high);
  if (highBlob.size <= MAX_BYTES) {
    return makeResult(highBlob, canvas.width, canvas.height);
  }

  let bestBlob = await canvasToBlob(canvas, "image/jpeg", low);
  if (bestBlob.size > MAX_BYTES) {
    return makeResult(bestBlob, canvas.width, canvas.height);
  }

  for (let i = 0; i < 8; i += 1) {
    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, "image/jpeg", mid);

    if (blob.size <= MAX_BYTES) {
      bestBlob = blob;
      low = mid;
    } else {
      high = mid;
    }
  }

  blob = bestBlob;
  return makeResult(blob, canvas.width, canvas.height);
}

export async function processImageWithProjectSettings(
  file: File,
  settings: Pick<ProjectSettings, "squareMode" | "landscapeAlign" | "crop">,
): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (settings.squareMode === "pad") {
    const isLandscape = img.naturalWidth > img.naturalHeight;

    if (isLandscape) {
      const scaledHeight = (img.naturalHeight / img.naturalWidth) * TARGET_SIZE;
      const y =
        settings.landscapeAlign === "top"
          ? 0
          : settings.landscapeAlign === "bottom"
            ? TARGET_SIZE - scaledHeight
            : (TARGET_SIZE - scaledHeight) / 2;

      ctx.drawImage(img, 0, y, TARGET_SIZE, scaledHeight);
    } else {
      const scaledWidth = (img.naturalWidth / img.naturalHeight) * TARGET_SIZE;
      const x = (TARGET_SIZE - scaledWidth) / 2;
      ctx.drawImage(img, x, 0, scaledWidth, TARGET_SIZE);
    }

    return canvasToProcessed(canvas);
  }

  const crop = normalizeCrop(
    img.naturalWidth,
    img.naturalHeight,
    settings.crop,
  );
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE,
  );

  return canvasToProcessed(canvas);
}

function normalizeCrop(
  naturalWidth: number,
  naturalHeight: number,
  crop?: SavedCrop,
): { x: number; y: number; width: number; height: number } {
  if (!crop) {
    const size = Math.min(naturalWidth, naturalHeight);
    return {
      x: (naturalWidth - size) / 2,
      y: (naturalHeight - size) / 2,
      width: size,
      height: size,
    };
  }

  const x = (crop.x / 100) * naturalWidth;
  const y = (crop.y / 100) * naturalHeight;
  const width = (crop.width / 100) * naturalWidth;
  const height = (crop.height / 100) * naturalHeight;

  const boundedX = clamp(x, 0, naturalWidth - 1);
  const boundedY = clamp(y, 0, naturalHeight - 1);
  const boundedWidth = clamp(width, 1, naturalWidth - boundedX);
  const boundedHeight = clamp(height, 1, naturalHeight - boundedY);

  return {
    x: boundedX,
    y: boundedY,
    width: boundedWidth,
    height: boundedHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
