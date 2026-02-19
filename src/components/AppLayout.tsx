import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { LogOut, Home, Bell } from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = location.pathname.startsWith('/admin');
    const isWorker = location.pathname.startsWith('/worker');

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--hc-bg)' }}>
            {/* 전역 헤더 */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 1000,
                backgroundColor: '#fff', borderBottom: '1px solid var(--hc-border)',
                padding: '0 var(--spacing-md)', height: '60px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div
                    onClick={() => navigate(isAdmin ? '/admin/jobs' : isWorker ? '/worker/jobs' : '/')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <div style={{ backgroundColor: 'var(--hc-primary)', padding: '4px', borderRadius: '4px' }}>
                        <Home size={18} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--hc-primary)', letterSpacing: '-0.5px' }}>
                        HELLA FIELD
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/admin/notifications')}
                            style={{ position: 'relative', padding: '8px' }}
                        >
                            <Bell size={20} color="var(--hc-muted)" />
                        </button>
                    )}
                    {user && (
                        <button
                            onClick={() => signOut()}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--hc-danger)', fontWeight: 600 }}
                        >
                            <LogOut size={16} />
                            로그아웃
                        </button>
                    )}
                </div>
            </header>

            {/* 메인 콘텐츠 영역 (푸터 패딩 확보: 80px) */}
            <main style={{ flex: 1, padding: 'var(--spacing-md)', paddingBottom: '100px' }}>
                {children}
            </main>

            {/* 전역 푸터 (P1: 개발자 정보) */}
            <footer style={{
                backgroundColor: '#fff', borderTop: '1px solid var(--hc-border)',
                padding: '24px var(--spacing-md)', textAlign: 'center',
                fontSize: '11px', color: 'var(--hc-muted)', lineHeight: '1.6'
            }}>
                <p>개발사 KS컴퍼니 | 개발자 배종수 | 문의 suhachi@gmail.com</p>
                <p style={{ marginTop: '4px', opacity: 0.7 }}>© 2026 HellaCompany. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default AppLayout;
