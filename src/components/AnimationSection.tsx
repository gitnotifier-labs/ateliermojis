import { useState, useEffect, useRef } from "react";
import {
  Zap,
  RotateCw,
  Move,
  Sparkles,
  Waves,
  ZoomIn,
  ArrowLeftRight,
  ChevronsRight,
  Shield,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  type AnimationType,
  type AnimationOptions,
  getAnimationTransform,
  generateAnimatedGif,
} from "@/lib/gifEncoder";
import { motion } from "framer-motion";

const animations: {
  type: AnimationType;
  icon: typeof Zap;
  label: string;
  color: string;
}[] = [
  { type: "bounce", icon: Zap, label: "Bounce", color: "text-slack-cyan" },
  { type: "spin", icon: RotateCw, label: "Spin", color: "text-slack-green" },
  { type: "shake", icon: Move, label: "Shake", color: "text-slack-yellow" },
  { type: "pulse", icon: Sparkles, label: "Pulse", color: "text-slack-pink" },
  { type: "wobble", icon: Waves, label: "Wobble", color: "text-slack-cyan" },
  { type: "zoom", icon: ZoomIn, label: "Zoom", color: "text-slack-green" },
  {
    type: "slide",
    icon: ArrowLeftRight,
    label: "Slide",
    color: "text-slack-yellow",
  },
  {
    type: "scroll",
    icon: ChevronsRight,
    label: "Scroll",
    color: "text-slack-pink",
  },
  {
    type: "thug-life",
    icon: Shield,
    label: "Thug Life",
    color: "text-slack-green",
  },
];

interface AnimationSectionProps {
  processedUrl: string;
  fileName: string;
  downloadName: string;
}

const DEFAULT_FPS = 20;
const DEFAULT_INTENSITY = 1;

