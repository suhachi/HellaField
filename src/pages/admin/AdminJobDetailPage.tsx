import { useEffect, useRef, useState } from 'react';
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
    where,
    serverTimestamp
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
    title?: string | null;
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

    // Title Editing State (Photos)
    const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
    const [editingTitleValue, setEditingTitleValue] = useState<string>('');
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    // Section Title Editing State
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionValue, setEditingSectionValue] = useState<string>('');
    const [isSavingSection, setIsSavingSection] = useState(false);

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

    const handleEditTitleStart = (photo: Photo) => {
        setEditingPhotoId(photo.id);
        setEditingTitleValue(photo.title || '');
    };

    const handleEditTitleCancel = () => {
        setEditingPhotoId(null);
        setEditingTitleValue('');
    };

    const handleEditTitleSave = async (sectionId: string, photoId: string) => {
        if (!jobId) return;

        const trimmed = editingTitleValue.trim();
        const finalTitle = trimmed === '' ? null : trimmed.substring(0, 60);

        setIsSavingTitle(true);
        try {
            await updateDoc(doc(db, 'jobs', jobId, 'sections', sectionId, 'photos', photoId), {
                title: finalTitle,
                updatedAt: serverTimestamp()
            });
            setEditingPhotoId(null);
        } catch (e) {
            console.error("Failed to update title:", e);
            alert("제목 저장에 실패했습니다.");
        } finally {
            setIsSavingTitle(false);
        }
    };

    // Section Edit Handlers
    const handleEditSectionStart = (section: Section) => {
        setEditingSectionId(section.id);
        setEditingSectionValue(section.title);
    };

    const handleEditSectionCancel = () => {
        setEditingSectionId(null);
        setEditingSectionValue('');
    };

    const handleEditSectionSave = async (sectionId: string) => {
        if (!jobId) return;
        const trimmed = editingSectionValue.trim();
        if (!trimmed) {
            alert("구역 제목을 입력해주세요.");
            return;
        }

        setIsSavingSection(true);
        try {
            await updateDoc(doc(db, 'jobs', jobId, 'sections', sectionId), {
                title: trimmed.substring(0, 60),
                updatedAt: serverTimestamp()
            });
            setEditingSectionId(null);
        } catch (e) {
            console.error("Failed to update section title:", e);
            alert("구역 제목 저장에 실패했습니다.");
        } finally {
            setIsSavingSection(false);
        }
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
            // 1. Get all A4 pages
            const pages = reportRef.current.querySelectorAll('.pdf-page');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

            for (let i = 0; i < pages.length; i++) {
                const pageEl = pages[i] as HTMLElement;
                const canvas = await html2canvas(pageEl, {
                    scale: 2, // Higher resolution
                    useCORS: true, // Allow loading remote images
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Add image directly filling the A4 page (proportions are matched by CSS)
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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
                                {/* Section Title Header with Edit UI */}
                                {editingSectionId === section.id ? (
                                    <div style={{ display: 'flex', gap: 8, margin: '12px 0', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={editingSectionValue}
                                            onChange={(e) => setEditingSectionValue(e.target.value)}
                                            disabled={isSavingSection}
                                            maxLength={60}
                                            style={{
                                                fontSize: '1.2em',
                                                fontWeight: 'bold',
                                                padding: '4px 8px',
                                                border: '1px solid #3b82f6',
                                                borderRadius: 4,
                                                flex: 1,
                                                maxWidth: '400px'
                                            }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleEditSectionSave(section.id)}
                                            disabled={isSavingSection}
                                            style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', borderRadius: 4, fontWeight: 'bold' }}
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={handleEditSectionCancel}
                                            disabled={isSavingSection}
                                            style={{ padding: '6px 12px', background: '#e2e8f0', borderRadius: 4 }}
                                        >
                                            취소
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                                        <h3 style={{ margin: 0 }}>{section.title}</h3>
                                        <button
                                            onClick={() => handleEditSectionStart(section)}
                                            style={{
                                                fontSize: 12,
                                                padding: '4px 8px',
                                                background: '#f1f5f9',
                                                color: '#64748b',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 4,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            구역명 수정
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ width: '100%', maxWidth: '500px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>BEFORE</div>
                                        {befores.length === 0 ? (
                                            <div style={{ opacity: 0.7 }}>없음</div>
                                        ) : (
                                            befores.map((p, idx) => {
                                                const fallbackTitle = `비포 ${idx + 1}`;
                                                return (
                                                    <div key={p.id} style={{ marginBottom: 10, background: '#f8fafc', padding: 8, borderRadius: 8 }}>
                                                        <img
                                                            src={p.downloadUrl}
                                                            alt="before"
                                                            style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', cursor: 'pointer', marginBottom: 8 }}
                                                            onClick={() => handleDownload(p, section.title, idx)}
                                                        />

                                                        {/* Title Editing UI */}
                                                        {editingPhotoId === p.id ? (
                                                            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                                                <input
                                                                    type="text"
                                                                    value={editingTitleValue}
                                                                    onChange={(e) => setEditingTitleValue(e.target.value)}
                                                                    placeholder={fallbackTitle}
                                                                    disabled={isSavingTitle}
                                                                    maxLength={60}
                                                                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleEditTitleSave(section.id, p.id)} disabled={isSavingTitle} style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: 4 }}>
                                                                    저장
                                                                </button>
                                                                <button onClick={handleEditTitleCancel} disabled={isSavingTitle} style={{ padding: '4px 8px', background: '#e2e8f0' }}>
                                                                    취소
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title || fallbackTitle}</div>
                                                                <button onClick={() => handleEditTitleStart(p)} style={{ fontSize: 12, padding: '2px 6px', background: '#e2e8f0', borderRadius: 4 }}>
                                                                    제목 수정
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button onClick={() => handleDownload(p, section.title, idx)} style={{ padding: '6px 10px', flex: 1 }}>
                                                                다운로드
                                                            </button>
                                                            <button onClick={() => handleDeletePhoto(p)} style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: 'none' }}>
                                                                삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    <div style={{ width: '100%', maxWidth: '500px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>AFTER</div>
                                        {afters.length === 0 ? (
                                            <div style={{ opacity: 0.7 }}>없음</div>
                                        ) : (
                                            afters.map((p, idx) => {
                                                const fallbackTitle = `애프터 ${idx + 1}`;
                                                return (
                                                    <div key={p.id} style={{ marginBottom: 10, background: '#f8fafc', padding: 8, borderRadius: 8 }}>
                                                        <img
                                                            src={p.downloadUrl}
                                                            alt="after"
                                                            style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', cursor: 'pointer', marginBottom: 8 }}
                                                            onClick={() => handleDownload(p, section.title, idx)}
                                                        />

                                                        {/* Title Editing UI */}
                                                        {editingPhotoId === p.id ? (
                                                            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                                                <input
                                                                    type="text"
                                                                    value={editingTitleValue}
                                                                    onChange={(e) => setEditingTitleValue(e.target.value)}
                                                                    placeholder={fallbackTitle}
                                                                    disabled={isSavingTitle}
                                                                    maxLength={60}
                                                                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleEditTitleSave(section.id, p.id)} disabled={isSavingTitle} style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: 4 }}>
                                                                    저장
                                                                </button>
                                                                <button onClick={handleEditTitleCancel} disabled={isSavingTitle} style={{ padding: '4px 8px', background: '#e2e8f0' }}>
                                                                    취소
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title || fallbackTitle}</div>
                                                                <button onClick={() => handleEditTitleStart(p)} style={{ fontSize: 12, padding: '2px 6px', background: '#e2e8f0', borderRadius: 4 }}>
                                                                    제목 수정
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button onClick={() => handleDownload(p, section.title, idx)} style={{ padding: '6px 10px', flex: 1 }}>
                                                                다운로드
                                                            </button>
                                                            <button onClick={() => handleDeletePhoto(p)} style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: 'none' }}>
                                                                삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
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
