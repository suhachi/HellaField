# 07-FUNCTIONS

## Cloud Functions 소스, Functions 설정

_Firebase Cloud Functions 코드 / Cloud Functions 프로젝트 설정_

총 3개 파일

---

## 📋 파일 목록

- functions/package.json
- functions/src/index.ts
- functions/tsconfig.json

---

## 📦 전체 코드


## functions/package.json

```json
{
  "name": "functions",
  "scripts": {
    "lint": "eslint",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "firebase-functions-test": "^3.1.0"
  },
  "private": true
}
```

---


## functions/src/index.ts

```typescript
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

// 서울 리전 기본 설정
setGlobalOptions({ region: "asia-northeast3" });

/**
 * T06-02: 작업 제출 시 관리자 알림 생성 트리거
 */
export const onJobSubmitted = onDocumentUpdated("jobs/{jobId}", async (event) => {
    // ... (상동)
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    // status가 SUBMITTED로 "변경"된 경우에만 실행
    if (beforeData.status !== "SUBMITTED" && afterData.status === "SUBMITTED") {
        const jobId = event.params.jobId;
        const siteTitle = afterData.siteTitle;

        // 멱등성 보장: 동일 jobId에 대해 이미 알림이 있는지 확인
        const existing = await db.collection("admin_notifications")
            .where("jobId", "==", jobId)
            .where("type", "==", "JOB_SUBMITTED")
            .limit(1)
            .get();

        if (existing.empty) {
            await db.collection("admin_notifications").add({
                type: "JOB_SUBMITTED",
                jobId: jobId,
                siteTitle: siteTitle,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readAt: null
            });
            logger.info(`Notification created for Job: ${jobId}`);
        }
    }
});

/**
 * T06-03: 데이터 보관 기간(기본 14일) 경과 시 자동 삭제 스케줄러
 */
// [Purge] 매일 새벽 3시(서울)에 14일 경과된 데이터 삭제
export const dailyRetentionPurge = onSchedule({
    schedule: "0 3 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "512MiB"
}, async () => {
    const configSnap = await admin.firestore().doc("app_config/retention").get();
    const config = configSnap.data() as { retentionDays: number; enabled: boolean };

    if (!config?.enabled) {
        logger.info("Retention purge skipped: disabled in config.");
        return;
    }

    const retentionDays = config.retentionDays || 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const jobsToPurge = await admin.firestore()
        .collection("jobs")
        .where("status", "==", "SUBMITTED")
        .where("submittedAt", "<=", admin.firestore.Timestamp.fromDate(cutoffDate))
        .get();

    if (jobsToPurge.empty) {
        logger.info("No jobs to purge.");
        return;
    }

    const storageBucket = admin.storage().bucket();

    for (const jobDoc of jobsToPurge.docs) {
        const jobId = jobDoc.id;
        logger.info(`🔥 Purging job: ${jobId}`);

        try {
            // 1. Storage 파일 일괄 삭제 (jobs/{jobId}/ 경로 하위 전체)
            await storageBucket.deleteFiles({ prefix: `jobs/${jobId}/` });

            // 2. 서브컬렉션 순차 삭제 (Sections -> Photos)
            const sections = await jobDoc.ref.collection("sections").get();
            for (const section of sections.docs) {
                const photos = await section.ref.collection("photos").get();
                for (const photo of photos.docs) {
                    await photo.ref.delete();
                }
                await section.ref.delete();
            }

            // 3. 관련 알림 삭제
            const notifs = await admin.firestore()
                .collection("admin_notifications")
                .where("jobId", "==", jobId)
                .get();
            for (const n of notifs.docs) {
                await n.ref.delete();
            }

            // 4. Job 문서 삭제
            await jobDoc.ref.delete();

            logger.info(`✅ Successfully purged job: ${jobId}`);
        } catch (error: any) {
            logger.error(`❌ Failed to purge job ${jobId}:`, error);
        }
    }
});

```

---


## functions/tsconfig.json

```json
{
    "compilerOptions": {
        "module": "commonjs",
        "noImplicitAny": true,
        "outDir": "lib",
        "preserveConstEnums": true,
        "removeComments": true,
        "sourceMap": true,
        "target": "es2022",
        "esModuleInterop": true,
        "resolveJsonModule": true,
        "skipLibCheck": true,
        "typeRoots": [
            "./node_modules/@types"
        ]
    },
    "include": [
        "src"
    ]
}
```

---

