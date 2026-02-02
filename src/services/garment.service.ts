import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type {
  CreateGarmentInput,
  UpdateGarmentInput,
  GarmentFilters,
  PaginationParams,
} from '../types/index.js';
import { createPaginationMeta } from '../utils/response.js';

export class GarmentService {
  async create(userId: string, data: CreateGarmentInput) {
    const garment = await prisma.garment.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category as never,
        subcategory: data.subcategory,
        brand: data.brand,
        size: data.size,
        color: data.color,
        condition: data.condition as never,
        originalPrice: data.originalPrice,
        tags: data.tags || [],
      },
      include: {
        images: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return garment;
  }

  async getById(id: string) {
    const garment = await prisma.garment.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
            reputationScore: true,
          },
        },
      },
    });

    if (!garment || garment.status === 'DELETED') {
      throw new NotFoundError('Garment not found');
    }

    // Increment view count (fire and forget)
    prisma.garment.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return garment;
  }

  async update(id: string, userId: string, data: UpdateGarmentInput) {
    const garment = await prisma.garment.findUnique({
      where: { id },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new ForbiddenError('Not authorized to update this garment');
    }

    const updated = await prisma.garment.update({
      where: { id },
      data: {
        ...data,
        category: data.category as never,
        condition: data.condition as never,
        status: data.status as never,
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const garment = await prisma.garment.findUnique({
      where: { id },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new ForbiddenError('Not authorized to delete this garment');
    }

    // Soft delete
    await prisma.garment.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  async addImages(garmentId: string, userId: string, images: { url: string; isPrimary?: boolean }[]) {
    const garment = await prisma.garment.findUnique({
      where: { id: garmentId },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new ForbiddenError('Not authorized to modify this garment');
    }

    // Get current max order
    const maxOrder = await prisma.garmentImage.aggregate({
      where: { garmentId },
      _max: { order: true },
    });

    const startOrder = (maxOrder._max.order || 0) + 1;

    const created = await prisma.garmentImage.createMany({
      data: images.map((img, index) => ({
        garmentId,
        url: img.url,
        isPrimary: img.isPrimary || (index === 0 && !maxOrder._max.order),
        order: startOrder + index,
      })),
    });

    return created;
  }

  async removeImage(garmentId: string, imageId: string, userId: string) {
    const garment = await prisma.garment.findUnique({
      where: { id: garmentId },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    if (garment.userId !== userId) {
      throw new ForbiddenError('Not authorized to modify this garment');
    }

    await prisma.garmentImage.delete({
      where: { id: imageId, garmentId },
    });
  }

  async search(filters: GarmentFilters, pagination: PaginationParams) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: filters.status || 'ACTIVE',
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.size) {
      where.size = filters.size;
    }

    if (filters.color) {
      where.color = { contains: filters.color, mode: 'insensitive' };
    }

    if (filters.condition) {
      where.condition = filters.condition;
    }

    if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.estimatedValue = {};
      if (filters.minPrice !== undefined) {
        (where.estimatedValue as Record<string, number>).gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        (where.estimatedValue as Record<string, number>).lte = filters.maxPrice;
      }
    }

    const [garments, total] = await Promise.all([
      prisma.garment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.garment.count({ where }),
    ]);

    return {
      items: garments,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getDiscoveryFeed(userId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get IDs of garments the user has already swiped on
    const swipedGarmentIds = await prisma.swipe.findMany({
      where: { swiperId: userId },
      select: { garmentId: true },
    });

    const excludeIds = swipedGarmentIds.map((s) => s.garmentId);

    // Get user preferences for better matching (future AI integration)
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const [garments, total] = await Promise.all([
      prisma.garment.findMany({
        where: {
          status: 'ACTIVE',
          userId: { not: userId }, // Exclude user's own garments
          id: { notIn: excludeIds },
          // Future: Add preference-based filtering
          ...(userProfile?.preferredSizes?.length
            ? { size: { in: userProfile.preferredSizes } }
            : {}),
        },
        skip,
        take: limit,
        orderBy: [
          { isPromoted: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isVerified: true,
              profile: {
                select: {
                  city: true,
                },
              },
            },
          },
        },
      }),
      prisma.garment.count({
        where: {
          status: 'ACTIVE',
          userId: { not: userId },
          id: { notIn: excludeIds },
        },
      }),
    ]);

    return {
      items: garments,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getSimilar(garmentId: string, limit: number = 10) {
    const garment = await prisma.garment.findUnique({
      where: { id: garmentId },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    // Simple similarity based on category and size
    // Future: Use AI style vectors for better matching
    const similar = await prisma.garment.findMany({
      where: {
        id: { not: garmentId },
        status: 'ACTIVE',
        category: garment.category,
        size: garment.size,
      },
      take: limit,
      orderBy: { likeCount: 'desc' },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    return similar;
  }
}

export const garmentService = new GarmentService();
