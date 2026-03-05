/**
 * API 客户端 — 前后端联调唯一入口
 * 所有请求通过 Vite proxy 转发到 http://localhost:3001
 */
import type {
  ApiResponse,
  // Auth
  LoginResponse,
  UserProfile,
  RefreshTokenResponse,
  // Candidates
  Candidate,
  CreateCandidateRequest,
  ListCandidatesParams,
  ListCandidatesResponse,
  CandidateDetailResponse,
  UpdateCandidateRequest,
  // Files
  FileUploadResponse,
  // Interviews
  CreateInterviewRequest,
  CreateInterviewResponse,
  InterviewLandingResponse,
  StartInterviewResponse,
  SendMessageRequest,
  SendMessageResponse,
  ListMessagesResponse,
  EndInterviewResponse,
  // Chat
  ChatMessageResponse,
  ChatHistoryResponse,
  // Notifications
  NotificationSummaryResponse,
  // Resume
  DetailedResume,
  KSQItem,
} from '../../shared/types';
import { track } from './analytics';

// ─── Token Storage ────────────────────────────────
const TOKEN_KEY = 'ihr_nexus_token';
const REFRESH_KEY = 'ihr_nexus_refresh_token';
const USER_KEY = 'ihr_nexus_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(token: string, refreshToken: string, user: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Logout callback (set by AuthContext) ─────────
let _onForceLogout: (() => void) | null = null;
export function setForceLogoutCallback(fn: () => void) {
  _onForceLogout = fn;
}

// ─── API Error ────────────────────────────────────
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// ─── Core Fetch ───────────────────────────────────
let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  const json: ApiResponse<T> = await res.json();

  if (json.success) {
    return json.data as T;
  }

  // Token expired → try refresh
  if (res.status === 401 && json.error?.code !== 'AUTH_INVALID_CODE') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry original request with new token
      const retryHeaders = new Headers(options.headers);
      if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      retryHeaders.set('Authorization', `Bearer ${getStoredToken()}`);
      const retryRes = await fetch(`/api${path}`, { ...options, headers: retryHeaders });
      const retryJson: ApiResponse<T> = await retryRes.json();
      if (retryJson.success) return retryJson.data as T;
    }
    // Refresh failed → force logout
    clearAuth();
    _onForceLogout?.();
    throw new ApiError('AUTH_EXPIRED', '登录已过期，请重新登录', 401);
  }

  const apiErr = new ApiError(
    json.error?.code || 'UNKNOWN',
    json.error?.message || '请求失败',
    res.status,
  );
  track('error.api.request_failed', { path, status: res.status, code: apiErr.code });
  throw apiErr;
}

async function tryRefreshToken(): Promise<boolean> {
  if (_isRefreshing) return _refreshPromise!;
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;

  _isRefreshing = true;
  _refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json: ApiResponse<RefreshTokenResponse> = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(TOKEN_KEY, json.data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _isRefreshing = false;
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

// ─── Auth API ─────────────────────────────────────
export const auth = {
  sendCode: (phone: string) =>
    apiFetch<{ sent: boolean }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  login: (phone: string, code: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  refresh: (refreshToken: string) =>
    apiFetch<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

// ─── Candidates API ───────────────────────────────
export const candidates = {
  list: (params?: Partial<ListCandidatesParams>) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    return apiFetch<ListCandidatesResponse>(`/candidates${qs ? '?' + qs : ''}`);
  },

  get: (id: string) =>
    apiFetch<CandidateDetailResponse>(`/candidates/${id}`),

  create: (data: CreateCandidateRequest) =>
    apiFetch<{ candidate: Candidate }>('/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<UpdateCandidateRequest>) =>
    apiFetch<{ candidate: Candidate }>(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/candidates/${id}`, { method: 'DELETE' }),

  parseResume: async (id: string) => {
    const res = await apiFetch<{ resume: DetailedResume; ksqItems: KSQItem[] }>(`/candidates/${id}/parse-resume`, {
      method: 'POST',
    });
    track('funnel.resume.parsed', { candidate_id: id });
    return res;
  },
};

// ─── Files API ────────────────────────────────────
export const files = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<FileUploadResponse>('/files/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

// ─── Interviews API ───────────────────────────────
export const interviews = {
  create: async (data: CreateInterviewRequest) => {
    const res = await apiFetch<CreateInterviewResponse>('/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    track('funnel.interview.created', { candidate_id: data.candidateId, channel: data.channel ?? 'TEXT' });
    return res;
  },

  getLanding: (sessionId: string) =>
    apiFetch<InterviewLandingResponse>(`/interviews/${sessionId}/landing`),

  start: (sessionId: string, channel?: 'TEXT' | 'VOICE') =>
    apiFetch<StartInterviewResponse>(`/interviews/${sessionId}/start`, {
      method: 'POST',
      body: JSON.stringify({ channel: channel || 'TEXT' }),
    }),

  sendMessage: (sessionId: string, data: SendMessageRequest) =>
    apiFetch<SendMessageResponse>(`/interviews/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMessages: (sessionId: string) =>
    apiFetch<ListMessagesResponse>(`/interviews/${sessionId}/messages`),

  end: (sessionId: string, reason: string) =>
    apiFetch<EndInterviewResponse>(`/interviews/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  uploadAudio: (sessionId: string, blob: Blob) => {
    const formData = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', new File([blob], `voice_${Date.now()}.${ext}`, { type: blob.type }));
    return apiFetch<FileUploadResponse>(`/interviews/${sessionId}/audio-upload`, {
      method: 'POST',
      body: formData,
    });
  },
};

// ─── Chat API (Sidebar Agent) ─────────────────────
export const chat = {
  send: (content: string, browserContext?: { currentUrl?: string; pageTitle?: string; selectedText?: string; candidateId?: string; candidateName?: string; candidateRole?: string }) =>
    apiFetch<ChatMessageResponse>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ content, browserContext }),
    }),

  getHistory: () =>
    apiFetch<ChatHistoryResponse>('/chat/messages'),

  clear: () =>
    apiFetch<{ cleared: boolean; deletedCount: number }>('/chat/messages', { method: 'DELETE' }),
};

// ─── Notifications API ────────────────────────────
export const notifications = {
  getSummary: () =>
    apiFetch<NotificationSummaryResponse>('/notifications/summary'),

  markRead: (id: string) =>
    apiFetch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<{ updatedCount: number }>('/notifications/read-all', { method: 'PATCH' }),
};
