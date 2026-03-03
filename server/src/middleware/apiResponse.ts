/**
 * 统一 API 响应包装
 * 对齐 shared/types.ts 中的 ApiResponse<T>
 */
import type { ApiResponse } from '@shared/types.js';

/** 构造成功或失败的 ApiResponse */
export function apiResponse<T>(
  data: T | null,
  error?: { code: string; message: string },
): ApiResponse<T> {
  if (error) {
    return { success: false, error };
  }
  return { success: true, data: data as T };
}