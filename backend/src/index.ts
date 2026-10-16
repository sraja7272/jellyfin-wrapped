import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { dataRoutes } from './routes/data.js';

// Environment variables
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET;
const JELLYFIN_SERVER_URL = process.env.JELLYFIN_SERVER_URL;
const JELLYFIN_PUBLIC_URL = process.env.JELLYFIN_PUBLIC_URL;
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';
const TRUST_PROXY = process.env.TRUST_PROXY !== 'false';

const fastify = Fastify({
  logger: {
    redact: ['req.headers.authorization'],
  },
  trustProxy: TRUST_PROXY,
  bodyLimit: 64 * 1024, // 64 KiB max request body
});

// OIDC environment variables (all optional — set all to enable OIDC)
const OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL;
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
const OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;
const OIDC_USERNAME_CLAIM = process.env.OIDC_USERNAME_CLAIM || 'preferred_username';

// CORS: comma-separated list of allowed origins (use "*" to allow any origin)
const CORS_ORIGINS = process.env.CORS_ORIGINS;
// Extra origin allowed outside production (Vite dev server)
const DEV_ORIGIN = 'http://localhost:5173';

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

// Normalize an origin/URL: trim whitespace and trailing slashes
function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

// Resolve CORS policy once at startup.
// - CORS_ORIGINS: comma-separated allowlist ("*" allows any origin)
// - FRONTEND_URL: automatically added to the allowlist when set
// - If neither is set, any origin is allowed (reflected). This is safe for auth purposes
//   because the API uses Bearer JWTs, not cookies, but an allowlist is recommended in production.
const configuredOrigins = (CORS_ORIGINS ? CORS_ORIGINS.split(',') : [])
  .map(normalizeOrigin)
  .filter(Boolean);
if (FRONTEND_URL) {
  configuredOrigins.push(normalizeOrigin(FRONTEND_URL));
}

const ALLOW_ALL_ORIGINS = configuredOrigins.length === 0 || configuredOrigins.includes('*');
const ALLOWED_ORIGINS = Array.from(new Set(configuredOrigins.filter((o) => o !== '*')));
if (!ALLOW_ALL_ORIGINS && NODE_ENV !== 'production' && !ALLOWED_ORIGINS.includes(DEV_ORIGIN)) {
  ALLOWED_ORIGINS.push(DEV_ORIGIN);
}

if (ALLOW_ALL_ORIGINS) {
  console.log('CORS: Allowing all origins (set CORS_ORIGINS or FRONTEND_URL to restrict)');
} else {
  console.log(`CORS: Allowing origins: ${ALLOWED_ORIGINS.join(', ')}`);
}

function isOriginAllowed(origin: string): boolean {
  return ALLOW_ALL_ORIGINS || ALLOWED_ORIGINS.includes(normalizeOrigin(origin));
}

// Validate OIDC configuration — all or nothing.
// FRONTEND_URL is intentionally NOT part of this check; it is optional.
const oidcVars = [OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI];
const oidcPartiallyConfigured = oidcVars.some(Boolean);
const oidcFullyConfigured = oidcVars.every(v => !!v);

if (oidcPartiallyConfigured && !oidcFullyConfigured) {
  console.error('OIDC is partially configured. All of these must be set together:');
  console.error('  OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI');
  process.exit(1);
}

// Where to send the user after the OIDC callback. Prefer FRONTEND_URL, then the first
// explicit CORS origin, then the origin of OIDC_REDIRECT_URI (e.g. frontend and backend
// behind the same reverse proxy).
let resolvedFrontendUrl: string | undefined;
if (oidcFullyConfigured) {
  resolvedFrontendUrl =
    (FRONTEND_URL && normalizeOrigin(FRONTEND_URL)) ||
    ALLOWED_ORIGINS.find((o) => o !== DEV_ORIGIN) ||
    new URL(OIDC_REDIRECT_URI!).origin;

  console.log('OIDC authentication enabled. Password login is disabled.');
  console.log(`  Issuer: ${OIDC_ISSUER_URL}`);
  console.log(`  Client ID: ${OIDC_CLIENT_ID}`);
  console.log(`  Redirect URI: ${OIDC_REDIRECT_URI}`);
  console.log(`  Frontend URL: ${resolvedFrontendUrl}${FRONTEND_URL ? '' : ' (derived; set FRONTEND_URL to override)'}`);
  console.log(`  Username claim: ${OIDC_USERNAME_CLAIM}`);
}

// Helper function to set CORS headers
function setCorsHeaders(request: any, reply: any) {
  const origin = request.headers.origin;
  if (origin && isOriginAllowed(origin)) {
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
    if (isOriginAllowed(origin)) {
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

// Ensure CORS and security headers are set on all responses (including errors)
fastify.addHook('onSend', async (request, reply) => {
  setCorsHeaders(request, reply);
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
});

const normalizedJellyfinServerUrl = normalizeOrigin(JELLYFIN_SERVER_URL);
const normalizedJellyfinPublicUrl = JELLYFIN_PUBLIC_URL
  ? normalizeOrigin(JELLYFIN_PUBLIC_URL)
  : normalizedJellyfinServerUrl;

// Decorate fastify with config
fastify.decorate('config', {
  jellyfinServerUrl: normalizedJellyfinServerUrl,
  jellyfinPublicUrl: normalizedJellyfinPublicUrl,
  jellyfinApiKey: JELLYFIN_API_KEY,
  ...(oidcFullyConfigured && {
    oidc: {
      issuerUrl: OIDC_ISSUER_URL!,
      clientId: OIDC_CLIENT_ID!,
      clientSecret: OIDC_CLIENT_SECRET!,
      redirectUri: OIDC_REDIRECT_URI!,
      frontendUrl: resolvedFrontendUrl!,
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
