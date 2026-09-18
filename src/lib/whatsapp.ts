import { parsePhoneNumberWithError } from "libphonenumber-js";

/**
 * Link a un chat de WhatsApp con el mensaje ya escrito, para un numero
 * cualquiera (wa.me quiere el numero en digitos, sin `+` ni separadores).
 *
 * Es la unica version a proposito: no hay un helper que lea un numero fijo
 * del codigo. Todos los call-sites de la tienda (footer, contacto, ficha,
 * checkout) pasan `SiteSetting.whatsappNumber`, que el admin edita desde
 * `/admin/configuracion`; el unico que usa otro numero es el panel de
 * pedidos, que arma el link al chat del cliente.
 */
export function linkWhatsappA(numero: string, mensaje?: string): string {
  const digitos = numero.replace(/\D/g, "");
  const base = `https://wa.me/${digitos}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/**
 * Valida que un link recibido de afuera (query string) sea efectivamente uno
 * que pudo haber generado `linkWhatsappA`: esquema `https` y host `wa.me`.
 *
 * Existe por `/pedido/[number]/gracias`, que recibe `?link=` del checkout y
 * lo usa como `href` de un botón — sin esto, cualquiera arma
 * `?link=https://sitio-atacante/` y la página real, con su marca, termina
 * linkeando a donde diga el parámetro (ver F-05 en `docs/findings.md`).
 */
export function esLinkWhatsappValido(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname === "wa.me";
  } catch {
    return false;
  }
}

/** Igual que `linkWhatsappA`, para el Instagram de `SiteSetting.instagramHandle`. */
export function linkInstagramA(handle: string): string {
  return `https://instagram.com/${handle}`;
}

/**
 * Formatea un telefono E.164 (el formato en que se guarda `Order.customerPhone`
 * y `SiteSetting.whatsappNumber`) para mostrarlo: "+54 9 223 616 3910".
 */
export function telefonoVisible(e164: string): string {
  try {
    return parsePhoneNumberWithError(e164).formatInternational();
  } catch {
    return e164;
  }
}
