# 09-OTHER

## 기타 파일, 문서

_HTML 진입점 및 프로젝트 문서 / 프로젝트 가이드 및 매뉴얼_

총 15개 파일

---

## 📋 파일 목록

- .env
- .env.example
- .firebase/hosting.ZGlzdA.cache
- .firebaserc
- docs/DEPLOY_GUIDE.md
- docs/QA_CHECKLIST.md
- docs/SEEDING.md
- docs/SEEDING_MANUAL.md
- functions/lib/index.js
- functions/lib/index.js.map
- index.html
- public/vite.svg
- README.md
- src/assets/react.svg
- storage-cors.json

---

## 📦 전체 코드


## .env

```
VITE_FIREBASE_API_KEY=AIzaSyABbg_wttwHRdHS6OAt8BYY7Mfc4OeoMYM
VITE_FIREBASE_AUTH_DOMAIN=hellacompany.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hellacompany
VITE_FIREBASE_STORAGE_BUCKET=hellacompany.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=324182539306
VITE_FIREBASE_APP_ID=1:324182539306:web:f89e386b819bdb24ed5753
VITE_FIREBASE_MEASUREMENT_ID=G-BNY0NG7BLX
VITE_FCM_VAPID_KEY=BCSwHxZFTazV1-ZkcGwmNzOWgi7d-TLBAGMw5ae7qZyGfkQV52Ajpp6h7Oi78_j3ss7Km7rn1oT-8MzIpXrjQlc

```

---


## .env.example

```example
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

```

---


## .firebase/hosting.ZGlzdA.cache

```cache
vite.svg,1770979575136,699a02e0e68a579f687d364bbbe7633161244f35af068220aee37b1b33dfb3c7
index.html,1771055403024,840841714dd423cbe304e30447287561c1af116c5e8ed3eb34837517d00d1f1e
assets/index-BQlj8eL0.css,1771055403022,f738fc15fe6ffb9b9ad6bbe5dcdfc2226f150fa0f388565620070246b6f0d6bf
assets/index-B6THceI7.js,1771055403024,7a1bf9d94ad114738c638259ccd5d3962505917209edd623267bb48d7cd17d37

```

---


## .firebaserc

```
{
  "projects": {
    "default": "hellacompany"
  }
}

```

---


## docs/DEPLOY_GUIDE.md

```md
# HellaCompany Deployment & Rollback Guide

이 문서는 시스템의 안정적인 배포와 장애 대응을 위한 가이드를 제공합니다.

## 1. 운영 환경 배포 (Production Deploy)

### 1.1 사전 준비
- `serviceAccountKey.json`이 올바르게 위치해 있는지 확인.
- `.env` 파일에 상용 환경의 Firebase 환경 변수가 설정되어 있는지 확인.

### 1.2 배포 명령어
통합 배포 명령어를 통해 Hosting, Functions, Rules를 한 번에 배포합니다.

```bash
# 전체 배포 (Build 포함)
npm run deploy

# 부분 배포 (Hosting만)
npm run deploy:hosting

# 부분 배포 (Functions만)
npm run deploy:functions
```

## 2. 롤백 전략 (Rollback Strategy)

장애 발생 시 즉각적으로 이전 버전으로 복구하는 방법입니다.

### 2.1 Hosting 롤백
Firebase Console을 이용하거나 CLI 명령어로 이전 배포 버전을 다시 활성화합니다.

```bash
# 배포 이력 확인
firebase hosting:channel:list

# 이전 버전으로 즉시 롤백 (Console 권장)
# Firebase Console > Hosting > Release History에서 이전 버전 위 마우스 오버 후 'Rollback' 선택
```

### 2.2 Functions 롤백
코드 수준에서 이전 커밋으로 체크아웃한 뒤 다시 배포합니다.

```bash
# Git을 통한 복구
git checkout [PREVIOUS_COMMIT_HASH]
npm run deploy:functions
```

### 2.3 보안 규칙 롤백
`firestore.rules` 또는 `storage.rules` 파일을 이전 정상 상태로 되돌린 후 배포합니다.

```bash
npm run deploy:rules
```

## 3. 사후 관리용 체크리스트
- 배포 직후 `docs/QA_CHECKLIST.md`를 실행하여 핵심 기능 작동 여부 재확인.
- Cloud Functions 콘솔의 `로그(Logs)` 탭에서 에러 발생 여부 실시간 모니터링.

```

---


## docs/QA_CHECKLIST.md

