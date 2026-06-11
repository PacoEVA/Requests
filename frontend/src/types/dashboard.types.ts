export interface DashboardSummary {
  counts: {
    pending: number;
    inReview: number;
    approved: number;
    rejected: number;
    delivered: number;
    cancelled: number;
    urgent: number;
  };
}

export interface TopDepartmentStatistic {
  DepartmentId?: number;
  departmentId?: number;
  DepartmentName?: string;
  departmentName?: string;
  TotalRequisitions?: number;
  totalRequisitions?: number;
}

export interface TopMaterialStatistic {
  MaterialId?: number;
  materialId?: number;
  MaterialName?: string;
  materialName?: string;
  TotalQuantityRequested?: number;
  totalQuantityRequested?: number;
  TotalRequisitionLines?: number;
  totalRequisitionLines?: number;
}

export interface StatusStatistic {
  StatusCode?: string;
  statusCode?: string;
  StatusName?: string;
  statusName?: string;
  Total?: number;
  total?: number;
}

export interface PriorityStatistic {
  Priority?: string;
  priority?: string;
  Total?: number;
  total?: number;
}

export interface TrendStatistic {
  Date?: string;
  date?: string;
  Total?: number;
  total?: number;
}

export interface DashboardStatistics {
  topDepartment: TopDepartmentStatistic | null;
  topDepartments: TopDepartmentStatistic[];
  topMaterial: TopMaterialStatistic | null;
  topMaterials: TopMaterialStatistic[];
  requestsByStatus: StatusStatistic[];
  requestsByPriority: PriorityStatistic[];
  requestsTrend: TrendStatistic[];
  averageResponseTimeHours: number;
  averageDeliveryTimeHours: number;
  deliveryRate: number;
  cancelledCount: number;
  rejectedCount: number;
  urgentCount: number;
}
