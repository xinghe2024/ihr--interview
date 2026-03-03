/**
 * 智联招聘认证服务
 * 用 at cookie 调用智联 API 获取用户信息
 */
import { getEnv } from '../config/env.js';

export interface ZhaopinUserInfo {
  userId: string;
  name: string;
  phone: string;
  companyName: string;
}

/**
 * 用智联 at token 获取用户信息
 * 主策略: 调用智联 userpassport API
 * 降级策略: 解析 at 为 JWT 提取 claims
 */
export async function fetchZhaopinUserInfo(atToken: string): Promise<ZhaopinUserInfo> {
  const env = getEnv();
  const apiBase = env.ZHAOPIN_API_BASE;

  try {
    const res = await fetch(`${apiBase}/userpassport/user/getUserInfo`, {
      method: 'GET',
      headers: {
        'Cookie': `at=${atToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Zhaopin API responded ${res.status}`);
    }

    const data = await res.json() as {
      code?: number;
      data?: {
        userId?: string;
        userName?: string;
        realName?: string;
        mobile?: string;
        companyName?: string;
        companyId?: string;
      };
    };

    if (data.code !== 200 && data.code !== 0) {
      throw new Error(`Zhaopin API error code: ${data.code}`);
    }

    const userInfo = data.data;
    if (!userInfo?.userId) {
      throw new Error('Zhaopin API returned no user data');
    }

    return {
      userId: userInfo.userId,
      name: userInfo.realName || userInfo.userName || '',
      phone: userInfo.mobile || '',
      companyName: userInfo.companyName || '',
    };
  } catch (err) {
    // 降级策略: 尝试解析 at 为 JWT 提取 claims
    return parseAtTokenFallback(atToken);
  }
}

/**
 * 降级: 解析 at token (JWT 格式) 提取 claims
 * 智联的 at cookie 通常是 JWT，包含用户信息
 */
function parseAtTokenFallback(atToken: string): ZhaopinUserInfo {
  try {
    const parts = atToken.split('.');
    if (parts.length !== 3) {
      throw new Error('at token is not a valid JWT');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    ) as Record<string, unknown>;

    const userId = String(payload.sub || payload.userId || payload.uid || '');
    if (!userId) {
      throw new Error('Cannot extract userId from at token');
    }

    return {
      userId,
      name: String(payload.name || payload.realName || ''),
      phone: String(payload.mobile || payload.phone || ''),
      companyName: String(payload.companyName || ''),
    };
  } catch {
    throw new Error('ZHAOPIN_TOKEN_INVALID: Cannot verify Zhaopin access token');
  }
}
