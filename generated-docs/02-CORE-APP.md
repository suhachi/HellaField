# 02-CORE-APP

## 핵심 애플리케이션 파일, 타입 정의

_React 앱 진입점 및 루트 컴포넌트 / TypeScript 인터페이스 및 타입 선언_

총 6개 파일

---

## 📋 파일 목록

- src/App.css
- src/App.tsx
- src/index.css
- src/main.tsx
- src/types/index.ts
- src/vite-env.d.ts

---

## 📦 전체 코드


## src/App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

---


## src/App.tsx

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { AuthProvider } from './app/AuthContext';
import ProtectedRoute from './app/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import WorkerJobsPage from './pages/worker/WorkerJobsPage';
import WorkerJobDetailPage from './pages/worker/WorkerJobDetailPage';

// 임시 페이지
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminJobDetailPage from './pages/admin/AdminJobDetailPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route path="/admin/jobs" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminJobsPage />
              </ProtectedRoute>
            } />

            <Route path="/admin/jobs/:jobId" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminJobDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/worker/jobs" element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerJobsPage />
              </ProtectedRoute>
            } />

            <Route path="/worker/jobs/:jobId" element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerJobDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

```

---


## src/index.css

```css
@import './styles/global.css';
```

---


## src/main.tsx

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { authReady } from './lib/firebase'

async function bootstrap() {
  await authReady;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap();

```

---


## src/types/index.ts

```typescript
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

```

---


## src/vite-env.d.ts

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

```

---

