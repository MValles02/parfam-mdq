import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteDefaults } from "@/lib/site";

/**
 * Imagen de vista previa para TODOS los links compartidos de la tienda.
 *
 * Es solo el logotipo a proposito. El canal de venta es WhatsApp, y WhatsApp
 * no muestra la imagen 1200x630 en el chat: incrusta en el mensaje una
 * miniatura de ~200px, recortada al cuadrado central y comprimida. Esa
 * resolucion no se puede subir desde el servidor. Cualquier dato fino --marca,
 * concentracion, precio-- llegaba ilegible, asi que en vez de pelearla se
 * muestra una sola cosa, grande y nitida.
 *
 * Las dos medidas estan atadas a ese recorte:
 *   - El logotipo entra en la banda central de 630px (a cuerpo 112 mide ~590).
 *     Mas grande se le cortan la P y la q.
 *   - Nada baja de 36px, que reducido ~3x queda en ~11px y todavia se lee.
 *
 * El resto de los segmentos la reexportan (`opengraph-image.tsx` de una linea):
 * la convencion de archivo de Next NO se hereda a rutas anidadas, aplica solo
 * al segmento donde vive el archivo.
 */
export const alt = siteDefaults.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// La fuente no depende del request: se lee una sola vez a nivel de modulo.
const outfitExtraBold = readFile(
  join(process.cwd(), "src/assets/fonts/Outfit-ExtraBold.ttf"),
);

export default async function Image() {
  const fontData = await outfitExtraBold;

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
          fontSize: 112,
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
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "0.45em",
          marginTop: 30,
          paddingLeft: "0.45em",
        }}
      >
        PERFUMERIA
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Outfit", data: fontData, weight: 800, style: "normal" }],
    },
  );
}
