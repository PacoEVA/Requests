import { getDbPool, sql } from "../../config/db";
import { generateRequisitionCode } from "../../utils/code-generator";
import type {
  CreateRequisitionInput,
  DeliverInput,
  RequisitionFilters,
  RequisitionMeta,
  StatusChangeInput
} from "./requisitions.types";

export interface RequisitionItemRecord {
  id: number;
  materialId: number | null;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityDelivered: number;
}

export interface DeliveryResult {
  requisition: Record<string, unknown> | null;
  statusCode: string;
  statusName: string;
}

const STATUS_HISTORY_MESSAGES: Record<string, string> = {
  PENDING: "Requisicion pendiente",
  IN_REVIEW: "Requisicion en revision",
  APPROVED: "Requisicion aprobada",
  IN_PURCHASE: "Requisicion en compra",
  READY_TO_DELIVER: "Requisicion lista para entregar",
  PARTIALLY_DELIVERED: "Entrega parcial registrada",
  DELIVERED: "Requisicion entregada",
  REJECTED: "Requisicion rechazada",
  CANCELLED: "Requisicion cancelada"
};

function statusHistoryMessage(statusCode: string, statusName: string) {
  return STATUS_HISTORY_MESSAGES[statusCode] ?? `Estado actualizado a ${statusName}`;
}

