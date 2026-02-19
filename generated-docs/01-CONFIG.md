# 01-CONFIG

## 프로젝트 설정 파일, Firebase 설정

_npm, TypeScript, Vite, ESLint 설정 / Firebase 프로젝트 및 보안 규칙_

총 10개 파일

---

## 📋 파일 목록

- eslint.config.js
- firebase.json
- firestore.indexes.json
- firestore.rules
- package.json
- storage.rules
- tsconfig.app.json
- tsconfig.json
- tsconfig.node.json
- vite.config.ts

---

## 📦 전체 코드


## eslint.config.js

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])

```

---


## firebase.json

```json
{
    "firestore": {
        "rules": "firestore.rules",
        "indexes": "firestore.indexes.json"
    },
    "functions": [
        {
            "source": "functions",
            "codebase": "default",
            "ignore": [
                "node_modules",
                ".git",
                "firebase-debug.log",
                "firebase-debug.*.log",
                "*.local"
            ],
            "predeploy": [
                "npm --prefix \"$RESOURCE_DIR\" run build"
            ]
        }
    ],
    "hosting": {
        "public": "dist",
        "ignore": [
            "firebase.json",
            "**/.*",
            "**/node_modules/**"
        ],
        "rewrites": [
            {
                "source": "**",
                "destination": "/index.html"
            }
        ]
    },
    "storage": {
        "rules": "storage.rules"
    }
}
```

---


## firestore.indexes.json

```json
{
    "indexes": [
        {
            "collectionGroup": "jobs",
            "queryScope": "COLLECTION",
            "fields": [
                {
                    "fieldPath": "status",
                    "order": "ASCENDING"
                },
                {
                    "fieldPath": "submittedAt",
                    "order": "DESCENDING"
                }
            ]
        }
    ],
    "fieldOverrides": []
}
```

---


## firestore.rules

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 유저 프로필 조회 헬퍼
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // 로그인 및 프로필 존재 여부 확인
    function isAuthenticated() {
      return request.auth != null && exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'ADMIN';
    }

    function isWorker() {
      return isAuthenticated() && getUserData().role == 'WORKER';
    }

    // Job 문서 조회 헬퍼
    function getJob(jobId) {
      return get(/databases/$(database)/documents/jobs/$(jobId)).data;
    }

    // [Users] 컬렉션: 본인만 읽기 가능, 관리자는 모두 읽기 가능
    match /users/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow write: if isAdmin(); // 프로필 생성/수정은 관리자만 (또는 가입 로직에 따라 조절)
    }

    // [Jobs] 컬렉션
    match /jobs/{jobId} {
      allow read: if isAuthenticated();
      allow create: if isWorker();
      allow update: if isAdmin() || (
        isWorker() && (
          // 제출 전에는 수정 가능
          resource.data.status != 'SUBMITTED' && (
            // 상태 전이 허용 케이스 명시
            (request.resource.data.status == 'BEFORE_DONE' && resource.data.status == 'DRAFT') ||
            (request.resource.data.status == 'SUBMITTED' && resource.data.status == 'BEFORE_DONE') ||
            (request.resource.data.status == resource.data.status)
          )
        )
      );
      allow delete: if isAdmin();

      // [Sections] 서브컬렉션
      match /sections/{sectionId} {
        allow read: if isAuthenticated();
        // 부모 job의 상태를 직접 참조하여 권한 결정
        allow create: if isWorker() && get(/databases/$(database)/documents/jobs/$(jobId)).data.status != 'SUBMITTED';
        allow update: if 
          (isAdmin() && get(/databases/$(database)/documents/jobs/$(jobId)).data.status == 'SUBMITTED') ||
          (isWorker() && get(/databases/$(database)/documents/jobs/$(jobId)).data.status != 'SUBMITTED');
        allow delete: if isAdmin();

        // [Photos] 서브컬렉션
        match /photos/{photoId} {
          allow read: if isAuthenticated();
          allow create: if isWorker() && get(/databases/$(database)/documents/jobs/$(jobId)).data.status != 'SUBMITTED';
          allow update: if 
            (isAdmin() && get(/databases/$(database)/documents/jobs/$(jobId)).data.status == 'SUBMITTED') ||
            (isWorker() && get(/databases/$(database)/documents/jobs/$(jobId)).data.status != 'SUBMITTED');
          allow delete: if isAdmin();
        }
      }
    }

    // [Admin Notifications]
    match /admin_notifications/{notificationId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated(); // Worker가 제출 시 생성
      allow update: if isAdmin(); // 읽음 처리
      allow delete: if isAdmin();
    }

    // [App Config]
    match /app_config/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}

```

---


## package.json

```json
{
  "name": "hellacompany-beforeafter-field-log",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "deploy": "npm run build && firebase deploy",
    "deploy:hosting": "npm run build && firebase deploy --only hosting",
    "deploy:functions": "cd functions && npm run build && cd .. && firebase deploy --only functions",
    "deploy:rules": "firebase deploy --only firestore:rules,storage"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "firebase": "^11.3.1",
    "lucide-react": "^0.564.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.1.5",
    "uuid": "^11.0.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@types/react-router-dom": "^5.3.3",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.48.0",
    "vite": "^7.3.1"
  }
}

```

---


## storage.rules

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Firestore 연동 헬퍼 (v2 rules 필요)
    function getJobData(jobId) {
      return firestore.get(/databases/(default)/documents/jobs/$(jobId)).data;
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    // 사용자 역할 확인 (Firestore 조회)
    function getUserRole() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role;
    }

    // [Photos] 저장 경로
    // jobs/{jobId}/sections/{sectionId}/{type}/{photoId}.jpg
    match /jobs/{jobId}/sections/{sectionId}/{type}/{photoId} {
      
      // 읽기는 인증된 사용자(Admin, Worker) 모두 가능
      allow read: if isAuthenticated();

      // 업로드 (Write)
      allow write: if isAuthenticated() && (
        getUserRole() == 'WORKER' && getJobData(jobId).status != 'SUBMITTED'
      );

      // 삭제 (Delete)
      allow delete: if isAuthenticated() && (
        getUserRole() == 'ADMIN' ||
        (getUserRole() == 'WORKER' && getJobData(jobId).status != 'SUBMITTED')
      );
    }
  }
}

```

---


## tsconfig.app.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}

```

---


## tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}

```

---


## tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}

```

---


## vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

```

---

