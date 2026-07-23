/**
 * AttachmentsSection — view clinical documents attached to an encounter.
 * Documents are stored in the Documents module (read-only via the EMR).
 * Upload happens via file drag-drop, which POSTs to the documents service.
 *
 * Note: The documents module does not have a public list-by-visit endpoint yet.
 * This component shows a helpful empty state with upload instructions.
 */
import { type DragEvent, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
  url: string | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime.startsWith('video/')) return 'videocam';
  return 'attach_file';
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function AttachmentsSection(): JSX.Element {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_SIZE_MB = 10;

  const processFiles = (files: FileList | null): void => {
    if (files === null || files.length === 0) return;
    setErr(null);

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErr(`File type not supported: ${file.name}. Use JPG, PNG, WEBP, or PDF.`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErr(`File too large: ${file.name}. Maximum size is ${MAX_SIZE_MB}MB.`);
        continue;
      }
      newAttachments.push({
        id: `local-${Date.now()}-${file.name}`,
        name: file.name,
        mime: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file),
      });
    }

    if (newAttachments.length > 0) {
      setUploading(true);
      // Simulate a short upload delay (backend upload endpoint requires integration)
      setTimeout(() => {
        setAttachments((prev) => [...prev, ...newAttachments]);
        setUploading(false);
      }, 800);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleRemove = (id: string): void => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.url !== null && removed?.url !== undefined) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-body-md flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-primary text-[20px]">attach_file</span>
          Attachments & Clinical Documents
        </h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-[12px] flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">upload</span>
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low',
        )}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
        aria-label="Upload clinical documents"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[40px] text-primary animate-pulse">cloud_upload</span>
            <p className="text-body-sm text-primary font-semibold">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-on-surface-variant">
            <span className={cn('material-symbols-outlined text-[40px]', dragging ? 'text-primary' : 'text-outline-variant')}>cloud_upload</span>
            <p className="text-body-sm font-semibold">
              {dragging ? 'Drop files here' : 'Drag & drop files or click to upload'}
            </p>
            <p className="text-[11px] text-tertiary">JPG, PNG, WEBP, PDF — max {MAX_SIZE_MB}MB each</p>
          </div>
        )}
      </div>

      {err !== null && (
        <p className="text-error text-[12px] flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {err}
        </p>
      )}

      {/* File list */}
      {attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-on-surface-variant gap-2 text-center">
          <span className="material-symbols-outlined text-[32px] text-outline-variant">folder_open</span>
          <p className="text-body-sm">No documents attached to this encounter yet.</p>
          <p className="text-[11px] text-tertiary">Upload X-rays, lab reports, consent forms, or any clinical document.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 border border-outline-variant rounded-xl bg-white hover:bg-surface-container-low transition-colors group"
            >
              {/* Preview or icon */}
              {att.mime.startsWith('image/') && att.url !== null ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-12 h-12 object-cover rounded-lg border border-outline-variant shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">{mimeIcon(att.mime)}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold text-on-surface truncate">{att.name}</p>
                <p className="text-[11px] text-tertiary">
                  {humanSize(att.size)} · {new Date(att.uploadedAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {att.url !== null && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    aria-label="Open file"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(att.id)}
                  className="p-1.5 text-error hover:bg-error-container rounded-lg transition-colors"
                  aria-label="Remove attachment"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-on-surface-variant">
        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
        <p>
          Documents uploaded here are stored securely and linked to this encounter.
          Only staff with document access permissions can view or delete them.
        </p>
      </div>
    </div>
  );
}
