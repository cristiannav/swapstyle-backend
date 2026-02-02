import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import type { SwipeInput, SwipeResult } from '../types/index.js';
import { notificationService } from './notification.service.js';

export class SwipeService {
  async swipe(userId: string, input: SwipeInput): Promise<SwipeResult> {
    const { garmentId, direction } = input;

    // Get the garment to find the owner
    const garment = await prisma.garment.findUnique({
      where: { id: garmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
        likeCount: true,
      },
    });

    if (!garment) {
      throw new NotFoundError('Garment not found');
    }

    if (garment.status !== 'ACTIVE') {
      throw new BadRequestError('This garment is not available');
    }

    if (garment.userId === userId) {
      throw new BadRequestError('Cannot swipe on your own garment');
    }

    // Check if already swiped
    const existingSwipe = await prisma.swipe.findUnique({
      where: {
        swiperId_garmentId: {
          swiperId: userId,
          garmentId,
        },
      },
    });

    if (existingSwipe) {
      throw new BadRequestError('Already swiped on this garment');
    }

    // Create the swipe
    const swipe = await prisma.swipe.create({
      data: {
        swiperId: userId,
        swipedId: garment.userId,
        garmentId,
        direction,
      },
    });

    // If right swipe, increment like count and check for match
    if (direction === 'RIGHT') {
      await prisma.garment.update({
        where: { id: garmentId },
        data: { likeCount: { increment: 1 } },
      });

      // Check if the other user has liked any of our garments
      const mutualLike = await this.checkForMatch(userId, garment.userId);

      if (mutualLike) {
        // Create match
        const match = await this.createMatch(userId, garment.userId, garmentId, mutualLike.garmentId);

        return {
          swipe: { id: swipe.id },
          isMatch: true,
          match: { id: match.id },
        };
      }
    }

    return {
      swipe: { id: swipe.id },
      isMatch: false,
    };
  }

  private async checkForMatch(userId: string, otherUserId: string) {
    // Find if the other user has swiped right on any of our garments
    const mutualSwipe = await prisma.swipe.findFirst({
      where: {
        swiperId: otherUserId,
        swipedId: userId,
        direction: 'RIGHT',
      },
    });

    return mutualSwipe;
  }

  private async createMatch(
    user1Id: string,
    user2Id: string,
    garment1Id: string,
    garment2Id: string
  ) {
    // Ensure consistent ordering (lower ID first)
    const [orderedUser1, orderedUser2] = user1Id < user2Id
      ? [user1Id, user2Id]
      : [user2Id, user1Id];

    const [orderedGarment1, orderedGarment2] = user1Id < user2Id
      ? [garment1Id, garment2Id]
      : [garment2Id, garment1Id];

    // Check if match already exists
    const existingMatch = await prisma.match.findFirst({
      where: {
        user1Id: orderedUser1,
        user2Id: orderedUser2,
        status: { not: 'CANCELLED' },
      },
    });

    if (existingMatch) {
      return existingMatch;
    }

    // Create match with conversation
    const match = await prisma.match.create({
      data: {
        user1Id: orderedUser1,
        user2Id: orderedUser2,
        garment1Id: orderedGarment1,
        garment2Id: orderedGarment2,
        conversation: {
          create: {},
        },
      },
      include: {
        conversation: true,
        garment1: {
          select: { title: true },
        },
        garment2: {
          select: { title: true },
        },
      },
    });

    // Send notifications to both users
    await Promise.all([
      notificationService.create({
        userId: user1Id,
        type: 'NEW_MATCH',
        title: '¡Nuevo Match!',
        body: `Has hecho match con una prenda que te gusta`,
        data: { matchId: match.id },
      }),
      notificationService.create({
        userId: user2Id,
        type: 'NEW_MATCH',
        title: '¡Nuevo Match!',
        body: `Has hecho match con una prenda que te gusta`,
        data: { matchId: match.id },
      }),
    ]);

    return match;
  }

  async getSwipeHistory(userId: string, direction?: 'LEFT' | 'RIGHT') {
    const where: Record<string, unknown> = { swiperId: userId };

    if (direction) {
      where.direction = direction;
    }

    const swipes = await prisma.swipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        garment: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    return swipes;
  }

  async undoLastSwipe(userId: string) {
    // Get the last swipe
    const lastSwipe = await prisma.swipe.findFirst({
      where: { swiperId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastSwipe) {
      throw new NotFoundError('No swipes to undo');
    }

    // Check if it was within 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    if (lastSwipe.createdAt < fiveSecondsAgo) {
      throw new BadRequestError('Can only undo swipes within 5 seconds');
    }

    // Delete the swipe
    await prisma.swipe.delete({
      where: { id: lastSwipe.id },
    });

    // If it was a right swipe, decrement like count
    if (lastSwipe.direction === 'RIGHT') {
      await prisma.garment.update({
        where: { id: lastSwipe.garmentId },
        data: { likeCount: { decrement: 1 } },
      });
    }

    return { undone: true };
  }
}

export const swipeService = new SwipeService();
