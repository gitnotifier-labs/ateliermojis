import { useEffect, useState } from "react";
import { Download, Check, ArrowRight, RotateCcw, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatBytes, type ProcessedImage } from "@/lib/imageProcessor";
import { motion } from "framer-motion";

interface EmojiPreviewProps {
  originalFile: File;
  originalUrl: string;
  processed: ProcessedImage;
  onReset: () => void;
  onAdjustCrop: () => void;
  onNameChange?: (name: string) => void;
}

export function EmojiPreview({
  originalFile,
  originalUrl,
  processed,
  onReset,
  onAdjustCrop,
  onNameChange,
}: EmojiPreviewProps) {
  const defaultName = `${originalFile.name.replace(/\.[^.]+$/, "")}-emoji`;
  const [downloadName, setDownloadName] = useState(defaultName);

  useEffect(() => {
    setDownloadName(defaultName);
    onNameChange?.(defaultName);
  }, [defaultName, onNameChange]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = processed.url;
    const ext = processed.blob.type === "image/png" ? "png" : "jpg";
    const cleanName =
      downloadName.trim().replace(/[/\\?%*:|"<>]/g, "") || "emoji";
    a.download = `${cleanName}.${ext}`;
    a.click();
  };

  const isUnderLimit = processed.sizeBytes <= 128 * 1024;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="flex items-center gap-6 flex-wrap justify-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Original
          </p>
          <div className="w-24 h-24 rounded-xl border bg-muted/30 overflow-hidden flex items-center justify-center">
            <img
              src={originalUrl}
              alt="Original"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {formatBytes(originalFile.size)}
          </Badge>
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Emoji-ready
          </p>
          <div
            className="w-24 h-24 rounded-xl border overflow-hidden flex items-center justify-center"
            style={{
              backgroundImage:
                "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%)",
              backgroundSize: "12px 12px",
              backgroundPosition: "0 0, 6px 6px",
            }}
          >
            <img
              src={processed.url}
              alt="Processed"
              className="w-full h-full"
            />
          </div>
          <Badge
            variant={isUnderLimit ? "default" : "destructive"}
            className={`text-xs gap-1 ${isUnderLimit ? "bg-secondary" : ""}`}
          >
            {isUnderLimit && <Check className="h-3 w-3" />}
            {formatBytes(processed.sizeBytes)}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {processed.width}×{processed.height}px ·{" "}
        {processed.blob.type === "image/png" ? "PNG" : "JPEG"}
      </p>

      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          File name
        </p>
        <Input
          value={downloadName}
          onChange={(event) => {
            const nextName = event.target.value;
            setDownloadName(nextName);
            onNameChange?.(nextName);
          }}
          maxLength={64}
          placeholder="emoji"
          className="text-sm"
        />
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          New image
        </Button>
        <Button variant="outline" onClick={onAdjustCrop} className="gap-2">
          <Crop className="h-4 w-4" />
          Adjust square
        </Button>
        <Button
          onClick={handleDownload}
          className="gap-2 bg-secondary hover:bg-secondary/90"
        >
          <Download className="h-4 w-4" />
          Download emoji
        </Button>
      </div>
    </motion.div>
  );
}
