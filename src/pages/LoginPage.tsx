import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, authReady } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    // Self-healing: Redirect if already logged in
    React.useEffect(() => {
        const checkAuth = async () => {
            await authReady;
            const currentUser = auth.currentUser;

            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const role = userDoc.data().role;
                        const targetPath = role === 'ADMIN' ? '/admin/jobs' : '/worker/jobs';
                        navigate(targetPath, { replace: true });
                    } else {
                        navigate('/unauthorized', { replace: true });
                    }
                } catch (err) {
                    console.error("Session check failed:", err);
                    setCheckingSession(false);
                }
            } else {
                setCheckingSession(false);
            }
        };
        checkAuth();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authReady; // Ensure persistence is set before sign in
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 역할 확인
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const role = userDoc.data().role;
                if (role === 'ADMIN') {
                    navigate('/admin/jobs', { replace: true });
                } else {
                    navigate('/worker/jobs', { replace: true });
                }
            } else {
                navigate('/unauthorized', { replace: true });
            }
        } catch (err: any) {
            console.error(err);
            setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
                <p style={{ color: 'var(--hc-muted)' }}>세션 확인 중...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
            <div className="card">
                <h2 style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>로그인</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '14px' }}>이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hc-border)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '14px' }}>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hc-border)' }}
                        />
                    </div>
                    {error && <p style={{ color: 'var(--hc-danger)', fontSize: '14px' }}>{error}</p>}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
