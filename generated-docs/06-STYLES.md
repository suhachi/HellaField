# 06-STYLES

## 글로벌 스타일

_CSS 변수 및 전역 스타일_

총 2개 파일

---

## 📋 파일 목록

- src/styles/global.css
- src/styles/tokens.css

---

## 📦 전체 코드


## src/styles/global.css

```css
@import './tokens.css';

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Noto Sans KR', sans-serif;
    background-color: var(--hc-bg);
    color: var(--hc-text);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}

a {
    text-decoration: none;
    color: inherit;
}

button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;
}

.container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--spacing-md);
}

.card {
    background-color: var(--hc-surface);
    border: 1px solid var(--hc-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
}

.btn-primary {
    background-color: var(--hc-primary);
    color: white;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-md);
    font-weight: 700;
    transition: background-color var(--transition-fast);
}

.btn-primary:hover {
    background-color: var(--hc-primary-hover);
}
```

---


## src/styles/tokens.css

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');

:root {
    /* HellaCompany Color Tokens */
    --hc-blue-900: #111737;
    --hc-blue-700: #1B588D;
    --hc-blue-500: #3857F5;
    --hc-blue-300: #6C84FF;

    --hc-gray-900: #333333;
    --hc-gray-700: #444444;
    --hc-gray-300: #AAAAAA;

    --hc-bg: #ffffff;
    --hc-surface: #f7f8fa;
    --hc-border: #e5e7eb;

    /* Semantic Tokens */
    --hc-primary: var(--hc-blue-500);
    --hc-primary-hover: var(--hc-blue-300);
    --hc-text: var(--hc-gray-900);
    --hc-muted: var(--hc-gray-700);
    --hc-disabled: var(--hc-gray-300);
    --hc-danger: #ef4444;
    --hc-success: #22c55e;

    /* Layout & Spacing */
    --radius-lg: 12px;
    --radius-md: 8px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Transitions */
    --transition-fast: 0.2s ease;
}
```

---

