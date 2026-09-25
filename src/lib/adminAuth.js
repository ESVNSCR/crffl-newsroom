import crypto from 'crypto';
import { supabase } from './supabase.js';

export const COOKIE_NAME = 'crffl_admin_session';

const COMMISSIONER_PIN = (
  process.env.COMMISSIONER_PIN ||
  ''
).trim();

const SESSION_SECRET = (
  process.env.ADMIN_SESSION_SECRET ||
  process.env.CRON_SECRET ||
  ''
).trim();


// In-memory sliding window rate limiter for login attempts (15 minutes, 5 attempts)
const failedAttempts = new Map();

/**
 * Check if the client IP is currently rate-limited
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now > record.resetAt) {
    failedAttempts.delete(ip);
    return { allowed: true, remaining: 5 };
  }

  if (record.count >= 5) {
    const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
    return { allowed: false, minutesLeft, remaining: 0 };
  }

  return { allowed: true, remaining: 5 - record.count };
}

/**
 * Record a failed login attempt for an IP
 */
export function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now > record.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return { remaining: 4 };
  } else {
    record.count += 1;
    return { remaining: Math.max(0, 5 - record.count) };
  }
}

/**
 * Clear rate limit record upon successful login
 */
export function clearRateLimit(ip) {
  failedAttempts.delete(ip);
}

/**
 * Timing-safe PIN verification for the Commissioner
 * Supports static environment variable as well as dynamic Supabase authentication for manager 'Eric'
 */
export async function verifyCommissionerPin(inputPin) {
  if (!inputPin || typeof inputPin !== 'string') return false;
  const cleanInput = inputPin.trim();

  // 1. Check environment variable (COMMISSIONER_PIN or NEXT_PUBLIC_COMMISSIONER_PIN)
  const target = COMMISSIONER_PIN;
  if (target) {
    const bufInput = Buffer.from(cleanInput);
    const bufTarget = Buffer.from(target);
    if (bufInput.length === bufTarget.length && crypto.timingSafeEqual(bufInput, bufTarget)) {
      return true;
    }
  }

  // 2. Dynamic check: Eric is the Commissioner and owner of Rebel Scum
  // Authenticate against Supabase manager_pins table via verify_manager_pin RPC
  try {
    const { data: isValid, error } = await supabase.rpc('verify_manager_pin', {
      p_manager: 'Eric',
      p_pin: cleanInput,
    });
    if (!error && isValid === true) {
      return true;
    }
  } catch (err) {
    console.warn('Could not verify commissioner pin via Supabase RPC:', err.message);
  }

  return false;
}

/**
 * Create a cryptographically signed session token valid for 7 days
 */
export function createSessionToken() {
  if (!SESSION_SECRET) {
    throw new Error('ADMIN_SESSION_SECRET is not configured in server environment.');
  }

  const payload = JSON.stringify({
    role: 'commissioner',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a session token's HMAC signature and expiration
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.') || !SESSION_SECRET) {
    return false;
  }


  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const bufSig = Buffer.from(signature);
  const bufExpected = Buffer.from(expectedSignature);

  if (bufSig.length !== bufExpected.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(bufSig, bufExpected)) {
    return false;
  }

  try {
    const rawPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(rawPayload);

    if (parsed.exp && Date.now() > parsed.exp) {
      return false; // Expired
    }

    return parsed.role === 'commissioner';
  } catch (_) {
    return false;
  }
}

/**
 * Helper to verify commissioner authorization on an incoming API request
 * Supports either:
 * 1. Valid signed 'crffl_admin_session' cookie
 * 2. Valid 'Authorization: Bearer <CRON_SECRET>' header for internal cron jobs
 */
export async function verifyAdminSession(request) {
  // 1. Check for Bearer CRON_SECRET (used by automated Vercel Crons)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true, method: 'cron_bearer' };
  }

  // 2. Check for cookie on request object or cookie store
  let token = request?.cookies?.get?.(COOKIE_NAME)?.value;
  if (!token) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch (_) {}
  }

  if (token && verifySessionToken(token)) {
    return { authorized: true, method: 'session_cookie' };
  }

  return {
    authorized: false,
    error: 'Unauthorized: Commissioner clearance required',
  };
}
