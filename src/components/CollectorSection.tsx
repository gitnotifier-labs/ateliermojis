import { useEffect, useMemo, useState } from "react";
import { Loader2, Sticker } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/imageProcessor";
import { generateCollectorEmoji } from "@/lib/collectorEncoder";

interface CollectorSectionProps {
  sourceUrl: string;
  fileName: string;
  downloadName: string;
}

const OLD_MAN_TEMPLATE_URL = "/collectors/old_man_yells_at.png";
const COLLECTOR_PREFIX = "old-man-yells-at-";

export function CollectorSection({
  sourceUrl,
  fileName,
  downloadName,
}: CollectorSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [collectorBlob, setCollectorBlob] = useState<Blob | null>(null);
  const [collectorUrl, setCollectorUrl] = useState("");

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

  const outputName = `${COLLECTOR_PREFIX}${collectorSuffix}.png`;

  useEffect(() => {
    setCollectorBlob(null);
    setCollectorUrl("");

    let cancelled = false;

    const generate = async () => {
      setGenerating(true);
      try {
        const blob = await generateCollectorEmoji(
          sourceUrl,
          OLD_MAN_TEMPLATE_URL,
        );
        if (cancelled) return;
        setCollectorBlob(blob);
        setCollectorUrl(URL.createObjectURL(blob));
      } finally {
        if (!cancelled) {
          setGenerating(false);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  useEffect(() => {
    if (!collectorUrl) return;
    return () => {
      URL.revokeObjectURL(collectorUrl);
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

      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={handleDownload}
          disabled={generating || !collectorUrl}
          className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all text-left ${
            collectorUrl
              ? "border-primary bg-primary/10 shadow-xs hover:bg-primary/15"
              : "bg-card/50"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Sticker className="h-4 w-4 text-slack-yellow" />
            )}
            <span className="text-sm font-semibold text-foreground">
              Old man yells
            </span>
          </span>

          <div className="w-full rounded-xl border overflow-hidden flex items-center justify-center bg-muted/30 aspect-[286/241]">
            {collectorUrl ? (
              <img
                src={collectorUrl}
                alt="Generated old man yells collector emoji"
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={OLD_MAN_TEMPLATE_URL}
                alt="Old man yells template"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <p className="text-[11px] text-muted-foreground break-all">
            {outputName}
          </p>

          {collectorBlob ? (
            <Badge variant="outline" className="text-xs">
              {formatBytes(collectorBlob.size)}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/80 uppercase tracking-wider">
              {generating ? "Preparing" : "Loading"}
            </span>
          )}

          <span className="text-[11px] text-muted-foreground/80 uppercase tracking-wider">
            Collector PNG
          </span>
        </button>
      </div>
      <p className="mx-auto max-w-2xl mt-8 text-xs text-muted-foreground text-center">
        One animation is missing? Wanna add this cool new gif? <br />
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
