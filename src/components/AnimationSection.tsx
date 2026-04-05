import { useState, useEffect, useRef } from "react";
import { Zap, RotateCw, Move, Sparkles, Download, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/imageProcessor";
import {
  type AnimationType,
  getAnimationTransform,
  generateAnimatedGif,
} from "@/lib/gifEncoder";
import { motion } from "framer-motion";

const animations: { type: AnimationType; icon: typeof Zap; label: string; color: string }[] = [
  { type: "bounce", icon: Zap, label: "Bounce", color: "text-slack-cyan" },
  { type: "spin", icon: RotateCw, label: "Spin", color: "text-slack-green" },
  { type: "shake", icon: Move, label: "Shake", color: "text-slack-yellow" },
  { type: "pulse", icon: Sparkles, label: "Pulse", color: "text-slack-pink" },
];

interface AnimationSectionProps {
  processedUrl: string;
  fileName: string;
}

export function AnimationSection({ processedUrl, fileName }: AnimationSectionProps) {
  const [selected, setSelected] = useState<AnimationType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifUrl, setGifUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.src = processedUrl;
    img.onload = () => { imgRef.current = img; };
  }, [processedUrl]);

  // Animate canvas preview
  useEffect(() => {
    if (!selected || !canvasRef.current) return;

    let running = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const size = 128;
    const startTime = performance.now();

    const draw = (now: number) => {
      if (!running || !imgRef.current) return;
      const elapsed = (now - startTime) / 1000;
      const t = (elapsed % 1);
      const { tx, ty, rotation, scale } = getAnimationTransform(selected, t);

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + tx, size / 2 + ty);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.drawImage(imgRef.current, -size / 2, -size / 2, size, size);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [selected, processedUrl]);

  // Reset GIF when animation changes
  useEffect(() => {
    setGifBlob(null);
    setGifUrl("");
  }, [selected]);

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const blob = await generateAnimatedGif(processedUrl, selected);
      setGifBlob(blob);
      setGifUrl(URL.createObjectURL(blob));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!gifUrl) return;
    const a = document.createElement("a");
    a.href = gifUrl;
    const name = fileName.replace(/\.[^.]+$/, "");
    a.download = `${name}-${selected}.gif`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 text-center w-full"
    >
      <h2 className="text-xl font-bold text-foreground mb-1">Animate your emoji</h2>
      <p className="text-sm text-muted-foreground mb-5">Pick a style and generate a GIF</p>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {animations.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              selected === type
                ? "border-primary bg-primary/10 shadow-sm"
                : "bg-card/50 hover:bg-muted/50"
            }`}
          >
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </button>
        ))}
      </div>

      {selected && (
        <motion.div
          key={selected}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {/* Live preview */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
              <div className="w-24 h-24 rounded-xl border overflow-hidden flex items-center justify-center bg-muted/30">
                <canvas ref={canvasRef} width={128} height={128} className="w-full h-full" />
              </div>
            </div>

            {/* Generated GIF */}
            {gifUrl && (
              <>
                <ArrowLeft className="h-5 w-5 text-muted-foreground hidden sm:block rotate-180" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GIF</p>
                  <div className="w-24 h-24 rounded-xl border overflow-hidden flex items-center justify-center bg-muted/30">
                    <img src={gifUrl} alt="Animated GIF" className="w-full h-full" />
                  </div>
                  {gifBlob && (
                    <Badge variant="outline" className="text-xs">
                      {formatBytes(gifBlob.size)}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            {!gifUrl ? (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="gap-2 bg-secondary hover:bg-secondary/90"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? "Generating…" : "Generate GIF"}
              </Button>
            ) : (
              <Button onClick={handleDownload} className="gap-2 bg-secondary hover:bg-secondary/90">
                <Download className="h-4 w-4" />
                Download GIF
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
