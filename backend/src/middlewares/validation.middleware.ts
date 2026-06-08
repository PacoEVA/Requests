import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "./error.middleware";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(new AppError("Datos inválidos", 400, "VALIDATION_ERROR"));
      return;
    }

    req[target] = result.data;
    next();
  };
}
