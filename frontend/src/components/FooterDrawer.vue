<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-overlay" @click.self="$emit('close')">
        <div class="drawer-panel">
          <div class="drawer-header">
            <h3 class="drawer-title">{{ titles[type] }}</h3>
            <button class="drawer-close" @click="$emit('close')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="drawer-body">

            <!-- About -->
            <template v-if="type === 'about'">
              <div class="about-hero">
                <span class="about-logo">学栖</span>
                <p class="about-slogan">墨韵书声 · 栖心之所</p>
              </div>
              <div class="section-card">
                <h4>平台简介</h4>
                <p>学栖是一个以学习为核心的校园社区平台，致力于为学子提供沉浸式的线上修习体验。我们将传统书院文化与现代化学习工具相融合，打造一个既能专注学习、又能交流互助的数字化空间。</p>
              </div>
              <div class="section-card">
                <h4>核心理念</h4>
                <div class="concept-list">
                  <div class="concept-item"><span class="concept-icon">📖</span><span><strong>知行合一</strong> — 在修习中积累，在实践中成长</span></div>
                  <div class="concept-item"><span class="concept-icon">🏮</span><span><strong>以友辅仁</strong> — 在书院中结识志同道合的学友</span></div>
                  <div class="concept-item"><span class="concept-icon">📝</span><span><strong>博学笃志</strong> — 在论道中分享知识与见解</span></div>
                  <div class="concept-item"><span class="concept-icon">⏳</span><span><strong>切问近思</strong> — 以番茄钟与自习记录培养专注力</span></div>
                </div>
              </div>
              <div class="section-card">
                <h4>功能特色</h4>
                <div class="feature-grid">
                  <div class="feature-tag">🏮 虚拟书院</div>
                  <div class="feature-tag">🍅 番茄钟</div>
                  <div class="feature-tag">📝 知识社区</div>
                  <div class="feature-tag">💺 在线占座</div>
                  <div class="feature-tag">💬 即时通讯</div>
                  <div class="feature-tag">🏆 积分金榜</div>
                  <div class="feature-tag">📊 学习统计</div>
                  <div class="feature-tag">🔖 文章收藏</div>
                </div>
              </div>
            </template>

            <!-- Feedback -->
            <template v-if="type === 'feedback'">
              <div class="section-card">
                <h4>感谢你的反馈</h4>
                <p>我们非常重视每一位用户的声音，你的建议将帮助学栖变得更好。</p>
              </div>
              <div class="feedback-form">
                <div class="form-group">
                  <label class="form-label">反馈类型</label>
                  <div class="type-chips">
                    <span v-for="t in feedbackTypes" :key="t" class="type-chip" :class="{ active: feedbackType === t }" @click="feedbackType = t">{{ t }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">详细描述</label>
                  <textarea v-model="feedbackContent" class="form-textarea" rows="5" placeholder="请描述你遇到的问题或建议..."></textarea>
                </div>
                <button class="form-submit" :disabled="!feedbackContent.trim()" @click="submitFeedback">提交反馈</button>
              </div>
              <div class="section-card" style="margin-top:16px">
                <h4>其他联系方式</h4>
                <div class="contact-list">
                  <div class="contact-item">
                    <span class="contact-label">邮箱</span>
                    <span class="contact-value">feedback@xueqi.edu.cn</span>
                  </div>
                  <div class="contact-item">
                    <span class="contact-label">社区</span>
                    <span class="contact-value">在论道中发帖，标注「反馈」标签</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Team -->
            <template v-if="type === 'team'">
              <div class="section-card">
                <h4>开发团队</h4>
                <p>学栖由一支热爱技术与教育的团队倾力打造。</p>
              </div>
              <div class="team-list">
                <div class="team-card">
                  <img v-if="teamAvatar1" :src="teamAvatar1" class="team-avatar-img" />
                  <div v-else class="team-avatar dev">魁</div>
                  <div class="team-info">
                    <span class="team-name">张文魁<span class="team-nick">冰封暗影</span></span>
                    <span class="team-role">架构设计 · 后端开发</span>
                    <span class="team-desc">负责平台整体架构设计、后端微服务开发与数据库设计</span>
                  </div>
                </div>
                <div class="team-card">
                  <img v-if="teamAvatar2" :src="teamAvatar2" class="team-avatar-img" />
                  <div v-else class="team-avatar des">驴</div>
                  <div class="team-info">
                    <span class="team-name">魏宏波<span class="team-nick">有脾气的驴</span></span>
                    <span class="team-role">前端开发 · UI 设计</span>
                    <span class="team-desc">负责前端界面开发、交互设计与用户体验优化</span>
                  </div>
                </div>
              </div>
              <div class="section-card">
                <h4>技术栈</h4>
                <div class="tech-grid">
                  <div class="tech-item">
                    <span class="tech-name">Vue 3</span>
                    <span class="tech-desc">前端框架</span>
                  </div>
                  <div class="tech-item">
                    <span class="tech-name">Node.js</span>
                    <span class="tech-desc">后端服务</span>
                  </div>
                  <div class="tech-item">
                    <span class="tech-name">MySQL</span>
                    <span class="tech-desc">数据存储</span>
                  </div>
                  <div class="tech-item">
                    <span class="tech-name">Redis</span>
                    <span class="tech-desc">缓存 / 实时</span>
                  </div>
                  <div class="tech-item">
                    <span class="tech-name">Socket.IO</span>
                    <span class="tech-desc">即时通讯</span>
                  </div>
                  <div class="tech-item">
                    <span class="tech-name">Docker</span>
                    <span class="tech-desc">容器化部署</span>
                  </div>
                </div>
              </div>
              <div class="section-card">
                <h4>开源精神</h4>
                <p>学栖秉承开源共享的理念，项目代码遵循良好实践，欢迎志同道合的开发者参与共建。</p>
              </div>
            </template>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { feedbackAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  visible: Boolean,
  type: { type: String, default: 'about' }
})

