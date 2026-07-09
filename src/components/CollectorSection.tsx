import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sticker } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/imageProcessor";
import { generateCollectorEmoji } from "@/lib/collectorEncoder";
import {
  COLLECTOR_TEMPLATES,
  type CollectorTemplate,
} from "@/lib/collectorTemplates";

interface CollectorSectionProps {
  sourceUrl: string;
  fileName: string;
  downloadName: string;
}

interface TemplateCardProps {
  template: CollectorTemplate;
  sourceUrl: string;
  outputName: string;
}

function TemplateCard({ template, sourceUrl, outputName }: TemplateCardProps) {
  const [generating, setGenerating] = useState(false);
  const [collectorBlob, setCollectorBlob] = useState<Blob | null>(null);
  const [collectorUrl, setCollectorUrl] = useState("");
  const prevUrlRef = useRef("");

  useEffect(() => {
    setCollectorBlob(null);
    setCollectorUrl("");

    let cancelled = false;

    const generate = async () => {
      setGenerating(true);
      try {
        const blob = await generateCollectorEmoji(sourceUrl, template);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setCollectorBlob(blob);
        setCollectorUrl(url);
        prevUrlRef.current = url;
      } finally {
        if (!cancelled) {
          setGenerating(false);
        }
      }
    };

    void generate();

    return () => {
      cancelled = true;
    };
  }, [sourceUrl, template]);

  useEffect(() => {
    const url = prevUrlRef.current;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [collectorUrl]);

  const handleDownload = () => {
    if (!collectorUrl || generating) return;
    const a = document.createElement("a");
    a.href = collectorUrl;
    a.download = outputName;
    a.click();
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating || !collectorUrl}
      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
        collectorUrl
          ? "border-primary bg-primary/10 shadow-xs hover:bg-primary/15 cursor-pointer"
          : "bg-card/50 cursor-not-allowed"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Sticker className="h-4 w-4 text-slack-yellow" />
        )}
        <span className="text-sm font-semibold text-foreground">
          {template.label}
        </span>
      </span>

      <div className="w-full rounded-xl border overflow-hidden flex items-center justify-center bg-muted/30 aspect-square">
        {collectorUrl ? (
          <img
            src={collectorUrl}
            alt={`${template.label} collector emoji`}
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={template.url}
            alt={`${template.label} template`}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground break-all text-center">
        {outputName}
      </p>

      {collectorBlob ? (
        <Badge variant="outline" className="text-xs">
          {formatBytes(collectorBlob.size)}
        </Badge>
      ) : (
        <span className="text-[11px] text-muted-foreground/80 uppercase tracking-wider">
          {generating ? "Preparing…" : "Loading…"}
        </span>
      )}

      <span className="text-[11px] text-muted-foreground/80 uppercase tracking-wider">
        Collector PNG
      </span>
    </button>
  );
}

export function CollectorSection({
  sourceUrl,
  fileName,
  downloadName,
}: CollectorSectionProps) {
  const collectorSuffix = useMemo(() => {
    const fallbackBaseName = fileName.replace(/\.[^.]+$/, "");
    const source = downloadName.trim() || fallbackBaseName;
    const cleaned = source
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    const bounded = cleaned.slice(0, 20).replace(/-+$/g, "");
    return bounded || "emoji";
  }, [downloadName, fileName]);

  const gridCols =
    COLLECTOR_TEMPLATES.length === 1
      ? "grid-cols-1 max-w-sm"
      : COLLECTOR_TEMPLATES.length === 2
        ? "grid-cols-2 max-w-md"
        : "grid-cols-2 sm:grid-cols-3 max-w-2xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 text-center w-full"
    >
      <h2 className="text-xl font-bold text-foreground mb-1">
        Generate collector emojis
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Add your emoji to iconic collector templates.
      </p>

      <div className={`mx-auto grid gap-3 w-full ${gridCols}`}>
        {COLLECTOR_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            sourceUrl={sourceUrl}
            outputName={`${template.outputPrefix}${collectorSuffix}.png`}
          />
        ))}
      </div>

      <p className="mx-auto max-w-2xl mt-8 text-xs text-muted-foreground text-center">
        One template is missing?{" "}
        <a
          href="https://github.com/gitnotifier-labs/ateliermojis"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          This is open-source, feel free to open a pull request on GitHub
        </a>
        .
      </p>
    </motion.div>
  );
}
