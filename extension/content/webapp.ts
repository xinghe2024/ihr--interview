/**
 * Content Script — 注入 Ailin Web App 页面
 * run_at: document_start
 *
 * 作用1：设置 DOM 属性告知页面"插件已安装"（需要 document_start，React 渲染前）
 * 作用2：登录后同步 token 到插件存储（延迟到页面加载完成，避免 runtime 未就绪）
 */
import { MSG } from '../shared/constants.js';

// ── 立即执行：设置检测标记（document_start 时机，React 渲染前）────────────────
document.documentElement.setAttribute('data-ailin-ext', 'true');

// ── 延迟执行：所有 chrome API 调用必须在运行时就绪后进行 ─────────────────────

function safeSyncToken(jwt: string) {
  try {
    // 检查扩展上下文是否有效（插件重载后 runtime.id 变 undefined）
    if (!chrome?.runtime?.id) return;
    chrome.runtime.sendMessage({
      type: MSG.SYNC_TOKEN,
      payload: {
        jwt,
        refreshToken: localStorage.getItem('ihr_nexus_refresh_token'),
        user: localStorage.getItem('ihr_nexus_user'),
      },
    });
  } catch {
    // 扩展上下文已失效，忽略
  }
}

function onPageReady() {
  // 页面加载完成后，把 localStorage 里的现有 token 主动同步给 SW
  // 解决扩展重载后 chrome.storage.session 被清空的问题
  const existingJwt = localStorage.getItem('ihr_nexus_token');
  if (existingJwt) {
    safeSyncToken(existingJwt);
  }
}

if (document.readyState === 'complete') {
  onPageReady();
} else {
  window.addEventListener('load', onPageReady);
}

// 监听 Web App 登录事件，转发给 SW
window.addEventListener('ailin-login', (e) => {
  const { jwt } = (e as CustomEvent<{ jwt: string }>).detail;
  if (jwt) safeSyncToken(jwt);
});