defineEmits(['close'])

const titles = { about: '关于学栖', feedback: '使用反馈', team: '开发团队' }

const feedbackTypes = ['功能建议', 'Bug 反馈', '体验优化', '其他']
const feedbackType = ref('功能建议')
const feedbackContent = ref('')

// Team avatars — place images in frontend/public/team/ to enable
const teamAvatar1 = ref('/team/zhangwenkui.jpg')
const teamAvatar2 = ref('/team/weihongbo.jpg')

function submitFeedback() {
  if (!feedbackContent.value.trim()) return
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再提交反馈')
    return
  }
  feedbackAPI.submit({ type: feedbackType.value, content: feedbackContent.value }).then(() => {
    ElMessage.success('感谢你的反馈，我们会认真阅读！')
    feedbackContent.value = ''
  }).catch(e => {
    ElMessage.error(e.message || '提交失败')
  })
}
</script>

<style scoped>
/* Overlay */
.drawer-overlay {
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(0,0,0,0.35);
  display: flex; justify-content: flex-end;
}

/* Panel */
.drawer-panel {
  width: min(420px, 85vw); height: 100%;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  box-shadow: -4px 0 24px rgba(0,0,0,0.1);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* Header */
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}
.drawer-title {
  font-family: var(--font-title);
  font-size: 1.15rem;
  margin: 0;
}
.drawer-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary); padding: 4px;
  border-radius: 50%; transition: all 0.2s;
}
.drawer-close:hover { background: var(--color-bg-secondary); color: var(--color-text-primary); }

/* Body */
.drawer-body {
  flex: 1; overflow-y: auto; padding: 20px 24px 32px;
}

/* Transition */
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer-panel, .drawer-leave-active .drawer-panel { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer-panel, .drawer-leave-to .drawer-panel { transform: translateX(100%); }

/* Section Card */
.section-card {
  background: var(--glass-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius);
  padding: 16px 18px;
  margin-bottom: 14px;
}
.section-card h4 {
  font-family: var(--font-title);
  font-size: 0.95rem;
  margin: 0 0 8px;
  padding-left: 10px;
  border-left: 3px solid var(--color-accent);
}
.section-card p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0;
}

/* About */
.about-hero {
  text-align: center; padding: 20px 0 24px;
}
.about-logo {
  display: block;
  font-family: var(--font-title);
  font-size: 2rem;
  color: var(--color-accent);
  font-weight: 700;
  margin-bottom: 4px;
}
.about-slogan {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-family: var(--font-title);
}
.concept-list { display: flex; flex-direction: column; gap: 10px; }
.concept-item { display: flex; gap: 10px; font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.6; }
.concept-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
.feature-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.feature-tag {
  padding: 5px 14px; border-radius: 16px;
  background: var(--color-accent-light, rgba(46,92,76,0.08));
  color: var(--color-accent);
  font-size: 0.82rem; font-weight: 500;
}

/* Feedback */
.feedback-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text-primary); }
.type-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.type-chip {
  padding: 5px 14px; border-radius: 16px;
  border: 1px solid var(--color-border-light);
  font-size: 0.82rem; color: var(--color-text-secondary);
  cursor: pointer; transition: all 0.2s; user-select: none;
}
.type-chip:hover { border-color: var(--color-accent); color: var(--color-accent); }
.type-chip.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.form-textarea {
  width: 100%; padding: 10px 14px; border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-sm, 8px);
  background: var(--glass-bg-card);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.88rem; resize: vertical; outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.form-textarea:focus { border-color: var(--color-accent); }
.form-submit {
  padding: 10px 0; border-radius: 20px; border: none;
  background: var(--color-accent); color: #fff;
  font-family: var(--font-body); font-size: 0.9rem;
  cursor: pointer; transition: all 0.2s;
}
.form-submit:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.form-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.contact-list { display: flex; flex-direction: column; gap: 8px; }
.contact-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
.contact-label { color: var(--color-text-secondary); }
.contact-value { color: var(--color-accent); font-size: 0.83rem; }

/* Team */
.team-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.team-card {
  display: flex; gap: 14px; padding: 14px 16px;
  background: var(--glass-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius);
  align-items: center;
}
.team-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 700; flex-shrink: 0;
  font-family: var(--font-title);
}
.team-avatar.dev { background: var(--color-accent); color: #fff; }
.team-avatar.des { background: var(--color-gold, #B8860B); color: #fff; }
.team-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.team-info { display: flex; flex-direction: column; gap: 2px; }
.team-nick { font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 400; margin-left: 6px; }
.team-name { font-weight: 600; font-size: 0.95rem; }
.team-role { font-size: 0.82rem; color: var(--color-accent); }
.team-desc { font-size: 0.82rem; color: var(--color-text-secondary); }
.tech-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tech-item {
  text-align: center; padding: 10px 6px;
  background: var(--color-bg-secondary, var(--glass-bg-card));
  border-radius: var(--border-radius-sm, 6px);
}
.tech-name { display: block; font-weight: 600; font-size: 0.85rem; color: var(--color-text-primary); }
.tech-desc { display: block; font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 2px; }
</style>
