# 03-AUTH-LIBS

## 인증 컨텍스트, 라이브러리 및 서비스, 커스텀 훅

_사용자 인증 및 보호된 라우트 / Firebase 설정 및 비즈니스 로직 / React 재사용 가능한 훅_

총 6개 파일

---

## 📋 파일 목록

- src/app/AuthContext.tsx
- src/app/ProtectedRoute.tsx
- src/hooks/useAuth.tsx
- src/lib/db.ts
- src/lib/firebase.ts
- src/services/photoService.ts

---

## 📦 전체 코드


## src/app/AuthContext.tsx

```typescript
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
    logout: () => Promise<void>;
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
        logout
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

```

---


## src/app/ProtectedRoute.tsx

```typescript
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

```

---


## src/hooks/useAuth.tsx

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isWorker: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isWorker: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    // 사용자 프로필 조회
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as UserProfile);
                    } else {
                        setProfile(null);
                    }
                } catch (error) {
                    console.error("프로필 조회 실패:", error);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'ADMIN',
        isWorker: profile?.role === 'WORKER',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

```

---


## src/lib/db.ts

```typescript
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, deleteObject } from 'firebase/storage';

// --- Types ---

export type JobStatus = 'DRAFT' | 'BEFORE_DONE' | 'SUBMITTED';

export interface Job {
    id: string;
    date: string | Timestamp;
    siteTitle: string;
    status: JobStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    submittedAt: Timestamp | null;
}

export interface Section {
    id: string;
    jobId: string;
    title: string;
    description: string;
    order: number;
    createdAt: Timestamp;
}

export interface Photo {
    id: string;
    jobId: string;
    sectionId: string;
    type: 'BEFORE' | 'AFTER';
    storagePath: string;
    originalFileName: string;
    downloadUrl?: string | null; // PUBLIC download URL with token
    createdAt: Timestamp;
    deletedAt: Timestamp | null;
}

export interface AdminNotification {
    id: string;
    type: 'JOB_SUBMITTED';
    jobId: string;
    siteTitle: string;
    createdAt: Timestamp;
    readAt: Timestamp | null;
}

export interface RetentionConfig {
    retentionDays: number;
    enabled: boolean;
}

// --- Helpers ---

const converter = <T>() => ({
    toFirestore: (data: T) => data as any,
    fromFirestore: (snapshot: any) => ({ id: snapshot.id, ...snapshot.data() }) as T & { id: string }
});

const jobsCol = collection(db, 'jobs').withConverter(converter<Job>());
const notificationsCol = collection(db, 'admin_notifications').withConverter(converter<AdminNotification>());
const retentionDocRef = doc(db, 'app_config', 'retention').withConverter(converter<RetentionConfig>());

// --- API: Jobs ---

export const createJob = async (date: string, siteTitle: string) => {
    const docRef = await addDoc(jobsCol, {
        date,
        siteTitle,
        status: 'DRAFT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: null
    } as any);
    return docRef.id;
};

