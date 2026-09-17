import { siteDefaults } from "@/lib/site";

/**
 * Link a un chat de WhatsApp con el mensaje ya escrito.
 *
 * wa.me quiere el numero en digitos, sin `+` ni separadores. El numero real
 * pasa a ser editable desde /admin/configuracion en la Fase 6: cuando eso
 * exista, esta funcion recibe el numero por parametro en vez de leerlo de los
 * defaults.
 */
export function linkWhatsapp(mensaje?: string): string {
  const numero = siteDefaults.whatsapp.replace(/\D/g, "");
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** El mismo numero, formateado para mostrar: +54 9 223 616 3910. */
export function whatsappVisible(): string {
  const d = siteDefaults.whatsapp.replace(/\D/g, "");
  return `+${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

export function linkInstagram(): string {
  return `https://instagram.com/${siteDefaults.instagram}`;
}
