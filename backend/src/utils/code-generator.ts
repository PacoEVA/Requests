export function generateRequisitionCode(year: number, sequence: number) {
  return `REQ-${year}-${String(sequence).padStart(6, "0")}`;
}
