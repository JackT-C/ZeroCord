import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import next from 'next';
import { parse } from 'url';

// Routes
import authRoutes from './server/routes/auth';
import userRoutes from './server/routes/users';
import friendRoutes from './server/routes/friends';
import serverRoutes from './server/routes/servers';
import channelRoutes from './server/routes/channels';
import messageRoutes from './server/routes/messages';
import dmRoutes from './server/routes/dm';

// Socket handlers
import { initializeSocketHandlers } from './server/socket/index';

dotenv.config();

// Heroku Postgres provides DATABASE_URL starting with 'postgres://'
// Prisma requires 'postgresql://' - fix it at runtime
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres://')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('postgres://', 'postgresql://');
  // Add SSL no-verify for Heroku Postgres self-signed certs
  if (!process.env.DATABASE_URL.includes('sslmode')) {
    process.env.DATABASE_URL += '?sslmode=no-verify';
  }
}

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

nextApp.prepare().then(() => {
  const app: Application = express();
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // allow all in production (Heroku handles SSL termination)
        }
      },
      credentials: true,
    },
  });

  // Middleware
  app.set('trust proxy', 1); // Required for Heroku (sits behind a proxy)
  app.use(cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/servers', serverRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/dm', dmRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize Socket.IO handlers
  initializeSocketHandlers(io);

  // Let Next.js handle everything else
  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const PORT = parseInt(process.env.PORT || '3001', 10);

  httpServer.listen(PORT, () => {
    console.log(`> Server running on port ${PORT} (${dev ? 'development' : 'production'})`);
  });
});
