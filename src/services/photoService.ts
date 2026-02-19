import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { addPhotoDoc, softDeletePhoto } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 전/후 사진 업로드 통합 프로세스 (SSOT)
 * 1) Storage 업로드
 * 2) downloadUrl(getDownloadURL) 획득
 * 3) Firestore Photo 문서 생성 (downloadUrl 필수 포함)
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

    const uploadResult = await uploadBytes(storageRef, file);

    // 토큰 포함 공개 URL (SSOT 핵심)
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    const docId = await addPhotoDoc({
        jobId,
        sectionId,
        type,
        storagePath,
        downloadUrl,
        originalFileName: file.name
    });

    return { id: docId, url: downloadUrl, storagePath };
};

export const deletePhoto = async (
    jobId: string,
    sectionId: string,
    photoId: string,
    storagePath: string
) => {
    return await softDeletePhoto(jobId, sectionId, photoId, storagePath);
};
