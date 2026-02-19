# 05-PAGES

## 인증 페이지, 작업자 페이지, 관리자 페이지

_로그인 및 권한 오류 페이지 / 현장 작업자 작업 관리 페이지 / 관리자 대시보드 및 관리 페이지_

총 7개 파일

---

## 📋 파일 목록

- src/pages/admin/AdminJobDetailPage.tsx
- src/pages/admin/AdminJobsPage.tsx
- src/pages/admin/AdminNotificationsPage.tsx
- src/pages/LoginPage.tsx
- src/pages/UnauthorizedPage.tsx
- src/pages/worker/WorkerJobDetailPage.tsx
- src/pages/worker/WorkerJobsPage.tsx

---

## 📦 전체 코드


## src/pages/admin/AdminJobDetailPage.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    deleteJobTotal
} from '../../lib/db';
import type { Job, Section, Photo } from '../../lib/db';
import { deletePhoto } from '../../services/photoService';
import { collection, query, onSnapshot, orderBy, doc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const AdminJobDetailPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [photosMap, setPhotosMap] = useState<Record<string, Photo[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!jobId) return;

        // 1. Job 실시간 리스너
        const unsubJob = onSnapshot(doc(db, 'jobs', jobId), (docSnap) => {
            if (docSnap.exists()) {
                setJob({ id: docSnap.id, ...docSnap.data() } as Job);
            } else {
                alert('존재하지 않는 작업입니다.');
                navigate('/admin/jobs');
            }
        });

        // 2. Sections 실시간 리스너 (서브컬렉션)
        const qSections = query(collection(db, 'jobs', jobId, 'sections'), orderBy('order', 'asc'));
        const unsubSections = onSnapshot(qSections, (snap) => {
            const sectionsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
            setSections(sectionsData);

            // 3. 사진 구독
            const unsubPhotosList: (() => void)[] = [];
            sectionsData.forEach(section => {
                const qPhotos = query(
                    collection(db, 'jobs', jobId, 'sections', section.id, 'photos'),
                    where('deletedAt', '==', null)
                );
                const unsub = onSnapshot(qPhotos, (photoSnap) => {
                    setPhotosMap(prev => ({
                        ...prev,
                        [section.id]: photoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Photo))
                    }));
                });
                unsubPhotosList.push(unsub);
            });

            setLoading(false);
            return () => {
                unsubPhotosList.forEach(u => u());
            };
        });

        return () => {
            unsubJob();
            unsubSections();
        };
    }, [jobId, navigate]);

    // 파일 다운로드 핸들러
    const handleDownload = async (photo: Photo, sectionTitle: string, index: number) => {
        try {
            const downloadSrc = photo.downloadUrl || `https://firebasestorage.googleapis.com/v0/b/${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(photo.storagePath)}?alt=media`;
            const response = await fetch(downloadSrc);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // 파일명 생성 규칙: {siteTitle}__{sectionTitle}__{BEFORE|AFTER}__{index}.jpg
            const safeSiteTitle = job?.siteTitle.replace(/[\/\\?%*:|"<>]/g, '_');
            const safeSectionTitle = sectionTitle.replace(/[\/\\?%*:|"<>]/g, '_');
            const fileName = `${safeSiteTitle}__${safeSectionTitle}__${photo.type}__${index + 1}.jpg`;

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('다운로드 실패');
        }
    };

    const handleDeletePhoto = async (photo: Photo) => {
        if (!window.confirm('관리자 권한으로 사진을 완전 삭제하시겠습니까?')) return;
        if (!jobId) return;
        try {
            await deletePhoto(jobId, photo.sectionId, photo.id, photo.storagePath);
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleDeleteJob = async () => {
        if (!window.confirm('정말 이 작업을 완전히 삭제하시겠습니까? 관련 모든 사진과 데이터가 제거됩니다.')) return;
        if (!window.confirm('다시 한번 확인합니다. 삭제 후에는 복구가 불가능합니다. 계속하시겠습니까?')) return;

        if (!jobId) return;
        try {
            setLoading(true);
            await deleteJobTotal(jobId);
            alert('작업이 삭제되었습니다.');
            navigate('/admin/jobs');
        } catch (error) {
            console.error(error);
            alert('삭제 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    if (loading) return <div className="container">로딩 중...</div>;
    if (!job) return null;

    return (
        <div className="container" style={{ paddingBottom: '60px' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>작업 상세 정보</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleDeleteJob}
                        style={{
                            padding: 'var(--spacing-xs) var(--spacing-md)',
                            backgroundColor: 'var(--hc-danger)',
                            color: 'white',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        삭제
                    </button>
                    <button
                        onClick={() => navigate('/admin/jobs')}
                        style={{
                            padding: 'var(--spacing-xs) var(--spacing-md)',
                            backgroundColor: 'var(--hc-primary)',
                            color: 'white',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        목록으로
                    </button>
                </div>
            </header>

            <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)' }}>{String(job.date)}</p>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{job.siteTitle}</h2>
                <div style={{ marginTop: '8px' }}>
                    <span className="badge badge-success">제출 완료</span>
                </div>
            </div>

            {/* 섹션 리스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {sections.map(section => {
                    const befores = (photosMap[section.id] || []).filter(p => p.type === 'BEFORE');
                    const afters = (photosMap[section.id] || []).filter(p => p.type === 'AFTER');

                    return (
                        <div key={section.id} className="card" style={{ padding: 0 }}>
                            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--hc-border)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{section.title}</h3>
                                {section.description && (
                                    <p style={{ marginTop: '8px', fontSize: '14px', color: '#666', whiteSpace: 'pre-wrap' }}>
                                        {section.description}
                                    </p>
                                )}
                            </div>

                            <div style={{ padding: 'var(--spacing-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                {/* BEFORE */}
                                <div>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--hc-muted)', marginBottom: '8px' }}>BEFORE</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {befores.map((p, i) => (
                                            <div key={p.id} style={{ position: 'relative' }}>
                                                <img
                                                    src={p.downloadUrl || `https://firebasestorage.googleapis.com/v0/b/${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(p.storagePath)}?alt=media`}
                                                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                                    onClick={() => handleDownload(p, section.title, i)}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = 'https://placehold.co/100x100?text=Error';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleDeletePhoto(p)}
                                                    style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', padding: '2px 4px', fontSize: '10px' }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AFTER */}
                                <div>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--hc-muted)', marginBottom: '8px' }}>AFTER</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {afters.map((p, i) => (
                                            <div key={p.id} style={{ position: 'relative' }}>
                                                <img
                                                    src={p.downloadUrl || `https://firebasestorage.googleapis.com/v0/b/${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(p.storagePath)}?alt=media`}
                                                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                                    onClick={() => handleDownload(p, section.title, i)}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = 'https://placehold.co/100x100?text=Error';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleDeletePhoto(p)}
                                                    style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', padding: '2px 4px', fontSize: '10px' }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p style={{ marginTop: '20px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                * 사진을 클릭하면 지정된 명명 규칙으로 원본 파일이 다운로드됩니다.
            </p>
        </div>
    );
};

export default AdminJobDetailPage;

```

---


## src/pages/admin/AdminJobsPage.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { deleteJobTotal } from '../../lib/db';
import type { Job } from '../../lib/db';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

const AdminJobsPage: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleDelete = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation();
        if (!window.confirm('이 작업을 완전히 삭제하시겠습니까? 사진 파일 포함 모든 정보가 제거됩니다.')) return;

        try {
            setLoading(true);
            await deleteJobTotal(jobId);
            alert('삭제 완료되었습니다.');
        } catch (error) {
            console.error(error);
            alert('삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const q = query(
            collection(db, 'jobs'),
            where('status', '==', 'SUBMITTED'),
            orderBy('submittedAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            setJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    if (loading) return <div className="container">로딩 중...</div>;

    return (
        <div className="container">
            <h2 style={{ fontSize: '20px', marginBottom: 'var(--spacing-lg)' }}>제출된 작업 목록</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {jobs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--hc-muted)', padding: '40px 0' }}>제출된 작업이 없습니다.</p>}
                {jobs.map(job => (
                    <div
                        key={job.id}
                        className="card"
                        onClick={() => navigate(`/admin/jobs/${job.id}`)}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            hover: { borderColor: 'var(--hc-blue-500)' }
                        } as any}
                    >
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{job.siteTitle}</h3>
                            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '8px' }}>
                                제출일: {job.submittedAt?.toDate ? job.submittedAt.toDate().toLocaleDateString() : '알 수 없음'}
                            </p>
                        </div>
                        <button
                            onClick={(e) => handleDelete(e, job.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--hc-danger)',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminJobsPage;

```

---


## src/pages/admin/AdminNotificationsPage.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AdminNotification } from '../../lib/db';
import AppLayout from '../../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';

const AdminNotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(
            collection(db, 'admin_notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminNotification[]);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const markAsRead = async (id: string) => {
        await updateDoc(doc(db, 'admin_notifications', id), { readAt: new Date() });
    };

    const markAllAsRead = async () => {
        const batch = writeBatch(db);
        notifications.filter(n => !n.readAt).forEach(n => {
            batch.update(doc(db, 'admin_notifications', n.id), { readAt: new Date() });
        });
        await batch.commit();
    };

    return (
        <AppLayout>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>알림함</h2>
                <button
                    onClick={() => navigate('/admin/jobs')}
                    style={{
                        padding: 'var(--spacing-xs) var(--spacing-md)',
                        backgroundColor: 'var(--hc-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    목록으로
                </button>
            </header>

            <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>새로운 작업 제출 내역입니다.</p>
                {notifications.some(n => !n.readAt) && (
                    <button
                        onClick={markAllAsRead}
                        style={{ fontSize: '0.75rem', color: 'var(--hc-primary)', fontWeight: 'bold' }}
                    >
                        모두 읽음 표시
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {loading ? (
                    <p>불러오는 중...</p>
                ) : notifications.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                        <Bell size={48} color="#999" style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
                        <p style={{ color: '#666' }}>새로운 알림이 없습니다.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            className="card"
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                opacity: n.readAt ? 0.6 : 1,
                                borderLeft: n.readAt ? 'none' : '4px solid var(--hc-primary)'
                            }}
                        >
                            <div
                                style={{ flex: 1, cursor: 'pointer' }}
                                onClick={() => {
                                    markAsRead(n.id);
                                    navigate(`/admin/jobs/${n.jobId}`);
                                }}
                            >
                                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{n.siteTitle} 현장 제출</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#666' }}>
                                    <Clock size={12} />
                                    <span>{format(n.createdAt.toDate(), 'yyyy-MM-dd HH:mm')}</span>
                                </div>
                            </div>

                            {!n.readAt && (
                                <button
                                    onClick={() => markAsRead(n.id)}
                                    style={{ color: 'var(--hc-primary)', padding: '8px' }}
                                >
                                    <Check size={20} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </AppLayout>
    );
};

export default AdminNotificationsPage;

```

---


## src/pages/LoginPage.tsx

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, authReady } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    // Self-healing: Redirect if already logged in
    React.useEffect(() => {
        const checkAuth = async () => {
            await authReady;
            const currentUser = auth.currentUser;

            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const role = userDoc.data().role;
                        const targetPath = role === 'ADMIN' ? '/admin/jobs' : '/worker/jobs';
                        navigate(targetPath, { replace: true });
                    } else {
                        navigate('/unauthorized', { replace: true });
                    }
                } catch (err) {
                    console.error("Session check failed:", err);
                    setCheckingSession(false);
                }
            } else {
                setCheckingSession(false);
            }
        };
        checkAuth();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authReady; // Ensure persistence is set before sign in
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 역할 확인
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const role = userDoc.data().role;
                if (role === 'ADMIN') {
                    navigate('/admin/jobs', { replace: true });
                } else {
                    navigate('/worker/jobs', { replace: true });
                }
            } else {
                navigate('/unauthorized', { replace: true });
            }
        } catch (err: any) {
            console.error(err);
            setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
                <p style={{ color: 'var(--hc-muted)' }}>세션 확인 중...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
            <div className="card">
                <h2 style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>로그인</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '14px' }}>이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hc-border)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '14px' }}>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hc-border)' }}
                        />
                    </div>
                    {error && <p style={{ color: 'var(--hc-danger)', fontSize: '14px' }}>{error}</p>}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;

```

---


## src/pages/UnauthorizedPage.tsx

```typescript
import React from 'react';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
            <div className="card">
                <h2 style={{ color: 'var(--hc-danger)', marginBottom: 'var(--spacing-md)' }}>권한 없음</h2>
                <p style={{ color: 'var(--hc-muted)', marginBottom: 'var(--spacing-lg)' }}>
                    등록된 프로필이 없습니다. 관리자에게 문의하세요.
                </p>
                <button onClick={handleLogout} className="btn-primary">로그아웃</button>
            </div>
        </div>
    );
};

export default UnauthorizedPage;

```

---


## src/pages/worker/WorkerJobDetailPage.tsx

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getJob,
    listSections,
    listPhotos,
    addSection,
    updateSection,
    updateJobStatus
} from '../../lib/db';
import type { Job, Section, Photo } from '../../lib/db';
import { uploadPhoto, deletePhoto } from '../../services/photoService';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CameraOverlay from '../../components/worker/CameraOverlay';

const WorkerJobDetailPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [photosMap, setPhotosMap] = useState<Record<string, Photo[]>>({});
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // 카메라 관련 상태
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraTarget, setCameraTarget] = useState<{ sectionId: string, type: 'BEFORE' | 'AFTER' } | null>(null);

    useEffect(() => {
        if (!jobId) return;

        // 1. Job 실시간 리스너
        const unsubJob = onSnapshot(doc(db, 'jobs', jobId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setJob({ id: docSnap.id, ...docSnap.data() } as Job);
                } else {
                    alert('존재하지 않는 작업입니다.');
                    navigate('/worker/jobs');
                }
            },
            (error) => {
                console.error("Job subscription error:", error);
                // 권한 에러 등이 아니면 리다이렉트 하지 않음 (일시적 네크워크 장애 등 방어)
                if (error.code === 'permission-denied') {
                    alert('접근 권한이 없습니다.');
                    navigate('/worker/jobs');
                }
            }
        );

        // 2. Sections 실시간 리스너 (서브컬렉션)
        const qSections = query(collection(db, 'jobs', jobId, 'sections'), orderBy('order', 'asc'));
        const unsubSections = onSnapshot(qSections, (snap) => {
            const sectionsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
            setSections(sectionsData);

            // 3. 사진 구독
            const unsubPhotosList: (() => void)[] = [];

            sectionsData.forEach(section => {
                const qPhotos = query(
                    collection(db, 'jobs', jobId, 'sections', section.id, 'photos'),
                    where('deletedAt', '==', null)
                );
                const unsub = onSnapshot(qPhotos, (photoSnap) => {
                    setPhotosMap(prev => ({
                        ...prev,
                        [section.id]: photoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Photo))
                    }));
                }, (error) => {
                    console.error(`Photos subscription error for section ${section.id}:`, error);
                });
                unsubPhotosList.push(unsub);
            });

            setLoading(false);

            return () => {
                unsubPhotosList.forEach(u => u());
            }
        }, (error) => {
            console.error("Sections subscription error:", error);
        });

        return () => {
            unsubJob();
            unsubSections();
        };
    }, [jobId, navigate]);

    // 복귀 시 상태 복원 (Pending Capture Restoration)
    useEffect(() => {
        const pending = localStorage.getItem('hc_pending_capture');
        if (pending) {
            try {
                const { jobId: savedJobId, sectionId, type } = JSON.parse(pending);
                if (savedJobId === jobId) {
                    setCameraTarget({ sectionId, type });
                    setIsCameraOpen(true);
                }
            } catch (e) {
                console.error("Failed to parse pending capture", e);
            }
        }
    }, [jobId]);

    const handleAddSection = async () => {
        const title = prompt('사진 제목을 입력하세요 (예: 거실 창틀, 주방 후드)');
        if (!title || !jobId) return;
        await addSection(jobId, title, sections.length);
    };

    const handleUpdateDescription = async (sectionId: string, text: string) => {
        if (!jobId) return;
        await updateSection(jobId, sectionId, { description: text });
    };

    const handleUploadClick = (sectionId: string, type: 'BEFORE' | 'AFTER') => {
        if (type === 'AFTER') {
            const hasBefore = photosMap[sectionId]?.some(p => p.type === 'BEFORE');
            if (!hasBefore) {
                alert('에프터 사진을 촬영하려면 먼저 비포 사진이 1장 이상 있어야 합니다.');
                return;
            }
        }

        // 상태 보존 마커 저장 (네이티브 카메라/파일 선택으로 튕길 경우 대비)
        localStorage.setItem('hc_pending_capture', JSON.stringify({ jobId, sectionId, type, ts: Date.now() }));

        setCameraTarget({ sectionId, type });
        setIsCameraOpen(true);
    };

    const handleCapture = async (file: File) => {
        if (!jobId || !cameraTarget) return;

        // 카메라 닫기 전 업로드 시작 (UX: 촬영 직후 로딩 표시)
        setIsCameraOpen(false);
        setIsUploading(true); // 로딩 시작
        localStorage.removeItem('hc_pending_capture'); // 마커 제거

        const { sectionId, type } = cameraTarget;

        try {
            await uploadPhoto(file, jobId, sectionId, type);
        } catch (error: any) {
            console.error(error);
            alert(`업로드 실패: ${error.message || '다시 시도해주세요.'}`);
        } finally {
            setIsUploading(false); // 로딩 종료
            window.onbeforeunload = null; // 보호 해제
        }
    };

    // 업로드 중 탭 닫기 방지
    useEffect(() => {
        if (isUploading) {
            window.onbeforeunload = (e) => {
                e.preventDefault();
                e.returnValue = '';
            };
        } else {
            window.onbeforeunload = null;
        }
        return () => { window.onbeforeunload = null; };
    }, [isUploading]);

    const handleDeletePhoto = async (photo: Photo) => {
        if (job?.status === 'SUBMITTED') return;
        if (!window.confirm('사진을 삭제하시겠습니까?')) return;
        if (!jobId) return;
        try {
            await deletePhoto(jobId, photo.sectionId, photo.id, photo.storagePath);
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleStatusUpdate = async (newStatus: 'BEFORE_DONE' | 'SUBMITTED') => {
        if (!jobId) return;

        try {
            if (newStatus === 'SUBMITTED') {
                if (!window.confirm('관리자에게 제출하시겠습니까? 제출 후에는 수정이 불가능합니다.')) return;

                // 관리자 알림 생성
                await addDoc(collection(db, 'admin_notifications'), {
                    type: 'JOB_SUBMITTED',
                    jobId: jobId,
                    siteTitle: job?.siteTitle,
                    createdAt: serverTimestamp(),
                    readAt: null
                });
            }
            await updateJobStatus(jobId, newStatus);
        } catch (error: any) {
            console.error("updateJobStatus failed", error);
            alert(`상태 변경에 실패했습니다: ${error.message || '권한이 없거나 서버 오류가 발생했습니다.'}`);
        }
    };

    if (loading) return <div className="container">로딩 중...</div>;
    if (!job) return null;

    const isLocked = job.status === 'SUBMITTED';

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* 상단 헤더 */}
            <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid var(--hc-blue-500)' }}>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginBottom: '4px' }}>{String(job.date)}</p>
                <h2 style={{ fontSize: '18px' }}>{job.siteTitle}</h2>
                <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: job.status === 'SUBMITTED' ? 'var(--hc-success)' : 'var(--hc-blue-500)' }}>
                    {job.status === 'DRAFT' && '● 비포 촬영 진행 중'}
                    {job.status === 'BEFORE_DONE' && '● 비포 완료 (에프터 촬영 가능)'}
                    {job.status === 'SUBMITTED' && '✓ 관리자 제출 완료 (편집 잠금)'}
                </p>
            </div>

            {isLocked && (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)', fontSize: '14px' }}>
                    <p style={{ color: '#9a3412', fontWeight: 600 }}>제출 완료 - 편집이 불가능합니다.</p>
                    <p style={{ color: '#c2410c', marginTop: '4px', fontSize: '12px' }}>제출 후 14일이 지나면 보안 정책에 따라 자동 삭제됩니다.</p>
                </div>
            )}

            {/* 섹션 리스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {sections.map(section => {
                    const sPhotos = photosMap[section.id] || [];
                    const befores = sPhotos.filter(p => p.type === 'BEFORE');
                    const afters = sPhotos.filter(p => p.type === 'AFTER');
                    const firstBeforeUrl = befores[0]?.storagePath; // 실제로는 URL 필요하므로 아래 렌더링 시 처리

                    return (
                        <div key={section.id} className="card" style={{ padding: '0' }}>
                            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--hc-border)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{section.title}</h3>
                                <textarea
                                    placeholder="추가 설명 입력 (선택사항)"
                                    defaultValue={section.description}
                                    onBlur={(e) => handleUpdateDescription(section.id, e.target.value)}
                                    disabled={isLocked}
                                    style={{
                                        width: '100%', marginTop: 'var(--spacing-sm)', padding: '8px',
                                        borderRadius: '4px', border: '1px solid var(--hc-border)',
                                        fontSize: '14px', resize: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ padding: 'var(--spacing-md)' }}>
                                {/* BEFORE 영역 */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-muted)' }}>BEFORE 사진</span>
                                        {!isLocked && (
                                            <button
                                                onClick={() => handleUploadClick(section.id, 'BEFORE')}
                                                style={{ fontSize: '12px', color: 'var(--hc-blue-500)', border: '1px solid var(--hc-blue-500)', backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                                            >
                                                + 추가
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                        {befores.length === 0 && <p style={{ fontSize: '12px', color: '#ccc' }}>등록된 사진 없음</p>}
                                        {befores.map(p => (
                                            <div key={p.id} style={{ position: 'relative', flexShrink: 0 }}>
                                                <img
                                                    src={p.downloadUrl || 'https://placehold.co/80x80?text=No+Image'}
                                                    alt="before"
                                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = 'https://placehold.co/80x80?text=Error';
                                                    }}
                                                />
                                                {!isLocked && (
                                                    <button
                                                        onClick={() => handleDeletePhoto(p)}
                                                        style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'rgba(255,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px' }}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AFTER 영역 */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-muted)' }}>AFTER 사진</span>
                                        {!isLocked && job.status !== 'DRAFT' && (
                                            <button
                                                onClick={() => handleUploadClick(section.id, 'AFTER')}
                                                style={{ fontSize: '12px', color: 'var(--hc-blue-500)', border: '1px solid var(--hc-blue-500)', backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                                            >
                                                + 촬영/추가
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                        {job.status === 'DRAFT' ? (
                                            <p style={{ fontSize: '12px', color: '#ccc' }}>비포 완료 후 촬영 가능</p>
                                        ) : afters.length === 0 ? (
                                            <p style={{ fontSize: '12px', color: '#ccc' }}>등록된 사진 없음</p>
                                        ) : (
                                            afters.map(p => (
                                                <div key={p.id} style={{ position: 'relative', flexShrink: 0 }}>
                                                    <img
                                                        src={p.downloadUrl || 'https://placehold.co/80x80?text=No+Image'}
                                                        alt="after"
                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = 'https://placehold.co/80x80?text=Error';
                                                        }}
                                                    />
                                                    {!isLocked && (
                                                        <button
                                                            onClick={() => handleDeletePhoto(p)}
                                                            style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'rgba(255,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px' }}
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!isLocked && (
                <button
                    className="btn-primary"
                    onClick={handleAddSection}
                    style={{ width: '100%', marginTop: 'var(--spacing-md)', backgroundColor: '#fff', color: 'var(--hc-blue-500)', border: '1px dashed var(--hc-blue-500)' }}
                >
                    + 사진제목(사제목) 추가
                </button>
            )}

            {/* 업로드 로딩 인디케이터 (전체 화면 차단) */}
            {isUploading && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
                }}>
                    <div style={{
                        width: '40px', height: '40px', border: '4px solid #fff',
                        borderTop: '4px solid transparent', borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ color: '#fff', marginTop: '10px', fontWeight: 600 }}>업로드 중...</p>
                    <style>{`
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    `}</style>
                </div>
            )}

            {/* 하단 고정 버튼 */}
            {!isLocked && (
                <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', display: 'flex', gap: 'var(--spacing-sm)', zIndex: 100 }}>
                    {job.status === 'DRAFT' && (
                        <button onClick={() => handleStatusUpdate('BEFORE_DONE')} className="btn-primary" style={{ flex: 1, height: '56px', fontSize: '16px' }}>
                            비포사진 완료
                        </button>
                    )}
                    {job.status === 'BEFORE_DONE' && (
                        <button onClick={() => handleStatusUpdate('SUBMITTED')} className="btn-primary" style={{ flex: 1, height: '56px', fontSize: '16px', backgroundColor: 'var(--hc-success)' }}>
                            관리자에게 보내기 (제출)
                        </button>
                    )}
                </div>
            )}

            {/* 카메라 오버레이 모달 */}
            {isCameraOpen && cameraTarget && (
                <CameraOverlay
                    beforePhotoUrl={
                        cameraTarget.type === 'AFTER'
                            ? photosMap[cameraTarget.sectionId]?.find(p => p.type === 'BEFORE')?.downloadUrl || undefined
                            : undefined
                    }
                    onCapture={handleCapture}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
        </div>
    );
};

export default WorkerJobDetailPage;

```

---


## src/pages/worker/WorkerJobsPage.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listJobs, createJob } from '../../lib/db';
import type { Job } from '../../lib/db';

const WorkerJobsPage: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await listJobs();
            setJobs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newDate) return;

        try {
            const jobId = await createJob(newDate, newTitle);
            navigate(`/worker/jobs/${jobId}`);
        } catch (error) {
            alert('작업 생성 실패');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>비포 촬영 중</span>;
            case 'BEFORE_DONE': return <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700 }}>비포 완료</span>;
            case 'SUBMITTED': return <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 700 }}>제출 완료</span>;
            default: return null;
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ fontSize: '20px' }}>내 작업 목록</h2>
                <button className="btn-primary" onClick={() => setShowModal(true)}>+ 새 작업</button>
            </div>

            {loading ? (
                <p>로딩 중...</p>
            ) : jobs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                    <p style={{ color: 'var(--hc-muted)' }}>등록된 작업이 없습니다.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            className="card"
                            onClick={() => navigate(`/worker/jobs/${job.id}`)}
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginBottom: '4px' }}>{String(job.date)}</p>
                                <h3 style={{ fontSize: '16px', fontWeight: 500 }}>{job.siteTitle}</h3>
                            </div>
                            {getStatusBadge(job.status)}
                        </div>
                    ))}
                </div>
            )}

            {/* 새 작업 생성 모달 */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 2000, padding: 'var(--spacing-md)'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#fff' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>새 작업 생성</h3>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>날짜</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hc-border)' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>현장제목 (현장명 / 담당자명)</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="예: A아파트 101동 / 홍길동"
                                    style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hc-border)' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>취소</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>생성하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerJobsPage;

```

---

