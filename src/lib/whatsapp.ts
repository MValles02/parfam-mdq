import { parsePhoneNumberWithError } from "libphonenumber-js";

/**
 * Link a un chat de WhatsApp con el mensaje ya escrito, para un numero
 * cualquiera (wa.me quiere el numero en digitos, sin `+` ni separadores).
 *
 * Es la unica version desde la Fase 6: antes existia tambien una que leia
 * `siteDefaults.whatsapp` (un numero fijo del codigo) para los links
 * "consultar por WhatsApp" de la tienda (footer, contacto), porque todavia
 * no habia forma de editarlo. Con `/admin/configuracion` ya hay un numero
 * real en la base, y esos dos eran los unicos call-sites fuera del checkout
 * -- se migraron a este mismo helper en vez de mantener una version estatica
 * sin usuarios.
 */
export function linkWhatsappA(numero: string, mensaje?: string): string {
  const digitos = numero.replace(/\D/g, "");
  const base = `https://wa.me/${digitos}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
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
