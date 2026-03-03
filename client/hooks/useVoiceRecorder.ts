/**
 * useVoiceRecorder — MediaRecorder 封装 hook
 * 提供按住说话（press-to-talk）的录音能力
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'error';

interface UseVoiceRecorderOptions {
    maxDurationSeconds?: number;
    minDurationSeconds?: number;
    onComplete: (blob: Blob, durationSeconds: number) => void;
    onTooShort?: () => void;
    onError?: (error: string) => void;
}

export type MicPermissionState = 'unknown' | 'granted' | 'denied' | 'prompt';

interface UseVoiceRecorderReturn {
    state: RecorderState;
    duration: number;
    error: string | null;
    isSupported: boolean;
    permissionState: MicPermissionState;
    startRecording: () => void;
    stopRecording: () => void;
    cancelRecording: () => void;
}

/** 检测浏览器支持的 MIME 类型 */
function getSupportedMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t));
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
    const { maxDurationSeconds = 120, minDurationSeconds = 1, onComplete, onTooShort, onError } = options;

    const [state, setState] = useState<RecorderState>('idle');
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const cancelledRef = useRef(false);

    const isSupported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
    const [permissionState, setPermissionState] = useState<MicPermissionState>('unknown');

    // Query mic permission state (non-blocking, graceful fallback)
    useEffect(() => {
        if (!isSupported) return;
        navigator.permissions?.query({ name: 'microphone' as PermissionName })
            .then(status => {
                setPermissionState(status.state as MicPermissionState);
                status.onchange = () => setPermissionState(status.state as MicPermissionState);
            })
            .catch(() => {}); // Not all browsers support permissions.query for microphone
    }, [isSupported]);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setDuration(0);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, [cleanup]);

    // Auto-stop at max duration
    useEffect(() => {
        if (state === 'recording' && duration >= maxDurationSeconds) {
            stopRecording();
        }
    }, [duration, maxDurationSeconds, state]);

    const startRecording = useCallback(async () => {
        if (!isSupported) {
            setError('浏览器不支持语音录制');
            setState('error');
            onError?.('浏览器不支持语音录制');
            return;
        }
        if (state === 'recording' || state === 'requesting') return;

        cancelledRef.current = false;
        setState('requesting');
        setError(null);

        try {
            // 复用已有 stream 或请求新的
            if (!streamRef.current || !streamRef.current.active) {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const mimeType = getSupportedMimeType();
            const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                if (cancelledRef.current) {
                    chunksRef.current = [];
                    return;
                }
                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
                const dur = (Date.now() - startTimeRef.current) / 1000;
                if (dur < minDurationSeconds) {
                    onTooShort?.();
                } else {
                    onComplete(blob, dur);
                }
                chunksRef.current = [];
            };

            recorder.onerror = () => {
                setError('录音出错，请重试');
                setState('error');
                cleanup();
            };

            recorder.start(250); // 每 250ms 收集一次数据
            startTimeRef.current = Date.now();
            setState('recording');
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 200);
        } catch (err: any) {
            const msg = err?.name === 'NotAllowedError'
                ? '麦克风权限被拒绝，请在浏览器设置中允许'
                : '无法访问麦克风';
            setError(msg);
            setState('error');
            onError?.(msg);
        }
    }, [isSupported, state, onComplete, onError, cleanup, maxDurationSeconds]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            cancelledRef.current = false;
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setState('idle');
    }, []);

    const cancelRecording = useCallback(() => {
        cancelledRef.current = true;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        cleanup();
        setState('idle');
    }, [cleanup]);

    return { state, duration, error, isSupported, permissionState, startRecording, stopRecording, cancelRecording };
}
