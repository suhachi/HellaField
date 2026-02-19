# 08-SCRIPTS

## 유틸리티 스크립트

_데이터 시딩 및 자동화 스크립트_

총 2개 파일

---

## 📋 파일 목록

- scripts/generate-docs.ts
- scripts/seed_prod.ts

---

## 📦 전체 코드


## scripts/generate-docs.ts

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  category: string;
}

const OUTPUT_DIR = 'generated-docs';
const ROOT_DIR = process.cwd();

// 제외할 디렉토리와 파일 패턴
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'generated-docs',
  'package-lock.json',
  'functions/lib',
  'functions/node_modules',
];

// 파일 카테고리 정의 - 9개 그룹으로 통합
const FILE_CATEGORIES: Record<string, { pattern: RegExp; name: string; description: string }[]> = {
  '01-CONFIG': [
    { pattern: /^(package\.json|tsconfig.*\.json|vite\.config\.ts|eslint\.config\.js)$/, name: '프로젝트 설정 파일', description: 'npm, TypeScript, Vite, ESLint 설정' },
    { pattern: /^(firebase\.json|firestore\.(rules|indexes\.json)|storage\.rules)$/, name: 'Firebase 설정', description: 'Firebase 프로젝트 및 보안 규칙' },
  ],
  '02-CORE-APP': [
    { pattern: /^src\/(main\.tsx|App\.tsx|index\.css|App\.css|vite-env\.d\.ts)$/, name: '핵심 애플리케이션 파일', description: 'React 앱 진입점 및 루트 컴포넌트' },
    { pattern: /^src\/types\/.*\.ts$/, name: '타입 정의', description: 'TypeScript 인터페이스 및 타입 선언' },
  ],
  '03-AUTH-LIBS': [
    { pattern: /^src\/app\/(AuthContext|ProtectedRoute)\.tsx$/, name: '인증 컨텍스트', description: '사용자 인증 및 보호된 라우트' },
    { pattern: /^src\/(lib|services)\/.*\.(ts|tsx)$/, name: '라이브러리 및 서비스', description: 'Firebase 설정 및 비즈니스 로직' },
    { pattern: /^src\/hooks\/.*\.tsx?$/, name: '커스텀 훅', description: 'React 재사용 가능한 훅' },
  ],
  '04-COMPONENTS': [
    { pattern: /^src\/components\/(common|layout)\/.*\.tsx$/, name: '공통 컴포넌트', description: '레이아웃 및 재사용 컴포넌트' },
    { pattern: /^src\/components\/worker\/.*\.tsx$/, name: '작업자 컴포넌트', description: '현장 작업자용 UI 컴포넌트' },
    { pattern: /^src\/components\/admin\/.*\.tsx$/, name: '관리자 컴포넌트', description: '관리자용 UI 컴포넌트' },
    { pattern: /^src\/components\/.*\.tsx$/, name: '기타 컴포넌트', description: '기타 React 컴포넌트' },
  ],
  '05-PAGES': [
    { pattern: /^src\/pages\/(LoginPage|UnauthorizedPage)\.tsx$/, name: '인증 페이지', description: '로그인 및 권한 오류 페이지' },
    { pattern: /^src\/pages\/worker\/.*\.tsx$/, name: '작업자 페이지', description: '현장 작업자 작업 관리 페이지' },
    { pattern: /^src\/pages\/admin\/.*\.tsx$/, name: '관리자 페이지', description: '관리자 대시보드 및 관리 페이지' },
  ],
  '06-STYLES': [
    { pattern: /^src\/styles\/.*\.css$/, name: '글로벌 스타일', description: 'CSS 변수 및 전역 스타일' },
  ],
  '07-FUNCTIONS': [
    { pattern: /^functions\/src\/.*\.(ts|js)$/, name: 'Cloud Functions 소스', description: 'Firebase Cloud Functions 코드' },
    { pattern: /^functions\/(package\.json|tsconfig\.json)$/, name: 'Functions 설정', description: 'Cloud Functions 프로젝트 설정' },
  ],
  '08-SCRIPTS': [
    { pattern: /^scripts\/.*\.ts$/, name: '유틸리티 스크립트', description: '데이터 시딩 및 자동화 스크립트' },
  ],
  '09-OTHER': [
    { pattern: /^(index\.html|README\.md)$/, name: '기타 파일', description: 'HTML 진입점 및 프로젝트 문서' },
    { pattern: /^docs\/.*\.md$/, name: '문서', description: '프로젝트 가이드 및 매뉴얼' },
  ],
};

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(ROOT_DIR, filePath);

    if (shouldExclude(relativePath)) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function categorizeFile(relativePath: string): string {
  const normalizedPath = relativePath.replace(/\\/g, '/');

  for (const [category, patterns] of Object.entries(FILE_CATEGORIES)) {
    for (const { pattern } of patterns) {
      if (pattern.test(normalizedPath)) {
        return category;
      }
    }
  }

  return '09-OTHER';
}

