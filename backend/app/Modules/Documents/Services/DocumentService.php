<?php

declare(strict_types=1);

namespace App\Modules\Documents\Services;

use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Documents\Models\Document;
use App\Support\Storage\StorageManager;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The ONLY service that writes clinical files to storage.
 *
 * Foundation §7 — all file ingest flows through here; controllers and
 * other modules never call StorageManager directly.
 *
 * Responsibilities:
 *   - Validate (MIME, size, category)
 *   - Stream to the configured logical disk
 *   - Record a Document row + audit log entry
 *   - Issue time-limited signed URLs for read
 */
final class DocumentService
{
    public function __construct(
        private readonly StorageManager $storage,
        private readonly AuditLogService $audit,
    ) {}

    /**
     * Upload a file and attach it to a model.
     *
     * @return Document
     */
    public function upload(
        UploadedFile $file,
        Model $owner,
        string $category = 'general',
        string $logicalDisk = 'clinical',
        /** @var array<string, mixed> */
        array $metadata = [],
    ): Document {
        $disk = $this->storage->disk($logicalDisk);
        $this->validate($file);

        $hash = hash_file('sha256', $file->getRealPath());
        $path = $this->buildPath($owner, $category, $file);

        $disk->put($path, file_get_contents($file->getRealPath()));

        return DB::transaction(function () use ($disk, $file, $hash, $path, $owner, $category, $logicalDisk, $metadata) {
            $doc = Document::create([
                'public_id'          => (string) Str::uuid(),
                'branch_id'          => app('active_branch_id'),
                'uploaded_by'        => auth()->id(),
                'documentable_type'  => $owner::class,
                'documentable_id'    => $owner->getKey(),
                'disk'               => $disk->driver,
                'path'               => $path,
                'mime_type'          => $file->getMimeType(),
                'size_bytes'         => $file->getSize(),
                'original_filename'  => $file->getClientOriginalName(),
                'category'           => $category,
                'metadata'           => $metadata,
                'checksum_sha256'    => $hash,
            ]);

            $this->audit->record('document.uploaded', auth()->user(), null, $doc, [
                'category' => $category,
                'size'     => $file->getSize(),
            ]);

            return $doc;
        });
    }

    public function temporaryUrl(Document $doc): string
    {
        $disk = $this->storage->disk($this->logicalNameFromDriver($doc->disk));
        $url = $disk->temporaryUrl($doc->path);

        $this->audit->record('document.url_issued', auth()->user(), null, $doc);

        return $url;
    }

    public function delete(Document $doc): void
    {
        $disk = $this->storage->disk($this->logicalNameFromDriver($doc->disk));
        $disk->delete($doc->path);
        $doc->delete();

        $this->audit->record('document.deleted', auth()->user(), null, $doc);
    }

    private function validate(UploadedFile $file): void
    {
        $allowed = config('storage.allowed_mime', []);
        $max = (int) config('storage.max_upload_mb', 20) * 1024 * 1024;

        if (! in_array($file->getMimeType(), $allowed, true)) {
            throw new \App\Exceptions\Domain\ValidationFailedException(
                'File type not allowed.',
                ['mime' => $file->getMimeType()],
            );
        }

        if ($file->getSize() > $max) {
            throw new \App\Exceptions\Domain\ValidationFailedException(
                'File too large.',
                ['max_mb' => (int) config('storage.max_upload_mb', 20)],
            );
        }
    }

    private function buildPath(Model $owner, string $category, UploadedFile $file): string
    {
        $ext = $file->getClientOriginalExtension() ?: 'bin';
        $rand = Str::random(8);
        $date = now()->format('Y/m/d');

        return Str::lower(class_basename($owner))."/{$owner->getKey()}/{$category}/{$date}/{$rand}.{$ext}";
    }

    private function logicalNameFromDriver(string $driverName): string
    {
        // Reverse lookup — keep simple: clinical files map to 'clinical' logical disk
        return match ($driverName) {
            's3', 'r2', 'b2', 'local' => 'clinical',
            default => 'clinical',
        };
    }
}