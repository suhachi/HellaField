import * as admin from 'firebase-admin';

// NOTE: 서비스 계정 키 파일(serviceAccountKey.json)이 필요합니다.
// Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 민간 키 생성에서 다운로드 가능합니다.
// 보안을 위해 이 파일은 절대 git에 포함시키지 마세요.
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const SEED_DATA = {
    users: [
        {
            email: 'worker@hella.com',
            uid: 'gei2wzagvZVk7cZy2ZnJa4jCxZR2',
            role: 'WORKER',
        },
        {
            email: 'admin@hella.com',
            uid: 'oFQ7TjHfoscC6vvjI1hhKiRFjBg1',
            role: 'ADMIN',
        }
    ],
    config: {
        retentionDays: 14,
        enabled: true
    }
};

async function seed() {
    console.log('🚀 Starting Seeding Process...');

    // 1. Auth Users
    for (const user of SEED_DATA.users) {
        try {
            // 이미 존재하는지 확인
            await auth.getUser(user.uid);
            console.log(`✅ Auth user exists: ${user.email} (${user.uid})`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // 존재하지 않으면 생성 (임시 비밀번호 설정 - 추후 콘솔에서 초기화 권장)
                await auth.createUser({
                    uid: user.uid,
                    email: user.email,
                    password: 'hella_placeholder_1234', // 임시 비밀번호
                    displayName: user.role,
                });
                console.log(`✨ Created Auth user: ${user.email} (${user.uid})`);
            } else {
                throw error;
            }
        }

        // 2. Firestore Role Docs
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            role: user.role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`📝 Upserted Firestore role: ${user.role} for ${user.uid}`);
    }

    // 3. App Config
    await db.collection('app_config').doc('retention').set({
        ...SEED_DATA.config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('⚙️ Upserted /app_config/retention settings.');

    console.log('\n🏁 Seeding Complete!');
    console.log('--------------------------------------------------');
    console.log('IMPORTANT: 임시 비밀번호(hella_placeholder_1234)로 계정이 생성되었습니다.');
    console.log('생성 후 반드시 Firebase Console에서 비밀번호를 재설정(Reset Password) 해주세요.');
    console.log('--------------------------------------------------');
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
