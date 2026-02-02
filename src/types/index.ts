import type { Request } from 'express';
import type { User } from '@prisma/client';

// ============== AUTH TYPES ==============

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

// ============== API RESPONSE TYPES ==============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============== SERVICE TYPES ==============

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============== USER TYPES ==============

export interface CreateUserInput {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
}

export interface UserProfileInput {
  preferredStyles?: string[];
  preferredSizes?: string[];
  preferredBrands?: string[];
  preferredColors?: string[];
  topSize?: string;
  bottomSize?: string;
  shoeSize?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  maxDistance?: number;
}

// ============== GARMENT TYPES ==============

export interface CreateGarmentInput {
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  size: string;
  color: string;
  condition: string;
  originalPrice?: number;
  tags?: string[];
}

export interface UpdateGarmentInput {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  size?: string;
  color?: string;
  condition?: string;
  originalPrice?: number;
  status?: string;
  tags?: string[];
}

export interface GarmentFilters {
  category?: string;
  size?: string;
  color?: string;
  condition?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  userId?: string;
  status?: string;
}

// ============== SWIPE TYPES ==============

export interface SwipeInput {
  garmentId: string;
  direction: 'LEFT' | 'RIGHT';
}

export interface SwipeResult {
  swipe: { id: string };
  isMatch: boolean;
  match?: { id: string };
}

// ============== MATCH TYPES ==============

export interface MatchWithDetails {
  id: string;
  user1Id: string;
  user2Id: string;
  garment1Id: string;
  garment2Id: string | null;
  status: string;
  otherUser: {
    id: string;
    username: string;
    avatar: string | null;
  };
  garments: Array<{
    id: string;
    title: string;
    images: Array<{ url: string }>;
  }>;
  conversation: {
    id: string;
    lastMessageAt: Date | null;
  } | null;
  createdAt: Date;
}

// ============== CHAT TYPES ==============

export interface SendMessageInput {
  conversationId: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'GARMENT_OFFER' | 'LOCATION' | 'SYSTEM';
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
  sender: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

// ============== EVENT TYPES ==============

export interface CreateEventInput {
  title: string;
  description: string;
  type: string;
  startTime: Date;
  endTime: Date;
  isVirtual?: boolean;
  address?: string;
  latitude?: number;
  longitude?: number;
  meetingUrl?: string;
  maxParticipants?: number;
  imageUrl?: string;
}

// ============== SOCKET TYPES ==============

export interface SocketUser {
  id: string;
  socketId: string;
  userId: string;
}

export interface TypingData {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

// ============== FUTURE: AI/ML TYPES ==============

export interface StyleVector {
  dimensions: number[];
  version: string;
}

export interface MatchScore {
  userId: string;
  garmentId: string;
  score: number;
  factors: {
    styleCompatibility: number;
    sizeMatch: number;
    brandPreference: number;
    locationProximity: number;
  };
}

// ============== FUTURE: BLOCKCHAIN TYPES ==============

export interface ReputationData {
  walletAddress: string;
  score: number;
  completedSwaps: number;
  verifiedAt: Date;
}
