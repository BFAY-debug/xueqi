# Chinese Locale & UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all time displays and confirmation dialogs consistent with Chinese locale conventions.

**Architecture:** Four independent changes — Element Plus locale config, native confirm replacement, shared formatDate extraction, MessagesPage dedup. No new dependencies.

**Tech Stack:** Vue 3, Element Plus 2.9, native Date APIs

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `frontend/src/App.vue` | Wrap with `el-config-provider` for Chinese locale |
| Create | `frontend/src/composables/useFormatDate.js` | Shared `formatDate` composable |
| Modify | `frontend/src/views/AdminPage.vue` | Import shared `formatDate`, remove local |
| Modify | `frontend/src/views/PostDetailPage.vue` | Import shared `formatDate`, remove local |
| Modify | `frontend/src/views/ProfilePage.vue` | Import shared `formatDate`, remove local |
| Modify | `frontend/src/views/ProposalPage.vue` | Import shared `formatDate`, remove local |
| Modify | `frontend/src/views/SeatBookingPage.vue` | Import shared `formatDate`, remove local |
| Modify | `frontend/src/views/ChatPage.vue` | Replace native `confirm()` with `ElMessageBox.confirm` |
| Modify | `frontend/src/views/MessagesPage.vue` | Replace local `formatTime` with `useTimeAgo` + shared `formatDate` |

---

### Task 1: Create shared formatDate composable

**Files:**
- Create: `frontend/src/composables/useFormatDate.js`

- [ ] **Step 1: Create the composable**

Create `frontend/src/composables/useFormatDate.js`:

```js
export function useFormatDate() {
  function formatDate(d) {
    if (!d) return ''
    const date = new Date(d)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  return { formatDate }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/composables/useFormatDate.js
git commit -m "feat: add shared formatDate composable with Chinese format"
```

---

### Task 2: Configure Element Plus Chinese locale in App.vue

**Files:**
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Update App.vue**

In `frontend/src/App.vue`, add the config provider import and wrap the template:

```vue
<template>
  <el-config-provider :locale="zhCn">
    <AppNavbar v-if="showNavbar" />
    <router-view v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
    <GlobalChat v-if="userStore.isLoggedIn" />
  </el-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import GlobalChat from '@/components/GlobalChat.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const route = useRoute()
const userStore = useUserStore()
const showNavbar = computed(() => !['Login', 'Register'].includes(route.name))
</script>

<style>
.page-fade-enter-active { transition: opacity 0.25s ease; }
.page-fade-leave-active { transition: opacity 0.15s ease; }
.page-fade-enter-from,
.page-fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.vue
git commit -m "feat: configure Element Plus Chinese locale globally"
```

---

### Task 3: Replace native confirm() in ChatPage.vue

**Files:**
- Modify: `frontend/src/views/ChatPage.vue` (imports, lines 174-184)

- [ ] **Step 1: Add ElMessageBox import**

In `frontend/src/views/ChatPage.vue`, change the Element Plus import on line 91 from:

```js
import { ElMessage } from 'element-plus'
```

to:

```js
import { ElMessage, ElMessageBox } from 'element-plus'
```

- [ ] **Step 2: Replace handleDeleteFriend**

Replace the `handleDeleteFriend` function (lines 174-178):

```js
async function handleDeleteFriend() {
  await ElMessageBox.confirm('确定删除好友？聊天记录将保留。', '删除好友', { type: 'warning' })
  await friendStore.deleteFriend(peerInfo.value.userId)
  showMore.value = false
}
```

- [ ] **Step 3: Replace handleBlockUser**

Replace the `handleBlockUser` function (lines 180-184):

```js
async function handleBlockUser() {
  await ElMessageBox.confirm('确定拉黑该用户？', '拉黑用户', { type: 'warning' })
  await friendStore.blockUser(peerInfo.value.userId)
  showMore.value = false
}
```

