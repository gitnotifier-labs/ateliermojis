import { useCallback, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
}

export function ImageUploader({ onFileSelected }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <motion.label
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slack-cyan via-slack-green to-slack-yellow">
        {dragging ? (
          <Upload className="h-8 w-8 text-white" />
        ) : (
          <ImageIcon className="h-8 w-8 text-white" />
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">
          Drop your image here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse · PNG, JPG, WEBP
        </p>
      </div>
    </motion.label>
  );
}
