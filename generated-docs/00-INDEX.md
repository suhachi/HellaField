# 프로젝트 전체 문서 - 목차

생성 날짜: 2026. 2. 14. 오후 5:14:49

총 파일 수: 54

## 01-CONFIG

**프로젝트 설정 파일, Firebase 설정** (10 파일)

_npm, TypeScript, Vite, ESLint 설정_

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

## 02-CORE-APP

**핵심 애플리케이션 파일, 타입 정의** (6 파일)

_React 앱 진입점 및 루트 컴포넌트_

- src/App.css
- src/App.tsx
- src/index.css
- src/main.tsx
- src/types/index.ts
- src/vite-env.d.ts

## 03-AUTH-LIBS

**인증 컨텍스트, 라이브러리 및 서비스, 커스텀 훅** (6 파일)

_사용자 인증 및 보호된 라우트_

- src/app/AuthContext.tsx
- src/app/ProtectedRoute.tsx
- src/hooks/useAuth.tsx
- src/lib/db.ts
- src/lib/firebase.ts
- src/services/photoService.ts

## 04-COMPONENTS

**공통 컴포넌트, 작업자 컴포넌트, 관리자 컴포넌트, 기타 컴포넌트** (3 파일)

_레이아웃 및 재사용 컴포넌트_

- src/components/admin/NotificationPanel.tsx
- src/components/AppLayout.tsx
- src/components/worker/CameraOverlay.tsx

## 05-PAGES

**인증 페이지, 작업자 페이지, 관리자 페이지** (7 파일)

_로그인 및 권한 오류 페이지_

- src/pages/admin/AdminJobDetailPage.tsx
- src/pages/admin/AdminJobsPage.tsx
- src/pages/admin/AdminNotificationsPage.tsx
- src/pages/LoginPage.tsx
- src/pages/UnauthorizedPage.tsx
- src/pages/worker/WorkerJobDetailPage.tsx
- src/pages/worker/WorkerJobsPage.tsx

## 06-STYLES

**글로벌 스타일** (2 파일)

_CSS 변수 및 전역 스타일_

- src/styles/global.css
- src/styles/tokens.css

## 07-FUNCTIONS

**Cloud Functions 소스, Functions 설정** (3 파일)

_Firebase Cloud Functions 코드_

- functions/package.json
- functions/src/index.ts
- functions/tsconfig.json

## 08-SCRIPTS

**유틸리티 스크립트** (2 파일)

_데이터 시딩 및 자동화 스크립트_

- scripts/generate-docs.ts
- scripts/seed_prod.ts

## 09-OTHER

**기타 파일, 문서** (15 파일)

_HTML 진입점 및 프로젝트 문서_

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

