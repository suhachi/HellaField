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
