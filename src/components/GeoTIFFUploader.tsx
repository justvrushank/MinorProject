import { useState, useRef, useCallback } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function isGeoTiff(f: File) {
  return /\.(tif|tiff)$/i.test(f.name);
}

export function GeoTIFFUploader({ file, onFileSelect }: Props) {
  const [isDragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0];
      if (!isGeoTiff(f)) {
        setError("Only .tif or .tiff GeoTIFF files are accepted.");
        return;
      }
      setError(null);
      onFileSelect(f);
    },
    [onFileSelect],
  );

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)} · GeoTIFF
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFileSelect(null)}
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface px-6 py-10 text-center transition",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Drop GeoTIFF here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Accepts .tif / .tiff · max 2 GB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".tif,.tiff,image/tiff"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