export function AnimationSection({
  processedUrl,
  fileName,
  downloadName,
}: AnimationSectionProps) {
  const [generatingType, setGeneratingType] = useState<AnimationType | null>(
    null,
  );
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY);
  const [showOptions, setShowOptions] = useState(false);

  const canvasRefs = useRef<Record<AnimationType, HTMLCanvasElement | null>>({
    bounce: null,
    spin: null,
    shake: null,
    pulse: null,
    wobble: null,
    zoom: null,
    slide: null,
    scroll: null,
    "thug-life": null,
  });
  const animFrameRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const thugLifeGlassesRef = useRef<HTMLImageElement | null>(null);
  const optionsRef = useRef<AnimationOptions>({ fps: DEFAULT_FPS, intensity });

  // Keep optionsRef in sync without restarting the RAF loop
  useEffect(() => {
    optionsRef.current = { fps: DEFAULT_FPS, intensity };
  }, [intensity]);

  const fallbackBaseName = fileName.replace(/\.[^.]+$/, "");
  const baseName =
    downloadName.trim().replace(/[/\\?%*:|"<>]/g, "") || fallbackBaseName;

  // Load image once when processedUrl changes
  useEffect(() => {
    const img = new Image();
    img.src = processedUrl;
    img.onload = () => {
      imgRef.current = img;
    };
  }, [processedUrl]);

  // Load static overlay images once on mount
  useEffect(() => {
    const tl = new Image();
    tl.src = "/thug-life-glasses.png";
    tl.onload = () => {
      thugLifeGlassesRef.current = tl;
    };
  }, []);

  // Single RAF loop animating all canvases
  useEffect(() => {
    const hasCanvas = animations.some(
      ({ type }) => canvasRefs.current[type] !== null,
    );
    if (!hasCanvas) return;

    let running = true;
    const size = 128;
    const startTime = performance.now();

    const draw = (now: number) => {
      if (!running) return;

      if (imgRef.current) {
        const elapsed = (now - startTime) / 1000;
        const t = elapsed % 1;
        const { intensity: k } = optionsRef.current;

        for (const { type } of animations) {
          const canvas = canvasRefs.current[type];
          if (!canvas) continue;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          ctx.clearRect(0, 0, size, size);
          ctx.save();

          if (type === "scroll") {
            // Seamless tiling horizontal scroll
            const shift = (((t * size * k) % size) + size) % size;
            ctx.drawImage(imgRef.current, shift - size, 0, size, size);
            ctx.drawImage(imgRef.current, shift, 0, size, size);
          } else if (type === "thug-life") {
            // Preview: base image + falling glasses overlay (2-second cycle)
            const glassesImg = thugLifeGlassesRef.current;
            const cycle = (elapsed % 2) / 2;
            ctx.drawImage(imgRef.current, 0, 0, size, size);
            const targetY = (size * 2) / 3;
            const startY = -24;
            const fallEndT = 0.5;
            const progress = Math.min(cycle / fallEndT, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const glassesY = startY + (targetY - startY) * eased;
            if (glassesImg) {
              const glassesW = size * 0.7;
              const glassesH =
                glassesW * (glassesImg.naturalHeight / glassesImg.naturalWidth);
              ctx.save();
              ctx.translate(size / 2, glassesY);
              ctx.scale(-1, 1);
              ctx.drawImage(
                glassesImg,
                -glassesW / 2,
                -glassesH / 2,
                glassesW,
                glassesH,
              );
              ctx.restore();
            } else {
              drawSunglassesPreview(ctx, size / 2, glassesY, size);
            }
            if (cycle >= fallEndT) {
              const textAlpha = Math.min((cycle - fallEndT) / 0.1, 1);
              ctx.globalAlpha = textAlpha;
              ctx.font = `bold ${Math.round(size * 0.09)}px Impact, Arial Black, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.strokeStyle = "#000";
              ctx.lineWidth = 3;
              ctx.strokeText("THUG LIFE", size / 2, size - 4);
              ctx.fillStyle = "#fff";
              ctx.fillText("THUG LIFE", size / 2, size - 4);
              ctx.globalAlpha = 1;
            }
          } else {
            const { tx, ty, rotation, scale } = getAnimationTransform(
              type,
              t,
              k,
            );
            ctx.translate(size / 2 + tx, size / 2 + ty);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);
            ctx.drawImage(imgRef.current, -size / 2, -size / 2, size, size);
          }

          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [processedUrl]);

  const handleDownloadForType = async (type: AnimationType) => {
    setGeneratingType(type);
    try {
      const blob = await generateAnimatedGif(processedUrl, type, {
        fps: DEFAULT_FPS,
        intensity,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}-${type}.gif`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingType(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 text-center w-full"
    >
      <h2 className="text-xl font-bold text-foreground mb-1">
        Animate your emoji
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Pick an effect and the GIF downloads instantly.
      </p>

      {/* Animation grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 w-full">
        {animations.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => {
              void handleDownloadForType(type);
            }}
            disabled={generatingType !== null}
            className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
              generatingType === type
                ? "border-primary bg-primary/10 shadow-xs cursor-progress"
                : generatingType === null
                  ? "bg-card/50 hover:bg-muted/50 cursor-pointer"
                  : "bg-card/50 cursor-not-allowed"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {generatingType === type ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Icon className={`h-4 w-4 ${color}`} />
              )}
              <span className="text-sm font-semibold text-foreground">
                {label}
              </span>
            </span>
            <div className="w-20 h-20 rounded-xl border overflow-hidden flex items-center justify-center bg-muted/30">
              <canvas
                ref={(node) => {
                  canvasRefs.current[type] = node;
                }}
                width={128}
                height={128}
                className="w-full h-full"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{`${baseName}-${type}`}</p>
            <span className="text-[11px] text-muted-foreground/80 uppercase tracking-wider">
              {generatingType === type ? "Downloading" : "Instant GIF"}
            </span>
          </button>
        ))}
      </div>

      {/* Collapsible options */}
      <div className="mx-auto mt-2 mb-6 w-full max-w-sm text-center">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`}
          />
          More options
        </button>

        {showOptions && (
          <div className="mt-3 rounded-xl border bg-card/50 px-5 py-4 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Intensity
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {intensity.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Mirrors the sunglasses drawing logic from gifEncoder for the live preview. */
function drawSunglassesPreview(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const lensW = size * 0.22;
  const lensH = size * 0.11;
  const lensR = lensH * 0.45;
  const gap = size * 0.06;
  const frameThickness = 2;

  const leftX = cx - gap / 2 - lensW;
  const rightX = cx + gap / 2;
  const lensY = cy - lensH / 2;

  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  previewRoundRect(ctx, leftX, lensY, lensW, lensH, lensR);
  ctx.fill();
  previewRoundRect(ctx, rightX, lensY, lensW, lensH, lensR);
  ctx.fill();

  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = frameThickness;
  previewRoundRect(ctx, leftX, lensY, lensW, lensH, lensR);
  ctx.stroke();
  previewRoundRect(ctx, rightX, lensY, lensW, lensH, lensR);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftX + lensW, cy);
  ctx.lineTo(rightX, cy);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = frameThickness;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftX, cy);
  ctx.lineTo(leftX - size * 0.08, cy - size * 0.02);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = frameThickness;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightX + lensW, cy);
  ctx.lineTo(rightX + lensW + size * 0.08, cy - size * 0.02);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = frameThickness;
  ctx.stroke();

  ctx.restore();
}

function previewRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
