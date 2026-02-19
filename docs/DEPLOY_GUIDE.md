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
