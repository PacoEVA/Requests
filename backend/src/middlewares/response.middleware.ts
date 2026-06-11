import type { RequestHandler } from "express";

export const responseMiddleware: RequestHandler = (_req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body?: unknown) => {
    if (res.statusCode >= 400 || (body && typeof body === "object" && "success" in body)) {
      return originalJson(body);
    }

    return originalJson({
      success: true,
      data: body ?? {}
    });
  };

  next();
};
