import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess, sendNoContent, parsePaginationParams } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class UserController {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async getByUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getByUsername(req.params.username);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.userId!, req.body);
      sendSuccess(res, user, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.userId!);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await userService.updateProfile(req.userId!, req.body);
      sendSuccess(res, profile, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude } = req.body;
      const profile = await userService.updateLocation(req.userId!, latitude, longitude);
      sendSuccess(res, profile, 'Location updated');
    } catch (error) {
      next(error);
    }
  }

  async getGarments(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip } = parsePaginationParams(req.query);
      const result = await userService.getUserGarments(req.params.id, { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await userService.deactivateAccount(req.userId!);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      const { page, limit } = parsePaginationParams(req.query);
      const result = await userService.searchUsers(String(q || ''), { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
