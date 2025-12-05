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

// Register plugins
// CORS configuration: When credentials are enabled, we must echo back the exact origin
// (not use '*'), but only if it's in our allowed list. The plugin handles this automatically.
await fastify.register(cors, {
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins();
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // Only allow origins from our whitelist
    if (allowedOrigins.includes(origin)) {
      // Plugin will automatically set Access-Control-Allow-Origin to this exact origin
      callback(null, true);
    } else {
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

// Add hook to ensure CORS headers are set on error responses
// The CORS plugin handles normal responses, but errors might bypass it
fastify.addHook('onSend', async (request, reply) => {
  const origin = request.headers.origin;
  const allowedOrigins = getCorsOrigins();
  
  // Only set CORS headers if origin is in our allowed list
  // This ensures we never echo back an unauthorized origin
  if (origin && allowedOrigins.includes(origin)) {
    // Set the exact origin (required when credentials: true)
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
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
