import type { Request, Response, NextFunction } from "express";
import { AppError, HttpStatus } from "../utils/AppError.js";

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details ?? null,
    });

    return;
  }

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Something went wrong. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  });
};