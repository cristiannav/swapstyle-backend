import type { Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service.js';
import { sendSuccess, sendCreated, parsePaginationParams } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class ChatController {
  async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await chatService.getUserConversations(req.userId!, { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await chatService.getMessages(
        req.params.conversationId,
        req.userId!,
        { page, limit }
      );
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const message = await chatService.sendMessage(req.userId!, {
        conversationId: req.params.conversationId,
        content: req.body.content,
        type: req.body.type,
        metadata: req.body.metadata,
      });
      sendCreated(res, message, 'Message sent');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await chatService.markAsRead(req.params.conversationId, req.userId!);
      sendSuccess(res, { marked: true });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await chatService.getUnreadCount(req.userId!);
      sendSuccess(res, { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
