import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";
import type { SavedCrop } from "@/lib/projectTypes";

interface CropEditorProps {
  imageUrl: string;
  initialCrop?: SavedCrop;
  onCropComplete: (
    canvas: HTMLCanvasElement,
    settings: {
      crop: SavedCrop;
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
  initialCrop,
  onCropComplete,
  onBack,
}: CropEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop | undefined>(initialCrop);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setCrop(initialCrop ?? centerAspectCrop(naturalWidth, naturalHeight));
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

    if (!crop) return;

    const displayCrop = convertToPixelCrop(crop, img.width, img.height);
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelCrop = {
      x: displayCrop.x * scaleX,
      y: displayCrop.y * scaleY,
      width: displayCrop.width * scaleX,
      height: displayCrop.height * scaleY,
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
      return;
    }

    setCrop(initialCrop);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Adjust square output
      </p>

      <div className="max-w-sm w-full rounded-xl overflow-hidden border bg-muted/30">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
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
          Crop & convert
        </Button>
      </div>
    </div>
  );
}
