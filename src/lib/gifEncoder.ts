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
  | "thug-life"
  | "lurk";

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
  // Stub — preview and real GIF use generateLurkGif
  lurk: (_t, _k) => ({
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
  if (animation === "lurk") {
    return generateLurkGif(imageUrl, options);
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

/**
 * Lurk effect — the emoji hides behind a brick wall on the right third of the
 * canvas, slowly peeks out from behind it, tilts ("lurk pose"), then retreats.
 *
 * Layout (128×128 canvas):
 *   - Wall occupies the right 1/3: x = WALL_X … 128  (≈ 43 px wide)
 *   - Emoji is drawn at full size (128×128) but its pivot/center is positioned
 *     so that only a small left sliver shows past the wall edge when peeking.
 *   - The wall PNG is drawn on top, so it always occludes the right portion.
 *
 * Timing (3-second loop, 60 frames at 20 fps):
 *   0.0 – 0.25  slide in  (emoji moves from fully off-screen right → peek pos)
 *   0.25 – 0.55 lurk      (small tilt / pivot, hold the peek)
 *   0.55 – 0.75 retreat   (slide back off to the right)
 *   0.75 – 1.0  pause     (fully hidden, no-op, builds suspense)
 */
async function generateLurkGif(
  imageUrl: string,
  options: AnimationOptions = {},
): Promise<Blob> {
  const fps = Math.max(1, Math.min(30, options.fps ?? DEFAULT_FPS));
  const DURATION = 3; // seconds per loop
  const frameCount = fps * DURATION;
  const frameDelay = Math.round(1000 / fps);

  const [img, wallImg] = await Promise.all([
    loadImg(imageUrl),
    loadImg("/brick-wall.png"),
  ]);

  const gif = GIFEncoder();

  // Wall starts at 2/3 of canvas width
  const WALL_X = Math.round((SIZE * 2) / 3);
  // Emoji drawn at 75% of canvas size so it feels smaller/hiding behind the wall
  const EMOJI_SIZE = Math.round(SIZE * 0.75);
  // How many px of the emoji peek past the wall's left edge (initial stop)
  const PEEK_SLIVER = 42;
  const PEEK_CENTER_X = WALL_X - PEEK_SLIVER + EMOJI_SIZE / 2;
  // Extra nudge left before the tilt settles (lurk position)
  const LURK_EXTRA = 20; // px further left than peek stop
  const LURK_CENTER_X = PEEK_CENTER_X - LURK_EXTRA;
  // Emoji Y: vertically centered
  const EMOJI_CENTER_Y = SIZE / 2;
  // Off-screen start: emoji fully to the right
  const HIDDEN_CENTER_X = SIZE + EMOJI_SIZE / 2 + 4;

  // Timing (fractions of 0→1 loop):
  //   0.00 – 0.18  slide in to peek position (quick)
  //   0.18 – 0.28  nudge further left to lurk position
  //   0.28 – 0.72  lurk hold with tilt
  //   0.72 – 0.88  retreat
  //   0.88 – 1.00  hidden pause
  const T_IN_END = 0.18;
  const T_NUDGE_END = 0.28;
  const T_LURK_END = 0.72;
  const T_OUT_END = 0.88;

  // 25° tilt — negative = top leans away from wall (to the left)
  const MAX_TILT = -(25 * Math.PI) / 180;

  function easeInOut(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  for (let i = 0; i < frameCount; i++) {
    const t = i / frameCount; // 0 → 1 over DURATION seconds

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    // --- Compute emoji position & rotation for this frame ---
    let emojiCx: number;
    let tilt = 0;

    if (t < T_IN_END) {
      // Slide in: off-screen → peek stop
      const p = easeInOut(t / T_IN_END);
      emojiCx = HIDDEN_CENTER_X + (PEEK_CENTER_X - HIDDEN_CENTER_X) * p;
    } else if (t < T_NUDGE_END) {
      // Nudge further left into lurk position
      const p = easeInOut((t - T_IN_END) / (T_NUDGE_END - T_IN_END));
      emojiCx = PEEK_CENTER_X + (LURK_CENTER_X - PEEK_CENTER_X) * p;
    } else if (t < T_LURK_END) {
      // Lurk: hold position + tilt
      emojiCx = LURK_CENTER_X;
      const lurkT = (t - T_NUDGE_END) / (T_LURK_END - T_NUDGE_END); // 0→1
      // Tilt: ramp up in first 20%, hold, ramp down in last 20%
      tilt =
        lurkT < 0.2
          ? MAX_TILT * easeInOut(lurkT / 0.2)
          : lurkT < 0.8
            ? MAX_TILT
            : MAX_TILT * easeInOut((1 - lurkT) / 0.2);
    } else if (t < T_OUT_END) {
      // Retreat: lurk position → off-screen
      const p = easeInOut((t - T_LURK_END) / (T_OUT_END - T_LURK_END));
      emojiCx = LURK_CENTER_X + (HIDDEN_CENTER_X - LURK_CENTER_X) * p;
    } else {
      // Hidden pause
      emojiCx = HIDDEN_CENTER_X;
    }

    // --- Draw emoji (behind wall) ---
    ctx.save();
    ctx.translate(emojiCx, EMOJI_CENTER_Y);
    ctx.rotate(tilt);
    ctx.drawImage(
      img,
      -EMOJI_SIZE / 2,
      -EMOJI_SIZE / 2,
      EMOJI_SIZE,
      EMOJI_SIZE,
    );
    ctx.restore();

    // --- Draw wall on top (right 1/3) ---
    // Source: full wall image; destination: right third of canvas
    const WALL_W = SIZE - WALL_X;
    ctx.drawImage(
      wallImg,
      0,
      0,
      wallImg.naturalWidth,
      wallImg.naturalHeight,
      WALL_X,
      0,
      WALL_W,
      SIZE,
    );

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
