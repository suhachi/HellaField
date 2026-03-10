# HellaCompany BeforeAfter Field Log - 완전한 코드 문서

생성 날짜: 2026. 2. 20. 오후 8:23:55

이 문서는 프로젝트의 모든 파일과 코드를 100% 포함합니다.

## 📁 프로젝트 구조

```
HellaCompany-BeforeAfter-Field-Log/
├── .env
├── .env.example
├── .firebase
│   └── hosting.ZGlzdA.cache
├── .firebaserc
├── docs
│   ├── DEPLOY_GUIDE.md
│   ├── QA_CHECKLIST.md
│   ├── SEEDING.md
│   └── SEEDING_MANUAL.md
├── eslint.config.js
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── functions
│   ├── lib
│   │   ├── index.js
│   │   └── index.js.map
│   ├── package.json
│   ├── src
│   │   └── index.ts
│   └── tsconfig.json
├── index.html
├── package.json
├── public
│   └── vite.svg
├── README.md
├── scripts
│   ├── generate-docs.ts
│   └── seed_prod.ts
├── src
│   ├── app
│   │   ├── AuthContext.tsx
│   │   └── ProtectedRoute.tsx
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   │   └── react.svg
│   ├── components
│   │   ├── admin
│   │   │   ├── NotificationPanel.tsx
│   │   │   └── ReportTemplate.tsx
│   │   ├── AppLayout.tsx
│   │   ├── common
│   │   ├── layout
│   │   └── worker
│   │       ├── CameraOverlay.tsx
│   │       └── DrawingCanvas.tsx
│   ├── hooks
│   │   └── useAuth.tsx
│   ├── index.css
│   ├── lib
│   │   ├── db.ts
│   │   └── firebase.ts
│   ├── main.tsx
│   ├── pages
│   │   ├── admin
│   │   │   ├── AdminJobDetailPage.tsx
│   │   │   ├── AdminJobsPage.tsx
│   │   │   └── AdminNotificationsPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── UnauthorizedPage.tsx
│   │   └── worker
│   │       ├── WorkerJobDetailPage.tsx
│   │       └── WorkerJobsPage.tsx
│   ├── services
│   │   └── photoService.ts
│   ├── styles
│   │   ├── global.css
│   │   └── tokens.css
│   ├── types
│   │   └── index.ts
│   └── vite-env.d.ts
├── storage-cors.json
├── storage.rules
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 📚 문서 구조 (9개 파일)

1. **README.md** - 이 문서 (프로젝트 개요 및 통계)
2. **00-INDEX.md** - 전체 파일 목차

3. **01-CONFIG.md** - 프로젝트 설정 파일, Firebase 설정 (10 파일)
4. **02-CORE-APP.md** - 핵심 애플리케이션 파일, 타입 정의 (6 파일)
5. **03-AUTH-LIBS.md** - 인증 컨텍스트, 라이브러리 및 서비스, 커스텀 훅 (6 파일)
6. **04-COMPONENTS.md** - 공통 컴포넌트, 작업자 컴포넌트, 관리자 컴포넌트, 기타 컴포넌트 (5 파일)
7. **05-PAGES.md** - 인증 페이지, 작업자 페이지, 관리자 페이지 (7 파일)
8. **06-STYLES.md** - 글로벌 스타일 (2 파일)
9. **07-FUNCTIONS.md** - Cloud Functions 소스, Functions 설정 (3 파일)
10. **08-SCRIPTS.md** - 유틸리티 스크립트 (2 파일)
11. **09-OTHER.md** - 기타 파일, 문서 (15 파일)

## 📊 통계

- **총 파일 수**: 56개
- **총 카테고리 수**: 9개
- **생성된 문서 수**: 11개 (README + INDEX + 9개 카테고리)
- **총 라인 수**: 4,517줄
- **총 문자 수**: 174,511자

## 📂 카테고리별 세부 정보

### 01-CONFIG
**프로젝트 설정 파일, Firebase 설정**

npm, TypeScript, Vite, ESLint 설정

- 파일 수: 10개
- 코드 라인: 340줄

### 02-CORE-APP
**핵심 애플리케이션 파일, 타입 정의**

React 앱 진입점 및 루트 컴포넌트

- 파일 수: 6개
- 코드 라인: 191줄

### 03-AUTH-LIBS
**인증 컨텍스트, 라이브러리 및 서비스, 커스텀 훅**

사용자 인증 및 보호된 라우트

- 파일 수: 6개
- 코드 라인: 518줄

### 04-COMPONENTS
**공통 컴포넌트, 작업자 컴포넌트, 관리자 컴포넌트, 기타 컴포넌트**

레이아웃 및 재사용 컴포넌트

- 파일 수: 5개
- 코드 라인: 1,003줄

### 05-PAGES
**인증 페이지, 작업자 페이지, 관리자 페이지**

로그인 및 권한 오류 페이지

- 파일 수: 7개
- 코드 라인: 1,304줄

### 06-STYLES
**글로벌 스타일**

CSS 변수 및 전역 스타일

- 파일 수: 2개
- 코드 라인: 92줄

### 07-FUNCTIONS
**Cloud Functions 소스, Functions 설정**

Firebase Cloud Functions 코드

- 파일 수: 3개
- 코드 라인: 165줄

### 08-SCRIPTS
**유틸리티 스크립트**

데이터 시딩 및 자동화 스크립트

- 파일 수: 2개
- 코드 라인: 476줄

### 09-OTHER
**기타 파일, 문서**

HTML 진입점 및 프로젝트 문서

- 파일 수: 15개
- 코드 라인: 428줄


---

> 💡 **참고**: 모든 파일의 100% 전체 코드가 각 카테고리 MD 파일에 포함되어 있습니다.
> 
> 이 문서는 [`scripts/generate-docs.ts`](../scripts/generate-docs.ts) 스크립트로 자동 생성되었습니다.
