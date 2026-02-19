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
