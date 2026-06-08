import { Router } from "express";
import { z } from "zod";
import { authenticateInternal } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { authController } from "./auth.controller";

const credentialsSchema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200)
});

const forceChangePasswordSchema = z.object({
  newPassword: z.string().min(8).max(200)
});

export const authRouter = Router();

authRouter.post("/login", validate(credentialsSchema), authController.login);
authRouter.post("/logout", (_req, res) => res.json({ ok: true }));
authRouter.get("/me", authenticateInternal, authController.me);
authRouter.post(
  "/change-password",
  authenticateInternal,
  validate(changePasswordSchema),
  authController.changePassword
);
authRouter.post(
  "/force-change-password",
  authenticateInternal,
  validate(forceChangePasswordSchema),
  authController.forceChangePassword
);
