import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler, globalRateLimiter } from './middlewares/index.js';

export function createApp() {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Logging
  if (config.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting
  app.use(globalRateLimiter);

  // Static files (uploads)
  app.use('/uploads', express.static(config.upload.path));

  // API routes
  app.use(`/api/${config.apiVersion}`, routes);

  // Note: Error handlers are added in server.ts after Apollo middleware

  return app;
}

export function addErrorHandlers(app: express.Express) {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
