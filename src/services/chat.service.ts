import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type { SendMessageInput, ChatMessage, PaginationParams } from '../types/index.js';
import { createPaginationMeta } from '../utils/response.js';

export class ChatService {
  async getConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          select: {
            user1Id: true,
            user2Id: true,
            status: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Check if user is part of this conversation
    if (
      conversation.match.user1Id !== userId &&
      conversation.match.user2Id !== userId
    ) {
      throw new ForbiddenError('Not authorized to view this conversation');
    }

    return conversation;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationParams
  ) {
    // Verify access
    await this.getConversation(conversationId, userId);

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Mark messages as read
    await this.markAsRead(conversationId, userId);

    const transformed: ChatMessage[] = messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      type: msg.type,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      sender: msg.sender,
    }));

    return {
      items: transformed.reverse(), // Return in chronological order
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async sendMessage(userId: string, input: SendMessageInput): Promise<ChatMessage> {
    const { conversationId, content, type = 'TEXT', metadata } = input;

    // Verify access
    const conversation = await this.getConversation(conversationId, userId);

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type,
        metadata: metadata || undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Get the other user ID for notifications
    const otherUserId =
      conversation.match.user1Id === userId
        ? conversation.match.user2Id
        : conversation.match.user1Id;

    // Create notification (imported service creates the notification)
    // Note: This would be better handled via Socket.io in real-time
    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: 'Nuevo mensaje',
        body: content.substring(0, 100),
        data: {
          conversationId,
          messageId: message.id,
          senderId: userId,
        },
      },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      isRead: message.isRead,
      createdAt: message.createdAt,
      sender: message.sender,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Get all conversations the user is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        match: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    const count = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return count;
  }

  async getUserConversations(userId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          match: {
            OR: [{ user1Id: userId }, { user2Id: userId }],
            status: { notIn: ['CANCELLED', 'EXPIRED'] },
          },
        },
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          match: {
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
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.conversation.count({
        where: {
          match: {
            OR: [{ user1Id: userId }, { user2Id: userId }],
          },
        },
      }),
    ]);

    // Transform to include other user and unread count
    const transformed = await Promise.all(
      conversations.map(async (conv) => {
        const isUser1 = conv.match.user1Id === userId;
        const otherUser = isUser1 ? conv.match.user2 : conv.match.user1;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return {
          id: conv.id,
          matchId: conv.matchId,
          otherUser,
          garment: conv.match.garment1,
          lastMessage: conv.messages[0] || null,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
        };
      })
    );

    return {
      items: transformed,
      meta: createPaginationMeta(total, page, limit),
    };
  }
}

export const chatService = new ChatService();
