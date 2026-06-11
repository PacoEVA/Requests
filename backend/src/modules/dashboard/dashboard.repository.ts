import { getDbPool, sql } from "../../config/db";

export interface DashboardStatisticFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string | number;
  statusCode?: string;
  priority?: string;
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

function nullableNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export class DashboardRepository {
  async summary(departmentId?: number) {
    const pool = await getDbPool();
    const result = await pool.request().input("DepartmentId", sql.Int, departmentId ?? null).query(`
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
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      WHERE (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
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

  async recentRequisitions(departmentId?: number) {
    const pool = await getDbPool();
    const result = await pool.request().input("DepartmentId", sql.Int, departmentId ?? null).query(`
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
      WHERE (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
      ORDER BY R.CreatedAt DESC
    `);

    return result.recordset;
  }

  async statistics(filters: DashboardStatisticFilters = {}) {
    const pool = await getDbPool();
    const request = pool
      .request()
      .input("DateFrom", sql.DateTime2, nullableDate(filters.dateFrom))
      .input("DateTo", sql.DateTime2, nullableDate(filters.dateTo, true))
      .input("DepartmentId", sql.Int, nullableNumber(filters.departmentId))
      .input("StatusCode", sql.NVarChar(50), nullableText(filters.statusCode))
      .input("Priority", sql.NVarChar(20), nullableText(filters.priority));

    const result = await request.query(`
      SELECT TOP 5
        D.Id AS DepartmentId,
        D.Name AS DepartmentName,
        COUNT(*) AS TotalRequisitions
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      INNER JOIN Departments D ON E.DepartmentId = D.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
        AND (@DepartmentId IS NULL OR D.Id = @DepartmentId)
        AND (@StatusCode IS NULL OR S.Code = @StatusCode)
        AND (@Priority IS NULL OR R.Priority = @Priority)
      GROUP BY D.Id, D.Name
      ORDER BY TotalRequisitions DESC;

      SELECT TOP 10
        COALESCE(M.Id, 0) AS MaterialId,
        COALESCE(M.Name, RI.ManualMaterialName) AS MaterialName,
        SUM(RI.QuantityRequested) AS TotalQuantityRequested,
        COUNT(*) AS TotalRequisitionLines
      FROM RequisitionItems RI
      INNER JOIN Requisitions R ON RI.RequisitionId = R.Id
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      LEFT JOIN Materials M ON RI.MaterialId = M.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
        AND (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
        AND (@StatusCode IS NULL OR S.Code = @StatusCode)
        AND (@Priority IS NULL OR R.Priority = @Priority)
      GROUP BY COALESCE(M.Id, 0), COALESCE(M.Name, RI.ManualMaterialName)
      ORDER BY TotalQuantityRequested DESC;

      SELECT S.Code AS StatusCode, S.Name AS StatusName, COUNT(*) AS Total
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
        AND (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
        AND (@StatusCode IS NULL OR S.Code = @StatusCode)
        AND (@Priority IS NULL OR R.Priority = @Priority)
      GROUP BY S.Code, S.Name
      ORDER BY Total DESC;

      SELECT R.Priority, COUNT(*) AS Total
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
        AND (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
        AND (@StatusCode IS NULL OR S.Code = @StatusCode)
        AND (@Priority IS NULL OR R.Priority = @Priority)
      GROUP BY R.Priority
      ORDER BY Total DESC;

      SELECT CONVERT(date, R.CreatedAt) AS Date, COUNT(*) AS Total
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
        AND (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
        AND (@StatusCode IS NULL OR S.Code = @StatusCode)
        AND (@Priority IS NULL OR R.Priority = @Priority)
      GROUP BY CONVERT(date, R.CreatedAt)
      ORDER BY Date ASC;

      SELECT
        AVG(CASE WHEN FirstResponse.FirstResponseAt IS NOT NULL THEN DATEDIFF(minute, R.CreatedAt, FirstResponse.FirstResponseAt) END) / 60.0 AS AverageResponseTimeHours,
        AVG(CASE WHEN R.ClosedAt IS NOT NULL THEN DATEDIFF(minute, R.CreatedAt, R.ClosedAt) END) / 60.0 AS AverageDeliveryTimeHours,
        CAST(SUM(CASE WHEN S.Code = 'DELIVERED' THEN 1 ELSE 0 END) AS float) / NULLIF(COUNT(*), 0) AS DeliveryRate,
        SUM(CASE WHEN S.Code = 'CANCELLED' THEN 1 ELSE 0 END) AS CancelledCount,
        SUM(CASE WHEN S.Code = 'REJECTED' THEN 1 ELSE 0 END) AS RejectedCount,
        SUM(CASE WHEN R.Priority = 'Urgente' THEN 1 ELSE 0 END) AS UrgentCount
      FROM Requisitions R
      INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
      INNER JOIN Employees E ON R.EmployeeId = E.Id
      OUTER APPLY (
        SELECT TOP 1 RH.CreatedAt AS FirstResponseAt
        FROM RequisitionHistory RH
        INNER JOIN RequisitionStatuses PreviousStatus ON RH.PreviousStatusId = PreviousStatus.Id
        WHERE RH.RequisitionId = R.Id
          AND PreviousStatus.Code = 'PENDING'
          AND RH.Action IN ('STATUS_CHANGED', 'CANCELLED', 'DELIVERED', 'PARTIALLY_DELIVERED')
        ORDER BY RH.CreatedAt ASC
      ) FirstResponse
      WHERE (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
        AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
        AND (@DepartmentId IS NULL OR E.DepartmentId = @DepartmentId)
        AND (@StatusCode IS NULL OR S.Code = @StatusCode)
        AND (@Priority IS NULL OR R.Priority = @Priority);
    `);

    const recordsets = result.recordsets as unknown as Array<Array<Record<string, unknown>>>;
    const averages = recordsets[5]?.[0] ?? {};

    return {
      topDepartment: recordsets[0]?.[0] ?? null,
      topDepartments: recordsets[0] ?? [],
      topMaterial: recordsets[1]?.[0] ?? null,
      topMaterials: recordsets[1] ?? [],
      requestsByStatus: recordsets[2] ?? [],
      requestsByPriority: recordsets[3] ?? [],
      requestsTrend: recordsets[4] ?? [],
      averageResponseTimeHours: Number(averages.AverageResponseTimeHours ?? 0),
      averageDeliveryTimeHours: Number(averages.AverageDeliveryTimeHours ?? 0),
      deliveryRate: Number(averages.DeliveryRate ?? 0),
      cancelledCount: Number(averages.CancelledCount ?? 0),
      rejectedCount: Number(averages.RejectedCount ?? 0),
      urgentCount: Number(averages.UrgentCount ?? 0)
    };
  }
}

export const dashboardRepository = new DashboardRepository();
