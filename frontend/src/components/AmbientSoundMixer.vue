<template>
  <div class="ambient-mixer" :class="{ compact }">
    <div class="ambient-label" v-if="!compact">环境音效</div>
    <div class="sound-grid">
      <button
        v-for="sound in sounds"
        :key="sound.id"
        class="sound-btn card"
        :class="{ active: activeSet.has(sound.id) }"
        @click="toggleSound(sound.id)"
        :title="sound.name"
      >
        <span class="sound-icon">{{ sound.icon }}</span>
        <span class="sound-name">{{ sound.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  initialSounds: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false }
})

const sounds = [
  { id: 'rain', name: '雨', icon: '🌧' },
  { id: 'wind', name: '风', icon: '🍃' },
  { id: 'bamboo', name: '竹', icon: '🎋' },
  { id: 'water', name: '水', icon: '💧' },
  { id: 'cricket', name: '虫', icon: '🌙' }
]

const activeSet = ref(new Set(props.initialSounds))
let audioCtx = null
const gainNodes = {}
const noiseNodes = {}

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function createNoiseBuffer(ctx, type) {
  const size = 2 * ctx.sampleRate
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function startSound(id) {
  const ctx = getAudioCtx()
  if (gainNodes[id]) return // already playing

  const gain = ctx.createGain()
  gain.gain.value = 0.3
  gain.connect(ctx.destination)
  gainNodes[id] = gain

  if (id === 'rain') {
    // Bandpass filtered noise
    const source = ctx.createBufferSource()
    source.buffer = createNoiseBuffer(ctx, 'rain')
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3000
    filter.Q.value = 0.5
    source.connect(filter)
    filter.connect(gain)
    source.start()
    noiseNodes[id] = source
  } else if (id === 'wind') {
    // Lowpass filtered noise
    const source = ctx.createBufferSource()
    source.buffer = createNoiseBuffer(ctx, 'wind')
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    filter.Q.value = 0.3
    source.connect(filter)
    filter.connect(gain)
    source.start()
    noiseNodes[id] = source
  } else if (id === 'water') {
    // Modulated filtered noise for stream
    const source = ctx.createBufferSource()
    source.buffer = createNoiseBuffer(ctx, 'water')
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800
    filter.Q.value = 1.0
    // LFO modulation
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.3
    lfoGain.gain.value = 200
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()
    source.connect(filter)
    filter.connect(gain)
    source.start()
    noiseNodes[id] = { source, lfo }
  } else if (id === 'bamboo') {
    // Periodic soft clicks
    function scheduleClick() {
      if (!gainNodes[id]) return
      const osc = ctx.createOscillator()
      const clickGain = ctx.createGain()
      osc.frequency.value = 600 + Math.random() * 400
      osc.type = 'sine'
      clickGain.gain.setValueAtTime(0.15, ctx.currentTime)
      clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.connect(clickGain)
      clickGain.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
      noiseNodes[id] = setTimeout(scheduleClick, 2000 + Math.random() * 4000)
    }
    scheduleClick()
  } else if (id === 'cricket') {
    // Periodic cricket chirps
    function scheduleChirp() {
      if (!gainNodes[id]) return
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const chirpGain = ctx.createGain()
        osc.frequency.value = 4000 + Math.random() * 1000
        osc.type = 'sine'
        const t = ctx.currentTime + i * 0.08
        chirpGain.gain.setValueAtTime(0.08, t)
        chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
        osc.connect(chirpGain)
        chirpGain.connect(gain)
        osc.start(t)
        osc.stop(t + 0.05)
      }
      noiseNodes[id] = setTimeout(scheduleChirp, 1500 + Math.random() * 2000)
    }
    scheduleChirp()
  }
}

function stopSound(id) {
  if (noiseNodes[id]) {
    if (typeof noiseNodes[id] === 'object' && noiseNodes[id].source) {
      noiseNodes[id].source.stop()
      noiseNodes[id].lfo?.stop()
    } else if (typeof noiseNodes[id] === 'object' && noiseNodes[id].stop) {
      // BufferSource
      noiseNodes[id].stop()
    } else if (typeof noiseNodes[id] === 'number') {
      // setTimeout ID
      clearTimeout(noiseNodes[id])
    }
    delete noiseNodes[id]
  }
  if (gainNodes[id]) {
    gainNodes[id].disconnect()
    delete gainNodes[id]
  }
}

function toggleSound(id) {
  if (activeSet.value.has(id)) {
    activeSet.value.delete(id)
    activeSet.value = new Set(activeSet.value)
    stopSound(id)
  } else {
    activeSet.value.add(id)
    activeSet.value = new Set(activeSet.value)
    startSound(id)
  }
}

onUnmounted(() => {
  // Cleanup all sounds
  for (const id of activeSet.value) {
    stopSound(id)
  }
  if (audioCtx) audioCtx.close()
})
</script>

<style scoped>
.ambient-mixer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ambient-mixer.compact .sound-grid {
  flex-direction: row;
}
.ambient-label {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  padding-left: 4px;
}
.sound-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sound-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--color-text-primary);
}
.sound-btn:hover {
  background: var(--color-accent-light);
}
.sound-btn.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
.sound-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}
.sound-name {
  font-family: var(--font-title);
}
.compact .sound-btn {
  padding: 6px 10px;
}
.compact .sound-name {
  display: none;
}
</style>