Note: `ElMessageBox.confirm` rejects on cancel, so the `if (!confirm(...)) return` guard is no longer needed — the await will throw on cancel, naturally skipping the action. Add a catch where the caller handles it, or wrap in try/catch if needed. Since these are called from click handlers and cancel should just do nothing, wrap each in try/catch:

```js
async function handleDeleteFriend() {
  try {
    await ElMessageBox.confirm('确定删除好友？聊天记录将保留。', '删除好友', { type: 'warning' })
    await friendStore.deleteFriend(peerInfo.value.userId)
    showMore.value = false
  } catch { /* user cancelled */ }
}

async function handleBlockUser() {
  try {
    await ElMessageBox.confirm('确定拉黑该用户？', '拉黑用户', { type: 'warning' })
    await friendStore.blockUser(peerInfo.value.userId)
    showMore.value = false
  } catch { /* user cancelled */ }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ChatPage.vue
git commit -m "fix: replace native confirm() with ElMessageBox in ChatPage"
```

---

### Task 4: Migrate 5 views to shared formatDate

**Files:**
- Modify: `frontend/src/views/AdminPage.vue` (line 574, add import)
- Modify: `frontend/src/views/PostDetailPage.vue` (line 317, add import)
- Modify: `frontend/src/views/ProfilePage.vue` (line 470, add import)
- Modify: `frontend/src/views/ProposalPage.vue` (line 131, add import)
- Modify: `frontend/src/views/SeatBookingPage.vue` (line 138, add import)

For **each** of the 5 files:

- [ ] **Step 1: Add import**

Add this import near the other composable/store imports:

```js
import { useFormatDate } from '@/composables/useFormatDate'
```

And add inside the `<script setup>` body:

```js
const { formatDate } = useFormatDate()
```

- [ ] **Step 2: Remove local function**

Delete the local definition:

```js
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }
```

- [ ] **Step 3: Repeat for all 5 files, then commit**

```bash
git add frontend/src/views/AdminPage.vue frontend/src/views/PostDetailPage.vue frontend/src/views/ProfilePage.vue frontend/src/views/ProposalPage.vue frontend/src/views/SeatBookingPage.vue
git commit -m "refactor: use shared formatDate composable across views"
```

---

### Task 5: Deduplicate MessagesPage formatTime

**Files:**
- Modify: `frontend/src/views/MessagesPage.vue` (imports, lines 174-183)

- [ ] **Step 1: Add imports**

Add near other imports in `<script setup>`:

```js
import { useTimeAgo } from '@/composables/useTimeAgo'
import { useFormatDate } from '@/composables/useFormatDate'

const { timeAgo } = useTimeAgo()
const { formatDate } = useFormatDate()
```

- [ ] **Step 2: Replace local formatTime**

Replace the local `formatTime` function (lines 174-183):

```js
function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  if (diffMs < 60000) return '刚刚'
  if (diffMs < 3600000) return Math.floor(diffMs / 60000) + '分钟前'
  if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + '小时前'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
```

With:

```js
function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 86400000) return timeAgo(dateStr)
  return formatDate(dateStr)
}
```

This keeps the same behavior: relative time for today, absolute date for older. The fallback now uses `YYYY年M月D日` instead of `toLocaleDateString`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/MessagesPage.vue
git commit -m "refactor: deduplicate MessagesPage formatTime using shared composables"
```

---

## Self-Review

**Spec coverage:**
1. Element Plus Chinese locale → Task 2 ✅
2. Replace native confirm() → Task 3 ✅
3. Extract shared formatDate → Task 1 (create) + Task 4 (migrate) ✅
4. Deduplicate MessagesPage → Task 5 ✅

**Placeholder scan:** No TBD/TODO found. All steps have complete code.

**Type consistency:** `formatDate` signature is `(d) => string` everywhere. `timeAgo` signature is `(dateStr) => string`. Both used consistently.
