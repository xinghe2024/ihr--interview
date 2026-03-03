/**
 * JWT 签发 & 验证
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getEnv } from '../config/env.js';
import type { TokenPayload } from '@shared/types.js';

function getSecret() {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

/** 签发 access token */
export async function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const env = getEnv();
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_EXPIRES_IN}s`)
    .sign(getSecret());
}

/** 签发 refresh token（更长有效期） */
export async function signRefreshToken(userId: string): Promise<string> {
  const env = getEnv();
  return new SignJWT({ userId } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_EXPIRES_IN}s`)
    .sign(getSecret());
}

/** 验证 token，返回 payload 或 null */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