function paging(filters: RequisitionFilters) {
  const page = Math.max(Number(filters.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize ?? 20), 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function nullableLike(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? `%${text}%` : null;
}

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
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

function sortClause(filters: RequisitionFilters) {
  const sortColumns: Record<string, string> = {
    code: "R.Code",
    createdAt: "R.CreatedAt",
    priority: "R.Priority",
    status: "S.SortOrder"
  };
  const column = sortColumns[String(filters.sortBy ?? "createdAt")] ?? "R.CreatedAt";
  const direction = String(filters.sortDirection ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${column} ${direction}`;
}

function mapMeta(row: Record<string, unknown>): RequisitionMeta {
  return {
    id: Number(row.Id),
    code: String(row.Code),
    employeeId: Number(row.EmployeeId),
    departmentId: Number(row.DepartmentId),
    statusCode: String(row.StatusCode),
    statusName: String(row.StatusName),
    statusId: Number(row.StatusId),
    isFinal: Boolean(row.IsFinal)
  };
}

function mapItem(row: Record<string, unknown>): RequisitionItemRecord {
  return {
    id: Number(row.Id),
    materialId: row.MaterialId === null || row.MaterialId === undefined ? null : Number(row.MaterialId),
    quantityRequested: Number(row.QuantityRequested ?? 0),
    quantityApproved: row.QuantityApproved === null || row.QuantityApproved === undefined ? null : Number(row.QuantityApproved),
    quantityDelivered: Number(row.QuantityDelivered ?? 0)
  };
}

export class RequisitionsRepository {
  async create(employeeId: number, input: CreateRequisitionInput) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    try {
      const year = new Date().getUTCFullYear();
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));
      const sequenceResult = await new sql.Request(transaction)
        .input("YearStart", sql.DateTime2, yearStart)
        .input("NextYearStart", sql.DateTime2, nextYearStart)
        .query(`
          SELECT COUNT(*) + 1 AS NextSequence
          FROM Requisitions WITH (UPDLOCK, HOLDLOCK)
          WHERE CreatedAt >= @YearStart AND CreatedAt < @NextYearStart
        `);
      const code = generateRequisitionCode(year, Number(sequenceResult.recordset[0].NextSequence));

      const statusResult = await new sql.Request(transaction).query(`
        SELECT TOP 1 Id FROM RequisitionStatuses WHERE Code = 'PENDING'
      `);
      const statusId = Number(statusResult.recordset[0].Id);

      const requisitionResult = await new sql.Request(transaction)
        .input("Code", sql.NVarChar(30), code)
        .input("EmployeeId", sql.Int, employeeId)
        .input("StatusId", sql.Int, statusId)
        .input("Priority", sql.NVarChar(20), input.priority)
        .input("GeneralComment", sql.NVarChar(1000), input.generalComment ?? null)
        .query(`
          INSERT INTO Requisitions (Code, EmployeeId, StatusId, Priority, GeneralComment)
          OUTPUT INSERTED.Id
          VALUES (@Code, @EmployeeId, @StatusId, @Priority, @GeneralComment)
        `);

      const requisitionId = Number(requisitionResult.recordset[0].Id);

      for (const item of input.items) {
        await new sql.Request(transaction)
          .input("RequisitionId", sql.Int, requisitionId)
          .input("MaterialId", sql.Int, item.materialId ?? null)
          .input("ManualMaterialName", sql.NVarChar(200), item.manualMaterialName ?? null)
          .input("QuantityRequested", sql.Decimal(18, 4), item.quantityRequested)
          .input("Comment", sql.NVarChar(500), item.comment ?? null)
          .query(`
            INSERT INTO RequisitionItems
              (RequisitionId, MaterialId, ManualMaterialName, QuantityRequested, Comment)
            VALUES
              (@RequisitionId, @MaterialId, @ManualMaterialName, @QuantityRequested, @Comment)
          `);
      }

      await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .input("EmployeeId", sql.Int, employeeId)
        .input("StatusId", sql.Int, statusId)
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, NewStatusId, PerformedByType, EmployeeId, Notes)
          VALUES
            (@RequisitionId, 'CREATED', @StatusId, 'EMPLOYEE', @EmployeeId, 'Requisicion creada')
        `);

      await transaction.commit();
      return this.findForEmployee(requisitionId, employeeId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async listForEmployee(employeeId: number, filters: RequisitionFilters) {
    const { pageSize, offset } = paging(filters);
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("EmployeeId", sql.Int, employeeId)
      .input("Status", sql.NVarChar(50), nullableText(filters.status))
      .input("Priority", sql.NVarChar(20), nullableText(filters.priority))
      .input("Code", sql.NVarChar(80), nullableLike(filters.code ?? filters.search))
      .input("MaterialSearch", sql.NVarChar(200), nullableLike(filters.materialSearch))
      .input("DateFrom", sql.DateTime2, nullableDate(filters.dateFrom))
      .input("DateTo", sql.DateTime2, nullableDate(filters.dateTo, true))
      .input("Offset", sql.Int, offset)
      .input("PageSize", sql.Int, pageSize)
      .query(`
        SELECT R.Id, R.Code, R.Priority, R.CreatedAt, R.UpdatedAt, S.Code AS StatusCode, S.Name AS StatusName
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        WHERE R.EmployeeId = @EmployeeId
          AND (@Status IS NULL OR S.Code = @Status)
          AND (@Priority IS NULL OR R.Priority = @Priority)
          AND (@Code IS NULL OR R.Code LIKE @Code)
          AND (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
          AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
          AND (
            @MaterialSearch IS NULL
            OR EXISTS (
              SELECT 1
              FROM RequisitionItems RI
              LEFT JOIN Materials M ON RI.MaterialId = M.Id
              WHERE RI.RequisitionId = R.Id
                AND (M.Name LIKE @MaterialSearch OR RI.ManualMaterialName LIKE @MaterialSearch)
            )
          )
        ORDER BY ${sortClause(filters)}
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
      `);

    return result.recordset;
  }

  async listForAdmin(filters: RequisitionFilters) {
    const { pageSize, offset } = paging(filters);
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Status", sql.NVarChar(50), nullableText(filters.status))
      .input("DepartmentId", sql.Int, nullableNumber(filters.departmentId))
      .input("Priority", sql.NVarChar(20), nullableText(filters.priority))
      .input("Code", sql.NVarChar(80), nullableLike(filters.code ?? filters.search))
      .input("EmployeeSearch", sql.NVarChar(150), nullableLike(filters.employeeSearch))
      .input("MaterialSearch", sql.NVarChar(200), nullableLike(filters.materialSearch))
      .input("DateFrom", sql.DateTime2, nullableDate(filters.dateFrom))
      .input("DateTo", sql.DateTime2, nullableDate(filters.dateTo, true))
      .input("Offset", sql.Int, offset)
      .input("PageSize", sql.Int, pageSize)
      .query(`
        SELECT
          R.Id,
          R.Code,
          R.Priority,
          R.CreatedAt,
          S.Code AS StatusCode,
          S.Name AS StatusName,
          E.Name AS EmployeeName,
          D.Id AS DepartmentId,
          D.Name AS DepartmentName,
          U.FullName AS AssignedToName
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        INNER JOIN Employees E ON R.EmployeeId = E.Id
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        LEFT JOIN InternalUsers U ON R.AssignedToUserId = U.Id
        WHERE (@Status IS NULL OR S.Code = @Status)
          AND (@DepartmentId IS NULL OR D.Id = @DepartmentId)
          AND (@Priority IS NULL OR R.Priority = @Priority)
          AND (@Code IS NULL OR R.Code LIKE @Code)
          AND (@EmployeeSearch IS NULL OR E.Name LIKE @EmployeeSearch OR E.EmployeeCode LIKE @EmployeeSearch)
          AND (@DateFrom IS NULL OR R.CreatedAt >= @DateFrom)
          AND (@DateTo IS NULL OR R.CreatedAt <= @DateTo)
          AND (
            @MaterialSearch IS NULL
            OR EXISTS (
              SELECT 1
              FROM RequisitionItems RI
              LEFT JOIN Materials M ON RI.MaterialId = M.Id
              WHERE RI.RequisitionId = R.Id
                AND (M.Name LIKE @MaterialSearch OR RI.ManualMaterialName LIKE @MaterialSearch)
            )
          )
        ORDER BY ${sortClause(filters)}
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
      `);

    return result.recordset;
  }

  async findForEmployee(requisitionId: number, employeeId: number) {
    return this.findDetail(requisitionId, employeeId);
  }

  async findForAdmin(requisitionId: number, departmentId?: number) {
    return this.findDetail(requisitionId, undefined, departmentId);
  }

  async getMeta(requisitionId: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, requisitionId)
      .query(`
        SELECT
          R.Id,
          R.Code,
          R.EmployeeId,
          E.DepartmentId,
          R.StatusId,
          S.Code AS StatusCode,
          S.Name AS StatusName,
          S.IsFinal
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        INNER JOIN Employees E ON R.EmployeeId = E.Id
        WHERE R.Id = @Id
      `);

    const row = result.recordset[0];
    return row ? mapMeta(row) : null;
  }

  async getItems(requisitionId: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("RequisitionId", sql.Int, requisitionId)
      .query(`
        SELECT Id, MaterialId, QuantityRequested, QuantityApproved, ISNULL(QuantityDelivered, 0) AS QuantityDelivered
        FROM RequisitionItems
        WHERE RequisitionId = @RequisitionId
      `);

    return result.recordset.map((row) => mapItem(row));
  }

  private async findDetail(requisitionId: number, employeeId?: number, departmentId?: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, requisitionId)
      .input("EmployeeId", sql.Int, employeeId ?? null)
      .input("DepartmentId", sql.Int, departmentId ?? null)
      .query(`
        SELECT
          R.*,
          S.Code AS StatusCode,
          S.Name AS StatusName,
          S.IsFinal AS StatusIsFinal,
          E.Name AS EmployeeName,
          D.Id AS DepartmentId,
          D.Name AS DepartmentName,
          U.FullName AS AssignedToName
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        INNER JOIN Employees E ON R.EmployeeId = E.Id
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        LEFT JOIN InternalUsers U ON R.AssignedToUserId = U.Id
        WHERE R.Id = @Id
          AND (@EmployeeId IS NULL OR R.EmployeeId = @EmployeeId)
          AND (@DepartmentId IS NULL OR D.Id = @DepartmentId);

        SELECT RI.*, M.Name AS MaterialName, M.ItemCode AS MaterialItemCode
        FROM RequisitionItems RI
        LEFT JOIN Materials M ON RI.MaterialId = M.Id
        WHERE RI.RequisitionId = @Id
        ORDER BY RI.Id ASC;

        SELECT
          RH.*,
          PS.Name AS PreviousStatusName,
          NS.Name AS NewStatusName,
          E.Name AS EmployeeName,
          U.FullName AS InternalUserName
        FROM RequisitionHistory RH
        LEFT JOIN RequisitionStatuses PS ON RH.PreviousStatusId = PS.Id
        LEFT JOIN RequisitionStatuses NS ON RH.NewStatusId = NS.Id
        LEFT JOIN Employees E ON RH.EmployeeId = E.Id
        LEFT JOIN InternalUsers U ON RH.InternalUserId = U.Id
        WHERE RH.RequisitionId = @Id
        ORDER BY RH.CreatedAt ASC;
      `);

    const recordsets = result.recordsets as unknown as Array<Array<Record<string, unknown>>>;
    const header = recordsets[0]?.[0];
    if (!header) return null;

    return {
      ...header,
      items: recordsets[1] ?? [],
      history: recordsets[2] ?? []
    };
  }

  async cancelByEmployee(requisitionId: number, employeeId: number, reason: string) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const metaResult = await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("EmployeeId", sql.Int, employeeId)
        .query(`
          SELECT R.StatusId, S.IsFinal
          FROM Requisitions R WITH (UPDLOCK)
          INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
          WHERE R.Id = @Id AND R.EmployeeId = @EmployeeId
        `);

      const previousStatusId = metaResult.recordset[0]?.StatusId;
      if (!previousStatusId || Boolean(metaResult.recordset[0]?.IsFinal)) {
        await transaction.rollback();
        return null;
      }

      const cancelledResult = await new sql.Request(transaction).query(`
        SELECT TOP 1 Id FROM RequisitionStatuses WHERE Code = 'CANCELLED'
      `);
      const cancelledStatusId = Number(cancelledResult.recordset[0].Id);

      const updateResult = await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("EmployeeId", sql.Int, employeeId)
        .input("CancelledStatusId", sql.Int, cancelledStatusId)
        .input("Reason", sql.NVarChar(1000), reason)
        .query(`
          UPDATE Requisitions
          SET StatusId = @CancelledStatusId,
              CancelledAt = SYSUTCDATETIME(),
              CancelReason = @Reason,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id AND EmployeeId = @EmployeeId
        `);

      if ((updateResult.rowsAffected[0] ?? 0) === 0) {
        await transaction.rollback();
        return null;
      }

      await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("EmployeeId", sql.Int, employeeId)
        .input("PreviousStatusId", sql.Int, Number(previousStatusId))
        .input("CancelledStatusId", sql.Int, cancelledStatusId)
        .input("Reason", sql.NVarChar(1000), reason)
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, PreviousStatusId, NewStatusId, PerformedByType, EmployeeId, Notes)
          VALUES
            (@Id, 'CANCELLED', @PreviousStatusId, @CancelledStatusId, 'EMPLOYEE', @EmployeeId, @Reason)
        `);

      await transaction.commit();
      return this.findForEmployee(requisitionId, employeeId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async listComments(requisitionId: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("RequisitionId", sql.Int, requisitionId)
      .query(`
        SELECT
          RC.*,
          E.Name AS EmployeeName,
          U.FullName AS InternalUserName
        FROM RequisitionComments RC
        LEFT JOIN Employees E ON RC.EmployeeId = E.Id
        LEFT JOIN InternalUsers U ON RC.InternalUserId = U.Id
        WHERE RC.RequisitionId = @RequisitionId
        ORDER BY RC.CreatedAt ASC
      `);

    return result.recordset;
  }

  async addEmployeeComment(requisitionId: number, employeeId: number, message: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("RequisitionId", sql.Int, requisitionId)
      .input("EmployeeId", sql.Int, employeeId)
      .input("Message", sql.NVarChar(2000), message)
      .query(`
        INSERT INTO RequisitionComments (RequisitionId, AuthorType, EmployeeId, Message)
        OUTPUT INSERTED.*
        VALUES (@RequisitionId, 'EMPLOYEE', @EmployeeId, @Message)
      `);

    return result.recordset[0];
  }

  async addInternalComment(requisitionId: number, userId: number, message: string) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("RequisitionId", sql.Int, requisitionId)
      .input("InternalUserId", sql.Int, userId)
      .input("Message", sql.NVarChar(2000), message)
      .query(`
        INSERT INTO RequisitionComments (RequisitionId, AuthorType, InternalUserId, Message)
        OUTPUT INSERTED.*
        VALUES (@RequisitionId, 'INTERNAL_USER', @InternalUserId, @Message)
      `);

    return result.recordset[0];
  }

  async updateStatus(requisitionId: number, userId: number, input: StatusChangeInput, previousStatusId: number) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const statusResult = await new sql.Request(transaction)
        .input("StatusCode", sql.NVarChar(50), input.statusCode)
        .query("SELECT TOP 1 Id, Name FROM RequisitionStatuses WHERE Code = @StatusCode");
      const statusId = Number(statusResult.recordset[0]?.Id);
      const statusName = String(statusResult.recordset[0]?.Name ?? input.statusCode);
      if (!statusId) {
        await transaction.rollback();
        return null;
      }

      const updateResult = await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("StatusId", sql.Int, statusId)
        .input("StatusCode", sql.NVarChar(50), input.statusCode)
        .input("Reason", sql.NVarChar(1000), input.reason ?? null)
        .query(`
          UPDATE Requisitions
          SET StatusId = @StatusId,
              RejectReason = CASE WHEN @StatusCode = 'REJECTED' THEN @Reason ELSE RejectReason END,
              RejectedAt = CASE WHEN @StatusCode = 'REJECTED' THEN SYSUTCDATETIME() ELSE RejectedAt END,
              CancelReason = CASE WHEN @StatusCode = 'CANCELLED' THEN @Reason ELSE CancelReason END,
              CancelledAt = CASE WHEN @StatusCode = 'CANCELLED' THEN SYSUTCDATETIME() ELSE CancelledAt END,
              ClosedAt = CASE WHEN @StatusCode = 'DELIVERED' THEN SYSUTCDATETIME() ELSE ClosedAt END,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);

      if ((updateResult.rowsAffected[0] ?? 0) === 0) {
        await transaction.rollback();
        return null;
      }

      for (const item of input.items ?? []) {
        await new sql.Request(transaction)
          .input("RequisitionId", sql.Int, requisitionId)
          .input("ItemId", sql.Int, item.requisitionItemId)
          .input("QuantityApproved", sql.Decimal(18, 4), item.quantityApproved ?? null)
          .query(`
            UPDATE RequisitionItems
            SET QuantityApproved = @QuantityApproved
            WHERE Id = @ItemId AND RequisitionId = @RequisitionId
          `);
      }

      await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .input("InternalUserId", sql.Int, userId)
        .input("PreviousStatusId", sql.Int, previousStatusId)
        .input("StatusId", sql.Int, statusId)
        .input("Notes", sql.NVarChar(1000), input.reason?.trim() || statusHistoryMessage(input.statusCode, statusName))
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, PreviousStatusId, NewStatusId, PerformedByType, InternalUserId, Notes)
          VALUES
            (@RequisitionId, 'STATUS_CHANGED', @PreviousStatusId, @StatusId, 'INTERNAL_USER', @InternalUserId, @Notes)
        `);

      await transaction.commit();
      return this.findForAdmin(requisitionId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async assign(requisitionId: number, assignedToUserId: number, performedByUserId: number) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const updateResult = await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("AssignedToUserId", sql.Int, assignedToUserId)
        .query(`
          UPDATE Requisitions
          SET AssignedToUserId = @AssignedToUserId,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);

      if ((updateResult.rowsAffected[0] ?? 0) === 0) {
        await transaction.rollback();
        return null;
      }

      await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("PerformedByUserId", sql.Int, performedByUserId)
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, PerformedByType, InternalUserId, Notes)
          VALUES
            (@Id, 'ASSIGNED', 'INTERNAL_USER', @PerformedByUserId, 'Responsable asignado')
        `);

      await transaction.commit();
      return this.findForAdmin(requisitionId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deliver(requisitionId: number, userId: number, input: DeliverInput, previousStatusId: number): Promise<DeliveryResult | null> {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const currentItemsResult = await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .query(`
          SELECT Id, MaterialId, QuantityRequested, QuantityApproved, ISNULL(QuantityDelivered, 0) AS QuantityDelivered
          FROM RequisitionItems WITH (UPDLOCK)
          WHERE RequisitionId = @RequisitionId
        `);

      const currentItems = currentItemsResult.recordset.map((row) => mapItem(row));

      for (const item of input.items) {
        const current = currentItems.find((row) => row.id === item.requisitionItemId);
        if (!current) {
          await transaction.rollback();
          return null;
        }

        await new sql.Request(transaction)
          .input("RequisitionId", sql.Int, requisitionId)
          .input("ItemId", sql.Int, item.requisitionItemId)
          .input("QuantityDelivered", sql.Decimal(18, 4), current.quantityDelivered + item.quantityDelivered)
          .query(`
            UPDATE RequisitionItems
            SET QuantityDelivered = @QuantityDelivered
            WHERE Id = @ItemId AND RequisitionId = @RequisitionId
          `);
      }

      const deliveryStateResult = await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .query(`
          SELECT
            SUM(CASE WHEN ISNULL(QuantityDelivered, 0) >= ISNULL(QuantityApproved, QuantityRequested) THEN 1 ELSE 0 END) AS DeliveredLines,
            SUM(CASE WHEN ISNULL(QuantityDelivered, 0) > 0 THEN 1 ELSE 0 END) AS LinesWithDelivery,
            COUNT(*) AS TotalLines
          FROM RequisitionItems
          WHERE RequisitionId = @RequisitionId
        `);

      const deliveryState = deliveryStateResult.recordset[0];
      const totalLines = Number(deliveryState?.TotalLines ?? 0);
      const deliveredLines = Number(deliveryState?.DeliveredLines ?? 0);
      const linesWithDelivery = Number(deliveryState?.LinesWithDelivery ?? 0);
      const statusCode = totalLines > 0 && deliveredLines === totalLines ? "DELIVERED" : "PARTIALLY_DELIVERED";

      if (linesWithDelivery === 0) {
        await transaction.rollback();
        return null;
      }

      const statusResult = await new sql.Request(transaction)
        .input("StatusCode", sql.NVarChar(50), statusCode)
        .query("SELECT TOP 1 Id, Name FROM RequisitionStatuses WHERE Code = @StatusCode");
      const statusId = Number(statusResult.recordset[0].Id);
      const statusName = String(statusResult.recordset[0].Name);

      await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("StatusId", sql.Int, statusId)
        .input("StatusCode", sql.NVarChar(50), statusCode)
        .query(`
          UPDATE Requisitions
          SET StatusId = @StatusId,
              ClosedAt = CASE WHEN @StatusCode = 'DELIVERED' THEN SYSUTCDATETIME() ELSE ClosedAt END,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);

      await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .input("InternalUserId", sql.Int, userId)
        .input("PreviousStatusId", sql.Int, previousStatusId)
        .input("StatusId", sql.Int, statusId)
        .input("Action", sql.NVarChar(80), statusCode === "DELIVERED" ? "DELIVERED" : "PARTIALLY_DELIVERED")
        .input("Notes", sql.NVarChar(1000), input.comment ?? "Entrega registrada")
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, PreviousStatusId, NewStatusId, PerformedByType, InternalUserId, Notes)
          VALUES
            (@RequisitionId, @Action, @PreviousStatusId, @StatusId, 'INTERNAL_USER', @InternalUserId, @Notes)
        `);

      await transaction.commit();
      return {
        requisition: await this.findForAdmin(requisitionId),
        statusCode,
        statusName
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export const requisitionsRepository = new RequisitionsRepository();
