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
  templateUrl: string,
): Promise<Blob> {
  const [emojiImage, templateImage] = await Promise.all([
    loadImage(sourceUrl),
    loadImage(templateUrl),
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

  ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

  const overlayWidth = canvas.width / 3;
  const overlayHeight = overlayWidth;

  const scale = Math.min(
    overlayWidth / emojiImage.width,
    overlayHeight / emojiImage.height,
    1,
  );
  const drawWidth = emojiImage.width * scale;
  const drawHeight = emojiImage.height * scale;

  ctx.drawImage(emojiImage, 0, 0, drawWidth, drawHeight);

  return canvasToBlob(canvas);
}
