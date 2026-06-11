import type { ErrorRequestHandler } from "express";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = "APP_ERROR"
  ) {
    super(message);
  }
}

export const notFoundHandler = (message = "Recurso no encontrado") => {
  throw new AppError(message, 404, "NOT_FOUND");
};

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Error interno del servidor" : error.message,
    errors: [],
    error: {
      code,
      message: statusCode >= 500 ? "Error interno del servidor" : error.message
    }
  });
};
