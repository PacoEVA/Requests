import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "./error.middleware";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const message = firstIssue?.message ? `Datos invalidos: ${firstIssue.message}` : "Datos invalidos";
      next(new AppError(message, 400, "VALIDATION_ERROR"));
      return;
    }

    req[target] = result.data;
    next();
  };
}
