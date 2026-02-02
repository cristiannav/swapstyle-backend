import type { Request, Response, NextFunction } from 'express';
import { garmentService } from '../services/garment.service.js';
import { sendSuccess, sendCreated, sendNoContent, parsePaginationParams } from '../utils/response.js';
import type { AuthenticatedRequest, GarmentFilters } from '../types/index.js';

export class GarmentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const garment = await garmentService.create(req.userId!, req.body);
      sendCreated(res, garment, 'Garment created');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const garment = await garmentService.getById(req.params.id);
      sendSuccess(res, garment);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const garment = await garmentService.update(req.params.id, req.userId!, req.body);
      sendSuccess(res, garment, 'Garment updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await garmentService.delete(req.params.id, req.userId!);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async addImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      const images = files.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        isPrimary: index === 0 && req.body.isPrimary === 'true',
      }));

      await garmentService.addImages(req.params.id, req.userId!, images);
      sendSuccess(res, { uploaded: images.length }, 'Images uploaded');
    } catch (error) {
      next(error);
    }
  }

  async removeImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await garmentService.removeImage(req.params.id, req.params.imageId, req.userId!);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const sortBy = String(req.query.sortBy || 'createdAt');
      const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

      const filters: GarmentFilters = {
        category: req.query.category as string,
        size: req.query.size as string,
        color: req.query.color as string,
        condition: req.query.condition as string,
        brand: req.query.brand as string,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      };

      const result = await garmentService.search(filters, { page, limit, sortBy, sortOrder });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getDiscoveryFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationParams(req.query);
      const result = await garmentService.getDiscoveryFeed(req.userId!, { page, limit });
      sendSuccess(res, result.items, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getSimilar(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(20, parseInt(String(req.query.limit || '10'), 10));
      const similar = await garmentService.getSimilar(req.params.id, limit);
      sendSuccess(res, similar);
    } catch (error) {
      next(error);
    }
  }
}

export const garmentController = new GarmentController();
