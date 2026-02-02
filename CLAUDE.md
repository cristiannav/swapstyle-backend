# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build && npm run start

# Database operations
npm run db:push          # Push schema changes to PostgreSQL
npm run db:seed          # Seed with test data
npm run db:generate      # Regenerate Prisma client
npm run db:migrate       # Run migrations (interactive)

# Code quality
npm run lint
npm run test
```

## Architecture Overview

SwapStyle is a multi-protocol backend for a clothing exchange matching app (Tinder-style swipes for garments).

### Protocol Stack
- **REST API**: `/api/v1/*` - Traditional CRUD operations with express-validator
- **GraphQL**: `/graphql` - Flexible queries with Apollo Server, includes subscriptions
- **WebSocket**: Socket.io for real-time chat, typing indicators, notifications
- **gRPC**: Prepared clients for future AI/Vision microservices

### Request Flow
```
Request → Middleware (auth, validation, rate-limit) → Controller → Service → Prisma → PostgreSQL
```

### Key Directories
- `src/services/` - Business logic (auth, swipe, match, chat, etc.)
- `src/controllers/` - HTTP handlers that delegate to services
- `src/routes/` - Express routes with validation chains
- `src/graphql/` - Schema in `typeDefs/`, resolvers in `resolvers/`
- `src/sockets/` - Socket.io event handlers and room management
- `src/grpc/protos/` - Proto definitions for matching, vision, reputation services
- `prisma/schema.prisma` - Database models

### Authentication Pattern
- JWT access tokens (7d) + refresh tokens (30d) stored in database
- `authenticate` middleware enriches `req.user` and `req.userId`
- GraphQL context extracts `userId` from Bearer token
- Socket.io authenticates via handshake token

### Error Handling
Custom error classes in `src/utils/errors.ts`: `BadRequestError`, `UnauthorizedError`, `NotFoundError`, `ValidationError`, etc. All extend `AppError` with `statusCode` and `code`.

### Path Aliases
TypeScript paths configured: `@config/*`, `@services/*`, `@controllers/*`, `@middlewares/*`, `@routes/*`, `@utils/*`, `@types/*`

## Domain Model

Core entities: User → Garment → Swipe → Match → Conversation → Message

- **Swipe RIGHT** on garment creates potential match
- **Match** occurs when both users swipe right on each other's garments
- **Match** automatically creates a **Conversation** for negotiation
- **SuperLike** has daily limit (5/day) and notifies garment owner

## Environment Setup

Requires PostgreSQL and Redis (optional). Use `docker compose up -d postgres redis` for local dev.

Key env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`

## Test Users (after seeding)

- `maria@example.com` / `Test123!`
- `carlos@example.com` / `Test123!`
- `lucia@example.com` / `Test123!`
