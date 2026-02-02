import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpirationDate,
} from '../utils/jwt.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import type { CreateUserInput } from '../types/index.js';

const SALT_ROUNDS = 12;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
  tokens: AuthTokens;
}

export class AuthService {
  async register(input: CreateUserInput): Promise<AuthResult> {
    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username.toLowerCase() },
    });

    if (existingUsername) {
      throw new ConflictError('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        username: input.username.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        profile: {
          create: {
            preferredStyles: [],
            preferredSizes: [],
            preferredBrands: [],
            preferredColors: [],
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isVerified: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        password: true,
        isVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    const { password: _, isActive: __, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Delete old refresh token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    return this.generateTokens(payload.userId, payload.email);
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new BadRequestError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await this.logoutAll(userId);
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = generateAccessToken({ userId, email });
    const refreshToken = generateRefreshToken({ userId, email });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: getTokenExpirationDate(config.jwt.refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
