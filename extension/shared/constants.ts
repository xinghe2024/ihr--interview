/**
 * 插件常量配置
 */

// IHR-NEXUS 后端 API 地址（开发环境）
export const NEXUS_API_BASE = 'http://localhost:3001';

// 智联招聘相关
export const ZP_COOKIE_NAME_AT = 'at';
export const ZP_COOKIE_NAME_RT = 'rt';
export const ZP_COOKIE_DOMAIN = '.zhaopin.com';
export const ZP_LOGIN_URL = 'https://passport.zhaopin.com/org/login';
export const ZP_RD_URL = 'https://rd6.zhaopin.com';

// Chrome Storage Keys
export const STORAGE_KEY_JWT = 'nexus_jwt';
export const STORAGE_KEY_REFRESH = 'nexus_refresh_token';
export const STORAGE_KEY_USER = 'nexus_user';

// Message types (Background SW <-> Content Script / Popup / SidePanel)
export const MSG = {
  // Auth
  GET_AUTH_STATUS: 'GET_AUTH_STATUS',
  LOGIN_WITH_ZP: 'LOGIN_WITH_ZP',
  LOGOUT: 'LOGOUT',

  // API Proxy (Content Script 通过 SW 代理 API 请求)
  API_REQUEST: 'API_REQUEST',

  // Content Script → SW
  RESUME_EXTRACTED: 'RESUME_EXTRACTED',
  PAGE_CONTEXT: 'PAGE_CONTEXT',
} as const;

export type MessageType = typeof MSG[keyof typeof MSG];
