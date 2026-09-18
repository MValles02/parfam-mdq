// La convencion `opengraph-image` de Next no se hereda a segmentos anidados:
// aplica solo al segmento donde vive el archivo. Esta reexportacion hace que
// esta ruta use la imagen del sitio, para que cualquier link compartido
// muestre siempre el logotipo.
export { default, alt, size, contentType } from "../opengraph-image";
