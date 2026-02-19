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
