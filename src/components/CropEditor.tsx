import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";

interface CropEditorProps {
  imageUrl: string;
  onCropComplete: (canvas: HTMLCanvasElement) => void;
  onBack: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function CropEditor({ imageUrl, onCropComplete, onBack }: CropEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centerAspectCrop(naturalWidth, naturalHeight));
  }, []);

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !crop) return;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const pixelCrop = {
      x: (crop.x * scaleX),
      y: (crop.y * scaleY),
      width: (crop.width * scaleX),
      height: (crop.height * scaleY),
    };

    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 128, 128);
    onCropComplete(canvas);
  };

  const handleReset = () => {
    const img = imgRef.current;
    if (img) setCrop(centerAspectCrop(img.naturalWidth, img.naturalHeight));
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Adjust crop area
      </p>
      <div className="max-w-sm w-full rounded-xl overflow-hidden border bg-muted/30">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          aspect={1}
          circularCrop={false}
          className="max-w-full"
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
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          Back
        </Button>
        <Button size="sm" onClick={handleConfirm} className="gap-2 bg-secondary hover:bg-secondary/90">
          <Check className="h-3.5 w-3.5" />
          Crop & convert
        </Button>
      </div>
    </div>
  );
}
