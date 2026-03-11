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
    downloadUrl: string; // PUBLIC download URL with token (Required for SSOT)
    title?: string | null; // NEW: Admin custom title
    createdAt: Timestamp;
    updatedAt?: Timestamp; // NEW: Track title edits
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

/**
 * addPhotoDoc: downloadUrl is a required field for SSOT compliance.
 */
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

export const updatePhotoTitle = async (jobId: string, sectionId: string, photoId: string, title: string | null) => {
    await updateDoc(doc(db, 'jobs', jobId, 'sections', sectionId, 'photos', photoId), {
        title,
        updatedAt: serverTimestamp()
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
    const sections = await listSections(jobId);
    const photoDeletionPromises: Promise<any>[] = [];

    // 1. Prepare photo and file deletions
    for (const section of sections) {
        const photosCol = collection(db, 'jobs', jobId, 'sections', section.id, 'photos');
        const photoSnap = await getDocs(photosCol);
        
        for (const pDoc of photoSnap.docs) {
            const photo = pDoc.data() as Photo;
            
            // Storage file deletion promise
            if (photo.storagePath && !photo.deletedAt) {
                const fileTask = (async () => {
                    try {
                        const fileRef = ref(storage, photo.storagePath);
                        await deleteObject(fileRef);
                    } catch (error: any) {
                        // Silence 404 errors so they don't appear as red errors in console
                        if (error.code === 'storage/object-not-found') return;
                        console.warn("Cleanup: Storage file delete failed:", photo.storagePath, error);
                    }
                })();
                photoDeletionPromises.push(fileTask);
            }
            // Firestore photo document deletion promise
            photoDeletionPromises.push(deleteDoc(pDoc.ref));
        }
    }

    // Execute all photo/file deletions in parallel for speed
    await Promise.all(photoDeletionPromises);

    // 2. Delete all sections in parallel
    const sectionTasks = sections.map(s => deleteDoc(doc(db, 'jobs', jobId, 'sections', s.id)));
    await Promise.all(sectionTasks);

    // 3. Delete all related notifications in parallel
    const notifQuery = query(collection(db, 'admin_notifications'), where('jobId', '==', jobId));
    const notifSnap = await getDocs(notifQuery);
    const notificationTasks = notifSnap.docs.map(nDoc => deleteDoc(nDoc.ref));
    await Promise.all(notificationTasks);

    // 4. Finally delete the main job document
    await deleteDoc(doc(db, 'jobs', jobId));
};
