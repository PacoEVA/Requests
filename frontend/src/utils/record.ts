/** Lee un id desde objetos que pueden venir en camelCase o PascalCase. */
export function recordId(record: { id?: number; Id?: number }) {
  return record.id ?? record.Id ?? 0;
}

/** Lee un nombre desde objetos que pueden venir en camelCase o PascalCase. */
export function recordName(record: { name?: string; Name?: string }) {
  return record.name ?? record.Name ?? "";
}

/** Obtiene un valor tolerando claves camelCase/PascalCase y aplica fallback. */
export function recordValue<T>(record: Record<string, unknown>, camelKey: string, pascalKey: string, fallback: T): T {
  return (record[camelKey] ?? record[pascalKey] ?? fallback) as T;
}
