import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImageUploader } from "@/components/ImageUploader";
import { CropEditor } from "@/components/CropEditor";
import { EmojiPreview } from "@/components/EmojiPreview";
import { AnimationSection } from "@/components/AnimationSection";
import {
  canvasToProcessed,
  processImage,
  type ProcessedImage,
} from "@/lib/imageProcessor";
import { Loader2, Github } from "lucide-react";
import { motion } from "framer-motion";

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
          <span className="font-extrabold text-foreground text-lg">
            AtelierMojis
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/gitnotifier-labs/ateliermojis"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open AtelierMojis on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight">
            Make any image a{" "}
            <span className="bg-gradient-to-r from-slack-cyan via-slack-green to-slack-yellow bg-clip-text text-transparent">
              Slack emoji
            </span>
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            128×128px · Under 128KB · Ready to upload
          </p>
        </motion.div>

        {step === "upload" && <ImageUploader onFileSelected={handleFile} />}

        {step === "upload" && processing && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Processing your image…
            </p>
          </div>
        )}

        {step === "crop" && file && (
          <CropEditor
            imageUrl={fileUrl}
            onCropComplete={handleCropComplete}
            onBack={() => setStep("done")}
          />
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
            <AnimationSection
              processedUrl={processed.url}
              fileName={file.name}
            />
          </>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        All processing happens in your browser · Nothing is uploaded ·{" "}
        <a
          href="https://gitnotifier.com/?utm_source=ateliermojis&utm_medium=referral&utm_campaign=project_footer"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          A Gitnotifier Labs project
        </a>{" "}
        · Made with ❤️ in France 🇫🇷
      </footer>
    </div>
  );
}
