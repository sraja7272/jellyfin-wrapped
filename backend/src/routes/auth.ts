import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { createSession, deleteSession, getSession } from '../session-store.js';
import type { JwtPayload } from '../types.js';
import '../types.js'; // Import for side effects (module augmentation)
import { buildAuthorizationUrl, exchangeCodeForTokens } from '../services/oidc.js';
import { findJellyfinUserByName } from '../services/jellyfin.js';
import { loginIpLimiter, loginUserLimiter, oidcIpLimiter } from '../rate-limit.js';

interface LoginBody {
  username: string;
  password: string;
}

// Reject malformed bodies before they reach Jellyfin
const loginBodySchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 256 },
    password: { type: 'string', minLength: 1, maxLength: 1024 },
  },
} as const;

function sendRateLimited(reply: FastifyReply, retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return reply
    .header('Retry-After', String(retryAfterSeconds))
    .status(429)
    .send({ error: `Too many login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
}

export async function authRoutes(fastify: FastifyInstance) {
  // Auth config endpoint - tells the frontend whether OIDC is enabled (public)
  fastify.get('/config', async () => {
    return {
      oidcEnabled: !!fastify.config.oidc,
    };
  });

  // OIDC login - redirects user to the OIDC provider
  fastify.get('/oidc/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const oidcConfig = fastify.config.oidc;
    if (!oidcConfig) {
      return reply.status(404).send({ error: 'OIDC is not configured' });
    }

    const retryAfter = oidcIpLimiter.retryAfter(request.ip);
    if (retryAfter > 0) {
      fastify.log.warn(`[OIDC] Rate limited login initiation from ${request.ip}`);
      return sendRateLimited(reply, retryAfter);
    }
    oidcIpLimiter.hit(request.ip);

    try {
      const authUrl = await buildAuthorizationUrl(oidcConfig);
      return reply.redirect(authUrl);
    } catch (error) {
      fastify.log.error(error, 'Failed to build OIDC authorization URL');
      return reply.redirect(`${oidcConfig.frontendUrl}/configure?error=auth_failed`);
    }
  });

  // OIDC callback - handles the redirect back from the OIDC provider
  fastify.get('/oidc/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const oidcConfig = fastify.config.oidc;
    if (!oidcConfig) {
      return reply.status(404).send({ error: 'OIDC is not configured' });
    }

    try {
      // Rebuild the callback URL from the configured redirect URI plus the incoming query string.
      // This avoids trusting client-supplied X-Forwarded-* headers and guarantees the
      // redirect_uri sent to the token endpoint matches the one used to start the flow.
      const callbackUrl = new URL(oidcConfig.redirectUri);
      callbackUrl.search = new URL(request.url, 'http://localhost').search;

      fastify.log.info('[OIDC] Callback received, exchanging code for tokens');

      const { claims } = await exchangeCodeForTokens(oidcConfig, callbackUrl.href);

      fastify.log.info('[OIDC] Token exchange successful');

      // Extract username from configured claim
      const username = claims[oidcConfig.usernameClaim] as string | undefined;
      if (!username) {
        fastify.log.warn(
          `[OIDC] Claim "${oidcConfig.usernameClaim}" not found in ID token. Available claims: ${Object.keys(claims).join(', ')}`
        );
        return reply.redirect(
          `${oidcConfig.frontendUrl}/configure?error=missing_claim&claim=${encodeURIComponent(oidcConfig.usernameClaim)}`
        );
      }

      // Look up matching Jellyfin user
      const jellyfinUser = await findJellyfinUserByName(
        fastify.config.jellyfinServerUrl,
        fastify.config.jellyfinApiKey,
        username
      );

      if (!jellyfinUser) {
        fastify.log.warn(`[OIDC] No Jellyfin user found matching OIDC username: ${username}`);
        return reply.redirect(
          `${oidcConfig.frontendUrl}/configure?error=user_not_found&username=${encodeURIComponent(username)}`
        );
      }

      fastify.log.info(`[OIDC] Login successful for user: ${jellyfinUser.Name}`);

      // Create session using admin API key as jellyfinToken (no user password available)
      const jti = randomUUID();
      createSession(jti, {
        jellyfinUserId: jellyfinUser.Id,
        jellyfinToken: fastify.config.jellyfinApiKey,
        username: jellyfinUser.Name,
      });

      const token = fastify.jwt.sign(
        {
          jti,
          userId: jellyfinUser.Id,
          username: jellyfinUser.Name,
        } as JwtPayload,
        { expiresIn: '1h' }
      );

      // Token goes in the URL fragment: fragments are never sent to servers,
      // so the JWT stays out of reverse-proxy access logs and Referer headers.
      return reply.redirect(`${oidcConfig.frontendUrl}/configure#token=${encodeURIComponent(token)}`);
    } catch (error) {
      // Log the error type/code but not the full message to avoid leaking provider details
      const code = (error as Record<string, unknown>)?.code ?? 'UNKNOWN';
      fastify.log.error(`[OIDC] Callback failed (code: ${code})`);
      return reply.redirect(`${oidcConfig.frontendUrl}/configure?error=auth_failed`);
    }
  });

  // Login endpoint - validates credentials with Jellyfin and returns JWT
  fastify.post<{ Body: LoginBody }>(
    '/login',
    { schema: { body: loginBodySchema } },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { username, password } = request.body;
      const trimmedUsername = username?.trim();

      if (!trimmedUsername || !password) {
        return reply.status(400).send({ error: 'Username and password are required' });
      }

      // When OIDC is enabled, password login is disabled
      if (fastify.config.oidc) {
        return reply.status(403).send({ error: 'Password login is disabled. Use SSO to authenticate.' });
      }

      const normalizedUser = trimmedUsername.toLowerCase();
      const ipRetry = loginIpLimiter.retryAfter(request.ip);
      const userRetry = loginUserLimiter.retryAfter(normalizedUser);
      const retryAfter = Math.max(ipRetry, userRetry);
      if (retryAfter > 0) {
        fastify.log.warn(
          { ip: request.ip, username: trimmedUsername },
          'Rate limited login attempt'
        );
        return sendRateLimited(reply, retryAfter);
      }

      loginIpLimiter.hit(request.ip);

      try {
        // Authenticate with Jellyfin
        const authResponse = await fetch(
          `${fastify.config.jellyfinServerUrl}/Users/AuthenticateByName`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `MediaBrowser Client="Jellyfin-Wrapped-Backend", Device="Server", DeviceId="jellyfin-wrapped-backend", Version="1.0.0"`,
              'X-Emby-Authorization': `MediaBrowser Client="Jellyfin-Wrapped-Backend", Device="Server", DeviceId="jellyfin-wrapped-backend", Version="1.0.0"`,
            },
            body: JSON.stringify({
              Username: trimmedUsername,
              Pw: password,
            }),
          }
        );

        if (!authResponse.ok) {
          loginUserLimiter.hit(normalizedUser);
          fastify.log.warn(
            { ip: request.ip, username: trimmedUsername, status: authResponse.status },
            'Jellyfin authentication failed'
          );
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        loginUserLimiter.reset(normalizedUser);

        const authData = await authResponse.json() as {
          User: { Id: string; Name: string };
          AccessToken: string;
        };

        // Generate unique token ID for session tracking
        const jti = randomUUID();

        // Store session in memory
        createSession(jti, {
          jellyfinUserId: authData.User.Id,
          jellyfinToken: authData.AccessToken,
          username: authData.User.Name,
        });

        // Create JWT
        const token = fastify.jwt.sign(
          {
            jti,
            userId: authData.User.Id,
            username: authData.User.Name,
          } as JwtPayload,
          { expiresIn: '1h' }
        );

        return {
          token,
          user: {
            id: authData.User.Id,
            name: authData.User.Name,
          },
        };
      } catch (error) {
        fastify.log.error(error, 'Error during authentication');
        return reply.status(500).send({ error: 'Authentication failed' });
      }
    }
  );

  // Logout endpoint - invalidates JWT session
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as JwtPayload;

      if (payload.jti) {
        deleteSession(payload.jti);
      }

      return { success: true };
    } catch {
      // Even if token is invalid, return success (user is effectively logged out)
      return { success: true };
    }
  });

  // Verify endpoint - checks if current token is valid
  fastify.get('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as JwtPayload;

      // Check if session still exists in memory
      const session = getSession(payload.jti);
      if (!session) {
        return reply.status(401).send({ error: 'Session expired' });
      }

      return {
        valid: true,
        user: {
          id: payload.userId,
          name: payload.username,
        },
      };
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}


