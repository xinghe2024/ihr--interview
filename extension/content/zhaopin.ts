/**
 * Content Script — 注入智联招聘页面
 * 提取简历/职位信息，通过消息与 Background SW 通信
 * 不持有任何 token
 */
import { MSG } from '../shared/constants.js';

// ─── 页面上下文同步 ──────────────────────────────────

function getPageContext() {
  return {
    currentUrl: window.location.href,
    pageTitle: document.title,
    selectedText: window.getSelection()?.toString() || '',
  };
}

// 向 SW 报告当前页面上下文
function reportContext() {
  chrome.runtime.sendMessage({
    type: MSG.PAGE_CONTEXT,
    payload: getPageContext(),
  });
}

// 页面加载完成后报告
if (document.readyState === 'complete') {
  reportContext();
} else {
  window.addEventListener('load', reportContext);
}

// ─── 简历提取（智联 rd6 简历详情页） ─────────────────

function extractResumeFromPage(): Record<string, string> | null {
  // rd6.zhaopin.com 简历详情页的关键 DOM 结构
  const nameEl = document.querySelector('.resume-name, .name, [class*="resumeName"]');
  const phoneEl = document.querySelector('[class*="phone"], [class*="mobile"]');
  const emailEl = document.querySelector('[class*="email"]');

  if (!nameEl) return null;

  return {
    name: nameEl.textContent?.trim() || '',
    phone: phoneEl?.textContent?.trim() || '',
    email: emailEl?.textContent?.trim() || '',
    rawHtml: document.querySelector('.resume-detail, .resume-content, [class*="resumeDetail"]')?.innerHTML || '',
  };
}

// ─── 监听来自 SW/Popup 的消息 ────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_RESUME') {
    const resume = extractResumeFromPage();
    sendResponse({ success: !!resume, data: resume });
  }
  if (message.type === 'GET_PAGE_CONTEXT') {
    sendResponse(getPageContext());
  }
  return true;
});

console.log('[Ailin] Content script loaded on', window.location.hostname);

// ─── 新手引导 ──────────────────────────────────────

const GUIDE_CSS = `
  #ailin-guide-banner {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 2147483647;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 16px rgba(99,102,241,.3);
    animation: ailin-slide-down .3s ease;
  }
  @keyframes ailin-slide-down {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }
  #ailin-guide-banner .ailin-banner-close {
    background: none; border: none;
    color: rgba(255,255,255,.65); cursor: pointer;
    font-size: 20px; line-height: 1; padding: 0 4px;
    transition: color .15s;
  }
  #ailin-guide-banner .ailin-banner-close:hover { color: white; }

  #ailin-float-wrap {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2147483646;
    display: flex;
    align-items: center;
  }
  #ailin-float-btn {
    width: 40px;
    height: 40px;
    border-radius: 20px 0 0 20px;
    background: linear-gradient(160deg, #6366f1, #8b5cf6);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -3px 0 14px rgba(99,102,241,.35);
    transition: width .2s ease, box-shadow .2s ease;
    padding: 0;
  }
  #ailin-float-btn:hover {
    width: 48px;
    box-shadow: -4px 0 20px rgba(99,102,241,.5);
  }
  #ailin-float-tooltip {
    position: absolute;
    right: 44px;
    white-space: nowrap;
    background: rgba(15,15,25,.85);
    color: white;
    font-family: -apple-system, 'PingFang SC', sans-serif;
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 6px;
    pointer-events: none;
    opacity: 0;
    transition: opacity .15s;
  }
  #ailin-float-wrap:hover #ailin-float-tooltip { opacity: 1; }
  #ailin-float-wrap:hover #ailin-float-btn { width: 48px; }
`;

// 悬浮按钮图标（四角星/sparkle）
const SPARKLE_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L13.8 9.5L20.5 11L13.8 12.5L12 19L10.2 12.5L3.5 11L10.2 9.5Z"/>
    <circle cx="20" cy="4" r="1.2" fill="white" opacity="0.55"/>
    <circle cx="4" cy="20" r="1" fill="white" opacity="0.45"/>
  </svg>
`;

function injectStyles() {
  if (document.getElementById('ailin-guide-style')) return;
  const style = document.createElement('style');
  style.id = 'ailin-guide-style';
  style.textContent = GUIDE_CSS;
  document.head.appendChild(style);
}

function injectBanner() {
  if (document.getElementById('ailin-guide-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'ailin-guide-banner';
  banner.innerHTML = `
    <span>✦ &nbsp;Ailin 已就绪 — 点右上角图标，一键发起 AI 初面</span>
    <button class="ailin-banner-close" id="ailin-banner-close" title="关闭">×</button>
  `;
  document.body.prepend(banner);
  document.getElementById('ailin-banner-close')!.addEventListener('click', () => {
    banner.remove();
  });
}

function injectFloatButton() {
  if (document.getElementById('ailin-float-wrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'ailin-float-wrap';
  wrap.innerHTML = `
    <button id="ailin-float-btn" title="打开 Ailin">${SPARKLE_SVG}</button>
    <span id="ailin-float-tooltip">打开 Ailin</span>
  `;
  document.body.appendChild(wrap);
  document.getElementById('ailin-float-btn')!.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.OPEN_SIDEBAR });
  });
}

async function maybeShowOnboarding() {
  injectStyles();

  // 悬浮图标：扩展已安装即显示（点击时由 SW 智能路由：已登录→侧边栏，未登录→WelcomeView）
  injectFloatButton();

  // 引导条：仅首次展示
  const stored = await chrome.storage.local.get('ailin_onboarding_shown');
  if (!stored.ailin_onboarding_shown) {
    await chrome.storage.local.set({ ailin_onboarding_shown: true });
    injectBanner();
  }
}

// 页面加载完成后执行新手引导检测
if (document.readyState === 'complete') {
  maybeShowOnboarding();
} else {
  window.addEventListener('load', maybeShowOnboarding);
}