```md
# HellaCompany QA Checklist (운영 투입 전 필수 확인)

본 체크리스트는 프로젝트 상용 배포 전 시스템의 모든 핵심 기능이 PRD 사양에 부합하는지 최종 확인하기 위한 문서입니다.

## 🔑 1. 인증 및 권한 (Auth/RBAC)
- [ ] **계정 로그인**: 어드민 계정(`admin@hella.com`)과 작업자 계정(`worker@hella.com`)으로 각각 로그인이 가능한가?
- [ ] **권한 게이트**: 작업자가 `/admin/jobs` 경로로 직접 접속 시 적절히 차단(Unauthorized 또는 Worker 페이지로 리다이렉트)되는가?
- [ ] **비인증 접근**: 로그아웃 상태에서 모든 페이지 접근 시 로그인 화면으로 유도되는가?

## 👷 2. 작업자 워크플로우 (Worker Flow)
- [ ] **Job 생성**: 일자 및 현장명을 입력하여 새로운 작업을 생성하고 목록에서 확인 가능한가?
- [ ] **섹션 관리**: 섹션을 무제한으로 추가/삭제할 수 있으며, 섹션 설명(설명 필드)이 입력 후 포커스를 잃을 때(onBlur) 자동 저장되는가?
- [ ] **비포(BEFORE) 업로드**: 다중 사진 선택 시 순차적으로 업로드되며, 목록에 정상 노출되는가?
- [ ] **제출 전 삭제**: 잘못 업로드된 사진을 삭제할 수 있는가?
- [ ] **에프터(AFTER) 오버레이**: 
  - `BEFORE_DONE` 상태 변경 후 에프터 촬영 시 비포 사진이 반투명하게 겹쳐 보이는가?
  - 3x3 그리드 가이드가 활성화되는가?
- [ ] **최종 제출(Submit)**: 
  - 제출 시 상태가 `SUBMITTED`로 변경되는가?
  - 제출 완료 후 모든 추가/삭제/편집 버튼이 비활성화되며 배너가 뜨는가?

## 👑 3. 관리자 검수 및 관리 (Admin Flow)
- [ ] **제출 목록**: 목록에 오직 `SUBMITTED` 상태의 작업만 노출되며, `siteTitle`이 가장 강조되어 보이는가?
- [ ] **상세 병렬 뷰**: 상세 페이지에서 비포와 에프터가 나란히(1:1) 배치되어 검수가 용이한가?
- [ ] **파일명 규칙 다운로드**: 
  - 사진 클릭 시 `{현장}_{섹션}_{타입}_{번호}.jpg` 형식으로 저장되는가?
  - 특수문자가 포함된 파일명이 언더바(`_`)로 치환되는가?
- [ ] **관리자 삭제**: 관리자 권한으로 사진 삭제 시 실제 Storage에서도 파일이 사라지는가?

## 🔔 4. 알림 및 자동화 (Notifications & Retention)
- [ ] **실시간 알림**: 작업자가 제출을 누르는 즉시 관리자 헤더의 종 아이콘에 숫자가 카운트되는가?
- [ ] **인박스 이동**: 알림 클릭 시 해당 작업의 상세 페이지로 즉시 이동하며 알림이 읽음 처리되는가?
- [ ] **데이터 파지(Purge)**: 
  - 14일이 지난 제출 완료 작업이 새벽 3시에 자동 삭제되는가?
  - `/app_config/retention`의 `enabled` 값을 `false`로 변경 시 자동 삭제가 중단되는가?

---
**최종 검토 결과**: [ ] Pass / [ ] Fail (사유: ____________________)
**검토자**: ____________________
**일시**: 2026-02-13

```

---


## docs/SEEDING.md

```md
# HellaCompany Seeding Guide

이 문서는 운영 환경 또는 에뮬레이터 환경에서 기본 관리자/작업자 계정과 설정을 주입하는 방법을 설명합니다.

## 1. 전제 조건
- Firebase Admin SDK 실행을 위해 `serviceAccountKey.json` 파일이 프로젝트 루트에 필요합니다.
  - 경로: Firebase Console > 프로젝트 설정 > 서비스 계정 > 노드(Node.js) > 새 민간 키 생성

## 2. 스크립트 실행 (Option 1)
프로젝트 루트에서 다음 명령어를 통해 시딩을 진행합니다. (tsx 또는 ts-node 필요)

```bash
# tsx를 사용하는 경우
npx tsx scripts/seed_prod.ts

# 또는 ts-node를 사용하는 경우
npx ts-node scripts/seed_prod.ts
```

## 3. 결과 확인
1. **Firebase Auth**: `worker@hella.com`, `admin@hella.com` 계정이 지정된 UID로 생성되었는지 확인.
2. **Firestore**:
   - `/users/gei2wzagvZVk7cZy2ZnJa4jCxZR2` -> `{role: "WORKER"}`
   - `/users/oFQ7TjHfoscC6vvjI1hhKiRFjBg1` -> `{role: "ADMIN"}`
   - `/app_config/retention` -> `{retentionDays: 14, enabled: true}`

## 4. 사후 조치 (필수)
- 보안을 위해 생성된 계정의 비밀번호를 Firebase 콘솔에서 즉시 변경하세요.
- `serviceAccountKey.json` 파일은 절대 공유하거나 커밋하지 마세요.

```

