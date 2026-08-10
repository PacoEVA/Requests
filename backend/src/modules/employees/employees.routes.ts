import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticateEmployee } from "../../middlewares/employee.middleware";
import { authenticateInternal, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { employeesController } from "./employees.controller";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  departmentId: z.number().int().positive(),
  employeeCode: z.string().trim().min(1).max(50),
  phoneOrExtension: z.string().trim().min(1).max(50),
  email: z.string().trim().max(255).email(),
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/, "Usuario inválido"),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(72)
});

const updateEmployeeSchema = registerSchema.omit({ employeeCode: true, username: true, password: true });

const employeeAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos de acceso. Intente nuevamente más tarde.",
    error: { code: "EMPLOYEE_AUTH_RATE_LIMIT", message: "Demasiados intentos de acceso" }
  }
});

export const employeesRouter = Router();
export const adminEmployeesRouter = Router();

// Registro/login publicos y perfil protegido por JWT de empleado.
employeesRouter.post("/register", employeeAuthLimiter, validate(registerSchema), employeesController.register);
employeesRouter.post("/login", employeeAuthLimiter, validate(loginSchema), employeesController.login);
employeesRouter.get("/me", authenticateEmployee, employeesController.me);
employeesRouter.put("/me", authenticateEmployee, validate(updateEmployeeSchema), employeesController.updateMe);

// Administracion de cuentas de empleado restringida exclusivamente a Admin.
adminEmployeesRouter.use(authenticateInternal, requireRole("Admin"));
adminEmployeesRouter.get("/", employeesController.adminList);
adminEmployeesRouter.patch("/:id/activate", employeesController.adminActivate);
adminEmployeesRouter.patch("/:id/deactivate", employeesController.adminDeactivate);
