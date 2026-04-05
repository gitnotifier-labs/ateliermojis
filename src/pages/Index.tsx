import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImageUploader } from "@/components/ImageUploader";
import { CropEditor } from "@/components/CropEditor";
import { EmojiPreview } from "@/components/EmojiPreview";
import { AnimationSection } from "@/components/AnimationSection";
import { processImage, type ProcessedImage } from "@/lib/imageProcessor";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const MAX_BYTES = 128 * 1024;

async function canvasToProcessed(canvas: HTMLCanvasElement): Promise<ProcessedImage> {
  const toBlob = (type: string, q: number) =>
    new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), type, q));

  let blob = await toBlob("image/png", 1);
  if (blob.size <= MAX_BYTES) {
    return { blob, url: URL.createObjectURL(blob), width: 128, height: 128, sizeBytes: blob.size };
  }
  for (let q = 0.92; q >= 0.1; q -= 0.05) {
    blob = await toBlob("image/jpeg", q);
    if (blob.size <= MAX_BYTES) break;
  }
  return { blob, url: URL.createObjectURL(blob), width: 128, height: 128, sizeBytes: blob.size };
}

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [step, setStep] = useState<"upload" | "crop" | "done">("upload");
  const [processing, setProcessing] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setProcessed(null);
    setProcessing(true);
    try {
      const result = await processImage(f);
      setProcessed(result);
      setStep("done");
    } finally {
      setProcessing(false);
    }
  };

  const handleCropComplete = async (canvas: HTMLCanvasElement) => {
    const result = await canvasToProcessed(canvas);
    setProcessed(result);
    setStep("done");
  };

  const handleReset = () => {
    setFile(null);
    setFileUrl("");
    setProcessed(null);
    setStep("upload");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-slack-cyan" />
            <div className="w-3 h-3 rounded-full bg-slack-green" />
            <div className="w-3 h-3 rounded-full bg-slack-yellow" />
            <div className="w-3 h-3 rounded-full bg-slack-pink" />
          </div>
          <span className="font-extrabold text-foreground text-lg">AtelierMojis</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16 max-w-2xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight">
            Make any image a{" "}
            <span className="bg-gradient-to-r from-slack-cyan via-slack-green to-slack-yellow bg-clip-text text-transparent">
              Slack emoji
            </span>
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">128×128px · Under 128KB · Ready to upload</p>
        </motion.div>

        {step === "upload" && <ImageUploader onFileSelected={handleFile} />}

        {step === "upload" && processing && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processing your image…</p>
          </div>
        )}

        {step === "crop" && file && (
          <CropEditor imageUrl={fileUrl} onCropComplete={handleCropComplete} onBack={() => setStep("done")} />
        )}

        {step === "done" && processed && file && (
          <>
            <EmojiPreview
              originalFile={file}
              originalUrl={fileUrl}
              processed={processed}
              onReset={handleReset}
              onAdjustCrop={() => setStep("crop")}
            />
            <AnimationSection processedUrl={processed.url} fileName={file.name} />
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        All processing happens in your browser · Nothing is uploaded
      </footer>
    </div>
  );
}
