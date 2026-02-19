import React, { useEffect, useMemo, useRef, useState } from 'react';

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

    const captureToFile = async () => {
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

            const blob: Blob | null = await new Promise((resolve) =>
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
            );
            if (!blob) return;

            const file = new File([blob], `capture_${type.toLowerCase()}.jpg`, { type: 'image/jpeg' });
            await onCaptured(file);

            clearPendingMarker();
            onClose();
        } finally {
            setIsBusy(false);
        }
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
            await onCaptured(file);
            clearPendingMarker();
            onClose();
        } finally {
            setIsBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        clearPendingMarker();
        onClose();
    };

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
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </div>

            {/* 2. Top Bar */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 20px',
                    paddingTop: 'max(16px, env(safe-area-inset-top))',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                    zIndex: 20
                }}
            >
                <div
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        padding: '6px 16px',
                        borderRadius: 20,
                        fontSize: '14px',
                        fontWeight: 600,
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {type === 'BEFORE' ? 'BEFORE 촬영' : 'AFTER 촬영'}
                </div>

                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        right: 20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        lineHeight: 1
                    }}
                >
                    &times;
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
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20
                }}
            >
                {/* Opacity Slider (Only for Ghost) */}
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
                            style={{ flex: 1, accentColor: '#3857F5' }}
                        />
                        <span style={{ color: '#fff', fontSize: 12, opacity: 0.8 }}>100%</span>
                    </div>
                )}

                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left: Gallery Picker */}
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

                    {/* Center: Shutter Button */}
                    <button
                        onClick={captureToFile}
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
                                background: '#fff',
                                transition: 'transform 0.1s'
                            }}
                        />
                    </button>

                    {/* Right: Spacer for balance */}
                    <div style={{ width: 60 }} />
                </div>

                {/* Hidden Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            {/* Busy Indicator */}
            {isBusy && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                    }}
                >
                    저장 중...
                </div>
            )}
        </div>
    );
}
