import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from './AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, role, loading, hasProfile } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>인증 확인 중...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!hasProfile) {
        return <Navigate to="/unauthorized" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        // 권한에 맞지 않는 접근 시 각자의 메인으로 리다이렉트
        return <Navigate to={role === 'ADMIN' ? '/admin/jobs' : '/worker/jobs'} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
