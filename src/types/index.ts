import { Timestamp } from 'firebase/firestore';

export type UserRole = 'WORKER' | 'ADMIN';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    createdAt: Timestamp;
}

export type JobStatus = 'DRAFT' | 'BEFORE_DONE' | 'SUBMITTED';

export interface Job {
    id: string;
    date: string; // YYYY-MM-DD
    siteTitle: string;
    assigneeName: string;
    createdByUid: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: JobStatus;
    submittedAt: Timestamp | null;
}

export interface Section {
    id: string;
    jobId: string;
    title: string;
    description: string;
    createdAt: Timestamp;
    order: number;
}

export type PhotoType = 'BEFORE' | 'AFTER';

export interface Photo {
    id: string;
    jobId: string;
    sectionId: string;
    type: PhotoType;
    storagePath: string;
    originalFileName: string;
    createdAt: Timestamp;
    createdByUid: string;
    deletedAt: Timestamp | null;
}

export interface AdminNotification {
    id: string;
    jobId: string;
    siteTitle: string;
    createdAt: Timestamp;
    read: boolean;
}
