import { GIFEncoder, quantize, applyPalette } from "gifenc";

export type AnimationType =
  | "bounce"
  | "spin"
  | "shake"
  | "pulse"
  | "wobble"
  | "zoom"
  | "slide"
  | "scroll"
  | "thug-life";

export interface AnimationOptions {
  /** Frames per second (1–30, default 20) */
  fps?: number;
  /** Amplitude multiplier applied to all motion values (0.1–2, default 1) */
  intensity?: number;
}

const SIZE = 128;
const DEFAULT_FPS = 20;
const DEFAULT_INTENSITY = 1;

type TransformFn = (
  t: number,
  intensity: number,
) => {
  tx: number;
  ty: number;
  rotation: number;
  scale: number;
};

const transforms: Record<AnimationType, TransformFn> = {
  bounce: (t, k) => ({
    tx: 0,
    ty: -Math.abs(Math.sin(t * Math.PI * 2)) * 20 * k,
    rotation: 0,
    scale: 1,
  }),
  spin: (t, k) => ({
    tx: 0,
    ty: 0,
    rotation: t * Math.PI * 2 * k,
    scale: 1,
  }),
  shake: (t, k) => ({
    tx: Math.sin(t * Math.PI * 6) * 10 * k,
    ty: 0,
    rotation: Math.sin(t * Math.PI * 6) * 0.1 * k,
    scale: 1,
  }),
  pulse: (t, k) => ({
    tx: 0,
    ty: 0,
    rotation: 0,
    scale: 1 + Math.sin(t * Math.PI * 2) * 0.15 * k,
  }),
  wobble: (t, k) => ({
    tx: Math.sin(t * Math.PI * 2) * 8 * k,
    ty: 0,
    rotation: Math.sin(t * Math.PI * 2) * 0.25 * k,
    scale: 1,
  }),
  zoom: (t, k) => ({
    tx: 0,
    ty: 0,
    rotation: 0,
    scale: 1 + Math.sin(t * Math.PI * 2) * 0.35 * k,
  }),
  slide: (t, k) => ({
    tx: Math.sin(t * Math.PI * 2) * 24 * k,
    ty: 0,
    rotation: 0,
    scale: 1,
  }),
  // Continuous horizontal scroll — uses tiling draw, tx cycles 0→SIZE
  scroll: (t, _k) => ({
    tx: t * SIZE,
    ty: 0,
    rotation: 0,
    scale: 1,
  }),
  // Stub — preview shows image stationary; real GIF uses generateThugLifeGif
  "thug-life": (_t, _k) => ({
    tx: 0,
    ty: 0,
    rotation: 0,
    scale: 1,
  }),
};

export function getAnimationTransform(
  type: AnimationType,
  t: number,
  intensity = DEFAULT_INTENSITY,
) {
  return transforms[type](t, intensity);
}

export async function generateAnimatedGif(
  imageUrl: string,
  animation: AnimationType,
  options: AnimationOptions = {},
): Promise<Blob> {
  if (animation === "thug-life") {
    return generateThugLifeGif(imageUrl, options);
  }

  const fps = Math.max(1, Math.min(30, options.fps ?? DEFAULT_FPS));
  const intensity = Math.max(
    0.1,
    Math.min(3, options.intensity ?? DEFAULT_INTENSITY),
  );
  // One full loop = 1 second worth of frames
  const frameCount = fps;
  const frameDelay = Math.round(1000 / fps);

  const img = await loadImg(imageUrl);
  const transformFn = transforms[animation];

  const gif = GIFEncoder();

  for (let i = 0; i < frameCount; i++) {
    const t = i / frameCount;
    const { tx, ty, rotation, scale } = transformFn(t, intensity);

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();

    if (animation === "scroll") {
      // Tiling draw: shift = t * SIZE, draw image at (shift - SIZE) and shift
      // so the image wraps seamlessly left-to-right
      const shift = t * SIZE * intensity;
      const x = ((shift % SIZE) + SIZE) % SIZE;
      ctx.drawImage(img, x - SIZE, 0, SIZE, SIZE);
      ctx.drawImage(img, x, 0, SIZE, SIZE);
    } else {
      ctx.translate(SIZE / 2 + tx, SIZE / 2 + ty);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    }

    ctx.restore();

    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);

    gif.writeFrame(index, SIZE, SIZE, {
      palette,
      delay: frameDelay,
      transparent: true,
      dispose: 2,
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

async function generateThugLifeGif(
  imageUrl: string,
  options: AnimationOptions = {},
): Promise<Blob> {
  const fps = Math.max(1, Math.min(30, options.fps ?? DEFAULT_FPS));
  const frameCount = fps * 2;
  const frameDelay = Math.round(1000 / fps);

  const [img, glassesImg] = await Promise.all([
    loadImg(imageUrl),
    loadImg("/thug-life-glasses.png"),
  ]);
  const gif = GIFEncoder();

  const targetY = (SIZE * 2) / 3;
  const startY = -24;
  const fallEndT = 0.5;

  const glassesW = SIZE * 0.7;
  const glassesH =
    glassesW * (glassesImg.naturalHeight / glassesImg.naturalWidth);

  for (let i = 0; i < frameCount; i++) {
    const t = i / frameCount;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(img, 0, 0, SIZE, SIZE);

    const progress = Math.min(t / fallEndT, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const glassesY = startY + (targetY - startY) * eased;

    ctx.save();
    ctx.translate(SIZE / 2, glassesY);
    ctx.scale(-1, 1);
    ctx.drawImage(glassesImg, -glassesW / 2, -glassesH / 2, glassesW, glassesH);
    ctx.restore();

    if (t >= fallEndT) {
      const textAlpha = Math.min((t - fallEndT) / 0.1, 1);
      ctx.globalAlpha = textAlpha;
      ctx.font = `bold ${Math.round(SIZE * 0.09)}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText("THUG LIFE", SIZE / 2, SIZE - 4);
      ctx.fillStyle = "#fff";
      ctx.fillText("THUG LIFE", SIZE / 2, SIZE - 4);
      ctx.globalAlpha = 1;
    }

    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);

    gif.writeFrame(index, SIZE, SIZE, {
      palette,
      delay: frameDelay,
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
