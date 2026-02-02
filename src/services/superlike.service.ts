import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { notificationService } from './notification.service.js';

const DAILY_SUPER_LIKE_LIMIT = 5;

export class SuperLikeService {
  async send(giverId: string, garmentId: string, message?: string) {
    // Get the garment
    const garment = await prisma.garment.findUnique({
      where: { id: garmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
        superLikeCount: true,
      },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    if (garment.status !== 'ACTIVE') {
      throw new BadRequestError('This garment is not available');
    }

    if (garment.userId === giverId) {
      throw new BadRequestError('Cannot super like your own garment');
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyCount = await prisma.superLike.count({
      where: {
        giverId,
        createdAt: { gte: today },
      },
    });

    if (dailyCount >= DAILY_SUPER_LIKE_LIMIT) {
      throw new BadRequestError(`Daily super like limit (${DAILY_SUPER_LIKE_LIMIT}) reached`);
    }

    // Check if already super liked
    const existing = await prisma.superLike.findUnique({
      where: {
        giverId_garmentId: {
          giverId,
          garmentId,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('Already super liked this garment');
    }

    // Create super like
    const superLike = await prisma.superLike.create({
      data: {
        giverId,
        receiverId: garment.userId,
        garmentId,
        message,
      },
      include: {
        giver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        garment: {
          select: {
            id: true,
            title: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    // Update garment super like count
    await prisma.garment.update({
      where: { id: garmentId },
      data: { superLikeCount: { increment: 1 } },
    });

    // Notify the garment owner
    await notificationService.create({
      userId: garment.userId,
      type: 'SUPER_LIKE',
      title: '¡Super Like recibido!',
      body: `@${superLike.giver.username} ha dado Super Like a tu prenda "${garment.title}"`,
      data: {
        superLikeId: superLike.id,
        garmentId,
        giverId,
      },
    });

    return superLike;
  }

  async getReceived(userId: string) {
    const superLikes = await prisma.superLike.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        giver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
          },
        },
        garment: {
          select: {
            id: true,
            title: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    return superLikes;
  }

  async getSent(userId: string) {
    const superLikes = await prisma.superLike.findMany({
      where: { giverId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        garment: {
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
        },
      },
    });

    return superLikes;
  }

  async getRemainingToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyCount = await prisma.superLike.count({
      where: {
        giverId: userId,
        createdAt: { gte: today },
      },
    });

    return Math.max(0, DAILY_SUPER_LIKE_LIMIT - dailyCount);
  }
}

export const superLikeService = new SuperLikeService();
