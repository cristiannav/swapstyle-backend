import { prisma } from '../config/database.js';
import type { PaginationParams } from '../types/index.js';
import { createPaginationMeta } from '../utils/response.js';

interface CreateNotificationInput {
  userId: string;
  type: 'NEW_MATCH' | 'NEW_MESSAGE' | 'SUPER_LIKE' | 'SWAP_COMPLETED' | 'EVENT_REMINDER' | 'SYSTEM';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  async create(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data || undefined,
      },
    });

    // Here you would also emit to Socket.io for real-time delivery
    // This will be handled by the socket service

    return notification;
  }

  async getUserNotifications(userId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: notifications,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async delete(notificationId: string, userId: string) {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async deleteOld(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        isRead: true,
      },
    });
  }
}

export const notificationService = new NotificationService();
