import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { allowedClientOrigins } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { adminDepartmentsRouter, departmentsRouter } from "./modules/departments/departments.routes";
import { employeesRouter } from "./modules/employees/employees.routes";
import { inventoryRouter } from "./modules/inventory/inventory.routes";
import {
  adminMaterialCategoriesRouter,
  adminMaterialsRouter,
  materialCategoriesRouter,
  materialsRouter
} from "./modules/materials/materials.routes";
import { adminRequisitionsRouter, requisitionsRouter } from "./modules/requisitions/requisitions.routes";
import { usersRouter } from "./modules/users/users.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedClientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "requests-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/requisitions", requisitionsRouter);
  app.use("/api/admin/requisitions", adminRequisitionsRouter);
  app.use("/api/materials", materialsRouter);
  app.use("/api/admin/materials", adminMaterialsRouter);
  app.use("/api/material-categories", materialCategoriesRouter);
  app.use("/api/admin/material-categories", adminMaterialCategoriesRouter);
  app.use("/api/departments", departmentsRouter);
  app.use("/api/admin/departments", adminDepartmentsRouter);
  app.use("/api/admin/dashboard", dashboardRouter);
  app.use("/api/admin/users", usersRouter);
  app.use("/api/admin/inventory", inventoryRouter);

  app.use(errorMiddleware);

  return app;
}
