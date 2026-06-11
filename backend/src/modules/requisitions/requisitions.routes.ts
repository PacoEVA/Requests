import { Router } from "express";
import { z } from "zod";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { authenticateEmployee } from "../../middlewares/employee.middleware";
import { authenticateEmployeeOrInternal } from "../../middlewares/requisition-access.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { requisitionsController } from "./requisitions.controller";

const prioritySchema = z.enum(["Baja", "Media", "Alta", "Urgente"]);

const createRequisitionSchema = z.object({
  priority: prioritySchema.default("Media"),
  generalComment: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        materialId: z.number().int().positive().optional(),
        manualMaterialName: z.string().max(200).optional(),
        quantityRequested: z.number().positive(),
        comment: z.string().max(500).optional()
      })
    )
    .min(1)
});

const cancelSchema = z.object({
  reason: z.string().min(3).max(1000)
});

const commentSchema = z.object({
  message: z.string().min(1).max(2000)
});

const statusSchema = z.object({
  statusCode: z.string().min(1).max(50),
  reason: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        requisitionItemId: z.number().int().positive(),
        quantityApproved: z.number().positive().optional()
      })
    )
    .optional()
});

const assignSchema = z.object({
  assignedToUserId: z.number().int().positive()
});

const deliverSchema = z.object({
  items: z
    .array(
      z.object({
        requisitionItemId: z.number().int().positive(),
        quantityDelivered: z.number().nonnegative()
      })
    )
    .min(1),
  comment: z.string().max(1000).optional()
});

export const requisitionsRouter = Router();
export const adminRequisitionsRouter = Router();

requisitionsRouter.post("/", authenticateEmployee, validate(createRequisitionSchema), requisitionsController.create);
requisitionsRouter.get("/my", authenticateEmployee, requisitionsController.listMine);
requisitionsRouter.get("/my/:id", authenticateEmployee, requisitionsController.getMine);
requisitionsRouter.patch("/my/:id/cancel", authenticateEmployee, validate(cancelSchema), requisitionsController.cancelMine);
requisitionsRouter.get("/:id/comments", authenticateEmployeeOrInternal, requisitionsController.listComments);
requisitionsRouter.post("/:id/comments", authenticateEmployeeOrInternal, validate(commentSchema), requisitionsController.addComment);

adminRequisitionsRouter.use(authenticateInternal);
adminRequisitionsRouter.get("/", requisitionsController.listAdmin);
adminRequisitionsRouter.get("/:id", requisitionsController.getAdmin);
adminRequisitionsRouter.patch("/:id/status", requireRole("Admin", "Compras"), validate(statusSchema), requisitionsController.updateStatus);
adminRequisitionsRouter.patch("/:id/assign", requireRole("Admin", "Compras"), validate(assignSchema), requisitionsController.assign);
adminRequisitionsRouter.patch("/:id/deliver", requireRole("Admin", "Compras"), validate(deliverSchema), requisitionsController.deliver);
adminRequisitionsRouter.get("/:id/comments", requisitionsController.listComments);
adminRequisitionsRouter.post("/:id/comments", requireRole("Admin", "Compras"), validate(commentSchema), requisitionsController.addComment);
