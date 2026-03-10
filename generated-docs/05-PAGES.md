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
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { deleteObject, ref } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ReportTemplate from '../../components/admin/ReportTemplate';

// Local minimal types (keep scope small)
interface Job {
    id: string;
    date: string | Timestamp;
    siteTitle: string;
    status: 'DRAFT' | 'BEFORE_DONE' | 'SUBMITTED';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    submittedAt: Timestamp | null;
}

interface Section {
    id: string;
    jobId: string;
    title: string;
    description: string;
    order: number;
    createdAt: Timestamp;
}

interface Photo {
    id: string;
    jobId: string;
    sectionId: string;
    type: 'BEFORE' | 'AFTER';
    storagePath: string;
    originalFileName: string;
    downloadUrl: string;
    createdAt: Timestamp;
    deletedAt: Timestamp | null;
}

const sanitizeFilePart = (s: string) =>
    (s || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_');

export default function AdminJobDetailPage() {
    const { jobId } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState<Job | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [photosBySection, setPhotosBySection] = useState<Record<string, Photo[]>>({});
    const [isDeleting, setIsDeleting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!jobId) return;

        const unsubJob = onSnapshot(doc(db, 'jobs', jobId), (snap) => {
            if (!snap.exists()) {
                setJob(null);
                return;
            }
            setJob({ id: snap.id, ...(snap.data() as any) } as Job);
        });

        const unsubSections = onSnapshot(
            query(collection(db, 'jobs', jobId, 'sections'), orderBy('order', 'asc')),
            (snapshot) => {
                const next: Section[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                setSections(next);
            }
        );

        return () => {
            unsubJob();
            unsubSections();
        };
    }, [jobId]);

    useEffect(() => {
        if (!jobId) return;
        if (!sections.length) {
            setPhotosBySection({});
            return;
        }

        const unsubs: Array<() => void> = [];

        sections.forEach((section) => {
            const photosRef = collection(db, 'jobs', jobId, 'sections', section.id, 'photos');
            const qPhotos = query(
                photosRef,
                where('deletedAt', '==', null),
                orderBy('createdAt', 'asc')
            );

            const unsub = onSnapshot(qPhotos, (snap) => {
                const photos: Photo[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                setPhotosBySection((prev) => ({ ...prev, [section.id]: photos }));
            });

            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach((u) => u());
        };
    }, [jobId, sections]);

    const makeFileName = (sectionTitle: string, type: Photo['type'], index: number) => {
        const site = sanitizeFilePart(job?.siteTitle || 'SITE');
        const section = sanitizeFilePart(sectionTitle || 'SECTION');
        const t = type === 'BEFORE' ? 'BEFORE' : 'AFTER';
        return `${site}__${section}__${t}__${index + 1}.jpg`;
    };

    const handleDownload = async (photo: Photo, sectionTitle: string, index: number) => {
        const url = photo.downloadUrl;
        if (!url) return;

        const fileName = makeFileName(sectionTitle, photo.type, index);

        try {
            const res = await fetch(url, { mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const blob = await res.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch (err) {
            alert('다운로드가 차단되면 새 탭에서 저장하세요.');
            window.open(url, '_blank');
        }
    };

    const handleDeletePhoto = async (photo: Photo) => {
        if (!jobId) return;
        const ok = confirm('이 사진을 삭제할까요? (Storage + 문서 삭제)');
        if (!ok) return;

        try {
            await deleteObject(ref(storage, photo.storagePath));
        } catch (e) {
            console.warn('Storage delete failed:', e);
        }

        await deleteDoc(doc(db, 'jobs', jobId, 'sections', photo.sectionId, 'photos', photo.id));
    };

    const handleDeleteJobTotal = async () => {
        if (!jobId) return;
        const ok = confirm('이 작업을 완전히 삭제할까요? (모든 섹션/사진 포함)');
        if (!ok) return;

        setIsDeleting(true);
        try {
            const currentSections = [...sections];
            for (const section of currentSections) {
                const photos = photosBySection[section.id] || [];

                for (const p of photos) {
                    try {
                        await deleteObject(ref(storage, p.storagePath));
                    } catch (e) {
                        console.warn('Storage delete failed:', p.storagePath, e);
                    }
                }

                for (const p of photos) {
                    await deleteDoc(doc(db, 'jobs', jobId, 'sections', section.id, 'photos', p.id));
                }

                await deleteDoc(doc(db, 'jobs', jobId, 'sections', section.id));
            }

            await deleteDoc(doc(db, 'jobs', jobId));
            navigate('/admin/jobs');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMarkSubmitted = async () => {
        if (!jobId) return;
        await updateDoc(doc(db, 'jobs', jobId), { status: 'SUBMITTED' });
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !job) return;

        setIsGeneratingPdf(true);
        try {
            // 1. Capture the hidden report component
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // Higher resolution
                useCORS: true, // Allow loading remote images
                logging: false,
                backgroundColor: '#ffffff'
            });

            // 2. Create PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // 3. Handle multi-page (if content is too long)
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight; // Move up
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const safeDate = typeof job.date === 'string' ? job.date : 'report';
            pdf.save(`${safeDate}_${sanitizeFilePart(job.siteTitle)}.pdf`);

        } catch (e) {
            console.error('PDF Generation failed:', e);
            alert('PDF 생성에 실패했습니다. (콘솔 확인)');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (!jobId) return <div style={{ padding: 16 }}>잘못된 접근입니다.</div>;

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button onClick={() => navigate('/admin/jobs')} style={{ padding: '8px 12px' }}>
                    목록으로
                </button>
                <h2 style={{ margin: 0 }}>작업 상세</h2>
            </div>

            {!job ? (
                <div>로딩 중...</div>
            ) : (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700 }}>{job.siteTitle}</div>
                        <div style={{ opacity: 0.8 }}>상태: {job.status}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            style={{
                                padding: '8px 12px',
                                background: '#2563eb',
                                color: '#fff',
                                fontWeight: 'bold',
                                borderRadius: '4px'
                            }}
                        >
                            {isGeneratingPdf ? 'PDF 생성 중...' : '📄 PDF 리포트 다운로드'}
                        </button>

                        <div style={{ flex: 1 }} />

                        <button onClick={handleDeleteJobTotal} disabled={isDeleting} style={{ padding: '8px 12px' }}>
                            {isDeleting ? '삭제 중...' : '전체 삭제'}
                        </button>
                        {job.status !== 'SUBMITTED' && (
                            <button onClick={handleMarkSubmitted} style={{ padding: '8px 12px' }}>
                                제출 완료 상태로 변경
                            </button>
                        )}
                    </div>

                    {sections.map((section) => {
                        const photos = photosBySection[section.id] || [];
                        const befores = photos.filter((p) => p.type === 'BEFORE');
                        const afters = photos.filter((p) => p.type === 'AFTER');

                        return (
                            <div key={section.id} style={{ marginBottom: 24 }}>
                                <h3 style={{ margin: '12px 0' }}>{section.title}</h3>

                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ width: '100%', maxWidth: '500px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>BEFORE</div>
                                        {befores.length === 0 ? (
                                            <div style={{ opacity: 0.7 }}>없음</div>
                                        ) : (
                                            befores.map((p, idx) => (
                                                <div key={p.id} style={{ marginBottom: 10 }}>
                                                    <img
                                                        src={p.downloadUrl}
                                                        alt="before"
                                                        style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', cursor: 'pointer' }}
                                                        onClick={() => handleDownload(p, section.title, idx)}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                                        <button onClick={() => handleDownload(p, section.title, idx)} style={{ padding: '6px 10px' }}>
                                                            다운로드
                                                        </button>
                                                        <button onClick={() => handleDeletePhoto(p)} style={{ padding: '6px 10px' }}>
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div style={{ width: '100%', maxWidth: '500px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>AFTER</div>
                                        {afters.length === 0 ? (
                                            <div style={{ opacity: 0.7 }}>없음</div>
                                        ) : (
                                            afters.map((p, idx) => (
                                                <div key={p.id} style={{ marginBottom: 10 }}>
                                                    <img
                                                        src={p.downloadUrl}
                                                        alt="after"
                                                        style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', cursor: 'pointer' }}
                                                        onClick={() => handleDownload(p, section.title, idx)}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                                        <button onClick={() => handleDownload(p, section.title, idx)} style={{ padding: '6px 10px' }}>
                                                            다운로드
                                                        </button>
                                                        <button onClick={() => handleDeletePhoto(p)} style={{ padding: '6px 10px' }}>
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Hidden Report Template */}
            {job && (
                <ReportTemplate
                    ref={reportRef}
                    job={job}
                    sections={sections}
                    photosBySection={photosBySection}
                />
            )}
        </div>
    );
}

```

---


## src/pages/admin/AdminJobsPage.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
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
        // DEBUG: Show all jobs to diagnose missing items
        const q = query(
            collection(db, 'jobs'),
            orderBy('createdAt', 'desc')
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
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <span style={{
                                    padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                                    background: job.status === 'SUBMITTED' ? '#dbeafe' : '#f3f4f6',
                                    color: job.status === 'SUBMITTED' ? '#1e40af' : '#4b5563'
                                }}>
                                    {job.status === 'SUBMITTED' ? '제출됨' : (job.status === 'BEFORE_DONE' ? '작업 중(비포 완료)' : '작성 중')}
                                </span>
                                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', margin: 0 }}>
                                    {job.submittedAt ? `제출: ${job.submittedAt.toDate().toLocaleDateString()}` : `생성: ${job.createdAt?.toDate().toLocaleDateString()}`}
                                </p>
                            </div>
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
import { useNavigate } from 'react-router-dom';
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AdminNotification {
    id: string;
    type: 'JOB_SUBMITTED';
    jobId: string;
    siteTitle: string;
    createdAt: Timestamp;
    readAt: Timestamp | null;
}

export default function AdminNotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);

    useEffect(() => {
        const qNotifs = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));

        const unsub = onSnapshot(qNotifs, (snapshot) => {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdminNotification[];
            setNotifications(items);
        });

        return () => unsub();
    }, []);

    const markRead = async (id: string) => {
        await updateDoc(doc(db, 'admin_notifications', id), { readAt: serverTimestamp() });
    };

    const handleClick = async (n: AdminNotification) => {
        if (!n.readAt) {
            try {
                await markRead(n.id);
            } catch (e) {
                console.warn('markRead failed:', e);
            }
        }
        navigate(`/admin/jobs/${n.jobId}`);
    };

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button onClick={() => navigate('/admin/jobs')} style={{ padding: '8px 12px' }}>
                    목록으로
                </button>
                <h2 style={{ margin: 0 }}>알림</h2>
            </div>

            {notifications.length === 0 ? (
                <div style={{ opacity: 0.8 }}>알림이 없습니다.</div>
            ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => handleClick(n)}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: 10,
                                padding: 12,
                                cursor: 'pointer',
                                background: n.readAt ? '#fff' : '#fff7e6'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ fontWeight: 700 }}>{n.siteTitle}</div>
                                {!n.readAt && (
                                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: '#ffedd5' }}>
                                        NEW
                                    </span>
                                )}
                            </div>
                            <div style={{ opacity: 0.8, marginTop: 6 }}>작업 제출 알림</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Job, Photo, Section } from '../../lib/db';
import { getJob, listSections, listPhotos, updateJobStatus, addSection } from '../../lib/db';
import { uploadPhoto, deletePhoto } from '../../services/photoService';
import CameraOverlay from '../../components/worker/CameraOverlay';

const PENDING_KEY = 'hc_pending_capture_v1';
const PENDING_TTL_MS = 2 * 60 * 1000;

type CaptureType = 'BEFORE' | 'AFTER';

function safeJsonParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export default function WorkerJobDetailPage() {
    const { jobId } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState<Job | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [photosBySection, setPhotosBySection] = useState<Record<string, Photo[]>>({});

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<CaptureType>('BEFORE');

    // Add Section Modal State
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [isCreatingSection, setIsCreatingSection] = useState(false);

    const isLocked = job?.status === 'SUBMITTED';

    const load = useCallback(async () => {
        if (!jobId) return;
        const j = await getJob(jobId);
        setJob(j);

        const secs = await listSections(jobId);
        setSections(secs);

        const next: Record<string, Photo[]> = {};
        for (const s of secs) {
            next[s.id] = await listPhotos(jobId, s.id);
        }
        setPhotosBySection(next);
    }, [jobId]);

    useEffect(() => {
        void load();
    }, [load]);

    // Pending capture restore (mobile picker state loss)
    useEffect(() => {
        if (!jobId) return;

        type Pending = { jobId: string; sectionId: string; type: CaptureType; openedAt: number };
        const pending = safeJsonParse<Pending>(localStorage.getItem(PENDING_KEY));
        if (!pending) return;

        const isFresh = Date.now() - pending.openedAt <= PENDING_TTL_MS;
        const matches = pending.jobId === jobId;

        if (matches && isFresh) {
            localStorage.removeItem(PENDING_KEY);
            setActiveSectionId(pending.sectionId);
            setActiveType(pending.type);
            setIsCameraOpen(true);
        } else {
            localStorage.removeItem(PENDING_KEY);
        }
    }, [jobId]);

    const activeSection = useMemo(
        () => sections.find((s) => s.id === activeSectionId) || null,
        [sections, activeSectionId]
    );

    const getFirstBeforeUrl = useCallback(
        (sectionId: string) => {
            const photos = photosBySection[sectionId] || [];
            const befores = photos
                .filter((p) => p.type === 'BEFORE')
                .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
            return befores[0]?.downloadUrl || undefined;
        },
        [photosBySection]
    );

    const openCamera = (sectionId: string, type: CaptureType) => {
        if (!jobId) return;
        if (isLocked) return;

        setActiveSectionId(sectionId);
        setActiveType(type);
        setIsCameraOpen(true);
    };

    const closeCamera = () => {
        setIsCameraOpen(false);
        localStorage.removeItem(PENDING_KEY);
    };

    const onCaptured = async (file: File) => {
        if (!jobId || !activeSectionId) return;

        await uploadPhoto(file, jobId, activeSectionId, activeType);

        localStorage.removeItem(PENDING_KEY);

        const updated = await listPhotos(jobId, activeSectionId);
        setPhotosBySection((prev) => ({ ...prev, [activeSectionId]: updated }));
    };

    const handleDelete = async (sectionId: string, photo: Photo) => {
        if (!jobId) return;
        if (isLocked) return;

        const ok = confirm('이 사진을 삭제할까요?');
        if (!ok) return;

        await deletePhoto(jobId, sectionId, photo.id, photo.storagePath);

        const updated = await listPhotos(jobId, sectionId);
        setPhotosBySection((prev) => ({ ...prev, [sectionId]: updated }));
    };

    const handleBeforeDone = async () => {
        if (!jobId || !job) return;
        if (job.status !== 'DRAFT') return;

        await updateJobStatus(jobId, 'BEFORE_DONE');
        setJob({ ...job, status: 'BEFORE_DONE' });
    };

    const handleSubmit = async () => {
        if (!jobId || !job) return;
        if (job.status === 'SUBMITTED') return;

        const ok = confirm('관리자에게 제출할까요? 제출 후에는 수정할 수 없습니다.');
        if (!ok) return;

        await updateJobStatus(jobId, 'SUBMITTED');
        setJob({ ...job, status: 'SUBMITTED' });
    };

    // --- Add Section Logic ---
    const openAddSectionModal = () => {
        setNewSectionTitle('');
        setIsAddSectionModalOpen(true);
    };

    const closeAddSectionModal = () => {
        setIsAddSectionModalOpen(false);
    };

    const handleCreateSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobId || !newSectionTitle.trim()) return;

        setIsCreatingSection(true);
        try {
            // order is simply current length + 1
            const nextOrder = sections.length + 1;
            await addSection(jobId, newSectionTitle.trim(), nextOrder);

            // Reload sections to reflect changes
            const updatedSecs = await listSections(jobId);
            setSections(updatedSecs);

            closeAddSectionModal();
        } catch (error) {
            console.error('Failed to create section:', error);
            alert('구역 생성에 실패했습니다.');
        } finally {
            setIsCreatingSection(false);
        }
    };

    if (!jobId) return <div style={{ padding: 16 }}>잘못된 접근입니다.</div>;

    return (
        <div style={{ padding: 16, paddingBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button onClick={() => navigate('/worker/jobs')} style={{ padding: '8px 12px' }}>
                    목록으로
                </button>
                <h2 style={{ margin: 0 }}>작업 상세</h2>
            </div>

            {!job ? (
                <div>로딩 중...</div>
            ) : (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700 }}>{job.siteTitle}</div>
                        <div style={{ opacity: 0.8 }}>상태: {job.status}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <button
                            onClick={handleBeforeDone}
                            disabled={isLocked || job.status !== 'DRAFT'}
                            style={{ padding: '8px 12px' }}
                        >
                            애프터 촬영 시작
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLocked || job.status === 'DRAFT'}
                            style={{ padding: '8px 12px' }}
                        >
                            관리자에게 보내기
                        </button>
                    </div>

                    {sections.map((section) => {
                        const photos = photosBySection[section.id] || [];
                        const befores = photos.filter((p) => p.type === 'BEFORE');
                        const afters = photos.filter((p) => p.type === 'AFTER');

                        const canAfter = job.status !== 'DRAFT';

                        return (
                            <div key={section.id} style={{ marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 24 }}>
                                <h3 style={{ margin: '12px 0', fontSize: '18px' }}>{section.title}</h3>

                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    {/* BEFORE Column */}
                                    <div style={{ width: '100%', maxWidth: '500px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 600, color: '#f59e0b' }}>BEFORE</div>
                                            <button
                                                onClick={() => openCamera(section.id, 'BEFORE')}
                                                disabled={isLocked}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: isLocked ? '#ccc' : '#f59e0b',
                                                    color: '#fff',
                                                    borderRadius: 4,
                                                    fontWeight: 700
                                                }}
                                            >
                                                + 사진 추가
                                            </button>
                                        </div>

                                        {befores.length === 0 ? (
                                            <div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center', color: '#999', fontSize: 13 }}>
                                                사진이 없습니다
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                                                {befores.map((p) => (
                                                    <div key={p.id} style={{ position: 'relative' }}>
                                                        <img
                                                            src={p.downloadUrl}
                                                            alt="before"
                                                            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, display: 'block', background: '#eee' }}
                                                        />
                                                        {!isLocked && (
                                                            <button
                                                                onClick={() => handleDelete(section.id, p)}
                                                                style={{
                                                                    position: 'absolute', top: 4, right: 4,
                                                                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                                                                    width: 24, height: 24, borderRadius: 12,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 14
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* AFTER Column */}
                                    <div style={{ width: '100%', maxWidth: '500px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 600, color: '#3b82f6' }}>AFTER</div>
                                            <button
                                                onClick={() => openCamera(section.id, 'AFTER')}
                                                disabled={isLocked || !canAfter}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: (isLocked || !canAfter) ? '#ccc' : '#3b82f6',
                                                    color: '#fff',
                                                    borderRadius: 4,
                                                    fontWeight: 700
                                                }}
                                                title={canAfter ? '' : '비포사진 완료 후 촬영 가능합니다.'}
                                            >
                                                + 사진 추가
                                            </button>
                                        </div>

                                        {afters.length === 0 ? (
                                            <div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center', color: '#999', fontSize: 13 }}>
                                                사진이 없습니다
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                                                {afters.map((p) => (
                                                    <div key={p.id} style={{ position: 'relative' }}>
                                                        <img
                                                            src={p.downloadUrl}
                                                            alt="after"
                                                            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, display: 'block', background: '#eee' }}
                                                        />
                                                        {!isLocked && (
                                                            <button
                                                                onClick={() => handleDelete(section.id, p)}
                                                                style={{
                                                                    position: 'absolute', top: 4, right: 4,
                                                                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                                                                    width: 24, height: 24, borderRadius: 12,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 14
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Section Button (Large) */}
                    {!isLocked && (
                        <div style={{ marginTop: 32, marginBottom: 40 }}>
                            <button
                                onClick={openAddSectionModal}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    border: '2px dashed #ccc',
                                    borderRadius: 12,
                                    background: '#f9f9f9',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: '#555',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                                구역 추가하기 (예: 안방, 거실)
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Camera Overlay */}
            {isCameraOpen && jobId && activeSectionId && (
                <CameraOverlay
                    jobId={jobId}
                    sectionId={activeSectionId}
                    type={activeType}
                    beforeImageUrl={activeType === 'AFTER' ? getFirstBeforeUrl(activeSectionId) : undefined}
                    onCaptured={onCaptured}
                    onClose={closeCamera}
                />
            )}

            {/* Add Section Modal */}
            {isAddSectionModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        background: '#fff', width: '100%', maxWidth: 360,
                        borderRadius: 16, padding: 24,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 20 }}>새 구역 추가</h3>

                        <form onSubmit={handleCreateSection}>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#555' }}>
                                    구역 이름
                                </label>
                                <input
                                    type="text"
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    placeholder="예: 거실, 안방, 현관"
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '12px',
                                        fontSize: 16, border: '1px solid #ddd', borderRadius: 8
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={closeAddSectionModal}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: 8,
                                        background: '#f1f3f5', color: '#495057', fontSize: 16, fontWeight: 600
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newSectionTitle.trim() || isCreatingSection}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: 8,
                                        background: '#3857F5', color: '#fff', fontSize: 16, fontWeight: 600,
                                        opacity: (!newSectionTitle.trim() || isCreatingSection) ? 0.5 : 1
                                    }}
                                >
                                    {isCreatingSection ? '추가 중...' : '추가하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

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

