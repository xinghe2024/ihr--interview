/**
 * Background Service Worker
 * 核心调度：cookie 读取、token 管理、API 代理
 */
import { MSG, WEB_APP_URL, ZP_RD_URL, STORAGE_KEY_JWT, STORAGE_KEY_REFRESH, STORAGE_KEY_USER } from '../shared/constants.js';
import {
  getAuthState,
  exchangeZpToken,
  getZpAccessToken,
  logout,
} from '../shared/auth.js';
import { apiRequest } from '../shared/api.js';

// ─── Side Panel 行为动态管理 ──────────────────────────
//
// 核心策略：动态切换 openPanelOnActionClick
//   已登录 → true  → Chrome 原生打开侧边栏（无需调 sidePanel.open()，无手势问题）
//   未登录 → false → onClicked 触发 → 我们调 tabs.create(WelcomeView)（无手势要求）
//
// 这样完全保留原始产品方案：已登录→侧边栏，未登录→欢迎页

async function syncPanelBehavior() {
  const localData = await chrome.storage.local.get(STORAGE_KEY_REFRESH);
  const hasRefresh = !!localData[STORAGE_KEY_REFRESH];
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: hasRefresh });
}

// SW 启动时同步一次（覆盖重启后的默认状态）
syncPanelBehavior();

// ─── 图标点击路由（仅在 openPanelOnActionClick=false 时触发，即未登录状态）──

chrome.action.onClicked.addListener(() => {
  // 此 handler 只在未登录时触发（已登录时 Chrome 原生打开侧边栏，不会触发此事件）
  chrome.tabs.create({ url: WEB_APP_URL });
});

// ─── 消息处理 ─────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // 保持消息通道打开（异步响应）
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  sender?: chrome.runtime.MessageSender,
) {
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
      // 登录成功后切换为侧边栏模式
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      return { success: true, ...(await getAuthState()) };
    }

    case MSG.LOGOUT:
      await logout();
      // 登出后切换为欢迎页模式
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      return { success: true };

    case MSG.API_REQUEST: {
      const { path, options } = message.payload as {
        path: string;
        options?: { method?: string; body?: unknown };
      };
      return apiRequest(path, options);
    }

    case MSG.SYNC_TOKEN: {
      // Web App 登录后通过 content script 同步 token 到插件存储
      const { jwt, refreshToken, user } = message.payload as {
        jwt: string;
        refreshToken?: string;
        user?: string;
      };
      if (jwt) await chrome.storage.session.set({ [STORAGE_KEY_JWT]: jwt });
      if (refreshToken) await chrome.storage.local.set({ [STORAGE_KEY_REFRESH]: refreshToken });
      if (user) await chrome.storage.local.set({ [STORAGE_KEY_USER]: user });
      // 登录成功后切换为侧边栏模式
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      return { success: true };
    }

    case MSG.OPEN_SIDEBAR: {
      // 内容脚本请求打开侧边栏（新手引导悬浮按钮触发）
      const tabId = sender?.tab?.id;
      if (tabId) {
        chrome.sidePanel.open({ tabId });
      }
      return { success: true };
    }

    default:
      return { error: 'UNKNOWN_MESSAGE_TYPE' };
  }
}

// ─── 安装时智能路由 ──────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // 尝试静默激活（主流用户：已登录智联）
    const zpToken = await getZpAccessToken();
    if (zpToken) {
      const ok = await exchangeZpToken(zpToken);
      if (ok) {
        // 已有智联身份 → 切换侧边栏模式 + 打开候选人列表页
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        chrome.tabs.create({ url: ZP_RD_URL });
        return;
      }
    }
    // 无智联 cookie → 打开 WelcomeView 引导登录（次流用户）
    chrome.tabs.create({ url: WEB_APP_URL });
  } else {
    // 更新时也尝试刷新 token
    const zpToken = await getZpAccessToken();
    if (zpToken) await exchangeZpToken(zpToken);
  }
});
