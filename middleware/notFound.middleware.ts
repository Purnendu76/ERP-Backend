import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(
    AppError.notFound(
      `Route not found: ${req.originalUrl}`,
      "ROUTE_NOT_FOUND",
    ),
  );
};