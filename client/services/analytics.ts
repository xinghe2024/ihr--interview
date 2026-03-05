/**
 * 前端埋点服务
 *
 * 设计：queue + batch，每 5s 或 20 条 flush 一次
 * 页面关闭时使用 navigator.sendBeacon() 兜底
 *
 * 隐私：永远不在 properties 中包含 PII（手机号、姓名、邮箱），只用 ID
 */

// ─── Types ───────────────────────────────────────

interface TrackingEvent {
  event: string;
  properties?: Record<string, string | number | boolean | null>;
  timestamp: string;
}

interface TrackingContext {
  clientId: string;
  sessionId: string;
  userId?: string;
  platform: 'web' | 'extension' | 'h5';
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  appVersion: string;
}

// ─── State ───────────────────────────────────────

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 20;
const MAX_QUEUE_SIZE = 200;

let _queue: TrackingEvent[] = [];
let _context: TrackingContext | null = null;
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _initialized = false;

// ─── Public API ──────────────────────────────────

/**
 * 初始化埋点（应在 App 挂载时调用一次）
 */
export function initAnalytics(platform: 'web' | 'extension' | 'h5') {
  if (_initialized) return;

  _context = {
    clientId: getOrCreateClientId(),
    sessionId: generateId(),
    platform,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    userAgent: navigator.userAgent,
    appVersion: '0.1.0',
  };

  _flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  // 页面不可见时使用 sendBeacon 发送剩余事件
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushBeacon();
    }
  });

  _initialized = true;
}

/**
 * 设置用户 ID（登录后调用）
 */
export function setUserId(userId: string) {
  if (_context) {
    _context.userId = userId;
  }
}

/**
 * 清除用户 ID（登出后调用）
 */
export function clearUserId() {
  if (_context) {
    _context.userId = undefined;
  }
}

/**
 * 追踪事件
 */
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!_initialized || !_context) return;

  _queue.push({
    event,
    properties,
    timestamp: new Date().toISOString(),
  });

  // 防止队列无限增长
  if (_queue.length > MAX_QUEUE_SIZE) {
    _queue = _queue.slice(-MAX_QUEUE_SIZE);
  }

  if (_queue.length >= FLUSH_THRESHOLD) {
    flush();
  }
}

// ─── Internal ────────────────────────────────────

async function flush() {
  if (_queue.length === 0 || !_context) return;

  const batch = _queue.splice(0);

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch, context: _context }),
    });
  } catch {
    // 失败时把事件放回队列头部，下次重试
    _queue.unshift(...batch);
    // 但不超过最大队列长度
    if (_queue.length > MAX_QUEUE_SIZE) {
      _queue = _queue.slice(-MAX_QUEUE_SIZE);
    }
  }
}

function flushBeacon() {
  if (_queue.length === 0 || !_context) return;
  const batch = _queue.splice(0);
  const payload = JSON.stringify({ events: batch, context: _context });
  navigator.sendBeacon('/api/analytics/events', payload);
}

function getOrCreateClientId(): string {
  const KEY = 'ailin_analytics_cid';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function generateId(): string {
  // crypto.randomUUID 在 HTTPS 和 localhost 下可用
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
