/**
 * Spanish (es-AR) relative time for admin timestamps. date-fns is not
 * installed (see AGENTS.md); minutes, hours, days, weeks, and months cover
 * the product table's needs.
 */
export function formatRelativeDate(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "recién";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? "día" : "días"}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;

  const months = Math.floor(days / 30);
  return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}
