export type RequisitionPriority = "Baja" | "Media" | "Alta" | "Urgente";

export interface RequisitionItemInput {
  materialId?: number;
  manualMaterialName?: string;
  quantityRequested: number;
  unitOfMeasure?: string;
  comment?: string;
}

export interface CreateRequisitionInput {
  priority: RequisitionPriority;
  generalComment?: string;
  items: RequisitionItemInput[];
}

export interface RequisitionFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  departmentId?: number;
  priority?: RequisitionPriority;
  employeeSearch?: string;
  code?: string;
  materialSearch?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface StatusChangeInput {
  statusCode: string;
  reason?: string;
  items?: Array<{
    requisitionItemId: number;
    quantityApproved?: number;
  }>;
}

export interface DeliverInput {
  items: Array<{
    requisitionItemId: number;
    quantityDelivered: number;
  }>;
  comment?: string;
}

export interface RequisitionMeta {
  id: number;
  code: string;
  employeeId: number;
  statusCode: string;
  statusName: string;
  statusId: number;
  isFinal: boolean;
}
