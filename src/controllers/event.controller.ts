import type { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service.js';
import { sendSuccess, sendCreated, sendNoContent, parsePaginationParams } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class EventController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.create(req.body);
      sendCreated(res, event, 'Event created');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getById(req.params.id);
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  async getUpcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await eventService.getUpcoming({ page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const participant = await eventService.register(req.params.id, req.userId!);
      sendCreated(res, participant, 'Registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async unregister(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await eventService.unregister(req.params.id, req.userId!);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getMyEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await eventService.getUserEvents(req.userId!, { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radius } = req.query;
      const { page, limit } = parsePaginationParams(req.query);

      const result = await eventService.getNearby(
        Number(latitude),
        Number(longitude),
        radius ? Number(radius) : undefined,
        { page, limit }
      );
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const eventController = new EventController();
