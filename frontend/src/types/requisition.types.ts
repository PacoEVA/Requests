export type RequisitionPriority = "Baja" | "Media" | "Alta" | "Urgente";

export interface RequisitionSummary {
  Id?: number;
  id?: number;
  Code?: string;
  code?: string;
  Priority?: RequisitionPriority;
  priority?: RequisitionPriority;
  StatusName?: string;
  statusName?: string;
  StatusCode?: string;
  statusCode?: string;
  EmployeeName?: string;
  employeeName?: string;
  DepartmentName?: string;
  departmentName?: string;
  CreatedAt?: string;
  createdAt?: string;
}

export interface RequisitionItemDraft {
  materialId?: number;
  manualMaterialName?: string;
  quantityRequested: number;
  comment?: string;
}

export interface CreateRequisitionPayload {
  priority: RequisitionPriority;
  generalComment?: string;
  items: RequisitionItemDraft[];
}

export interface RequisitionDetail extends RequisitionSummary {
  items?: unknown[];
  history?: unknown[];
}
