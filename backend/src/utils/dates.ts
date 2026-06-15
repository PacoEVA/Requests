/** Devuelve la fecha/hora actual en formato ISO UTC. */
export function utcNow() {
  return new Date().toISOString();
}

/** Calcula horas entre dos fechas redondeando a un decimal. */
export function hoursBetween(start: Date, end: Date) {
  return Math.round(((end.getTime() - start.getTime()) / 36_000) / 10) / 10;
}
