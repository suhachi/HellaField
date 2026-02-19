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
