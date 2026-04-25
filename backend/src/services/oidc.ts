import * as client from 'openid-client';
import { randomUUID } from 'crypto';
import type { OidcConfig } from '../types.js';

// --- State Store (prevents CSRF) ---
// Maps state string → { nonce, createdAt }
// States expire after 10 minutes and are single-use (deleted after validation)
const stateStore = new Map<string, { nonce: string; createdAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.createdAt > STATE_TTL_MS) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

// --- Discovery Cache ---
let cachedConfig: client.Configuration | null = null;
let cachedIssuerUrl: string | null = null;

// Discover OIDC provider (lazy, cached)
async function getOidcConfig(oidcConfig: OidcConfig): Promise<client.Configuration> {
  if (cachedConfig && cachedIssuerUrl === oidcConfig.issuerUrl) {
    return cachedConfig;
  }
  cachedConfig = await client.discovery(
    new URL(oidcConfig.issuerUrl),
    oidcConfig.clientId,
    oidcConfig.clientSecret
  );
  cachedIssuerUrl = oidcConfig.issuerUrl;
  return cachedConfig;
}

// Build the authorization URL that the user is redirected to
export async function buildAuthorizationUrl(oidcConfig: OidcConfig): Promise<string> {
  const config = await getOidcConfig(oidcConfig);

  const state = randomUUID();
  const nonce = randomUUID();

  stateStore.set(state, { nonce, createdAt: Date.now() });

  const parameters: Record<string, string> = {
    redirect_uri: oidcConfig.redirectUri,
    scope: 'openid profile email',
    state,
    nonce,
  };

  const redirectTo = client.buildAuthorizationUrl(config, parameters);
  return redirectTo.href;
}

// Exchange authorization code for tokens and return ID token claims
export async function exchangeCodeForTokens(
  oidcConfig: OidcConfig,
  callbackUrl: string
): Promise<{ claims: Record<string, unknown> }> {
  const config = await getOidcConfig(oidcConfig);

  const url = new URL(callbackUrl);
  const state = url.searchParams.get('state');

  if (!state) {
    throw new Error('Missing state parameter');
  }

  const stateData = stateStore.get(state);
  if (!stateData) {
    throw new Error('Invalid or expired state parameter');
  }

  if (Date.now() - stateData.createdAt > STATE_TTL_MS) {
    stateStore.delete(state);
    throw new Error('State parameter expired');
  }

  // Delete state — single-use
  stateStore.delete(state);

  const tokens = await client.authorizationCodeGrant(
    config,
    new URL(callbackUrl),
    {
      expectedState: state,
      expectedNonce: stateData.nonce,
    }
  );

  const claims = tokens.claims();
  if (!claims) {
    throw new Error('No claims in ID token');
  }

  return { claims: claims as Record<string, unknown> };
}
