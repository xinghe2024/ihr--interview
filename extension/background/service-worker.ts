/**
 * Background Service Worker
 * 核心调度：cookie 读取、token 管理、API 代理
 */
import { MSG } from '../shared/constants.js';
import {
  getAuthState,
  exchangeZpToken,
  getZpAccessToken,
  logout,
} from '../shared/auth.js';
import { apiRequest } from '../shared/api.js';

// ─── 消息处理 ─────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // 保持消息通道打开（异步响应）
});

async function handleMessage(message: { type: string; payload?: unknown }) {
  switch (message.type) {
    case MSG.GET_AUTH_STATUS:
      return getAuthState();

    case MSG.LOGIN_WITH_ZP: {
      const zpToken = await getZpAccessToken();
      if (!zpToken) {
        return { success: false, error: 'NO_ZP_COOKIE' };
      }
      const ok = await exchangeZpToken(zpToken);
      if (!ok) {
        return { success: false, error: 'EXCHANGE_FAILED' };
      }
      return { success: true, ...(await getAuthState()) };
    }

    case MSG.LOGOUT:
      await logout();
      return { success: true };

    case MSG.API_REQUEST: {
      const { path, options } = message.payload as {
        path: string;
        options?: { method?: string; body?: unknown };
      };
      return apiRequest(path, options);
    }

    default:
      return { error: 'UNKNOWN_MESSAGE_TYPE' };
  }
}

// ─── 安装 / 启动时尝试自动登录 ──────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  // 检查智联是否已登录，如果是则自动 exchange
  const zpToken = await getZpAccessToken();
  if (zpToken) {
    await exchangeZpToken(zpToken);
  }
});

// ─── Side Panel 配置 ────────────────────────────────

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
