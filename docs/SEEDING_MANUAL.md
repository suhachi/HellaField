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
