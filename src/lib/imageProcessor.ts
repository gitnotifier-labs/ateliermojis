const TARGET_SIZE = 128;
const MAX_BYTES = 128 * 1024; // 128KB

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
  const img = await loadImage(file);

  // Center-crop to square
  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, size, size, 0, 0, TARGET_SIZE, TARGET_SIZE);

  return canvasToProcessed(canvas);
}

export async function canvasToProcessed(canvas: HTMLCanvasElement): Promise<ProcessedImage> {
  // Try PNG first
  let blob = await canvasToBlob(canvas, "image/png", 1);
  if (blob.size <= MAX_BYTES) {
    return makeResult(blob);
  }

  // Iteratively reduce JPEG quality
  for (let q = 0.92; q >= 0.1; q -= 0.05) {
    blob = await canvasToBlob(canvas, "image/jpeg", q);
    if (blob.size <= MAX_BYTES) {
      return makeResult(blob);
    }
  }

  // Worst case: lowest quality
  blob = await canvasToBlob(canvas, "image/jpeg", 0.1);
  return makeResult(blob);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), type, quality);
  });
}

function makeResult(blob: Blob): ProcessedImage {
  return {
    blob,
    url: URL.createObjectURL(blob),
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    sizeBytes: blob.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
