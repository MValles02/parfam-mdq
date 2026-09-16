"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ExternalLink, Loader2, Save, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Concentration,
  Gender,
  Occasion,
  ProductStatus,
  Season,
} from "@/generated/prisma/enums";
import { CONCENTRACION, ESTACION, GENERO, OCASION } from "@/lib/catalogo";
import type { ProductoEditable } from "@/lib/admin/productos";
import type { ReferenciaAdoptable } from "@/lib/admin/referencias";
import {
  productoSchema,
  type ProductoFormInput,
  type ProductoFormValues,
} from "@/lib/validations/producto";
import { cn } from "@/lib/utils";
import {
  buscarMarcasAction,
  buscarPerfumistasAction,
  crearPerfumistaAction,
  guardarProducto,
} from "../actions";
import { BarraCaracter } from "./barra-caracter";
import { Campo, Paso } from "./campo";
import { ComboboxRemoto } from "./combobox-remoto";
import { EditorPiramide, type NotaElegida } from "./editor-piramide";
import { EditorVariantes } from "./editor-variantes";
import { PanelImagenes, type ImagenPanel } from "./panel-imagenes";
import { PasoReferencia } from "./paso-referencia";
import { SelectorAcordes, type Acorde } from "./selector-acordes";

/** Los nombres de notas y perfumistas son sólo para mostrar: el formulario
 *  guarda ids. Se acumulan en una tabla aparte en vez de duplicarlos dentro
 *  del estado del form, que es lo que se manda al servidor. */
type Nombres = Record<string, string>;

function valoresIniciales(p: ProductoEditable | null): ProductoFormInput {
  if (!p) {
    return {
      name: "",
      brandId: null,
      brandName: "",
      fragranceRefId: null,
      sourceUrl: null,
      description: null,
      gender: null,
      concentration: null,
      year: null,
      seasons: [],
      occasions: [],
      longevity: null,
      sillage: null,
      intensity: null,
      status: ProductStatus.DRAFT,
      isFeatured: false,
      slug: null,
      seoTitle: null,
      seoDescription: null,
      notes: [],
      accordIds: [],
      perfumerIds: [],
      variants: [],
      images: [],
    };
  }
  return {
    name: p.name,
    brandId: p.brandId,
    brandName: p.brand.name,
    fragranceRefId: p.fragranceRefId,
    sourceUrl: p.sourceUrl,
    description: p.description,
    gender: p.gender,
    concentration: p.concentration,
    year: p.year,
    seasons: p.seasons,
    occasions: p.occasions,
    longevity: p.longevity,
    sillage: p.sillage,
    intensity: p.intensity,
    status: p.status,
    isFeatured: p.isFeatured,
    slug: p.slug,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    notes: p.notes.map((n) => ({ noteId: n.note.id, position: n.position })),
    accordIds: p.accords.map((a) => a.accord.id),
    perfumerIds: p.perfumers.map((x) => x.perfumer.id),
    variants: p.variants.map((v) => ({
      id: v.id,
      kind: v.kind,
      sizeMl: v.sizeMl,
      priceArs: v.priceArs,
      isActive: v.isActive,
      sku: v.sku,
    })),
    images: p.images.map((i) => ({
      id: i.id,
      storageKey: i.storageKey,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })),
  };
}

function nombresIniciales(p: ProductoEditable | null): Nombres {
  if (!p) return {};
  const salida: Nombres = {};
  for (const n of p.notes) salida[n.note.id] = n.note.nameEs ?? n.note.nameEn;
  for (const x of p.perfumers) salida[x.perfumer.id] = x.perfumer.name;
  return salida;
}