function escapeMarkdown(content: string): string {
  // MD 파일은 그대로 유지
  return content;
}

function generateMarkdownForFile(fileInfo: FileInfo): string {
  const ext = path.extname(fileInfo.relativePath).substring(1);
  const language = ext === 'tsx' ? 'typescript' : ext === 'ts' ? 'typescript' : ext;

  return `
## ${fileInfo.relativePath.replace(/\\/g, '/')}

\`\`\`${language}
${fileInfo.content}
\`\`\`

---

`;
}

function generateTableOfContents(files: FileInfo[]): string {
  const categorized = new Map<string, FileInfo[]>();

  files.forEach(file => {
    if (!categorized.has(file.category)) {
      categorized.set(file.category, []);
    }
    categorized.get(file.category)!.push(file);
  });

  let toc = '# 프로젝트 전체 문서 - 목차\n\n';
  toc += `생성 날짜: ${new Date().toLocaleString('ko-KR')}\n\n`;
  toc += `총 파일 수: ${files.length}\n\n`;

  const sortedCategories = Array.from(categorized.keys()).sort();

  sortedCategories.forEach(category => {
    const categoryFiles = categorized.get(category)!;
    
    // 카테고리 내의 모든 패턴의 이름과 설명을 수집
    const categoryInfo = FILE_CATEGORIES[category] || [];
    const categoryName = categoryInfo.map(c => c.name).join(', ') || 'Other';
    const categoryDesc = categoryInfo[0]?.description || '';
    
    toc += `## ${category}\n\n`;
    toc += `**${categoryName}** (${categoryFiles.length} 파일)\n\n`;
    if (categoryDesc) {
      toc += `_${categoryDesc}_\n\n`;
    }
    
    categoryFiles.forEach(file => {
      toc += `- ${file.relativePath.replace(/\\/g, '/')}\n`;
    });
    
    toc += '\n';
  });

  return toc;
}

function generateProjectStructure(): string {
  let structure = '# 프로젝트 구조\n\n';
  structure += '```\n';
  
  function buildTree(dir: string, prefix: string = ''): string {
    let result = '';
    const files = fs.readdirSync(dir);
    const filtered = files.filter(f => !shouldExclude(path.join(dir, f)));

    filtered.forEach((file, index) => {
      const filePath = path.join(dir, file);
      const isLast = index === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const relativePath = path.relative(ROOT_DIR, filePath);

      if (shouldExclude(relativePath)) {
        return;
      }

      result += prefix + connector + file + '\n';

      if (fs.statSync(filePath).isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += buildTree(filePath, newPrefix);
      }
    });

    return result;
  }

  structure += path.basename(ROOT_DIR) + '/\n';
  structure += buildTree(ROOT_DIR);
  structure += '```\n\n';

  return structure;
}

