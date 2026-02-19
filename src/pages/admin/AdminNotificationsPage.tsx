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