export function ProductoForm({
  producto,
  acordes,
  r2Listo,
  basePublica,
}: {
  producto: ProductoEditable | null;
  acordes: Acorde[];
  r2Listo: boolean;
  /** Host publico de R2, solo para las vistas previas del panel de fotos. */
  basePublica: string | null;
}) {
  const router = useRouter();
  const [guardando, guardar] = useTransition();
  const [nombres, setNombres] = useState<Nombres>(() =>
    nombresIniciales(producto),
  );
  const [manual, setManual] = useState(producto !== null);
  const [refAdoptada, setRefAdoptada] = useState<{
    id: string;
    nombre: string;
    url: string | null;
  } | null>(
    producto?.fragranceRefId && producto.fragranceRef
      ? {
          id: producto.fragranceRefId,
          nombre: producto.fragranceRef.name,
          url: producto.fragranceRef.url,
        }
      : null,
  );
  /** Texto en inglés de la referencia: ayuda a redactar, nunca se publica. */
  const [textoReferencia, setTextoReferencia] = useState<string | null>(null);

  const form = useForm<ProductoFormInput, unknown, ProductoFormValues>({
    resolver: standardSchemaResolver(productoSchema),
    defaultValues: valoresIniciales(producto),
    mode: "onSubmit",
  });
  const { control, formState, handleSubmit, setValue, setError } = form;

  // `useWatch` en vez de `form.watch`: el compilador de React no puede
  // memoizar la funcion que devuelve `watch` y termina salteando el
  // componente entero (regla react-hooks/incompatible-library).
  const brandName = useWatch({ control, name: "brandName" });
  const brandId = useWatch({ control, name: "brandId" });
  const variantes = useWatch({ control, name: "variants" }) ?? [];
  const activas = variantes.filter((v) => v.isActive).length;

  function adoptar(ref: ReferenciaAdoptable) {
    // Se precarga todo lo que el dataset sabe, pero queda editable: a partir
    // de acá el producto es una copia propia y una reimportación no lo pisa.
    setRefAdoptada({ id: ref.id, nombre: ref.name, url: ref.url });
    setTextoReferencia(ref.descriptionEn);
    setManual(true);
    setValue("fragranceRefId", ref.id);
    setValue("sourceUrl", ref.url);
    setValue("name", ref.name, { shouldValidate: true });
    setValue("brandId", ref.brand.id);
    setValue("brandName", ref.brand.name, { shouldValidate: true });
    setValue("year", ref.year);
    setValue("gender", ref.gender);
    setValue(
      "notes",
      ref.notes.map((n) => ({ noteId: n.noteId, position: n.position })),
    );
    setValue(
      "accordIds",
      ref.accords.map((a) => a.accordId),
    );
    setValue(
      "perfumerIds",
      ref.perfumers.map((p) => p.perfumerId),
    );
    setNombres((previos) => {
      const siguiente = { ...previos };
      for (const n of ref.notes) siguiente[n.noteId] = n.nombre;
      for (const p of ref.perfumers) siguiente[p.perfumerId] = p.nombre;
      return siguiente;
    });
  }

  function desvincular() {
    setRefAdoptada(null);
    setTextoReferencia(null);
    setValue("fragranceRefId", null);
  }

  function enviar(status: ProductStatus) {
    setValue("status", status);
    void handleSubmit(async (valores) => {
      const r = await new Promise<Awaited<ReturnType<typeof guardarProducto>>>(
        (resolver) => {
          guardar(async () =>
            resolver(await guardarProducto(producto?.id ?? null, valores)),
          );
        },
      );

      if (!r.ok) {
        // Los errores del servidor vuelven por campo para que caigan al lado
        // del control que los causó, no en un cartel genérico arriba.
        for (const [campo, mensajes] of Object.entries(r.errores ?? {})) {
          setError(campo as keyof ProductoFormInput, {
            message: mensajes[0],
          });
        }
        toast.error(r.mensaje);
        return;
      }

      toast.success(
        status === ProductStatus.PUBLISHED
          ? "Producto publicado."
          : "Borrador guardado.",
      );
      // Navegar (o refrescar) remonta el formulario con los datos de la base,
      // y eso importa: las variantes e imágenes recién creadas ahora tienen id,
      // y sin eso el siguiente guardado las duplicaría.
      if (producto) router.refresh();
      else router.replace(`/admin/productos/${r.datos.id}`);
    })();
  }

  const errores = formState.errors;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-5 px-8 pt-6 pb-32"
    >
      <PasoReferencia
        adoptada={refAdoptada}
        onAdoptar={adoptar}
        onQuitar={desvincular}
        onCargaManual={() => setManual(true)}
        manual={manual}
      />

      {manual ? (
        <>
          <Paso
            numero={2}
            titulo="Ficha de la fragancia"
            descripcion={
              refAdoptada
                ? `Precargada desde «${refAdoptada.nombre}». Revisá y corregí lo que haga falta.`
                : "Cargala a mano: ningún campo viene precargado."
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Campo
                label="Nombre"
                htmlFor="name"
                auto={Boolean(refAdoptada)}
                error={errores.name?.message}
              >
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name"
                      value={field.value ?? ""}
                      className="bg-background"
                      placeholder="Sauvage Elixir"
                    />
                  )}
                />
              </Campo>

              <Campo
                label="Marca"
                auto={Boolean(refAdoptada)}
                error={errores.brandName?.message}
                hint={
                  brandName && !brandId
                    ? `Se va a crear la marca «${brandName}».`
                    : undefined
                }
              >
                <ComboboxRemoto
                  valor={
                    brandName ? { id: brandId ?? "", nombre: brandName } : null
                  }
                  placeholder="Buscar o escribir la marca"
                  textoVacio="Ninguna marca con ese nombre. Escribila entera para crearla."
                  buscar={async (q) => {
                    const r = await buscarMarcasAction(q);
                    return r.ok ? r.datos : [];
                  }}
                  // Crear no va al servidor: la Server Action de guardado hace
                  // el find-or-create por slug cuando llega sin brandId.
                  onCrear={async (nombre) => ({ id: "", nombre })}
                  onElegir={(o) => {
                    setValue("brandId", o.id === "" ? null : o.id);
                    setValue("brandName", o.nombre, { shouldValidate: true });
                  }}
                />
              </Campo>

              <Campo
                label="Año"
                htmlFor="year"
                auto={Boolean(refAdoptada)}
                error={errores.year?.message}
              >
                <Controller
                  control={control}
                  name="year"
                  render={({ field }) => (
                    <Input
                      id="year"
                      inputMode="numeric"
                      placeholder="2021"
                      className="bg-background"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        field.onChange(v === "" ? null : Number(v));
                      }}
                    />
                  )}
                />
              </Campo>

              <Campo
                label="Concentración"
                error={errores.concentration?.message}
                hint="El dataset no la trae: va a mano."
              >
                <Controller
                  control={control}
                  name="concentration"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "__ninguna"}
                      onValueChange={(v) =>
                        field.onChange(v === "__ninguna" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ninguna">
                          Sin especificar
                        </SelectItem>
                        {Object.values(Concentration).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CONCENTRACION[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Campo>

              <Campo
                label="Género"
                auto={Boolean(refAdoptada)}
                error={errores.gender?.message}
              >
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "__ninguno"}
                      onValueChange={(v) =>
                        field.onChange(v === "__ninguno" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ninguno">
                          Sin especificar
                        </SelectItem>
                        {Object.values(Gender).map((g) => (
                          <SelectItem key={g} value={g}>
                            {GENERO[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Campo>

              <Campo label="Perfumista" auto={Boolean(refAdoptada)}>
                <Controller
                  control={control}
                  name="perfumerIds"
                  render={({ field }) => (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(field.value ?? []).map((id) => (
                        <span
                          key={id}
                          className="flex items-center gap-1.5 rounded-sm border bg-background py-1.5 pr-1.5 pl-2.5 text-xs font-medium"
                        >
                          {nombres[id] ?? "—"}
                          <button
                            type="button"
                            aria-label={`Quitar a ${nombres[id] ?? "este perfumista"}`}
                            onClick={() =>
                              field.onChange(
                                (field.value ?? []).filter((x) => x !== id),
                              )
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      <ComboboxRemoto
                        placeholder="Buscar perfumista…"
                        textoVacio="Ninguno con ese nombre."
                        buscar={async (q) => {
                          const r = await buscarPerfumistasAction(q);
                          return r.ok ? r.datos : [];
                        }}
                        onCrear={async (nombre) => {
                          const r = await crearPerfumistaAction(nombre);
                          if (!r.ok) {
                            toast.error(r.mensaje);
                            return null;
                          }
                          return r.datos;
                        }}
                        onElegir={(o) => {
                          setNombres((p) => ({ ...p, [o.id]: o.nombre }));
                          const actuales = field.value ?? [];
                          if (!actuales.includes(o.id)) {
                            field.onChange([...actuales, o.id]);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="rounded-sm border border-dashed px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-solid hover:text-foreground"
                        >
                          + Agregar
                        </button>
                      </ComboboxRemoto>
                    </div>
                  )}
                />
              </Campo>
            </div>

            <div className="mt-4">
              <Campo
                label="Descripción para el cliente"
                htmlFor="description"
                error={errores.description?.message}
                hint="Escribila vos: el texto del catálogo de referencia está en inglés y no se publica."
              >
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="description"
                      rows={4}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="min-h-24 bg-background text-sm leading-relaxed"
                      placeholder="Cómo huele, cuánto dura, cuándo usarlo…"
                    />
                  )}
                />
              </Campo>
              {textoReferencia ? (
                <details className="mt-2 rounded-md border bg-background px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Ver el texto en inglés de la referencia (interno, no se
                    publica)
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {textoReferencia}
                  </p>
                </details>
              ) : null}
            </div>

            <div className="mt-5">
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <EditorPiramide
                    valor={(field.value ?? []).map((n) => ({
                      noteId: n.noteId,
                      position: n.position,
                      nombre: nombres[n.noteId] ?? "—",
                    }))}
                    onChange={(notas: NotaElegida[]) => {
                      setNombres((p) => {
                        const siguiente = { ...p };
                        for (const n of notas) siguiente[n.noteId] = n.nombre;
                        return siguiente;
                      });
                      field.onChange(
                        notas.map((n) => ({
                          noteId: n.noteId,
                          position: n.position,
                        })),
                      );
                    }}
                  />
                )}
              />
            </div>

            <div className="mt-5">
              <Campo label="Acordes" auto={Boolean(refAdoptada)}>
                <Controller
                  control={control}
                  name="accordIds"
                  render={({ field }) => (
                    <SelectorAcordes
                      todos={acordes}
                      valor={field.value ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Campo>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Campo label="Estaciones">
                <Controller
                  control={control}
                  name="seasons"
                  render={({ field }) => (
                    <ToggleGroup
                      type="multiple"
                      variant="outline"
                      value={field.value ?? []}
                      onValueChange={field.onChange}
                      className="justify-start"
                    >
                      {Object.values(Season).map((s) => (
                        <ToggleGroupItem key={s} value={s} className="px-3">
                          {ESTACION[s]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </Campo>

              <Campo label="Ocasiones">
                <Controller
                  control={control}
                  name="occasions"
                  render={({ field }) => (
                    <ToggleGroup
                      type="multiple"
                      variant="outline"
                      value={field.value ?? []}
                      onValueChange={field.onChange}
                      className="justify-start"
                    >
                      {Object.values(Occasion).map((o) => (
                        <ToggleGroupItem key={o} value={o} className="px-3">
                          {OCASION[o]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </Campo>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(
                [
                  ["longevity", "Duración"],
                  ["sillage", "Estela"],
                  ["intensity", "Intensidad"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <Campo key={campo} label={etiqueta}>
                  <Controller
                    control={control}
                    name={campo}
                    render={({ field }) => (
                      <BarraCaracter
                        etiqueta={etiqueta}
                        valor={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Campo>
              ))}
            </div>
          </Paso>

          <Paso
            numero={3}
            titulo="Presentaciones y precios"
            descripcion="No hay stock: si algo no está disponible, lo desactivás y deja de verse en la tienda."
          >
            <EditorVariantes
              control={control}
              errorGeneral={
                errores.variants?.message ?? errores.variants?.root?.message
              }
            />
          </Paso>

          <Paso
            numero={4}
            titulo="Fotos"
            descripcion="Fotos propias. Las imágenes de Fragrantica son referencia interna y no se publican."
          >
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <PanelImagenes
                  r2Listo={r2Listo}
                  basePublica={basePublica}
                  valor={(field.value ?? []) as ImagenPanel[]}
                  onChange={field.onChange}
                />
              )}
            />
            {(errores.images?.message ?? errores.images?.root?.message) ? (
              <p className="mt-2 text-xs font-medium text-destructive">
                {errores.images?.message ?? errores.images?.root?.message}
              </p>
            ) : null}
          </Paso>

          <Paso
            numero={5}
            titulo="SEO y enlace"
            descripcion="Si los dejás vacíos, la tienda usa el nombre y la descripción del producto."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                label="Dirección del producto"
                htmlFor="slug"
                error={errores.slug?.message}
                hint="Se arma sola con la marca y el nombre si la dejás vacía."
              >
                <Controller
                  control={control}
                  name="slug"
                  render={({ field }) => (
                    <div className="flex items-center rounded-md border bg-background pl-3 text-sm">
                      <span className="shrink-0 text-muted-foreground">
                        /producto/
                      </span>
                      <Input
                        {...field}
                        id="slug"
                        value={field.value ?? ""}
                        placeholder="dior-sauvage-elixir"
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </div>
                  )}
                />
              </Campo>

              <Campo
                label="Link de Fragrantica"
                htmlFor="sourceUrl"
                error={errores.sourceUrl?.message}
                hint="Referencia interna, por si hay que volver a mirar la ficha original."
              >
                <Controller
                  control={control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="sourceUrl"
                      value={field.value ?? ""}
                      placeholder="https://www.fragrantica.com/perfume/…"
                      className="bg-background"
                    />
                  )}
                />
              </Campo>

              <Campo
                label="Título SEO"
                htmlFor="seoTitle"
                error={errores.seoTitle?.message}
              >
                <Controller
                  control={control}
                  name="seoTitle"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="seoTitle"
                      value={field.value ?? ""}
                      className="bg-background"
                    />
                  )}
                />
              </Campo>

              <Campo
                label="Descripción SEO"
                htmlFor="seoDescription"
                error={errores.seoDescription?.message}
              >
                <Controller
                  control={control}
                  name="seoDescription"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="seoDescription"
                      rows={2}
                      value={field.value ?? ""}
                      className="bg-background"
                    />
                  )}
                />
              </Campo>
            </div>
          </Paso>

          {/* Pegada abajo: el formulario mide más de una pantalla y guardar no
              debería obligar a scrollear hasta el final. */}
          <div className="sticky bottom-0 -mx-8 flex items-center justify-between gap-4 border-t bg-card/95 px-8 py-4 backdrop-blur">
            <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
              <span>
                {variantes.length === 0
                  ? "Todavía no cargaste presentaciones."
                  : `${activas} de ${variantes.length} ${variantes.length === 1 ? "presentación se va" : "presentaciones se van"} a ver en la tienda`}
              </span>
              {refAdoptada?.url ? (
                <a
                  href={refAdoptada.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 text-xs hover:text-foreground"
                >
                  Ver la referencia en Fragrantica
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={guardando}
                onClick={() => enviar(ProductStatus.DRAFT)}
              >
                {guardando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar borrador
              </Button>
              <Button
                type="button"
                disabled={guardando}
                onClick={() => enviar(ProductStatus.PUBLISHED)}
              >
                {guardando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {producto?.status === ProductStatus.PUBLISHED
                  ? "Guardar publicado"
                  : "Publicar producto"}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className={cn("text-sm text-muted-foreground")}>
          Buscá la fragancia arriba para arrancar, o cargala a mano.
        </p>
      )}
    </form>
  );
}
