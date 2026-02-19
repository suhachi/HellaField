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
