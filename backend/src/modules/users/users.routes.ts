import { Router } from "express";
import { z } from "zod";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { usersController } from "./users.controller";

const roleSchema = z.enum(["Admin", "Compras", "Supervisor"]);

const createUserSchema = z.object({
  username: z.string().min(3).max(80),
  fullName: z.string().min(2).max(150),
  password: z.string().min(8).max(200),
  role: roleSchema,
  departmentId: z.number().int().positive().optional()
});

const updateUserSchema = createUserSchema.omit({ password: true });

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8).max(200).optional(),
    autoGenerate: z.boolean().optional()
  })
  .refine((data) => data.autoGenerate || data.newPassword, "Debe indicar newPassword o autoGenerate");

export const usersRouter = Router();

usersRouter.use(authenticateInternal, requireRole("Admin"));
usersRouter.get("/", usersController.list);
usersRouter.post("/", validate(createUserSchema), usersController.create);
usersRouter.put("/:id", validate(updateUserSchema), usersController.update);
usersRouter.patch("/:id/deactivate", usersController.deactivate);
usersRouter.patch("/:id/activate", usersController.activate);
usersRouter.post("/:id/reset-password", validate(resetPasswordSchema), usersController.resetPassword);
