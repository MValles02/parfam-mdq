import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CONCENTRACION_CORTA, precioArs } from "@/lib/catalogo";
import { siteDefaults } from "@/lib/site";
import { productoPorSlug } from "@/lib/tienda/consultas";

/**
 * OG de la ficha de producto. No metemos la foto del producto: son URLs
 * remotas de R2 y traerlas adentro de satori agrega una dependencia de red a
 * la generacion de la imagen (ver reporte de la tarea para la mejora futura).
 *
 * Todo va centrado y dentro de una banda central de ~560px a proposito.
 * WhatsApp recorta un cuadrado del centro de la imagen para la vista previa,
 * asi que con el texto alineado a la izquierda se perdia casi todo: de
 * "Sauvage Elixir" solo quedaba "age Elixir", y el precio y la marca se
 * cortaban enteros. Como el checkout de la tienda entra por WhatsApp, esta
 * imagen tiene que leerse recortada, no solo en 1200x630.
 *
 * Los cuerpos son grandes por la misma razon. WhatsApp no muestra la imagen
 * completa en el chat: incrusta una miniatura de ~200px en el mensaje. Esa
 * resolucion no se puede subir desde el servidor, asi que el unico margen es
 * que el texto siga siendo legible reducido ~3x y con compresion encima.
 * Regla practica: nada por debajo de 36px, que a 200px queda en ~11px.
 */
export const alt = "ParfamMdq";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// La fuente no depende del request: se lee una sola vez a nivel de modulo.
const outfitExtraBold = readFile(
  join(process.cwd(), "src/assets/fonts/Outfit-ExtraBold.ttf"),
);

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [producto, fontData] = await Promise.all([
    productoPorSlug(slug),
    outfitExtraBold,
  ]);

  const fonts = [
    {
      name: "Outfit" as const,
      data: fontData,
      weight: 800 as const,
      style: "normal" as const,
    },
  ];

  // Sin producto (borrador o slug inexistente): la OG generica del sitio en
  // vez de romper la generacion.
  if (!producto) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F2EEE9",
          color: "#000000",
          fontFamily: "Outfit",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 100,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            lineHeight: 0.9,
          }}
        >
          {siteDefaults.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "0.62em",
            marginTop: 28,
            paddingLeft: "0.62em",
          }}
        >
          PERFUMERIA
        </div>
      </div>,
      { ...size, fonts },
    );
  }

  const meta = [
    producto.concentracion ? CONCENTRACION_CORTA[producto.concentracion] : null,
    producto.anio ? String(producto.anio) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const precios = producto.variantes.map((v) => Number(v.precio));
  const desde = precios.length > 0 ? precioArs(Math.min(...precios)) : null;

  // El alto es fijo en 630 y tanto la marca como el nombre pueden envolver.
  // "Jean Paul Gaultier" + "Le Male Elixir" ya ocupa dos lineas cada uno y
  // llega justo; un nombre mas largo desbordaria. Bajar el cuerpo en ese caso
  // mantiene la composicion adentro y sigue siendo legible en la miniatura
  // (84px reducido ~3x quedan en ~27px).
  const cuerpoNombre = producto.nombre.length > 20 ? 84 : 104;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#F2EEE9",
        color: "#000000",
        fontFamily: "Outfit",
        padding: "56px 88px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {siteDefaults.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.42em",
              color: "#6B655C",
              marginTop: 2,
            }}
          >
            PERFUMERIA
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "0.22em",
            color: "#6B655C",
            textTransform: "uppercase",
            // Misma banda segura que el nombre: una marca larga envuelve en
            // vez de desbordar el recorte.
            maxWidth: 560,
          }}
        >
          {producto.marca}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: cuerpoNombre,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            maxWidth: 560,
          }}
        >
          {producto.nombre}
        </div>
        {meta ? (
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 400,
              color: "#3A342C",
            }}
          >
            {meta}
          </div>
        ) : null}
        {desde ? (
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 800,
              marginTop: 8,
            }}
          >
            Desde {desde}
          </div>
        ) : null}
      </div>
    </div>,
    { ...size, fonts },
  );
}
