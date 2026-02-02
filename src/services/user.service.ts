import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import type { UpdateUserInput, UserProfileInput, PaginationParams } from '../types/index.js';
import { createPaginationMeta } from '../utils/response.js';

export class UserService {
  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isVerified: true,
        reputationScore: true,
        createdAt: true,
        profile: {
          select: {
            preferredStyles: true,
            preferredSizes: true,
            preferredBrands: true,
            preferredColors: true,
            topSize: true,
            bottomSize: true,
            shoeSize: true,
            city: true,
            country: true,
          },
        },
        _count: {
          select: {
            garments: true,
            matchesAsUser1: true,
            matchesAsUser2: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      ...user,
      stats: {
        garments: user._count.garments,
        matches: user._count.matchesAsUser1 + user._count.matchesAsUser2,
      },
      _count: undefined,
    };
  }

  async getByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isVerified: true,
        reputationScore: true,
        createdAt: true,
        profile: {
          select: {
            preferredStyles: true,
            city: true,
            country: true,
          },
        },
        _count: {
          select: {
            garments: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      ...user,
      garmentCount: user._count.garments,
      _count: undefined,
    };
  }

  async update(id: string, data: UpdateUserInput) {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        phone: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateProfile(userId: string, data: UserProfileInput) {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
        preferredStyles: data.preferredStyles || [],
        preferredSizes: data.preferredSizes || [],
        preferredBrands: data.preferredBrands || [],
        preferredColors: data.preferredColors || [],
      },
      select: {
        id: true,
        preferredStyles: true,
        preferredSizes: true,
        preferredBrands: true,
        preferredColors: true,
        topSize: true,
        bottomSize: true,
        shoeSize: true,
        city: true,
        country: true,
        maxDistance: true,
        updatedAt: true,
      },
    });

    return profile;
  }

  async getProfile(userId: string) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return profile;
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: { latitude, longitude },
    });

    return profile;
  }

  async getUserGarments(userId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [garments, total] = await Promise.all([
      prisma.garment.findMany({
        where: { userId, status: 'ACTIVE' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      prisma.garment.count({
        where: { userId, status: 'ACTIVE' },
      }),
    ]);

    return {
      items: garments,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async deactivateAccount(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Deactivate all garments
    await prisma.garment.updateMany({
      where: { userId },
      data: { status: 'INACTIVE' },
    });

    // Delete all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async searchUsers(query: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isVerified: true,
        },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      items: users,
      meta: createPaginationMeta(total, page, limit),
    };
  }
}

export const userService = new UserService();
