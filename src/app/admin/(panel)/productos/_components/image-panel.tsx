"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import {
  ArrowLeft,
  ArrowRight,
  ImageOff,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteUploadedImage, requestUploadUrl } from "../image-actions";

export type ProductImageItem = {
  id: string | null; // null means it is not yet persisted.
  /** R2 object key. This is the only image value stored in the database. */
  storageKey: string;
  alt: string | null;
  isPrimary: boolean;
};

/** Mirrors `image-actions.ts` so rejected MIME types do not appear to upload
 * successfully before the server rejects them. */
const ACCEPT: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
};

const EIGHT_MB = 8 * 1024 * 1024;

type UploadInProgress = {
  id: string;
  name: string;
  progress: number;
};

/** Uploads directly to a signed URL. XMLHttpRequest exposes per-file progress,
 * whereas `fetch` does not. */
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percentage: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (status ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Image upload network error."));
    xhr.send(file);
  });
}

/**
 * `next/image` accepts only hosts declared in next.config.ts remotePatterns,
 * derived from R2_PUBLIC_URL. A missing R2 configuration renders an empty box.
 */
function ImagePreview({ url, alt }: { url: string | undefined; alt: string }) {
  if (!url) return <div className="h-full w-full bg-muted" />;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="(min-width: 768px) 12rem, 45vw"
      className="object-cover"
    />
  );
}

export function ImagePanel(props: {
  value: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
  disabled?: boolean;
  /**
   * Public bucket host used for previews. It comes from the server because the
   * database stores keys, so a host migration does not touch image rows.
   */
  publicBaseUrl: string | null;
  /** When false, the upload area is disabled with a message. */
  isR2Configured?: boolean;
}) {
  const {
    value,
    onChange,
    disabled = false,
    publicBaseUrl,
    isR2Configured,
  } = props;

  const getPreviewUrl = (storageKey: string) =>
    publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${storageKey}`
      : undefined;

  const [uploads, setUploads] = useState<UploadInProgress[]>([]);
  const [deletingStorageKeys, setDeletingStorageKeys] = useState<Set<string>>(
    new Set(),
  );

  // This synchronous mirror lets concurrent uploads see the latest completed
  // images when assigning the first primary image, avoiding stale prop races.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const uploadFile = useCallback(
    async (file: File) => {
      const localId = crypto.randomUUID();
      setUploads((previousUploads) => [
        ...previousUploads,
        { id: localId, name: file.name, progress: 0 },
      ]);

      try {
        const request = await requestUploadUrl({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        });
        if (!request.ok) {
          toast.error(request.message);
          return;
        }

        await uploadWithProgress(request.data.uploadUrl, file, (progress) => {
          setUploads((previousUploads) =>
            previousUploads.map((upload) =>
              upload.id === localId ? { ...upload, progress } : upload,
            ),
          );
        });

        const currentImages = valueRef.current;
        const newImage: ProductImageItem = {
          id: null,
          storageKey: request.data.storageKey,
          alt: null,
          isPrimary: currentImages.length === 0,
        };
        const nextImages = [...currentImages, newImage];
        valueRef.current = nextImages;
        onChange(nextImages);
      } catch {
        toast.error(`No pudimos subir "${file.name}". Probá de nuevo.`);
      } finally {
        setUploads((previousUploads) =>
          previousUploads.filter((upload) => upload.id !== localId),
        );
      }
    },
    [onChange],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      for (const rejection of rejectedFiles) {
        const reason = rejection.errors[0]?.message ?? "archivo inválido";
        toast.error(`"${rejection.file.name}" no se pudo agregar: ${reason}`);
      }
      for (const file of acceptedFiles) {
        void uploadFile(file);
      }
    },
    [uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: EIGHT_MB,
    multiple: true,
    disabled: disabled || isR2Configured === false,
  });

  function moveImage(index: number, delta: number) {
    const destination = index + delta;
    if (destination < 0 || destination >= value.length) return;
    const nextImages = [...value];
    const [item] = nextImages.splice(index, 1);
    nextImages.splice(destination, 0, item!);
    onChange(nextImages);
  }

  function setPrimaryImage(index: number) {
    onChange(
      value.map((image, imageIndex) => ({
        ...image,
        isPrimary: imageIndex === index,
      })),
    );
  }

  async function removeImage(index: number) {
    const image = value[index]!;
    setDeletingStorageKeys((previousKeys) =>
      new Set(previousKeys).add(image.storageKey),
    );

    // The product save flow removes persisted bucket objects. This only cleans
    // uploads that have not reached the database yet.
    if (image.id === null) {
      const result = await deleteUploadedImage(image.storageKey);
      if (!result.ok) {
        toast.error(result.message);
      }
    }

    setDeletingStorageKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      nextKeys.delete(image.storageKey);
      return nextKeys;
    });

    const remainingImages = value.filter(
      (_, imageIndex) => imageIndex !== index,
    );
    if (image.isPrimary && remainingImages.length > 0) {
      remainingImages[0] = { ...remainingImages[0]!, isPrimary: true };
    }
    onChange(remainingImages);
  }

  return (
    <div className="flex flex-col gap-4">
      {isR2Configured === false ? (
        <div className="flex items-center gap-3 rounded border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
          <ImageOff className="size-5 shrink-0" />
          <span>
            La subida de fotos se habilita cuando estén las credenciales de
            Cloudflare R2.
          </span>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-border bg-card px-4 py-8 text-center transition-colors",
            isDragActive && "border-foreground bg-muted",
            (disabled || deletingStorageKeys.size > 0) &&
              "pointer-events-none opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            Arrastrá las fotos acá o hacé click para elegirlas
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP o AVIF · hasta 8 MB por foto
          </p>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-xs"
            >
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              <span className="flex-1 truncate">{upload.name}</span>
              <span className="text-muted-foreground">{upload.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((image, index) => {
            const isDeleting = deletingStorageKeys.has(image.storageKey);
            return (
              <div
                key={image.id ?? image.storageKey}
                className="group relative aspect-square overflow-hidden rounded border border-border bg-card"
              >
                <ImagePreview
                  url={getPreviewUrl(image.storageKey)}
                  alt={image.alt ?? ""}
                />

                {image.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Star className="size-3 fill-current" />
                    Principal
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 p-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled || index === 0}
                    onClick={() => moveImage(index, -1)}
                    aria-label="Mover a la izquierda"
                  >
                    <ArrowLeft />
                  </Button>

                  {!image.isPrimary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled}
                      onClick={() => setPrimaryImage(index)}
                      aria-label="Marcar como principal"
                    >
                      <Star />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled || isDeleting}
                    onClick={() => void removeImage(index)}
                    aria-label="Eliminar imagen"
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled || index === value.length - 1}
                    onClick={() => moveImage(index, 1)}
                    aria-label="Mover a la derecha"
                  >
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
