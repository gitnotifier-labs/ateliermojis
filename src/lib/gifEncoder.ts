import { GIFEncoder, quantize, applyPalette } from "gifenc";

export type AnimationType = "bounce" | "spin" | "shake" | "pulse";

const SIZE = 128;
const FRAME_COUNT = 20;
const FRAME_DELAY = 50; // ms per frame (20fps)

type TransformFn = (t: number) => { tx: number; ty: number; rotation: number; scale: number };

const transforms: Record<AnimationType, TransformFn> = {
  bounce: (t) => ({
    tx: 0,
    ty: -Math.abs(Math.sin(t * Math.PI * 2)) * 20,
    rotation: 0,
    scale: 1,
  }),
  spin: (t) => ({
    tx: 0,
    ty: 0,
    rotation: t * Math.PI * 2,
    scale: 1,
  }),
  shake: (t) => ({
    tx: Math.sin(t * Math.PI * 6) * 10,
    ty: 0,
    rotation: Math.sin(t * Math.PI * 6) * 0.1,
    scale: 1,
  }),
  pulse: (t) => ({
    tx: 0,
    ty: 0,
    rotation: 0,
    scale: 0.85 + Math.sin(t * Math.PI * 2) * 0.15,
  }),
};

export function getAnimationTransform(type: AnimationType, t: number) {
  return transforms[type](t);
}

export async function generateAnimatedGif(
  imageUrl: string,
  animation: AnimationType
): Promise<Blob> {
  const img = await loadImg(imageUrl);
  const transformFn = transforms[animation];

  const gif = GIFEncoder();

  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = i / FRAME_COUNT;
    const { tx, ty, rotation, scale } = transformFn(t);

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    // Transparent background
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(SIZE / 2 + tx, SIZE / 2 + ty);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);

    gif.writeFrame(index, SIZE, SIZE, {
      palette,
      delay: FRAME_DELAY,
      transparent: true,
      dispose: 2,
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
