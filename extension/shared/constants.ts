/**
 * 插件常量配置
 */

// Ailin 后端 API 地址（开发环境）
export const NEXUS_API_BASE = 'http://localhost:3001';

// Ailin Web 端地址（开发环境，生产替换为真实域名）
export const WEB_APP_URL = 'http://localhost:3000';

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

  // 内容脚本请求打开侧边栏
  OPEN_SIDEBAR: 'OPEN_SIDEBAR',

  // Web App 登录后同步 token 到插件存储
  SYNC_TOKEN: 'SYNC_TOKEN',
} as const;

export type MessageType = typeof MSG[keyof typeof MSG];