async function generateDocumentation() {
  console.log('📚 프로젝트 문서화 시작...');

  // 출력 디렉토리 생성
  const outputPath = path.join(ROOT_DIR, OUTPUT_DIR);
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true });
  }
  fs.mkdirSync(outputPath, { recursive: true });

  // 모든 파일 수집
  console.log('📂 파일 수집 중...');
  const allFiles = getAllFiles(ROOT_DIR);
  
  const fileInfos: FileInfo[] = allFiles.map(filePath => {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const category = categorizeFile(relativePath);

    return {
      path: filePath,
      relativePath,
      content,
      category,
    };
  });

  console.log(`✅ 총 ${fileInfos.length}개 파일 발견`);

  // 카테고리별로 그룹화
  const categorized = new Map<string, FileInfo[]>();
  fileInfos.forEach(file => {
    if (!categorized.has(file.category)) {
      categorized.set(file.category, []);
    }
    categorized.get(file.category)!.push(file);
  });

  // 00-INDEX.md 생성
  console.log('📝 목차 생성 중...');
  const tocContent = generateTableOfContents(fileInfos);
  fs.writeFileSync(path.join(outputPath, '00-INDEX.md'), tocContent, 'utf-8');

  // 카테고리별 MD 파일 생성
  const sortedCategories = Array.from(categorized.keys()).sort();
  
  for (const category of sortedCategories) {
    const files = categorized.get(category)!;
    
    // 카테고리 내의 모든 패턴의 이름과 설명을 수집
    const categoryInfo = FILE_CATEGORIES[category] || [];
    const categoryNames = categoryInfo.map(c => c.name).join(', ') || 'Other';
    const categoryDesc = categoryInfo.map(c => c.description).filter(Boolean).join(' / ');
    
    console.log(`📄 생성 중: ${category}.md (${files.length} 파일)`);
    
    let mdContent = `# ${category}\n\n`;
    mdContent += `## ${categoryNames}\n\n`;
    if (categoryDesc) {
      mdContent += `_${categoryDesc}_\n\n`;
    }
    mdContent += `총 ${files.length}개 파일\n\n`;
    mdContent += '---\n\n';
    mdContent += '## 📋 파일 목록\n\n';
    
    files.forEach(file => {
      mdContent += `- ${file.relativePath.replace(/\\/g, '/')}\n`;
    });
    
    mdContent += '\n---\n\n';
    mdContent += '## 📦 전체 코드\n\n';
    
    files.forEach(file => {
      mdContent += generateMarkdownForFile(file);
    });

    const filename = `${category}.md`;
    fs.writeFileSync(path.join(outputPath, filename), mdContent, 'utf-8');
  }

  // README 생성
  console.log('📋 README 생성 중...');
  let readmeContent = `# HellaCompany BeforeAfter Field Log - 완전한 코드 문서\n\n`;
  readmeContent += `생성 날짜: ${new Date().toLocaleString('ko-KR')}\n\n`;
  readmeContent += `이 문서는 프로젝트의 모든 파일과 코드를 100% 포함합니다.\n\n`;
  
  // 프로젝트 구조 추가
  readmeContent += `## 📁 프로젝트 구조\n\n`;
  readmeContent += '```\n';
  readmeContent += path.basename(ROOT_DIR) + '/\n';
  
  function buildCompactTree(dir: string, prefix: string = '', depth: number = 0): string {
    if (depth > 3) return ''; // 깊이 제한
    
    let result = '';
    const files = fs.readdirSync(dir);
    const filtered = files.filter(f => !shouldExclude(path.join(dir, f)));

    filtered.forEach((file, index) => {
      const filePath = path.join(dir, file);
      const isLast = index === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const relativePath = path.relative(ROOT_DIR, filePath);

      if (shouldExclude(relativePath)) {
        return;
      }

      result += prefix + connector + file + '\n';

      if (fs.statSync(filePath).isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += buildCompactTree(filePath, newPrefix, depth + 1);
      }
    });

    return result;
  }
  
  readmeContent += buildCompactTree(ROOT_DIR);
  readmeContent += '```\n\n';
  
  readmeContent += `## 📚 문서 구조 (9개 파일)\n\n`;
  readmeContent += `1. **README.md** - 이 문서 (프로젝트 개요 및 통계)\n`;
  readmeContent += `2. **00-INDEX.md** - 전체 파일 목차\n\n`;
  
  let docIndex = 3;
  sortedCategories.forEach(category => {
    const files = categorized.get(category)!;
    const categoryInfo = FILE_CATEGORIES[category] || [];
    const categoryNames = categoryInfo.map(c => c.name).join(', ') || 'Other';
    readmeContent += `${docIndex}. **${category}.md** - ${categoryNames} (${files.length} 파일)\n`;
    docIndex++;
  });

  readmeContent += `\n## 📊 통계\n\n`;
  readmeContent += `- **총 파일 수**: ${fileInfos.length}개\n`;
  readmeContent += `- **총 카테고리 수**: ${sortedCategories.length}개\n`;
  readmeContent += `- **생성된 문서 수**: ${sortedCategories.length + 2}개 (README + INDEX + ${sortedCategories.length}개 카테고리)\n`;
  
  const totalLines = fileInfos.reduce((sum, file) => sum + file.content.split('\n').length, 0);
  const totalChars = fileInfos.reduce((sum, file) => sum + file.content.length, 0);
  
  readmeContent += `- **총 라인 수**: ${totalLines.toLocaleString()}줄\n`;
  readmeContent += `- **총 문자 수**: ${totalChars.toLocaleString()}자\n\n`;
  
  // 카테고리별 통계
  readmeContent += `## 📂 카테고리별 세부 정보\n\n`;
  sortedCategories.forEach(category => {
    const files = categorized.get(category)!;
    const categoryInfo = FILE_CATEGORIES[category] || [];
    const categoryNames = categoryInfo.map(c => c.name).join(', ') || 'Other';
    const categoryDesc = categoryInfo[0]?.description || '';
    
    readmeContent += `### ${category}\n`;
    readmeContent += `**${categoryNames}**\n\n`;
    if (categoryDesc) {
      readmeContent += `${categoryDesc}\n\n`;
    }
    readmeContent += `- 파일 수: ${files.length}개\n`;
    
    const categoryLines = files.reduce((sum, file) => sum + file.content.split('\n').length, 0);
    readmeContent += `- 코드 라인: ${categoryLines.toLocaleString()}줄\n\n`;
  });
  
  readmeContent += `\n---\n\n`;
  readmeContent += `> 💡 **참고**: 모든 파일의 100% 전체 코드가 각 카테고리 MD 파일에 포함되어 있습니다.\n`;
  readmeContent += `> \n`;
  readmeContent += `> 이 문서는 [\`scripts/generate-docs.ts\`](../scripts/generate-docs.ts) 스크립트로 자동 생성되었습니다.\n`;

  fs.writeFileSync(path.join(outputPath, 'README.md'), readmeContent, 'utf-8');

  console.log('\n✨ 문서화 완료!');
  console.log(`📁 출력 위치: ${outputPath}`);
  console.log(`📊 생성된 파일: ${sortedCategories.length + 2}개 (README + INDEX + ${sortedCategories.length}개 카테고리)`);
  console.log('\n생성된 파일 목록:');
  console.log('  ✓ README.md');
  console.log('  ✓ 00-INDEX.md');
  sortedCategories.forEach(cat => {
    const files = categorized.get(cat)!;
    console.log(`  ✓ ${cat}.md (${files.length} 파일)`);
  });
}

// 실행
generateDocumentation().catch(console.error);

```

---


## scripts/seed_prod.ts

```typescript
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

```

---

