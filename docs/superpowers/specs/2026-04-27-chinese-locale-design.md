# Chinese Locale & UI Consistency Design

## Background

The project (Vue 3 + Element Plus) is Chinese-only but has several locale inconsistencies:
- Element Plus components display English defaults (OK/Cancel, month names, pagination)
- Browser native `confirm()` dialogs mixed with Element Plus `ElMessageBox`
- `formatDate` duplicated across 5 files with basic `toLocaleDateString('zh-CN')` output

## Changes

### 1. Element Plus Global Chinese Locale

Wrap root component in `<el-config-provider :locale="zhCn">` in `App.vue`.

Import `zhCn` from `element-plus/es/locale/lang/zh-cn`.

### 2. Replace Native confirm() in ChatPage

Replace 2 browser `confirm()` calls in `ChatPage.vue` with `ElMessageBox.confirm`, matching the rest of the app.

### 3. Extract Shared formatDate

Create `src/composables/useFormatDate.js` with a single `formatDate` function outputting `YYYY年MM月DD日` format.

Remove duplicated `formatDate` from:
- AdminPage.vue
- PostDetailPage.vue
- ProfilePage.vue
- ProposalPage.vue
- SeatBookingPage.vue

Replace all with import from the shared composable.

### 4. Deduplicate MessagesPage formatTime

Replace the custom `formatTime` in `MessagesPage.vue` with the existing `useTimeAgo` composable for relative times, and add a fallback absolute date using the shared `formatDate`.

## Scope

No i18n framework. No new dependencies. Purely UI consistency improvements.
