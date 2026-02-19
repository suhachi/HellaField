# 04-COMPONENTS

## 공통 컴포넌트, 작업자 컴포넌트, 관리자 컴포넌트, 기타 컴포넌트

_레이아웃 및 재사용 컴포넌트 / 현장 작업자용 UI 컴포넌트 / 관리자용 UI 컴포넌트 / 기타 React 컴포넌트_

총 3개 파일

---

## 📋 파일 목록

- src/components/admin/NotificationPanel.tsx
- src/components/AppLayout.tsx
- src/components/worker/CameraOverlay.tsx

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


## src/components/AppLayout.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import NotificationPanel from './admin/NotificationPanel';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { user, profile, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (profile?.role !== 'ADMIN') {
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(db, 'admin_notifications'),
            where('readAt', '==', null)
        );

        const unsub = onSnapshot(q, (snap) => {
            setUnreadCount(snap.size);
        });

        return () => unsub();
    }, [profile]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                height: '60px',
                borderBottom: '1px solid var(--hc-border)',
                display: 'flex',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--hc-text)' }}>
                        HellaCompany Log
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        {profile?.role === 'ADMIN' && (
                            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
                                <span style={{ fontSize: '20px' }}>🔔</span>
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-5px', right: '-5px',
                                        backgroundColor: '#ff4d4f', color: '#fff', fontSize: '10px',
                                        borderRadius: '10px', padding: '2px 5px', fontWeight: 700
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                        )}
                        {user && (
                            <button
                                onClick={() => logout()}
                                style={{ background: 'none', border: '1px solid var(--hc-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                            >
                                로그아웃
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {showNotifications && (
                <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}

            <main style={{ flex: 1, padding: 'var(--spacing-lg) 0' }}>
                <div className="container">
                    {children}
                </div>
            </main>

            <footer style={{
                padding: 'var(--spacing-lg) 0',
                borderTop: '1px solid var(--hc-border)',
                backgroundColor: 'var(--hc-surface)',
                marginTop: 'auto'
            }}>
                <div className="container" style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--hc-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <p>개발사: KS컴퍼니</p>
                    <p>개발자: 배종수</p>
                    <p>문의: suhachi@gmail.com</p>
                </div>
            </footer>
        </div>
    );
};

export default AppLayout;

```

---


## src/components/worker/CameraOverlay.tsx

```typescript
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CameraOverlayProps {
    beforePhotoUrl?: string; // 오버레이용 비포 사진 URL
    onCapture: (file: File) => void;
    onClose: () => void;
}

const CameraOverlay: React.FC<CameraOverlayProps> = ({ beforePhotoUrl, onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [opacity, setOpacity] = useState(0.5);
    const [showGrid, setShowGrid] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cameraStatus, setCameraStatus] = useState<'requesting' | 'ready' | 'failed'>('requesting');

    // 카메라 스트림 시작
    useEffect(() => {
        let activeStream: MediaStream | null = null;

        const startCamera = async () => {
            setCameraStatus('requesting');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("이 브라우저는 카메라를 지원하지 않습니다.");
                setCameraStatus('failed');
                return;
            }

            try {
                // 1. 후면 카메라 우선 시도 (ideal constraints)
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
                activeStream = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err: any) {
                console.warn("Environment camera failed, trying fallback:", err);
                try {
                    // 2. 실패 시 아무 카메라나 요청
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                    activeStream = fallbackStream;
                    setStream(fallbackStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream;
                    }
                } catch (fallbackErr) {
                    console.error("Camera access failed:", fallbackErr);
                    setError("카메라 접근 권한이 없거나 오류가 발생했습니다.");
                    setCameraStatus('failed');
                }
            }
        };

        startCamera();

        // Cleanup
        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 비디오 메타데이터 로드 완료 체크 (Video Ready Gate)
    const handleVideoLoaded = () => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
            setCameraStatus('ready');
        }
    };

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || cameraStatus !== 'ready') return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // 캔버스 크기를 비디오 해상도에 맞춤
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 현재 비디오 프레임 그리기
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Blob 변환 및 파일 생성
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
                // 중요: 스트림 정지 (선택 사항, 상위 컴포넌트 정책에 따름)
            }
        }, 'image/jpeg', 0.9); // 품질 0.9
    }, [onCapture, cameraStatus]);

    // 파일 선택 핸들러 (Fallback)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Fallback 발생 시 상태 보존 마커 저장 (필요 시 context에서 주입받아야 하나, 여기서는 심플하게)
            // 실제 구현에서는 상위에서 처리하거나 여기서 localStorage에 마커를 남깁니다.
            // STEP 3-4 요구사항: "네이티브 선택창 열기 전에 localStorage에 pending 마커 저장"
            // 하지만 input click 직전을 잡기가 어려우므로, 상위 컴포넌트에서 handleUploadClick 시점에 저장하는 것이 더 정확하지만
            // 여기서는 심플하게 캡처 콜백이 불리기 전에 마커를 저장하는 것은 의미가 적으므로(이미 파일 선택 후임),
            // "복귀 시 상태 복원"은 상위 컴포넌트(WorkerJobDetailPage)의 useEffect에서 처리합니다.
            onCapture(file);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#000', zIndex: 3000, display: 'flex', flexDirection: 'column'
        }}>
            {/* 상단 닫기 버튼 영역 */}
            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 20 }}>
                <button onClick={onClose} style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', border: 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '14px' }}>
                    ✕ 닫기
                </button>
            </div>

            {/* 메인 뷰 영역 */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>

                {/* 1. 라이브 카메라 피드 */}
                {!error ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={handleVideoLoaded}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
                        <p style={{ marginBottom: '10px' }}>⚠️ {error}</p>
                        <p style={{ fontSize: '12px', color: '#ccc' }}>아래 '파일 선택' 버튼을 이용해주세요.</p>
                    </div>
                )}

                {/* 상태 인디케이터 */}
                {cameraStatus === 'requesting' && !error && (
                    <div style={{ position: 'absolute', color: 'white', zIndex: 50 }}>카메라 연결 중...</div>
                )}

                {/* 2. 캔버스 (캡처용, 숨김) */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* 3. 그리드 오버레이 */}
                {showGrid && !error && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr',
                        pointerEvents: 'none', zIndex: 10
                    }}>
                        {[...Array(9)].map((_, i) => (
                            <div key={i} style={{ border: '0.5px solid rgba(255,255,255,0.3)' }} />
                        ))}
                    </div>
                )}

                {/* 4. 고스트 이미지 오버레이 (비포 사진) */}
                {beforePhotoUrl && !error && (
                    <img
                        src={beforePhotoUrl}
                        alt="Ghost Overlay"
                        style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            objectFit: 'cover', opacity: opacity, pointerEvents: 'none', zIndex: 15
                        }}
                    />
                )}
            </div>

            {/* 하단 컨트롤 바 */}
            <div style={{
                padding: '20px', backgroundColor: 'rgba(0,0,0,0.8)',
                display: 'flex', flexDirection: 'column', gap: '15px'
            }}>
                {/* 투명도 슬라이더 */}
                {beforePhotoUrl && !error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#fff', fontSize: '12px', minWidth: '50px' }}>투명도</span>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            style={{ flex: 1 }}
                        />
                    </div>
                )}

                {/* 버튼 그룹 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* 그리드 토글 */}
                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        disabled={!!error}
                        style={{
                            color: '#fff', background: 'none', border: '1px solid #fff',
                            padding: '8px 12px', borderRadius: '4px', fontSize: '12px', opacity: error ? 0.3 : 1
                        }}>
                        {showGrid ? '그리드 OFF' : '그리드 ON'}
                    </button>

                    {/* 촬영 버튼 (메인) */}
                    {!error ? (
                        <button
                            onClick={handleCapture}
                            disabled={cameraStatus !== 'ready'}
                            className="btn-primary"
                            style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                border: `4px solid ${cameraStatus === 'ready' ? '#fff' : '#666'}`,
                                backgroundColor: 'transparent',
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                opacity: cameraStatus === 'ready' ? 1 : 0.5,
                                cursor: cameraStatus === 'ready' ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: cameraStatus === 'ready' ? '#fff' : '#ccc' }} />
                        </button>
                    ) : (
                        // 에러 시 파일 선택 Fallback
                        <label className="btn-primary" style={{ cursor: 'pointer', padding: '12px 24px', borderRadius: '8px' }}>
                            파일 선택
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        </label>
                    )}

                    {/* 파일 선택 (보조) - 카메라가 되어도 갤러리 선택용으로 유지 */}
                    {!error && (
                        <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff' }}>
                            <span style={{ fontSize: '24px' }}>🖼️</span>
                            <span style={{ fontSize: '10px' }}>갤러리</span>
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraOverlay;

```

---

