import type { Response, NextFunction } from 'express';
import { swipeService } from '../services/swipe.service.js';
import { superLikeService } from '../services/superlike.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class SwipeController {
  async swipe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await swipeService.swipe(req.userId!, req.body);

      if (result.isMatch) {
        sendCreated(res, result, '¡Match!');
      } else {
        sendCreated(res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async superLike(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { garmentId, message } = req.body;
      const result = await superLikeService.send(req.userId!, garmentId, message);
      sendCreated(res, result, 'Super Like sent');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const direction = req.query.direction as 'LEFT' | 'RIGHT' | undefined;
      const swipes = await swipeService.getSwipeHistory(req.userId!, direction);
      sendSuccess(res, swipes);
    } catch (error) {
      next(error);
    }
  }

  async undo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await swipeService.undoLastSwipe(req.userId!);
      sendSuccess(res, result, 'Swipe undone');
    } catch (error) {
      next(error);
    }
  }

  async getSuperLikesReceived(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const superLikes = await superLikeService.getReceived(req.userId!);
      sendSuccess(res, superLikes);
    } catch (error) {
      next(error);
    }
  }

  async getSuperLikesSent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const superLikes = await superLikeService.getSent(req.userId!);
      sendSuccess(res, superLikes);
    } catch (error) {
      next(error);
    }
  }

  async getSuperLikesRemaining(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const remaining = await superLikeService.getRemainingToday(req.userId!);
      sendSuccess(res, { remaining, limit: 5 });
    } catch (error) {
      next(error);
    }
  }
}

export const swipeController = new SwipeController();
