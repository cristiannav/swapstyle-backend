import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import type { CreateEventInput, PaginationParams } from '../types/index.js';
import { createPaginationMeta } from '../utils/response.js';

export class EventService {
  async create(data: CreateEventInput) {
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as never,
        startTime: data.startTime,
        endTime: data.endTime,
        isVirtual: data.isVirtual || false,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        meetingUrl: data.meetingUrl,
        maxParticipants: data.maxParticipants,
        imageUrl: data.imageUrl,
      },
    });

    return event;
  }

  async getById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return {
      ...event,
      participantCount: event._count.participants,
      spotsRemaining: event.maxParticipants
        ? event.maxParticipants - event._count.participants
        : null,
    };
  }

  async getUpcoming(pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const now = new Date();

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: {
          startTime: { gte: now },
          status: { in: ['UPCOMING', 'ACTIVE'] },
        },
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          _count: {
            select: { participants: true },
          },
        },
      }),
      prisma.event.count({
        where: {
          startTime: { gte: now },
          status: { in: ['UPCOMING', 'ACTIVE'] },
        },
      }),
    ]);

    const transformed = events.map((event) => ({
      ...event,
      participantCount: event._count.participants,
      spotsRemaining: event.maxParticipants
        ? event.maxParticipants - event._count.participants
        : null,
      _count: undefined,
    }));

    return {
      items: transformed,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async register(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.status === 'CANCELLED') {
      throw new BadRequestError('This event has been cancelled');
    }

    if (event.status === 'COMPLETED') {
      throw new BadRequestError('This event has already ended');
    }

    if (event.startTime < new Date()) {
      throw new BadRequestError('This event has already started');
    }

    if (event.maxParticipants && event._count.participants >= event.maxParticipants) {
      throw new BadRequestError('This event is full');
    }

    // Check if already registered
    const existing = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (existing) {
      throw new ConflictError('Already registered for this event');
    }

    const participant = await prisma.eventParticipant.create({
      data: {
        eventId,
        userId,
        status: 'REGISTERED',
      },
      include: {
        event: {
          select: {
            title: true,
            startTime: true,
          },
        },
      },
    });

    return participant;
  }

  async unregister(eventId: string, userId: string) {
    const participant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!participant) {
      throw new NotFoundError('Registration not found');
    }

    await prisma.eventParticipant.delete({
      where: { id: participant.id },
    });
  }

  async getUserEvents(userId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [participations, total] = await Promise.all([
      prisma.eventParticipant.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { event: { startTime: 'asc' } },
        include: {
          event: true,
        },
      }),
      prisma.eventParticipant.count({ where: { userId } }),
    ]);

    return {
      items: participations.map((p) => ({
        ...p.event,
        registrationStatus: p.status,
        registeredAt: p.joinedAt,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async updateStatus(eventId: string, status: string) {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { status: status as never },
    });

    return event;
  }

  async getNearby(latitude: number, longitude: number, radiusKm: number = 50, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Simple bounding box calculation
    // For more accurate results, use PostGIS extension
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lonDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

    const now = new Date();

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: {
          isVirtual: false,
          status: { in: ['UPCOMING', 'ACTIVE'] },
          startTime: { gte: now },
          latitude: {
            gte: latitude - latDelta,
            lte: latitude + latDelta,
          },
          longitude: {
            gte: longitude - lonDelta,
            lte: longitude + lonDelta,
          },
        },
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          _count: { select: { participants: true } },
        },
      }),
      prisma.event.count({
        where: {
          isVirtual: false,
          status: { in: ['UPCOMING', 'ACTIVE'] },
          startTime: { gte: now },
          latitude: {
            gte: latitude - latDelta,
            lte: latitude + latDelta,
          },
          longitude: {
            gte: longitude - lonDelta,
            lte: longitude + lonDelta,
          },
        },
      }),
    ]);

    return {
      items: events.map((e) => ({
        ...e,
        participantCount: e._count.participants,
        _count: undefined,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }
}

export const eventService = new EventService();
