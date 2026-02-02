import { GraphQLError } from 'graphql';
import { prisma } from '../../config/database.js';
import {
  authService,
  userService,
  garmentService,
  swipeService,
  superLikeService,
  matchService,
  chatService,
  notificationService,
  eventService,
} from '../../services/index.js';

// Context type
interface Context {
  userId?: string;
}

// Helper to ensure authentication
function requireAuth(context: Context): string {
  if (!context.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.userId;
}

export const resolvers = {
  // ============== QUERIES ==============
  Query: {
    // Auth
    me: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return userService.getById(userId);
    },

    // Users
    user: async (_: unknown, { id }: { id: string }) => {
      return userService.getById(id);
    },

    userByUsername: async (_: unknown, { username }: { username: string }) => {
      return userService.getByUsername(username);
    },

    searchUsers: async (
      _: unknown,
      { query, page = 1, limit = 20 }: { query: string; page?: number; limit?: number }
    ) => {
      const result = await userService.searchUsers(query, { page, limit });
      return result.items;
    },

    // Garments
    garment: async (_: unknown, { id }: { id: string }) => {
      return garmentService.getById(id);
    },

    garments: async (
      _: unknown,
      { filters = {}, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' }: {
        filters?: Record<string, unknown>;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      }
    ) => {
      const result = await garmentService.search(filters as never, { page, limit, sortBy, sortOrder });
      return { items: result.items, pageInfo: result.meta };
    },

    discoveryFeed: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await garmentService.getDiscoveryFeed(userId, { page, limit });
      return { items: result.items, pageInfo: result.meta };
    },

    myGarments: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await userService.getUserGarments(userId, { page, limit });
      return { items: result.items, pageInfo: result.meta };
    },

    // Swipes
    swipeHistory: async (
      _: unknown,
      { direction }: { direction?: 'LEFT' | 'RIGHT' },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return swipeService.getSwipeHistory(userId, direction);
    },

    superLikesReceived: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return superLikeService.getReceived(userId);
    },

    superLikesSent: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return superLikeService.getSent(userId);
    },

    superLikesRemaining: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return superLikeService.getRemainingToday(userId);
    },

    // Matches
    match: async (_: unknown, { id }: { id: string }, context: Context) => {
      const userId = requireAuth(context);
      return matchService.getById(id, userId);
    },

    matches: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await matchService.getUserMatches(userId, { page, limit });
      return { items: result.items, pageInfo: result.meta };
    },

    matchStats: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return matchService.getStats(userId);
    },

    // Chat
    conversations: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await chatService.getUserConversations(userId, { page, limit });
      return { items: result.items, pageInfo: result.meta };
    },

    messages: async (
      _: unknown,
      { conversationId, page = 1, limit = 50 }: { conversationId: string; page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await chatService.getMessages(conversationId, userId, { page, limit });
      return result.items;
    },

    unreadMessagesCount: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return chatService.getUnreadCount(userId);
    },

    // Notifications
    notifications: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await notificationService.getUserNotifications(userId, { page, limit });
      return { items: result.items, pageInfo: result.meta };
    },

    unreadNotificationsCount: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      return notificationService.getUnreadCount(userId);
    },

    // Events
    event: async (_: unknown, { id }: { id: string }) => {
      return eventService.getById(id);
    },

    upcomingEvents: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number }
    ) => {
      const result = await eventService.getUpcoming({ page, limit });
      return { items: result.items, pageInfo: result.meta };
    },

    nearbyEvents: async (
      _: unknown,
      { location, radius = 50, page = 1, limit = 20 }: {
        location: { latitude: number; longitude: number };
        radius?: number;
        page?: number;
        limit?: number;
      }
    ) => {
      const result = await eventService.getNearby(
        location.latitude,
        location.longitude,
        radius,
        { page, limit }
      );
      return { items: result.items, pageInfo: result.meta };
    },

    myEvents: async (
      _: unknown,
      { page = 1, limit = 20 }: { page?: number; limit?: number },
      context: Context
    ) => {
      const userId = requireAuth(context);
      const result = await eventService.getUserEvents(userId, { page, limit });
      return { items: result.items, pageInfo: result.meta };
    },
  },

  // ============== MUTATIONS ==============
  Mutation: {
    // Auth
    register: async (_: unknown, { input }: { input: Record<string, string> }) => {
      const result = await authService.register(input as never);
      return {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      };
    },

    login: async (_: unknown, { input }: { input: { email: string; password: string } }) => {
      const result = await authService.login(input.email, input.password);
      return {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      };
    },

    refreshTokens: async (_: unknown, { refreshToken }: { refreshToken: string }) => {
      return authService.refreshTokens(refreshToken);
    },

    logout: async (_: unknown, { refreshToken }: { refreshToken: string }) => {
      await authService.logout(refreshToken);
      return true;
    },

    logoutAll: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      await authService.logoutAll(userId);
      return true;
    },

    changePassword: async (
      _: unknown,
      { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      await authService.changePassword(userId, currentPassword, newPassword);
      return true;
    },

    // Users
    updateUser: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return userService.update(userId, input as never);
    },

    updateProfile: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return userService.updateProfile(userId, input as never);
    },

    updateLocation: async (
      _: unknown,
      { input }: { input: { latitude: number; longitude: number } },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return userService.updateLocation(userId, input.latitude, input.longitude);
    },

    deactivateAccount: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      await userService.deactivateAccount(userId);
      return true;
    },

    // Garments
    createGarment: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return garmentService.create(userId, input as never);
    },

    updateGarment: async (
      _: unknown,
      { id, input }: { id: string; input: Record<string, unknown> },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return garmentService.update(id, userId, input as never);
    },

    deleteGarment: async (_: unknown, { id }: { id: string }, context: Context) => {
      const userId = requireAuth(context);
      await garmentService.delete(id, userId);
      return true;
    },

    // Swipes
    swipe: async (
      _: unknown,
      { input }: { input: { garmentId: string; direction: 'LEFT' | 'RIGHT' } },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return swipeService.swipe(userId, input);
    },

    superLike: async (
      _: unknown,
      { input }: { input: { garmentId: string; message?: string } },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return superLikeService.send(userId, input.garmentId, input.message);
    },

    undoSwipe: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      await swipeService.undoLastSwipe(userId);
      return true;
    },

    // Matches
    updateMatchStatus: async (
      _: unknown,
      { matchId, status }: { matchId: string; status: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return matchService.updateStatus(matchId, userId, status);
    },

    proposeGarment: async (
      _: unknown,
      { matchId, garmentId }: { matchId: string; garmentId: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return matchService.proposeGarmentForMatch(matchId, userId, garmentId);
    },

    // Chat
    sendMessage: async (
      _: unknown,
      { conversationId, input }: { conversationId: string; input: Record<string, unknown> },
      context: Context
    ) => {
      const userId = requireAuth(context);
      return chatService.sendMessage(userId, { conversationId, ...input } as never);
    },

    markAsRead: async (
      _: unknown,
      { conversationId }: { conversationId: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      await chatService.markAsRead(conversationId, userId);
      return true;
    },

    // Notifications
    markNotificationAsRead: async (
      _: unknown,
      { id }: { id: string },
      context: Context
    ) => {
      const userId = requireAuth(context);
      await notificationService.markAsRead(id, userId);
      return true;
    },

    markAllNotificationsAsRead: async (_: unknown, __: unknown, context: Context) => {
      const userId = requireAuth(context);
      await notificationService.markAllAsRead(userId);
      return true;
    },

    deleteNotification: async (_: unknown, { id }: { id: string }, context: Context) => {
      const userId = requireAuth(context);
      await notificationService.delete(id, userId);
      return true;
    },

    // Events
    registerForEvent: async (_: unknown, { eventId }: { eventId: string }, context: Context) => {
      const userId = requireAuth(context);
      await eventService.register(eventId, userId);
      return eventService.getById(eventId);
    },

    unregisterFromEvent: async (_: unknown, { eventId }: { eventId: string }, context: Context) => {
      const userId = requireAuth(context);
      await eventService.unregister(eventId, userId);
      return true;
    },
  },

  // ============== TYPE RESOLVERS ==============
  User: {
    garments: async (
      parent: { id: string },
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }
    ) => {
      const result = await userService.getUserGarments(parent.id, {
        page: Math.floor(offset / limit) + 1,
        limit,
      });
      return result.items;
    },

    garmentCount: async (parent: { id: string }) => {
      return prisma.garment.count({
        where: { userId: parent.id, status: 'ACTIVE' },
      });
    },

    profile: async (parent: { id: string }) => {
      return prisma.userProfile.findUnique({
        where: { userId: parent.id },
      });
    },
  },

  Garment: {
    user: async (parent: { userId: string }) => {
      return prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },

    images: async (parent: { id: string }) => {
      return prisma.garmentImage.findMany({
        where: { garmentId: parent.id },
        orderBy: { order: 'asc' },
      });
    },

    similar: async (parent: { id: string }, { limit = 5 }: { limit?: number }) => {
      return garmentService.getSimilar(parent.id, limit);
    },
  },

  Match: {
    user1: async (parent: { user1Id: string }) => {
      return prisma.user.findUnique({ where: { id: parent.user1Id } });
    },

    user2: async (parent: { user2Id: string }) => {
      return prisma.user.findUnique({ where: { id: parent.user2Id } });
    },

    garment1: async (parent: { garment1Id: string }) => {
      return prisma.garment.findUnique({ where: { id: parent.garment1Id } });
    },

    garment2: async (parent: { garment2Id?: string }) => {
      if (!parent.garment2Id) return null;
      return prisma.garment.findUnique({ where: { id: parent.garment2Id } });
    },

    conversation: async (parent: { id: string }) => {
      return prisma.conversation.findUnique({ where: { matchId: parent.id } });
    },

    otherUser: async (
      parent: { user1Id: string; user2Id: string },
      _: unknown,
      context: Context
    ) => {
      const userId = context.userId;
      const otherUserId = parent.user1Id === userId ? parent.user2Id : parent.user1Id;
      return prisma.user.findUnique({ where: { id: otherUserId } });
    },
  },

  Conversation: {
    match: async (parent: { matchId: string }) => {
      return prisma.match.findUnique({ where: { id: parent.matchId } });
    },

    messages: async (
      parent: { id: string },
      { limit = 50, offset = 0 }: { limit?: number; offset?: number }
    ) => {
      return prisma.message.findMany({
        where: { conversationId: parent.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    },

    unreadCount: async (parent: { id: string }, _: unknown, context: Context) => {
      if (!context.userId) return 0;
      return prisma.message.count({
        where: {
          conversationId: parent.id,
          senderId: { not: context.userId },
          isRead: false,
        },
      });
    },
  },

  Message: {
    sender: async (parent: { senderId: string }) => {
      return prisma.user.findUnique({ where: { id: parent.senderId } });
    },
  },

  SuperLike: {
    giver: async (parent: { giverId: string }) => {
      return prisma.user.findUnique({ where: { id: parent.giverId } });
    },

    garment: async (parent: { garmentId: string }) => {
      return prisma.garment.findUnique({ where: { id: parent.garmentId } });
    },
  },

  Swipe: {
    garment: async (parent: { garmentId: string }) => {
      return prisma.garment.findUnique({ where: { id: parent.garmentId } });
    },
  },

  Event: {
    isRegistered: async (parent: { id: string }, _: unknown, context: Context) => {
      if (!context.userId) return false;
      const participant = await prisma.eventParticipant.findUnique({
        where: {
          eventId_userId: { eventId: parent.id, userId: context.userId },
        },
      });
      return !!participant;
    },
  },

  // Scalar resolvers
  DateTime: {
    __serialize: (value: Date) => value.toISOString(),
    __parseValue: (value: string) => new Date(value),
    __parseLiteral: (ast: { kind: string; value: string }) => {
      if (ast.kind === 'StringValue') {
        return new Date(ast.value);
      }
      return null;
    },
  },
};
