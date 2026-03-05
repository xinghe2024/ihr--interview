/**
 * 页面停留追踪 Hook
 *
 * 挂载时发 view.{name}.entered，卸载时发 view.{name}.exited + duration_ms
 */
import { useEffect, useRef } from 'react';
import { track } from '../services/analytics';

export function useViewTracking(
  viewName: string,
  properties?: Record<string, string | number | boolean | null>,
) {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
    track(`view.${viewName}.entered`, properties);

    return () => {
      const durationMs = Date.now() - mountTime.current;
      track(`view.${viewName}.exited`, {
        ...properties,
        duration_ms: durationMs,
      });
    };
    // 只在 viewName 变化时重新追踪，properties 作为初始快照
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewName]);
}
