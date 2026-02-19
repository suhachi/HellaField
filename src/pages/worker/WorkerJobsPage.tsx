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
