import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";
import type {
  EditorLandscapeAlign,
  EditorSquareMode,
  SavedCrop,
} from "@/lib/projectTypes";

interface CropEditorProps {
  imageUrl: string;
  initialMode: EditorSquareMode;
  initialLandscapeAlign: EditorLandscapeAlign;
  initialCrop?: SavedCrop;
  onCropComplete: (
    canvas: HTMLCanvasElement,
    settings: {
      squareMode: EditorSquareMode;
      landscapeAlign: EditorLandscapeAlign;
      crop?: SavedCrop;
    },
  ) => void;
  onBack: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function CropEditor({
  imageUrl,
  initialMode,
  initialLandscapeAlign,
  initialCrop,
  onCropComplete,
  onBack,
}: CropEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop | undefined>(initialCrop);
  const [mode, setMode] = useState<EditorSquareMode>(initialMode);
  const [landscapeAlign, setLandscapeAlign] = useState<EditorLandscapeAlign>(
    initialLandscapeAlign,
  );
  const [isLandscape, setIsLandscape] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setCrop(initialCrop ?? centerAspectCrop(naturalWidth, naturalHeight));
      setIsLandscape(naturalWidth > naturalHeight);
    },
    [initialCrop],
  );

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (mode === "pad") {
      const isLandscapeImage = img.naturalWidth > img.naturalHeight;

      if (isLandscapeImage) {
        const scaledHeight = (img.naturalHeight / img.naturalWidth) * 128;
        const y =
          landscapeAlign === "top"
            ? 0
            : landscapeAlign === "bottom"
              ? 128 - scaledHeight
              : (128 - scaledHeight) / 2;

        ctx.drawImage(img, 0, y, 128, scaledHeight);
      } else {
        const scaledWidth = (img.naturalWidth / img.naturalHeight) * 128;
        const x = (128 - scaledWidth) / 2;

        ctx.drawImage(img, x, 0, scaledWidth, 128);
      }

      onCropComplete(canvas, {
        squareMode: mode,
        landscapeAlign,
      });
      return;
    }

    if (!crop) return;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY,
    };

    ctx.drawImage(
      img,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      128,
      128,
    );
    onCropComplete(canvas, {
      squareMode: mode,
      landscapeAlign,
      crop: {
        unit: "%",
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
      },
    });
  };

  const handleReset = () => {
    const img = imgRef.current;
    if (img) {
      setCrop(centerAspectCrop(img.naturalWidth, img.naturalHeight));
      setMode(initialMode);
      setLandscapeAlign(initialLandscapeAlign);
      return;
    }

    setMode(initialMode);
    setLandscapeAlign(initialLandscapeAlign);
    setCrop(initialCrop);
  };

  const handleModeChange = (nextMode: EditorSquareMode) => {
    setMode(nextMode);
    if (nextMode === "pad") {
      setLandscapeAlign("center");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Adjust square output
      </p>
      <div className="flex gap-2 flex-wrap justify-center">
        <Button
          size="sm"
          variant={mode === "crop" ? "default" : "outline"}
          onClick={() => handleModeChange("crop")}
        >
          Crop to fill
        </Button>
        <Button
          size="sm"
          variant={mode === "pad" ? "default" : "outline"}
          onClick={() => handleModeChange("pad")}
        >
          Transparent pad
        </Button>
      </div>

      {mode === "pad" && isLandscape && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Vertical align
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={landscapeAlign === "top" ? "default" : "outline"}
              onClick={() => setLandscapeAlign("top")}
            >
              Top
            </Button>
            <Button
              size="sm"
              variant={landscapeAlign === "center" ? "default" : "outline"}
              onClick={() => setLandscapeAlign("center")}
            >
              Center
            </Button>
            <Button
              size="sm"
              variant={landscapeAlign === "bottom" ? "default" : "outline"}
              onClick={() => setLandscapeAlign("bottom")}
            >
              Bottom
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-sm w-full rounded-xl overflow-hidden border bg-muted/30">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          aspect={1}
          circularCrop={false}
          className="max-w-full"
          disabled={mode === "pad"}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop preview"
            onLoad={onImageLoad}
            className="max-w-full"
          />
        </ReactCrop>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          Back
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          className="gap-2 bg-secondary hover:bg-secondary/90"
        >
          <Check className="h-3.5 w-3.5" />
          {mode === "crop" ? "Crop & convert" : "Pad & convert"}
        </Button>
      </div>
    </div>
  );
}
