/**
 * 认证路由
 * POST /api/auth/send-code   — 发送验证码
 * POST /api/auth/login        — 手机号 + 验证码登录
 * POST /api/auth/refresh      — 刷新 token
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

import { getSupabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { apiResponse } from '../middleware/apiResponse.js';
import { sendVerificationCode, verifyCode } from '../services/smsService.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../services/jwtService.js';
import { fetchZhaopinUserInfo } from '../services/zhaopinAuthService.js';
import type {
  LoginResponse,
  RefreshTokenResponse,
  UserProfile,
} from '@shared/types.js';

const auth = new Hono();

// ─── POST /send-code ────────────────────────────
const sendCodeSchema = z.object({ phone: z.string().min(11).max(20) });

auth.post('/send-code', async (c) => {
  const body = sendCodeSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: '请输入有效手机号' }), 400);
  }

  const code = await sendVerificationCode(body.data.phone);

  // Mock 模式下返回验证码，方便测试自动化
  const env = getEnv();
  const payload: Record<string, unknown> = { sent: true };
  if (env.SMS_PROVIDER === 'mock') {
    payload.devCode = code;
  }
  return c.json(apiResponse(payload));
});

// ─── POST /login ────────────────────────────────
const loginSchema = z.object({
  phone: z.string().min(11).max(20),
  code: z.string().min(4).max(6),
});

auth.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: '请输入手机号和验证码' }), 400);
  }

  const { phone, code } = body.data;

  if (!verifyCode(phone, code)) {
    return c.json(apiResponse(null, { code: 'AUTH_INVALID_CODE', message: '验证码错误或已过期' }), 401);
  }

  // 查询或创建用户
  const db = getSupabase();
  let { data: user } = await db
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!user) {
    const newUser = { id: uuid(), phone, name: '', company: '', role: '' };
    const { data, error } = await db.from('users').insert(newUser).select().single();
    if (error) throw error;
    user = data;
  }

  const env = getEnv();
  const userProfile: UserProfile = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    company: user.company,
    role: user.role,
    avatar: user.avatar,
  };

  const token = await signAccessToken({
    userId: user.id,
    phone: user.phone,
    companyId: user.company || '',
  });
  const refreshToken = await signRefreshToken(user.id);

  const res: LoginResponse = {
    token,
    refreshToken,
    expiresIn: env.JWT_EXPIRES_IN,
    user: userProfile,
  };

  return c.json(apiResponse(res));
});

// ─── POST /refresh ──────────────────────────────
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

auth.post('/refresh', async (c) => {
  const body = refreshSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: 'Missing refreshToken' }), 400);
  }

  const payload = await verifyToken(body.data.refreshToken);
  if (!payload) {
    return c.json(apiResponse(null, { code: 'AUTH_EXPIRED', message: 'Refresh token expired' }), 401);
  }

  // 查用户信息以构建完整 payload
  const db = getSupabase();
  const { data: user } = await db.from('users').select('*').eq('id', payload.userId).single();
  if (!user) {
    return c.json(apiResponse(null, { code: 'AUTH_USER_NOT_FOUND', message: 'User not found' }), 401);
  }

  const env = getEnv();
  const token = await signAccessToken({
    userId: user.id,
    phone: user.phone,
    companyId: user.company || '',
  });

  const res: RefreshTokenResponse = { token, expiresIn: env.JWT_EXPIRES_IN };
  return c.json(apiResponse(res));
});

// ─── POST /zhaopin-exchange ─────────────────────
// Chrome 插件用智联 at cookie 换 NEXUS JWT
const zpExchangeSchema = z.object({ zpAccessToken: z.string().min(1) });

auth.post('/zhaopin-exchange', async (c) => {
  const body = zpExchangeSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: 'Missing zpAccessToken' }), 400);
  }

  // 1. 用 at token 获取智联用户信息
  let zpUser;
  try {
    zpUser = await fetchZhaopinUserInfo(body.data.zpAccessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Zhaopin token';
    return c.json(apiResponse(null, { code: 'ZP_TOKEN_INVALID', message }), 401);
  }

  // 2. 在 Supabase 中 upsert 用户（以 zhaopin userId 为关联键）
  const db = getSupabase();
  let { data: user } = await db
    .from('users')
    .select('*')
    .eq('zhaopin_user_id', zpUser.userId)
    .single();

  if (!user) {
    // 尝试用手机号匹配已有用户
    if (zpUser.phone) {
      const { data: existingUser } = await db
        .from('users')
        .select('*')
        .eq('phone', zpUser.phone)
        .single();

      if (existingUser) {
        // 关联已有用户
        await db.from('users').update({ zhaopin_user_id: zpUser.userId }).eq('id', existingUser.id);
        user = { ...existingUser, zhaopin_user_id: zpUser.userId };
      }
    }

    if (!user) {
      // 创建新用户
      const newUser = {
        id: uuid(),
        phone: zpUser.phone || '',
        name: zpUser.name,
        company: zpUser.companyName,
        role: '',
        zhaopin_user_id: zpUser.userId,
      };
      const { data, error } = await db.from('users').insert(newUser).select().single();
      if (error) throw error;
      user = data;
    }
  }

  // 3. 签发 NEXUS JWT
  const env = getEnv();
  const userProfile: UserProfile = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    company: user.company,
    role: user.role,
    avatar: user.avatar,
    zhaopinUserId: zpUser.userId,
  };

  const token = await signAccessToken({
    userId: user.id,
    phone: user.phone,
    companyId: user.company || '',
  });
  const refreshToken = await signRefreshToken(user.id);

  const res: LoginResponse = {
    token,
    refreshToken,
    expiresIn: env.JWT_EXPIRES_IN,
    user: userProfile,
  };

  return c.json(apiResponse(res));
});

export default auth;
