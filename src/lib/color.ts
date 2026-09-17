/**
 * Colores legibles para los chips de acordes.
 *
 * Los 93 acordes traen su color propio desde la base (`Accord.color`, del
 * diccionario en data/dictionaries/accords.es.json). Es el unico color del
 * sitio que no sale de un token de globals.css -- justamente porque es un
 * dato, no una decision de tema -- y por eso el texto que va encima tampoco
 * puede salir de un token: tiene que contrastar contra ese hex en modo claro
 * y en modo oscuro por igual.
 *
 * Elegir el mejor de los dos extremos de la paleta no alcanza: 40 de los 93
 * colores son tonos medios que no llegan a 4,5:1 contra ninguno de los dos
 * (el mejor caso da 4,01), y el texto del chip es de 12 px, asi que WCAG AA
 * pide 4,5:1. Por eso el fondo se corrige: se lo aleja del color del texto lo
 * justo para llegar al umbral. El ajuste maximo sobre el diccionario actual es
 * de un 8 % hacia el otro extremo -- el tono se mantiene, el chip sigue siendo
 * reconociblemente el color del acorde.
 */

const TINTA = "#14120F";
const CREMA = "#F2EEE9";

/** WCAG AA para texto normal. El chip tiene 12 px, no califica como grande. */
const CONTRASTE_MINIMO = 4.5;

/** Cuanto se acerca el fondo al otro extremo en cada intento. */
const PASO = 0.02;

type Rgb = [number, number, number];

function aRgb(hex: string): Rgb | null {
  const limpio = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return null;
  return [0, 2, 4].map((i) =>
    Number.parseInt(limpio.slice(i, i + 2), 16),
  ) as Rgb;
}

function aHex(rgb: Rgb): string {
  return `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Canal a luz lineal, como define WCAG para la luminancia relativa. */
function lineal(canal: number): number {
  return canal <= 0.04045
    ? canal / 12.92
    : Math.pow((canal + 0.055) / 1.055, 2.4);
}

function luminancia([r, g, b]: Rgb): number {
  return (
    0.2126 * lineal(r / 255) +
    0.7152 * lineal(g / 255) +
    0.0722 * lineal(b / 255)
  );
}

/** Razon de contraste WCAG entre dos colores, de 1 a 21. */
function contraste(a: Rgb, b: Rgb): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

function mezclar(desde: Rgb, hacia: Rgb, proporcion: number): Rgb {
  return desde.map((v, i) => v + (hacia[i] - v) * proporcion) as Rgb;
}

export type ColorDeChip = { fondo: string; texto: string };

/**
 * Devuelve el fondo y el color de texto de un chip de acorde, garantizando
 * 4,5:1. Si el color no es un hex valido, cae a los tokens neutros por las
 * dudas: un chip ilegible es peor que un chip sin color.
 */
export function colorDeChip(color: string): ColorDeChip {
  const base = aRgb(color);
  if (!base) return { fondo: CREMA, texto: TINTA };

  const tinta = aRgb(TINTA)!;
  const crema = aRgb(CREMA)!;

  // Se arranca por el extremo que ya contrasta mejor: asi el ajuste posterior
  // es el minimo posible.
  const usaTinta = contraste(base, tinta) >= contraste(base, crema);
  const texto = usaTinta ? tinta : crema;
  const opuesto = usaTinta ? crema : tinta;

  if (contraste(base, texto) >= CONTRASTE_MINIMO) {
    return { fondo: aHex(base), texto: aHex(texto) };
  }

  for (let p = PASO; p <= 1; p += PASO) {
    const candidato = mezclar(base, opuesto, p);
    if (contraste(candidato, texto) >= CONTRASTE_MINIMO) {
      return { fondo: aHex(candidato), texto: aHex(texto) };
    }
  }
  return { fondo: aHex(opuesto), texto: aHex(texto) };
}
