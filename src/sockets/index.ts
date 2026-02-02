import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import type { ChatMessage, TypingData } from '../types/index.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface ConnectedUser {
visibleTo  visibleTo: string[];
  socketId: string;
  username: string;
}

// Store connected users
const connectedUsers = new Map<string, ConnectedUser>();

export function initializeSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const username = socket.username!;

    console.log(`User connected: ${username} (${userId})`);

    // Store connected user
    connectedUsers.set(userId, {
      socketId: socket.id,
      username,
    });

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Update user's last active status
    prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() },
    }).catch(() => {});

    // ============== CHAT EVENTS ==============

    // Join a conversation room
    socket.on('join:conversation', async (conversationId: string) => {
      try {
        // Verify user is part of this conversation
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            match: {
              select: { user1Id: true, user2Id: true },
            },
          },
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        if (conversation.match.user1Id !== userId && conversation.match.user2Id !== userId) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        socket.emit('joined:conversation', { conversationId });

        // Mark messages as read
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

        // Notify the other user that messages were read
        const otherUserId = conversation.match.user1Id === userId
          ? conversation.match.user2Id
          : conversation.match.user1Id;

        io.to(`user:${otherUserId}`).emit('messages:read', {
          conversationId,
          readBy: userId,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave a conversation room
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send a message
    socket.on('message:send', async (data: {
      conversationId: string;
      content: string;
      type?: string;
      metadata?: Record<string, unknown>;
    }) => {
      try {
        const { conversationId, content, type = 'TEXT', metadata } = data;

        // Verify user is part of this conversation
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            match: {
              select: { user1Id: true, user2Id: true, status: true },
            },
          },
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        if (conversation.match.user1Id !== userId && conversation.match.user2Id !== userId) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            type: type as never,
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

        const messageData: ChatMessage = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          isRead: message.isRead,
          createdAt: message.createdAt,
          sender: message.sender,
        };

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit('message:received', messageData);

        // Send notification to other user if not in conversation
        const otherUserId = conversation.match.user1Id === userId
          ? conversation.match.user2Id
          : conversation.match.user1Id;

        // Create notification
        const notification = await prisma.notification.create({
          data: {
            userId: otherUserId,
            type: 'NEW_MESSAGE',
            title: `Nuevo mensaje de @${username}`,
            body: content.substring(0, 100),
            data: {
              conversationId,
              messageId: message.id,
              senderId: userId,
            },
          },
        });

        io.to(`user:${otherUserId}`).emit('notification:received', notification);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (data: { conversationId: string }) => {
      const typingData: TypingData = {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      };
      socket.to(`conversation:${data.conversationId}`).emit('user:typing', typingData);
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      const typingData: TypingData = {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      };
      socket.to(`conversation:${data.conversationId}`).emit('user:typing', typingData);
    });

    // ============== MATCH EVENTS ==============

    // Notify about new match (called from service)
    socket.on('match:created', async (matchId: string) => {
      try {
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: {
            user1: { select: { id: true, username: true, avatar: true } },
            user2: { select: { id: true, username: true, avatar: true } },
            garment1: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            garment2: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        });

        if (match) {
          io.to(`user:${match.user1Id}`).emit('match:new', match);
          io.to(`user:${match.user2Id}`).emit('match:new', match);
        }
      } catch (error) {
        console.error('Error broadcasting match:', error);
      }
    });

    // ============== PRESENCE EVENTS ==============

    // Get online status of users
    socket.on('presence:check', (userIds: string[]) => {
      const onlineStatus: Record<string, boolean> = {};
      userIds.forEach((id) => {
        onlineStatus[id] = connectedUsers.has(id);
      });
      socket.emit('presence:status', onlineStatus);
    });

    // ============== DISCONNECT ==============

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${username} (${userId})`);
      connectedUsers.delete(userId);

      // Update last active
      prisma.user.update({
        where: { id: userId },
        data: { lastActive: new Date() },
      }).catch(() => {});
    });
  });

  return io;
}

// Helper function to emit events from services
export function emitToUser(io: Server, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToConversation(io: Server, conversationId: string, event: string, data: unknown): void {
  io.to(`conversation:${conversationId}`).emit(event, data);
}

export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId);
}

export function getOnlineUsers(): string[] {
  return Array.from(connectedUsers.keys());
}
