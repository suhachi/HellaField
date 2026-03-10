# 04-COMPONENTS

## 공통 컴포넌트, 작업자 컴포넌트, 관리자 컴포넌트, 기타 컴포넌트

_레이아웃 및 재사용 컴포넌트 / 현장 작업자용 UI 컴포넌트 / 관리자용 UI 컴포넌트 / 기타 React 컴포넌트_

총 5개 파일

---

## 📋 파일 목록

- src/components/admin/NotificationPanel.tsx
- src/components/admin/ReportTemplate.tsx
- src/components/AppLayout.tsx
- src/components/worker/CameraOverlay.tsx
- src/components/worker/DrawingCanvas.tsx

---

## 📦 전체 코드


## src/components/admin/NotificationPanel.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { markRead } from '../../lib/db';
import type { AdminNotification } from '../../lib/db';
import { useNavigate } from 'react-router-dom';

interface NotificationPanelProps {
    onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(
            collection(db, 'admin_notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminNotification)));
        });

        return () => unsub();
    }, []);

    const handleItemClick = async (n: AdminNotification) => {
        if (!n.readAt) {
            await markRead(n.id);
        }
        navigate(`/admin/jobs/${n.jobId}`);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: '64px', right: '16px', width: '300px', maxHeight: '400px',
            backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '12px',
            zIndex: 2000, overflowY: 'auto', border: '1px solid var(--hc-border)'
        }}>
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--hc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>알림 인박스</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.length === 0 && (
                    <p style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--hc-muted)', fontSize: '13px' }}>알림이 없습니다.</p>
                )}
                {notifications.map(n => (
                    <div
                        key={n.id}
                        onClick={() => handleItemClick(n)}
                        style={{
                            padding: '12px var(--spacing-md)', borderBottom: '1px solid var(--hc-border)',
                            cursor: 'pointer', backgroundColor: n.readAt ? '#fff' : '#f0f4ff',
                            transition: 'background 0.2s'
                        }}
                    >
                        <p style={{ fontSize: '13px', fontWeight: n.readAt ? 400 : 700, color: '#333' }}>
                            {n.siteTitle} 제출 완료
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--hc-muted)', marginTop: '4px' }}>
                            {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : '방금 전'}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationPanel;

```

---


## src/components/admin/ReportTemplate.tsx

```typescript
import React, { forwardRef } from 'react';
import { Job, Section, Photo } from '../../lib/db';

type Props = {
    job: Job;
    sections: Section[];
    photosBySection: Record<string, Photo[]>;
};

const ReportTemplate = forwardRef<HTMLDivElement, Props>(({ job, sections, photosBySection }, ref) => {
    // A4 Width: 210mm (~794px at 96dpi), Height: 297mm (~1123px)
    // We'll use a fixed width container for consistent rendering
    return (
        <div
            ref={ref}
            style={{
                width: '794px',
                padding: '40px',
                background: '#fff',
                color: '#000',
                position: 'absolute',
                left: '-9999px',
                top: 0
            }}
        >
            {/* Header */}
            <div style={{ borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>현장 작업 보고서</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#555' }}>
                    <div>
                        <strong>현장명:</strong> {job.siteTitle}
                    </div>
                    <div>
                        <strong>작업일:</strong> {typeof job.date === 'string' ? job.date : (job.date as any)?.toDate?.().toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {sections.map((section) => {
                    const photos = photosBySection[section.id] || [];
                    const beforePhotos = photos.filter(p => p.type === 'BEFORE');
                    const afterPhotos = photos.filter(p => p.type === 'AFTER');

                    // Pair photos logic: Match BEFORE index with AFTER index
                    const maxCount = Math.max(beforePhotos.length, afterPhotos.length);
                    const rows = Array.from({ length: maxCount }).map((_, i) => ({
                        before: beforePhotos[i],
                        after: afterPhotos[i]
                    }));

                    if (rows.length === 0) return null;

                    return (
                        <div key={section.id} style={{ breakInside: 'avoid' }}>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                borderLeft: '4px solid #3b82f6',
                                paddingLeft: '10px',
                                marginBottom: '15px',
                                background: '#f0f9ff',
                                padding: '8px 12px'
                            }}>
                                {section.title}
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {rows.map((row, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '15px' }}>
                                        {/* BEFORE */}
                                        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: '#f97316',
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                textAlign: 'center'
                                            }}>
                                                BEFORE
                                            </div>
                                            <div style={{ width: '100%', height: '240px', background: '#eee' }}>
                                                {row.before ? (
                                                    <img
                                                        src={row.before.downloadUrl}
                                                        alt="Before"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                                                        (사진 없음)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* AFTER */}
                                        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: '#3b82f6',
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                textAlign: 'center'
                                            }}>
                                                AFTER
                                            </div>
                                            <div style={{ width: '100%', height: '240px', background: '#eee' }}>
                                                {row.after ? (
                                                    <img
                                                        src={row.after.downloadUrl}
                                                        alt="After"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                                                        (사진 없음)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '50px', borderTop: '1px solid #ddd', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
                HellaCompany Field Log System
            </div>
        </div>
    );
});

export default ReportTemplate;

```

---


## src/components/AppLayout.tsx

```typescript
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { LogOut, Home, Bell } from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = location.pathname.startsWith('/admin');
    const isWorker = location.pathname.startsWith('/worker');

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--hc-bg)' }}>
            {/* 전역 헤더 */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 1000,
                backgroundColor: '#fff', borderBottom: '1px solid var(--hc-border)',
                padding: '0 var(--spacing-md)', height: '60px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div
                    onClick={() => navigate(isAdmin ? '/admin/jobs' : isWorker ? '/worker/jobs' : '/')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <div style={{ backgroundColor: 'var(--hc-primary)', padding: '4px', borderRadius: '4px' }}>
                        <Home size={18} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--hc-primary)', letterSpacing: '-0.5px' }}>
                        HELLA FIELD
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin/notifications')}
                            style={{ position: 'relative', padding: '8px' }}
                        >
                            <Bell size={20} color="var(--hc-muted)" />
                        </button>
                    )}
                    {user && (
                        <button
                            onClick={() => signOut()}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--hc-danger)', fontWeight: 600 }}
                        >
                            <LogOut size={16} />
                            로그아웃
                        </button>
                    )}
                </div>
            </header>

            {/* 메인 콘텐츠 영역 (푸터 패딩 확보: 80px) */}
            <main style={{ flex: 1, padding: 'var(--spacing-md)', paddingBottom: '100px' }}>
                {children}
            </main>

            {/* 전역 푸터 (P1: 개발자 정보) */}
            <footer style={{
                backgroundColor: '#fff', borderTop: '1px solid var(--hc-border)',
                padding: '24px var(--spacing-md)', textAlign: 'center',
                fontSize: '11px', color: 'var(--hc-muted)', lineHeight: '1.6'
            }}>
                <p>개발사 KS컴퍼니 | 개발자 배종수 | 문의 suhachi@gmail.com</p>
                <p style={{ marginTop: '4px', opacity: 0.7 }}>© 2026 HellaCompany. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default AppLayout;

```

---


## src/components/worker/CameraOverlay.tsx

```typescript
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';

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

    // Feature: Timestamp
    const [useTimestamp, setUseTimestamp] = useState(true);

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

            const blob: Blob | null = await new Promise((resolve) =>
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
            );
            if (!blob) return;

            // Instead of auto-saving, go to Review Mode
            const url = URL.createObjectURL(blob);
            setCapturedBlob(blob);
            setCapturedUrl(url);

        } finally {
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

        // For file upload, we can also offer review/draw, OR just upload directly.
        // Let's go to review mode to allow drawing on uploaded files too!
        setIsBusy(true);
        try {
            const blob = file.slice(0, file.size, file.type);
            const url = URL.createObjectURL(blob);
            setCapturedBlob(blob);
            setCapturedUrl(url);
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
                {/* Timestamp Toggle Button (Left) */}
                <button
                    onClick={() => setUseTimestamp(!useTimestamp)}
                    style={{
                        position: 'absolute',
                        left: 20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: useTimestamp ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    {useTimestamp ? '🕒 ON' : '🕒 OFF'}
                </button>

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

```

---


## src/components/worker/DrawingCanvas.tsx

```typescript
import React, { useEffect, useRef, useState } from 'react';

type Props = {
    imageUrl: string;
    onSave: (file: File) => void;
    onCancel: () => void;
};

export default function DrawingCanvas({ imageUrl, onSave, onCancel }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState<'#ef4444' | '#ffffff'>('#ef4444'); // Red-500 or White
    const [lineWidth] = useState(5);
    const [imageLoaded, setImageLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Initialize canvas with image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            imgRef.current = img;
            const canvas = canvasRef.current;
            if (canvas) {
                // Set canvas size to match image resolution
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw image initially
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                }
                setImageLoaded(true);
            }
        };
    }, [imageUrl]);

    const getPoint = (e: React.MouseEvent | React.TouchEvent | PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // Map client coords to canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const { x, y } = getPoint(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth * (canvasRef.current!.width / 1000); // Scale line width relative to image size
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        // Prevent scrolling on touch
        if (e.cancelable) e.preventDefault();

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const { x, y } = getPoint(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.closePath();
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "annotated_image.jpg", { type: "image/jpeg" });
                onSave(file);
            }
        }, 'image/jpeg', 0.92);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && img && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3050, background: '#000',
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Toolbar */}
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1f2937',
                color: '#fff'
            }}>
                <button onClick={onCancel} style={{ fontSize: '14px' }}>취소</button>
                <div style={{ fontWeight: 'bold' }}>사진 편집</div>
                <button onClick={handleSave} style={{ color: '#3b82f6', fontWeight: 'bold' }}>저장</button>
            </div>

            {/* Canvas Area */}
            <div style={{
                flex: 1,
                position: 'relative',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                touchAction: 'none' // Important for drawing
            }}>
                {!imageLoaded && <div style={{ color: '#fff' }}>이미지 로딩 중...</div>}
                <canvas
                    ref={canvasRef}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: imageLoaded ? 'block' : 'none'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Tools */}
            <div style={{
                padding: '20px',
                background: '#1f2937',
                display: 'flex',
                justifyContent: 'center',
                gap: '20px'
            }}>
                <button
                    onClick={() => setColor('#ef4444')}
                    style={{
                        width: 40, height: 40, borderRadius: '50%', background: '#ef4444',
                        border: color === '#ef4444' ? '3px solid #fff' : 'none'
                    }}
                />
                <button
                    onClick={() => setColor('#ffffff')}
                    style={{
                        width: 40, height: 40, borderRadius: '50%', background: '#ffffff',
                        border: color === '#ffffff' ? '3px solid #3b82f6' : 'none'
                    }}
                />
                <div style={{ width: 1, background: '#4b5563', margin: '0 10px' }} />
                <button
                    onClick={handleClear}
                    style={{
                        padding: '8px 16px', background: '#374151', color: '#fff',
                        borderRadius: '8px', fontSize: '14px'
                    }}
                >
                    초기화
                </button>
            </div>
        </div>
    );
}

```

---

