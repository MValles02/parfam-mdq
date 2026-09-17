import { parsePhoneNumberWithError } from "libphonenumber-js";
import { siteDefaults } from "@/lib/site";

/**
 * Link a un chat de WhatsApp con el mensaje ya escrito, para un numero
 * cualquiera (wa.me quiere el numero en digitos, sin `+` ni separadores).
 *
 * Es la version general que usa el checkout de la Fase 5, que arma el link
 * con el numero real de `SiteSetting.whatsappNumber` -- ahi no vale el
 * default estatico, porque ese numero pasa a ser editable desde
 * /admin/configuracion en la Fase 6.
 */
export function linkWhatsappA(numero: string, mensaje?: string): string {
  const digitos = numero.replace(/\D/g, "");
  const base = `https://wa.me/${digitos}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/**
 * Igual que `linkWhatsappA`, pero con el numero de los defaults del sitio.
 * Es lo que usan los links "consultar por WhatsApp" de la tienda (ficha,
 * footer, contacto): todavia no hay UI para editar el numero (Fase 6), asi
 * que hoy vale lo mismo que el de `SiteSetting.whatsappNumber` sembrado.
 */
export function linkWhatsapp(mensaje?: string): string {
  return linkWhatsappA(siteDefaults.whatsapp, mensaje);
}

/** El mismo numero, formateado para mostrar: +54 9 223 616 3910. */
export function whatsappVisible(): string {
  const d = siteDefaults.whatsapp.replace(/\D/g, "");
  return `+${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

export function linkInstagram(): string {
  return `https://instagram.com/${siteDefaults.instagram}`;
}

/**
 * Formatea un telefono E.164 (el formato en que se guarda `Order.customerPhone`,
 * ver `src/lib/validations/checkout.ts`) para mostrarlo: "+54 9 223 616 3910".
 * Usa el formateador de libphonenumber-js en vez del slice a mano de
 * `whatsappVisible()` porque acá el numero puede ser de cualquier telefono AR
 * que haya escrito un cliente, no siempre el mismo largo.
 */
export function telefonoVisible(e164: string): string {
  try {
    return parsePhoneNumberWithError(e164).formatInternational();
  } catch {
    return e164;
  }
}
