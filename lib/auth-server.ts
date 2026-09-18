import crypto from 'crypto';

// Configuration for secure authentication
const DEFAULT_EMAIL = 'info@zakariaelahbabi.com';
const DEFAULT_SALT = 'pmu_secure_platform_salt_2026';
// SHA-256 hash of "Zz@0634408525" + DEFAULT_SALT
const DEFAULT_PASSWORD_HASH = '6d2b28d4d3b45627bf567ba730f46f4b55afe3ce42578880d8d0103fe99533bb';
const DEFAULT_JWT_SECRET = 'pmu_auth_jwt_secret_key_2026_zakaria_secure';

export const AUTH_EMAIL = (process.env.AUTH_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
export const AUTH_SALT = process.env.AUTH_SALT || DEFAULT_SALT;
export const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
export const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || DEFAULT_JWT_SECRET;

/**
 * Hash a plain password using SHA-256 with the platform salt
 */
export function hashPassword(plainPassword: string): string {
  return crypto
    .createHash('sha256')
    .update(plainPassword + AUTH_SALT)
    .digest('hex');
}

/**
 * Verify user credentials in constant time to prevent timing attacks
 */
export function verifyCredentials(emailInput: string, passwordInput: string): boolean {
  if (!emailInput || !passwordInput) return false;

  const normalizedEmail = emailInput.trim().toLowerCase();
  if (normalizedEmail !== AUTH_EMAIL) {
    return false;
  }

  const computedHash = hashPassword(passwordInput);
  try {
    const computedBuf = Buffer.from(computedHash, 'hex');
    const expectedBuf = Buffer.from(AUTH_PASSWORD_HASH, 'hex');

    if (computedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuf, expectedBuf);
  } catch (err) {
    console.error('Error verifying credentials:', err);
    return false;
  }
}

export interface SessionPayload {
  email: string;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Create a cryptographically signed session token
 */
export function createSessionToken(email: string, rememberMe = true): string {
  const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    iat: Date.now(),
    exp: Date.now() + durationMs,
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a session token's signature and expiration
 */
export function verifySessionToken(token: string): { valid: boolean; payload?: SessionPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid token structure' };
  }

  const [payloadB64, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_JWT_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid signature' };
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }

    if (payload.email !== AUTH_EMAIL) {
      return { valid: false, error: 'Unauthorized user email' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Malformed token' };
  }
}
