/**
 * Popup 脚本
 * 展示登录态、手动登录入口
 */
import { MSG, ZP_LOGIN_URL } from '../shared/constants.js';
import type { AuthState } from '../shared/auth.js';

// DOM elements
const $loading = document.getElementById('loading')!;
const $noZp = document.getElementById('no-zp')!;
const $zpNotLinked = document.getElementById('zp-not-linked')!;
const $loggedIn = document.getElementById('logged-in')!;
const $userName = document.getElementById('user-name')!;
const $userDetail = document.getElementById('user-detail')!;

function hideAll() {
  $loading.classList.add('hidden');
  $noZp.classList.add('hidden');
  $zpNotLinked.classList.add('hidden');
  $loggedIn.classList.add('hidden');
}

function showView(state: AuthState) {
  hideAll();

  if (state.isLoggedIn && state.user) {
    $loggedIn.classList.remove('hidden');
    $userName.textContent = state.user.name || '用户';
    $userDetail.textContent = [state.user.company, state.user.role].filter(Boolean).join(' · ') || state.user.phone;
  } else if (state.hasZpCookie) {
    $zpNotLinked.classList.remove('hidden');
  } else {
    $noZp.classList.remove('hidden');
  }
}

// ─── 初始化 ──────────────────────────────────────

async function init() {
  const state = await chrome.runtime.sendMessage({ type: MSG.GET_AUTH_STATUS }) as AuthState;
  showView(state);
}

init();

// ─── 事件绑定 ─────────────────────────────────────

// 前往智联登录
document.getElementById('btn-goto-zp')!.addEventListener('click', () => {
  chrome.tabs.create({ url: ZP_LOGIN_URL });
  window.close();
});

// 授权连接
document.getElementById('btn-connect')!.addEventListener('click', async () => {
  const btn = document.getElementById('btn-connect') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = '激活中...';

  const result = await chrome.runtime.sendMessage({ type: MSG.LOGIN_WITH_ZP }) as AuthState & { success?: boolean; error?: string };

  if (result.success === false) {
    btn.disabled = false;
    btn.textContent = '一键激活';
    alert(result.error === 'NO_ZP_COOKIE' ? '智联登录已过期，请重新登录后再试' : '激活失败，请稍后重试');
    return;
  }

  showView(result);
});

// 打开侧边栏
document.getElementById('btn-sidepanel')!.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
  window.close();
});

// 断开连接
document.getElementById('btn-logout')!.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: MSG.LOGOUT });
  const state = await chrome.runtime.sendMessage({ type: MSG.GET_AUTH_STATUS }) as AuthState;
  showView(state);
});
