import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createApp, addErrorHandlers } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { typeDefs } from './graphql/typeDefs/index.js';
import { resolvers } from './graphql/resolvers/index.js';
import { initializeSocketServer } from './sockets/index.js';
import { verifyAccessToken } from './utils/jwt.js';
import express from 'express';
import cors from 'cors';

interface Context {
  userId?: string;
}

async function bootstrap() {
  // Connect to database
  await connectDatabase();

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.io
  const io = initializeSocketServer(httpServer);

  // Make io available to the app
  app.set('io', io);

  // Create Apollo Server
  const apolloServer = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      // Log errors in development
      if (config.isDev) {
        console.error('GraphQL Error:', error);
      }

      // Don't expose internal errors in production
      if (config.isProd && formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }

      return formattedError;
    },
  });

  // Start Apollo Server
  await apolloServer.start();

  // Apply Apollo middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: config.cors.origin,
      credentials: true,
    }),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<Context> => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {};
        }

        try {
          const token = authHeader.substring(7);
          const payload = verifyAccessToken(token);
          return { userId: payload.userId };
        } catch {
          return {};
        }
      },
    })
  );

  // Add error handlers after Apollo middleware
  addErrorHandlers(app);

  // Create uploads directory if it doesn't exist
  const fs = await import('fs');
  if (!fs.existsSync(config.upload.path)) {
    fs.mkdirSync(config.upload.path, { recursive: true });
  }

  // Start server
  httpServer.listen(config.port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    SwapStyle API Server                     ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${config.port.toString().padEnd(28)}║
║  📡 REST API:    http://localhost:${config.port}/api/${config.apiVersion.padEnd(16)}║
║  🔮 GraphQL:     http://localhost:${config.port}/graphql${' '.repeat(16)}║
║  🔌 WebSocket:   ws://localhost:${config.port}${' '.repeat(21)}║
║  🌍 Environment: ${config.env.padEnd(36)}║
╚════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    httpServer.close(async () => {
      console.log('HTTP server closed');

      // Close Apollo Server
      await apolloServer.stop();
      console.log('Apollo Server stopped');

      // Close Socket.io
      io.close(() => {
        console.log('Socket.io closed');
      });

      // Disconnect database
      await disconnectDatabase();
      console.log('Database disconnected');

      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
