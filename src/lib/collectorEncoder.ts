import type { CollectorTemplate } from "@/lib/collectorTemplates";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate collector emoji"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function generateCollectorEmoji(
  sourceUrl: string,
  template: CollectorTemplate,
): Promise<Blob> {
  const [emojiImage, templateImage] = await Promise.all([
    loadImage(sourceUrl),
    loadImage(template.url),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = templateImage.width;
  canvas.height = templateImage.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the template as the base
  ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

  // Compute the pixel overlay box from fractional coordinates
  const boxX = template.overlay.x * canvas.width;
  const boxY = template.overlay.y * canvas.height;
  const boxW = template.overlay.width * canvas.width;
  const boxH = template.overlay.height * canvas.height;

  // Aspect-preserve fit (object-contain) inside the overlay box
  const scale = Math.min(boxW / emojiImage.width, boxH / emojiImage.height);
  const drawWidth = emojiImage.width * scale;
  const drawHeight = emojiImage.height * scale;

  // Centre the emoji within the box
  const drawX = boxX + (boxW - drawWidth) / 2;
  const drawY = boxY + (boxH - drawHeight) / 2;

  ctx.drawImage(emojiImage, drawX, drawY, drawWidth, drawHeight);

  return canvasToBlob(canvas);
}
