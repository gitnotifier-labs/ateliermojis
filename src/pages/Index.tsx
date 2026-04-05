import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { siGithub } from "simple-icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImageUploader } from "@/components/ImageUploader";
import { CropEditor } from "@/components/CropEditor";
import { EmojiPreview } from "@/components/EmojiPreview";
import { AnimationSection } from "@/components/AnimationSection";
import { CollectorSection } from "@/components/CollectorSection";
import {
  canvasToProcessed,
  processImageWithProjectSettings,
  type ProcessedImage,
} from "@/lib/imageProcessor";
import {
  createProjectFromFile,
  loadProject,
  loadRecentProjectsWithBlob,
  touchProject,
  updateProjectSettings,
} from "@/lib/projectStorage";
import type { ProjectSettings } from "@/lib/projectTypes";

interface RecentProjectCard {
  id: string;
  fileName: string;
  downloadName: string;
  updatedAt: string;
  previewUrl: string;
}

function getDefaultName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "")}-emoji`;
}

function revokeUrl(url: string): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Index() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const [step, setStep] = useState<"upload" | "crop" | "done">("upload");
  const [processing, setProcessing] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectCard[]>([]);
  const [projectSettings, setProjectSettings] =
    useState<ProjectSettings | null>(null);

  const recentPreviewUrlsRef = useRef<string[]>([]);

  const replaceRecentProjects = useCallback((next: RecentProjectCard[]) => {
    for (const url of recentPreviewUrlsRef.current) {
      revokeUrl(url);
    }
    recentPreviewUrlsRef.current = next.map((item) => item.previewUrl);
    setRecentProjects(next);
  }, []);

  const refreshRecentProjects = useCallback(async () => {
    const items = await loadRecentProjectsWithBlob(5);
    const nextProjects = items.map(({ record, blob }) => ({
      id: record.id,
      fileName: record.fileName,
      downloadName: record.settings.downloadName,
      updatedAt: record.updatedAt,
      previewUrl: URL.createObjectURL(blob),
    }));
    replaceRecentProjects(nextProjects);
  }, [replaceRecentProjects]);

  const updateCurrentProjectSettings = useCallback(
    async (partial: Partial<ProjectSettings>) => {
      if (!projectId) return;
      const updated = await updateProjectSettings(projectId, partial);
      if (!updated) return;
      setProjectSettings(updated.settings);
      await refreshRecentProjects();
    },
    [projectId, refreshRecentProjects],
  );

  const loadFromRoute = useCallback(async () => {
    if (!projectId) {
      setFile(null);
      setStep("upload");
      setProjectSettings(null);
      setDownloadName("");
      setProcessing(false);
      setLoadingProject(false);
      setProcessed((prev) => {
        if (prev) revokeUrl(prev.url);
        return null;
      });
      setFileUrl((prev) => {
        revokeUrl(prev);
        return "";
      });
      return;
    }

    setLoadingProject(true);
    setProcessing(true);

    const loaded = await loadProject(projectId);
    if (!loaded) {
      setLoadingProject(false);
      setProcessing(false);
      navigate("/", { replace: true });
      return;
    }

    const { record, file: loadedFile } = loaded;
    const nextFileUrl = URL.createObjectURL(loadedFile);

    setFile(loadedFile);
    setFileUrl((prev) => {
      revokeUrl(prev);
      return nextFileUrl;
    });
    setProjectSettings(record.settings);
    setDownloadName(record.settings.downloadName);
    setStep(record.settings.step);

    const nextProcessed = await processImageWithProjectSettings(
      loadedFile,
      record.settings,
    );

    setProcessed((prev) => {
      if (prev) revokeUrl(prev.url);
      return nextProcessed;
    });
    setProcessing(false);
    setLoadingProject(false);

    await touchProject(projectId);
    await refreshRecentProjects();
  }, [navigate, projectId, refreshRecentProjects]);

  useEffect(() => {
    void refreshRecentProjects();
  }, [refreshRecentProjects]);

  useEffect(() => {
    void loadFromRoute();
  }, [loadFromRoute]);

  useEffect(() => {
    return () => {
      for (const url of recentPreviewUrlsRef.current) {
        revokeUrl(url);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeUrl(fileUrl);
    };
  }, [fileUrl]);

  useEffect(() => {
    return () => {
      if (processed) {
        revokeUrl(processed.url);
      }
    };
  }, [processed]);

  useEffect(() => {
    if (!projectId || !projectSettings) return;
    if (downloadName === projectSettings.downloadName) return;

    const timer = window.setTimeout(() => {
      void updateCurrentProjectSettings({ downloadName });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [downloadName, projectId, projectSettings, updateCurrentProjectSettings]);

  const handleFile = async (selectedFile: File) => {
    setProcessing(true);
    const record = await createProjectFromFile(selectedFile);
    await refreshRecentProjects();
    navigate(`/p/${record.id}`);
  };

  const handleCropComplete = async (
    canvas: HTMLCanvasElement,
    next: Pick<ProjectSettings, "squareMode" | "landscapeAlign" | "crop">,
  ) => {
    const result = await canvasToProcessed(canvas);
    setProcessed((prev) => {
      if (prev) revokeUrl(prev.url);
      return result;
    });
    setStep("done");
    await updateCurrentProjectSettings({
      squareMode: next.squareMode,
      landscapeAlign: next.landscapeAlign,
      crop: next.crop,
      step: "done",
    });
  };

  const handleOpenCrop = async () => {
    setStep("crop");
    await updateCurrentProjectSettings({ step: "crop" });
  };

  const handleBackFromCrop = async () => {
    setStep("done");
    await updateCurrentProjectSettings({ step: "done" });
  };

  const handleReset = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center gap-2 rounded-md transition-opacity hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Go back to home"
        >
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-slack-cyan" />
            <div className="w-3 h-3 rounded-full bg-slack-green" />
            <div className="w-3 h-3 rounded-full bg-slack-yellow" />
            <div className="w-3 h-3 rounded-full bg-slack-pink" />
          </div>
          <span className="font-extrabold text-foreground text-lg">
            AtelierMojis
          </span>
        </button>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/gitnotifier-labs/ateliermojis"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open AtelierMojis on GitHub"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
            >
              <path d={siGithub.path} />
            </svg>
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
            <span className="bg-linear-to-r from-slack-cyan via-slack-green to-slack-yellow bg-clip-text text-transparent">
              Slack emoji
            </span>
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Square output · Under 128KB target · Ready to upload
          </p>
        </motion.div>

        {step === "upload" && !loadingProject && (
          <>
            <ImageUploader onFileSelected={handleFile} />

            {recentProjects.length > 0 && (
              <section className="mt-8 w-full">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
                  Recent projects
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recentProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => navigate(`/p/${project.id}`)}
                      className="group rounded-xl border bg-card/40 hover:bg-card/70 transition-colors p-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-lg overflow-hidden border bg-muted/30 shrink-0">
                          <img
                            src={project.previewUrl}
                            alt={project.fileName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {project.downloadName ||
                              getDefaultName(project.fileName)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.fileName}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {formatUpdatedAt(project.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {(processing || loadingProject) && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {loadingProject
                ? "Restoring your project..."
                : "Processing your image..."}
            </p>
          </div>
        )}

        {step === "crop" && file && fileUrl && projectSettings && (
          <CropEditor
            imageUrl={fileUrl}
            initialMode={projectSettings.squareMode}
            initialLandscapeAlign={projectSettings.landscapeAlign}
            initialCrop={projectSettings.crop}
            onCropComplete={handleCropComplete}
            onBack={handleBackFromCrop}
          />
        )}

        {step === "done" && processed && file && fileUrl && (
          <>
            <EmojiPreview
              originalFile={file}
              originalUrl={fileUrl}
              processed={processed}
              onReset={handleReset}
              onAdjustCrop={handleOpenCrop}
              onNameChange={setDownloadName}
            />
            <AnimationSection
              processedUrl={processed.url}
              fileName={file.name}
              downloadName={downloadName}
            />
            <CollectorSection
              sourceUrl={fileUrl}
              fileName={file.name}
              downloadName={downloadName}
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
