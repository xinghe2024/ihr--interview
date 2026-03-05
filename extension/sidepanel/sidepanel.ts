/**
 * Side Panel 桥接脚本
 * 负责将 Chrome 扩展的 auth 状态和页面上下文传递给 iframe 内的 Web App
 */
import { STORAGE_KEY_JWT, STORAGE_KEY_REFRESH, STORAGE_KEY_USER } from '../shared/constants.js';

const SIDEBAR_ORIGIN = 'http://localhost:3000';
const frame = document.getElementById('sidebar-frame') as HTMLIFrameElement;

// ── iframe 加载完成后注入 Auth ────────────────────────

frame.addEventListener('load', async () => {
  const [sessionData, localData] = await Promise.all([
    chrome.storage.session.get(STORAGE_KEY_JWT),
    chrome.storage.local.get([STORAGE_KEY_REFRESH, STORAGE_KEY_USER]),
  ]);

  const token = sessionData[STORAGE_KEY_JWT];
  const user = localData[STORAGE_KEY_USER];
  const refreshToken = localData[STORAGE_KEY_REFRESH];

  if (token && user) {
    frame.contentWindow?.postMessage(
      { type: 'INJECT_AUTH', token, refreshToken, user },
      SIDEBAR_ORIGIN
    );
  }

  // 同时发送当前 tab 的页面上下文
  sendBrowserContext();
});

// ── 获取当前 Tab 上下文并发给 iframe ─────────────────

async function sendBrowserContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const ctx = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' });
    const isResume = !!ctx?.currentUrl?.includes('rd6.zhaopin.com/resume');
    frame.contentWindow?.postMessage(
      { type: 'BROWSER_CONTEXT', context: isResume ? 'resume' : 'empty' },
      SIDEBAR_ORIGIN
    );
  } catch {
    // content script 不在当前页面或 tab 无法访问，忽略
  }
}

// ── 监听 storage 变化，用户在其他 Tab 登录后自动更新侧边栏 ──

chrome.storage.onChanged.addListener(async (changes, area) => {
  const newJwt = area === 'session' ? changes[STORAGE_KEY_JWT]?.newValue : undefined;
  if (!newJwt) return;

  const localData = await chrome.storage.local.get([STORAGE_KEY_REFRESH, STORAGE_KEY_USER]);
  const user = localData[STORAGE_KEY_USER];
  const refreshToken = localData[STORAGE_KEY_REFRESH];

  if (user) {
    frame.contentWindow?.postMessage(
      { type: 'INJECT_AUTH', token: newJwt, refreshToken, user },
      SIDEBAR_ORIGIN
    );
  }
});