---


## docs/SEEDING_MANUAL.md

```md
# HellaCompany Manual Seeding Guide

스크립트 실행이 불가능한 경우, 아래 단계를 통해 Firebase Console에서 직접 설정을 적용할 수 있습니다.

## 1. Authentication 계정 생성
Firebase Console > Build > Authentication > Users 페이지에서 'Add user'를 클릭하여 다음 계정을 생성합니다.
- **주의**: 콘솔에서는 직접 UID를 지정하여 생성할 수 없습니다. 따라서 아래의 Firestore 작업 시 **실제 생성된 UID**를 사용해야 합니다. 
- (만약 꼭 고정 UID를 써야 한다면 스크립트 방식이 필수입니다.)

## 2. Firestore 데이터 주입
Firebase Console > Build > Firestore Database 페이지에서 다음 문서들을 생성합니다.

### A. 유저 역할 설정 (users 컬렉션)
- **Document ID**: {AUTH_UID}
- **Fields**:
  - `email`: (string) "admin@hella.com"
  - `role`: (string) "ADMIN"
  - `updatedAt`: (server timestamp)

- **Document ID**: {AUTH_UID}
- **Fields**:
  - `email`: (string) "worker@hella.com"
  - `role`: (string) "WORKER"
  - `updatedAt`: (server timestamp)

### B. 보존 정책 설정 (app_config 컬렉션)
- **Document ID**: `retention`
- **Fields**:
  - `retentionDays`: (number) 14
  - `enabled`: (boolean) true
  - `updatedAt`: (server timestamp)

## 3. 규칙(Rules) 작동 확인
설정이 완료되면 `firestore.rules`와 `storage.rules`가 `/users/{uid}` 문서를 참조하여 즉시 권한을 제어하기 시작합니다.

```

---


## functions/lib/index.js

```js
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyRetentionPurge = exports.onJobSubmitted = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
(0, v2_1.setGlobalOptions)({ region: "asia-northeast3" });
exports.onJobSubmitted = (0, firestore_1.onDocumentUpdated)("jobs/{jobId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    if (beforeData.status !== "SUBMITTED" && afterData.status === "SUBMITTED") {
        const jobId = event.params.jobId;
        const siteTitle = afterData.siteTitle;
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
            firebase_functions_1.logger.info(`Notification created for Job: ${jobId}`);
        }
    }
});
exports.dailyRetentionPurge = (0, scheduler_1.onSchedule)({
    schedule: "0 3 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "512MiB"
}, async () => {
    const configSnap = await admin.firestore().doc("app_config/retention").get();
    const config = configSnap.data();
    if (!config?.enabled) {
        firebase_functions_1.logger.info("Retention purge skipped: disabled in config.");
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
        firebase_functions_1.logger.info("No jobs to purge.");
        return;
    }
    const storageBucket = admin.storage().bucket();
    for (const jobDoc of jobsToPurge.docs) {
        const jobId = jobDoc.id;
        firebase_functions_1.logger.info(`🔥 Purging job: ${jobId}`);
        try {
            await storageBucket.deleteFiles({ prefix: `jobs/${jobId}/` });
            const sections = await jobDoc.ref.collection("sections").get();
            for (const section of sections.docs) {
                const photos = await section.ref.collection("photos").get();
                for (const photo of photos.docs) {
                    await photo.ref.delete();
                }
                await section.ref.delete();
            }
            const notifs = await admin.firestore()
                .collection("admin_notifications")
                .where("jobId", "==", jobId)
                .get();
            for (const n of notifs.docs) {
                await n.ref.delete();
            }
            await jobDoc.ref.delete();
            firebase_functions_1.logger.info(`✅ Successfully purged job: ${jobId}`);
        }
        catch (error) {
            firebase_functions_1.logger.error(`❌ Failed to purge job ${jobId}:`, error);
        }
    }
});
//# sourceMappingURL=index.js.map
```

---


## functions/lib/index.js.map

```map
{"version":3,"file":"index.js","sourceRoot":"","sources":["../src/index.ts"],"names":[],"mappings":"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"}
```

---


## index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>hellacompany-beforeafter-field-log</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

---


## public/vite.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
```

---


## README.md

```md
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

```

---


## src/assets/react.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>
```

---


## storage-cors.json

```json
[
    {
        "origin": [
            "https://hellacompany.web.app",
            "http://localhost:5173"
        ],
        "method": [
            "GET",
            "HEAD",
            "OPTIONS"
        ],
        "maxAgeSeconds": 3600,
        "responseHeader": [
            "Content-Type",
            "Content-Disposition"
        ]
    }
]
```

---

