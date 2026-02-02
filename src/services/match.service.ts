import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import type { PaginationParams, MatchWithDetails } from '../types/index.js';
import { createPaginationMeta } from '../utils/response.js';
import { notificationService } from './notification.service.js';

export class MatchService {
  async getById(matchId: string, userId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
          },
        },
        garment1: {
          include: {
            images: true,
          },
        },
        garment2: {
          include: {
            images: true,
          },
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundError('Match not found');
    }

    // Check if user is part of this match
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenError('Not authorized to view this match');
    }

    return match;
  }

  async getUserMatches(userId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: { notIn: ['CANCELLED', 'EXPIRED'] as const },
    };

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user1: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          user2: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          garment1: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          garment2: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          conversation: {
            select: {
              id: true,
              lastMessageAt: true,
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  content: true,
                  senderId: true,
                  createdAt: true,
                  isRead: true,
                },
              },
            },
          },
        },
      }),
      prisma.match.count({ where }),
    ]);

    // Transform to include "other user" perspective
    const transformed: MatchWithDetails[] = matches.map((match) => {
      const isUser1 = match.user1Id === userId;
      const otherUser = isUser1 ? match.user2 : match.user1;

      return {
        id: match.id,
        user1Id: match.user1Id,
        user2Id: match.user2Id,
        garment1Id: match.garment1Id,
        garment2Id: match.garment2Id,
        status: match.status,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          avatar: otherUser.avatar,
        },
        garments: [
          {
            id: match.garment1.id,
            title: match.garment1.title,
            images: match.garment1.images.map((img) => ({ url: img.url })),
          },
          ...(match.garment2
            ? [{
                id: match.garment2.id,
                title: match.garment2.title,
                images: match.garment2.images.map((img) => ({ url: img.url })),
              }]
            : []),
        ],
        conversation: match.conversation
          ? {
              id: match.conversation.id,
              lastMessageAt: match.conversation.lastMessageAt,
            }
          : null,
        createdAt: match.createdAt,
      };
    });

    return {
      items: transformed,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async updateStatus(matchId: string, userId: string, status: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundError('Match not found');
    }

    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenError('Not authorized to update this match');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['NEGOTIATING', 'CANCELLED'],
      NEGOTIATING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      EXPIRED: [],
    };

    if (!validTransitions[match.status]?.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${match.status} to ${status}`);
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: status as never },
    });

    // If completed, update garment status
    if (status === 'COMPLETED') {
      await prisma.garment.updateMany({
        where: {
          id: { in: [match.garment1Id, match.garment2Id].filter(Boolean) as string[] },
        },
        data: { status: 'SWAPPED' },
      });

      // Send notifications
      const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      await notificationService.create({
        userId: otherUserId,
        type: 'SWAP_COMPLETED',
        title: '¡Intercambio completado!',
        body: 'Tu intercambio ha sido marcado como completado',
        data: { matchId },
      });
    }

    return updated;
  }

  async proposeGarmentForMatch(matchId: string, userId: string, garmentId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundError('Match not found');
    }

    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    // Verify the garment belongs to the user
    const garment = await prisma.garment.findUnique({
      where: { id: garmentId },
    });

    if (!garment || garment.userId !== userId) {
      throw new BadRequestError('Invalid garment');
    }

    // Update the match with the proposed garment
    const updateField = match.user1Id === userId ? 'garment1Id' : 'garment2Id';

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { [updateField]: garmentId },
    });

    return updated;
  }

  async getStats(userId: string) {
    const [totalMatches, completedSwaps, pendingMatches] = await Promise.all([
      prisma.match.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      }),
      prisma.match.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          status: 'COMPLETED',
        },
      }),
      prisma.match.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          status: { in: ['PENDING', 'ACCEPTED', 'NEGOTIATING'] },
        },
      }),
    ]);

    return {
      totalMatches,
      completedSwaps,
      pendingMatches,
    };
  }
}

export const matchService = new MatchService();
