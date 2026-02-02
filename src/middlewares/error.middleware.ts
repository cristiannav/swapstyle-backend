import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { config } from '../config/index.js';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // Log error in development
  if (config.isDev) {
    console.error('Error:', error);
  }

  // Handle known operational errors
  if (error instanceof AppError) {
    const details = error instanceof ValidationError ? { fields: error.details } : undefined;

    return sendError(res, error.statusCode, error.code, error.message, details);
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'field';
      return sendError(res, 409, 'DUPLICATE_ENTRY', `${field} already exists`);
    }

    if (prismaError.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Record not found');
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'INVALID_TOKEN', 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 401, 'TOKEN_EXPIRED', 'Token has expired');
  }

  // Handle validation errors from express-validator
  if (error.name === 'ValidationError') {
    return sendError(res, 422, 'VALIDATION_ERROR', error.message);
  }

  // Handle multer errors
  if (error.name === 'MulterError') {
    const multerError = error as { code: string };
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 400, 'FILE_TOO_LARGE', 'File size exceeds limit');
    }
    return sendError(res, 400, 'UPLOAD_ERROR', error.message);
  }

  // Default to 500 Internal Server Error
  const message = config.isProd ? 'Internal server error' : error.message;
  return sendError(res, 500, 'INTERNAL_ERROR', message);
}

export function notFoundHandler(_req: Request, res: Response): Response {
  return sendError(res, 404, 'NOT_FOUND', 'Route not found');
}
