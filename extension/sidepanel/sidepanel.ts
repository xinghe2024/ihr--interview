/**
 * Side Panel 脚本
 * 艾琳 Sidebar Agent 交互界面
 */
import { MSG } from '../shared/constants.js';
import type { AuthState } from '../shared/auth.js';

const $status = document.getElementById('sp-status')!;
const $notLogged = document.getElementById('sp-not-logged')!;
const $chatArea = document.getElementById('sp-chat-area')!;
const $inputArea = document.getElementById('sp-input')!;
const $msgInput = document.getElementById('sp-msg-input') as HTMLInputElement;
const $btnSend = document.getElementById('sp-btn-send') as HTMLButtonElement;

// ─── 初始化 ──────────────────────────────────────

async function init() {
  const state = await chrome.runtime.sendMessage({ type: MSG.GET_AUTH_STATUS }) as AuthState;

  if (state.isLoggedIn) {
    showChat(state);
  } else {
    showNotLogged();
  }
}

function showNotLogged() {
  $status.textContent = '未连接';
  $notLogged.style.display = '';
  $chatArea.style.display = 'none';
  $inputArea.style.display = 'none';
}

function showChat(state: AuthState) {
  $status.textContent = state.user?.name ? `${state.user.name} 已连接` : '已连接';
  $notLogged.style.display = 'none';
  $chatArea.style.display = '';
  $inputArea.style.display = '';
}

function addMessage(role: 'ai' | 'user', content: string) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div class="bubble">${escapeHtml(content)}</div>`;
  $chatArea.appendChild(div);
  $chatArea.scrollTop = $chatArea.scrollHeight;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── 发送消息 ─────────────────────────────────────

async function sendMessage() {
  const content = $msgInput.value.trim();
  if (!content) return;

  $msgInput.value = '';
  addMessage('user', content);

  $btnSend.disabled = true;

  // 获取页面上下文
  let browserContext;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      browserContext = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' });
    }
  } catch { /* content script 可能不在 */ }

  // 通过 SW 代理 API 请求
  const result = await chrome.runtime.sendMessage({
    type: MSG.API_REQUEST,
    payload: {
      path: '/api/chat/messages',
      options: {
        method: 'POST',
        body: { content, browserContext },
      },
    },
  });

  $btnSend.disabled = false;

  if (result?.success && result.data?.aiReply) {
    addMessage('ai', result.data.aiReply.content);
  } else {
    addMessage('ai', '抱歉，请求失败了。请检查网络连接后重试。');
  }
}

// ─── 事件绑定 ─────────────────────────────────────

$btnSend.addEventListener('click', sendMessage);
$msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('sp-btn-login')!.addEventListener('click', () => {
  chrome.action.openPopup();
});

init();
