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

console.log('[艾琳] Content script loaded on', window.location.hostname);
