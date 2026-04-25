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

// OIDC environment variables (all optional — set all to enable OIDC)
const OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL;
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
const OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;
const OIDC_USERNAME_CLAIM = process.env.OIDC_USERNAME_CLAIM || 'preferred_username';

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

// Validate OIDC configuration — all or nothing
const oidcVars = [OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI, FRONTEND_URL];
const oidcPartiallyConfigured = oidcVars.some(Boolean);
const oidcFullyConfigured = oidcVars.every(v => !!v);

if (oidcPartiallyConfigured && !oidcFullyConfigured) {
  console.error('OIDC is partially configured. All of these must be set together:');
  console.error('  OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI, FRONTEND_URL');
  process.exit(1);
}

if (oidcFullyConfigured) {
  console.log('OIDC authentication enabled. Password login is disabled.');
  console.log(`  Issuer: ${OIDC_ISSUER_URL}`);
  console.log(`  Client ID: ${OIDC_CLIENT_ID}`);
  console.log(`  Redirect URI: ${OIDC_REDIRECT_URI}`);
  console.log(`  Frontend URL: ${FRONTEND_URL}`);
  console.log(`  Username claim: ${OIDC_USERNAME_CLAIM}`);
}

// Compute allowed CORS origins once at startup
function buildCorsOrigins(): string[] {
  const origins: string[] = [];
  if (NODE_ENV === 'production') {
    origins.push(PRODUCTION_ORIGIN);
  } else {
    origins.push(...DEVELOPMENT_ORIGINS);
  }
  // Add FRONTEND_URL if configured (for OIDC setups where frontend URL may differ)
  if (FRONTEND_URL && !origins.includes(FRONTEND_URL)) {
    origins.push(FRONTEND_URL);
  }
  return origins;
}

const ALLOWED_ORIGINS = buildCorsOrigins();
console.log(`CORS: Allowing origins: ${ALLOWED_ORIGINS.join(', ')}`);

// Helper function to set CORS headers
function setCorsHeaders(request: any, reply: any) {
  const origin = request.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

// Register plugins
// CORS plugin - handles preflight OPTIONS and sets headers
await fastify.register(cors, {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
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

// Ensure CORS headers are set on all responses (including errors)
// This runs after the CORS plugin, so it ensures headers are always present
fastify.addHook('onSend', async (request, reply) => {
  setCorsHeaders(request, reply);
});

// Decorate fastify with config
fastify.decorate('config', {
  jellyfinServerUrl: JELLYFIN_SERVER_URL,
  jellyfinApiKey: JELLYFIN_API_KEY,
  ...(oidcFullyConfigured && {
    oidc: {
      issuerUrl: OIDC_ISSUER_URL!,
      clientId: OIDC_CLIENT_ID!,
      clientSecret: OIDC_CLIENT_SECRET!,
      redirectUri: OIDC_REDIRECT_URI!,
      frontendUrl: FRONTEND_URL!,
      usernameClaim: OIDC_USERNAME_CLAIM,
    },
  }),
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
