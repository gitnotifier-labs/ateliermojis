import { useState, useEffect, useRef } from "react";
import {
  Zap,
  RotateCw,
  Move,
  Sparkles,
  Waves,
  ZoomIn,
  ArrowLeftRight,
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
  });
  const animFrameRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
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

          const { tx, ty, rotation, scale } = getAnimationTransform(type, t, k);

          ctx.clearRect(0, 0, size, size);
          ctx.save();
          ctx.translate(size / 2 + tx, size / 2 + ty);
          ctx.rotate(rotation);
          ctx.scale(scale, scale);
          ctx.drawImage(imgRef.current, -size / 2, -size / 2, size, size);
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

      {/* Collapsible options */}
      <div className="mx-auto mb-6 w-full max-w-sm text-left">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
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

      {/* Animation grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 w-full">
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
    </motion.div>
  );
}
