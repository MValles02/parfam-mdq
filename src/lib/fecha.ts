/**
 * Tiempo relativo en espaniol (es-AR) para timestamps del panel. No usamos
 * date-fns (no esta instalado, ver AGENTS.md): con minutos/horas/dias/semanas/
 * meses alcanza para lo que muestra la tabla de productos.
 */
export function hace(fecha: Date): string {
  const segundos = Math.max(0, (Date.now() - fecha.getTime()) / 1000);

  if (segundos < 60) return "recién";

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60)
    return `hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} ${horas === 1 ? "hora" : "horas"}`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;

  const semanas = Math.floor(dias / 7);
  if (semanas < 5)
    return `hace ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;

  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}
