import type { Response, NextFunction } from 'express';
import { matchService } from '../services/match.service.js';
import { sendSuccess, parsePaginationParams } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class MatchController {
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const match = await matchService.getById(req.params.id, req.userId!);
      sendSuccess(res, match);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await matchService.getUserMatches(req.userId!, { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const match = await matchService.updateStatus(req.params.id, req.userId!, status);
      sendSuccess(res, match, 'Match status updated');
    } catch (error) {
      next(error);
    }
  }

  async proposeGarment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { garmentId } = req.body;
      const match = await matchService.proposeGarmentForMatch(req.params.id, req.userId!, garmentId);
      sendSuccess(res, match, 'Garment proposed');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stats = await matchService.getStats(req.userId!);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const matchController = new MatchController();
