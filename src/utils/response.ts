import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '../types/index.js';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: PaginationMeta
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta,
  };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message: string = 'Created successfully'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return res.status(statusCode).json(response);
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function parsePaginationParams(
  query: Record<string, unknown>
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
