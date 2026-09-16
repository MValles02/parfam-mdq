"use client";

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
import { borrarImagenSubida, pedirUrlDeSubida } from "../imagenes-actions";

export type ImagenPanel = {
  id: string | null; // null = todavia no guardada en la base
  url: string;
  alt: string | null;
  isPrimary: boolean;
};

/** Misma lista blanca que `imagenes-actions.ts`: si se desalinean, el server
 * action las va a rechazar igual, pero repetirla acá evita subidas que el
 * usuario ve "progresar" y terminan fallando en el último paso. */
const ACCEPT: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
};

const OCHO_MB = 8 * 1024 * 1024;

type SubidaEnCurso = {
  id: string;
  nombre: string;
  progreso: number;
};

/**
 * PUT directo a la URL firmada, con progreso. `fetch` no expone progreso de
 * subida, así que para la barra por archivo hace falta XMLHttpRequest.
 */
function subirConProgreso(
  url: string,
  archivo: File,
  onProgreso: (porcentaje: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", archivo.type);
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        onProgreso(Math.round((evento.loaded / evento.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`La subida falló (código ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Error de red al subir la imagen."));
    xhr.send(archivo);
  });
}

export function PanelImagenes(props: {
  valor: ImagenPanel[];
  onChange: (imagenes: ImagenPanel[]) => void;
  disabled?: boolean;
  /** Si es false, la zona de subida se muestra deshabilitada con un aviso. */
  r2Listo?: boolean;
}) {
  const { valor, onChange, disabled = false, r2Listo } = props;

  const [subidas, setSubidas] = useState<SubidaEnCurso[]>([]);
  const [eliminando, setEliminando] = useState<Set<string>>(new Set());

  // Espejo sincrónico de `valor`: cuando se largan varias subidas juntas, cada
  // una termina en un momento distinto y necesita ver la lista más reciente
  // (incluidas las que ya terminaron) para decidir si es la primera imagen
  // del producto. Un ref evita la condición de carrera que tendría leer la
  // prop `valor` directamente en cada callback asincrónico.
  const valorRef = useRef(valor);
  useEffect(() => {
    valorRef.current = valor;
  }, [valor]);

  const subirArchivo = useCallback(
    async (archivo: File) => {
      const idLocal = crypto.randomUUID();
      setSubidas((prev) => [
        ...prev,
        { id: idLocal, nombre: archivo.name, progreso: 0 },
      ]);

      try {
        const pedido = await pedirUrlDeSubida({
          nombre: archivo.name,
          contentType: archivo.type,
          tamanioBytes: archivo.size,
        });
        if (!pedido.ok) {
          toast.error(pedido.mensaje);
          return;
        }

        await subirConProgreso(
          pedido.datos.urlDeSubida,
          archivo,
          (porcentaje) => {
            setSubidas((prev) =>
              prev.map((s) =>
                s.id === idLocal ? { ...s, progreso: porcentaje } : s,
              ),
            );
          },
        );

        const listaActual = valorRef.current;
        const nuevaImagen: ImagenPanel = {
          id: null,
          url: pedido.datos.urlPublica,
          alt: null,
          isPrimary: listaActual.length === 0,
        };
        const nuevaLista = [...listaActual, nuevaImagen];
        valorRef.current = nuevaLista;
        onChange(nuevaLista);
      } catch {
        toast.error(`No pudimos subir "${archivo.name}". Probá de nuevo.`);
      } finally {
        setSubidas((prev) => prev.filter((s) => s.id !== idLocal));
      }
    },
    [onChange],
  );

  const onDrop = useCallback(
    (archivosAceptados: File[], rechazados: FileRejection[]) => {
      for (const rechazo of rechazados) {
        const motivo = rechazo.errors[0]?.message ?? "archivo inválido";
        toast.error(`"${rechazo.file.name}" no se pudo agregar: ${motivo}`);
      }
      for (const archivo of archivosAceptados) {
        void subirArchivo(archivo);
      }
    },
    [subirArchivo],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: OCHO_MB,
    multiple: true,
    disabled: disabled || r2Listo === false,
  });

  function moverImagen(indice: number, delta: number) {
    const destino = indice + delta;
    if (destino < 0 || destino >= valor.length) return;
    const copia = [...valor];
    const [item] = copia.splice(indice, 1);
    copia.splice(destino, 0, item!);
    onChange(copia);
  }

  function marcarPrincipal(indice: number) {
    onChange(
      valor.map((imagen, i) => ({ ...imagen, isPrimary: i === indice })),
    );
  }

  async function eliminarImagen(indice: number) {
    const imagen = valor[indice]!;
    setEliminando((prev) => new Set(prev).add(imagen.url));

    // Sólo hay que limpiar el objeto de R2 si nunca se guardó en la base: si
    // ya tiene `id`, borrarlo del bucket es responsabilidad del guardado del
    // producto (que compara contra lo que había antes).
    if (imagen.id === null) {
      const resultado = await borrarImagenSubida(imagen.url);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
      }
    }

    setEliminando((prev) => {
      const copia = new Set(prev);
      copia.delete(imagen.url);
      return copia;
    });

    const restantes = valor.filter((_, i) => i !== indice);
    if (imagen.isPrimary && restantes.length > 0) {
      restantes[0] = { ...restantes[0]!, isPrimary: true };
    }
    onChange(restantes);
  }

  return (
    <div className="flex flex-col gap-4">
      {r2Listo === false ? (
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
            (disabled || eliminando.size > 0) &&
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

      {subidas.length > 0 && (
        <div className="flex flex-col gap-2">
          {subidas.map((subida) => (
            <div
              key={subida.id}
              className="flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-xs"
            >
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              <span className="flex-1 truncate">{subida.nombre}</span>
              <span className="text-muted-foreground">{subida.progreso}%</span>
            </div>
          ))}
        </div>
      )}

      {valor.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {valor.map((imagen, indice) => {
            const seEstaBorrando = eliminando.has(imagen.url);
            return (
              <div
                key={imagen.id ?? imagen.url}
                className="group relative aspect-square overflow-hidden rounded border border-border bg-card"
              >
                {/* TODO(Fase 7): pasar a next/image cuando next.config tenga los remotePatterns de R2 */}
                <img
                  src={imagen.url}
                  alt={imagen.alt ?? ""}
                  className="h-full w-full object-cover"
                />

                {imagen.isPrimary && (
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
                    disabled={disabled || indice === 0}
                    onClick={() => moverImagen(indice, -1)}
                    aria-label="Mover a la izquierda"
                  >
                    <ArrowLeft />
                  </Button>

                  {!imagen.isPrimary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled}
                      onClick={() => marcarPrincipal(indice)}
                      aria-label="Marcar como principal"
                    >
                      <Star />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled || seEstaBorrando}
                    onClick={() => void eliminarImagen(indice)}
                    aria-label="Eliminar imagen"
                  >
                    {seEstaBorrando ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled || indice === valor.length - 1}
                    onClick={() => moverImagen(indice, 1)}
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
