import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { createSession, deleteSession, getSession } from '../session-store.js';
import type { JwtPayload } from '../types.js';
import '../types.js'; // Import for side effects (module augmentation)
import { buildAuthorizationUrl, exchangeCodeForTokens } from '../services/oidc.js';
import { findJellyfinUserByName } from '../services/jellyfin.js';

interface LoginBody {
  username: string;
  password: string;
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
      // Build the full callback URL from the request (supports reverse proxies)
      const protocol = (request.headers['x-forwarded-proto'] as string) || 'http';
      const host = (request.headers['x-forwarded-host'] as string) || request.headers.host;
      const callbackUrl = `${protocol}://${host}${request.url}`;

      fastify.log.info('[OIDC] Callback received, exchanging code for tokens');

      const { claims } = await exchangeCodeForTokens(oidcConfig, callbackUrl);

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

      return reply.redirect(`${oidcConfig.frontendUrl}/configure?token=${token}`);
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
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply.status(400).send({ error: 'Username and password are required' });
      }

      // When OIDC is enabled, password login is disabled
      if (fastify.config.oidc) {
        return reply.status(403).send({ error: 'Password login is disabled. Use SSO to authenticate.' });
      }

      try {
        // Authenticate with Jellyfin
        const authResponse = await fetch(
          `${fastify.config.jellyfinServerUrl}/Users/AuthenticateByName`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Authorization': `MediaBrowser Client="Jellyfin-Wrapped-Backend", Device="Server", DeviceId="jellyfin-wrapped-backend", Version="1.0.0"`,
            },
            body: JSON.stringify({
              Username: username,
              Pw: password,
            }),
          }
        );

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          fastify.log.warn(`Jellyfin auth failed for user ${username}: ${authResponse.status} ${errorText}`);
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

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


