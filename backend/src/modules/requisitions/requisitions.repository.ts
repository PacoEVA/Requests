import { getDbPool, sql } from "../../config/db";
import { generateRequisitionCode } from "../../utils/code-generator";
import type {
  CreateRequisitionInput,
  DeliverInput,
  RequisitionFilters,
  StatusChangeInput
} from "./requisitions.types";

function paging(filters: RequisitionFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export class RequisitionsRepository {
  async create(employeeId: number, input: CreateRequisitionInput) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const year = new Date().getUTCFullYear();
      const sequenceResult = await new sql.Request(transaction)
        .input("Year", sql.Int, year)
        .query(`
          SELECT COUNT(*) + 1 AS NextSequence
          FROM Requisitions
          WHERE YEAR(CreatedAt) = @Year
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
          .input("UnitOfMeasure", sql.NVarChar(50), item.unitOfMeasure ?? null)
          .input("Comment", sql.NVarChar(500), item.comment ?? null)
          .query(`
            INSERT INTO RequisitionItems
              (RequisitionId, MaterialId, ManualMaterialName, QuantityRequested, UnitOfMeasure, Comment)
            VALUES
              (@RequisitionId, @MaterialId, @ManualMaterialName, @QuantityRequested, @UnitOfMeasure, @Comment)
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
            (@RequisitionId, 'CREATED', @StatusId, 'EMPLOYEE', @EmployeeId, 'Requisición creada')
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
      .input("Status", sql.NVarChar(50), filters.status ?? null)
      .input("Search", sql.NVarChar(80), filters.search ? `%${filters.search}%` : null)
      .input("Offset", sql.Int, offset)
      .input("PageSize", sql.Int, pageSize)
      .query(`
        SELECT R.Id, R.Code, R.Priority, R.CreatedAt, R.UpdatedAt, S.Code AS StatusCode, S.Name AS StatusName
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        WHERE R.EmployeeId = @EmployeeId
          AND (@Status IS NULL OR S.Code = @Status)
          AND (@Search IS NULL OR R.Code LIKE @Search)
        ORDER BY R.CreatedAt DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
      `);

    return result.recordset;
  }

  async listForAdmin(filters: RequisitionFilters) {
    const { pageSize, offset } = paging(filters);
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Status", sql.NVarChar(50), filters.status ?? null)
      .input("DepartmentId", sql.Int, filters.departmentId ?? null)
      .input("Priority", sql.NVarChar(20), filters.priority ?? null)
      .input("Code", sql.NVarChar(80), filters.code ? `%${filters.code}%` : null)
      .input("EmployeeSearch", sql.NVarChar(150), filters.employeeSearch ? `%${filters.employeeSearch}%` : null)
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
          D.Name AS DepartmentName
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        INNER JOIN Employees E ON R.EmployeeId = E.Id
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE (@Status IS NULL OR S.Code = @Status)
          AND (@DepartmentId IS NULL OR D.Id = @DepartmentId)
          AND (@Priority IS NULL OR R.Priority = @Priority)
          AND (@Code IS NULL OR R.Code LIKE @Code)
          AND (@EmployeeSearch IS NULL OR E.Name LIKE @EmployeeSearch OR E.EmployeeCode LIKE @EmployeeSearch)
        ORDER BY R.CreatedAt DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
      `);

    return result.recordset;
  }

  async findForEmployee(requisitionId: number, employeeId: number) {
    return this.findDetail(requisitionId, employeeId);
  }

  async findForAdmin(requisitionId: number) {
    return this.findDetail(requisitionId);
  }

  private async findDetail(requisitionId: number, employeeId?: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, requisitionId)
      .input("EmployeeId", sql.Int, employeeId ?? null)
      .query(`
        SELECT
          R.*,
          S.Code AS StatusCode,
          S.Name AS StatusName,
          E.Name AS EmployeeName,
          D.Name AS DepartmentName
        FROM Requisitions R
        INNER JOIN RequisitionStatuses S ON R.StatusId = S.Id
        INNER JOIN Employees E ON R.EmployeeId = E.Id
        INNER JOIN Departments D ON E.DepartmentId = D.Id
        WHERE R.Id = @Id AND (@EmployeeId IS NULL OR R.EmployeeId = @EmployeeId);

        SELECT RI.*, M.Name AS MaterialName
        FROM RequisitionItems RI
        LEFT JOIN Materials M ON RI.MaterialId = M.Id
        WHERE RI.RequisitionId = @Id;

        SELECT *
        FROM RequisitionHistory
        WHERE RequisitionId = @Id
        ORDER BY CreatedAt ASC;
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
    await pool
      .request()
      .input("Id", sql.Int, requisitionId)
      .input("EmployeeId", sql.Int, employeeId)
      .input("Reason", sql.NVarChar(1000), reason)
      .query(`
        DECLARE @CancelledStatusId INT;
        SELECT @CancelledStatusId = Id FROM RequisitionStatuses WHERE Code = 'CANCELLED';

        UPDATE Requisitions
        SET StatusId = @CancelledStatusId,
            CancelledAt = SYSUTCDATETIME(),
            CancelReason = @Reason,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @Id
          AND EmployeeId = @EmployeeId
          AND StatusId IN (SELECT Id FROM RequisitionStatuses WHERE Code IN ('PENDING', 'IN_REVIEW'));

        INSERT INTO RequisitionHistory
          (RequisitionId, Action, NewStatusId, PerformedByType, EmployeeId, Notes)
        VALUES
          (@Id, 'CANCELLED', @CancelledStatusId, 'EMPLOYEE', @EmployeeId, @Reason);
      `);
  }

  async listComments(requisitionId: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("RequisitionId", sql.Int, requisitionId)
      .query(`
        SELECT *
        FROM RequisitionComments
        WHERE RequisitionId = @RequisitionId
        ORDER BY CreatedAt ASC
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

  async updateStatus(requisitionId: number, userId: number, input: StatusChangeInput) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const statusResult = await new sql.Request(transaction)
        .input("StatusCode", sql.NVarChar(50), input.statusCode)
        .query("SELECT TOP 1 Id FROM RequisitionStatuses WHERE Code = @StatusCode");
      const statusId = Number(statusResult.recordset[0].Id);

      await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("StatusId", sql.Int, statusId)
        .input("Reason", sql.NVarChar(1000), input.reason ?? null)
        .query(`
          UPDATE Requisitions
          SET StatusId = @StatusId,
              RejectReason = CASE WHEN @Reason IS NOT NULL AND @StatusId = (SELECT Id FROM RequisitionStatuses WHERE Code = 'REJECTED') THEN @Reason ELSE RejectReason END,
              RejectedAt = CASE WHEN @StatusId = (SELECT Id FROM RequisitionStatuses WHERE Code = 'REJECTED') THEN SYSUTCDATETIME() ELSE RejectedAt END,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);

      for (const item of input.items ?? []) {
        await new sql.Request(transaction)
          .input("ItemId", sql.Int, item.requisitionItemId)
          .input("QuantityApproved", sql.Decimal(18, 4), item.quantityApproved ?? null)
          .query(`
            UPDATE RequisitionItems
            SET QuantityApproved = @QuantityApproved
            WHERE Id = @ItemId
          `);
      }

      await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .input("InternalUserId", sql.Int, userId)
        .input("StatusId", sql.Int, statusId)
        .input("Notes", sql.NVarChar(1000), input.reason ?? `Estado cambiado a ${input.statusCode}`)
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, NewStatusId, PerformedByType, InternalUserId, Notes)
          VALUES
            (@RequisitionId, 'STATUS_CHANGED', @StatusId, 'INTERNAL_USER', @InternalUserId, @Notes)
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async assign(requisitionId: number, assignedToUserId: number, performedByUserId: number) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("Id", sql.Int, requisitionId)
      .input("AssignedToUserId", sql.Int, assignedToUserId)
      .input("PerformedByUserId", sql.Int, performedByUserId)
      .query(`
        UPDATE Requisitions
        SET AssignedToUserId = @AssignedToUserId,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @Id;

        INSERT INTO RequisitionHistory
          (RequisitionId, Action, PerformedByType, InternalUserId, Notes)
        VALUES
          (@Id, 'ASSIGNED', 'INTERNAL_USER', @PerformedByUserId, 'Responsable asignado');
      `);
  }

  async deliver(requisitionId: number, userId: number, input: DeliverInput) {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const item of input.items) {
        await new sql.Request(transaction)
          .input("ItemId", sql.Int, item.requisitionItemId)
          .input("QuantityDelivered", sql.Decimal(18, 4), item.quantityDelivered)
          .query(`
            UPDATE RequisitionItems
            SET QuantityDelivered = @QuantityDelivered
            WHERE Id = @ItemId
          `);
      }

      const statusResult = await new sql.Request(transaction).query(`
        SELECT TOP 1 Id FROM RequisitionStatuses WHERE Code = 'DELIVERED'
      `);

      await new sql.Request(transaction)
        .input("Id", sql.Int, requisitionId)
        .input("StatusId", sql.Int, Number(statusResult.recordset[0].Id))
        .query(`
          UPDATE Requisitions
          SET StatusId = @StatusId,
              ClosedAt = SYSUTCDATETIME(),
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @Id
        `);

      await new sql.Request(transaction)
        .input("RequisitionId", sql.Int, requisitionId)
        .input("InternalUserId", sql.Int, userId)
        .input("StatusId", sql.Int, Number(statusResult.recordset[0].Id))
        .input("Notes", sql.NVarChar(1000), input.comment ?? "Requisición entregada")
        .query(`
          INSERT INTO RequisitionHistory
            (RequisitionId, Action, NewStatusId, PerformedByType, InternalUserId, Notes)
          VALUES
            (@RequisitionId, 'DELIVERED', @StatusId, 'INTERNAL_USER', @InternalUserId, @Notes)
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export const requisitionsRepository = new RequisitionsRepository();