export const listJobs = async () => {
    const q = query(jobsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const getJob = async (jobId: string) => {
    const docSnap = await getDoc(doc(db, 'jobs', jobId).withConverter(converter<Job>()));
    return docSnap.exists() ? docSnap.data() : null;
};

export const updateJobStatus = async (jobId: string, status: JobStatus) => {
    const updateData: any = { status, updatedAt: serverTimestamp() };
    if (status === 'SUBMITTED') {
        updateData.submittedAt = serverTimestamp();
    }
    await updateDoc(doc(db, 'jobs', jobId), updateData);
};

// --- API: Sections (Subcollection of Job) ---

const getSectionsCol = (jobId: string) =>
    collection(db, 'jobs', jobId, 'sections').withConverter(converter<Section>());

export const addSection = async (jobId: string, title: string, order: number) => {
    const docRef = await addDoc(getSectionsCol(jobId), {
        jobId,
        title,
        description: '',
        order,
        createdAt: serverTimestamp()
    } as any);
    return docRef.id;
};

export const listSections = async (jobId: string) => {
    const q = query(getSectionsCol(jobId), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const updateSection = async (jobId: string, sectionId: string, data: Partial<Section>) => {
    await updateDoc(doc(db, 'jobs', jobId, 'sections', sectionId), data);
};

// --- API: Photos (Subcollection of Section) ---

const getPhotosCol = (jobId: string, sectionId: string) =>
    collection(db, 'jobs', jobId, 'sections', sectionId, 'photos').withConverter(converter<Photo>());

export const addPhotoDoc = async (photoData: Omit<Photo, 'id' | 'createdAt' | 'deletedAt'>) => {
    const { jobId, sectionId } = photoData;
    const docRef = await addDoc(getPhotosCol(jobId, sectionId), {
        ...photoData,
        createdAt: serverTimestamp(),
        deletedAt: null
    } as any);
    return docRef.id;
};

export const listPhotos = async (jobId: string, sectionId: string) => {
    const q = query(
        getPhotosCol(jobId, sectionId),
        where('deletedAt', '==', null),
        orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const softDeletePhoto = async (jobId: string, sectionId: string, photoId: string, storagePath: string) => {
    try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
    } catch (error) {
        console.error("Storage delete failed, but marking doc as deleted:", error);
    }

    await updateDoc(doc(db, 'jobs', jobId, 'sections', sectionId, 'photos', photoId), {
        deletedAt: serverTimestamp()
    });
};

// --- API: Notifications ---

export const listAdminNotifications = async () => {
    const q = query(notificationsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const markRead = async (notificationId: string) => {
    await updateDoc(doc(db, 'admin_notifications', notificationId), {
        readAt: serverTimestamp()
    });
};

// --- API: Config ---

export const getRetentionConfig = async () => {
    const docSnap = await getDoc(retentionDocRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return { retentionDays: 14, enabled: true };
};
// --- API: Delete Entire Job (Admin Only) ---

export const deleteJobTotal = async (jobId: string) => {
    // 1. 섹션 목록 가져오기
    const sections = await listSections(jobId);

    for (const section of sections) {
        // 2. 각 섹션의 사진(삭제되지 않은 것 + 이미 삭제된 것 모두) 가져오기
        // listPhotos는 deletedAt == null인 것만 가져오므로, 전체 조회가 필요함
        const photosCol = collection(db, 'jobs', jobId, 'sections', section.id, 'photos');
        const photoSnap = await getDocs(photosCol);

        for (const pDoc of photoSnap.docs) {
            const photo = pDoc.data() as Photo;
            // 3. Storage 파일 삭제 (이미 소프트 삭제된 경우 파일이 없으므로 건너뜀)
            if (!photo.deletedAt) {
                try {
                    const fileRef = ref(storage, photo.storagePath);
                    await deleteObject(fileRef);
                } catch (error) {
                    console.warn("Cleanup: Storage file delete failed:", photo.storagePath);
                }
            }
            // 4. 사진 문서 삭제
            await deleteDoc(pDoc.ref);
        }

        // 5. 섹션 문서 삭제
        await deleteDoc(doc(db, 'jobs', jobId, 'sections', section.id));
    }

    // 6. 관련 알림 삭제
    const notifQuery = query(collection(db, 'admin_notifications'), where('jobId', '==', jobId));
    const notifSnap = await getDocs(notifQuery);
    for (const nDoc of notifSnap.docs) {
        await deleteDoc(nDoc.ref);
    }

    // 7. 작업 문서 최종 삭제
    await deleteDoc(doc(db, 'jobs', jobId));
};

```

---


## src/lib/firebase.ts

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Ensure auth persistence is set to LOCAL for mobile stability.
 * We export a promise so AuthContext can await before subscribing.
 */
export const authReady = setPersistence(auth, browserLocalPersistence)
    .catch((err) => {
        console.error('[AUTH_PERSISTENCE] setPersistence failed:', err);
    });

export default app;

```

---


## src/services/photoService.ts

```typescript
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { addPhotoDoc, softDeletePhoto } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 전/후 사진 업로드 통합 프로세스
 * 1. Storage 업로드 (jobs/{jobId}/sections/{sectionId}/{type}/{photoId}.jpg)
 * 2. Firestore Photo 문서 생성
 */
export const uploadPhoto = async (
    file: File,
    jobId: string,
    sectionId: string,
    type: 'BEFORE' | 'AFTER'
) => {
    const photoId = uuidv4();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storagePath = `jobs/${jobId}/sections/${sectionId}/${type.toLowerCase()}/${photoId}.${fileExtension}`;

    const storageRef = ref(storage, storagePath);

    // 1. Storage 업로드
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    // 2. Firestore 문서 기록
    const docId = await addPhotoDoc({
        jobId,
        sectionId,
        type,
        storagePath,
        downloadUrl, // Persist the token-authenticated URL
        originalFileName: file.name
    });

    return { id: docId, url: downloadUrl, storagePath };
};

/**
 * 사진 삭제 (Storage 실삭제 + Firestore Soft Delete)
 */
export const deletePhoto = async (jobId: string, sectionId: string, photoId: string, storagePath: string) => {
    return await softDeletePhoto(jobId, sectionId, photoId, storagePath);
};

```

---

