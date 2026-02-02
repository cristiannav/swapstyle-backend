import type { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';
import { sendSuccess, sendNoContent, parsePaginationParams } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class NotificationController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await notificationService.getUserNotifications(req.userId!, { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAsRead(req.params.id, req.userId!);
      sendSuccess(res, { marked: true });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.userId!);
      sendSuccess(res, { marked: true });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.userId!);
      sendSuccess(res, { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.delete(req.params.id, req.userId!);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
