export function utcNow() {
  return new Date().toISOString();
}

export function hoursBetween(start: Date, end: Date) {
  return Math.round(((end.getTime() - start.getTime()) / 36_000) / 10) / 10;
}
