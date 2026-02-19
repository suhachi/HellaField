import React, { useEffect, useState } from 'react';
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

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
        </div>
    );
}
