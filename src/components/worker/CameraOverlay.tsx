import React, { useEffect, useMemo, useRef, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import type { ImageQualityPreset } from '../../lib/imageOptimize';
import { optimizeImage } from '../../lib/imageOptimize';

const PENDING_KEY = 'hc_pending_capture_v1';

type CaptureType = 'BEFORE' | 'AFTER';

type Props = {
    jobId: string;
    sectionId: string;
    type: CaptureType;
    beforeImageUrl?: string;
    onCaptured: (file: File) => Promise<void> | void;
    onClose: () => void;
};

export default function CameraOverlay({
    jobId,
    sectionId,
    type,
    beforeImageUrl,
    onCaptured,
    onClose
}: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isVideoReady, setIsVideoReady] = useState(false);
    const [opacity, setOpacity] = useState(0.35);
    const [isBusy, setIsBusy] = useState(false);

    // Feature: Timestamp (Force OFF on start as requested)
    const [useTimestamp, setUseTimestamp] = useState<boolean>(false);

    // Feature: Preset & Grid (Force defaults ON start as requested)
    const [preset, setPreset] = useState<ImageQualityPreset>('HQ_1600'); // 중간(고화질)
    const [useGrid, setUseGrid] = useState<boolean>(true); // 기본 ON

    // Keep saving to localStorage if desired, but we reset on mount every time.
    useEffect(() => {
        localStorage.setItem('hc_camera_timestamp_enabled_v3', String(useTimestamp));
    }, [useTimestamp]);

    useEffect(() => {
        localStorage.setItem('hc_camera_quality_preset_v3', preset);
    }, [preset]);

    useEffect(() => {
        localStorage.setItem('hc_camera_grid_enabled_v3', String(useGrid));
    }, [useGrid]);

    // Feature: Review & Drawing
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);

    const hasGhost = type === 'AFTER' && !!beforeImageUrl;

    const markerPayload = useMemo(
        () => ({ jobId, sectionId, type, openedAt: Date.now() }),
        [jobId, sectionId, type]
    );

    const savePendingMarker = () => {
        try {
            localStorage.setItem(PENDING_KEY, JSON.stringify(markerPayload));
        } catch {
            // ignore
        }
    };

    const clearPendingMarker = () => {
        try {
            localStorage.removeItem(PENDING_KEY);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false
                });
                streamRef.current = stream;

                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    await video.play();
                }
            } catch (e) {
                console.warn('getUserMedia failed:', e);
            }
        };

        void start();

        return () => {
            try {
                streamRef.current?.getTracks().forEach((t) => t.stop());
            } catch {
                // ignore
            }
            streamRef.current = null;
        };
    }, []);

    const handleLoadedMetadata = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.videoWidth > 0 && v.videoHeight > 0) {
            setIsVideoReady(true);
        }
    };

    const takePhoto = async () => {
        const video = videoRef.current;
        if (!video) return;

        savePendingMarker();
        setIsBusy(true);
        try {
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (!w || !h) return;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, w, h);

            // --- Apply Timestamp if enabled ---
            if (useTimestamp) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                });
                const timeStr = now.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                });
                const fullText = `${dateStr} ${timeStr}`;

                // Calculate font size (approx 3% of height, min 24px)
                const fontSize = Math.max(24, Math.floor(h * 0.03));
                const margin = Math.floor(h * 0.02);

                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = Math.max(2, fontSize / 15);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                // Shadow for better visibility
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.strokeText(fullText, w - margin, h - margin);
                ctx.fillText(fullText, w - margin, h - margin);
            }
            // ----------------------------------

            // Optimize the drawn canvas blob directly
            canvas.toBlob(async (rawBlob) => {
                if (!rawBlob) {
                    setIsBusy(false);
                    return;
                }
                try {
                    const optimizedBlob = await optimizeImage(rawBlob, { preset });
                    const url = URL.createObjectURL(optimizedBlob);
                    setCapturedBlob(optimizedBlob);
                    setCapturedUrl(url);
                } catch (err) {
                    console.error("Camera optimize image failed:", err);
                } finally {
                    setIsBusy(false);
                }
            }, 'image/jpeg', 0.8);

        } catch (e) {
            console.error("takePhoto error", e);
            setIsBusy(false);
        }
    };

    const handleConfirmSave = async (blobToSave: Blob) => {
        setIsBusy(true);
        try {
            const file = new File([blobToSave], `capture_${type.toLowerCase()}.jpg`, { type: 'image/jpeg' });
            await onCaptured(file);
            clearPendingMarker();
            onClose();
        } finally {
            setIsBusy(false);
        }
    };

    const handleRetake = () => {
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        setCapturedUrl(null);
        setCapturedBlob(null);
    };

    const openPicker = () => {
        savePendingMarker();
        fileInputRef.current?.click();
    };

    const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsBusy(true);
        try {
            const optimizedBlob = await optimizeImage(file, { preset });
            const url = URL.createObjectURL(optimizedBlob);
            setCapturedBlob(optimizedBlob);
            setCapturedUrl(url);
        } catch (e) {
            console.error("File picker optimize image failed:", e);
        } finally {
            setIsBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        clearPendingMarker();
        onClose();
    };

    // --- Render: Drawing Mode ---
    if (isDrawingMode && capturedUrl) {
        return (
            <DrawingCanvas
                imageUrl={capturedUrl}
                preset={preset}
                onSave={(file) => handleConfirmSave(file)}
                onCancel={() => setIsDrawingMode(false)}
            />
        );
    }

    // --- Render: Review Mode ---
    if (capturedUrl && capturedBlob) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#000', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <img src={capturedUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                <div style={{ padding: 24, background: '#111', display: 'flex', gap: 16 }}>
                    <button onClick={handleRetake} style={{ flex: 1, padding: '16px', background: '#374151', color: '#fff', borderRadius: 8 }}>
                        재촬영
                    </button>
                    <button onClick={() => setIsDrawingMode(true)} style={{ flex: 1, padding: '16px', background: '#3b82f6', color: '#fff', borderRadius: 8 }}>
                        🖊️ 그리기
                    </button>
                    <button onClick={() => handleConfirmSave(capturedBlob)} style={{ flex: 1, padding: '16px', background: '#2563eb', color: '#fff', borderRadius: 8, fontWeight: 'bold' }}>
                        저장
                    </button>
                </div>
                {isBusy && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>저장 중...</div>}
            </div>
        );
    }

    // --- Render: Camera Mode ---
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 3000,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* 1. Video Layer (Full Screen) */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    onLoadedMetadata={handleLoadedMetadata}
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />

                {/* Grid Overlay */}
                {useGrid && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gridTemplateRows: '1fr 1fr 1fr',
                        }}
                    >
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)' }} />
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)' }} />
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }} />

                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)' }} />
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)' }} />
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }} />

                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.4)' }} />
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.4)' }} />
                        <div />
                    </div>
                )}

                {/* Ghost Overly */}
                {hasGhost && (
                    <img
                        src={beforeImageUrl}
                        alt="ghost"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity,
                            pointerEvents: 'none',
                        }}
                    />
                )}

                {/* Center Label (Improved) */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(0,0,0,0.4)',
                        color: '#f59e0b',
                        padding: '12px 28px',
                        borderRadius: '40px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        backdropFilter: 'blur(4px)',
                        border: '2px solid #f59e0b',
                        zIndex: 20,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                        pointerEvents: 'none',
                        textAlign: 'center'
                    }}
                >
                    {type === 'BEFORE' ? 'BEFORE 촬영' : 'AFTER 촬영'}
                </div>
            </div>

            {/* 2. Top Bar (Overlay) */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '8px 12px',
                    paddingTop: 'max(12px, env(safe-area-inset-top))',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                    zIndex: 100
                }}
            >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
                    <button
                        onClick={() => setUseTimestamp(!useTimestamp)}
                        style={{
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: 20,
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            border: '1px solid rgba(255,255,255,0.2)',
                            flexShrink: 0
                        }}
                    >
                        <span>🕒</span> {useTimestamp ? 'ON' : 'OFF'}
                    </button>
 
                    <button
                        onClick={() => setUseGrid(!useGrid)}
                        style={{
                            background: useGrid ? '#3b82f6' : 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: 20,
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            border: '1px solid rgba(255,255,255,0.2)',
                            flexShrink: 0
                        }}
                    >
                        <span>▦</span> 그리드
                    </button>
 
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreset(prev => {
                                if (prev === 'FAST_1024') return 'HQ_1600';
                                if (prev === 'HQ_1600') return 'MAX_1920';
                                return 'FAST_1024';
                            });
                        }}
                        style={{
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: 20,
                            fontSize: '13px',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.2)',
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {preset === 'FAST_1024' && '1024 (저)'}
                        {preset === 'HQ_1600' && '1600 (중(고))'}
                        {preset === 'MAX_1920' && '1920 (초고)'}
                    </button>
                </div>
 
                <button
                    onClick={handleClose}
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0
                    }}
                >
                    ✕
                </button>
            </div>

            {/* 3. Bottom Controls */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '24px 32px',
                    paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20
                }}
            >
                {hasGhost && (
                    <div style={{ width: '100%', maxWidth: 300, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: '#fff', fontSize: 12, opacity: 0.8 }}>0%</span>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            style={{ flex: 1, accentColor: '#3b82f6' }}
                        />
                        <span style={{ color: '#fff', fontSize: 12, opacity: 0.8 }}>100%</span>
                    </div>
                )}

                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={openPicker}
                            disabled={isBusy}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={takePhoto}
                        disabled={!isVideoReady || isBusy}
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'transparent',
                            border: '4px solid #fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                    >
                        <div
                            style={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                background: '#fff'
                            }}
                        />
                    </button>

                    <div style={{ width: 60 }} />
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            {isBusy && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    처리 중...
                </div>
            )}
        </div>
    );
}
