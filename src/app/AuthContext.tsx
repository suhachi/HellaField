import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, authReady } from '../lib/firebase';

export type UserRole = 'ADMIN' | 'WORKER';

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    profile: { role: UserRole | null } | null; // AppLayout 호환용
    loading: boolean;
    hasProfile: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasProfile, setHasProfile] = useState(true);

    const logout = async () => {
        await signOut(auth);
    };

    const profile = useMemo(() => ({ role }), [role]);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const initAuth = async () => {
            // 1. Wait for persistence to be ready (Critical for mobile stability)
            await authReady;

            // 2. Subscribe to auth state
            unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                setUser(currentUser);

                if (currentUser) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setRole(userData.role as UserRole);
                            setHasProfile(true);
                        } else {
                            setRole(null);
                            setHasProfile(false);
                        }
                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                        setRole(null);
                        setHasProfile(false);
                    }
                } else {
                    setRole(null);
                    setHasProfile(true);
                }

                // Set loading to false ONLY after the first callback and profile fetch
                setLoading(false);
            });
        };

        initAuth();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const value = useMemo(() => ({
        user,
        role,
        profile,
        loading,
        hasProfile,
        signOut: logout // Expose as signOut to match usage
    }), [user, role, profile, loading, hasProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
