import { getDbPool, sql } from "../../config/db";

export interface DashboardStatisticFilters {
  dateFrom?: string;
  dateTo?: string;
}

function nullableDate(value: unknown, endOfDay = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
}

export class DashboardRepository {
  async summary() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN S.Code = 'PENDING' THEN 1 ELSE 0 END) AS Pending,
        SUM(CASE WHEN S.Code = 'IN_REVIEW' THEN 1 ELSE 0 END) AS InReview,
        SUM(CASE WHEN S.Code = 'APPROVED' THEN 1 ELSE 0 END) AS Approved,
        SUM(CASE WHEN S.Code = 'REJECTED' THEN 1 ELSE 0 END) AS Rejected,
        SUM(CASE WHEN S.Code = 'DELIVERED' THEN 1 ELSE 0 END) AS Delivered,
        SUM(CASE WHEN S.Code = 'CANCELLED' THEN 1 ELSE 0 END) AS Cancelled,
        SUM(CASE WHEN R.Priority = 'Urgente' THEN 1 ELSE 0 END) AS Urgent
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
    `);

    const row = result.recordset[0] ?? {};

    return {
      counts: {
        pending: Number(row.Pending ?? 0),
        inReview: Number(row.InReview ?? 0),
        approved: Number(row.Approved ?? 0),
        rejected: Number(row.Rejected ?? 0),
        delivered: Number(row.Delivered ?? 0),
        cancelled: Number(row.Cancelled ?? 0),
        urgent: Number(row.Urgent ?? 0)
      }
    };
  }

  async recentRequisitions() {
    const pool = await getDbPool();
    const result = await pool.query(`
      SELECT TOP 10
        R.Id,
        R.Code,
        R.Priority,
        R.CreatedAt,
        S.Name AS StatusName,
        E.Name AS EmployeeName,
        D.Name AS DepartmentName
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      INNER JOIN Departments D ON E.DepartmentId = D.Id
      ORDER BY R.CreatedAt DESC
    `);

    return result.recordset;
  }

  async statistics(filters: DashboardStatisticFilters = {}) {
    const pool = await getDbPool();
    const request = pool
      .request()
      .input("DateFrom", sql.DateTime2, nullableDate(filters.dateFrom))
      .input("DateTo", sql.DateTime2, nullableDate(filters.dateTo, true));

    const result = await request.query(`
      SELECT TOP 5 D.Name, COUNT(*) AS Total
      FROM Requisitions R
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      INNER JOIN Departments D ON E.DepartmentId = D.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
      GROUP BY D.Name
      ORDER BY Total DESC;

      SELECT TOP 10 COALESCE(M.Name, RI.ManualMaterialName) AS Name, SUM(RI.QuantityRequested) AS TotalQuantity
      FROM RequisitionItems RI
      INNER JOIN Requisitions R ON RI.RequisitionId = R.Id
      LEFT JOIN Materials M ON RI.MaterialId = M.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
      GROUP BY COALESCE(M.Name, RI.ManualMaterialName)
      ORDER BY TotalQuantity DESC;

      SELECT S.Name, COUNT(*) AS Total
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
      GROUP BY S.Name;

      SELECT Priority, COUNT(*) AS Total
      FROM Requisitions
      WHERE (@DateFrom IS NULL OR CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR CreatedAt <= @DateTo)
      GROUP BY Priority;

      SELECT CONVERT(date, CreatedAt) AS Date, COUNT(*) AS Total
      FROM Requisitions
      WHERE (@DateFrom IS NULL OR CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR CreatedAt <= @DateTo)
      GROUP BY CONVERT(date, CreatedAt)
      ORDER BY Date ASC;

      SELECT
        AVG(CASE WHEN UpdatedAt IS NOT NULL THEN DATEDIFF(hour, CreatedAt, UpdatedAt) END) AS AverageResponseTimeHours,
        AVG(CASE WHEN ClosedAt IS NOT NULL THEN DATEDIFF(hour, CreatedAt, ClosedAt) END) AS AverageDeliveryTimeHours,
        CAST(SUM(CASE WHEN S.Code = 'DELIVERED' THEN 1 ELSE 0 END) AS float) / NULLIF(COUNT(*), 0) AS DeliveryRate
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo);
    `);

    const recordsets = result.recordsets as unknown as Array<Array<Record<string, unknown>>>;
    const averages = recordsets[5]?.[0] ?? {};

    return {
      topDepartments: recordsets[0] ?? [],
      topMaterials: recordsets[1] ?? [],
      requestsByStatus: recordsets[2] ?? [],
      requestsByPriority: recordsets[3] ?? [],
      requestsTrend: recordsets[4] ?? [],
      averageResponseTimeHours: Number(averages.AverageResponseTimeHours ?? 0),
      averageDeliveryTimeHours: Number(averages.AverageDeliveryTimeHours ?? 0),
      deliveryRate: Number(averages.DeliveryRate ?? 0)
    };
  }
}

export const dashboardRepository = new DashboardRepository();
