import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { dataRoutes } from './routes/data.js';

const fastify = Fastify({
  logger: true,
});

// Environment variables
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET;
const JELLYFIN_SERVER_URL = process.env.JELLYFIN_SERVER_URL;
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS allowed origins based on environment
const PRODUCTION_ORIGIN = 'https://wrapped.raja-house.com';
const DEVELOPMENT_ORIGINS = [PRODUCTION_ORIGIN, 'http://localhost:5173'];

if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  console.error('Generate one with: openssl rand -base64 32');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('JWT_SECRET should be at least 32 characters long for security');
  process.exit(1);
}

if (!JELLYFIN_SERVER_URL) {
  console.error('JELLYFIN_SERVER_URL environment variable is required');
  process.exit(1);
}

if (!JELLYFIN_API_KEY) {
  console.error('JELLYFIN_API_KEY environment variable is required');
  process.exit(1);
}

// Get CORS origins based on NODE_ENV
function getCorsOrigins(): string[] {
  if (NODE_ENV === 'production') {
    console.log(`CORS: Production mode - allowing only ${PRODUCTION_ORIGIN}`);
    return [PRODUCTION_ORIGIN];
  } else {
    console.log(`CORS: Development mode - allowing ${DEVELOPMENT_ORIGINS.join(', ')}`);
    return DEVELOPMENT_ORIGINS;
  }
}

// Helper function to set CORS headers
function setCorsHeaders(request: any, reply: any) {
  const origin = request.headers.origin;
  const allowedOrigins = getCorsOrigins();
  
  // Log for debugging
  console.log(`[CORS] Request origin: ${origin}, Allowed origins: ${allowedOrigins.join(', ')}, NODE_ENV: ${NODE_ENV}`);
  
  // Only set CORS headers if origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    console.log(`[CORS] Headers set for origin: ${origin}`);
  } else if (origin) {
    console.warn(`[CORS] Origin ${origin} not in allowed list: ${allowedOrigins.join(', ')}`);
  }
}

// Register plugins
// CORS plugin - handles preflight OPTIONS and sets headers
await fastify.register(cors, {
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins();
    console.log(`[CORS Plugin] Checking origin: ${origin}, Allowed: ${allowedOrigins.join(', ')}, NODE_ENV: ${NODE_ENV}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log(`[CORS Plugin] No origin, allowing request`);
      return callback(null, true);
    }
    // Only allow origins from our whitelist
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS Plugin] Origin ${origin} is allowed`);
      callback(null, true);
    } else {
      console.warn(`[CORS Plugin] Origin ${origin} NOT allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
});

await fastify.register(jwt, {
  secret: JWT_SECRET,
});

// Ensure CORS headers are set on all responses (including errors)
// This runs after the CORS plugin, so it ensures headers are always present
fastify.addHook('onSend', async (request, reply) => {
  setCorsHeaders(request, reply);
});

// Decorate fastify with config
fastify.decorate('config', {
  jellyfinServerUrl: JELLYFIN_SERVER_URL,
  jellyfinApiKey: JELLYFIN_API_KEY,
});

// Register routes
await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(dataRoutes, { prefix: '/api' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`Server listening on ${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
