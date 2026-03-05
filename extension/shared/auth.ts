/**
 * 认证管理
 * Token exchange, refresh, storage
 */
import {
  NEXUS_API_BASE,
  ZP_COOKIE_NAME_AT,
  ZP_COOKIE_DOMAIN,
  STORAGE_KEY_JWT,
  STORAGE_KEY_REFRESH,
  STORAGE_KEY_USER,
} from './constants.js';

export interface AuthState {
  isLoggedIn: boolean;
  user: {
    id: string;
    name: string;
    phone: string;
    company: string;
    role: string;
    avatar?: string;
    zhaopinUserId?: string;
  } | null;
  hasZpCookie: boolean;
}

/** 读取智联 at cookie */
export async function getZpAccessToken(): Promise<string | null> {
  try {
    const cookie = await chrome.cookies.get({
      url: 'https://www.zhaopin.com',
      name: ZP_COOKIE_NAME_AT,
    });
    return cookie?.value || null;
  } catch {
    return null;
  }
}

/** 用智联 at token 换 NEXUS JWT */
export async function exchangeZpToken(zpAccessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${NEXUS_API_BASE}/api/auth/zhaopin-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zpAccessToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (!data.success) return false;

    const { token, refreshToken, user } = data.data;

    // JWT 存 session storage（浏览器关闭即清除）
    await chrome.storage.session.set({ [STORAGE_KEY_JWT]: token });
    // Refresh token 存 local storage（持久化）
    await chrome.storage.local.set({
      [STORAGE_KEY_REFRESH]: refreshToken,
      [STORAGE_KEY_USER]: user,
    });

    return true;
  } catch {
    return false;
  }
}

/** 刷新 NEXUS JWT */
export async function refreshNexusToken(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_REFRESH);
    const refreshToken = result[STORAGE_KEY_REFRESH];
    if (!refreshToken) return false;

    const res = await fetch(`${NEXUS_API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (!data.success) return false;

    await chrome.storage.session.set({ [STORAGE_KEY_JWT]: data.data.token });
    return true;
  } catch {
    return false;
  }
}

/** 获取当前 JWT（自动尝试刷新） */
export async function getJwt(): Promise<string | null> {
  const result = await chrome.storage.session.get(STORAGE_KEY_JWT);
  const jwt = result[STORAGE_KEY_JWT];

  if (jwt) return jwt;

  // 尝试 refresh
  const refreshed = await refreshNexusToken();
  if (refreshed) {
    const newResult = await chrome.storage.session.get(STORAGE_KEY_JWT);
    return newResult[STORAGE_KEY_JWT] || null;
  }

  // 尝试重新 exchange
  const zpToken = await getZpAccessToken();
  if (zpToken) {
    const exchanged = await exchangeZpToken(zpToken);
    if (exchanged) {
      const finalResult = await chrome.storage.session.get(STORAGE_KEY_JWT);
      return finalResult[STORAGE_KEY_JWT] || null;
    }
  }

  return null;
}

/** 获取认证状态 */
export async function getAuthState(): Promise<AuthState> {
  // 使用 getJwt() 的完整 fallback 链：session → refresh → ZP cookie
  // 避免 SW 重启后 session 清空导致已登录用户被误判为未登录
  const [jwt, userResult] = await Promise.all([
    getJwt(),
    chrome.storage.local.get(STORAGE_KEY_USER),
  ]);

  return {
    isLoggedIn: !!jwt,
    user: userResult[STORAGE_KEY_USER] || null,
    hasZpCookie: false,
  };
}

/** 登出 */
export async function logout(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEY_JWT);
  await chrome.storage.local.remove([STORAGE_KEY_REFRESH, STORAGE_KEY_USER]);
}
