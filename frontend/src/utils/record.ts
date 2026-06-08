export function recordId(record: { id?: number; Id?: number }) {
  return record.id ?? record.Id ?? 0;
}

export function recordName(record: { name?: string; Name?: string }) {
  return record.name ?? record.Name ?? "";
}

export function recordValue<T>(record: Record<string, unknown>, camelKey: string, pascalKey: string, fallback: T): T {
  return (record[camelKey] ?? record[pascalKey] ?? fallback) as T;
}
