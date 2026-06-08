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

export interface DashboardStatistics {
  topDepartments: unknown[];
  topMaterials: unknown[];
  requestsByStatus: unknown[];
  requestsByPriority: unknown[];
  requestsTrend: unknown[];
  averageResponseTimeHours: number;
  averageDeliveryTimeHours: number;
  deliveryRate: number;
}
